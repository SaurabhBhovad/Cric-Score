import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { InningsState, processDelivery, BallInput, formatOvers } from '../utils/scoringEngine';

export interface Match {
  id: string;
  user_id: string;
  tournament_id?: string;
  team_a: string;
  team_b: string;
  team_a_name?: string;
  team_b_name?: string;
  overs: number;
  toss_winner?: string;
  toss_choice?: 'bat' | 'bowl';
  status: 'scheduled' | 'live' | 'completed';
  winner?: string;
  result_text?: string;
  created_at: string;
}

export interface BatStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
  isStriker: boolean;
}

export interface BowlStats {
  playerId: string;
  playerName: string;
  overs: number;
  legalBalls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  isBowling: boolean;
}

export interface LiveMatch {
  match: Match;
  innings: InningsState;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  maxOvers: number;
  batStats: Record<string, BatStats>;
  bowlStats: Record<string, BowlStats>;
  recentBalls: string[];  // last 6 ball labels for current over
  inning1Score?: { runs: number; wickets: number; overs: string };
}

interface MatchState {
  matches: Match[];
  liveMatch: LiveMatch | null;
  loading: boolean;
  error: string | null;
  currentInningsId: string | null;

  fetchMatches: () => Promise<void>;
  createMatch: (data: {
    teamAId: string; teamBId: string; overs: number;
    tossWinner: string; tossChoice: 'bat' | 'bowl';
    tournamentId?: string;
  }) => Promise<Match>;
  deleteMatch: (id: string) => Promise<void>;
  startLiveMatch: (match: Match, battingTeamId: string, bowlingTeamId: string, players: { batters: string[]; bowlers: string[]; names: Record<string, string>; }) => Promise<void>;
  loadLiveMatch: (matchId: string) => Promise<void>;
  recordBall: (ball: BallInput, newBatsman?: string) => Promise<void>;
  undoLastBall: () => Promise<void>;
  selectNewBatsman: (playerId: string, playerName: string) => void;
  switchBowler: (playerId: string) => void;
  setupSecondInnings: (players: { batters: string[]; bowlers: string[]; names: Record<string, string>; }) => void;
  getMatchById: (id: string) => Promise<Match | null>;
  clearError: () => void;
}

const initialInnings = (strikerId: string, nonStrikerId: string, bowlerId: string, target?: number): InningsState => ({
  runs: 0, wickets: 0, legalBalls: 0, totalDeliveries: 0,
  overNumber: 0, ballInOver: 0, displayBall: 0,
  extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
  strikerId, nonStrikerId, bowlerId, isComplete: false, target,
});

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  liveMatch: null,
  loading: false,
  error: null,
  currentInningsId: null,

  fetchMatches: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('matches')
      .select('*, team_a_info:team_a(team_name), team_b_info:team_b(team_name)')
      .order('created_at', { ascending: false });
    if (error) { set({ loading: false, error: error.message }); return; }
    const formatted = (data ?? []).map((m: any) => ({
      ...m,
      team_a_name: m.team_a_info?.team_name,
      team_b_name: m.team_b_info?.team_name,
    }));
    set({ matches: formatted, loading: false });
  },

  createMatch: async ({ teamAId, teamBId, overs, tossWinner, tossChoice, tournamentId }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: user!.id,
        team_a: teamAId, team_b: teamBId,
        overs, toss_winner: tossWinner, toss_choice: tossChoice,
        tournament_id: tournamentId ?? null,
        status: 'scheduled',
      })
      .select('*, team_a_info:team_a(team_name), team_b_info:team_b(team_name)')
      .single();
    if (error) throw error;
    const match = {
      ...data,
      team_a_name: data.team_a_info?.team_name,
      team_b_name: data.team_b_info?.team_name,
    };
    set((s) => ({ matches: [match, ...s.matches] }));
    return match;
  },

  deleteMatch: async (id) => {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ matches: s.matches.filter((m) => m.id !== id) }));
  },

  startLiveMatch: async (match, battingTeamId, bowlingTeamId, players) => {
    const { batters, bowlers, names } = players;
    const strikerId = batters[0];
    const nonStrikerId = batters[1];
    const bowlerId = bowlers[0];

    // Create innings record
    const { data: inningsData, error: inningsError } = await supabase
      .from('innings')
      .insert({
        match_id: match.id,
        innings_number: 1,
        batting_team: battingTeamId,
        bowling_team: bowlingTeamId,
      })
      .select()
      .single();
    if (inningsError) throw inningsError;

    // Update match status
    await supabase.from('matches').update({ status: 'live' }).eq('id', match.id);

    const innings = initialInnings(strikerId, nonStrikerId, bowlerId);

    const batStats: Record<string, BatStats> = {};
    batters.forEach((id, i) => {
      batStats[id] = {
        playerId: id, playerName: names[id] ?? 'Unknown',
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        isStriker: i === 0,
      };
    });

    const bowlStats: Record<string, BowlStats> = {};
    bowlers.forEach((id, i) => {
      bowlStats[id] = {
        playerId: id, playerName: names[id] ?? 'Unknown',
        overs: 0, legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0,
        isBowling: i === 0,
      };
    });

    set({
      currentInningsId: inningsData.id,
      liveMatch: {
        match: { ...match, status: 'live' },
        innings, inningsNumber: 1,
        battingTeamId, bowlingTeamId,
        maxOvers: match.overs,
        batStats, bowlStats,
        recentBalls: [],
      },
    });
  },

  loadLiveMatch: async (matchId) => {
    // Reload match data from DB - useful for resuming
    set({ loading: true });
    const { data: match } = await supabase
      .from('matches')
      .select('*, team_a_info:team_a(team_name), team_b_info:team_b(team_name)')
      .eq('id', matchId)
      .single();
    set({ loading: false });
  },

  recordBall: async (ball, newBatsman) => {
    const state = get();
    const { liveMatch, currentInningsId } = state;
    if (!liveMatch || !currentInningsId) return;

    const result = processDelivery(liveMatch.innings, ball);
    const { updatedInnings, ballRecord, overComplete, inningsComplete } = result;

    // Check if overs limit reached
    const maxBalls = liveMatch.maxOvers * 6;
    const oversComplete = updatedInnings.legalBalls >= maxBalls;
    const finalInningsComplete = inningsComplete || oversComplete;

    // Insert ball record
    await supabase.from('balls').insert({
      innings_id: currentInningsId,
      match_id: liveMatch.match.id,
      ...ballRecord,
      batsman_id: ball.batsmanId,
      bowler_id: ball.bowlerId,
      fielder_id: ball.fielderId ?? null,
      dismissed_batsman_id: ball.dismissedBatsmanId ?? null,
    });

    // Update innings aggregate
    await supabase.from('innings').update({
      runs: updatedInnings.runs,
      wickets: updatedInnings.wickets,
      overs_bowled: parseFloat(formatOvers(updatedInnings.legalBalls)),
      extras: updatedInnings.extras.total,
      wides: updatedInnings.extras.wides,
      no_balls: updatedInnings.extras.noBalls,
      byes: updatedInnings.extras.byes,
      leg_byes: updatedInnings.extras.legByes,
      is_complete: finalInningsComplete,
    }).eq('id', currentInningsId);

    // Update bat stats
    const batStats = { ...liveMatch.batStats };
    const bowlStats = { ...liveMatch.bowlStats };

    const batter = batStats[ball.batsmanId];
    if (batter && (ball.extraType === null || ball.extraType === 'no_ball')) {
      batter.runs += ball.runsOffBat;
      batter.balls += 1;
      if (ball.runsOffBat === 4) batter.fours += 1;
      if (ball.runsOffBat === 6) batter.sixes += 1;
    } else if (batter && ball.extraType === 'bye' || ball.extraType === 'leg_bye') {
      if (batter) batter.balls += 1;
    }

    if (ball.isWicket && ball.dismissedBatsmanId) {
      const dismissed = batStats[ball.dismissedBatsmanId];
      if (dismissed) {
        dismissed.isOut = true;
        dismissed.dismissal = ball.wicketType ?? 'out';
      }
    }

    // Update striker/non-striker indicator
    Object.keys(batStats).forEach((id) => {
      batStats[id].isStriker = id === updatedInnings.strikerId;
    });

    // Add new batsman if wicket
    if (newBatsman && ball.isWicket && !batStats[newBatsman]) {
      batStats[newBatsman] = {
        playerId: newBatsman,
        playerName: 'New Batsman',
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        isStriker: updatedInnings.strikerId === newBatsman,
      };
    }

    // Update bowler stats
    const bowler = bowlStats[ball.bowlerId];
    if (bowler) {
      if (ball.extraType === 'wide') {
        bowler.runs += ball.extraRuns;
        bowler.wides += ball.extraRuns;
      } else if (ball.extraType === 'no_ball') {
        bowler.runs += ball.extraRuns + ball.runsOffBat;
        bowler.noBalls += 1;
      } else {
        bowler.runs += ball.runsOffBat + ball.extraRuns;
        bowler.legalBalls += 1;
        bowler.overs = parseFloat(formatOvers(bowler.legalBalls));
      }
      if (ball.isWicket && ball.wicketType !== 'run_out') bowler.wickets += 1;
    }

    // Ball label for recent balls
    let ballLabel = '';
    if (ball.isWicket) ballLabel = 'W';
    else if (ball.extraType === 'wide') ballLabel = 'Wd';
    else if (ball.extraType === 'no_ball') ballLabel = 'Nb';
    else if (ball.extraType === 'bye') ballLabel = `B${ball.extraRuns}`;
    else if (ball.extraType === 'leg_bye') ballLabel = `Lb${ball.extraRuns}`;
    else ballLabel = `${ball.runsOffBat}`;

    const newRecentBalls = overComplete
      ? []
      : [...liveMatch.recentBalls, ballLabel];

    // Handle innings 2
    let newInningsId = currentInningsId;
    let newInningsNumber = liveMatch.inningsNumber;
    let newInnings = { ...updatedInnings, isComplete: finalInningsComplete };
    let newBattingTeam = liveMatch.battingTeamId;
    let newBowlingTeam = liveMatch.bowlingTeamId;
    let inning1Score = liveMatch.inning1Score;

    if (finalInningsComplete && liveMatch.inningsNumber === 1) {
      inning1Score = {
        runs: updatedInnings.runs,
        wickets: updatedInnings.wickets,
        overs: formatOvers(updatedInnings.legalBalls),
      };
      // Create innings 2
      const { data: innings2 } = await supabase.from('innings').insert({
        match_id: liveMatch.match.id,
        innings_number: 2,
        batting_team: liveMatch.bowlingTeamId,
        bowling_team: liveMatch.battingTeamId,
      }).select().single();
      newInningsId = innings2?.id ?? currentInningsId;
      newInningsNumber = 2;
      newBattingTeam = liveMatch.bowlingTeamId;
      newBowlingTeam = liveMatch.battingTeamId;
      newInnings = initialInnings(
        updatedInnings.strikerId, // will be reset when 2nd innings setup
        updatedInnings.nonStrikerId,
        updatedInnings.bowlerId,
        updatedInnings.runs + 1,
      );
    }

    // Match complete
    if (finalInningsComplete && liveMatch.inningsNumber === 2) {
      const target = liveMatch.innings.target ?? 0;
      let winner: string | undefined;
      let resultText: string;
      if (updatedInnings.runs >= target) {
        winner = liveMatch.battingTeamId;
        const wicketsLeft = 10 - updatedInnings.wickets;
        resultText = `${liveMatch.match.team_b_name ?? 'Team'} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
      } else {
        winner = liveMatch.bowlingTeamId;
        const runDiff = (target - 1) - updatedInnings.runs;
        resultText = `${liveMatch.match.team_a_name ?? 'Team'} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
      }
      await supabase.from('matches').update({
        status: 'completed', winner, result_text: resultText,
      }).eq('id', liveMatch.match.id);
    }

    set({
      currentInningsId: newInningsId,
      liveMatch: {
        ...liveMatch,
        innings: newInnings,
        inningsNumber: newInningsNumber,
        battingTeamId: newBattingTeam,
        bowlingTeamId: newBowlingTeam,
        batStats,
        bowlStats,
        recentBalls: newRecentBalls,
        inning1Score,
      },
    });
  },

  undoLastBall: async () => {
    const { liveMatch, currentInningsId } = get();
    if (!liveMatch || !currentInningsId) return;

    // 1. Find and delete the last ball
    const { data: lastBall } = await supabase
      .from('balls')
      .select('id')
      .eq('innings_id', currentInningsId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastBall) return;
    await supabase.from('balls').delete().eq('id', lastBall.id);

    // 2. Fetch ALL remaining balls for this innings to recalculate state
    const { data: balls } = await supabase
      .from('balls')
      .select('*')
      .eq('innings_id', currentInningsId)
      .order('created_at', { ascending: true });

    // 3. Reset state and replay balls
    // We need the initial batters/bowlers names from the current liveMatch or re-fetch players
    // For simplicity, we'll use the existing player lists in batStats/bowlStats
    const batters = Object.values(liveMatch.batStats).map(b => b.playerId);
    const bowlers = Object.values(liveMatch.bowlStats).map(b => b.playerId);
    const names: Record<string, string> = {};
    Object.values(liveMatch.batStats).forEach(s => names[s.playerId] = s.playerName);
    Object.values(liveMatch.bowlStats).forEach(s => names[s.playerId] = s.playerName);

    // Get initial players (first 2 batters and 1st bowler)
    // Actually, it's better to just re-initialize the InningsState
    // But we need to know who the ORIGINAL starters were.
    // Let's assume the first 2 in batters and first 1 in bowlers were starters.
    let currentInnings = initialInnings(batters[0], batters[1], bowlers[0], liveMatch.innings.target);
    const newBatStats: Record<string, BatStats> = {};
    batters.forEach((id, i) => {
      newBatStats[id] = { playerId: id, playerName: names[id], runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, isStriker: i === 0 };
    });
    const newBowlStats: Record<string, BowlStats> = {};
    bowlers.forEach((id, i) => {
      newBowlStats[id] = { playerId: id, playerName: names[id], overs: 0, legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, isBowling: i === 0 };
    });

    const recentLabels: string[] = [];
    
    // Replay all balls
    (balls ?? []).forEach((b: any) => {
        const ballInput: BallInput = {
            runsOffBat: b.runs_off_bat,
            extraType: b.extra_type,
            extraRuns: b.extra_runs,
            isWicket: b.is_wicket,
            wicketType: b.wicket_type,
            batsmanId: b.batsman_id,
            bowlerId: b.bowler_id,
            dismissedBatsmanId: b.dismissed_batsman_id
        };
        const result = processDelivery(currentInnings, ballInput);
        currentInnings = result.updatedInnings;
        
        // Update stats
        const batter = newBatStats[b.batsman_id];
        if (batter && (b.extra_type === null || b.extra_type === 'no_ball')) {
            batter.runs += b.runs_off_bat;
            batter.balls += 1;
            if (b.runs_off_bat === 4) batter.fours += 1;
            if (b.runs_off_bat === 6) batter.sixes += 1;
        } else if (batter && (b.extra_type === 'bye' || b.extra_type === 'leg_bye')) {
            batter.balls += 1;
        }
        if (b.is_wicket && b.dismissed_batsman_id) {
            const dismissed = newBatStats[b.dismissed_batsman_id];
            if (dismissed) { dismissed.isOut = true; dismissed.dismissal = b.wicket_type; }
        }
        const bowler = newBowlStats[b.bowler_id];
        if (bowler) {
            if (b.extra_type === 'wide') { bowler.runs += b.extra_runs; bowler.wides += 1; }
            else if (b.extra_type === 'no_ball') { bowler.runs += b.extra_runs + b.runs_off_bat; bowler.noBalls += 1; }
            else { bowler.runs += b.runs_off_bat + b.extra_runs; bowler.legalBalls += 1; bowler.overs = parseFloat(formatOvers(bowler.legalBalls)); }
            if (b.is_wicket && b.wicket_type !== 'run_out') bowler.wickets += 1;
        }

        // Labels for this over
        let label = '';
        if (b.is_wicket) label = 'W';
        else if (b.extra_type === 'wide') label = 'Wd';
        else if (b.extra_type === 'no_ball') label = 'Nb';
        else label = `${b.runs_off_bat}`;
        
        if (result.overComplete) recentLabels.length = 0;
        else recentLabels.push(label);
    });

    // Update strikers
    Object.keys(newBatStats).forEach(id => {
        newBatStats[id].isStriker = (id === currentInnings.strikerId);
    });

    // 4. Update innings in DB with new totals
    await supabase.from('innings').update({
        runs: currentInnings.runs,
        wickets: currentInnings.wickets,
        overs_bowled: parseFloat(formatOvers(currentInnings.legalBalls)),
        extras: currentInnings.extras.total,
        wides: currentInnings.extras.wides,
        no_balls: currentInnings.extras.noBalls,
        byes: currentInnings.extras.byes,
        leg_byes: currentInnings.extras.legByes,
        is_complete: false, // Reset to false since we just undid a ball
    }).eq('id', currentInningsId);

    set({
      liveMatch: {
        ...liveMatch,
        innings: currentInnings,
        batStats: newBatStats,
        bowlStats: newBowlStats,
        recentBalls: recentLabels,
      }
    });
  },

  selectNewBatsman: (playerId, playerName) => {
    const { liveMatch } = get();
    if (!liveMatch) return;
    const batStats = { ...liveMatch.batStats };
    batStats[playerId] = {
      playerId, playerName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
      isStriker: liveMatch.innings.strikerId === playerId,
    };
    // Update strikerId in innings
    const innings = { ...liveMatch.innings, strikerId: playerId };
    set({ liveMatch: { ...liveMatch, innings, batStats } });
  },

  switchBowler: (playerId) => {
    const { liveMatch } = get();
    if (!liveMatch) return;
    const bowlStats = { ...liveMatch.bowlStats };
    Object.keys(bowlStats).forEach((id) => { bowlStats[id].isBowling = false; });
    if (!bowlStats[playerId]) {
      bowlStats[playerId] = {
        playerId, playerName: 'Bowler',
        overs: 0, legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0,
        isBowling: true,
      };
    } else {
      bowlStats[playerId].isBowling = true;
    }
    const innings = { ...liveMatch.innings, bowlerId: playerId };
    set({ liveMatch: { ...liveMatch, innings, bowlStats } });
  },

  setupSecondInnings: (players) => {
    const { liveMatch } = get();
    if (!liveMatch || liveMatch.inningsNumber !== 2) return;
    const { batters, bowlers, names } = players;
    const strikerId = batters[0];
    const nonStrikerId = batters[1];
    const bowlerId = bowlers[0];

    const batStats: Record<string, BatStats> = {};
    batters.forEach((id, i) => {
      batStats[id] = {
        playerId: id, playerName: names[id] ?? 'Unknown',
        runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
        isStriker: i === 0,
      };
    });

    const bowlStats: Record<string, BowlStats> = {};
    bowlers.forEach((id, i) => {
      bowlStats[id] = {
        playerId: id, playerName: names[id] ?? 'Unknown',
        overs: 0, legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0,
        isBowling: i === 0,
      };
    });

    set({
      liveMatch: {
        ...liveMatch,
        innings: {
          ...liveMatch.innings,
          strikerId, nonStrikerId, bowlerId,
        },
        batStats,
        bowlStats,
      },
    });
  },

  getMatchById: async (id) => {
    const { data } = await supabase
      .from('matches')
      .select('*, team_a_info:team_a(team_name), team_b_info:team_b(team_name)')
      .eq('id', id)
      .single();
    if (!data) return null;
    return { ...data, team_a_name: data.team_a_info?.team_name, team_b_name: data.team_b_info?.team_name };
  },

  clearError: () => set({ error: null }),
}));

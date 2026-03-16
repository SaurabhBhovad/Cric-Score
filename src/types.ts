import { Team } from './store/teamStore';
import { Match } from './store/matchStore';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Teams: undefined;
  TeamDetail: { team: Team };
  MatchSetup: { tournamentId?: string; teamAId?: string; teamBId?: string; overs?: number };
  PlayerSelection: { match: Match; tossWinner: string; tossChoice: 'bat' | 'bowl' };
  LiveScore: { matchId: string };
  Scorecard: { matchId: string };
  MatchHistory: undefined;
  Tournaments: undefined;
  TournamentDetail: { tournamentId: string };
};

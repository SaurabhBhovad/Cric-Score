import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { Team } from './teamStore';
import { Match } from './matchStore';

export interface Tournament {
  id: string;
  user_id: string;
  name: string;
  overs: number;
  format: string;
  status: string;
  created_at: string;
}

// Reusing Match interface from matchStore

interface TournamentState {
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  tournamentTeams: Team[];
  tournamentMatches: Match[];
  loading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  createTournament: (name: string, overs: number, teamIds: string[]) => Promise<Tournament>;
  deleteTournament: (id: string) => Promise<void>;
  fetchTournamentDetails: (id: string) => Promise<void>;
  generateFixtures: (tournamentId: string, teamIds: string[], overs: number) => Promise<void>;
  clearError: () => void;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  currentTournament: null,
  tournamentTeams: [],
  tournamentMatches: [],
  loading: false,
  error: null,

  fetchTournaments: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { set({ loading: false, error: error.message }); return; }
    set({ tournaments: data ?? [], loading: false });
  },

  createTournament: async (name, overs, teamIds) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({ name, overs, user_id: user!.id })
      .select()
      .single();
    if (error) throw error;
    // Add teams
    const ttRows = teamIds.map((tid) => ({ tournament_id: tournament.id, team_id: tid }));
    await supabase.from('tournament_teams').insert(ttRows);
    set((s) => ({ tournaments: [tournament, ...s.tournaments] }));
    return tournament;
  },

  deleteTournament: async (id) => {
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) }));
  },

  fetchTournamentDetails: async (id) => {
    set({ loading: true });
    const { data: tournament } = await supabase
      .from('tournaments').select('*').eq('id', id).single();
    const { data: ttRows } = await supabase
      .from('tournament_teams').select('team_id, teams(*)').eq('tournament_id', id);
    const teams = (ttRows ?? []).map((r: any) => r.teams).filter(Boolean);
    const { data: matches } = await supabase
      .from('matches').select('*, team_a_info:team_a(team_name), team_b_info:team_b(team_name)')
      .eq('tournament_id', id).order('created_at', { ascending: true });
    const formattedMatches = (matches ?? []).map((m: any) => ({
      ...m,
      team_a_name: m.team_a_info?.team_name,
      team_b_name: m.team_b_info?.team_name,
    }));
    set({
      currentTournament: tournament,
      tournamentTeams: teams,
      tournamentMatches: formattedMatches,
      loading: false,
    });
  },

  generateFixtures: async (tournamentId, teamIds, overs) => {
    const { data: { user } } = await supabase.auth.getUser();
    const fixtures = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        fixtures.push({
          user_id: user!.id,
          tournament_id: tournamentId,
          team_a: teamIds[i],
          team_b: teamIds[j],
          overs,
          status: 'scheduled',
        });
      }
    }
    const { error } = await supabase.from('matches').insert(fixtures);
    if (error) throw error;
  },

  clearError: () => set({ error: null }),
}));

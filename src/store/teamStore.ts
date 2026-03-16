import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export interface Team {
  id: string;
  user_id: string;
  team_name: string;
  team_color: string;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  user_id: string;
  player_name: string;
  batting_style: string;
  bowling_style: string;
  jersey_number?: number;
  created_at: string;
}

interface TeamState {
  teams: Team[];
  players: Player[];
  loading: boolean;
  error: string | null;
  fetchTeams: () => Promise<void>;
  addTeam: (name: string, color: string) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  fetchPlayers: (teamId: string) => Promise<Player[]>;
  addPlayer: (data: Partial<Player>) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  players: [],
  loading: false,
  error: null,

  fetchTeams: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { set({ loading: false, error: error.message }); return; }
    set({ teams: data ?? [], loading: false });
  },

  addTeam: async (name, color) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('teams')
      .insert({ team_name: name, team_color: color, user_id: user!.id })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ teams: [data, ...s.teams] }));
    return data;
  },

  deleteTeam: async (id) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }));
  },

  fetchPlayers: async (teamId) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    set({ players: data ?? [] });
    return data ?? [];
  },

  addPlayer: async (playerData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('players')
      .insert({ ...playerData, user_id: user!.id })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ players: [...s.players, data] }));
    return data;
  },

  deletePlayer: async (id) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
  },

  clearError: () => set({ error: null }),
}));

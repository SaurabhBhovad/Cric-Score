import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: false,
  error: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }
    set({ session: data.session, user: data.user, loading: false });
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }
    set({ session: data.session, user: data.user, loading: false });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  clearError: () => set({ error: null }),
}));

/**
 * Auth context and hook for user authentication.
 * Wraps Supabase auth state and exposes user, signIn, signUp, signOut.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthProvider(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    displayName: null,
    avatarUrl: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();
    return { displayName: data?.display_name ?? null, avatarUrl: data?.avatar_url ?? null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, displayName: profile.displayName, avatarUrl: profile.avatarUrl }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id;
      const profile = userId ? await fetchProfile(userId) : { displayName: null, avatarUrl: null };
      setState({ user: session?.user ?? null, session, isLoading: false, displayName: profile.displayName, avatarUrl: profile.avatarUrl });
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      const profile = userId ? await fetchProfile(userId) : { displayName: null, avatarUrl: null };
      setState({ user: session?.user ?? null, session, isLoading: false, displayName: profile.displayName, avatarUrl: profile.avatarUrl });
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'An account with this email already exists.', needsConfirmation: false };
    }
    return { error: null, needsConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  return { ...state, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

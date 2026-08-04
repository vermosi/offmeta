/**
 * Auth context and hook for user authentication.
 * Wraps Supabase auth state and exposes user, signIn, signUp, signOut.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  identifyExternalUser,
  resetExternalUser,
} from '@/lib/analytics/providers';
import {
  validateEmailAddress,
  validatePasswordInput,
} from '@/lib/validation/clientInput';
import type { User, Session } from '@supabase/supabase-js';


interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_GENERIC_ERROR =
  'Unable to complete that request. Please verify your details and try again.';
const AUTH_SIGNUP_GUIDANCE =
  'Unable to create account. If you already signed up, try signing in or resetting your password.';

function sanitizeAuthErrorMessage(
  error: { message?: string } | null | undefined,
  fallback: string,
): string {
  const message = error?.message?.toLowerCase() ?? '';

  if (!message) return fallback;

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'Invalid email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (
    message.includes('over_email_send_rate_limit') ||
    message.includes('rate limit')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered')
  ) {
    return AUTH_SIGNUP_GUIDANCE;
  }

  return fallback;
}

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
    return {
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    const applySession = (session: Session | null) => {
      // Update session synchronously first — never await inside the auth
      // callback, it can deadlock the Supabase auth client.
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isLoading: false,
        // Clear profile immediately on sign-out; keep prior values until
        // the deferred fetch resolves on sign-in.
        displayName: session?.user ? prev.displayName : null,
        avatarUrl: session?.user ? prev.avatarUrl : null,
      }));

      const userId = session?.user?.id;
      if (!userId) return;

      // Defer any Supabase calls out of the auth callback stack.
      setTimeout(async () => {
        const profile = await fetchProfile(userId);
        if (cancelled) return;
        setState((prev) => {
          if (prev.user?.id !== userId) return prev;
          return {
            ...prev,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          };
        });
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);


  const signIn = useCallback(async (email: string, password: string) => {
    const emailValidation = validateEmailAddress(email);
    if (!emailValidation.success) return { error: emailValidation.message };

    const passwordValidation = validatePasswordInput(password);
    if (!passwordValidation.success)
      return { error: passwordValidation.message };

    const { error } = await supabase.auth.signInWithPassword({
      email: emailValidation.data.email,
      password: passwordValidation.data.password,
    });
    if (error)
      return { error: sanitizeAuthErrorMessage(error, AUTH_GENERIC_ERROR) };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const emailValidation = validateEmailAddress(email);
    if (!emailValidation.success)
      return { error: emailValidation.message, needsConfirmation: false };

    const passwordValidation = validatePasswordInput(password);
    if (!passwordValidation.success)
      return { error: passwordValidation.message, needsConfirmation: false };

    const { error, data } = await supabase.auth.signUp({
      email: emailValidation.data.email,
      password: passwordValidation.data.password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error)
      return {
        error: sanitizeAuthErrorMessage(error, AUTH_SIGNUP_GUIDANCE),
        needsConfirmation: false,
      };
    if (data.user && data.user.identities?.length === 0) {
      return { error: AUTH_SIGNUP_GUIDANCE, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const emailValidation = validateEmailAddress(email);
    if (!emailValidation.success) return { error: emailValidation.message };

    const { error } = await supabase.auth.resetPasswordForEmail(
      emailValidation.data.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );
    if (error)
      return { error: sanitizeAuthErrorMessage(error, AUTH_GENERIC_ERROR) };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const passwordValidation = validatePasswordInput(password);
    if (!passwordValidation.success)
      return { error: passwordValidation.message };

    const { error } = await supabase.auth.updateUser({
      password: passwordValidation.data.password,
    });
    if (error)
      return { error: sanitizeAuthErrorMessage(error, AUTH_GENERIC_ERROR) };
    return { error: null };
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

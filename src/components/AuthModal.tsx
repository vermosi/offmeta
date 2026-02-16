/**
 * Auth modal with Sign In / Sign Up tabs and forgot password flow.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

type AuthView = 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccess(null);
  }, []);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      reset();
      onOpenChange(false);
    }
  }, [email, password, signIn, reset, onOpenChange]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (needsConfirmation) {
      setSuccess('Check your email to confirm your account.');
    }
  }, [email, password, signUp]);

  const handleForgot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess('Check your email for a password reset link.');
    }
  }, [email, resetPassword]);

  const switchView = useCallback((v: AuthView) => {
    setView(v);
    setError(null);
    setSuccess(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {view === 'signin' && 'Sign In'}
            {view === 'signup' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">{success}</p>
            <Button variant="outline" size="sm" onClick={() => { reset(); switchView('signin'); }}>
              Back to Sign In
            </Button>
          </div>
        ) : view === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <button
              type="button"
              onClick={() => switchView('signin')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        ) : (
          <form onSubmit={view === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={view === 'signup' ? 'Min 6 characters' : '••••••••'}
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {view === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>

            {view === 'signin' && (
              <button
                type="button"
                onClick={() => switchView('forgot')}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              {view === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => switchView('signup')} className="text-primary hover:underline font-medium">
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchView('signin')} className="text-primary hover:underline font-medium">
                    Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

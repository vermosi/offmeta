/**
 * Password reset page — user lands here from the email reset link.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { SkipLinks } from '@/components/SkipLinks';
import { useTranslation } from '@/lib/i18n';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Check that we arrived via a recovery link
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery') && !session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t('resetPassword.passwordMinLength'));
      return;
    }
    if (password !== confirm) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="flex-1 container-main py-12 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-center">{t('resetPassword.title')}</h1>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm text-muted-foreground">{t('resetPassword.success')}</p>
              <Button onClick={() => navigate('/')}>{t('resetPassword.goHome')}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pw">{t('resetPassword.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('resetPassword.minChars')}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">{t('resetPassword.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t('resetPassword.repeatPassword')}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('resetPassword.update')}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;

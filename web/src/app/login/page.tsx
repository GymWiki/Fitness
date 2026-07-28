'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const { signInWithPassword, signUpWithPassword, requestPasswordReset } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  const isValidEmail = EMAIL_PATTERN.test(email.trim());
  const isValidPassword = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = mode === 'forgot' ? isValidEmail && !isSubmitting : isValidEmail && isValidPassword && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    if (mode === 'forgot') {
      const { error: submitError } = await requestPasswordReset(email.trim());
      setIsSubmitting(false);
      if (submitError) {
        setError(submitError);
      } else {
        setResetLinkSent(true);
      }
      return;
    }
    const submit = mode === 'login' ? signInWithPassword : signUpWithPassword;
    const { error: submitError } = await submit(email.trim(), password);
    setIsSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    // On success the session cookie is set (browser client writes it), the
    // proxy will let subsequent requests through — send the user onward.
    router.push('/');
    router.refresh();
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setResetLinkSent(false);
  }

  const inputClasses =
    'w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent';
  const primaryButtonClasses =
    'w-full rounded-xl bg-accent py-4 text-center text-base font-bold text-background transition-opacity disabled:opacity-40';

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-2xl font-bold text-text-primary">Wachtwoord vergeten</h1>
          <p className="text-base leading-relaxed text-text-secondary">
            {resetLinkSent
              ? 'Check je e-mail voor een link om een nieuw wachtwoord in te stellen.'
              : 'Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te stellen.'}
          </p>

          {!resetLinkSent && (
            <input
              className={inputClasses}
              type="email"
              placeholder="jij@voorbeeld.nl"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {!resetLinkSent && (
            <button type="submit" className={primaryButtonClasses} disabled={!canSubmit}>
              {isSubmitting ? 'Bezig…' : 'Verstuur reset-link'}
            </button>
          )}

          <button type="button" className="py-3 text-center text-sm text-text-secondary" onClick={() => switchMode('login')}>
            Terug naar inloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Adaptive Fitness</h1>
        <p className="text-base leading-relaxed text-text-secondary">
          {mode === 'login' ? 'Log in met je e-mail en wachtwoord.' : 'Maak een account aan met e-mail en wachtwoord.'}
        </p>

        <input
          className={inputClasses}
          type="email"
          placeholder="jij@voorbeeld.nl"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className={inputClasses}
          type="password"
          placeholder="Wachtwoord"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'signup' && password.length > 0 && !isValidPassword && (
          <p className="-mt-2 text-sm text-text-secondary">Minimaal {MIN_PASSWORD_LENGTH} tekens.</p>
        )}

        {mode === 'login' && (
          <button
            type="button"
            className="-mt-2 self-start text-sm font-semibold text-accent"
            onClick={() => switchMode('forgot')}
          >
            Wachtwoord vergeten?
          </button>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button type="submit" className={primaryButtonClasses} disabled={!canSubmit}>
          {isSubmitting ? 'Bezig…' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
        </button>

        <button
          type="button"
          className="py-3 text-center text-sm text-text-secondary"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Nog geen account? Registreren' : 'Al een account? Inloggen'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Reached via the password-reset email link (through /auth/callback, which
 * exchanges the code for a session and redirects here). Guarded by
 * `isPasswordRecovery` rather than just "has a session": an already
 * signed-in user who navigates here directly gets sent home instead of
 * shown the reset form — mirrors the Expo app's Stack.Protected ordering.
 */
export default function ResetPasswordPage() {
  const { session, isLoading, isPasswordRecovery, updatePassword, signOut } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && session && !isPasswordRecovery) {
      router.replace('/');
    }
  }, [isLoading, session, isPasswordRecovery, router]);

  const isValidPassword = password.length >= MIN_PASSWORD_LENGTH;
  const doPasswordsMatch = password === confirmPassword;
  const canSubmit = isValidPassword && doPasswordsMatch && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const { error: submitError } = await updatePassword(password);
    setIsSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleCancel() {
    await signOut();
    router.push('/login');
  }

  if (isLoading || !isPasswordRecovery) {
    return null;
  }

  const inputClasses =
    'w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold text-text-primary">Nieuw wachtwoord</h1>
        <p className="text-base leading-relaxed text-text-secondary">Kies een nieuw wachtwoord voor je account.</p>

        <input
          className={inputClasses}
          type="password"
          placeholder="Nieuw wachtwoord"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {password.length > 0 && !isValidPassword && (
          <p className="-mt-2 text-sm text-text-secondary">Minimaal {MIN_PASSWORD_LENGTH} tekens.</p>
        )}

        <input
          className={inputClasses}
          type="password"
          placeholder="Bevestig wachtwoord"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmPassword.length > 0 && !doPasswordsMatch && (
          <p className="-mt-2 text-sm text-text-secondary">Wachtwoorden komen niet overeen.</p>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-accent py-4 text-center text-base font-bold text-background disabled:opacity-40"
          disabled={!canSubmit}
        >
          {isSubmitting ? 'Bezig…' : 'Wachtwoord instellen'}
        </button>

        <button type="button" className="py-3 text-center text-sm text-text-secondary" onClick={handleCancel}>
          Annuleren
        </button>
      </form>
    </div>
  );
}

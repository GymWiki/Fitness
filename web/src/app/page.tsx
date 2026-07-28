'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function Home() {
  const { session, isLoading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-text-primary">
      <h1 className="text-2xl font-semibold">Adaptive Fitness — Next.js migratie</h1>
      <p className="max-w-md text-center text-text-secondary">
        Fase 0-2: scaffold, bedrijfslogica en auth staan. De kernschermen (Fase 3)
        volgen nog. De live app blijft op fitness-mocha-theta.vercel.app draaien
        tot deze versie feature-compleet en getest is.
      </p>
      <p className="text-sm text-text-tertiary">
        Supabase-omgevingsvariabelen: {supabaseConfigured ? 'geconfigureerd' : 'nog niet ingesteld'}
      </p>
      {!isLoading && session && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-4">
          <p className="text-sm text-text-secondary">Ingelogd als {session.user.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary"
          >
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}

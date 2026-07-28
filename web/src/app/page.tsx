const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-zinc-50">
      <h1 className="text-2xl font-semibold">Adaptive Fitness — Next.js migratie</h1>
      <p className="max-w-md text-center text-zinc-400">
        Fase 0-scaffold: nog niet gekoppeld aan het productie-domein. De live app
        blijft op fitness-mocha-theta.vercel.app draaien tot deze versie
        feature-compleet en getest is.
      </p>
      <p className="text-sm text-zinc-500">
        Supabase-omgevingsvariabelen: {supabaseConfigured ? 'geconfigureerd' : 'nog niet ingesteld'}
      </p>
    </div>
  );
}

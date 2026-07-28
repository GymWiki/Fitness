interface StatTileProps {
  label: string;
  value: string;
}

/** One motivating number, used in a row on the Progressie dashboard. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-surface px-3 py-4">
      <p className="text-[22px] font-bold text-accent">{value}</p>
      <p className="text-center text-xs leading-4 text-text-secondary">{label}</p>
    </div>
  );
}

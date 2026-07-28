interface EmptyStateProps {
  title: string;
  body: string;
}

/** Friendly explanation instead of a blank screen when a section has no data yet. */
export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <p className="text-center text-[17px] font-bold text-text-primary">{title}</p>
      <p className="max-w-[280px] text-center text-[15px] leading-[21px] text-text-secondary">{body}</p>
    </div>
  );
}

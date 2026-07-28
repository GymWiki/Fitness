'use client';

import type { PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
  className?: string;
  onClick?: () => void;
  elevated?: boolean;
}

/** The one card shape the whole app shares: surface + border + consistent radius/padding. */
export function Card({ children, className = '', onClick, elevated }: CardProps) {
  const base = `rounded-xl border border-border p-4 ${elevated ? 'bg-surface-elevated' : 'bg-surface'} ${className}`;
  if (!onClick) return <div className={base}>{children}</div>;
  return (
    <button type="button" onClick={onClick} className={`${base} text-left transition-opacity hover:opacity-90 active:opacity-70`}>
      {children}
    </button>
  );
}

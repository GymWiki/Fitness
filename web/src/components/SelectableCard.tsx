'use client';

import type { ReactNode } from 'react';

interface SelectableCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  /** Optional extra content rendered below the label/description, full card width (e.g. stat bars). */
  children?: ReactNode;
}

/** Tappable option card used by every picker screen (onboarding, profile edit). */
export function SelectableCard({ label, description, selected, onClick, icon, children }: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-3 w-full rounded-xl border p-4 text-left ${
        selected ? 'border-accent bg-accent-muted' : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">{icon}</div>
        ) : null}
        <div className="flex-1">
          <p className={`text-base font-semibold ${selected ? 'text-accent' : 'text-text-primary'}`}>{label}</p>
          {description ? <p className="mt-0.5 text-[13px] leading-[18px] text-text-secondary">{description}</p> : null}
        </div>
      </div>
      {children}
    </button>
  );
}

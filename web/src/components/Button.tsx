'use client';

import type { PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends PropsWithChildren {
  onClick: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-background',
  secondary: 'bg-surface-elevated border border-border-strong text-text-primary',
  danger: 'bg-danger-muted border border-danger text-danger',
  ghost: 'bg-transparent text-text-secondary',
};

/** Large tap targets by default — this is used mid-workout with sweaty fingers. */
export function Button({ children, onClick, variant = 'primary', disabled, loading, type = 'button' }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`flex min-h-[52px] items-center justify-center rounded-xl px-6 py-4 text-base font-bold disabled:opacity-40 ${VARIANT_CLASSES[variant]}`}
    >
      {loading ? '…' : children}
    </button>
  );
}

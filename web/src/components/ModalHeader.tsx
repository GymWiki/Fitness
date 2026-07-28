'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { typography } from '@/theme/typography';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  /** Extra content on the header's second row, e.g. a "bekijk geschiedenis"-style link. */
  right?: ReactNode;
  /** Defaults to `router.back()` — pass this only when a screen needs different close behavior. */
  onClose?: () => void;
}

/**
 * The one "title + Sluiten" header every modal/stack screen shares (workout,
 * history, week-review, adjustment-history, switch-goal, faq, readiness all
 * had their own hand-copied version of this before).
 */
export function ModalHeader({ title, subtitle, right, onClose }: ModalHeaderProps) {
  const router = useRouter();
  const handleClose = onClose ?? (() => router.back());

  return (
    <div className="flex flex-col gap-1 px-6 pt-6">
      <div className="flex items-center justify-between">
        <h1 className={typography.title}>{title}</h1>
        <button type="button" onClick={handleClose} className="min-h-11 text-[15px] font-semibold text-text-secondary">
          Sluiten
        </button>
      </div>
      {subtitle && <p className={typography.bodySecondary}>{subtitle}</p>}
      {right}
    </div>
  );
}

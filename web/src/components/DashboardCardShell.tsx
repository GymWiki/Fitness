import type { PropsWithChildren, ReactNode } from 'react';
import { Card } from './Card';

interface DashboardCardShellProps extends PropsWithChildren {
  title: string;
  icon?: ReactNode;
  isLoading: boolean;
  error?: string | null;
  onClick: () => void;
  ctaLabel: string;
}

/**
 * The one card shape every dashboard summary card renders through — same
 * `Card` component, same header layout, same loading/error handling, same
 * "whole card is the tap target" entry pattern — so the four cards read as
 * one consistent system instead of four one-off layouts. Each card owns its
 * own data fetch (see `TrainingTodayCard`/etc.), this only owns the shell.
 */
export function DashboardCardShell({ title, icon, isLoading, error, onClick, ctaLabel, children }: DashboardCardShellProps) {
  return (
    <Card className="flex h-full flex-col gap-2" onClick={onClick} elevated>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[15px] font-bold text-text-primary">{title}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}

      {!isLoading && error && <p className="text-[13px] text-danger">{error}</p>}

      {!isLoading && !error && (
        <>
          {children}
          <p className="mt-1 text-[13px] font-semibold text-accent">{ctaLabel} →</p>
        </>
      )}
    </Card>
  );
}

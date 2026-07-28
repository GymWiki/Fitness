'use client';

import { useRouter } from 'next/navigation';
import { fetchActiveProgram, type ActiveProgram, type ActiveProgramDay } from '@/lib/programs';
import { ensureScheduledWindow, fetchScheduledSessions, type ScheduledSessionRow } from '@/lib/schedule';
import { todayLocalDateString } from '@/lib/dates';
import { useCachedData } from '@/lib/useCachedData';
import { colors } from '@/theme/colors';
import { CalendarIcon } from './icons';
import { DashboardCardShell } from './DashboardCardShell';

/** "borst" | "borst en rug" | "borst, rug en schouders" — natural Dutch list join, not a comma-only dump. */
function joinWithEn(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

function describeDay(day: ActiveProgramDay): string {
  const muscleGroups = [...new Set(day.exercises.map((exercise) => exercise.muscleGroup).filter((mg): mg is string => !!mg))];
  const exerciseCount = day.exercises.length;
  const exerciseLabel = exerciseCount === 1 ? 'oefening' : 'oefeningen';
  return muscleGroups.length > 0 ? `${exerciseCount} ${exerciseLabel} · ${joinWithEn(muscleGroups.map((mg) => mg.toLowerCase()))}` : `${exerciseCount} ${exerciseLabel}`;
}

interface TrainingTodayData {
  program: ActiveProgram | null;
  // undefined = no calendar schedule available (older account, or fetch failed) -> fall back to the day-count rotation.
  scheduledToday: ScheduledSessionRow | null | undefined;
}

async function loadScheduledToday(userId: string): Promise<ScheduledSessionRow | null | undefined> {
  try {
    await ensureScheduledWindow(userId);
    const today = todayLocalDateString();
    const rows = await fetchScheduledSessions(userId, today, today);
    return rows[0] ?? null;
  } catch {
    return undefined; // calendar planning unavailable right now — fall back silently, this section never blocks on it
  }
}

// The program fetch and the schedule fetch don't depend on each other's result, so they run
// concurrently instead of one blocking the other.
async function loadTrainingTodayData(userId: string): Promise<TrainingTodayData> {
  const [program, scheduledToday] = await Promise.all([fetchActiveProgram(userId), loadScheduledToday(userId)]);
  return { program, scheduledToday };
}

export function TrainingTodayCard({ userId }: { userId: string }) {
  const router = useRouter();
  // Keyed by today's date so a cached value never leaks into the next day (e.g. yesterday's "done" badge).
  const { data, isLoading, error } = useCachedData(`training_today:${userId}:${todayLocalDateString()}`, () => loadTrainingTodayData(userId));

  const program = data?.program ?? null;
  const scheduledToday = data?.scheduledToday;
  const hasSchedule = scheduledToday !== undefined;
  const isRestDayScheduled = hasSchedule && scheduledToday?.status === 'rest';
  const isDoneToday = hasSchedule && scheduledToday?.status === 'done';
  const scheduledDay = scheduledToday?.programDayId ? (program?.days.find((day) => day.id === scheduledToday.programDayId) ?? null) : null;
  const rotationFallbackDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;
  const todayDay = hasSchedule ? scheduledDay : rotationFallbackDay;

  // On a rest day (or once the calendar plan runs out) there's no specific day to open — the CTA
  // always has somewhere useful to go instead of silently doing nothing when clicked.
  const ctaLabel = todayDay ? (isDoneToday ? 'Bekijk resultaat' : 'Start training') : 'Naar schema';

  return (
    <DashboardCardShell
      title="Training vandaag"
      icon={<CalendarIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onClick={() => router.push(todayDay ? `/workout/${todayDay.id}` : '/schema')}
      ctaLabel={ctaLabel}
    >
      {todayDay ? (
        <>
          {isDoneToday && <p className="text-xs font-bold text-accent">Getraind vandaag ✓</p>}
          <p className="text-[17px] font-bold text-text-primary">
            Dag {todayDay.dayOrder}: {todayDay.name}
          </p>
          <p className="-mt-1 text-[13px] text-text-secondary">{describeDay(todayDay)}</p>
        </>
      ) : isRestDayScheduled ? (
        <p className="-mt-1 text-[13px] text-text-secondary">Rustdag — zo gepland in je schema. Geniet ervan.</p>
      ) : (
        <p className="-mt-1 text-[13px] text-text-secondary">
          {program ? 'Geen training gepland — geniet van je rustdag.' : 'Nog geen actief programma. Rond de intake af om te starten.'}
        </p>
      )}
    </DashboardCardShell>
  );
}

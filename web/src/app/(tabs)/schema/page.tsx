'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/lib/auth/AuthProvider';
import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import { todayLocalDateString, toLocalDateString } from '@/lib/dates';
import { useProfile } from '@/lib/profile';
import { ensureScheduledWindow, fetchScheduledSessions, type ScheduledSessionRow } from '@/lib/schedule';
import { ScheduleDayDetail } from '@/components/ScheduleDayDetail';
import { WeekCardRow } from '@/components/WeekCardRow';
import { fetchSchemaProgram, type SchemaProgram } from '@/lib/schemaEditor';

/** Two full ISO weeks (current + next), matching what `WeekCardRow` renders. */
const WINDOW_DAYS = 14;

export default function SchemaPage() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const [program, setProgram] = useState<SchemaProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduledSessionRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayLocalDateString());

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchSchemaProgram(session.user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon je schema niet laden.');
    } finally {
      setIsLoading(false);
    }

    try {
      await ensureScheduledWindow(session.user.id);
      const weekStart = startOfIsoWeek(new Date());
      const rangeStart = toLocalDateString(weekStart);
      const rangeEnd = toLocalDateString(addDays(weekStart, WINDOW_DAYS - 1));
      setScheduleRows(await fetchScheduledSessions(session.user.id, rangeStart, rangeEnd));
    } catch {
      setScheduleRows([]); // no calendar plan available (not set up yet, or offline) — the section just doesn't render
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch, same as useCachedData
    load();
  }, [load]);

  const activeDays = program?.days.filter((day) => day.isActive) ?? [];
  const selectedRow = scheduleRows.find((row) => row.date === selectedDate) ?? null;
  const selectedSchemaDay = (selectedRow?.programDayId && program?.days.find((day) => day.id === selectedRow.programDayId)) || null;

  return (
    <div className="min-h-screen bg-background px-6 pb-6" style={{ paddingTop: 52 }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">Schema</h1>
            {program ? <p className="mb-2 text-[15px] text-text-secondary">{program.name}</p> : null}
          </div>
          <Link href="/switch-goal" className="mt-1 text-[13px] font-semibold text-accent">
            Ander doel kiezen
          </Link>
        </div>

        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoading && error && <p className="text-sm text-danger">{error}</p>}

        {!isLoading && !error && !program && (
          <EmptyState title="Nog geen programma" body="Zodra je de intake afrondt, kun je hier je schema bekijken en aanpassen." />
        )}

        {!isLoading && !error && program && scheduleRows.length > 0 && (
          <>
            <WeekCardRow rows={scheduleRows} selectedDateIso={selectedDate} onSelectDay={setSelectedDate} />
            {session && (
              <ScheduleDayDetail
                userId={session.user.id}
                dateIso={selectedDate}
                row={selectedRow}
                goal={profile?.goal ?? 'mixed'}
                experienceLevel={profile?.experienceLevel ?? 'intermediate'}
                schemaDay={selectedSchemaDay}
                equipment={profile?.equipment ?? 'gym'}
                canRemove={activeDays.length > 1}
                onChanged={load}
              />
            )}
          </>
        )}

        {!isLoading && !error && program && scheduleRows.length === 0 && !profile?.preferredWeekdays && (
          <Link href="/profile">
            <Card className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold text-text-primary">Wanneer train je?</p>
              <p className="text-[15px] leading-[21px] text-text-secondary">
                Stel je voorkeursdagen in bij Profiel voor een concreet 2-wekenoverzicht — dan hoef je nooit meer te
                gokken of vandaag een trainingsdag is.
              </p>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}

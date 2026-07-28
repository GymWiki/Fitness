'use client';

import type { EquipmentType, ExperienceLevel } from '@fitness/program-generator';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LineChart } from '@/components/LineChart';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BMI_CATEGORY_LABELS, bmiCategory, calculateBmi } from '@/lib/bmi';
import { formatShortDate } from '@/lib/dates';
import { fetchMeasurementHistory, saveMeasurement, type BodyMeasurement } from '@/lib/measurements';
import { GOAL_LABELS, physiqueOption } from '@/lib/physique';
import { fetchProgramHistory, type ProgramHistoryEntry } from '@/lib/programs';
import { updateProfile, useProfile } from '@/lib/profile';
import { useWindowWidth } from '@/lib/useWindowWidth';
import { typography } from '@/theme/typography';

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Gemiddeld' },
  { value: 'advanced', label: 'Gevorderd' },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: 'gym', label: 'Sportschool' },
  { value: 'home_dumbbells', label: 'Dumbbells thuis' },
  { value: 'bodyweight', label: 'Eigen lichaamsgewicht' },
];

const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6, 7];

const WEEKDAY_LABELS: Record<number, string> = { 1: 'ma', 2: 'di', 3: 'wo', 4: 'do', 5: 'vr', 6: 'za', 7: 'zo' };

function formatPreferredWeekdays(days: number[] | null): string {
  if (!days || days.length === 0) return 'Nog niet ingesteld';
  return [...days].sort((a, b) => a - b).map((day) => WEEKDAY_LABELS[day]).join(', ');
}

function parsePositiveFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const chipClasses = (selected: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-semibold ${
    selected ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface-elevated text-text-secondary'
  }`;

const inputClasses =
  'w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent';

function ProfileEditForm({ onClose }: { onClose: () => void }) {
  const { profile, refresh } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(profile?.experienceLevel ?? null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(profile?.daysPerWeek ?? null);
  const [equipment, setEquipment] = useState<EquipmentType | null>(profile?.equipment ?? null);
  const [preferredWeekdays, setPreferredWeekdays] = useState<number[]>(
    profile?.preferredWeekdays && profile.preferredWeekdays.length === profile.daysPerWeek ? profile.preferredWeekdays : [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = experienceLevel !== null && daysPerWeek !== null && equipment !== null && preferredWeekdays.length === daysPerWeek;

  function selectDaysPerWeek(value: number) {
    setDaysPerWeek(value);
    if (preferredWeekdays.length !== value) setPreferredWeekdays([]);
  }

  async function handleSave() {
    if (!profile || !canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile(profile.id, {
        displayName: displayName.trim() || null,
        experienceLevel: experienceLevel!,
        daysPerWeek: daysPerWeek!,
        equipment: equipment!,
        preferredWeekdays,
      });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-1">
      <p className={`${typography.label} mb-2 mt-2`}>Naam</p>
      <input className={inputClasses} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jouw naam" />

      <p className={`${typography.label} mb-2 mt-3`}>Ervaring</p>
      <div className="flex flex-wrap gap-2">
        {EXPERIENCE_OPTIONS.map((option) => (
          <button type="button" key={option.value} className={chipClasses(experienceLevel === option.value)} onClick={() => setExperienceLevel(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <p className={`${typography.label} mb-2 mt-3`}>Dagen per week</p>
      <div className="flex flex-wrap gap-2">
        {DAYS_PER_WEEK_OPTIONS.map((value) => (
          <button
            type="button"
            key={value}
            className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border text-lg font-bold ${
              daysPerWeek === value ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface-elevated text-text-primary'
            }`}
            onClick={() => selectDaysPerWeek(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {daysPerWeek !== null && daysPerWeek !== profile?.daysPerWeek && (
        <p className="text-sm leading-5 text-text-secondary">
          Dit wijzigt alleen je toekomstige planning. De opbouw van je huidige schema (welke dagen, welke oefeningen)
          verandert hier niet mee — kies daarvoor &quot;Ander doel kiezen&quot;.
        </p>
      )}

      {daysPerWeek !== null && (
        <>
          <p className={`${typography.label} mb-2 mt-3`}>Voorkeursdagen</p>
          <p className="mb-2 text-sm leading-5 text-text-secondary">We plannen je schema vanaf nu op deze vaste dagen, 2 weken vooruit.</p>
          <WeekdayPicker selected={preferredWeekdays} requiredCount={daysPerWeek} onChange={setPreferredWeekdays} />
        </>
      )}

      <p className={`${typography.label} mb-2 mt-3`}>Materiaal</p>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((option) => (
          <button type="button" key={option.value} className={chipClasses(equipment === option.value)} onClick={() => setEquipment(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}

      <div className="mt-4 flex items-center justify-end gap-4">
        <button type="button" className="px-2 py-3 text-sm font-semibold text-text-secondary" onClick={onClose} disabled={isSaving}>
          Annuleren
        </button>
        <div className="min-w-[120px]">
          <Button onClick={handleSave} disabled={!canSave} loading={isSaving}>
            Opslaan
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AddMeasurementForm({ latestHeightCm, onSaved, onClose }: { latestHeightCm: number | null; onSaved: () => Promise<void>; onClose: () => void }) {
  const { session } = useAuth();
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState(latestHeightCm ? String(latestHeightCm) : '');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedWeightKg = parsePositiveFloat(weightKg);
  const parsedHeightCm = parsePositiveFloat(heightCm);
  const canSave = parsedWeightKg !== null && parsedHeightCm !== null;

  async function handleSave() {
    if (!session || !canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveMeasurement(session.user.id, {
        weightKg: parsedWeightKg!,
        heightCm: parsedHeightCm!,
        bodyFatPercent: bodyFatPercent.trim() === '' ? null : parsePositiveFloat(bodyFatPercent),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-1">
      <p className={`${typography.label} mb-2 mt-2`}>Gewicht (kg)</p>
      <input className={inputClasses} inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
      <p className={`${typography.label} mb-2 mt-3`}>Lengte (cm)</p>
      <input className={inputClasses} inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
      <p className={`${typography.label} mb-2 mt-3`}>Vetpercentage (optioneel)</p>
      <input className={inputClasses} inputMode="decimal" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)} />
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
      <div className="mt-4 flex items-center justify-end gap-4">
        <button type="button" className="px-2 py-3 text-sm font-semibold text-text-secondary" onClick={onClose} disabled={isSaving}>
          Annuleren
        </button>
        <div className="min-w-[120px]">
          <Button onClick={handleSave} disabled={!canSave} loading={isSaving}>
            Opslaan
          </Button>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-border py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { session, signOut } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const windowWidth = useWindowWidth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true);
  const [programHistory, setProgramHistory] = useState<ProgramHistoryEntry[]>([]);

  const loadMeasurements = useCallback(async () => {
    if (!session) return;
    setIsLoadingMeasurements(true);
    try {
      setMeasurements(await fetchMeasurementHistory(session.user.id));
    } finally {
      setIsLoadingMeasurements(false);
    }
  }, [session]);

  const loadProgramHistory = useCallback(async () => {
    if (!session) return;
    try {
      setProgramHistory(await fetchProgramHistory(session.user.id));
    } catch {
      // Non-critical section — a load failure here shouldn't block the rest of the profile screen.
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch, same as useCachedData
    loadMeasurements();
    loadProgramHistory();
  }, [loadMeasurements, loadProgramHistory]);

  const latest = measurements[measurements.length - 1] ?? null;
  const bmi = latest ? calculateBmi(latest.weightKg, latest.heightCm) : null;
  const chartWidth = Math.min(windowWidth - 80, 480);
  const weightPoints = measurements.map((m) => ({ date: m.measuredAt, value: m.weightKg }));

  return (
    <div className="min-h-screen bg-background px-6 pb-8" style={{ paddingTop: 52 }}>
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <h1 className="text-[28px] font-bold text-text-primary">Profiel</h1>
        <p className="mb-2 text-[15px] text-text-secondary">{session?.user.email}</p>

        {isProfileLoading && (
          <div className="mt-4 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isProfileLoading && profile && !isEditingProfile && (
          <Card className="flex flex-col gap-1">
            <div className="mb-1 flex items-center justify-between">
              <p className={typography.heading}>Jouw gegevens</p>
              <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => setIsEditingProfile(true)}>
                Bewerken
              </button>
            </div>
            {profile.displayName && <InfoRow label="Naam" value={profile.displayName} />}
            <InfoRow label="Streeffysiek" value={profile.targetPhysique ? physiqueOption(profile.targetPhysique).label : '–'} />
            <InfoRow label="Ervaring" value={EXPERIENCE_OPTIONS.find((o) => o.value === profile.experienceLevel)?.label ?? '–'} />
            <InfoRow label="Dagen per week" value={String(profile.daysPerWeek)} />
            <InfoRow label="Voorkeursdagen" value={formatPreferredWeekdays(profile.preferredWeekdays)} />
            <InfoRow label="Materiaal" value={EQUIPMENT_OPTIONS.find((o) => o.value === profile.equipment)?.label ?? '–'} />
            <Link href="/switch-goal" className="mt-2 text-[13px] font-semibold text-accent">
              Ander doel kiezen
            </Link>
          </Card>
        )}

        {!isProfileLoading && profile && isEditingProfile && <ProfileEditForm onClose={() => setIsEditingProfile(false)} />}

        <div className="mt-2 flex items-center justify-between">
          <p className={typography.heading}>Lichaamsmetingen</p>
          {!isAddingMeasurement && (
            <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => setIsAddingMeasurement(true)}>
              Nieuwe meting
            </button>
          )}
        </div>

        {isAddingMeasurement && (
          <AddMeasurementForm latestHeightCm={latest?.heightCm ?? null} onSaved={loadMeasurements} onClose={() => setIsAddingMeasurement(false)} />
        )}

        {isLoadingMeasurements && (
          <div className="mt-2 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoadingMeasurements && latest && (
          <>
            <Card className="flex flex-col gap-1">
              <InfoRow label="Gewicht" value={`${latest.weightKg} kg`} />
              <InfoRow label="Lengte" value={`${latest.heightCm} cm`} />
              {latest.bodyFatPercent !== null && <InfoRow label="Vetpercentage" value={`${latest.bodyFatPercent}%`} />}
              {bmi !== null && <InfoRow label="BMI" value={`${bmi.toFixed(1)} · ${BMI_CATEGORY_LABELS[bmiCategory(bmi)]}`} />}
            </Card>
            {weightPoints.length > 1 && <LineChart points={weightPoints} width={chartWidth} unit=" kg" />}
          </>
        )}

        {!isLoadingMeasurements && !latest && !isAddingMeasurement && (
          <EmptyState title="Nog geen metingen" body="Log je gewicht en lengte om je voortgang over tijd te zien." />
        )}

        {programHistory.length > 1 && (
          <>
            <p className={`${typography.heading} mt-2`}>Eerdere schema&apos;s</p>
            <Card className="flex flex-col gap-1">
              {programHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-t border-border py-1 first:border-t-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{entry.name}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {GOAL_LABELS[entry.goal]} · sinds {formatShortDate(entry.startedAt)}
                    </p>
                  </div>
                  {entry.status === 'active' && <span className="ml-3 text-xs font-bold text-accent">Actief</span>}
                </div>
              ))}
            </Card>
          </>
        )}

        <Link href="/faq" className="mt-2 flex justify-center py-2 text-sm font-semibold text-accent">
          Wetenschap — waarom werkt dit zo?
        </Link>

        <div className="mb-8 mt-2">
          <Button variant="danger" onClick={signOut}>
            Uitloggen
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Ma' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Wo' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Vr' },
  { value: 6, label: 'Za' },
  { value: 7, label: 'Zo' },
];

interface WeekdayPickerProps {
  selected: number[];
  /** How many days need to be picked — normally the profile's daysPerWeek. */
  requiredCount: number;
  onChange: (next: number[]) => void;
}

/** Fixed weekday picker (ma-zo) used to set the calendar schedule's training days — shared by onboarding and Profiel so the two never drift in behavior. */
export function WeekdayPicker({ selected, requiredCount, onChange }: WeekdayPickerProps) {
  function toggle(value: number) {
    if (selected.includes(value)) {
      onChange(selected.filter((day) => day !== value));
    } else if (selected.length < requiredCount) {
      onChange([...selected, value].sort((a, b) => a - b));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => toggle(option.value)}
              className={`min-h-11 min-w-11 rounded-full border px-3 text-sm font-semibold ${
                isSelected ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface text-text-secondary'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        {selected.length} van {requiredCount} dagen gekozen
      </p>
    </div>
  );
}

/** Step-progress indicator for short wizards (onboarding). */
export function ProgressDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`h-1 flex-1 rounded-full ${
            index === currentIndex ? 'bg-accent' : index < currentIndex ? 'bg-border-strong' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

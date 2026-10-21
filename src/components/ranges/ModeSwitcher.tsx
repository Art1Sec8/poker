'use client';

export type RangeMode = 'explore' | 'learn' | 'drill';

const MODES: { id: RangeMode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'learn', label: 'Learn' },
  { id: 'drill', label: 'Drill' },
];

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: RangeMode;
  onChange: (m: RangeMode) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide uppercase transition-all ${
            mode === m.id
              ? 'bg-gold/20 text-gold border border-gold/30'
              : 'text-gold-light/40 hover:text-gold-light/60 border border-transparent'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useGame } from '@/context/GameContext';
import { StakesLevel } from '@/engine/types';

const STAKES: { level: StakesLevel; label: string; blinds: string }[] = [
  { level: 'micro', label: 'Micro', blinds: '1/2 - 5/10' },
  { level: 'low', label: 'Low', blinds: '10/25 - 25/50' },
  { level: 'mid', label: 'Mid', blinds: '50/100 - 200/400' },
  { level: 'high', label: 'High', blinds: '500/1000+' },
];

export function StakesSelector() {
  const { stakes, setStakes } = useGame();

  return (
    <div className="flex gap-1.5">
      {STAKES.map(s => (
        <button
          key={s.level}
          onClick={() => setStakes(s.level)}
          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold tracking-wide uppercase transition-all ${
            stakes === s.level
              ? 'bg-gold/20 text-gold border border-gold/30'
              : 'text-gold-light/40 hover:text-gold-light/60 border border-transparent'
          }`}
          title={s.blinds}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

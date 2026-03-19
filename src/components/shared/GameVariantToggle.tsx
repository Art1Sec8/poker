'use client';

import { useGame } from '@/context/GameContext';
import { GameVariant } from '@/engine/types';

export function GameVariantToggle() {
  const { variant, setVariant } = useGame();

  return (
    <div className="flex rounded-lg overflow-hidden border border-gold/20">
      <ToggleButton active={variant === 'holdem'} onClick={() => setVariant('holdem')} label="Hold'em" />
      <ToggleButton active={variant === 'plo'} onClick={() => setVariant('plo')} label="PLO" />
    </div>
  );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
        active
          ? 'bg-gold/20 text-gold border-gold/30'
          : 'bg-transparent text-gold-light/40 hover:text-gold-light/60'
      }`}
    >
      {label}
    </button>
  );
}

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { GameVariant, StakesLevel } from '@/engine/types';

interface GameContextType {
  variant: GameVariant;
  setVariant: (v: GameVariant) => void;
  stakes: StakesLevel;
  setStakes: (s: StakesLevel) => void;
}

const GameContext = createContext<GameContextType>({
  variant: 'holdem',
  setVariant: () => {},
  stakes: 'low',
  setStakes: () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<GameVariant>('holdem');
  const [stakes, setStakes] = useState<StakesLevel>('low');

  return (
    <GameContext.Provider value={{ variant, setVariant, stakes, setStakes }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}

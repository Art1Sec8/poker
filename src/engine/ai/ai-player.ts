import { ActionRecord, GameState } from '../types';
import { FishAI } from './fish-ai';
import { RegularAI } from './regular-ai';
import { SharkAI } from './shark-ai';

export interface AIPlayer {
  difficulty: 'fish' | 'regular' | 'shark';
  decide(state: GameState, playerIndex: number): ActionRecord;
}

export function createAIPlayer(difficulty: 'fish' | 'regular' | 'shark' | 'random'): AIPlayer {
  const actualDifficulty = difficulty === 'random'
    ? (['fish', 'regular', 'shark'] as const)[Math.floor(Math.random() * 3)]
    : difficulty;

  switch (actualDifficulty) {
    case 'fish': return new FishAI();
    case 'regular': return new RegularAI();
    case 'shark': return new SharkAI();
  }
}

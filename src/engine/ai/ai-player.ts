import { ActionRecord, GameState } from '../types';

export interface AIPlayer {
  difficulty: 'fish' | 'regular' | 'shark';
  decide(state: GameState, playerIndex: number): ActionRecord;
}

export function createAIPlayer(difficulty: 'fish' | 'regular' | 'shark' | 'random'): AIPlayer {
  const actualDifficulty = difficulty === 'random'
    ? (['fish', 'regular', 'shark'] as const)[Math.floor(Math.random() * 3)]
    : difficulty;

  switch (actualDifficulty) {
    case 'fish':
      return new (require('./fish-ai').FishAI)();
    case 'regular':
      return new (require('./regular-ai').RegularAI)();
    case 'shark':
      return new (require('./shark-ai').SharkAI)();
  }
}

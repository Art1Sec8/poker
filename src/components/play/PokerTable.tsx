'use client';

import { motion } from 'framer-motion';
import { ActionRecord, GameState, PlayerState } from '@/engine/types';
import { CardGroup } from '@/components/ui/PlayingCard';

interface PokerTableProps {
  state: GameState;
  timerSeconds: number;
  isTimerRunning: boolean;
  /**
   * The local player's seat id. The player with this id is drawn at the bottom
   * ("hero"); everyone else is an opponent around the top. Omit for single
   * player, where the (only) human is the hero.
   */
  heroId?: number;
}

function getLastAction(state: GameState, playerId: number): ActionRecord | undefined {
  for (let i = state.actionHistory.length - 1; i >= 0; i--) {
    if (state.actionHistory[i].playerId === playerId && state.actionHistory[i].street === state.street) {
      return state.actionHistory[i];
    }
  }
  return undefined;
}

function actionLabelStyle(type: string): string {
  switch (type) {
    case 'fold': return 'bg-red-900/40 text-red-300/70';
    case 'check': return 'bg-steel/20 text-blue-300/70';
    case 'call': return 'bg-steel/20 text-blue-300/70';
    case 'bet':
    case 'raise': return 'bg-gold/15 text-gold/80';
    case 'allin': return 'bg-gold/25 text-gold';
    default: return 'bg-midnight/50 text-gold/40';
  }
}

export function PokerTable({ state, timerSeconds, isTimerRunning, heroId }: PokerTableProps) {
  // The hero is the local player. In multiplayer every player is human, so we
  // must pick the hero by seat id; single player falls back to the lone human.
  const hero = heroId !== undefined
    ? state.players.find(p => p.id === heroId)
    : state.players.find(p => p.isHuman);
  // A hero who busted out (chips === 0) is filtered from gameState.players on
  // subsequent hands. They're still seated in the room, so show a spectating
  // indicator rather than silently dropping their seat.
  const heroBustedSpectating = heroId !== undefined && !hero;
  const opponents = state.players.filter(p => p !== hero);
  const cardCount = state.variant === 'plo' ? 4 : 2;

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[4/3]">
      {/* Table felt */}
      <div className="absolute inset-0 felt-bg rounded-[50%] border-4 border-amber-900/60 shadow-2xl vignette" />

      {/* Table rail */}
      <div className="absolute inset-[-8px] rounded-[50%] border-2 border-gold/20" />

      {/* Pot display */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 text-center z-10">
        <motion.div
          key={state.pot}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-gold font-bold text-lg"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          ${state.pot}
        </motion.div>
        <div className="text-[10px] text-gold/40 uppercase tracking-widest">{state.street}</div>
      </div>

      {/* Board cards */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 z-10">
        {state.board.length > 0 && (
          <CardGroup cards={state.board} size="sm" overlap={false} />
        )}
      </div>

      {/* Opponent seats — spread across the top arc (a lone opponent sits dead
          center, like a real heads-up table) */}
      {opponents.map((opp, i) => {
        const n = opponents.length;
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = 14 + 72 * t;                       // 14%..86% left-to-right
        const y = 18 - Math.sin(Math.PI * t) * 9;    // gentle arc, center highest
        const idx = state.players.indexOf(opp);

        return (
          <div
            key={opp.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <PlayerSeat
              player={opp}
              isActive={state.currentPlayerIndex === idx}
              showCards={state.isHandComplete}
              isDealer={state.dealerIndex === idx}
              cardCount={cardCount}
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning && state.currentPlayerIndex === idx}
              lastAction={getLastAction(state, opp.id)}
            />
          </div>
        );
      })}

      {/* Hero seat (local player, bottom center) */}
      {hero && (
        <div className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 z-10">
          <PlayerSeat
            player={hero}
            isActive={state.currentPlayerIndex === state.players.indexOf(hero)}
            showCards={true}
            isHero
            isDealer={state.dealerIndex === state.players.indexOf(hero)}
            cardCount={cardCount}
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning && state.currentPlayerIndex === state.players.indexOf(hero)}
            lastAction={getLastAction(state, hero.id)}
          />
        </div>
      )}

      {/* Busted hero — no active seat this hand, show spectating state */}
      {heroBustedSpectating && (
        <div className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 z-10">
          <div className="glass rounded-lg px-4 py-2 text-center">
            <p className="text-sm font-bold text-gold-light/80">Busted</p>
            <p className="text-[10px] text-gold-light/40 uppercase tracking-widest">Spectating</p>
          </div>
        </div>
      )}

    </div>
  );
}

function PlayerSeat({
  player, isActive, showCards, isHero = false, isDealer = false, cardCount = 2, timerSeconds, isTimerRunning, lastAction,
}: {
  player: PlayerState;
  isActive: boolean;
  showCards: boolean;
  isHero?: boolean;
  isDealer?: boolean;
  cardCount?: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  lastAction?: ActionRecord;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${!player.isActive ? 'opacity-40' : ''}`}>
      {/* Avatar ring */}
      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
        isActive ? 'ring-2 ring-gold shadow-lg shadow-gold/20' : 'ring-1 ring-white/10'
      } bg-midnight`}>
        {player.name.charAt(0)}

        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -right-2 -top-2 z-20 w-5 h-5 rounded-full bg-gradient-to-br from-gold to-gold-dark text-background text-[8px] font-black flex items-center justify-center shadow-lg">
            D
          </div>
        )}

        {/* Timer ring */}
        {isActive && isTimerRunning && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20" cy="20" r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gold/30"
            />
            <motion.circle
              cx="20" cy="20" r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gold"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - timerSeconds / 30)}`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Name + chips */}
      <div className="text-center">
        <div className="text-[11px] font-semibold text-gold-light/80 truncate max-w-[84px]">{player.name}</div>
        <div className="text-xs font-bold text-gold">${player.chips}</div>
      </div>

      {/* Cards. Hero always sees their own face-up. Opponents show face-down
          backs while in the hand (the server strips their real cards), and are
          revealed at showdown. Folded players (inactive) show nothing. */}
      {showCards && player.holeCards.length > 0 ? (
        <div className="flex gap-0.5">
          <CardGroup cards={player.holeCards} size={isHero ? 'md' : 'sm'} overlap={true} />
        </div>
      ) : player.isActive ? (
        <div className="flex gap-0.5">
          <CardGroup cards={Array(cardCount).fill(0)} size="sm" faceDown={true} overlap={true} />
        </div>
      ) : null}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[11px] text-gold/70 font-semibold bg-midnight/80 px-2 py-0.5 rounded-full"
        >
          ${player.currentBet}
        </motion.div>
      )}

      {/* Last action label */}
      {lastAction && (
        <motion.div
          key={`${lastAction.type}-${lastAction.timestamp}`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${actionLabelStyle(lastAction.type)}`}
        >
          {lastAction.type}{lastAction.amount > 0 ? ` $${lastAction.amount}` : ''}
        </motion.div>
      )}
    </div>
  );
}

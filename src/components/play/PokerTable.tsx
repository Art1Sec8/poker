'use client';

import { motion } from 'framer-motion';
import { ActionRecord, GameState, PlayerState } from '@/engine/types';
import { CardGroup } from '@/components/ui/PlayingCard';

interface PokerTableProps {
  state: GameState;
  timerSeconds: number;
  isTimerRunning: boolean;
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

export function PokerTable({ state, timerSeconds, isTimerRunning }: PokerTableProps) {
  const humanPlayer = state.players.find(p => p.isHuman);
  const opponents = state.players.filter(p => !p.isHuman);

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

      {/* Opponent seats */}
      {opponents.map((opp, i) => {
        const angle = Math.PI * (0.2 + (0.6 * i) / Math.max(opponents.length - 1, 1));
        const x = 50 + 40 * Math.cos(angle);
        const y = 10 + 20 * Math.sin(angle);

        return (
          <div
            key={opp.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <PlayerSeat
              player={opp}
              isActive={state.currentPlayerIndex === state.players.indexOf(opp)}
              showCards={state.isHandComplete}
              isDealer={state.dealerIndex === state.players.indexOf(opp)}
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning && state.currentPlayerIndex === state.players.indexOf(opp)}
              lastAction={getLastAction(state, opp.id)}
            />
          </div>
        );
      })}

      {/* Human player seat (bottom center) */}
      {humanPlayer && (
        <div className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 z-10">
          <PlayerSeat
            player={humanPlayer}
            isActive={state.currentPlayerIndex === state.players.indexOf(humanPlayer)}
            showCards={true}
            isHero
            isDealer={state.dealerIndex === state.players.indexOf(humanPlayer)}
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning && state.currentPlayerIndex === state.players.indexOf(humanPlayer)}
            lastAction={getLastAction(state, humanPlayer.id)}
          />
        </div>
      )}

    </div>
  );
}

function PlayerSeat({
  player, isActive, showCards, isHero = false, isDealer = false, timerSeconds, isTimerRunning, lastAction,
}: {
  player: PlayerState;
  isActive: boolean;
  showCards: boolean;
  isHero?: boolean;
  isDealer?: boolean;
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
        <div className="text-[9px] font-semibold text-gold-light/80 truncate max-w-[70px]">{player.name}</div>
        <div className="text-[10px] font-bold text-gold">${player.chips}</div>
      </div>

      {/* Cards */}
      {player.holeCards.length > 0 && (
        <div className="flex gap-0.5">
          {showCards ? (
            <CardGroup cards={player.holeCards} size={isHero ? 'md' : 'sm'} overlap={true} />
          ) : (
            <CardGroup cards={player.holeCards} size="sm" faceDown={true} overlap={true} />
          )}
        </div>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[10px] text-gold/70 font-semibold bg-midnight/80 px-2 py-0.5 rounded-full"
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
          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${actionLabelStyle(lastAction.type)}`}
        >
          {lastAction.type}{lastAction.amount > 0 ? ` $${lastAction.amount}` : ''}
        </motion.div>
      )}
    </div>
  );
}

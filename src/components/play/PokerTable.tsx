'use client';

import { motion } from 'framer-motion';
import { GameState, PlayerState } from '@/engine/types';
import { CardGroup } from '@/components/ui/PlayingCard';
import { cardToDisplay } from '@/engine/card';

interface PokerTableProps {
  state: GameState;
  timerSeconds: number;
  isTimerRunning: boolean;
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
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 z-10">
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
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning && state.currentPlayerIndex === state.players.indexOf(opp)}
            />
          </div>
        );
      })}

      {/* Human player seat (bottom center) */}
      {humanPlayer && (
        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-10">
          <PlayerSeat
            player={humanPlayer}
            isActive={state.currentPlayerIndex === state.players.indexOf(humanPlayer)}
            showCards={true}
            isHero
            timerSeconds={timerSeconds}
            isTimerRunning={isTimerRunning && state.currentPlayerIndex === state.players.indexOf(humanPlayer)}
          />
        </div>
      )}

      {/* Dealer button */}
      <div
        className="absolute z-20 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-gold-dark text-background text-[9px] font-black flex items-center justify-center shadow-lg"
        style={{
          left: `${50 + 30 * Math.cos(Math.PI * 0.5 + (state.dealerIndex * 2 * Math.PI) / state.players.length)}%`,
          top: `${50 + 25 * Math.sin(Math.PI * 0.5 + (state.dealerIndex * 2 * Math.PI) / state.players.length)}%`,
        }}
      >
        D
      </div>
    </div>
  );
}

function PlayerSeat({
  player, isActive, showCards, isHero = false, timerSeconds, isTimerRunning,
}: {
  player: PlayerState;
  isActive: boolean;
  showCards: boolean;
  isHero?: boolean;
  timerSeconds: number;
  isTimerRunning: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${!player.isActive ? 'opacity-40' : ''}`}>
      {/* Avatar ring */}
      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
        isActive ? 'ring-2 ring-gold shadow-lg shadow-gold/20' : 'ring-1 ring-white/10'
      } bg-midnight`}>
        {player.name.charAt(0)}

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
    </div>
  );
}

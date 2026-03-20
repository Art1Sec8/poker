'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ActionRecord, Card, GameVariant } from '@/engine/types';
import { CardGroup } from '@/components/ui/PlayingCard';

interface SavedHand {
  timestamp: number;
  handNumber: number;
  variant: GameVariant;
  board: Card[];
  players: {
    id: number;
    name: string;
    chips: number;
    holeCards: Card[];
    position: string;
    isActive: boolean;
  }[];
  pot: number;
  actionHistory: ActionRecord[];
  smallBlind: number;
  bigBlind: number;
}

interface HandReplayProps {
  hand: SavedHand;
  onClose: () => void;
}

export function HandReplay({ hand, onClose }: HandReplayProps) {
  const [actionIndex, setActionIndex] = useState(-1); // -1 = initial state

  // Group actions by street
  const actionsByStreet = useMemo(() => {
    const groups: { street: string; actions: ActionRecord[] }[] = [];
    let currentStreet = '';
    for (const action of hand.actionHistory) {
      if (action.street !== currentStreet) {
        currentStreet = action.street;
        groups.push({ street: currentStreet, actions: [] });
      }
      groups[groups.length - 1].actions.push(action);
    }
    return groups;
  }, [hand.actionHistory]);

  // Determine visible board cards at current action
  const visibleBoard = useMemo(() => {
    if (actionIndex < 0) return [];
    const action = hand.actionHistory[actionIndex];
    if (!action) return hand.board;
    switch (action.street) {
      case 'preflop': return [];
      case 'flop': return hand.board.slice(0, 3);
      case 'turn': return hand.board.slice(0, 4);
      case 'river': return hand.board;
      default: return hand.board;
    }
  }, [actionIndex, hand.board, hand.actionHistory]);

  // Calculate running pot up to current action
  const runningPot = useMemo(() => {
    let pot = hand.smallBlind + hand.bigBlind;
    for (let i = 0; i <= actionIndex && i < hand.actionHistory.length; i++) {
      const a = hand.actionHistory[i];
      if (a.amount > 0) pot += a.amount;
    }
    return pot;
  }, [actionIndex, hand.actionHistory, hand.smallBlind, hand.bigBlind]);

  const totalActions = hand.actionHistory.length;
  const currentAction = actionIndex >= 0 && actionIndex < totalActions ? hand.actionHistory[actionIndex] : null;
  const playerName = (id: number) => hand.players.find(p => p.id === id)?.name ?? `Player ${id}`;

  return (
    <div className="glass rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            Hand #{hand.handNumber}
          </h3>
          <div className="text-[10px] text-gold/40">
            {hand.variant.toUpperCase()} &middot; {hand.smallBlind}/{hand.bigBlind} &middot; {new Date(hand.timestamp).toLocaleString()}
          </div>
        </div>
        <button onClick={onClose} className="text-gold-light/40 hover:text-gold-light text-lg">&times;</button>
      </div>

      {/* Board */}
      <div className="flex justify-center mb-4 min-h-[44px]">
        {visibleBoard.length > 0 ? (
          <CardGroup cards={visibleBoard} size="sm" overlap={false} />
        ) : (
          <div className="text-[10px] text-gold/30 uppercase tracking-widest">Preflop</div>
        )}
      </div>

      {/* Pot */}
      <div className="text-center mb-3">
        <span className="text-gold font-bold text-sm">Pot: ${runningPot}</span>
      </div>

      {/* Players with cards */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {hand.players.map(p => (
          <div key={p.id} className={`text-center ${!p.isActive ? 'opacity-30' : ''}`}>
            <div className="text-[9px] text-gold-light/60 font-semibold">{p.name}</div>
            <div className="text-[8px] text-gold/40">{p.position}</div>
            {p.holeCards.length > 0 && (
              <div className="mt-1">
                <CardGroup cards={p.holeCards} size="sm" overlap={true} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current action display */}
      {currentAction && (
        <motion.div
          key={actionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3 py-2 bg-midnight/50 rounded-lg"
        >
          <span className="text-xs text-gold-light/60">
            <span className="text-gold font-semibold">{playerName(currentAction.playerId)}</span>
            {' '}
            <span className="uppercase font-bold">{currentAction.type}</span>
            {currentAction.amount > 0 && <span className="text-gold"> ${currentAction.amount}</span>}
          </span>
          <div className="text-[9px] text-gold/30 uppercase tracking-wider mt-0.5">{currentAction.street}</div>
        </motion.div>
      )}

      {/* Timeline */}
      <div className="mb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {hand.actionHistory.map((a, i) => {
            const isStreetStart = i === 0 || a.street !== hand.actionHistory[i - 1].street;
            return (
              <div key={i} className="flex items-center gap-1">
                {isStreetStart && i > 0 && (
                  <div className="w-px h-4 bg-gold/20 mx-0.5" />
                )}
                <button
                  onClick={() => setActionIndex(i)}
                  className={`w-5 h-5 rounded-full text-[7px] font-bold flex items-center justify-center transition-all ${
                    i === actionIndex
                      ? 'bg-gold text-background ring-2 ring-gold/30'
                      : i < actionIndex
                        ? 'bg-gold/20 text-gold/60'
                        : 'bg-midnight/50 text-gold/30 hover:bg-gold/10'
                  }`}
                  title={`${playerName(a.playerId)}: ${a.type}${a.amount > 0 ? ` $${a.amount}` : ''}`}
                >
                  {i + 1}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setActionIndex(-1)}
          disabled={actionIndex <= -1}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gold/60 bg-gold/10 hover:bg-gold/20 disabled:opacity-30 transition-all"
        >
          ⏮ Start
        </button>
        <button
          onClick={() => setActionIndex(Math.max(-1, actionIndex - 1))}
          disabled={actionIndex <= -1}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gold/60 bg-gold/10 hover:bg-gold/20 disabled:opacity-30 transition-all"
        >
          ◀ Prev
        </button>
        <span className="text-[10px] text-gold/40 min-w-[50px] text-center">
          {actionIndex + 1} / {totalActions}
        </span>
        <button
          onClick={() => setActionIndex(Math.min(totalActions - 1, actionIndex + 1))}
          disabled={actionIndex >= totalActions - 1}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gold/60 bg-gold/10 hover:bg-gold/20 disabled:opacity-30 transition-all"
        >
          Next ▶
        </button>
        <button
          onClick={() => setActionIndex(totalActions - 1)}
          disabled={actionIndex >= totalActions - 1}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gold/60 bg-gold/10 hover:bg-gold/20 disabled:opacity-30 transition-all"
        >
          End ⏭
        </button>
      </div>

      {/* Action log by street */}
      <div className="mt-4 space-y-2">
        {actionsByStreet.map((group, gi) => (
          <div key={gi}>
            <div className="text-[9px] text-gold/40 uppercase tracking-widest font-semibold mb-1">{group.street}</div>
            <div className="space-y-0.5">
              {group.actions.map((a, ai) => {
                const globalIdx = hand.actionHistory.indexOf(a);
                return (
                  <div
                    key={ai}
                    onClick={() => setActionIndex(globalIdx)}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      globalIdx === actionIndex ? 'bg-gold/10 text-gold' : 'text-gold-light/40 hover:text-gold-light/60'
                    }`}
                  >
                    {playerName(a.playerId)}: {a.type}{a.amount > 0 ? ` $${a.amount}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

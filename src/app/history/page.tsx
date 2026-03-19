'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandReplay } from '@/components/play/HandReplay';
import { CardGroup } from '@/components/ui/PlayingCard';

interface SavedHand {
  timestamp: number;
  handNumber: number;
  variant: string;
  board: number[];
  players: {
    id: number;
    name: string;
    chips: number;
    holeCards: number[];
    position: string;
    isActive: boolean;
  }[];
  pot: number;
  actionHistory: any[];
  smallBlind: number;
  bigBlind: number;
}

export default function HistoryPage() {
  const [hands, setHands] = useState<SavedHand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('poker-hand-history') || '[]');
      setHands(stored.reverse()); // newest first
    } catch {
      setHands([]);
    }
  }, []);

  function handleClear() {
    localStorage.removeItem('poker-hand-history');
    setHands([]);
    setSelectedIndex(null);
  }

  return (
    <main className="min-h-screen pb-24 pt-6">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            Hand History
          </h1>
          {hands.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[10px] text-red-400/60 hover:text-red-400 uppercase tracking-widest font-semibold"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Replay view */}
        <AnimatePresence mode="wait">
          {selectedIndex !== null && hands[selectedIndex] && (
            <motion.div
              key="replay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HandReplay
                hand={hands[selectedIndex] as any}
                onClose={() => setSelectedIndex(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hand list */}
        {selectedIndex === null && (
          <div className="space-y-2">
            {hands.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <div className="text-2xl mb-2">📜</div>
                <p className="text-sm text-gold-light/40">No hands played yet.</p>
                <p className="text-[10px] text-gold-light/25 mt-1">
                  Play some hands in the Play tab and they&apos;ll appear here.
                </p>
              </div>
            ) : (
              hands.map((hand, i) => {
                const humanPlayer = hand.players.find(p => p.name === 'You');
                const actionCount = hand.actionHistory.length;

                return (
                  <motion.div
                    key={hand.timestamp}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <button
                      onClick={() => setSelectedIndex(i)}
                      className="w-full glass rounded-xl p-3 text-left hover:border-gold/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gold">#{hand.handNumber}</span>
                          <span className="text-[9px] text-gold/40 uppercase tracking-wider">{hand.variant}</span>
                        </div>
                        <span className="text-[9px] text-gold-light/30">
                          {new Date(hand.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Hero cards */}
                          {humanPlayer && humanPlayer.holeCards.length > 0 && (
                            <CardGroup cards={humanPlayer.holeCards} size="sm" overlap={true} />
                          )}
                          {/* Board */}
                          {hand.board.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-gold/30 mx-1">|</span>
                              <CardGroup cards={hand.board} size="sm" overlap={true} />
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-gold/50">Pot: ${hand.pot}</div>
                          <div className="text-[9px] text-gold-light/30">{actionCount} actions</div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}

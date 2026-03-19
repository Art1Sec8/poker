'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/engine/types';
import { cardToDisplay, makeCard } from '@/engine/card';
import { Rank, Suit } from '@/engine/types';

const RANKS: Rank[] = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const SUITS: Suit[] = [3, 2, 1, 0]; // spades, hearts, diamonds, clubs
const RANK_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUIT_LABELS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = ['text-white', 'text-red-500', 'text-red-500', 'text-white'];

interface CardPickerProps {
  selectedCards: Card[];
  onSelect: (card: Card) => void;
  onRemove: (card: Card) => void;
  disabledCards?: Card[];
  maxCards?: number;
}

export function CardPicker({ selectedCards, onSelect, onRemove, disabledCards = [], maxCards = 7 }: CardPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const disabledSet = new Set([...disabledCards, ...selectedCards]);

  return (
    <div>
      {/* Selected cards display */}
      <div className="flex gap-1.5 flex-wrap min-h-[36px]">
        {selectedCards.map(card => {
          const d = cardToDisplay(card);
          return (
            <motion.button
              key={card}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => onRemove(card)}
              className={`px-2 py-1 rounded border text-sm font-bold ${
                d.isRed ? 'text-red-500 border-red-500/30' : 'text-white border-white/30'
              } bg-midnight hover:bg-red-900/20 transition-colors`}
            >
              {d.rank}{d.suitSymbol}
            </motion.button>
          );
        })}
        {selectedCards.length < maxCards && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 rounded border border-dashed border-gold/30 text-gold/50 text-sm hover:border-gold/60 hover:text-gold/80 transition-colors"
          >
            +
          </button>
        )}
      </div>

      {/* Card grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="grid grid-cols-13 gap-0.5">
              {RANKS.map((rank, ri) =>
                SUITS.map((suit, si) => {
                  const card = makeCard(rank, suit);
                  const disabled = disabledSet.has(card);
                  const selected = selectedCards.includes(card);
                  return (
                    <button
                      key={card}
                      disabled={disabled && !selected}
                      onClick={() => {
                        if (selected) {
                          onRemove(card);
                        } else if (selectedCards.length < maxCards) {
                          onSelect(card);
                        }
                      }}
                      className={`p-0.5 text-[10px] font-bold rounded transition-all ${
                        disabled && !selected
                          ? 'opacity-20 cursor-not-allowed'
                          : selected
                          ? 'bg-gold/30 ring-1 ring-gold'
                          : `hover:bg-white/10 ${SUIT_COLORS[si]}`
                      }`}
                    >
                      {RANK_LABELS[ri]}{SUIT_LABELS[si]}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

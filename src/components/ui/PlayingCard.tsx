'use client';

import { motion } from 'framer-motion';
import { Card as CardType } from '@/engine/types';
import { cardToDisplay } from '@/engine/card';

interface PlayingCardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  delay?: number;
  onClick?: () => void;
  selected?: boolean;
}

const SIZES = {
  sm: { width: 48, height: 68, rankSize: 'text-sm', suitSize: 'text-xs', centerSize: 'text-lg' },
  md: { width: 64, height: 92, rankSize: 'text-base', suitSize: 'text-sm', centerSize: 'text-2xl' },
  lg: { width: 80, height: 116, rankSize: 'text-lg', suitSize: 'text-base', centerSize: 'text-3xl' },
};

export function PlayingCard({ card, faceDown = false, size = 'md', className = '', delay = 0, onClick, selected }: PlayingCardProps) {
  const dims = SIZES[size];
  const showFace = card !== undefined && !faceDown;

  if (!showFace) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20, rotateY: 180 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`relative rounded-lg shadow-xl cursor-default select-none ${className}`}
        style={{ width: dims.width, height: dims.height }}
      >
        {/* Card back — dark with gold filigree border */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-700/50 overflow-hidden">
          {/* Damask pattern overlay */}
          <div className="absolute inset-1 rounded border border-amber-600/30 bg-gradient-to-br from-amber-900/20 to-transparent" />
          <div className="absolute inset-2 rounded border border-amber-700/20" />
          {/* Center ornament */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-amber-600/40 bg-amber-900/20" />
          </div>
        </div>
      </motion.div>
    );
  }

  const display = cardToDisplay(card!);
  const textColor = display.isRed ? 'text-red-600' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, rotateY: -90 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`relative rounded-lg shadow-xl cursor-default select-none ${selected ? 'ring-2 ring-amber-400 -translate-y-2' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dims.width, height: dims.height, perspective: 800 }}
    >
      {/* Card face */}
      <div className="absolute inset-0 rounded-lg bg-white border border-amber-200/50 shadow-inner overflow-hidden">
        {/* Top-left rank + suit */}
        <div className={`absolute top-1 left-1.5 leading-tight ${textColor}`}>
          <div className={`${dims.rankSize} font-bold leading-none`}>{display.rank}</div>
          <div className={`${dims.suitSize} leading-none -mt-0.5`}>{display.suitSymbol}</div>
        </div>

        {/* Center suit */}
        <div className={`absolute inset-0 flex items-center justify-center ${textColor} ${dims.centerSize}`}>
          {display.suitSymbol}
        </div>

        {/* Bottom-right rank + suit (inverted) */}
        <div className={`absolute bottom-1 right-1.5 leading-tight ${textColor} rotate-180`}>
          <div className={`${dims.rankSize} font-bold leading-none`}>{display.rank}</div>
          <div className={`${dims.suitSize} leading-none -mt-0.5`}>{display.suitSymbol}</div>
        </div>
      </div>
    </motion.div>
  );
}

interface CardGroupProps {
  cards: CardType[];
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  overlap?: boolean;
}

export function CardGroup({ cards, faceDown = false, size = 'md', className = '', overlap = true }: CardGroupProps) {
  const overlapMargin = overlap ? (size === 'sm' ? -12 : size === 'md' ? -16 : -20) : 4;

  return (
    <div className={`flex items-center ${className}`}>
      {cards.map((card, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : overlapMargin }}>
          <PlayingCard card={card} faceDown={faceDown} size={size} delay={i * 0.1} />
        </div>
      ))}
    </div>
  );
}

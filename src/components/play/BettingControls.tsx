'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ActionType, ValidAction } from '@/engine/types';

interface BettingControlsProps {
  validActions: ValidAction[];
  pot: number;
  onAction: (type: ActionType, amount?: number) => void;
  disabled: boolean;
}

export function BettingControls({ validActions, pot, onAction, disabled }: BettingControlsProps) {
  const canFold = validActions.some(a => a.type === 'fold');
  const canCheck = validActions.some(a => a.type === 'check');
  const canCall = validActions.find(a => a.type === 'call');
  const canBet = validActions.find(a => a.type === 'bet');
  const canRaise = validActions.find(a => a.type === 'raise');
  const canAllin = validActions.find(a => a.type === 'allin');
  const raiseOrBet = canRaise || canBet;

  const [raiseAmount, setRaiseAmount] = useState(raiseOrBet?.minAmount ?? 0);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    if (raiseOrBet) setRaiseAmount(raiseOrBet.minAmount);
  }, [raiseOrBet?.minAmount]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;
    switch (e.key.toLowerCase()) {
      case 'f': if (canFold) onAction('fold'); break;
      case 'c': canCheck ? onAction('check') : canCall && onAction('call', canCall.minAmount); break;
      case 'r':
        if (raiseOrBet) {
          setShowSlider(true);
        }
        break;
      case '1': if (raiseOrBet) onAction(raiseOrBet.type, raiseOrBet.minAmount); break;
      case '2': if (raiseOrBet) onAction(raiseOrBet.type, Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.33))); break;
      case '3': if (raiseOrBet) onAction(raiseOrBet.type, Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.5))); break;
      case '4': if (raiseOrBet) onAction(raiseOrBet.type, Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.67))); break;
      case '5': if (raiseOrBet) onAction(raiseOrBet.type, Math.max(raiseOrBet.minAmount, pot)); break;
      case '6': if (canAllin) onAction('allin', canAllin.minAmount); break;
    }
  }, [disabled, canFold, canCheck, canCall, raiseOrBet, canAllin, pot, onAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (validActions.length === 0) return null;

  const presets = raiseOrBet ? [
    { label: '1/3', amount: Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.33)) },
    { label: '1/2', amount: Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.5)) },
    { label: '2/3', amount: Math.max(raiseOrBet.minAmount, Math.floor(pot * 0.67)) },
    { label: 'Pot', amount: Math.max(raiseOrBet.minAmount, Math.min(pot, raiseOrBet.maxAmount)) },
  ] : [];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass rounded-t-2xl p-4 border-t border-gold/10"
    >
      {/* Raise slider + presets */}
      {raiseOrBet && showSlider && (
        <div className="mb-3">
          <div className="flex gap-1.5 mb-2">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => setRaiseAmount(Math.min(p.amount, raiseOrBet.maxAmount))}
                className="flex-1 py-1 rounded-md text-[10px] font-bold text-gold/70 bg-gold/10 hover:bg-gold/20 transition-colors"
              >
                {p.label}
              </button>
            ))}
            {canAllin && (
              <button
                onClick={() => onAction('allin', canAllin.minAmount)}
                className="flex-1 py-1 rounded-md text-[10px] font-bold text-gold bg-gold/20 hover:bg-gold/30 transition-colors ring-1 ring-gold/30"
              >
                All-in
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={raiseOrBet.minAmount}
              max={raiseOrBet.maxAmount}
              value={raiseAmount}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              className="flex-1 accent-gold h-1"
            />
            <span className="text-sm font-bold text-gold min-w-[50px] text-right">${raiseAmount}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Fold */}
        {canFold && (
          <button
            onClick={() => onAction('fold')}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-900/60 text-red-200 hover:bg-red-800/80 transition-all disabled:opacity-30"
          >
            Fold
            <span className="block text-[8px] opacity-50 mt-0.5">F</span>
          </button>
        )}

        {/* Check / Call */}
        {canCheck && (
          <button
            onClick={() => onAction('check')}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-steel/60 text-blue-200 hover:bg-steel/80 transition-all disabled:opacity-30"
          >
            Check
            <span className="block text-[8px] opacity-50 mt-0.5">C</span>
          </button>
        )}
        {canCall && (
          <button
            onClick={() => onAction('call', canCall.minAmount)}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-steel/60 text-blue-200 hover:bg-steel/80 transition-all disabled:opacity-30"
          >
            Call ${canCall.minAmount}
            <span className="block text-[8px] opacity-50 mt-0.5">C</span>
          </button>
        )}

        {/* Bet / Raise */}
        {raiseOrBet && (
          <button
            onClick={() => {
              if (showSlider) {
                onAction(raiseOrBet.type, raiseAmount);
                setShowSlider(false);
              } else {
                setShowSlider(true);
              }
            }}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-30"
          >
            {showSlider ? `${canRaise ? 'Raise' : 'Bet'} $${raiseAmount}` : (canRaise ? 'Raise' : 'Bet')}
            <span className="block text-[8px] opacity-50 mt-0.5">R</span>
          </button>
        )}

        {/* All-in (if only option) */}
        {canAllin && !canCall && !canRaise && !canBet && (
          <button
            onClick={() => onAction('allin', canAllin.minAmount)}
            disabled={disabled}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background animate-pulse"
          >
            All-in ${canAllin.minAmount}
          </button>
        )}
      </div>
    </motion.div>
  );
}

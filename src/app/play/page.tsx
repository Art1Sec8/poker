'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useGameState } from '@/hooks/useGameState';
import { useCoach } from '@/hooks/useCoach';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { StakesSelector } from '@/components/shared/StakesSelector';
import { PokerTable } from '@/components/play/PokerTable';
import { BettingControls } from '@/components/play/BettingControls';
import { SessionStats } from '@/components/play/SessionStats';
import { CoachPanel } from '@/components/play/CoachPanel';
import { ActionType } from '@/engine/types';

type AIDifficulty = 'fish' | 'regular' | 'shark' | 'random';

export default function PlayPage() {
  const { variant } = useGame();
  const game = useGameState();
  const coach = useCoach();
  const [isSetup, setIsSetup] = useState(true);
  const [numAI, setNumAI] = useState(2);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('regular');
  const [blinds, setBlinds] = useState({ small: 5, big: 10 });
  const [buyIn, setBuyIn] = useState(1000);
  const [showStats, setShowStats] = useState(false);

  function handleStartGame() {
    const aiSeats = Array.from({ length: numAI }, () => ({ difficulty: aiDifficulty }));
    game.startGame({
      variant,
      smallBlind: blinds.small,
      bigBlind: blinds.big,
      buyIn,
      aiSeats,
    });
    setIsSetup(false);
  }

  // Start first hand after game setup
  useEffect(() => {
    if (!isSetup && !game.state) {
      game.startNewHand();
    }
  }, [isSetup, game.state]);

  // Get coach advice when it's player's turn
  useEffect(() => {
    if (game.isPlayerTurn && game.state && coach.coachEnabled) {
      coach.getAdvice(game.state);
    }
  }, [game.isPlayerTurn, game.state?.street, game.state?.handNumber, coach.coachEnabled]);

  // Clear coach review on new hand
  useEffect(() => {
    if (game.state && !game.state.isHandComplete) {
      coach.clearReview();
    }
  }, [game.state?.handNumber]);

  // Save hand history to localStorage
  useEffect(() => {
    if (game.state?.isHandComplete && game.handHistory.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('poker-hand-history') || '[]');
        const lastHand = game.handHistory[game.handHistory.length - 1];
        existing.push({
          timestamp: Date.now(),
          handNumber: lastHand.handNumber,
          variant: lastHand.variant,
          board: lastHand.board,
          players: lastHand.players.map(p => ({
            id: p.id, name: p.name, chips: p.chips,
            holeCards: p.holeCards, position: p.position, isActive: p.isActive,
          })),
          pot: lastHand.pot,
          actionHistory: lastHand.actionHistory,
          smallBlind: lastHand.smallBlind,
          bigBlind: lastHand.bigBlind,
        });
        // Keep last 50 hands
        const trimmed = existing.slice(-50);
        localStorage.setItem('poker-hand-history', JSON.stringify(trimmed));
      } catch { /* ignore storage errors */ }
    }
  }, [game.state?.isHandComplete, game.handHistory.length]);

  const handleAction = useCallback((type: ActionType, amount?: number) => {
    if (game.state && coach.coachEnabled) {
      coach.reviewAction(game.state, type, amount ?? 0);
    }
    game.performAction(type, amount);
  }, [game.state, game.performAction, coach]);

  // Setup screen
  if (isSetup) {
    return (
      <main className="min-h-screen pb-24 pt-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
              Play
            </h1>
            <GameVariantToggle />
          </div>

          <div className="space-y-4">
            {/* AI Opponents */}
            <div className="glass rounded-xl p-4">
              <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-3 block">
                AI Opponents
              </label>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumAI(n)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                      numAI === n
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {(['fish', 'regular', 'shark', 'random'] as AIDifficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setAIDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      aiDifficulty === d
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                    }`}
                  >
                    {d === 'fish' ? '🐟 Fish' : d === 'regular' ? '😐 Regular' : d === 'shark' ? '🦈 Shark' : '🎲 Random'}
                  </button>
                ))}
              </div>
            </div>

            {/* Blinds & Buy-in */}
            <div className="glass rounded-xl p-4">
              <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-3 block">
                Blinds
              </label>
              <div className="flex gap-2 mb-3">
                {[{ s: 1, b: 2 }, { s: 5, b: 10 }, { s: 25, b: 50 }, { s: 50, b: 100 }].map(bl => (
                  <button
                    key={bl.s}
                    onClick={() => setBlinds({ small: bl.s, big: bl.b })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      blinds.small === bl.s
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                    }`}
                  >
                    {bl.s}/{bl.b}
                  </button>
                ))}
              </div>

              <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
                Buy-in
              </label>
              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBuyIn(amt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      buyIn === amt
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl font-bold text-lg tracking-wide bg-gradient-to-r from-gold-dark to-gold text-background shadow-lg shadow-gold/20"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Start Game
            </motion.button>
          </div>
        </div>
      </main>
    );
  }

  // Game screen
  if (!game.state) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gold/50 animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-4 pt-2 flex flex-col">
      {/* Stats overlay */}
      <SessionStats stats={game.sessionStats} isOpen={showStats} onToggle={() => setShowStats(!showStats)} />

      {/* Coach panel */}
      <CoachPanel
        enabled={coach.coachEnabled}
        onToggle={coach.toggleCoach}
        analysis={coach.analysis}
        isLoading={coach.isLoading}
        handReview={coach.handReview}
        showReview={game.state.isHandComplete}
      />

      {/* Hand number */}
      <div className="text-center text-[10px] text-gold/40 uppercase tracking-widest font-semibold mb-1">
        Hand #{game.state.handNumber}
      </div>

      {/* Poker table */}
      <div className="flex-1 flex items-center justify-center px-2">
        <PokerTable
          state={game.state}
          timerSeconds={game.timerSeconds}
          isTimerRunning={game.isTimerRunning}
        />
      </div>

      {/* Coach hand review (shown between hand complete overlay and controls) */}

      {/* Hand complete overlay */}
      <AnimatePresence>
        {game.state.isHandComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 mb-2"
          >
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-gold font-bold text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Hand Complete
              </p>
              <p className="text-sm text-gold-light/50 mb-3">
                {(() => {
                  const human = game.state!.players.find(p => p.isHuman);
                  const prevChips = game.handHistory.length > 1
                    ? game.handHistory[game.handHistory.length - 2]?.players.find(p => p.isHuman)?.chips
                    : buyIn;
                  const diff = human && prevChips !== undefined ? human.chips - prevChips : 0;
                  if (diff > 0) return `You won $${diff}!`;
                  if (diff < 0) return `You lost $${Math.abs(diff)}`;
                  return 'Push';
                })()}
              </p>
              <button
                onClick={() => game.startNewHand()}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background hover:shadow-lg hover:shadow-gold/20 transition-all"
              >
                Deal Next Hand
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Betting controls */}
      {!game.state.isHandComplete && (
        <div className="px-4">
          <BettingControls
            validActions={game.validActions}
            pot={game.state.pot}
            onAction={handleAction}
            disabled={!game.isPlayerTurn}
          />
        </div>
      )}
    </main>
  );
}

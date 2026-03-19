'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { StakesSelector } from '@/components/shared/StakesSelector';
import { CardGroup } from '@/components/ui/PlayingCard';
import { parseCards, cardToDisplay } from '@/engine/card';
import { QUIZ_SCENARIOS, QuizScenario } from '@/data/quiz-scenarios';
import { ActionType } from '@/engine/types';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function QuizPage() {
  const { variant } = useGame();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentScenario, setCurrentScenario] = useState<QuizScenario | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });

  // Load stats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quiz-stats');
    if (saved) setStats(JSON.parse(saved));
  }, []);

  // Save stats
  useEffect(() => {
    if (stats.total > 0) localStorage.setItem('quiz-stats', JSON.stringify(stats));
  }, [stats]);

  // Pick a random scenario
  function nextScenario() {
    const filtered = QUIZ_SCENARIOS.filter(
      s => s.variant === variant && s.difficulty === difficulty
    );
    if (filtered.length === 0) {
      // Fallback to any scenario for this variant
      const fallback = QUIZ_SCENARIOS.filter(s => s.variant === variant);
      if (fallback.length === 0) return;
      setCurrentScenario(fallback[Math.floor(Math.random() * fallback.length)]);
    } else {
      setCurrentScenario(filtered[Math.floor(Math.random() * filtered.length)]);
    }
    setSelectedAction(null);
    setShowFeedback(false);
  }

  // Start on mount or variant/difficulty change
  useEffect(() => {
    nextScenario();
  }, [variant, difficulty]);

  function handleAction(action: ActionType) {
    if (showFeedback || !currentScenario) return;
    setSelectedAction(action);
    setShowFeedback(true);

    const isCorrect = action === currentScenario.correctAction;
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
    }));
  }

  if (!currentScenario) return null;

  const holeCards = parseCards(currentScenario.holeCards);
  const boardCards = currentScenario.board ? parseCards(currentScenario.board) : [];
  const isCorrect = selectedAction === currentScenario.correctAction;

  const actions: { type: ActionType; label: string; color: string }[] = currentScenario.toCall > 0
    ? [
        { type: 'fold', label: 'Fold', color: 'bg-red-900/60 hover:bg-red-800/80' },
        { type: 'call', label: `Call $${currentScenario.toCall}`, color: 'bg-steel/60 hover:bg-steel/80' },
        { type: 'raise', label: 'Raise', color: 'bg-gradient-to-r from-gold-dark to-gold text-background' },
      ]
    : [
        { type: 'check', label: 'Check', color: 'bg-steel/60 hover:bg-steel/80' },
        { type: 'bet', label: 'Bet', color: 'bg-gradient-to-r from-gold-dark to-gold text-background' },
      ];

  return (
    <main className="min-h-screen pb-24 pt-6">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            Hand Quiz
          </h1>
          <GameVariantToggle />
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 text-[10px] text-gold/60 uppercase tracking-widest font-semibold">
          <span>
            {stats.correct}/{stats.total} correct ({stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(0) : 0}%)
          </span>
          <span>Streak: {stats.streak} | Best: {stats.bestStreak}</span>
        </div>

        {/* Difficulty selector */}
        <div className="flex gap-1.5 mb-4">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold tracking-wide uppercase transition-all ${
                difficulty === d
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-gold-light/40 hover:text-gold-light/60 border border-transparent'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Scenario card */}
        <div className="glass rounded-xl p-5 mb-4">
          {/* Context info */}
          <div className="flex items-center justify-between mb-4 text-[10px] text-gold/60">
            <span className="uppercase tracking-widest font-semibold">{currentScenario.street}</span>
            <span>Position: <span className="text-gold font-bold">{currentScenario.position}</span></span>
            <span>Pot: <span className="text-gold font-bold">${currentScenario.pot}</span></span>
          </div>

          {/* Hole cards */}
          <div className="flex justify-center mb-4">
            <CardGroup cards={holeCards} size="lg" overlap={false} />
          </div>

          {/* Board */}
          {boardCards.length > 0 && (
            <div className="flex justify-center mb-4">
              <CardGroup cards={boardCards} size="md" overlap={false} />
            </div>
          )}

          {/* Action prompt */}
          {currentScenario.toCall > 0 && (
            <p className="text-center text-sm text-gold-light/60 mb-4">
              Facing a ${currentScenario.toCall} bet
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          {actions.map(a => (
            <button
              key={a.type}
              onClick={() => handleAction(a.type)}
              disabled={showFeedback}
              className={`flex-1 py-3 rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-50 ${a.color} ${
                showFeedback && selectedAction === a.type
                  ? isCorrect ? 'ring-2 ring-emerald-400' : 'ring-2 ring-red-400'
                  : ''
              } ${
                showFeedback && a.type === currentScenario.correctAction && selectedAction !== a.type
                  ? 'ring-2 ring-emerald-400/50'
                  : ''
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`glass rounded-xl p-4 mb-4 border ${
                isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'
              }`}
            >
              <p className={`text-lg font-bold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </p>
              <p className="text-sm text-gold-light/60 leading-relaxed">
                {currentScenario.explanation}
              </p>
              <button
                onClick={nextScenario}
                className="mt-3 w-full py-2 rounded-lg bg-gold/20 text-gold text-sm font-semibold hover:bg-gold/30 transition-colors"
              >
                Next Hand
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

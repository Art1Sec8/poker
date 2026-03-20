'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { PokerTable } from '@/components/play/PokerTable';
import { BettingControls } from '@/components/play/BettingControls';

type Screen = 'lobby' | 'room' | 'playing';

export default function MultiplayerPage() {
  const { variant } = useGame();
  const mp = useMultiplayer();
  const [screen, setScreen] = useState<Screen>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [aiCount, setAICount] = useState(0);
  const [aiDifficulty, setAIDifficulty] = useState<'fish' | 'regular' | 'shark' | 'random'>('regular');
  const [blinds, setBlinds] = useState({ small: 5, big: 10 });
  const [buyIn, setBuyIn] = useState(1000);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mp.chatMessages]);

  // Transition to room when room state arrives
  useEffect(() => {
    if (mp.roomState && screen === 'lobby') setScreen('room');
  }, [mp.roomState, screen]);

  // Transition to playing when game state arrives
  useEffect(() => {
    if (mp.gameState && screen === 'room') setScreen('playing');
  }, [mp.gameState, screen]);

  // Back to room when hand completes (for re-deal)
  useEffect(() => {
    if (mp.gameState?.isHandComplete && screen === 'playing') {
      // Stay on playing screen but show deal button
    }
  }, [mp.gameState?.isHandComplete, screen]);

  function handleCreateRoom() {
    if (!playerName.trim()) return;
    mp.createRoom({
      variant,
      smallBlind: blinds.small,
      bigBlind: blinds.big,
      buyIn,
      maxPlayers: 6,
      aiCount,
      aiDifficulty,
    }, playerName.trim());
  }

  function handleJoinRoom() {
    if (!playerName.trim() || !joinCode.trim()) return;
    mp.joinRoom(joinCode.trim(), playerName.trim());
  }

  function handleLeave() {
    mp.leaveRoom();
    setScreen('lobby');
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    mp.sendChat(chatInput.trim());
    setChatInput('');
  }

  const isHost = mp.roomState?.players.some(p => p.seatIndex === mp.mySeatIndex && p.isHost);

  // Error toast
  useEffect(() => {
    if (mp.error) {
      const t = setTimeout(() => mp.clearError(), 4000);
      return () => clearTimeout(t);
    }
  }, [mp.error, mp.clearError]);

  // ========== LOBBY ==========
  if (screen === 'lobby') {
    return (
      <main className="min-h-screen pb-24 pt-6">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
              Multiplayer
            </h1>
            <GameVariantToggle />
          </div>

          {/* Player name */}
          <div className="glass rounded-xl p-4 mb-4">
            <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={16}
              placeholder="Enter your name..."
              className="w-full bg-midnight/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gold-light placeholder:text-gold-light/30 focus:outline-none focus:border-gold/30"
            />
          </div>

          {/* Create Room */}
          <div className="glass rounded-xl p-4 mb-4">
            <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-3 block">
              Create Room
            </label>

            <div className="space-y-3">
              {/* AI Opponents */}
              <div>
                <label className="text-[10px] text-gold/40 uppercase tracking-widest mb-1 block">AI Opponents</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setAICount(n)}
                      className={`w-9 h-9 rounded-lg font-bold text-xs transition-all ${
                        aiCount === n
                          ? 'bg-gold/20 text-gold border border-gold/30'
                          : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {aiCount > 0 && (
                <div>
                  <label className="text-[10px] text-gold/40 uppercase tracking-widest mb-1 block">AI Difficulty</label>
                  <div className="flex gap-2">
                    {(['fish', 'regular', 'shark', 'random'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setAIDifficulty(d)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                          aiDifficulty === d
                            ? 'bg-gold/20 text-gold border border-gold/30'
                            : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Blinds */}
              <div>
                <label className="text-[10px] text-gold/40 uppercase tracking-widest mb-1 block">Blinds</label>
                <div className="flex gap-2">
                  {[{ s: 1, b: 2 }, { s: 5, b: 10 }, { s: 25, b: 50 }, { s: 50, b: 100 }].map(bl => (
                    <button
                      key={bl.s}
                      onClick={() => setBlinds({ small: bl.s, big: bl.b })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        blinds.small === bl.s
                          ? 'bg-gold/20 text-gold border border-gold/30'
                          : 'text-gold-light/40 hover:text-gold-light/60 border border-white/5'
                      }`}
                    >
                      {bl.s}/{bl.b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buy-in */}
              <div>
                <label className="text-[10px] text-gold/40 uppercase tracking-widest mb-1 block">Buy-in</label>
                <div className="flex gap-2">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBuyIn(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background shadow-lg shadow-gold/20 disabled:opacity-30"
            >
              Create Room
            </motion.button>
          </div>

          {/* Join Room */}
          <div className="glass rounded-xl p-4">
            <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
              Join Room
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="Room code..."
                className="flex-1 bg-midnight/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gold-light placeholder:text-gold-light/30 focus:outline-none focus:border-gold/30 uppercase tracking-widest text-center font-mono"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || joinCode.length < 4}
                className="px-6 py-2 rounded-xl font-bold text-sm bg-gold/20 text-gold border border-gold/30 disabled:opacity-30"
              >
                Join
              </motion.button>
            </div>
          </div>

          {/* Connection status */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gold-light/30">
            <div className={`w-2 h-2 rounded-full ${mp.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {mp.isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </main>
    );
  }

  // ========== ROOM (Waiting) ==========
  if (screen === 'room' && mp.roomState) {
    return (
      <main className="min-h-screen pb-24 pt-6">
        <div className="max-w-lg mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={handleLeave} className="text-gold-light/50 text-sm hover:text-gold-light">
              &larr; Leave
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                Room
              </h1>
              <div className="text-gold font-mono tracking-[0.3em] text-lg font-bold">{mp.roomState.id}</div>
            </div>
            <div className="w-16" />
          </div>

          {/* Room info */}
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex justify-between text-[10px] text-gold/60 uppercase tracking-widest">
              <span>{mp.roomState.config.variant}</span>
              <span>Blinds {mp.roomState.config.smallBlind}/{mp.roomState.config.bigBlind}</span>
              <span>Buy-in ${mp.roomState.config.buyIn}</span>
            </div>
          </div>

          {/* Players */}
          <div className="glass rounded-xl p-4 mb-4">
            <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-3 block">
              Players ({mp.roomState.players.length + mp.roomState.aiCount})
            </label>
            <div className="space-y-2">
              {mp.roomState.players.map(p => (
                <div key={p.seatIndex} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-midnight/30">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
                      {p.name.charAt(0)}
                    </div>
                    <span className="text-sm text-gold-light">{p.name}</span>
                    {p.isHost && <span className="text-[8px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Host</span>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${p.isReady ? 'text-emerald-400' : 'text-gold-light/30'}`}>
                    {p.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
              {mp.roomState.aiCount > 0 && (
                <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-midnight/30 opacity-60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-steel/20 flex items-center justify-center text-xs">🤖</div>
                    <span className="text-sm text-gold-light/60">{mp.roomState.aiCount} AI Player{mp.roomState.aiCount > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider">Ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="glass rounded-xl p-4 mb-4">
            <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">Chat</label>
            <div className="h-32 overflow-y-auto mb-2 space-y-1">
              {mp.chatMessages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className={`font-semibold ${msg.sender === 'System' ? 'text-steel' : 'text-gold'}`}>{msg.sender}: </span>
                  <span className="text-gold-light/60">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                maxLength={200}
                placeholder="Type a message..."
                className="flex-1 bg-midnight/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gold-light placeholder:text-gold-light/30 focus:outline-none focus:border-gold/30"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold/20 text-gold">
                Send
              </button>
            </form>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={mp.toggleReady}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                mp.roomState.players.find(p => p.seatIndex === mp.mySeatIndex)?.isReady
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gold/20 text-gold border border-gold/30'
              }`}
            >
              {mp.roomState.players.find(p => p.seatIndex === mp.mySeatIndex)?.isReady ? 'Ready!' : 'Ready Up'}
            </motion.button>

            {isHost && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={mp.startGame}
                disabled={!mp.roomState.players.every(p => p.isReady)}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background disabled:opacity-30"
              >
                Start Game
              </motion.button>
            )}
          </div>
        </div>

        <ErrorToast error={mp.error} />
      </main>
    );
  }

  // ========== PLAYING ==========
  if (!mp.gameState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gold/50 animate-pulse">Waiting for game...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-4 pt-2 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-1">
        <button onClick={handleLeave} className="text-gold-light/40 text-[10px] hover:text-gold-light uppercase tracking-widest">
          Leave
        </button>
        <div className="text-center">
          <div className="text-[10px] text-gold/40 uppercase tracking-widest font-semibold">
            Hand #{mp.gameState.handNumber}
          </div>
          <div className="text-[8px] text-gold/30 font-mono">{mp.roomState?.id}</div>
        </div>
        <button onClick={() => setShowChat(!showChat)} className="text-gold-light/40 text-sm hover:text-gold-light">
          💬
        </button>
      </div>

      {/* Connection indicator */}
      {!mp.isConnected && (
        <div className="mx-4 mb-2 py-1.5 px-3 rounded-lg bg-red-900/30 text-red-300 text-[10px] text-center font-semibold">
          Reconnecting...
        </div>
      )}

      {/* Poker table */}
      <div className="flex-1 flex items-center justify-center px-2">
        <PokerTable
          state={mp.gameState}
          timerSeconds={mp.turnTimer?.seconds ?? 30}
          isTimerRunning={mp.turnTimer !== null && !mp.gameState.isHandComplete}
        />
      </div>

      {/* Hand complete overlay */}
      <AnimatePresence>
        {mp.gameState.isHandComplete && (
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
              {isHost && (
                <button
                  onClick={mp.startHand}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background hover:shadow-lg hover:shadow-gold/20 transition-all"
                >
                  Deal Next Hand
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gold-light/40">Waiting for host to deal...</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Betting controls */}
      {!mp.gameState.isHandComplete && (
        <div className="px-4">
          <BettingControls
            validActions={mp.validActions}
            pot={mp.gameState.pot}
            onAction={mp.sendAction}
            disabled={!mp.isPlayerTurn}
          />
        </div>
      )}

      {/* Chat drawer */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gold/10 rounded-t-2xl"
          >
            <div className="max-w-lg mx-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold">Chat</span>
                <button onClick={() => setShowChat(false)} className="text-gold-light/40 text-sm">&times;</button>
              </div>
              <div className="h-40 overflow-y-auto mb-2 space-y-1">
                {mp.chatMessages.map((msg, i) => (
                  <div key={i} className="text-xs">
                    <span className={`font-semibold ${msg.sender === 'System' ? 'text-steel' : 'text-gold'}`}>{msg.sender}: </span>
                    <span className="text-gold-light/60">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  maxLength={200}
                  placeholder="Type a message..."
                  className="flex-1 bg-midnight/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gold-light placeholder:text-gold-light/30 focus:outline-none focus:border-gold/30"
                />
                <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold/20 text-gold">
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorToast error={mp.error} />
    </main>
  );
}

function ErrorToast({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/80 text-red-200 text-xs font-semibold px-4 py-2 rounded-full border border-red-500/30"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

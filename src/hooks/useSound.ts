'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try { audioCtx = new AudioContext(); } catch { return null; }
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('poker-sound-enabled');
      if (stored === 'true') setEnabled(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    try { localStorage.setItem('poker-sound-enabled', String(enabled)); } catch { /* ignore */ }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled(prev => !prev), []);

  const playDeal = useCallback(() => {
    if (!enabledRef.current) return;
    playNoise(0.08, 0.06);
    setTimeout(() => playTone(800, 0.05, 'sine', 0.03), 30);
  }, []);

  const playCheck = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(600, 0.06, 'sine', 0.04);
  }, []);

  const playChips = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(1200, 0.08, 'triangle', 0.05);
    setTimeout(() => playTone(1400, 0.06, 'triangle', 0.03), 40);
  }, []);

  const playFold = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(300, 0.15, 'sine', 0.04);
    setTimeout(() => playTone(200, 0.15, 'sine', 0.03), 60);
  }, []);

  const playWin = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(523, 0.15, 'sine', 0.06);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.06), 100);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.06), 200);
  }, []);

  return { enabled, toggle, playDeal, playCheck, playChips, playFold, playWin };
}

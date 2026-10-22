/**
 * Shared random source for the engine.
 *
 * Unseeded (the default, and always on the multiplayer server) it uses
 * crypto.getRandomValues for deck shuffles and Math.random for AI choices.
 * Seeded, every draw comes from one deterministic mulberry32 stream, so a
 * solo game replays identically. The solo /play page seeds it from ?seed=
 * for end-to-end tests. Seeding only affects the current browser tab.
 */

let seeded: (() => number) | null = null;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Make all engine randomness deterministic. Pass null to restore true randomness. */
export function seedRandom(seed: number | null): void {
  seeded = seed === null ? null : mulberry32(seed);
}

export function isSeeded(): boolean {
  return seeded !== null;
}

/** Float in [0, 1). Use for AI decisions and sizing. */
export function random(): number {
  return seeded ? seeded() : Math.random();
}

/** Integer in [0, max). Cryptographically random unless seeded. Use for shuffles. */
export function randomInt(max: number): number {
  if (seeded) return Math.floor(seeded() * max);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

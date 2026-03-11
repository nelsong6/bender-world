// ============================================================================
// prng.ts - Seeded pseudo-random number generator (Mulberry32)
//
// Provides deterministic randomness for reproducible algorithm runs.
// Same seed + same config = identical learning trajectory, enabling:
//   - Undo/redo via deterministic replay from snapshots
//   - Reproducible runs for comparison
// ============================================================================

/**
 * Mulberry32: a simple, fast 32-bit seeded PRNG.
 * Returns a function that produces values in [0, 1) on each call.
 *
 * The internal state is a single 32-bit integer, mutated in place.
 * To save/restore state for replay, use createPrngWithState().
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * PRNG with externally observable state, for snapshot/restore.
 */
export interface StatefulPrng {
  /** Generate the next random number in [0, 1). */
  next: () => number;
  /** Get the current internal state (for snapshot). */
  getState: () => number;
}

/**
 * Create a PRNG whose state can be read and restored.
 * Use getState() to snapshot, then createPrngWithState(savedState) to replay.
 */
export function createPrngWithState(seed: number): StatefulPrng {
  let state = seed | 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState() {
      return state;
    },
  };
}

/**
 * Generate a random integer in the range [min, max] inclusive,
 * using the provided PRNG function.
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate a random seed from Math.random() for new runs.
 */
export function generateSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

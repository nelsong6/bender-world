// ============================================================================
// perception.ts - Perception state generation and mapping
// Ported from C# PerceptionState.cs
//
// Generates all 243 perception state keys at module load time.
// Each state is a combination of 5 percepts (Left, Right, Down, Up, Current/Grab),
// each of which can be Wall, Can, or Empty. 3^5 = 243 total states.
// ============================================================================

import { Percept, MoveType, MOVES_BY_ORDER, MOVE_SHORT_NAMES } from './types';

/**
 * The three percept values in the order used by the C# static constructor
 * (Percept.get_list() returns: wall, empty, can).
 */
const PERCEPT_VALUES: Percept[] = [Percept.Wall, Percept.Empty, Percept.Can];

/**
 * A perception state is a 5-element tuple describing what Bender perceives
 * in each direction (and at his current square for Grab).
 *
 * Directions are ordered by Move.order: Left, Right, Down, Up, Grab.
 */
export interface PerceptionStateData {
  [MoveType.Left]: Percept;
  [MoveType.Right]: Percept;
  [MoveType.Down]: Percept;
  [MoveType.Up]: Percept;
  [MoveType.Grab]: Percept;
}

/**
 * Build the string key for a perception state, matching the C# set_name() format.
 * Format: "[L: Wall][R: Can][D: Empty][Up: Wall][Gr: Can]"
 * Each direction uses its short name and percept string, ordered by Move.order.
 */
export function getPerceptionKey(perceptions: PerceptionStateData): string {
  let key = '';
  for (const move of MOVES_BY_ORDER) {
    key += `[${MOVE_SHORT_NAMES[move]}: ${perceptions[move]}]`;
  }
  return key;
}

/**
 * Build a perception key from individual direction percepts.
 * Parameters are in Move.order: left, right, down, up, current (grab).
 */
export function getPerceptionKeyFromPercepts(
  left: Percept,
  right: Percept,
  down: Percept,
  up: Percept,
  current: Percept,
): string {
  return `[L: ${left}][R: ${right}][D: ${down}][Up: ${up}][Gr: ${current}]`;
}

// ---------------------------------------------------------------------------
// Pre-computed lookup tables (generated at module load, matching C# static ctor)
// ---------------------------------------------------------------------------

/** All 243 perception state keys, indexed by their numeric ID. */
const ALL_STATE_KEYS: string[] = [];

/** Map from perception key string to numeric ID. */
const KEY_TO_ID: Map<string, number> = new Map();

// Generate all 243 states.
// The C# nested loop order is: Left (i), Right (j), Down (k), Up (l), Grab (m).
// Each loops through Percept.get_list() which is [Wall, Empty, Can].
(function generateAllStates() {
  let id = 0;
  for (const left of PERCEPT_VALUES) {
    for (const right of PERCEPT_VALUES) {
      for (const down of PERCEPT_VALUES) {
        for (const up of PERCEPT_VALUES) {
          for (const grab of PERCEPT_VALUES) {
            const key = getPerceptionKeyFromPercepts(left, right, down, up, grab);
            ALL_STATE_KEYS.push(key);
            KEY_TO_ID.set(key, id);
            id++;
          }
        }
      }
    }
  }
})();

/**
 * Get the numeric ID (0-242) for a given perception key string.
 * Returns -1 if the key is not found (should not happen with valid percepts).
 */
export function getPerceptionId(key: string): number {
  const id = KEY_TO_ID.get(key);
  return id !== undefined ? id : -1;
}

/**
 * Get the perception key string for a given numeric ID (0-242).
 */
export function getPerceptionKeyById(id: number): string {
  return ALL_STATE_KEYS[id] ?? '';
}

/**
 * Get all 243 perception state keys.
 */
export function getAllPerceptionKeys(): readonly string[] {
  return ALL_STATE_KEYS;
}

/**
 * Total number of perception states (always 243 = 3^5).
 */
export const TOTAL_PERCEPTION_STATES = 243;

// ============================================================================
// q-matrix.ts - Q-Learning matrix for state-action value storage
// Ported from C# Qmatrix.cs and ValueSet.cs
//
// The Q-Matrix maps perception state IDs to arrays of 5 action values
// (one per MoveType: Left, Right, Up, Down, Grab).
//
// Action indices correspond to ALL_MOVES order: [Left=0, Right=1, Up=2, Down=3, Grab=4]
// ============================================================================

import { MoveType, ALL_MOVES } from './types';
import { randomInt as prngRandomInt } from './prng';
import type { DecidePhaseData } from './phase-data';

/** Number of possible actions (Left, Right, Up, Down, Grab). */
const NUM_ACTIONS = 5;

/**
 * Map from MoveType to its index in the action-values array.
 * Matches the order of ALL_MOVES (which is the C# Move.list order).
 */
const MOVE_TO_INDEX: Record<MoveType, number> = {
  [MoveType.Left]: 0,
  [MoveType.Right]: 1,
  [MoveType.Up]: 2,
  [MoveType.Down]: 3,
  [MoveType.Grab]: 4,
};

/**
 * QMatrix stores and manages Q-values for the reinforcement learning algorithm.
 *
 * Each entry maps a perception state ID (0-242) to an array of 5 action values.
 * Ported from C# Qmatrix class and ValueSet class.
 */
export class QMatrix {
  /**
   * Internal storage: perception state ID -> 5 action values.
   * Only states that have been encountered are stored (sparse).
   */
  private data: Map<number, number[]>;

  constructor() {
    this.data = new Map();
  }

  // --------------------------------------------------------------------------
  // Value access (ported from ValueSet)
  // --------------------------------------------------------------------------

  /**
   * Get the 5 action values for a given perception state ID.
   * If the state has not been seen before, creates and returns a zero-filled array.
   * Matches C# ValueSet constructor (all values initialized to 0).
   */
  getValues(stateId: number): number[] {
    let values = this.data.get(stateId);
    if (!values) {
      values = new Array(NUM_ACTIONS).fill(0);
      this.data.set(stateId, values);
    }
    return values;
  }

  /**
   * Get the best (highest) Q-value for a given state.
   * Returns 0 if the state has not been encountered.
   * Matches C# ValueSet.GetBestValue().
   */
  getBestValue(stateId: number): number {
    const values = this.data.get(stateId);
    if (!values) return 0;

    let best = 0;
    for (const v of values) {
      if (v > best) best = v;
    }
    return best;
  }

  /**
   * Check whether a state has been recorded in the matrix.
   */
  hasState(stateId: number): boolean {
    return this.data.has(stateId);
  }

  // --------------------------------------------------------------------------
  // Action selection (ported from Qmatrix.GenerateStep)
  // --------------------------------------------------------------------------

  /**
   * Select an action using epsilon-greedy strategy.
   *
   * With probability epsilon: return a random action.
   * Otherwise: return the action with the highest Q-value,
   *   with random tie-breaking among equally-best actions.
   *
   * Matches C# Qmatrix.GenerateStep().
   *
   * @returns [actionIndex, wasRandom] tuple
   */
  selectAction(stateId: number, epsilon: number, rng: () => number): [number, boolean] {
    // Check if we have data for this state
    const hasData = this.data.has(stateId);

    if (hasData) {
      // Epsilon-greedy: random exploration check
      // C#: MyRandom.Next(1, 101) < e_current * 100
      // e.g., epsilon=0.2 -> random if randInt(1..100) < 20 -> values 1..19 = 19% chance
      if (prngRandomInt(rng, 1, 100) < epsilon * 100) {
        return [prngRandomInt(rng, 0, NUM_ACTIONS - 1), true];
      }

      // Greedy selection with random tie-breaking
      const values = this.data.get(stateId)!;
      let bestValue = values[0];
      const bestIndices: number[] = [0];

      for (let i = 1; i < NUM_ACTIONS; i++) {
        if (values[i] > bestValue) {
          bestValue = values[i];
          bestIndices.length = 0;
          bestIndices.push(i);
        } else if (values[i] === bestValue) {
          bestIndices.push(i);
        }
      }

      const chosenIndex = bestIndices[prngRandomInt(rng, 0, bestIndices.length - 1)];
      return [chosenIndex, false];
    }

    // No Q-matrix entry for this state: random move
    // C#: Move.list[MyRandom.Next(0, Move.list.Count)]
    return [prngRandomInt(rng, 0, NUM_ACTIONS - 1), true];
  }

  /**
   * Like selectAction(), but returns all intermediate decision data for phase visualization.
   * CRITICAL: consumes PRNG in the exact same order as selectAction().
   */
  selectActionDetailed(stateId: number, epsilon: number, rng: () => number): DecidePhaseData {
    const hasData = this.data.has(stateId);
    const qValuesForState = hasData ? [...this.data.get(stateId)!] : [0, 0, 0, 0, 0];

    if (hasData) {
      // Same PRNG call as selectAction line 110
      const randomRoll = prngRandomInt(rng, 1, 100);
      const threshold = epsilon * 100;

      if (randomRoll < threshold) {
        // Exploring — same PRNG call as selectAction line 111
        const randomActionRoll = prngRandomInt(rng, 0, NUM_ACTIONS - 1);
        return {
          epsilon,
          stateHasData: true,
          randomRoll,
          threshold,
          isExploring: true,
          qValuesForState,
          bestValue: Math.max(...qValuesForState),
          bestIndices: [],
          randomActionRoll,
          chosenActionIndex: randomActionRoll,
          chosenActionName: ALL_MOVES[randomActionRoll],
        };
      }

      // Greedy — find best with tie-breaking (same logic as selectAction lines 115-130)
      const values = this.data.get(stateId)!;
      let bestValue = values[0];
      const bestIndices: number[] = [0];
      for (let i = 1; i < NUM_ACTIONS; i++) {
        if (values[i] > bestValue) {
          bestValue = values[i];
          bestIndices.length = 0;
          bestIndices.push(i);
        } else if (values[i] === bestValue) {
          bestIndices.push(i);
        }
      }
      // Same PRNG call as selectAction line 129
      const tieBreakRoll = prngRandomInt(rng, 0, bestIndices.length - 1);
      const chosenIndex = bestIndices[tieBreakRoll];
      return {
        epsilon,
        stateHasData: true,
        randomRoll,
        threshold,
        isExploring: false,
        qValuesForState,
        bestValue,
        bestIndices: [...bestIndices],
        tieBreakRoll,
        chosenActionIndex: chosenIndex,
        chosenActionName: ALL_MOVES[chosenIndex],
      };
    }

    // No data — random move (same PRNG call as selectAction line 135)
    const randomActionRoll = prngRandomInt(rng, 0, NUM_ACTIONS - 1);
    return {
      epsilon,
      stateHasData: false,
      randomRoll: 0,
      threshold: epsilon * 100,
      isExploring: true,
      qValuesForState,
      bestValue: 0,
      bestIndices: [],
      randomActionRoll,
      chosenActionIndex: randomActionRoll,
      chosenActionName: ALL_MOVES[randomActionRoll],
    };
  }

  // --------------------------------------------------------------------------
  // Q-value update (ported from Qmatrix.UpdateState)
  // --------------------------------------------------------------------------

  /**
   * Update the Q-value for a state-action pair.
   *
   * The C# update formula from Qmatrix.UpdateState():
   *   1. old_qmatrix_value = bestValue(state_to_update) or 0
   *   2. new_qmatrix_value = bestValue(result_state) or 0
   *   3. difference = new_qmatrix_value - old_qmatrix_value
   *   4. y_current = gamma ^ (stepNumber - 1)
   *   5. discounted_difference = difference * y_current
   *   6. reward_added = discounted_difference + base_reward
   *   7. final_value = eta * reward_added
   *   8. If final_value != 0, SET matrix[state_to_update][action] = final_value
   *
   * Note: This SETS the Q-value (not increments). This is the exact C# behavior.
   *
   * @param stateToUpdate - The perception state ID before the action was taken
   * @param resultState - The perception state ID after the action was taken
   * @param actionIndex - The index of the action taken (0-4)
   * @param baseReward - The immediate reward received
   * @param gamma - The base discount factor (y from InitialSettings)
   * @param eta - The learning rate (n from InitialSettings)
   * @param stepNumber - The current step number in the episode
   * @returns true if the matrix was actually updated (final_value was non-zero)
   */
  update(
    stateToUpdate: number,
    resultState: number,
    actionIndex: number,
    baseReward: number,
    gamma: number,
    eta: number,
    stepNumber: number,
  ): boolean {
    // Get best values at old and new states
    const oldBestValue = this.getBestValue(stateToUpdate);
    const newBestValue = this.getBestValue(resultState);

    // Calculate the Q-value update
    const difference = newBestValue - oldBestValue;

    // Discount factor: gamma ^ (stepNumber - 1)
    const discountFactor = Math.pow(gamma, stepNumber - 1);
    const discountedDifference = difference * discountFactor;

    const rewardAdded = discountedDifference + baseReward;
    const finalValue = eta * rewardAdded;

    if (finalValue !== 0) {
      // Ensure the state exists in the matrix
      const values = this.getValues(stateToUpdate);
      values[actionIndex] = finalValue;
      return true;
    }

    return false;
  }

  /**
   * Like update(), but returns all intermediate computation values for phase visualization.
   * Also performs the actual update (not read-only).
   */
  updateDetailed(
    stateToUpdate: number,
    resultState: number,
    actionIndex: number,
    baseReward: number,
    gamma: number,
    eta: number,
    stepNumber: number,
  ): {
    oldBestValue: number;
    newBestValue: number;
    difference: number;
    discountFactor: number;
    discountedDifference: number;
    combined: number;
    finalValue: number;
    wasUpdated: boolean;
    qRowBefore: number[];
    qRowAfter: number[];
  } {
    // Capture before state
    const qRowBefore = this.data.has(stateToUpdate)
      ? [...this.data.get(stateToUpdate)!]
      : [0, 0, 0, 0, 0];

    const oldBestValue = this.getBestValue(stateToUpdate);
    const newBestValue = this.getBestValue(resultState);
    const difference = newBestValue - oldBestValue;
    const discountFactor = Math.pow(gamma, stepNumber - 1);
    const discountedDifference = difference * discountFactor;
    const combined = discountedDifference + baseReward;
    const finalValue = eta * combined;

    let wasUpdated = false;
    if (finalValue !== 0) {
      const values = this.getValues(stateToUpdate);
      values[actionIndex] = finalValue;
      wasUpdated = true;
    }

    // Capture after state
    const qRowAfter = this.data.has(stateToUpdate)
      ? [...this.data.get(stateToUpdate)!]
      : [0, 0, 0, 0, 0];

    return {
      oldBestValue,
      newBestValue,
      difference,
      discountFactor,
      discountedDifference,
      combined,
      finalValue,
      wasUpdated,
      qRowBefore,
      qRowAfter,
    };
  }

  // --------------------------------------------------------------------------
  // Serialization
  // --------------------------------------------------------------------------

  /**
   * Serialize the Q-matrix to a JSON-compatible object.
   * Only includes states that have at least one non-zero value.
   */
  toJSON(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [stateId, values] of this.data.entries()) {
      // Only include if at least one value is non-zero
      if (values.some(v => v !== 0)) {
        result[stateId.toString()] = [...values];
      }
    }
    return result;
  }

  /**
   * Restore the Q-matrix from a JSON-compatible object.
   */
  static fromJSON(json: Record<string, number[]>): QMatrix {
    const matrix = new QMatrix();
    for (const [key, values] of Object.entries(json)) {
      const stateId = parseInt(key, 10);
      if (!isNaN(stateId) && Array.isArray(values) && values.length === NUM_ACTIONS) {
        matrix.data.set(stateId, [...values]);
      }
    }
    return matrix;
  }

  // --------------------------------------------------------------------------
  // Inspection
  // --------------------------------------------------------------------------

  /**
   * Get the number of states that have at least one non-zero Q-value.
   */
  getEntryCount(): number {
    let count = 0;
    for (const values of this.data.values()) {
      if (values.some(v => v !== 0)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all state IDs that have been recorded in the matrix.
   */
  getStateIds(): number[] {
    return Array.from(this.data.keys()).sort((a, b) => a - b);
  }

  /**
   * Get the Q-value for a specific state and action.
   */
  getQValue(stateId: number, move: MoveType): number {
    const values = this.data.get(stateId);
    if (!values) return 0;
    return values[MOVE_TO_INDEX[move]];
  }

  /**
   * Get the action index for a MoveType.
   */
  static getMoveIndex(move: MoveType): number {
    return MOVE_TO_INDEX[move];
  }

  /**
   * Get the MoveType for an action index.
   */
  static getMoveForIndex(index: number): MoveType {
    return ALL_MOVES[index];
  }

  // --------------------------------------------------------------------------
  // Snapshot / Restore (for undo/redo via deterministic replay)
  // --------------------------------------------------------------------------

  /**
   * Create a deep copy of the Q-matrix data for snapshotting.
   * Max 243 states x 5 values = ~10KB per snapshot.
   */
  snapshot(): Map<number, number[]> {
    const copy = new Map<number, number[]>();
    for (const [stateId, values] of this.data.entries()) {
      copy.set(stateId, [...values]);
    }
    return copy;
  }

  /**
   * Restore Q-matrix data from a snapshot.
   */
  restore(snapshot: Map<number, number[]>): void {
    this.data = new Map();
    for (const [stateId, values] of snapshot.entries()) {
      this.data.set(stateId, [...values]);
    }
  }
}

// ============================================================================
// phase-data.ts - Data structures for phase-level step decomposition
//
// Each Q-learning micro-step decomposes into 5 sequential phases:
//   0: Perceive  — read sensors, encode perception state
//   1: Decide    — epsilon-greedy action selection
//   2: Act       — execute move, update board
//   3: Reward    — map outcome to reward value
//   4: Learn     — Q-value update with full formula breakdown
// ============================================================================

import type { MoveType, MoveResult, Percept, RewardConfig } from './types';

/** The 5 phases within a single micro-step. */
export enum StepPhase {
  Perceive = 0,
  Decide = 1,
  Act = 2,
  Reward = 3,
  Learn = 4,
}

export const PHASE_COUNT = 5;

export const PHASE_LABELS = ['Perceive', 'Decide', 'Act', 'Reward', 'Learn'] as const;

// ---------------------------------------------------------------------------
// Per-phase data interfaces
// ---------------------------------------------------------------------------

/** One row in the base-3 encoding breakdown table. */
export interface EncodingDigit {
  direction: string;       // e.g. "Left", "Right"
  percept: Percept;
  digitValue: number;      // 0=Wall, 1=Empty, 2=Can
  weight: number;          // positional weight: 81, 27, 9, 3, 1
  contribution: number;    // digitValue * weight
}

export interface PerceivePhaseData {
  benderPosition: [number, number];
  sensorReadings: { direction: string; percept: Percept }[];
  perceptionKey: string;
  perceptionId: number;
  encodingDigits: EncodingDigit[];
}

export interface DecidePhaseData {
  epsilon: number;
  /** Whether the state existed in the Q-matrix before this decision. */
  stateHasData: boolean;
  /** The random int rolled (1–100), only meaningful when stateHasData. */
  randomRoll: number;
  /** Threshold = epsilon * 100. Roll < threshold → explore. */
  threshold: number;
  isExploring: boolean;
  /** All 5 Q-values for the current state (zeros if state is new). */
  qValuesForState: number[];
  /** Best Q-value among the 5 actions. */
  bestValue: number;
  /** Indices of actions tied for best (for tie-breaking display). */
  bestIndices: number[];
  /** The random int used for tie-breaking (index into bestIndices). */
  tieBreakRoll?: number;
  /** The random int used when exploring or state is new (0–4). */
  randomActionRoll?: number;
  chosenActionIndex: number;
  chosenActionName: string;
}

export interface ActPhaseData {
  move: MoveType;
  moveResult: MoveResult;
  benderPositionBefore: [number, number];
  benderPositionAfter: [number, number];
}

export interface RewardPhaseData {
  moveResult: MoveResult;
  reward: number;
  rewardConfig: RewardConfig;
  episodeRewardBefore: number;
  episodeRewardAfter: number;
}

export interface LearnPhaseData {
  perceptionBefore: number;
  perceptionAfter: number;
  perceptionBeforeKey: string;
  perceptionAfterKey: string;
  actionIndex: number;
  actionName: string;
  stepNumber: number;
  // Formula breakdown
  oldBestValue: number;
  newBestValue: number;
  difference: number;
  gamma: number;
  eta: number;
  discountFactor: number;
  discountedDifference: number;
  baseReward: number;
  combined: number;
  finalValue: number;
  wasUpdated: boolean;
  qRowBefore: number[];
  qRowAfter: number[];
}

/** All phase data for a single micro-step. */
export interface PhaseStepData {
  perceive: PerceivePhaseData;
  decide: DecidePhaseData;
  act: ActPhaseData;
  reward: RewardPhaseData;
  learn: LearnPhaseData;
}

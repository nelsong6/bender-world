// ============================================================================
// types.ts - Core types, enums, interfaces, and constants for BenderWorld
// Ported from C# ReinforcementLearning project
// ============================================================================

/**
 * What Bender perceives in a given direction.
 * Corresponds to C# Percept class (Wall, Can, Empty).
 */
export enum Percept {
  Wall = 'Wall',
  Can = 'Can',
  Empty = 'Empty',
}

/**
 * The five possible moves Bender can make.
 * Corresponds to C# Move class.
 * Order matches the C# Move.order field used for perception state encoding:
 *   Left=1, Right=2, Down=3, Up=4, Grab=5
 */
export enum MoveType {
  Left = 'Left',
  Right = 'Right',
  Down = 'Down',
  Up = 'Up',
  Grab = 'Grab',
}

/**
 * Grid adjustments for each move direction.
 * In the C# code, x is the first index (columns: left=-1, right=+1)
 * and y is the second index (rows: down=-1, up=+1).
 * Grab has no grid adjustment [0, 0].
 */
export const MOVE_GRID_ADJUSTMENT: Record<MoveType, [number, number]> = {
  [MoveType.Left]: [-1, 0],
  [MoveType.Right]: [1, 0],
  [MoveType.Down]: [0, -1],
  [MoveType.Up]: [0, 1],
  [MoveType.Grab]: [0, 0],
};

/**
 * The ordered list of all moves, matching C# Move.list order:
 * Left, Right, Up, Down, Grab
 */
export const ALL_MOVES: MoveType[] = [
  MoveType.Left,
  MoveType.Right,
  MoveType.Up,
  MoveType.Down,
  MoveType.Grab,
];

/**
 * Moves ordered by their C# Move.order field (used for perception state encoding).
 * Left=1, Right=2, Down=3, Up=4, Grab=5
 */
export const MOVES_BY_ORDER: MoveType[] = [
  MoveType.Left,
  MoveType.Right,
  MoveType.Down,
  MoveType.Up,
  MoveType.Grab,
];

/**
 * Short names matching C# Move.short_name for building perception state keys.
 */
export const MOVE_SHORT_NAMES: Record<MoveType, string> = {
  [MoveType.Left]: 'L',
  [MoveType.Right]: 'R',
  [MoveType.Down]: 'D',
  [MoveType.Up]: 'Up',
  [MoveType.Grab]: 'Gr',
};

/**
 * The result of applying a move on the board.
 * Corresponds to C# MoveResult class.
 */
export enum MoveResult {
  HitWall = 'HitWall',
  CanCollected = 'CanCollected',
  CanMissing = 'CanMissing',
  MoveSuccessful = 'MoveSuccessful',
}

/**
 * Reward values for each move result.
 * Corresponds to C# ReinforcementFactors.list.
 */
export const REWARD_MAP: Record<MoveResult, number> = {
  [MoveResult.HitWall]: -5,
  [MoveResult.CanCollected]: 10,
  [MoveResult.CanMissing]: -1,
  [MoveResult.MoveSuccessful]: 0,
};

/**
 * Configuration for the Q-Learning algorithm.
 * Corresponds to C# InitialSettings fields.
 */
export interface AlgorithmConfig {
  /** Epsilon: probability of taking a random action (explore vs exploit). C# e_data. */
  epsilon: number;
  /** Gamma: discount factor for future rewards. C# y_data. */
  gamma: number;
  /** Eta: learning rate. C# n_data. */
  eta: number;
  /** Maximum number of episodes to run. C# episode_limit_data. */
  episodeLimit: number;
  /** Maximum number of steps per episode. C# step_limit_data. */
  stepLimit: number;
}

/**
 * Default configuration values matching C# InitialSettings.
 * Note: The C# comments have eta/epsilon labels swapped in InitialSettings.cs,
 * but the actual usage in Qmatrix.cs clarifies:
 *   e = epsilon (random factor), n = eta (learning rate), y = gamma (discount).
 */
export const DEFAULT_CONFIG: AlgorithmConfig = {
  epsilon: 0.2,
  gamma: 0.9,
  eta: 0.1,
  episodeLimit: 5000,
  stepLimit: 200,
};

/**
 * Result of a single step in the algorithm.
 * Provides all information needed for UI display and logging.
 */
export interface StepResult {
  episodeNumber: number;
  stepNumber: number;
  benderPosition: [number, number];
  move: MoveType;
  moveResult: MoveResult;
  reward: number;
  episodeReward: number;
  cansCollected: number;
  perception: string;
  wasRandomMove: boolean;
}

/**
 * Summary of a completed episode.
 */
export interface EpisodeSummary {
  episodeNumber: number;
  totalReward: number;
  cansCollected: number;
  stepsUsed: number;
  epsilonAtStart: number;
}

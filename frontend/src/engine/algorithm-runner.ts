// ============================================================================
// algorithm-runner.ts - Main Q-Learning algorithm orchestrator
// Ported from C# AlgorithmState.cs (step/episode logic) and
//   AlgorithmEpisode.cs (episode structure)
//
// Unlike the C# version which stored the full history of every state at every
// step of every episode, this implementation runs the algorithm without
// retaining all history. It exposes the current state for visualization and
// returns step/episode results for the caller to handle as needed.
// ============================================================================

import {
  AlgorithmConfig,
  DEFAULT_CONFIG,
  MoveType,
  MoveResult,
  REWARD_MAP,
  ALL_MOVES,
  StepResult,
  EpisodeSummary,
} from './types';
import { GameBoard } from './board';
import { QMatrix } from './q-matrix';

/**
 * AlgorithmRunner manages the Q-Learning algorithm execution.
 * It handles episode/step progression, board state, Q-matrix updates,
 * and epsilon decay.
 *
 * Replaces the orchestration found in C# AlgorithmState.cs, but without
 * storing full state history (which was needed for the C# WinForms UI replay).
 */
export class AlgorithmRunner {
  // Configuration
  private config: AlgorithmConfig;
  private readonly initialEpsilon: number;

  // Core state
  private board: GameBoard;
  private qMatrix: QMatrix;

  // Episode/step tracking
  private _currentEpisode: number;
  private _currentStep: number;
  private _episodeReward: number;
  private _totalReward: number;
  private _cansCollected: number;
  private _currentEpsilon: number;

  // Tracking whether the algorithm has completed all episodes
  private _algorithmEnded: boolean;

  // Perception state IDs for the current step
  private startPerceptionId: number;

  constructor(config: AlgorithmConfig = DEFAULT_CONFIG) {
    this.config = { ...config };
    this.initialEpsilon = config.epsilon;

    this.board = new GameBoard();
    this.qMatrix = new QMatrix();

    this._currentEpisode = 0;
    this._currentStep = 0;
    this._episodeReward = 0;
    this._totalReward = 0;
    this._cansCollected = 0;
    this._currentEpsilon = config.epsilon;
    this._algorithmEnded = false;

    this.startPerceptionId = -1;

    // Begin the first episode
    this.startNewEpisode();
  }

  // --------------------------------------------------------------------------
  // Episode management (ported from AlgorithmState.StartNewEpisode,
  //   Qmatrix.ProcessNewEpisode)
  // --------------------------------------------------------------------------

  /**
   * Start a new episode: shuffle the board, reset episode-specific counters,
   * and decay epsilon.
   *
   * Matches the C# flow:
   *   AlgorithmState.StartNewEpisode() -> shuffle, reset counters
   *   Qmatrix.ProcessNewEpisode() -> step=0, episode++, epsilon decay
   */
  private startNewEpisode(): void {
    // Reset episode-level counters (C# AlgorithmState.StartNewEpisode)
    this._cansCollected = 0;
    this._episodeReward = 0;

    // Shuffle the board for the new episode
    this.board.shuffleCansAndBender();

    // Capture initial perception
    this.startPerceptionId = this.board.getPerceptionStateId();

    // Process new episode in Q-matrix terms (C# Qmatrix.ProcessNewEpisode)
    this._currentStep = 0;
    this._currentEpisode++;

    // Epsilon decay: e_current -= (e_initial / episode_limit)
    // Note: In C# this is called each new episode, including the first.
    // The first call to ProcessNewEpisode happens when episode 1 starts.
    this._currentEpsilon -= this.initialEpsilon / this.config.episodeLimit;
    if (this._currentEpsilon < 0) {
      this._currentEpsilon = 0;
    }
  }

  // --------------------------------------------------------------------------
  // Step execution (ported from AlgorithmState.TakeStep)
  // --------------------------------------------------------------------------

  /**
   * Run a single step within the current episode.
   *
   * Matches the C# AlgorithmState.TakeStep() flow:
   *   1. Get move from Q-matrix (epsilon-greedy)
   *   2. Apply move to board
   *   3. Get reward from ReinforcementFactors
   *   4. Accumulate episode reward
   *   5. Track can collection
   *   6. Get ending perception state
   *   7. Update Q-matrix with (old state, new state, move, reward)
   *   8. Check for algorithm completion
   *
   * @returns StepResult with all information about this step, or null if the
   *   algorithm has ended.
   */
  runStep(): StepResult | null {
    if (this._algorithmEnded) {
      return null;
    }

    // Check if we need to start a new episode
    // In C#, this happens when step_number == step_limit at the AlgorithmState copy constructor
    if (this._currentStep >= this.config.stepLimit) {
      // Check if we've exceeded episode limit
      if (this._currentEpisode >= this.config.episodeLimit) {
        this._algorithmEnded = true;
        return null;
      }
      this.startNewEpisode();
    }

    // Increment step number
    // In the C# code, step_number starts at 0 after ProcessNewEpisode
    // and increments at each new AlgorithmState copy constructor.
    this._currentStep++;

    // 1. Get Bender's current perception state (before move)
    const perceptionBefore = this.startPerceptionId;

    // 2. Select action using epsilon-greedy (C# Qmatrix.GenerateStep)
    const [actionIndex, wasRandom] = this.qMatrix.selectAction(
      perceptionBefore,
      this._currentEpsilon,
    );
    const move = ALL_MOVES[actionIndex];

    // 3. Apply the move to the board (C# board_data.ApplyMove)
    const moveResult = this.board.applyMove(move);

    // 4. Get reward (C# ReinforcementFactors.list[result_this_step])
    const reward = REWARD_MAP[moveResult];

    // 5. Accumulate episode reward
    this._episodeReward += reward;
    this._totalReward += reward;

    // 6. Track can collection
    if (moveResult === MoveResult.CanCollected) {
      this._cansCollected++;
    }

    // 7. Get ending perception state
    const perceptionAfter = this.board.getPerceptionStateId();

    // 8. Update Q-matrix (C# Qmatrix.UpdateState)
    this.qMatrix.update(
      perceptionBefore,
      perceptionAfter,
      actionIndex,
      reward,
      this.config.gamma,
      this.config.eta,
      this._currentStep,
    );

    // Update starting perception for the next step
    this.startPerceptionId = perceptionAfter;

    // Check for algorithm end (C#: step == step_limit && episode > episode_limit)
    if (
      this._currentStep >= this.config.stepLimit &&
      this._currentEpisode >= this.config.episodeLimit
    ) {
      this._algorithmEnded = true;
    }

    // Build and return the step result
    const result: StepResult = {
      episodeNumber: this._currentEpisode,
      stepNumber: this._currentStep,
      benderPosition: this.board.getBenderPosition(),
      move,
      moveResult,
      reward,
      episodeReward: this._episodeReward,
      cansCollected: this._cansCollected,
      perception: this.board.getPerceptionState(),
      wasRandomMove: wasRandom,
    };

    return result;
  }

  // --------------------------------------------------------------------------
  // Episode execution
  // --------------------------------------------------------------------------

  /**
   * Run a full episode (up to stepLimit steps).
   * Returns a summary of the episode.
   *
   * This is a convenience method that calls runStep() repeatedly.
   */
  runEpisode(): EpisodeSummary | null {
    if (this._algorithmEnded) {
      return null;
    }

    const epsilonAtStart = this._currentEpsilon;
    const episodeNumber = this._currentEpisode + 1; // The episode that will run

    // If we're mid-episode, finish it first
    // (In normal usage, runEpisode is called at episode boundaries)
    let stepsUsed = 0;

    // Run steps until the episode changes or algorithm ends
    const startEpisode = this._currentEpisode;
    let lastStep: StepResult | null = null;

    // The first runStep call may trigger startNewEpisode if we were at the limit
    // So we track the actual episode number from the first step result
    let actualEpisodeNumber = -1;

    while (!this._algorithmEnded) {
      const step = this.runStep();
      if (!step) break;

      if (actualEpisodeNumber === -1) {
        actualEpisodeNumber = step.episodeNumber;
      }

      // If we've moved to a different episode, we've finished our target episode
      if (step.episodeNumber !== actualEpisodeNumber) {
        // The step already belongs to the next episode; the previous episode is done.
        // But since we already ran a step of the next episode, we need to account for that.
        // Actually, looking at the flow: when _currentStep >= stepLimit, the next runStep
        // calls startNewEpisode, increments to the new episode, then runs the step.
        // So if step.episodeNumber changed, we've already started the next episode.
        // We should stop here. The last step of the old episode was the previous iteration.
        break;
      }

      lastStep = step;
      stepsUsed++;
    }

    if (actualEpisodeNumber === -1) {
      return null;
    }

    return {
      episodeNumber: actualEpisodeNumber,
      totalReward: lastStep ? lastStep.episodeReward : 0,
      cansCollected: lastStep ? lastStep.cansCollected : 0,
      stepsUsed,
      epsilonAtStart,
    };
  }

  // --------------------------------------------------------------------------
  // State inspection
  // --------------------------------------------------------------------------

  /**
   * Get the current board state for visualization.
   */
  getCurrentState(): {
    board: { hasCan: boolean; hasBender: boolean; walls: MoveType[] }[][];
    benderPosition: [number, number];
    perceptionKey: string;
  } {
    return {
      board: this.board.getBoardState(),
      benderPosition: this.board.getBenderPosition(),
      perceptionKey: this.board.getPerceptionState(),
    };
  }

  /**
   * Get a reference to the Q-matrix for inspection.
   */
  getQMatrix(): QMatrix {
    return this.qMatrix;
  }

  /**
   * Get the current epsilon value (decays over episodes).
   */
  getEpsilon(): number {
    return this._currentEpsilon;
  }

  /**
   * Reset the algorithm to its initial state with the same or new config.
   */
  reset(config?: AlgorithmConfig): void {
    const effectiveConfig = config ?? this.config;
    Object.assign(this.config, effectiveConfig);

    this.board = new GameBoard();
    this.qMatrix = new QMatrix();

    this._currentEpisode = 0;
    this._currentStep = 0;
    this._episodeReward = 0;
    this._totalReward = 0;
    this._cansCollected = 0;
    this._currentEpsilon = effectiveConfig.epsilon;
    this._algorithmEnded = false;

    this.startPerceptionId = -1;

    this.startNewEpisode();
  }

  // --------------------------------------------------------------------------
  // Properties
  // --------------------------------------------------------------------------

  get currentEpisode(): number {
    return this._currentEpisode;
  }

  get currentStep(): number {
    return this._currentStep;
  }

  get episodeReward(): number {
    return this._episodeReward;
  }

  get totalReward(): number {
    return this._totalReward;
  }

  get cansCollected(): number {
    return this._cansCollected;
  }

  get algorithmEnded(): boolean {
    return this._algorithmEnded;
  }

  get algorithmConfig(): Readonly<AlgorithmConfig> {
    return this.config;
  }
}

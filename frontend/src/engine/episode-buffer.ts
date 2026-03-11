import type { AlgorithmConfig, EpisodeSummary, StepResult } from './types';
import { AlgorithmRunner, type AlgorithmSnapshot } from './algorithm-runner';

export interface EpisodeBufferEntry {
  summary: EpisodeSummary;
  /** Full step history — only populated when captureSteps is true (micro mode). */
  stepHistory?: StepResult[];
}

/**
 * Pre-computes episodes ahead of the animation playhead.
 * Rolling buffer of EpisodeSummary (+ optional step history).
 * Producer loop runs via setTimeout(0) to stay non-blocking.
 *
 * Adapted from eight-queens GenerationBuffer for RL episode structure.
 */
export class EpisodeBuffer {
  private runner: AlgorithmRunner;
  private buffer: EpisodeBufferEntry[] = [];
  private consumedSummaries: EpisodeSummary[] = [];
  private maxSize: number;
  private producing = false;
  private produceTimerId: ReturnType<typeof setTimeout> | null = null;
  private batchSize = 1;

  /** When true, step history is captured for each buffered episode (micro mode). */
  captureSteps = false;

  /** Called when buffer transitions from empty to non-empty */
  onBufferReady: (() => void) | null = null;

  constructor(config: AlgorithmConfig, maxSize = 18) {
    this.runner = new AlgorithmRunner(config);
    this.maxSize = maxSize;
  }

  /** Start the background producer loop */
  startProducing(): void {
    if (this.producing) return;
    this.producing = true;
    this.scheduleProduction();
  }

  /** Stop the producer loop */
  stopProducing(): void {
    this.producing = false;
    if (this.produceTimerId !== null) {
      clearTimeout(this.produceTimerId);
      this.produceTimerId = null;
    }
  }

  /** Set how many episodes to compute per tick (for high speeds) */
  setBatchSize(size: number): void {
    this.batchSize = Math.max(1, Math.min(size, 50));
  }

  /** Number of unconsumed entries ready for animation */
  get available(): number {
    return this.buffer.length;
  }

  /** Total episodes consumed by the animation */
  get consumedCount(): number {
    return this.consumedSummaries.length;
  }

  /** Total episodes computed (consumed + buffered) */
  get totalComputed(): number {
    return this.consumedSummaries.length + this.buffer.length;
  }

  /** Has the algorithm completed all episodes? */
  get ended(): boolean {
    return this.runner.algorithmEnded;
  }

  /** Peek at an entry by offset from the consume position (0 = next to consume) */
  peek(offset: number): EpisodeBufferEntry | undefined {
    return this.buffer[offset];
  }

  /** Consume the next entry (animation crossed an episode boundary) */
  consume(): EpisodeBufferEntry | undefined {
    const entry = this.buffer.shift();
    if (entry) {
      this.consumedSummaries.push(entry.summary);
      if (this.producing && this.buffer.length < this.maxSize) {
        this.scheduleProduction();
      }
    }
    return entry;
  }

  /** Get all summaries (consumed + buffered) */
  getAllSummaries(): EpisodeSummary[] {
    return [
      ...this.consumedSummaries,
      ...this.buffer.map(e => e.summary),
    ];
  }

  /** Get only consumed summaries */
  getConsumedSummaries(): EpisodeSummary[] {
    return [...this.consumedSummaries];
  }

  /** Prefill the buffer with entries (e.g. from redo stack) */
  prefill(entries: EpisodeBufferEntry[]): void {
    this.buffer.unshift(...entries);
  }

  /**
   * Compute N episodes immediately (synchronous, for stepN).
   * Returns summaries directly, bypassing the buffer.
   */
  computeImmediate(count: number): EpisodeSummary[] {
    const summaries: EpisodeSummary[] = [];
    for (let i = 0; i < count; i++) {
      if (this.runner.algorithmEnded) break;
      const summary = this.runner.runEpisode();
      if (!summary) break;
      summaries.push(summary);
    }
    return summaries;
  }

  /**
   * Compute a single episode immediately (synchronous, for manual step).
   * Returns the entry directly, bypassing the buffer.
   */
  computeOne(): EpisodeBufferEntry | null {
    if (this.runner.algorithmEnded) return null;

    if (this.captureSteps) {
      return this.computeEpisodeWithSteps();
    }

    const summary = this.runner.runEpisode();
    if (!summary) return null;
    return { summary };
  }

  /** Get a snapshot of the algorithm state for undo/redo */
  getSnapshot(): AlgorithmSnapshot {
    return this.runner.getSnapshot();
  }

  /** Restore algorithm state from a snapshot */
  restoreSnapshot(snapshot: AlgorithmSnapshot): void {
    this.runner.restoreSnapshot(snapshot);
  }

  /** Get the seed used for this run */
  getSeed(): number {
    return this.runner.getSeed();
  }

  /** Get current runner state for UI display */
  getRunnerState() {
    return {
      currentEpisode: this.runner.currentEpisode,
      currentStep: this.runner.currentStep,
      episodeReward: this.runner.episodeReward,
      totalReward: this.runner.totalReward,
      cansCollected: this.runner.cansCollected,
      cansRemaining: this.runner.getCansRemaining(),
      epsilon: this.runner.getEpsilon(),
      algorithmEnded: this.runner.algorithmEnded,
      boardState: this.runner.getCurrentState(),
      qMatrix: this.runner.getQMatrix(),
    };
  }

  /** Reset with a new config */
  reset(config: AlgorithmConfig): void {
    this.stopProducing();
    this.runner = new AlgorithmRunner(config);
    this.buffer = [];
    this.consumedSummaries = [];
  }

  /** Trim consumed summaries to a given length (for undo/back) */
  trimConsumedTo(length: number): void {
    this.consumedSummaries = this.consumedSummaries.slice(0, length);
  }

  /** Clear the lookahead buffer (for undo, keeps consumed intact) */
  clearBuffer(): void {
    this.buffer = [];
  }

  private computeEpisodeWithSteps(): EpisodeBufferEntry | null {
    if (this.runner.algorithmEnded) return null;

    const steps: StepResult[] = [];
    const epsilonAtStart = this.runner.getEpsilon();
    let lastStep: StepResult | null = null;
    let episodeNumber = -1;

    while (!this.runner.algorithmEnded) {
      const step = this.runner.runStep();
      if (!step) break;

      if (episodeNumber === -1) {
        episodeNumber = step.episodeNumber;
      }

      if (step.episodeNumber !== episodeNumber) {
        break;
      }

      steps.push(step);
      lastStep = step;
    }

    if (episodeNumber === -1 || !lastStep) return null;

    return {
      summary: {
        episodeNumber,
        totalReward: lastStep.episodeReward,
        cansCollected: lastStep.cansCollected,
        stepsUsed: steps.length,
        epsilonAtStart,
      },
      stepHistory: steps,
    };
  }

  private scheduleProduction(): void {
    if (this.produceTimerId !== null) return;
    if (!this.producing) return;

    this.produceTimerId = setTimeout(() => {
      this.produceTimerId = null;
      if (!this.producing) return;

      const wasEmpty = this.buffer.length === 0;

      for (let i = 0; i < this.batchSize; i++) {
        if (this.buffer.length >= this.maxSize) break;
        if (this.runner.algorithmEnded) {
          this.producing = false;
          break;
        }

        const entry = this.captureSteps
          ? this.computeEpisodeWithSteps()
          : (() => {
              const summary = this.runner.runEpisode();
              return summary ? { summary } : null;
            })();

        if (!entry) {
          this.producing = false;
          break;
        }

        this.buffer.push(entry);
      }

      if (wasEmpty && this.buffer.length > 0 && this.onBufferReady) {
        this.onBufferReady();
      }

      if (this.producing && this.buffer.length < this.maxSize) {
        this.scheduleProduction();
      }
    }, 0);
  }
}

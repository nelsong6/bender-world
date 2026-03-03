import { useState, useRef, useCallback, useEffect } from 'react';
import { AlgorithmRunner } from '../engine/algorithm-runner';
import { QMatrix } from '../engine/q-matrix';
import {
  AlgorithmConfig,
  StepResult,
  EpisodeSummary,
  MoveType,
} from '../engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardCellState {
  hasCan: boolean;
  hasBender: boolean;
  walls: MoveType[];
}

export interface BoardState {
  board: BoardCellState[][];
  benderPosition: [number, number];
  perceptionKey: string;
}

export interface UseAlgorithmReturn {
  running: boolean;
  speed: number;
  currentEpisode: number;
  currentStep: number;
  episodeReward: number;
  totalReward: number;
  cansCollected: number;
  epsilon: number;
  boardState: BoardState | null;
  stepResult: StepResult | null;
  episodeSummaries: EpisodeSummary[];
  algorithmEnded: boolean;
  algorithmConfig: AlgorithmConfig | null;
  qMatrix: QMatrix | null;
  currentPerceptionId: string;
  start: (config: AlgorithmConfig) => void;
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (ms: number) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAlgorithm(): UseAlgorithmReturn {
  const [running, setRunning] = useState(false);
  const [speed, setSpeedState] = useState(50);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [episodeReward, setEpisodeReward] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [cansCollected, setCansCollected] = useState(0);
  const [epsilon, setEpsilon] = useState(0);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [stepResult, setStepResult] = useState<StepResult | null>(null);
  const [episodeSummaries, setEpisodeSummaries] = useState<EpisodeSummary[]>([]);
  const [algorithmEnded, setAlgorithmEnded] = useState(false);
  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig | null>(null);
  const [qMatrix, setQMatrix] = useState<QMatrix | null>(null);
  const [currentPerceptionId, setCurrentPerceptionId] = useState('');

  const runnerRef = useRef<AlgorithmRunner | null>(null);
  const intervalRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  const runningRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Sync board state from the runner
  const syncState = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner) return;

    const state = runner.getCurrentState();
    setBoardState(state);
    setCurrentEpisode(runner.currentEpisode);
    setCurrentStep(runner.currentStep);
    setEpisodeReward(runner.episodeReward);
    setTotalReward(runner.totalReward);
    setCansCollected(runner.cansCollected);
    setEpsilon(runner.getEpsilon());
    setCurrentPerceptionId(state.perceptionKey);
    setQMatrix(runner.getQMatrix());
    setAlgorithmEnded(runner.algorithmEnded);
  }, []);

  // Run multiple steps per tick for speed=0 (instant) mode
  const executeBatch = useCallback(
    (batchSize: number) => {
      const runner = runnerRef.current;
      if (!runner || runner.algorithmEnded) {
        setRunning(false);
        setAlgorithmEnded(true);
        return;
      }

      let lastResult: StepResult | null = null;
      const newSummaries: EpisodeSummary[] = [];
      let prevEpisode = runner.currentEpisode;

      for (let i = 0; i < batchSize; i++) {
        if (runner.algorithmEnded) break;

        const result = runner.runStep();
        if (!result) break;

        // Detect episode boundary
        if (result.episodeNumber !== prevEpisode && prevEpisode > 0) {
          // Previous episode ended. Build a summary.
          // We approximate from the last step of the previous episode.
          // Since the runner already switched, we reconstruct from what we know.
          if (lastResult && lastResult.episodeNumber === prevEpisode) {
            newSummaries.push({
              episodeNumber: prevEpisode,
              totalReward: lastResult.episodeReward,
              cansCollected: lastResult.cansCollected,
              stepsUsed: lastResult.stepNumber,
              epsilonAtStart: runner.getEpsilon(), // approximate
            });
          }
        }

        prevEpisode = result.episodeNumber;
        lastResult = result;
      }

      if (newSummaries.length > 0) {
        setEpisodeSummaries((prev) => [...prev, ...newSummaries]);
      }

      if (lastResult) {
        setStepResult(lastResult);
      }

      syncState();
    },
    [syncState],
  );

  // Start/stop the interval loop
  const startLoop = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const currentSpeed = speedRef.current;

    if (currentSpeed === 0) {
      // Instant mode: run in batches using requestAnimationFrame
      const runBatch = () => {
        if (!runningRef.current) return;
        const runner = runnerRef.current;
        if (!runner || runner.algorithmEnded) {
          setRunning(false);
          setAlgorithmEnded(true);
          return;
        }
        // Run a large batch per frame
        executeBatch(500);

        if (runningRef.current && !runner.algorithmEnded) {
          intervalRef.current = requestAnimationFrame(runBatch) as unknown as number;
        }
      };
      intervalRef.current = requestAnimationFrame(runBatch) as unknown as number;
    } else {
      // Timed mode: use setInterval
      // Track episode boundaries across ticks
      let prevEpisode = runnerRef.current?.currentEpisode ?? 0;

      intervalRef.current = window.setInterval(() => {
        if (!runningRef.current) return;
        const runner = runnerRef.current;
        if (!runner || runner.algorithmEnded) {
          setRunning(false);
          setAlgorithmEnded(true);
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        const result = runner.runStep();
        if (!result) {
          setRunning(false);
          setAlgorithmEnded(true);
          syncState();
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Detect episode boundary
        if (result.episodeNumber !== prevEpisode && prevEpisode > 0) {
          setEpisodeSummaries((prev) => [
            ...prev,
            {
              episodeNumber: prevEpisode,
              totalReward: result.episodeReward,
              cansCollected: result.cansCollected,
              stepsUsed: result.stepNumber,
              epsilonAtStart: runner.getEpsilon(),
            },
          ]);
        }
        prevEpisode = result.episodeNumber;

        setStepResult(result);
        syncState();
      }, currentSpeed);
    }
  }, [executeBatch, syncState]);

  // Stop the loop
  const stopLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      // Could be either setInterval or requestAnimationFrame handle
      clearInterval(intervalRef.current);
      cancelAnimationFrame(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Public API
  const start = useCallback(
    (config: AlgorithmConfig) => {
      stopLoop();
      const runner = new AlgorithmRunner(config);
      runnerRef.current = runner;
      setAlgorithmConfig(config);
      setEpisodeSummaries([]);
      setStepResult(null);
      setAlgorithmEnded(false);
      setRunning(true);
      syncState();

      // Need to schedule the loop start for the next tick so running state is set
      setTimeout(() => {
        runningRef.current = true;
        startLoop();
      }, 0);
    },
    [stopLoop, startLoop, syncState],
  );

  const pause = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    stopLoop();
  }, [stopLoop]);

  const resume = useCallback(() => {
    if (!runnerRef.current || runnerRef.current.algorithmEnded) return;
    setRunning(true);
    runningRef.current = true;
    startLoop();
  }, [startLoop]);

  const step = useCallback(() => {
    if (!runnerRef.current) return;
    const runner = runnerRef.current;
    const prevEpisode = runner.currentEpisode;
    const result = runner.runStep();

    if (!result) {
      setAlgorithmEnded(true);
      syncState();
      return;
    }

    // Detect episode boundary
    if (result.episodeNumber !== prevEpisode && prevEpisode > 0) {
      setEpisodeSummaries((prev) => [
        ...prev,
        {
          episodeNumber: prevEpisode,
          totalReward: result.episodeReward,
          cansCollected: result.cansCollected,
          stepsUsed: result.stepNumber,
          epsilonAtStart: runner.getEpsilon(),
        },
      ]);
    }

    setStepResult(result);
    syncState();
  }, [syncState]);

  const reset = useCallback(() => {
    stopLoop();
    runnerRef.current = null;
    setRunning(false);
    runningRef.current = false;
    setCurrentEpisode(0);
    setCurrentStep(0);
    setEpisodeReward(0);
    setTotalReward(0);
    setCansCollected(0);
    setEpsilon(0);
    setBoardState(null);
    setStepResult(null);
    setEpisodeSummaries([]);
    setAlgorithmEnded(false);
    setAlgorithmConfig(null);
    setQMatrix(null);
    setCurrentPerceptionId('');
  }, [stopLoop]);

  const setSpeed = useCallback(
    (ms: number) => {
      setSpeedState(ms);
      speedRef.current = ms;
      // If currently running, restart the loop with the new speed
      if (runningRef.current) {
        stopLoop();
        setTimeout(() => {
          if (runningRef.current) {
            startLoop();
          }
        }, 0);
      }
    },
    [stopLoop, startLoop],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, [stopLoop]);

  return {
    running,
    speed,
    currentEpisode,
    currentStep,
    episodeReward,
    totalReward,
    cansCollected,
    epsilon,
    boardState,
    stepResult,
    episodeSummaries,
    algorithmEnded,
    algorithmConfig,
    qMatrix,
    currentPerceptionId,
    start,
    pause,
    resume,
    step,
    reset,
    setSpeed,
  };
}

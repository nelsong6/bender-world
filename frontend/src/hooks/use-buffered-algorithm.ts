import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  AlgorithmConfig,
  EpisodeSummary,
  MoveType,
} from '../engine/types';
import { QMatrix } from '../engine/q-matrix';
import { EpisodeBuffer, type EpisodeBufferEntry, type WalkthroughStep } from '../engine/episode-buffer';
import { AnimationClock } from '../engine/animation-clock';
import { type AlgorithmSnapshot } from '../engine/algorithm-runner';

interface HistorySnapshot {
  algorithmSnapshot: AlgorithmSnapshot;
  summariesLength: number;
}

const MAX_UNDO = 50;

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

export function useBufferedAlgorithm() {
  const bufferRef = useRef<EpisodeBuffer | null>(null);
  const clockRef = useRef<AnimationClock | null>(null);
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<EpisodeBufferEntry[]>([]);
  const allSummariesRef = useRef<EpisodeSummary[]>([]);
  const chartPlayheadRef = useRef(-1);
  const lookaheadSummaryRef = useRef<EpisodeSummary | null>(null);

  // React state
  const [running, setRunning] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [episodeReward, setEpisodeReward] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [cansCollected, setCansCollected] = useState(0);
  const [cansRemaining, setCansRemaining] = useState(0);
  const [epsilon, setEpsilon] = useState(0);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [episodeSummaries, setEpisodeSummaries] = useState<EpisodeSummary[]>([]);
  const [algorithmEnded, setAlgorithmEnded] = useState(false);
  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig | null>(null);
  const [qMatrix, setQMatrix] = useState<QMatrix | null>(null);
  const [currentPerceptionId, setCurrentPerceptionId] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [lastStepHistory, setLastStepHistory] = useState<WalkthroughStep[] | null>(null);

  // Sync UI state from buffer's runner
  const syncState = useCallback(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;
    const state = buffer.getRunnerState();
    setBoardState(state.boardState);
    setCurrentEpisode(state.currentEpisode);
    setCurrentStep(state.currentStep);
    setEpisodeReward(state.episodeReward);
    setTotalReward(state.totalReward);
    setCansCollected(state.cansCollected);
    setCansRemaining(state.cansRemaining);
    setEpsilon(state.epsilon);
    setCurrentPerceptionId(state.boardState.perceptionKey);
    setQMatrix(state.qMatrix);
    setAlgorithmEnded(state.algorithmEnded);
  }, []);

  // Push to undo stack
  const pushUndo = useCallback((snapshot: HistorySnapshot) => {
    const stack = undoStackRef.current;
    stack.push(snapshot);
    if (stack.length > MAX_UNDO) stack.shift();
    setCanGoBack(true);
  }, []);

  const updateCanGoBack = useCallback(() => {
    setCanGoBack(undoStackRef.current.length > 0);
  }, []);

  // Store step history from a consumed entry
  const captureEntrySteps = useCallback((entry: EpisodeBufferEntry) => {
    if (entry.stepHistory && entry.stepHistory.length > 0) {
      setLastStepHistory(entry.stepHistory);
    }
  }, []);

  // Toggle step capture mode on the buffer
  const setCaptureSteps = useCallback((enabled: boolean) => {
    const buffer = bufferRef.current;
    if (buffer) buffer.captureSteps = enabled;
  }, []);

  // Finish any in-progress sweep immediately
  const finishPendingSweep = useCallback(() => {
    const clock = clockRef.current;
    if (clock) clock.finishSweepImmediate();
  }, []);

  // ---- Actions ----

  const start = useCallback((config: AlgorithmConfig) => {
    if (clockRef.current) clockRef.current.reset();
    if (bufferRef.current) bufferRef.current.stopProducing();

    const buffer = new EpisodeBuffer(config);
    const clock = new AnimationClock();

    bufferRef.current = buffer;
    clockRef.current = clock;
    undoStackRef.current = [];
    redoStackRef.current = [];
    allSummariesRef.current = [];
    chartPlayheadRef.current = -1;
    lookaheadSummaryRef.current = null;

    setRunning(false);
    setEpisodeSummaries([]);
    setAlgorithmEnded(false);
    setAlgorithmConfig(config);
    setCanGoBack(false);
    syncState();
  }, [speed, syncState]);

  const resume = useCallback(() => {
    const buffer = bufferRef.current;
    const clock = clockRef.current;
    if (!buffer || !clock || buffer.ended) return;

    finishPendingSweep();

    // Prefill from redo stack
    const redo = redoStackRef.current;
    if (redo.length > 0) {
      buffer.prefill([...redo]);
      redoStackRef.current = [];
    }

    clock.onBoundary = () => {
      const entry = buffer.consume();
      if (!entry) return;

      captureEntrySteps(entry);
      allSummariesRef.current = [...allSummariesRef.current, entry.summary];
      pushUndo({
        algorithmSnapshot: buffer.getSnapshot(),
        summariesLength: allSummariesRef.current.length,
      });

      setEpisodeSummaries([...allSummariesRef.current]);
      syncState();

      if (buffer.ended) {
        clock.stop();
        buffer.stopProducing();
        setRunning(false);
        setAlgorithmEnded(true);
      }
    };

    clock.onTick = (playhead) => {
      chartPlayheadRef.current = playhead;
      clock.maxPlayhead = allSummariesRef.current.length + buffer.available;
      lookaheadSummaryRef.current = buffer.peek(0)?.summary ?? null;
    };

    buffer.setBatchSize(Math.max(1, Math.ceil(speed / 100)));
    buffer.startProducing();
    clock.maxPlayhead = allSummariesRef.current.length + buffer.available;
    clock.start();
    setRunning(true);
  }, [speed, syncState, pushUndo, finishPendingSweep]);

  const pause = useCallback(() => {
    finishPendingSweep();

    const clock = clockRef.current;
    const buffer = bufferRef.current;

    if (clock && clock.running) {
      clock.stopAtNextBoundary();
      if (buffer) buffer.stopProducing();
      setRunning(false);
      return;
    }

    if (clock) clock.stop();
    if (buffer) buffer.stopProducing();
    setRunning(false);
  }, [finishPendingSweep]);

  const stepOnce = useCallback(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;

    finishPendingSweep();

    if (clockRef.current?.running) {
      clockRef.current.stop();
      buffer.stopProducing();
      setRunning(false);
    }

    // Snapshot for undo
    pushUndo({
      algorithmSnapshot: buffer.getSnapshot(),
      summariesLength: allSummariesRef.current.length,
    });

    let entry: EpisodeBufferEntry | null;

    // Check redo first
    const redo = redoStackRef.current;
    if (redo.length > 0) {
      entry = redo.shift()!;
    } else {
      redoStackRef.current = [];
      entry = buffer.computeOne();
    }

    if (!entry) return;

    captureEntrySteps(entry);

    const clock = clockRef.current;
    const isFirstStep = allSummariesRef.current.length === 0;

    if (!isFirstStep && clock) {
      // Sweep animation for chart
      lookaheadSummaryRef.current = entry.summary;
      const fromPlayhead = chartPlayheadRef.current;
      const targetPlayhead = fromPlayhead + 1;

      syncState();

      clock.maxPlayhead = targetPlayhead;
      clock.onTick = (playhead) => { chartPlayheadRef.current = playhead; };
      clock.onBoundary = null;
      clock.onSweepComplete = () => {
        allSummariesRef.current = [...allSummariesRef.current, entry!.summary];
        setEpisodeSummaries([...allSummariesRef.current]);
        chartPlayheadRef.current = targetPlayhead;
        lookaheadSummaryRef.current = null;
        clock.setPlayhead(targetPlayhead);
        clock.onSweepComplete = null;
      };
      clock.startSweep(targetPlayhead, 300, 'ease-in-out');
    } else {
      allSummariesRef.current = [...allSummariesRef.current, entry.summary];
      setEpisodeSummaries([...allSummariesRef.current]);
      chartPlayheadRef.current = allSummariesRef.current.length - 1;
      lookaheadSummaryRef.current = null;
      if (clock) clock.setPlayhead(chartPlayheadRef.current);
      syncState();
    }

    updateCanGoBack();
  }, [pushUndo, syncState, updateCanGoBack, finishPendingSweep]);

  const stepN = useCallback((count: number) => {
    const buffer = bufferRef.current;
    const clock = clockRef.current;
    if (!buffer) return;

    finishPendingSweep();

    if (clock?.running) {
      clock.stop();
      buffer.stopProducing();
      setRunning(false);
    }

    pushUndo({
      algorithmSnapshot: buffer.getSnapshot(),
      summariesLength: allSummariesRef.current.length,
    });

    redoStackRef.current = [];
    buffer.clearBuffer();

    const summaries = buffer.computeImmediate(count);
    if (summaries.length === 0) return;

    allSummariesRef.current = [...allSummariesRef.current, ...summaries];
    setEpisodeSummaries([...allSummariesRef.current]);
    syncState();

    const targetPlayhead = allSummariesRef.current.length - 1;

    if (clock) {
      clock.maxPlayhead = targetPlayhead;
      clock.onTick = (playhead) => { chartPlayheadRef.current = playhead; };
      clock.onBoundary = null;
      clock.onSweepComplete = () => {
        chartPlayheadRef.current = targetPlayhead;
        clock.onSweepComplete = null;
      };
      clock.startSweep(targetPlayhead, Math.min(800, Math.max(400, count * 6)));
    } else {
      chartPlayheadRef.current = targetPlayhead;
    }

    updateCanGoBack();
  }, [pushUndo, syncState, updateCanGoBack, finishPendingSweep]);

  const goBack = useCallback(() => {
    finishPendingSweep();

    const undoStack = undoStackRef.current;
    if (undoStack.length === 0) return;

    const buffer = bufferRef.current;
    if (!buffer) return;

    // Save current state to redo
    const currentEntry = allSummariesRef.current.length > 0
      ? { summary: allSummariesRef.current[allSummariesRef.current.length - 1] }
      : null;
    if (currentEntry) {
      redoStackRef.current.unshift(currentEntry);
    }

    const prev = undoStack.pop()!;

    // Restore algorithm state
    buffer.restoreSnapshot(prev.algorithmSnapshot);

    // Trim summaries
    allSummariesRef.current = allSummariesRef.current.slice(0, prev.summariesLength);
    setEpisodeSummaries([...allSummariesRef.current]);

    // Snap playhead
    const newPlayhead = Math.max(0, prev.summariesLength - 1);
    chartPlayheadRef.current = newPlayhead;
    lookaheadSummaryRef.current = null;
    if (clockRef.current) clockRef.current.setPlayhead(newPlayhead);

    buffer.trimConsumedTo(prev.summariesLength);
    buffer.clearBuffer();

    syncState();
    updateCanGoBack();
  }, [syncState, updateCanGoBack, finishPendingSweep]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    if (bufferRef.current) bufferRef.current.setBatchSize(Math.ceil(newSpeed / 100));
  }, []);

  const setClockSpeed = useCallback((uiSpeed: number) => {
    if (clockRef.current) clockRef.current.setSpeed(uiSpeed);
  }, []);

  const reset = useCallback(() => {
    if (clockRef.current) clockRef.current.reset();
    if (bufferRef.current) bufferRef.current.stopProducing();

    bufferRef.current = null;
    clockRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    allSummariesRef.current = [];
    chartPlayheadRef.current = -1;
    lookaheadSummaryRef.current = null;

    setRunning(false);
    setSpeedState(1);
    setCurrentEpisode(0);
    setCurrentStep(0);
    setEpisodeReward(0);
    setTotalReward(0);
    setCansCollected(0);
    setCansRemaining(0);
    setEpsilon(0);
    setBoardState(null);
    setEpisodeSummaries([]);
    setAlgorithmEnded(false);
    setAlgorithmConfig(null);
    setQMatrix(null);
    setCurrentPerceptionId('');
    setCanGoBack(false);
    setLastStepHistory(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clockRef.current) clockRef.current.reset();
      if (bufferRef.current) bufferRef.current.stopProducing();
    };
  }, []);

  return {
    running,
    speed,
    setSpeed: handleSpeedChange,
    setClockSpeed,
    currentEpisode,
    currentStep,
    episodeReward,
    totalReward,
    cansCollected,
    cansRemaining,
    epsilon,
    boardState,
    episodeSummaries,
    algorithmEnded,
    algorithmConfig,
    qMatrix,
    currentPerceptionId,
    start,
    resume,
    pause,
    step: stepOnce,
    stepN,
    goBack,
    canGoBack,
    reset,
    chartPlayheadRef,
    allSummariesRef,
    lookaheadSummaryRef,
    lastStepHistory,
    setCaptureSteps,
  };
}

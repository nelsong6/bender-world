import { useState, useRef, useCallback, useEffect } from 'react';
import { api, RunSummary, RunDetail, Preset } from '../api/client';
import type { EpisodeSummary, AlgorithmConfig } from '../engine/types';
import type { QMatrix } from '../engine/q-matrix';
import type { AuthUser } from './use-auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseApiReturn {
  presets: Preset[];
  runs: RunSummary[];
  currentRunId: string | null;
  loading: boolean;
  error: string | null;
  createRun: (config: AlgorithmConfig) => Promise<string | null>;
  syncEpisodes: (runId: string, episodes: EpisodeSummary[]) => void;
  syncQMatrix: (runId: string, qMatrix: QMatrix, status?: string) => void;
  loadRun: (runId: string) => Promise<RunDetail | null>;
  listRuns: () => Promise<void>;
  deleteRun: (runId: string) => Promise<void>;
  loadPresets: () => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_FLUSH_INTERVAL = 5000; // 5 seconds
const BATCH_SIZE_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useApi(user: AuthUser | null): UseApiReturn {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Episode buffering for batch sync
  const episodeBufferRef = useRef<Map<string, EpisodeSummary[]>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Flush buffered episodes to the API
  const flushEpisodes = useCallback(async () => {
    const buffer = episodeBufferRef.current;
    if (buffer.size === 0) return;

    // Take a snapshot and clear
    const snapshot = new Map(buffer);
    buffer.clear();

    for (const [runId, episodes] of snapshot.entries()) {
      if (episodes.length === 0) continue;
      try {
        const apiEpisodes = episodes.map((ep) => ({
          episodeNumber: ep.episodeNumber,
          totalReward: ep.totalReward,
          cansCollected: ep.cansCollected,
          stepsUsed: ep.stepsUsed,
          epsilonAtStart: ep.epsilonAtStart,
        }));

        const lastEp = episodes[episodes.length - 1];
        await api.appendEpisodes(runId, apiEpisodes, {
          totalEpisodes: lastEp.episodeNumber,
          finalAvgReward: lastEp.totalReward,
        });
      } catch (err) {
        console.error('Failed to sync episodes:', err);
        // Re-add to buffer for retry
        const existing = episodeBufferRef.current.get(runId) || [];
        episodeBufferRef.current.set(runId, [...episodes, ...existing]);
      }
    }
  }, []);

  // Set up periodic flush timer
  useEffect(() => {
    if (!user) return;

    flushTimerRef.current = window.setInterval(() => {
      flushEpisodes();
    }, BATCH_FLUSH_INTERVAL);

    return () => {
      if (flushTimerRef.current !== null) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Flush remaining on cleanup
      flushEpisodes();
    };
  }, [user, flushEpisodes]);

  // Load presets
  const loadPresets = useCallback(async () => {
    try {
      const result = await api.getPresets();
      setPresets(result);
    } catch (err) {
      console.error('Failed to load presets:', err);
      // Fall back to hardcoded presets
      setPresets([
        {
          id: 'default',
          name: 'Default',
          description: 'Standard Q-Learning parameters',
          config: { epsilon: 0.2, gamma: 0.9, eta: 0.1, episodeLimit: 5000, stepLimit: 200 },
        },
        {
          id: 'fast-learner',
          name: 'Fast Learner',
          description: 'Higher learning rate, more exploration',
          config: { epsilon: 0.3, gamma: 0.9, eta: 0.3, episodeLimit: 3000, stepLimit: 200 },
        },
        {
          id: 'cautious',
          name: 'Cautious',
          description: 'Low exploration, high discount factor',
          config: { epsilon: 0.1, gamma: 0.95, eta: 0.05, episodeLimit: 10000, stepLimit: 200 },
        },
        {
          id: 'explorer',
          name: 'Explorer',
          description: 'High exploration rate',
          config: { epsilon: 0.5, gamma: 0.8, eta: 0.2, episodeLimit: 5000, stepLimit: 300 },
        },
      ]);
    }
  }, []);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Create a new run
  const createRun = useCallback(
    async (config: AlgorithmConfig): Promise<string | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);
      try {
        const run = await api.createRun(config);
        setCurrentRunId(run.id);
        setLoading(false);
        return run.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create run';
        setError(msg);
        setLoading(false);
        return null;
      }
    },
    [user],
  );

  // Buffer episodes for batch sync
  const syncEpisodes = useCallback(
    (runId: string, episodes: EpisodeSummary[]) => {
      if (!user || !runId || episodes.length === 0) return;

      const existing = episodeBufferRef.current.get(runId) || [];
      const combined = [...existing, ...episodes];
      episodeBufferRef.current.set(runId, combined);

      // Flush if threshold reached
      if (combined.length >= BATCH_SIZE_THRESHOLD) {
        flushEpisodes();
      }
    },
    [user, flushEpisodes],
  );

  // Sync Q-matrix to API
  const syncQMatrix = useCallback(
    async (runId: string, qMatrixInstance: QMatrix, status?: string) => {
      if (!user || !runId) return;
      try {
        await api.updateQMatrix(
          runId,
          {
            data: qMatrixInstance.toJSON(),
            snapshotEpisode: 0,
          },
          status,
        );
      } catch (err) {
        console.error('Failed to sync Q-matrix:', err);
      }
    },
    [user],
  );

  // Load a specific run
  const loadRun = useCallback(
    async (runId: string): Promise<RunDetail | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);
      try {
        const run = await api.getRun(runId);
        setCurrentRunId(run.id);
        setLoading(false);
        return run;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load run';
        setError(msg);
        setLoading(false);
        return null;
      }
    },
    [user],
  );

  // List all runs
  const listRuns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.listRuns();
      setRuns(result);
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list runs';
      setError(msg);
      setLoading(false);
    }
  }, [user]);

  // Delete a run
  const deleteRun = useCallback(
    async (runId: string) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        await api.deleteRun(runId);
        setRuns((prev) => prev.filter((r) => r.id !== runId));
        if (currentRunId === runId) {
          setCurrentRunId(null);
        }
        setLoading(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete run';
        setError(msg);
        setLoading(false);
      }
    },
    [user, currentRunId],
  );

  // Refresh runs list when user changes
  useEffect(() => {
    if (user) {
      listRuns();
    } else {
      setRuns([]);
      setCurrentRunId(null);
    }
  }, [user, listRuns]);

  return {
    presets,
    runs,
    currentRunId,
    loading,
    error,
    createRun,
    syncEpisodes,
    syncQMatrix,
    loadRun,
    listRuns,
    deleteRun,
    loadPresets,
    clearError,
  };
}

import React, { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './hooks/use-auth';
import { useAlgorithm } from './hooks/use-algorithm';
import { useApi } from './hooks/use-api';
import { Board } from './components/Board';
import { ConfigPanel } from './components/ConfigPanel';
import { Controls } from './components/Controls';
import { StatusBar } from './components/StatusBar';
import { QMatrixInspector } from './components/QMatrixInspector';
import { EpisodeChart } from './components/EpisodeChart';
import { GoogleSignIn } from './components/GoogleSignIn';
import { RunHistory } from './components/RunHistory';
import type { AlgorithmConfig } from './engine/types';

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  const auth = useAuth();
  const algorithm = useAlgorithm();
  const apiHook = useApi(auth.user);

  // Track the last synced episode count to know which episodes to send
  const lastSyncedEpisodeRef = useRef(0);
  const activeRunIdRef = useRef<string | null>(null);

  // Handle start: create an API run (if authenticated), then start the algorithm
  const handleStart = useCallback(
    async (config: AlgorithmConfig) => {
      lastSyncedEpisodeRef.current = 0;
      activeRunIdRef.current = null;

      // If authenticated, create a run on the server
      if (auth.user) {
        const runId = await apiHook.createRun(config);
        if (runId) {
          activeRunIdRef.current = runId;
        }
      }

      algorithm.start(config);
    },
    [auth.user, apiHook, algorithm],
  );

  // Sync episodes to API periodically
  useEffect(() => {
    if (!auth.user || !activeRunIdRef.current) return;
    if (algorithm.episodeSummaries.length <= lastSyncedEpisodeRef.current) return;

    const newEpisodes = algorithm.episodeSummaries.slice(
      lastSyncedEpisodeRef.current,
    );
    if (newEpisodes.length > 0) {
      apiHook.syncEpisodes(activeRunIdRef.current, newEpisodes);
      lastSyncedEpisodeRef.current = algorithm.episodeSummaries.length;
    }
  }, [auth.user, algorithm.episodeSummaries, apiHook]);

  // Sync Q-matrix when algorithm ends
  useEffect(() => {
    if (
      algorithm.algorithmEnded &&
      auth.user &&
      activeRunIdRef.current &&
      algorithm.qMatrix
    ) {
      apiHook.syncQMatrix(activeRunIdRef.current, algorithm.qMatrix, 'completed');
    }
  }, [algorithm.algorithmEnded, auth.user, algorithm.qMatrix, apiHook]);

  // Handle loading a saved run
  const handleLoadRun = useCallback(
    async (runId: string) => {
      const run = await apiHook.loadRun(runId);
      if (!run) return;

      // Reset the algorithm and apply the loaded config
      algorithm.reset();
      // Start with the loaded config
      algorithm.start(run.config);
    },
    [apiHook, algorithm],
  );

  // Handle reset
  const handleReset = useCallback(() => {
    algorithm.reset();
    lastSyncedEpisodeRef.current = 0;
    activeRunIdRef.current = null;
  }, [algorithm]);

  const hasStarted = algorithm.boardState !== null;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>BenderWorld: Reinforcement Learning</h1>
          <p style={styles.subtitle}>
            Bender learns to collect beer cans using Q-Learning
          </p>
        </div>
        <div style={styles.headerRight}>
          <GoogleSignIn
            user={auth.user}
            onSignIn={auth.signIn}
            onSignOut={auth.signOut}
            renderGoogleButton={auth.renderGoogleButton}
          />
        </div>
      </header>

      {/* Error banner */}
      {apiHook.error && (
        <div style={styles.errorBanner}>
          <span>{apiHook.error}</span>
          <button onClick={apiHook.clearError} style={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main content: two columns */}
      <div style={styles.main}>
        {/* Left column: Board, Controls, StatusBar */}
        <div style={styles.leftColumn}>
          <Board boardState={algorithm.boardState} />

          <div style={styles.leftPanels}>
            <Controls
              isRunning={algorithm.running}
              onPlay={algorithm.resume}
              onPause={algorithm.pause}
              onStep={algorithm.step}
              onReset={handleReset}
              speed={algorithm.speed}
              onSpeedChange={algorithm.setSpeed}
              hasStarted={hasStarted}
              algorithmEnded={algorithm.algorithmEnded}
            />

            <StatusBar
              currentEpisode={algorithm.currentEpisode}
              currentStep={algorithm.currentStep}
              episodeReward={algorithm.episodeReward}
              totalReward={algorithm.totalReward}
              cansCollected={algorithm.cansCollected}
              epsilon={algorithm.epsilon}
              algorithmConfig={algorithm.algorithmConfig}
            />
          </div>
        </div>

        {/* Right column: Config, Q-Matrix, Chart, RunHistory */}
        <div style={styles.rightColumn}>
          <ConfigPanel
            onStart={handleStart}
            isRunning={algorithm.running}
            isAuthenticated={!!auth.user}
            presets={apiHook.presets}
          />

          <QMatrixInspector
            qMatrix={algorithm.qMatrix}
            currentPerceptionId={algorithm.currentPerceptionId}
          />

          <EpisodeChart episodeSummaries={algorithm.episodeSummaries} />

          <RunHistory
            runs={apiHook.runs}
            onLoadRun={handleLoadRun}
            onDeleteRun={apiHook.deleteRun}
            isAuthenticated={!!auth.user}
            loading={apiHook.loading}
          />
        </div>
      </div>
    </div>
  );
};

export default App;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0d0d1a',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', 'Roboto', monospace",
    padding: 0,
    margin: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#12122a',
    borderBottom: '1px solid #2a2a4a',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
    backgroundColor: '#3e1a1a',
    color: '#f44336',
    fontFamily: 'monospace',
    fontSize: 13,
    borderBottom: '1px solid #5a2020',
  },
  errorDismiss: {
    padding: '2px 10px',
    backgroundColor: 'transparent',
    color: '#f44336',
    border: '1px solid #f44336',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  main: {
    display: 'flex',
    gap: 20,
    padding: '20px 24px',
    maxWidth: 1400,
    margin: '0 auto',
    flexWrap: 'wrap' as const,
  },
  leftColumn: {
    flex: '1 1 500px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minWidth: 320,
  },
  leftPanels: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  rightColumn: {
    flex: '0 1 380px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minWidth: 300,
  },
};

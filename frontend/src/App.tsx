import React, { useCallback, useEffect, useState } from 'react';
import { useBufferedAlgorithm } from './hooks/use-buffered-algorithm';
import { Board } from './components/Board';
import { ConfigPanel } from './components/ConfigPanel';
import { Controls } from './components/Controls';
import { StatusBar } from './components/StatusBar';
import { QMatrixInspector } from './components/QMatrixInspector';
import { EpisodeChart } from './components/EpisodeChart';
import { SettingsSummary } from './components/SettingsSummary';
import { PerceptionDisplay } from './components/PerceptionDisplay';
import { TabBar, type TabId } from './components/TabBar';
import { StepWalkthrough } from './components/StepWalkthrough';
import { colors } from './colors';
import type { AlgorithmConfig } from './engine/types';

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  const algorithm = useBufferedAlgorithm();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stepIndex, setStepIndex] = useState(0);

  const handleStart = useCallback(
    (config: AlgorithmConfig) => {
      algorithm.start(config);
    },
    [algorithm],
  );

  const handleReset = useCallback(() => {
    algorithm.reset();
    setStepIndex(0);
  }, [algorithm]);

  const hasStarted = algorithm.boardState !== null;

  // Toggle step capture when walkthrough tab is active
  useEffect(() => {
    algorithm.setCaptureSteps(activeTab === 'walkthrough');
  }, [activeTab, algorithm.setCaptureSteps]);

  // Reset step index when new step history arrives
  useEffect(() => {
    setStepIndex(0);
  }, [algorithm.lastStepHistory]);

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
      </header>

      {/* Main content: two columns */}
      <div style={styles.main}>
        {/* Left column: Board + Controls */}
        <div style={styles.leftColumn}>
          <Board boardState={algorithm.boardState} />

          <Controls
            isRunning={algorithm.running}
            onPlay={algorithm.resume}
            onPause={algorithm.pause}
            onStep={algorithm.step}
            onStepN={algorithm.stepN}
            onBack={algorithm.goBack}
            onReset={handleReset}
            speed={algorithm.speed}
            onSpeedChange={algorithm.setSpeed}
            hasStarted={hasStarted}
            algorithmEnded={algorithm.algorithmEnded}
            canGoBack={algorithm.canGoBack}
          />

          <StatusBar
            currentEpisode={algorithm.currentEpisode}
            currentStep={algorithm.currentStep}
            episodeReward={algorithm.episodeReward}
            totalReward={algorithm.totalReward}
            cansCollected={algorithm.cansCollected}
            cansRemaining={algorithm.cansRemaining}
            epsilon={algorithm.epsilon}
            algorithmConfig={algorithm.algorithmConfig}
          />
        </div>

        {/* Right column: Tabs */}
        <div style={styles.rightColumn}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              <ConfigPanel
                onStart={handleStart}
                isRunning={algorithm.running}
              />
              <SettingsSummary algorithmConfig={algorithm.algorithmConfig} />
              <EpisodeChart
                summariesRef={algorithm.allSummariesRef}
                playheadRef={algorithm.chartPlayheadRef}
                lookaheadRef={algorithm.lookaheadSummaryRef}
              />
            </>
          )}

          {/* Inspect tab */}
          {activeTab === 'inspect' && (
            <>
              <PerceptionDisplay
                perceptionKey={algorithm.currentPerceptionId}
                benderPosition={algorithm.boardState?.benderPosition ?? null}
              />
              <QMatrixInspector
                qMatrix={algorithm.qMatrix}
                currentPerceptionId={algorithm.currentPerceptionId}
              />
            </>
          )}

          {/* Walkthrough tab */}
          {activeTab === 'walkthrough' && (
            <StepWalkthrough
              stepHistory={null}
              currentStepIndex={stepIndex}
              onStepIndexChange={setStepIndex}
            />
          )}
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
    backgroundColor: colors.bg.base,
    color: colors.text.primary,
    fontFamily: "'Segoe UI', 'Roboto', monospace",
    padding: 0,
    margin: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: colors.bg.raised,
    borderBottom: `1px solid ${colors.border.subtle}`,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 12,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
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
  rightColumn: {
    flex: '0 1 420px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minWidth: 320,
  },
};

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
import { HelpBar } from './components/HelpBar';
import { HelpGlossary, HELP_SECTIONS, type HelpSectionId } from './components/HelpGlossary';
import { GettingStartedTab } from './components/GettingStartedTab';
import { colors } from './colors';
import { DEFAULT_CONFIG, type AlgorithmConfig } from './engine/types';

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  const algorithm = useBufferedAlgorithm();
  const [activeTab, setActiveTab] = useState<TabId>('getting-started');
  const [stepIndex, setStepIndex] = useState(0);
  const [helpSection, setHelpSection] = useState<HelpSectionId>('problem');

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

  // Toggle step capture when granular tab is active
  useEffect(() => {
    algorithm.setCaptureSteps(activeTab === 'granular');
  }, [activeTab, algorithm.setCaptureSteps]);

  // Reset step index when new step history arrives
  useEffect(() => {
    setStepIndex(0);
  }, [algorithm.lastStepHistory]);

  // --- Navigation callbacks ---

  const handleOpenGlossary = useCallback((_termId?: string) => {
    setActiveTab('glossary');
  }, []);

  const handleStartGranular = useCallback(() => {
    if (!hasStarted) {
      algorithm.start(DEFAULT_CONFIG);
    }
    setActiveTab('granular');
  }, [hasStarted, algorithm]);

  const handleStartFull = useCallback(() => {
    if (!hasStarted) {
      algorithm.start(DEFAULT_CONFIG);
    }
    setActiveTab('full');
  }, [hasStarted, algorithm]);

  return (
    <div style={styles.app}>
      {/* ═══════════════════════════════════════════════ */}
      {/* STICKY TOP SECTION                             */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={styles.stickyTop}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>BenderWorld: Reinforcement Learning</h1>
            <p style={styles.subtitle}>
              Bender learns to collect beer cans using Q-Learning
            </p>
          </div>
        </header>

        <HelpBar onOpenGlossary={handleOpenGlossary} />

        {hasStarted && (
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
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={styles.main}>
        {/* Left sidebar: vertical tabs */}
        <div style={styles.leftSidebar}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Secondary tab strip for glossary sections */}
        {activeTab === 'glossary' && (
          <div style={styles.opTabStrip}>
            {HELP_SECTIONS.map((sec, index) => {
              const isActive = helpSection === sec.id;
              return (
                <div
                  key={sec.id}
                  style={{
                    ...styles.opTabWrapper,
                    ...(isActive ? styles.opTabWrapperActive : {}),
                    ...(isActive && index === 0 ? { borderTop: 'none' } : {}),
                  }}
                >
                  <button
                    onClick={() => setHelpSection(sec.id)}
                    data-help={sec.helpText}
                    style={{
                      ...styles.opTab,
                      color: isActive ? colors.text.primary : colors.text.tertiary,
                      fontWeight: isActive ? 'bold' : 'normal',
                    }}
                  >
                    {sec.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab content area */}
        <div style={styles.tabContent}>
          {/* Getting Started */}
          {activeTab === 'getting-started' && (
            <GettingStartedTab
              onStartGranular={handleStartGranular}
              onStartFull={handleStartFull}
              onOpenGlossary={() => handleOpenGlossary()}
            />
          )}

          {/* Config */}
          {activeTab === 'config' && (
            <>
              <ConfigPanel
                onStart={handleStart}
                isRunning={algorithm.running}
              />
              <SettingsSummary algorithmConfig={algorithm.algorithmConfig} />
            </>
          )}

          {/* Full Step */}
          {activeTab === 'full' && (
            <div style={styles.fullLayout}>
              <div style={styles.fullLeftCol}>
                <Board boardState={algorithm.boardState} />
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
              <div style={styles.fullRightCol}>
                <EpisodeChart
                  summariesRef={algorithm.allSummariesRef}
                  playheadRef={algorithm.chartPlayheadRef}
                  lookaheadRef={algorithm.lookaheadSummaryRef}
                />
              </div>
            </div>
          )}

          {/* Granular Step */}
          {activeTab === 'granular' && (
            <div style={styles.granularLayout}>
              <div style={styles.granularLeftCol}>
                <Board boardState={algorithm.boardState} />
              </div>
              <div style={styles.granularRightCol}>
                <StepWalkthrough
                  stepHistory={algorithm.lastStepHistory}
                  currentStepIndex={stepIndex}
                  onStepIndexChange={setStepIndex}
                  onNextEpisode={algorithm.step}
                  onPrevEpisode={algorithm.goBack}
                  canGoBack={algorithm.canGoBack}
                  algorithmEnded={algorithm.algorithmEnded}
                />
                <PerceptionDisplay
                  perceptionKey={algorithm.currentPerceptionId}
                  benderPosition={algorithm.boardState?.benderPosition ?? null}
                />
                <QMatrixInspector
                  qMatrix={algorithm.qMatrix}
                  currentPerceptionId={algorithm.currentPerceptionId}
                />
              </div>
            </div>
          )}

          {/* Help / Glossary */}
          {activeTab === 'glossary' && (
            <HelpGlossary section={helpSection} />
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
    height: '100vh',
    backgroundColor: colors.bg.base,
    color: colors.text.primary,
    fontFamily: "'Segoe UI', 'Roboto', monospace",
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  stickyTop: {
    flexShrink: 0,
    zIndex: 160,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: 11,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
  },
  main: {
    display: 'flex',
    flexDirection: 'row' as const,
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  leftSidebar: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: colors.bg.raised,
    borderRight: `1px solid ${colors.border.subtle}`,
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: '12px 24px',
    maxWidth: 1800,
    boxSizing: 'border-box' as const,
    overflowY: 'auto' as const,
  },

  // --- Secondary tab strip (glossary sections) ---
  opTabStrip: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: colors.bg.raised,
    borderRight: `1px solid ${colors.border.subtle}`,
    flexShrink: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  opTabWrapper: {
    padding: '1px 0 1px 1px',
    position: 'relative' as const,
    marginBottom: -1,
    zIndex: 0,
  },
  opTabWrapperActive: {
    padding: 0,
    borderLeft: `1px solid ${colors.border.subtle}`,
    borderTop: `1px solid ${colors.border.subtle}`,
    borderBottom: `1px solid ${colors.border.subtle}`,
    borderRight: 'none',
    backgroundColor: colors.bg.raised,
    marginRight: -1,
    zIndex: 1,
  },
  opTab: {
    padding: '10px 16px',
    fontSize: 12,
    fontFamily: 'monospace',
    background: 'none',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    outline: 'none',
    border: 'none',
    width: '100%',
    display: 'block' as const,
    whiteSpace: 'nowrap' as const,
    letterSpacing: 0.3,
    textAlign: 'left' as const,
    cursor: 'pointer',
  },

  // --- Full Step tab layout ---
  fullLayout: {
    display: 'flex',
    gap: 16,
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
  },
  fullLeftCol: {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minWidth: 0,
    minHeight: 0,
  },
  fullRightCol: {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    minWidth: 0,
    minHeight: 0,
  },

  // --- Granular Step tab layout ---
  granularLayout: {
    display: 'flex',
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  granularLeftCol: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  granularRightCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    overflowY: 'auto' as const,
  },
};

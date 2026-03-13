import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBufferedAlgorithm } from './hooks/use-buffered-algorithm';
import { Board } from './components/Board';
import { ConfigPanel } from './components/ConfigPanel';
import { Controls } from './components/Controls';
import { StatusBar } from './components/StatusBar';
import { QMatrixInspector } from './components/QMatrixInspector';
import { EpisodeChart } from './components/EpisodeChart';
import { SettingsSummary } from './components/SettingsSummary';
import { TabBar, type TabId } from './components/TabBar';
import { HelpBar } from './components/HelpBar';
import { HelpGlossary, HELP_SECTIONS, type HelpSectionId } from './components/HelpGlossary';
import { GettingStartedTab } from './components/GettingStartedTab';
import { PhaseBar } from './components/PhaseBar';
import { PerceivePanel } from './components/PerceivePanel';
import { DecidePanel } from './components/DecidePanel';
import { ActPanel } from './components/ActPanel';
import { RewardPanel } from './components/RewardPanel';
import { LearnPanel } from './components/LearnPanel';
import { colors } from './colors';
import { DEFAULT_CONFIG, type AlgorithmConfig } from './engine/types';
import { QMatrix } from './engine/q-matrix';
import { PHASE_COUNT } from './engine/phase-data';

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  const algorithm = useBufferedAlgorithm();
  const [activeTab, setActiveTab] = useState<TabId>('getting-started');
  const [stepIndex, setStepIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [helpSection, setHelpSection] = useState<HelpSectionId>('problem');
  const [microPlaying, setMicroPlaying] = useState(false);
  const microIntervalRef = useRef<number | null>(null);

  const handleStart = useCallback(
    (config: AlgorithmConfig) => {
      algorithm.start(config);
    },
    [algorithm],
  );

  const handleReset = useCallback(() => {
    setMicroPlaying(false);
    algorithm.reset();
    setStepIndex(0);
    setPhaseIndex(0);
  }, [algorithm]);

  const hasStarted = algorithm.boardState !== null;

  // Toggle step capture when granular tab is active
  useEffect(() => {
    algorithm.setCaptureSteps(activeTab === 'granular');
  }, [activeTab, algorithm.setCaptureSteps]);

  // Reset step and phase index when new step history arrives
  useEffect(() => {
    setStepIndex(0);
    setPhaseIndex(0);
  }, [algorithm.lastStepHistory]);

  // Pre-start keyboard shortcut: → auto-starts and steps into granular mode
  useEffect(() => {
    if (hasStarted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        algorithm.start(DEFAULT_CONFIG);
        algorithm.setCaptureSteps(true);
        setActiveTab('granular');
        algorithm.step();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, algorithm]);

  // Stop micro play when leaving granular tab
  useEffect(() => {
    if (activeTab !== 'granular') {
      setMicroPlaying(false);
    }
  }, [activeTab]);

  // --- Granular (phase-level) callbacks ---

  const handleGranularStep = useCallback(() => {
    const history = algorithm.lastStepHistory;
    if (!history || history.length === 0) {
      // No episode yet — compute first one
      algorithm.step();
      return;
    }

    const maxStepIndex = history.length - 1;

    if (phaseIndex < PHASE_COUNT - 1) {
      // Advance to next phase within the same step
      setPhaseIndex(prev => prev + 1);
    } else {
      // At last phase — advance to next step, phase 0
      if (stepIndex < maxStepIndex) {
        setStepIndex(prev => prev + 1);
        setPhaseIndex(0);
      } else {
        // At last step of episode — advance to next episode
        if (!algorithm.algorithmEnded) {
          algorithm.step();
          // stepIndex and phaseIndex reset via the useEffect on lastStepHistory
        }
      }
    }
  }, [algorithm, stepIndex, phaseIndex]);

  const handleGranularStepN = useCallback((count: number) => {
    const history = algorithm.lastStepHistory;
    if (!history || history.length === 0) {
      algorithm.step();
      return;
    }

    const maxStepIndex = history.length - 1;
    // Calculate total phase position and advance
    let totalPhasePos = stepIndex * PHASE_COUNT + phaseIndex + count;
    const maxPhasePos = maxStepIndex * PHASE_COUNT + (PHASE_COUNT - 1);
    totalPhasePos = Math.min(totalPhasePos, maxPhasePos);

    const newStepIndex = Math.floor(totalPhasePos / PHASE_COUNT);
    const newPhaseIndex = totalPhasePos % PHASE_COUNT;
    setStepIndex(newStepIndex);
    setPhaseIndex(newPhaseIndex);
  }, [algorithm, stepIndex, phaseIndex]);

  const handleGranularBack = useCallback(() => {
    if (phaseIndex > 0) {
      // Go back one phase
      setPhaseIndex(prev => prev - 1);
    } else if (stepIndex > 0) {
      // Go to last phase of previous step
      setStepIndex(prev => prev - 1);
      setPhaseIndex(PHASE_COUNT - 1);
    } else {
      // At step 0, phase 0 — undo episode
      algorithm.goBack();
    }
  }, [stepIndex, phaseIndex, algorithm]);

  const handleGranularPlay = useCallback(() => {
    setMicroPlaying(true);
  }, []);

  const handleGranularPause = useCallback(() => {
    setMicroPlaying(false);
  }, []);

  // Ref to avoid stale closure in interval
  const granularStepRef = useRef(handleGranularStep);
  granularStepRef.current = handleGranularStep;

  // Micro auto-play interval (drives phase-level advancement)
  useEffect(() => {
    if (microIntervalRef.current != null) {
      clearInterval(microIntervalRef.current);
      microIntervalRef.current = null;
    }
    if (!microPlaying || algorithm.algorithmEnded) {
      if (algorithm.algorithmEnded) setMicroPlaying(false);
      return;
    }
    const delay = Math.max(1, 501 - algorithm.speed);
    microIntervalRef.current = window.setInterval(() => {
      granularStepRef.current();
    }, delay);
    return () => {
      if (microIntervalRef.current != null) {
        clearInterval(microIntervalRef.current);
        microIntervalRef.current = null;
      }
    };
  }, [microPlaying, algorithm.speed, algorithm.algorithmEnded]);

  // Reconstruct per-step QMatrix for granular tab
  const granularQMatrix = useMemo(() => {
    const activeStep = algorithm.lastStepHistory?.[stepIndex] ?? null;
    if (!activeStep) return algorithm.qMatrix;
    const qm = new QMatrix();
    qm.restore(activeStep.qMatrixSnapshot);
    return qm;
  }, [algorithm.lastStepHistory, stepIndex, algorithm.qMatrix]);

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
          <img src="/sprites/fry-squinting.png" alt="" style={styles.headerFry} />
        </header>

        <HelpBar onOpenGlossary={handleOpenGlossary} />

        {hasStarted && (() => {
          const isGranular = activeTab === 'granular';
          return (
            <Controls
              isRunning={isGranular ? microPlaying : algorithm.running}
              onPlay={isGranular ? handleGranularPlay : algorithm.resume}
              onPause={isGranular ? handleGranularPause : algorithm.pause}
              onStep={isGranular ? handleGranularStep : algorithm.step}
              onStepN={isGranular ? handleGranularStepN : algorithm.stepN}
              onBack={isGranular ? handleGranularBack : algorithm.goBack}
              onReset={handleReset}
              speed={algorithm.speed}
              onSpeedChange={algorithm.setSpeed}
              hasStarted={hasStarted}
              algorithmEnded={algorithm.algorithmEnded}
              canGoBack={isGranular ? (phaseIndex > 0 || stepIndex > 0 || algorithm.canGoBack) : algorithm.canGoBack}
              isMicro={isGranular}
            />
          );
        })()}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={styles.main}>
        {/* Left sidebar: vertical tabs */}
        <div style={styles.leftSidebar}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <img
            src="/sprites/spaceship.png"
            alt=""
            style={styles.sidebarShip}
          />
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

          {/* Granular Step (phase-level drill-down) */}
          {activeTab === 'granular' && (() => {
            const activeStep = algorithm.lastStepHistory?.[stepIndex] ?? null;
            const phases = activeStep?.phases ?? null;

            // Board state: show post-move for simplicity (matches existing behavior)
            const granularBoardState = activeStep?.boardSnapshot ?? algorithm.boardState;
            const granularPerceptionKey = activeStep?.boardSnapshot.perceptionKey ?? algorithm.currentPerceptionId;
            const granularVisited = algorithm.lastStepHistory
              ? new Set(algorithm.lastStepHistory.slice(0, stepIndex + 1).map(s => {
                  const [bx, by] = s.boardSnapshot.benderPosition;
                  return `${bx},${by}`;
                }))
              : undefined;

            return (
              <div style={styles.granularLayout}>
                {/* Phase pipeline bar */}
                <PhaseBar
                  currentPhase={phaseIndex}
                  onPhaseClick={setPhaseIndex}
                  currentStep={activeStep?.step.stepNumber ?? 0}
                  totalSteps={algorithm.algorithmConfig?.stepLimit ?? 200}
                  currentEpisode={algorithm.currentEpisode}
                  totalEpisodes={algorithm.algorithmConfig?.episodeLimit ?? 5000}
                  hasData={activeStep !== null}
                />

                <div style={styles.granularColumns}>
                  {/* Left: Board */}
                  <div style={styles.granularLeftCol}>
                    <Board boardState={granularBoardState} visitedCells={granularVisited} />
                  </div>

                  {/* Right: Phase detail + QMatrix */}
                  <div style={styles.granularRightCol}>
                    <div style={styles.phasePanel}>
                      {!phases && (
                        <div style={styles.phasePlaceholder}>
                          Click <span style={{ color: colors.accent.blue }}>Step ({'\u2192'})</span> to begin
                        </div>
                      )}
                      {phases && phaseIndex === 0 && <PerceivePanel data={phases.perceive} />}
                      {phases && phaseIndex === 1 && <DecidePanel data={phases.decide} />}
                      {phases && phaseIndex === 2 && <ActPanel data={phases.act} />}
                      {phases && phaseIndex === 3 && <RewardPanel data={phases.reward} />}
                      {phases && phaseIndex === 4 && <LearnPanel data={phases.learn} />}
                    </div>
                    <QMatrixInspector
                      qMatrix={granularQMatrix}
                      currentPerceptionId={granularPerceptionKey}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Chart tab (episode-level view) */}
          {activeTab === 'chart' && (
            <div style={styles.chartLayout}>
              <div style={styles.chartLeftCol}>
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
              <div style={styles.chartRightCol}>
                <EpisodeChart
                  summariesRef={algorithm.allSummariesRef}
                  playheadRef={algorithm.chartPlayheadRef}
                  lookaheadRef={algorithm.lookaheadSummaryRef}
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
  headerFry: {
    height: 64,
    marginLeft: 'auto',
    alignSelf: 'flex-end',
    marginBottom: -12,
    opacity: 0.5,
    pointerEvents: 'none' as const,
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
  sidebarShip: {
    marginTop: 'auto',
    padding: 8,
    opacity: 0.4,
    pointerEvents: 'none' as const,
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

  // --- Granular Step tab layout ---
  granularLayout: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minHeight: 0,
    gap: 0,
    margin: '-12px -24px',  // Offset tabContent padding so PhaseBar goes edge-to-edge
  },
  granularColumns: {
    display: 'flex',
    gap: 16,
    flex: 1,
    minHeight: 0,
    padding: '12px 24px',  // Restore padding for the content below PhaseBar
  },
  granularLeftCol: {
    flex: '0 0 500px',
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
  phasePanel: {
    padding: '12px 16px',
    backgroundColor: colors.bg.surface,
    borderRadius: 6,
    border: `1px solid ${colors.border.subtle}`,
    minHeight: 200,
  },
  phasePlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.text.tertiary,
  },

  // --- Chart tab layout ---
  chartLayout: {
    display: 'flex',
    gap: 16,
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
  },
  chartLeftCol: {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    minWidth: 0,
    minHeight: 0,
  },
  chartRightCol: {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    minWidth: 0,
    minHeight: 0,
  },
};

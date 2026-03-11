import React from 'react';
import { colors } from '../colors';
import type { StepResult } from '../engine/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepWalkthroughProps {
  stepHistory: StepResult[] | null;
  currentStepIndex: number;
  onStepIndexChange: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESULT_COLORS: Record<string, string> = {
  HitWall: colors.accent.red,
  CanCollected: colors.accent.gold,
  CanMissing: colors.accent.orange,
  MoveSuccessful: colors.accent.green,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StepWalkthrough: React.FC<StepWalkthroughProps> = ({
  stepHistory,
  currentStepIndex,
  onStepIndexChange,
}) => {
  if (!stepHistory || stepHistory.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Step Walkthrough</h3>
        <div style={styles.empty}>
          Step walkthrough is available when paused after running at least one episode.
          Step history is captured in micro mode.
        </div>
      </div>
    );
  }

  const step = stepHistory[currentStepIndex];
  if (!step) return null;

  const total = stepHistory.length;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Step Walkthrough
        <span style={styles.counter}> {currentStepIndex + 1} / {total}</span>
      </h3>

      {/* Step slider */}
      <div style={styles.sliderRow}>
        <button
          style={styles.navBtn}
          disabled={currentStepIndex <= 0}
          onClick={() => onStepIndexChange(currentStepIndex - 1)}
        >
          &lt;
        </button>
        <input
          type="range"
          min={0}
          max={total - 1}
          value={currentStepIndex}
          onChange={(e) => onStepIndexChange(parseInt(e.target.value))}
          style={styles.slider}
        />
        <button
          style={styles.navBtn}
          disabled={currentStepIndex >= total - 1}
          onClick={() => onStepIndexChange(currentStepIndex + 1)}
        >
          &gt;
        </button>
      </div>

      {/* Step details */}
      <div style={styles.details}>
        <div style={styles.row}>
          <span style={styles.label}>Position</span>
          <span style={styles.value}>({step.benderPosition[0] + 1}, {step.benderPosition[1] + 1})</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Move</span>
          <span style={{
            ...styles.value,
            color: step.wasRandomMove ? colors.accent.orange : colors.accent.blue,
          }}>
            {step.move} {step.wasRandomMove ? '(random)' : '(greedy)'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Result</span>
          <span style={{ ...styles.value, color: RESULT_COLORS[step.moveResult] || colors.text.primary }}>
            {step.moveResult}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Reward</span>
          <span style={{
            ...styles.value,
            color: step.reward > 0 ? colors.accent.green : step.reward < 0 ? colors.accent.red : colors.text.tertiary,
          }}>
            {step.reward > 0 ? '+' : ''}{step.reward}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Episode Reward</span>
          <span style={styles.value}>{step.episodeReward}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Cans Collected</span>
          <span style={styles.value}>{step.cansCollected}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Perception</span>
          <span style={{ ...styles.value, fontSize: 10 }}>{step.perception}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: 8,
    padding: 12,
    border: `1px solid ${colors.border.subtle}`,
  },
  title: {
    margin: '0 0 8px 0',
    color: colors.text.primary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  counter: {
    color: colors.accent.green,
    fontSize: 12,
    fontWeight: 'normal',
  },
  empty: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    lineHeight: 1.6,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  navBtn: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 4,
    backgroundColor: colors.bg.overlay,
    color: colors.text.primary,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    accentColor: colors.accent.green,
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  label: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
  },
  value: {
    color: colors.text.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
};

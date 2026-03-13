/**
 * PhaseBar — pipeline progress indicator for the 5 phases within a micro-step.
 * Adapted from eight-queens PipelineBar.tsx.
 * Clicking any segment navigates to that phase.
 */
import React from 'react';
import { PHASE_LABELS, PHASE_COUNT } from '../engine/phase-data';
import { colors } from '../colors';

const PHASE_COLORS = [
  colors.accent.teal,    // Perceive
  colors.accent.orange,  // Decide
  colors.accent.blue,    // Act
  colors.accent.gold,    // Reward
  colors.accent.purple,  // Learn
];

interface Props {
  currentPhase: number;
  onPhaseClick: (phase: number) => void;
  currentStep: number;
  totalSteps: number;
  currentEpisode: number;
  totalEpisodes: number;
  hasData: boolean;
}

export const PhaseBar: React.FC<Props> = ({
  currentPhase,
  onPhaseClick,
  currentStep,
  totalSteps,
  currentEpisode,
  totalEpisodes,
  hasData,
}) => {
  return (
    <div
      style={{ ...styles.container, opacity: hasData ? 1 : 0.4 }}
      data-help="Pipeline showing the 5 phases within the current micro-step. Click a segment to jump to that phase."
    >
      {/* Episode + Step counters */}
      <div style={styles.counters}>
        <div style={styles.counterGroup}>
          <span style={styles.counterLabel}>Ep</span>
          <span style={styles.counterValue}>{currentEpisode}</span>
          <span style={styles.counterSlash}>/</span>
          <span style={styles.counterTotal}>{totalEpisodes}</span>
        </div>
        <div style={styles.counterGroup}>
          <span style={styles.counterLabel}>Step</span>
          <span style={styles.counterValue}>{currentStep}</span>
          <span style={styles.counterSlash}>/</span>
          <span style={styles.counterTotal}>{totalSteps}</span>
        </div>
      </div>

      {/* Main bar: 5 segments */}
      <div style={styles.barWrap}>
        <div style={styles.bar}>
          {Array.from({ length: PHASE_COUNT }, (_, i) => {
            const color = PHASE_COLORS[i];
            const isCurrent = currentPhase === i;
            const isPast = currentPhase > i;
            return (
              <div
                key={i}
                onClick={() => onPhaseClick(i)}
                data-help={`Phase: ${PHASE_LABELS[i]}`}
                style={{
                  ...styles.segment,
                  flex: 1,
                  backgroundColor: isCurrent ? color : isPast ? color + '55' : colors.bg.raised,
                  boxShadow: isCurrent ? `0 0 8px ${color}99` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Phase labels */}
        <div style={styles.labels}>
          {Array.from({ length: PHASE_COUNT }, (_, i) => {
            const isActive = currentPhase === i;
            const isPast = currentPhase > i;
            const color = PHASE_COLORS[i];
            return (
              <div
                key={i}
                onClick={() => onPhaseClick(i)}
                style={{
                  ...styles.label,
                  color: isActive ? color : isPast ? color + '88' : colors.text.tertiary,
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                {PHASE_LABELS[i]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '6px 16px',
    backgroundColor: colors.bg.raised,
    borderBottom: `1px solid ${colors.border.subtle}`,
    transition: 'opacity 0.2s',
  },
  counters: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flexShrink: 0,
  },
  counterGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 2,
    fontFamily: 'monospace',
  },
  counterLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    minWidth: 28,
  },
  counterValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    minWidth: 20,
    textAlign: 'right',
  },
  counterSlash: {
    fontSize: 10,
    color: colors.text.disabled,
  },
  counterTotal: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  barWrap: {
    flex: 1,
    minWidth: 0,
  },
  bar: {
    display: 'flex',
    gap: 2,
    height: 14,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
    transition: 'box-shadow 0.2s',
    cursor: 'pointer',
    borderRadius: 2,
  },
  labels: {
    display: 'flex',
    marginTop: 3,
    gap: 2,
  },
  label: {
    flex: 1,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

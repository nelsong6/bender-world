import React from 'react';
import { colors } from '../colors';
import type { WalkthroughStep } from '../engine/episode-buffer';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepWalkthroughProps {
  stepHistory: WalkthroughStep[] | null;
  currentStepIndex: number;
  onStepIndexChange: (index: number) => void;
  onNextEpisode: () => void;
  onPrevEpisode: () => void;
  canGoBack: boolean;
  algorithmEnded: boolean;
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
  onNextEpisode,
  onPrevEpisode,
  canGoBack,
  algorithmEnded,
}) => {
  const hasSteps = stepHistory && stepHistory.length > 0;
  const total = hasSteps ? stepHistory.length : 0;
  const entry = hasSteps ? stepHistory[currentStepIndex] : null;
  const step = entry?.step ?? null;
  const atEnd = !!(hasSteps && currentStepIndex >= total - 1);
  const atStart = !hasSteps || currentStepIndex <= 0;

  const handlePrev = () => {
    if (!atStart) {
      onStepIndexChange(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasSteps && !atEnd) {
      onStepIndexChange(currentStepIndex + 1);
    } else {
      // At end of current episode (or no data) — step to next episode
      onNextEpisode();
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Step Walkthrough
        {hasSteps && (
          <span style={styles.counter}> step {currentStepIndex + 1} / {total}</span>
        )}
      </h3>

      {/* Episode nav */}
      <div style={styles.episodeRow}>
        <button
          style={{
            ...styles.episodeBtn,
            ...(!canGoBack ? styles.disabledBtn : {}),
          }}
          disabled={!canGoBack}
          onClick={onPrevEpisode}
        >
          &laquo; Prev Episode
        </button>
        <button
          style={{
            ...styles.episodeBtn,
            ...styles.nextEpisodeBtn,
            ...(algorithmEnded ? styles.disabledBtn : {}),
          }}
          disabled={algorithmEnded}
          onClick={onNextEpisode}
        >
          Next Episode &raquo;
        </button>
      </div>

      {/* Step nav */}
      <div style={styles.sliderRow}>
        <button
          style={{
            ...styles.navBtn,
            ...(atStart ? styles.disabledBtn : {}),
          }}
          disabled={atStart}
          onClick={handlePrev}
        >
          &lt;
        </button>
        {hasSteps ? (
          <input
            type="range"
            min={0}
            max={total - 1}
            value={currentStepIndex}
            onChange={(e) => onStepIndexChange(parseInt(e.target.value))}
            style={styles.slider}
          />
        ) : (
          <div style={styles.sliderPlaceholder}>
            Click &gt; to step the first episode
          </div>
        )}
        <button
          style={{
            ...styles.navBtn,
            ...(atEnd && algorithmEnded ? styles.disabledBtn : {}),
          }}
          disabled={atEnd && algorithmEnded}
          onClick={handleNext}
        >
          &gt;
        </button>
      </div>

      {/* Step details — always rendered for stable height */}
      <div style={styles.details}>
        <div style={styles.row}>
          <span style={styles.label}>Position</span>
          <span style={step ? styles.value : styles.placeholder}>
            {step ? `(${step.benderPosition[0] + 1}, ${step.benderPosition[1] + 1})` : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Move</span>
          <span style={step ? styles.value : styles.placeholder}>
            {step ? step.move : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Strategy</span>
          <span style={step ? {
            ...styles.value,
            color: step.wasRandomMove ? colors.accent.orange : colors.accent.blue,
          } : styles.placeholder}>
            {step ? (step.wasRandomMove ? 'Random' : 'Greedy') : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Result</span>
          <span style={step ? { ...styles.value, color: RESULT_COLORS[step.moveResult] || colors.text.primary } : styles.placeholder}>
            {step ? step.moveResult : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Reward</span>
          <span style={step ? {
            ...styles.value,
            color: step.reward > 0 ? colors.accent.green : step.reward < 0 ? colors.accent.red : colors.text.tertiary,
          } : styles.placeholder}>
            {step ? `${step.reward > 0 ? '+' : ''}${step.reward}` : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Episode Reward</span>
          <span style={step ? styles.value : styles.placeholder}>
            {step ? step.episodeReward : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Cans Collected</span>
          <span style={step ? styles.value : styles.placeholder}>
            {step ? step.cansCollected : '—'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Perception</span>
          <span style={step ? { ...styles.value, fontSize: 10 } : styles.placeholder}>
            {step ? step.perception : '—'}
          </span>
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
  episodeRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 8,
  },
  episodeBtn: {
    flex: 1,
    padding: '6px 10px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: colors.bg.overlay,
    color: colors.text.secondary,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  nextEpisodeBtn: {
    backgroundColor: colors.accent.blue,
    color: '#fff',
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  placeholder: {
    color: colors.text.disabled,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    height: 28,
  },
  sliderPlaceholder: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
    height: 22,
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

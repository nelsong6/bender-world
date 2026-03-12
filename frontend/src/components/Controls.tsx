import React, { useCallback, useEffect } from 'react';
import { colors } from '../colors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ControlsProps {
  isRunning: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepN: (count: number) => void;
  onBack: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  hasStarted: boolean;
  algorithmEnded: boolean;
  canGoBack: boolean;
}

// ---------------------------------------------------------------------------
// Speed slider helpers (logarithmic 1–500 eps/sec)
// ---------------------------------------------------------------------------

const MIN_SPEED = 1;
const MAX_SPEED = 500;

function speedToSlider(speed: number): number {
  const logMin = Math.log(MIN_SPEED);
  const logMax = Math.log(MAX_SPEED);
  return ((Math.log(speed) - logMin) / (logMax - logMin)) * 100;
}

function sliderToSpeed(slider: number): number {
  const logMin = Math.log(MIN_SPEED);
  const logMax = Math.log(MAX_SPEED);
  return Math.round(Math.exp(logMin + (slider / 100) * (logMax - logMin)));
}

// ---------------------------------------------------------------------------
// Component — flat title bar strip
// ---------------------------------------------------------------------------

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onPlay,
  onPause,
  onStep,
  onStepN,
  onBack,
  onReset,
  speed,
  onSpeedChange,
  hasStarted,
  algorithmEnded,
  canGoBack,
}) => {
  const canPlay = hasStarted && !algorithmEnded;
  const canStep = hasStarted && !isRunning && !algorithmEnded;

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!canPlay) return;
      if (isRunning) onPause();
      else onPlay();
    } else if (e.code === 'ArrowRight' && !e.shiftKey) {
      e.preventDefault();
      if (canStep) onStep();
    } else if (e.code === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      if (canStep) onStepN(10);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (canGoBack && !isRunning) onBack();
    }
  }, [isRunning, canPlay, canStep, canGoBack, onPlay, onPause, onStep, onStepN, onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={styles.bar} data-help="Space=play/pause, Right=step, Shift+Right=step 10, Left=back">
      {/* Buttons */}
      <button
        onClick={isRunning ? onPause : onPlay}
        disabled={!canPlay}
        style={{ ...styles.btn, ...styles.playBtn, ...(!canPlay ? styles.disabled : {}) }}
        title="Space"
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>

      <button
        onClick={onBack}
        disabled={!canGoBack || isRunning}
        style={{ ...styles.btn, ...styles.backBtn, ...(!canGoBack || isRunning ? styles.disabled : {}) }}
        title="Left arrow"
      >
        Back
      </button>

      <button
        onClick={onStep}
        disabled={!canStep}
        style={{ ...styles.btn, ...styles.stepBtn, ...(!canStep ? styles.disabled : {}) }}
        title="Right arrow"
      >
        Step
      </button>

      <button
        onClick={() => onStepN(10)}
        disabled={!canStep}
        style={{ ...styles.btn, ...styles.stepBtn, ...(!canStep ? styles.disabled : {}) }}
        title="Shift+Right"
      >
        +10
      </button>

      <button
        onClick={() => onStepN(100)}
        disabled={!canStep}
        style={{ ...styles.btn, ...styles.stepNBtn, ...(!canStep ? styles.disabled : {}) }}
      >
        +100
      </button>

      <button
        onClick={onReset}
        disabled={!hasStarted}
        style={{ ...styles.btn, ...styles.resetBtn, ...(!hasStarted ? styles.disabled : {}) }}
      >
        Reset
      </button>

      {/* Separator */}
      <div style={styles.sep} />

      {/* Speed */}
      <span style={styles.speedLabel}>
        Speed: <span style={styles.speedValue}>{speed} ep/s</span>
      </span>
      <span style={styles.speedMark}>1</span>
      <input
        type="range"
        min={0}
        max={100}
        value={speedToSlider(speed)}
        onChange={(e) => onSpeedChange(sliderToSpeed(parseInt(e.target.value)))}
        style={styles.slider}
        data-help="Logarithmic speed: 1–500 episodes per second"
      />
      <span style={styles.speedMark}>500</span>

      {algorithmEnded && <span style={styles.endedBadge}>Complete</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 24px',
    backgroundColor: colors.bg.raised,
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  btn: {
    padding: '5px 10px',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playBtn: {
    backgroundColor: colors.accent.green,
    color: '#fff',
    minWidth: 52,
  },
  backBtn: {
    backgroundColor: colors.accent.purple,
    color: '#fff',
  },
  stepBtn: {
    backgroundColor: colors.accent.blue,
    color: '#fff',
  },
  stepNBtn: {
    backgroundColor: '#4a88c0',
    color: '#fff',
  },
  resetBtn: {
    backgroundColor: colors.accent.red,
    color: '#fff',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  sep: {
    width: 1,
    height: 18,
    backgroundColor: colors.border.subtle,
    marginLeft: 8,
    marginRight: 8,
    flexShrink: 0,
  },
  speedLabel: {
    color: colors.text.secondary,
    fontSize: 11,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  speedValue: {
    color: colors.accent.green,
    fontWeight: 'bold',
  },
  speedMark: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  slider: {
    width: 120,
    flexShrink: 0,
    accentColor: colors.accent.green,
  },
  endedBadge: {
    marginLeft: 8,
    padding: '3px 8px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    flexShrink: 0,
  },
};

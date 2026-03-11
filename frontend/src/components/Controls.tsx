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

function getSpeedLabel(speed: number): string {
  return `${speed} ep/s`;
}

// ---------------------------------------------------------------------------
// Component
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
    // Ignore if focused on an input
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
    <div style={styles.container} data-help="Space=play/pause, Right=step, Shift+Right=step 10, Left=back">
      <div style={styles.buttonRow}>
        {/* Play/Pause */}
        <button
          onClick={isRunning ? onPause : onPlay}
          disabled={!canPlay}
          style={{
            ...styles.button,
            ...styles.playButton,
            ...(!canPlay ? styles.disabledButton : {}),
          }}
          title="Space"
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>

        {/* Back */}
        <button
          onClick={onBack}
          disabled={!canGoBack || isRunning}
          style={{
            ...styles.button,
            ...styles.backButton,
            ...(!canGoBack || isRunning ? styles.disabledButton : {}),
          }}
          title="Left arrow"
        >
          Back
        </button>

        {/* Step */}
        <button
          onClick={onStep}
          disabled={!canStep}
          style={{
            ...styles.button,
            ...styles.stepButton,
            ...(!canStep ? styles.disabledButton : {}),
          }}
          title="Right arrow"
        >
          Step
        </button>

        {/* Step 10 */}
        <button
          onClick={() => onStepN(10)}
          disabled={!canStep}
          style={{
            ...styles.button,
            ...styles.stepButton,
            ...(!canStep ? styles.disabledButton : {}),
          }}
          title="Shift+Right"
        >
          +10
        </button>

        {/* Step 100 */}
        <button
          onClick={() => onStepN(100)}
          disabled={!canStep}
          style={{
            ...styles.button,
            ...styles.stepNButton,
            ...(!canStep ? styles.disabledButton : {}),
          }}
        >
          +100
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={!hasStarted}
          style={{
            ...styles.button,
            ...styles.resetButton,
            ...(!hasStarted ? styles.disabledButton : {}),
          }}
        >
          Reset
        </button>
      </div>

      {/* Speed slider */}
      <div style={styles.speedSection}>
        <div style={styles.speedLabel}>
          Speed: <span style={styles.speedValue}>{getSpeedLabel(speed)}</span>
        </div>
        <div style={styles.speedSliderRow}>
          <span style={styles.speedMark}>1</span>
          <input
            type="range"
            min={0}
            max={100}
            value={speedToSlider(speed)}
            onChange={(e) => onSpeedChange(sliderToSpeed(parseInt(e.target.value)))}
            style={styles.speedSlider}
          />
          <span style={styles.speedMark}>500</span>
        </div>
      </div>

      {algorithmEnded && (
        <div style={styles.endedBanner}>Training Complete</div>
      )}
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
  buttonRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  },
  button: {
    padding: '7px 10px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  playButton: {
    backgroundColor: colors.accent.green,
    color: '#fff',
    flex: '1 1 auto',
  },
  backButton: {
    backgroundColor: colors.accent.purple,
    color: '#fff',
  },
  stepButton: {
    backgroundColor: colors.accent.blue,
    color: '#fff',
  },
  stepNButton: {
    backgroundColor: '#4a88c0',
    color: '#fff',
  },
  resetButton: {
    backgroundColor: colors.accent.red,
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  speedSection: {
    marginTop: 4,
  },
  speedLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  speedValue: {
    color: colors.accent.green,
  },
  speedSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  speedSlider: {
    flex: 1,
    accentColor: colors.accent.green,
  },
  speedMark: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap' as const,
  },
  endedBanner: {
    marginTop: 10,
    padding: '8px 12px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    borderRadius: 4,
    textAlign: 'center' as const,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
  },
};

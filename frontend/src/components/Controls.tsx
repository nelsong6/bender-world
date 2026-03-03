import React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ControlsProps {
  isRunning: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (ms: number) => void;
  hasStarted: boolean;
  algorithmEnded: boolean;
}

// ---------------------------------------------------------------------------
// Speed presets
// ---------------------------------------------------------------------------

function speedToSlider(speed: number): number {
  // Map speed (ms): 100 -> 0, 0 -> 100
  if (speed >= 100) return 0;
  if (speed <= 0) return 100;
  return Math.round(100 - speed);
}

function sliderToSpeed(slider: number): number {
  // Map slider: 0 -> 100ms, 100 -> 0ms
  if (slider >= 100) return 0;
  if (slider <= 0) return 100;
  return 100 - slider;
}

function getSpeedLabel(speed: number): string {
  if (speed === 0) return 'Instant';
  if (speed <= 1) return `${speed}ms (Faster)`;
  if (speed <= 10) return `${speed}ms (Fast)`;
  if (speed <= 50) return `${speed}ms (Medium)`;
  return `${speed}ms (Slow)`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onPlay,
  onPause,
  onStep,
  onReset,
  speed,
  onSpeedChange,
  hasStarted,
  algorithmEnded,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.buttonRow}>
        {/* Play/Pause toggle */}
        <button
          onClick={isRunning ? onPause : onPlay}
          disabled={!hasStarted || algorithmEnded}
          style={{
            ...styles.button,
            ...styles.playButton,
            ...(!hasStarted || algorithmEnded ? styles.disabledButton : {}),
          }}
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>

        {/* Step button */}
        <button
          onClick={onStep}
          disabled={isRunning || !hasStarted || algorithmEnded}
          style={{
            ...styles.button,
            ...styles.stepButton,
            ...(isRunning || !hasStarted || algorithmEnded ? styles.disabledButton : {}),
          }}
        >
          Step
        </button>

        {/* Reset button */}
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
          <span style={styles.speedMark}>Slow</span>
          <input
            type="range"
            min={0}
            max={100}
            value={speedToSlider(speed)}
            onChange={(e) => onSpeedChange(sliderToSpeed(parseInt(e.target.value)))}
            style={styles.speedSlider}
          />
          <span style={styles.speedMark}>Instant</span>
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
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 12,
    border: '1px solid #333',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  playButton: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  stepButton: {
    backgroundColor: '#2196f3',
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#f44336',
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
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  speedValue: {
    color: '#4caf50',
  },
  speedSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  speedSlider: {
    flex: 1,
    accentColor: '#4caf50',
  },
  speedMark: {
    color: '#666',
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

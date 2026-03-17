import React, { useCallback, useEffect, useState } from 'react';
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
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  playSpeed: number;
  onPlaySpeedChange: (speed: number) => void;
  hasStarted: boolean;
  algorithmEnded: boolean;
  canGoBack: boolean;
  isMicro?: boolean;
}

// ---------------------------------------------------------------------------
// Slider helpers (logarithmic scale)
// ---------------------------------------------------------------------------

function valueToSlider(value: number, min: number, max: number): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return ((Math.log(value) - logMin) / (logMax - logMin)) * 100;
}

function sliderToValue(slider: number, min: number, max: number, round: (n: number) => number): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return round(Math.exp(logMin + (slider / 100) * (logMax - logMin)));
}

// Batch: 1–500 integer
const batchToSlider = (v: number) => valueToSlider(v, 1, 500);
const sliderToBatch = (s: number) => sliderToValue(s, 1, 500, Math.round);

// Speed: 0.25–500 (fractional at low end, integer at high end)
const speedToSlider = (v: number) => valueToSlider(v, 0.25, 500);
const sliderToPlaySpeed = (s: number) => {
  const raw = sliderToValue(s, 0.25, 500, (n) => n);
  return raw < 1 ? Math.round(raw * 4) / 4 : Math.round(raw);
};

// ---------------------------------------------------------------------------
// Editable inline value — click to type, Enter/blur to commit
// ---------------------------------------------------------------------------

const EditableValue: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
  accentColor: string;
}> = ({ value, onChange, min, max, suffix, accentColor }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed < 1 ? Math.round(parsed * 4) / 4 : Math.round(parsed));
    }
  };

  // The span is always rendered to hold layout. The input overlays it when editing.
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        style={{
          color: accentColor,
          fontWeight: 'bold',
          cursor: 'text',
          visibility: editing ? 'hidden' : 'visible',
        }}
        title="Click to type a value"
      >
        {value}{suffix}
      </span>
      {editing && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          style={{
            position: 'absolute',
            left: 0,
            top: -1,
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 'bold',
            color: accentColor,
            backgroundColor: colors.bg.surface,
            border: `1px solid ${accentColor}`,
            borderRadius: 2,
            padding: '0 2px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
    </span>
  );
};

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
  batchSize,
  onBatchSizeChange,
  playSpeed,
  onPlaySpeedChange,
  hasStarted,
  algorithmEnded,
  canGoBack,
  isMicro = false,
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
    <div style={styles.bar} data-help="Space=play/pause, Right=step, Shift+Right=+10, Left=back. Batch slider controls how many units per step press.">
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

      {/* Batch size */}
      <span style={styles.speedLabel}>
        Batch: <EditableValue
          value={batchSize}
          onChange={onBatchSizeChange}
          min={1}
          max={500}
          suffix={isMicro ? ' phases/step' : ' ep/step'}
          accentColor={colors.accent.green}
        />
      </span>
      <span style={styles.speedMark}>1</span>
      <input
        type="range"
        min={0}
        max={100}
        value={batchToSlider(batchSize)}
        onChange={(e) => onBatchSizeChange(sliderToBatch(parseInt(e.target.value)))}
        style={styles.slider}
        data-help={isMicro ? "Batch size: 1–500 phases per step press (5 = one full Q-learning step)" : "Batch size: 1–500 episodes per step press"}
      />
      <span style={styles.speedMark}>500</span>

      {/* Separator */}
      <div style={styles.sep} />

      {/* Playback speed */}
      <span style={styles.speedLabel}>
        Speed: <EditableValue
          value={playSpeed}
          onChange={onPlaySpeedChange}
          min={0.25}
          max={500}
          suffix={isMicro ? ' ticks/s' : ' ep/s'}
          accentColor={colors.accent.orange}
        />
      </span>
      <span style={styles.speedMark}>¼</span>
      <input
        type="range"
        min={0}
        max={100}
        value={speedToSlider(playSpeed)}
        onChange={(e) => onPlaySpeedChange(sliderToPlaySpeed(parseInt(e.target.value)))}
        style={{ ...styles.slider, accentColor: colors.accent.orange }}
        data-help="Playback speed when Play is active: 0.25–500 ticks per second"
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
    backgroundColor: colors.accent.blue,
    opacity: 0.8,
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
    backgroundColor: colors.accent.green,
    color: '#fff',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    flexShrink: 0,
  },
};

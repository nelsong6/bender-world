import React, { useState } from 'react';
import { AlgorithmConfig, DEFAULT_CONFIG, MoveResult, DEFAULT_REWARD_CONFIG } from '../engine/types';
import { PRESETS } from '../data/presets';
import { colors } from '../colors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigPanelProps {
  onStart: (config: AlgorithmConfig) => void;
  isRunning: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onStart,
  isRunning,
}) => {
  const [epsilon, setEpsilon] = useState(DEFAULT_CONFIG.epsilon);
  const [gamma, setGamma] = useState(DEFAULT_CONFIG.gamma);
  const [eta, setEta] = useState(DEFAULT_CONFIG.eta);
  const [episodeLimit, setEpisodeLimit] = useState(DEFAULT_CONFIG.episodeLimit);
  const [stepLimit, setStepLimit] = useState(DEFAULT_CONFIG.stepLimit);

  // Reward configuration
  const [rewardCanCollected, setRewardCanCollected] = useState(DEFAULT_REWARD_CONFIG[MoveResult.CanCollected]);
  const [rewardHitWall, setRewardHitWall] = useState(DEFAULT_REWARD_CONFIG[MoveResult.HitWall]);
  const [rewardCanMissing, setRewardCanMissing] = useState(DEFAULT_REWARD_CONFIG[MoveResult.CanMissing]);
  const [rewardMoveOk, setRewardMoveOk] = useState(DEFAULT_REWARD_CONFIG[MoveResult.MoveSuccessful]);

  const handleStart = () => {
    onStart({
      epsilon, gamma, eta, episodeLimit, stepLimit,
      rewards: {
        [MoveResult.CanCollected]: rewardCanCollected,
        [MoveResult.HitWall]: rewardHitWall,
        [MoveResult.CanMissing]: rewardCanMissing,
        [MoveResult.MoveSuccessful]: rewardMoveOk,
      },
    });
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setEpsilon(preset.config.epsilon);
    setGamma(preset.config.gamma);
    setEta(preset.config.eta);
    setEpisodeLimit(preset.config.episodeLimit);
    setStepLimit(preset.config.stepLimit);
    setRewardCanCollected(DEFAULT_REWARD_CONFIG[MoveResult.CanCollected]);
    setRewardHitWall(DEFAULT_REWARD_CONFIG[MoveResult.HitWall]);
    setRewardCanMissing(DEFAULT_REWARD_CONFIG[MoveResult.CanMissing]);
    setRewardMoveOk(DEFAULT_REWARD_CONFIG[MoveResult.MoveSuccessful]);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Configuration</h3>

      {/* Preset buttons */}
      <div style={styles.presetSection}>
        <div style={styles.presetLabel}>Presets:</div>
        <div style={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              disabled={isRunning}
              style={{
                ...styles.presetButton,
                ...(isRunning ? styles.disabledButton : {}),
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Full parameter controls */}
      <div style={styles.sliderSection}>
        <SliderParam
            label="Epsilon (explore rate)"
            value={epsilon}
            min={0}
            max={1}
            step={0.01}
            onChange={setEpsilon}
            disabled={isRunning}
          />
          <SliderParam
            label="Gamma (discount)"
            value={gamma}
            min={0}
            max={1}
            step={0.01}
            onChange={setGamma}
            disabled={isRunning}
          />
          <SliderParam
            label="Eta (learning rate)"
            value={eta}
            min={0}
            max={1}
            step={0.01}
            onChange={setEta}
            disabled={isRunning}
          />
          <SliderParam
            label="Episode Limit"
            value={episodeLimit}
            min={100}
            max={100000}
            step={100}
            onChange={setEpisodeLimit}
            disabled={isRunning}
            integer
          />
          <SliderParam
            label="Step Limit"
            value={stepLimit}
            min={50}
            max={500}
            step={10}
            onChange={setStepLimit}
            disabled={isRunning}
            integer
          />

          {/* Reward configuration */}
          <div style={styles.rewardHeader}>Reward Values</div>
          <SliderParam
            label="Can Collected"
            value={rewardCanCollected}
            min={-20}
            max={50}
            step={1}
            onChange={setRewardCanCollected}
            disabled={isRunning}
            integer
          />
          <SliderParam
            label="Hit Wall"
            value={rewardHitWall}
            min={-50}
            max={0}
            step={1}
            onChange={setRewardHitWall}
            disabled={isRunning}
            integer
          />
          <SliderParam
            label="Can Missing (empty grab)"
            value={rewardCanMissing}
            min={-20}
            max={0}
            step={1}
            onChange={setRewardCanMissing}
            disabled={isRunning}
            integer
          />
          <SliderParam
            label="Move OK"
            value={rewardMoveOk}
            min={-10}
            max={10}
            step={1}
            onChange={setRewardMoveOk}
            disabled={isRunning}
            integer
          />
      </div>

      <button
        onClick={handleStart}
        disabled={isRunning}
        style={{
          ...styles.startButton,
          ...(isRunning ? styles.disabledStartButton : {}),
        }}
      >
        {isRunning ? 'Running...' : 'Start Training'}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SliderParam sub-component
// ---------------------------------------------------------------------------

interface SliderParamProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  disabled: boolean;
  integer?: boolean;
}

const SliderParam: React.FC<SliderParamProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  integer,
}) => {
  const displayValue = integer ? Math.round(value) : value.toFixed(2);

  return (
    <div style={styles.paramRow}>
      <div style={styles.paramLabel}>
        {label}: <span style={styles.paramValue}>{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(integer ? Math.round(v) : v);
        }}
        disabled={disabled}
        style={styles.slider}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.bg.raised,
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${colors.border.subtle}`,
  },
  title: {
    margin: '0 0 12px 0',
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  presetSection: {
    marginBottom: 12,
  },
  presetLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'monospace',
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  presetButton: {
    padding: '6px 12px',
    backgroundColor: colors.bg.overlay,
    color: colors.text.primary,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    transition: 'background-color 0.2s',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  sliderSection: {
    marginBottom: 12,
  },
  rewardHeader: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    borderTop: `1px solid ${colors.border.subtle}`,
    paddingTop: 8,
  },
  paramRow: {
    marginBottom: 10,
  },
  paramLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  paramValue: {
    color: colors.accent.green,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    accentColor: colors.accent.green,
  },
  hint: {
    color: colors.text.disabled,
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    marginBottom: 12,
    padding: '8px 0',
  },
  startButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: colors.accent.green,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  disabledStartButton: {
    backgroundColor: colors.border.subtle,
    color: colors.text.disabled,
    cursor: 'not-allowed',
  },
};

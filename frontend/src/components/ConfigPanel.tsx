import React, { useState } from 'react';
import { AlgorithmConfig, DEFAULT_CONFIG } from '../engine/types';
import type { Preset } from '../api/client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigPanelProps {
  onStart: (config: AlgorithmConfig) => void;
  isRunning: boolean;
  isAuthenticated: boolean;
  presets: Preset[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onStart,
  isRunning,
  isAuthenticated,
  presets,
}) => {
  const [epsilon, setEpsilon] = useState(DEFAULT_CONFIG.epsilon);
  const [gamma, setGamma] = useState(DEFAULT_CONFIG.gamma);
  const [eta, setEta] = useState(DEFAULT_CONFIG.eta);
  const [episodeLimit, setEpisodeLimit] = useState(DEFAULT_CONFIG.episodeLimit);
  const [stepLimit, setStepLimit] = useState(DEFAULT_CONFIG.stepLimit);

  const handleStart = () => {
    onStart({ epsilon, gamma, eta, episodeLimit, stepLimit });
  };

  const applyPreset = (preset: Preset) => {
    setEpsilon(preset.config.epsilon);
    setGamma(preset.config.gamma);
    setEta(preset.config.eta);
    setEpisodeLimit(preset.config.episodeLimit);
    setStepLimit(preset.config.stepLimit);
  };

  const fallbackPresets: Preset[] =
    presets.length > 0
      ? presets
      : [
          {
            id: 'default',
            name: 'Default',
            description: 'Standard Q-Learning parameters',
            config: { ...DEFAULT_CONFIG },
          },
          {
            id: 'fast-learner',
            name: 'Fast Learner',
            description: 'Higher learning rate, more exploration',
            config: { epsilon: 0.3, gamma: 0.9, eta: 0.3, episodeLimit: 3000, stepLimit: 200 },
          },
          {
            id: 'cautious',
            name: 'Cautious',
            description: 'Low exploration, high discount',
            config: { epsilon: 0.1, gamma: 0.95, eta: 0.05, episodeLimit: 10000, stepLimit: 200 },
          },
          {
            id: 'explorer',
            name: 'Explorer',
            description: 'High exploration rate',
            config: { epsilon: 0.5, gamma: 0.8, eta: 0.2, episodeLimit: 5000, stepLimit: 300 },
          },
        ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Configuration</h3>

      {/* Preset buttons - always shown */}
      <div style={styles.presetSection}>
        <div style={styles.presetLabel}>Presets:</div>
        <div style={styles.presetGrid}>
          {fallbackPresets.map((preset) => (
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

      {/* Full parameter controls - shown for authenticated users */}
      {isAuthenticated ? (
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
        </div>
      ) : (
        <div style={styles.hint}>
          Sign in with Google to customize all parameters
        </div>
      )}

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
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #333',
  },
  title: {
    margin: '0 0 12px 0',
    color: '#e0e0e0',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  presetSection: {
    marginBottom: 12,
  },
  presetLabel: {
    color: '#888',
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
    backgroundColor: '#2a2a4a',
    color: '#e0e0e0',
    border: '1px solid #444',
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
  paramRow: {
    marginBottom: 10,
  },
  paramLabel: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  paramValue: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    accentColor: '#4caf50',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    marginBottom: 12,
    padding: '8px 0',
  },
  startButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#4caf50',
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
    backgroundColor: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },
};

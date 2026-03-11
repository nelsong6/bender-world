import React from 'react';
import type { AlgorithmConfig } from '../engine/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatusBarProps {
  currentEpisode: number;
  currentStep: number;
  episodeReward: number;
  totalReward: number;
  cansCollected: number;
  cansRemaining: number;
  epsilon: number;
  algorithmConfig: AlgorithmConfig | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StatusBar: React.FC<StatusBarProps> = ({
  currentEpisode,
  currentStep,
  episodeReward,
  totalReward,
  cansCollected,
  cansRemaining,
  epsilon,
  algorithmConfig,
}) => {
  const items: { label: string; value: string; color?: string }[] = [
    {
      label: 'Episode',
      value: algorithmConfig
        ? `${currentEpisode} / ${algorithmConfig.episodeLimit}`
        : `${currentEpisode}`,
      color: '#4caf50',
    },
    {
      label: 'Step',
      value: algorithmConfig
        ? `${currentStep} / ${algorithmConfig.stepLimit}`
        : `${currentStep}`,
      color: '#2196f3',
    },
    {
      label: 'Ep. Reward',
      value: episodeReward.toFixed(0),
      color: episodeReward >= 0 ? '#4caf50' : '#f44336',
    },
    {
      label: 'Total Reward',
      value: totalReward.toFixed(0),
      color: totalReward >= 0 ? '#4caf50' : '#f44336',
    },
    {
      label: 'Cans',
      value: `${cansCollected}`,
      color: '#ffd700',
    },
    {
      label: 'Cans Left',
      value: `${cansRemaining}`,
      color: '#ffd700',
    },
    {
      label: 'Epsilon',
      value: epsilon.toFixed(4),
      color: '#ff9800',
    },
    {
      label: 'Gamma',
      value: algorithmConfig ? algorithmConfig.gamma.toFixed(4) : '0.0000',
      color: '#9c27b0',
    },
  ];

  return (
    <div style={styles.container}>
      {items.map((item) => (
        <div key={item.label} style={styles.item}>
          <span style={styles.label}>{item.label}</span>
          <span style={{ ...styles.value, color: item.color || '#e0e0e0' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: '8px 12px',
    border: '1px solid #333',
  },
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: '1 1 auto',
    minWidth: 80,
    padding: '4px 8px',
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
};

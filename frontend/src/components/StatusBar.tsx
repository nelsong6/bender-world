import React from 'react';
import type { AlgorithmConfig } from '../engine/types';
import { colors } from '../colors';

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
      color: colors.accent.green,
    },
    {
      label: 'Step',
      value: algorithmConfig
        ? `${currentStep} / ${algorithmConfig.stepLimit}`
        : `${currentStep}`,
      color: colors.accent.blue,
    },
    {
      label: 'Ep. Reward',
      value: episodeReward.toFixed(0),
      color: episodeReward >= 0 ? colors.accent.green : colors.accent.red,
    },
    {
      label: 'Total Reward',
      value: totalReward.toFixed(0),
      color: totalReward >= 0 ? colors.accent.green : colors.accent.red,
    },
    {
      label: 'Cans',
      value: `${cansCollected}`,
      color: colors.accent.gold,
    },
    {
      label: 'Cans Left',
      value: `${cansRemaining}`,
      color: colors.accent.gold,
    },
    {
      label: 'Epsilon',
      value: epsilon.toFixed(4),
      color: colors.accent.orange,
    },
    {
      label: 'Gamma',
      value: algorithmConfig ? algorithmConfig.gamma.toFixed(4) : '0.0000',
      color: colors.accent.purple,
    },
  ];

  return (
    <div style={styles.container}>
      {items.map((item) => (
        <div key={item.label} style={styles.item}>
          <span style={styles.label}>{item.label}</span>
          <span style={{ ...styles.value, color: item.color || colors.text.primary }}>
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
    backgroundColor: colors.bg.raised,
    borderRadius: 8,
    padding: '8px 12px',
    border: `1px solid ${colors.border.subtle}`,
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
    color: colors.text.tertiary,
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

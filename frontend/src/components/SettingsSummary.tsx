import React from 'react';
import type { AlgorithmConfig } from '../engine/types';
import { MoveResult, DEFAULT_REWARD_CONFIG } from '../engine/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsSummaryProps {
  algorithmConfig: AlgorithmConfig | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SettingsSummary: React.FC<SettingsSummaryProps> = ({
  algorithmConfig,
}) => {
  if (!algorithmConfig) return null;

  const rewards = algorithmConfig.rewards ?? DEFAULT_REWARD_CONFIG;

  const items: { label: string; value: string }[] = [
    { label: 'Episodes', value: String(algorithmConfig.episodeLimit) },
    { label: 'Steps/Episode', value: String(algorithmConfig.stepLimit) },
    { label: 'Epsilon (initial)', value: algorithmConfig.epsilon.toFixed(2) },
    { label: 'Gamma', value: algorithmConfig.gamma.toFixed(2) },
    { label: 'Eta', value: algorithmConfig.eta.toFixed(2) },
  ];

  const rewardItems: { label: string; value: string; color: string }[] = [
    {
      label: 'Can Collected',
      value: `${rewards[MoveResult.CanCollected] >= 0 ? '+' : ''}${rewards[MoveResult.CanCollected]}`,
      color: '#4caf50',
    },
    {
      label: 'Hit Wall',
      value: `${rewards[MoveResult.HitWall] >= 0 ? '+' : ''}${rewards[MoveResult.HitWall]}`,
      color: '#f44336',
    },
    {
      label: 'Can Missing',
      value: `${rewards[MoveResult.CanMissing] >= 0 ? '+' : ''}${rewards[MoveResult.CanMissing]}`,
      color: '#ff9800',
    },
    {
      label: 'Move OK',
      value: `${rewards[MoveResult.MoveSuccessful] >= 0 ? '+' : ''}${rewards[MoveResult.MoveSuccessful]}`,
      color: '#888',
    },
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Active Configuration</h3>
      <div style={styles.grid}>
        {items.map((item) => (
          <div key={item.label} style={styles.row}>
            <span style={styles.label}>{item.label}</span>
            <span style={styles.value}>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={styles.rewardHeader}>Rewards</div>
      <div style={styles.grid}>
        {rewardItems.map((item) => (
          <div key={item.label} style={styles.row}>
            <span style={styles.label}>{item.label}</span>
            <span style={{ ...styles.value, color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
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
  title: {
    margin: '0 0 8px 0',
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  label: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  value: {
    color: '#e0e0e0',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  rewardHeader: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
    borderTop: '1px solid #333',
    paddingTop: 6,
  },
};

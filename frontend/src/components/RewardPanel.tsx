/**
 * RewardPanel — Phase 3: Outcome-to-reward mapping and running total.
 */
import React from 'react';
import type { RewardPhaseData } from '../engine/phase-data';
import { MoveResult } from '../engine/types';
import { colors } from '../colors';

interface Props {
  data: RewardPhaseData;
}

const RESULT_LABELS: [MoveResult, string][] = [
  [MoveResult.CanCollected, 'Can Collected'],
  [MoveResult.HitWall, 'Hit Wall'],
  [MoveResult.CanMissing, 'Can Missing'],
  [MoveResult.MoveSuccessful, 'Move OK'],
];

export const RewardPanel: React.FC<Props> = ({ data }) => {
  return (
    <div style={styles.container}>
      <div style={styles.title}>Reward</div>

      {/* Reward config table */}
      <div style={styles.sectionLabel}>Reward Lookup</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Outcome</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Reward</th>
          </tr>
        </thead>
        <tbody>
          {RESULT_LABELS.map(([result, label]) => {
            const isActive = result === data.moveResult;
            const reward = data.rewardConfig[result];
            return (
              <tr key={result} style={isActive ? { backgroundColor: colors.accent.gold + '22' } : undefined}>
                <td style={{
                  ...styles.td,
                  color: isActive ? colors.accent.gold : colors.text.secondary,
                  fontWeight: isActive ? 'bold' : 'normal',
                }}>
                  {label}
                  {isActive && <span style={{ color: colors.accent.gold }}> {'\u2190'}</span>}
                </td>
                <td style={{
                  ...styles.td,
                  textAlign: 'right',
                  color: isActive
                    ? (reward >= 0 ? colors.accent.green : colors.accent.red)
                    : colors.text.secondary,
                  fontWeight: isActive ? 'bold' : 'normal',
                }}>
                  {reward >= 0 ? '+' : ''}{reward}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Running total */}
      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>Episode Reward</span>
        <span style={styles.totalCalc}>
          <span style={{ color: colors.text.secondary }}>{data.episodeRewardBefore}</span>
          <span style={{ color: data.reward >= 0 ? colors.accent.green : colors.accent.red }}>
            {' '}{data.reward >= 0 ? '+' : ''}{data.reward}{' '}
          </span>
          <span style={{ color: colors.text.tertiary }}>= </span>
          <span style={{
            fontWeight: 'bold',
            color: data.episodeRewardAfter >= 0 ? colors.accent.green : colors.accent.red,
          }}>
            {data.episodeRewardAfter}
          </span>
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent.gold,
    fontFamily: 'monospace',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  table: {
    borderCollapse: 'collapse',
    fontFamily: 'monospace',
    fontSize: 11,
    maxWidth: 300,
  },
  th: {
    textAlign: 'left',
    padding: '3px 12px',
    color: colors.text.tertiary,
    borderBottom: `1px solid ${colors.border.subtle}`,
    fontSize: 10,
    fontWeight: 'normal',
    textTransform: 'uppercase',
  },
  td: {
    padding: '3px 12px',
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  totalCalc: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
};

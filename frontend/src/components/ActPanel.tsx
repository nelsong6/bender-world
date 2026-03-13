/**
 * ActPanel — Phase 2: Move execution and board state change.
 */
import React from 'react';
import type { ActPhaseData } from '../engine/phase-data';
import { MoveResult } from '../engine/types';
import { colors } from '../colors';

interface Props {
  data: ActPhaseData;
}

const RESULT_COLORS: Record<string, string> = {
  [MoveResult.CanCollected]: colors.accent.green,
  [MoveResult.HitWall]: colors.accent.red,
  [MoveResult.CanMissing]: colors.accent.orange,
  [MoveResult.MoveSuccessful]: colors.text.secondary,
};

const RESULT_LABELS: Record<string, string> = {
  [MoveResult.CanCollected]: 'Can Collected!',
  [MoveResult.HitWall]: 'Hit Wall!',
  [MoveResult.CanMissing]: 'No Can Here',
  [MoveResult.MoveSuccessful]: 'Moved Successfully',
};

export const ActPanel: React.FC<Props> = ({ data }) => {
  const resultColor = RESULT_COLORS[data.moveResult] ?? colors.text.secondary;
  const [bx, by] = data.benderPositionBefore;
  const [ax, ay] = data.benderPositionAfter;
  const posChanged = bx !== ax || by !== ay;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Act</div>

      {/* Action */}
      <div style={styles.row}>
        <span style={styles.label}>Action</span>
        <span style={{ ...styles.badge, backgroundColor: colors.accent.blue + '33', color: colors.accent.blue, borderColor: colors.accent.blue }}>
          {data.move === 'Grab' ? 'Grab' : `Move ${data.move}`}
        </span>
      </div>

      {/* Result */}
      <div style={styles.row}>
        <span style={styles.label}>Result</span>
        <span style={{ ...styles.badge, backgroundColor: resultColor + '33', color: resultColor, borderColor: resultColor }}>
          {RESULT_LABELS[data.moveResult]}
        </span>
      </div>

      {/* Position change */}
      <div style={styles.row}>
        <span style={styles.label}>Position</span>
        <span style={styles.posText}>
          ({bx + 1}, {by + 1})
          {posChanged
            ? <span style={{ color: colors.accent.blue }}> {'\u2192'} ({ax + 1}, {ay + 1})</span>
            : <span style={{ color: colors.text.tertiary }}> {'\u2192'} no change</span>
          }
          {data.moveResult === MoveResult.HitWall && (
            <span style={{ color: colors.accent.red, fontWeight: 'bold' }}> WALL!</span>
          )}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent.blue,
    fontFamily: 'monospace',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
    minWidth: 60,
    textTransform: 'uppercase',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    border: '1px solid',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  posText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text.primary,
  },
};

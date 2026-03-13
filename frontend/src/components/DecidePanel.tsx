/**
 * DecidePanel — Phase 1: Epsilon-greedy action selection visualization.
 */
import React from 'react';
import type { DecidePhaseData } from '../engine/phase-data';
import { ALL_MOVES } from '../engine/types';
import { colors } from '../colors';

interface Props {
  data: DecidePhaseData;
}

export const DecidePanel: React.FC<Props> = ({ data }) => {
  const thresholdPct = Math.min(data.threshold, 100);
  const rollPct = Math.min(data.randomRoll, 100);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Decide</div>

      {/* Epsilon info */}
      <div style={styles.epsilonRow}>
        <span style={styles.paramLabel}>{'\u03B5'} = {data.epsilon.toFixed(4)}</span>
        <span style={styles.paramLabel}>threshold = {thresholdPct.toFixed(0)}</span>
      </div>

      {data.stateHasData ? (
        <>
          {/* Visual epsilon bar */}
          <div style={styles.barContainer}>
            <div style={styles.barTrack}>
              {/* Explore zone */}
              <div
                style={{
                  ...styles.barZone,
                  width: `${thresholdPct}%`,
                  backgroundColor: colors.accent.orange + '44',
                  borderRight: `2px solid ${colors.accent.orange}`,
                }}
              />
              {/* Roll marker */}
              <div
                style={{
                  ...styles.rollMarker,
                  left: `${rollPct}%`,
                  backgroundColor: data.isExploring ? colors.accent.orange : colors.accent.blue,
                }}
              />
            </div>
            <div style={styles.barLabels}>
              <span style={{ color: colors.accent.orange, fontSize: 9 }}>EXPLORE</span>
              <span style={{ color: colors.accent.blue, fontSize: 9 }}>EXPLOIT</span>
            </div>
          </div>

          {/* Roll result */}
          <div style={styles.rollResult}>
            Roll: <span style={{ fontWeight: 'bold' }}>{data.randomRoll}</span>
            {' '}
            {data.isExploring
              ? <span style={{ color: colors.accent.orange }}>&lt; {thresholdPct.toFixed(0)} {'\u2192'} EXPLORE</span>
              : <span style={{ color: colors.accent.blue }}>{'\u2265'} {thresholdPct.toFixed(0)} {'\u2192'} EXPLOIT</span>
            }
          </div>

          {/* Q-values table (always show when state has data) */}
          {!data.isExploring && (
            <>
              <div style={styles.sectionLabel}>Q-Values for State</div>
              <div style={styles.qRow}>
                {data.qValuesForState.map((v, i) => {
                  const isBest = data.bestIndices.includes(i);
                  const isChosen = i === data.chosenActionIndex;
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.qBox,
                        backgroundColor: isChosen ? colors.accent.blue + '33' : colors.bg.surface,
                        borderColor: isBest ? colors.accent.blue : colors.border.subtle,
                      }}
                    >
                      <div style={styles.qAction}>{ALL_MOVES[i]}</div>
                      <div style={{
                        ...styles.qValue,
                        color: v > 0 ? colors.accent.green : v < 0 ? colors.accent.red : colors.text.disabled,
                        fontWeight: isBest ? 'bold' : 'normal',
                      }}>
                        {v.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.bestIndices.length > 1 && (
                <div style={styles.tieInfo}>
                  Tied: {data.bestIndices.map(i => ALL_MOVES[i]).join(', ')}
                  {' '}{'\u2192'} tie-break roll: {data.tieBreakRoll} {'\u2192'} {data.chosenActionName}
                </div>
              )}
            </>
          )}

          {data.isExploring && (
            <div style={styles.randomInfo}>
              Random action roll: {data.randomActionRoll} {'\u2192'} {data.chosenActionName}
            </div>
          )}
        </>
      ) : (
        <div style={styles.noData}>
          State not in Q-matrix yet {'\u2192'} random action
          <div style={styles.randomInfo}>
            Random action roll: {data.randomActionRoll} {'\u2192'} {data.chosenActionName}
          </div>
        </div>
      )}

      {/* Final decision badge */}
      <div style={styles.decisionBadge}>
        <span style={{
          ...styles.badge,
          backgroundColor: data.isExploring ? colors.accent.orange + '33' : colors.accent.blue + '33',
          color: data.isExploring ? colors.accent.orange : colors.accent.blue,
          borderColor: data.isExploring ? colors.accent.orange : colors.accent.blue,
        }}>
          {data.chosenActionName}
          <span style={styles.badgeStrategy}>
            {data.isExploring ? ' (random)' : ' (greedy)'}
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
    color: colors.accent.orange,
    fontFamily: 'monospace',
  },
  epsilonRow: {
    display: 'flex',
    gap: 16,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  paramLabel: {
    color: colors.text.secondary,
  },
  barContainer: {
    maxWidth: 400,
  },
  barTrack: {
    position: 'relative',
    height: 20,
    backgroundColor: colors.accent.blue + '22',
    borderRadius: 3,
    overflow: 'visible',
  },
  barZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '3px 0 0 3px',
  },
  rollMarker: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 24,
    borderRadius: 2,
    transform: 'translateX(-1px)',
  },
  barLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 2,
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  rollResult: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text.primary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  qRow: {
    display: 'flex',
    gap: 4,
  },
  qBox: {
    flex: '1 1 0',
    padding: '4px 6px',
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 3,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  qAction: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  qValue: {
    fontSize: 11,
  },
  tieInfo: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  randomInfo: {
    fontSize: 11,
    color: colors.accent.orange,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  noData: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  decisionBadge: {
    marginTop: 4,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    border: '1px solid',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  badgeStrategy: {
    fontSize: 10,
    fontWeight: 'normal',
    opacity: 0.8,
  },
};

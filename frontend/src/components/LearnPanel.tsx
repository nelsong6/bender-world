/**
 * LearnPanel — Phase 4: Q-value update formula step-by-step.
 */
import React from 'react';
import type { LearnPhaseData } from '../engine/phase-data';
import { ALL_MOVES } from '../engine/types';
import { colors } from '../colors';

interface Props {
  data: LearnPhaseData;
}

export const LearnPanel: React.FC<Props> = ({ data }) => {
  const fmt = (v: number, decimals = 4) => v.toFixed(decimals);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Learn (Q-Update)</div>

      {/* Formula breakdown */}
      <div style={styles.formula}>
        <FormulaRow
          num={1}
          label={`oldBestValue = Q_best(State #${data.perceptionBefore})`}
          value={fmt(data.oldBestValue)}
        />
        <FormulaRow
          num={2}
          label={`newBestValue = Q_best(State #${data.perceptionAfter})`}
          value={fmt(data.newBestValue)}
        />
        <FormulaRow
          num={3}
          label={`difference = ${fmt(data.newBestValue)} \u2212 ${fmt(data.oldBestValue)}`}
          value={fmt(data.difference)}
        />
        <FormulaRow
          num={4}
          label={`discountFactor = \u03B3^(step\u22121) = ${fmt(data.gamma, 2)}^${data.stepNumber - 1}`}
          value={fmt(data.discountFactor)}
        />
        <FormulaRow
          num={5}
          label={`discounted = ${fmt(data.difference)} \u00D7 ${fmt(data.discountFactor)}`}
          value={fmt(data.discountedDifference)}
        />
        <FormulaRow
          num={6}
          label={`combined = ${fmt(data.discountedDifference)} + ${fmt(data.baseReward, 1)}`}
          value={fmt(data.combined)}
        />
        <FormulaRow
          num={7}
          label={`finalValue = \u03B7 \u00D7 ${fmt(data.combined)} = ${fmt(data.eta, 2)} \u00D7 ${fmt(data.combined)}`}
          value={fmt(data.finalValue)}
          highlight
        />
      </div>

      {/* Update result */}
      <div style={styles.updateResult}>
        Q[{data.perceptionBefore}][{data.actionName}] = {fmt(data.finalValue)}
        {data.wasUpdated
          ? <span style={{ color: colors.accent.green }}> {'\u2713'} Updated</span>
          : <span style={{ color: colors.text.tertiary }}> {'\u2014'} No update (value = 0)</span>
        }
      </div>

      {/* Before/after Q-row */}
      <div style={styles.sectionLabel}>Q-Row for State #{data.perceptionBefore}</div>
      <div style={styles.qCompare}>
        <div style={styles.qCompareRow}>
          <span style={styles.qCompareLabel}>Before</span>
          {data.qRowBefore.map((v, i) => {
            const changed = data.qRowBefore[i] !== data.qRowAfter[i];
            return (
              <div key={i} style={{
                ...styles.qCell,
                borderColor: changed ? colors.accent.purple : colors.border.subtle,
              }}>
                <div style={styles.qCellAction}>{ALL_MOVES[i]}</div>
                <div style={{
                  ...styles.qCellValue,
                  color: v > 0 ? colors.accent.green : v < 0 ? colors.accent.red : colors.text.disabled,
                }}>
                  {v.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={styles.qCompareRow}>
          <span style={styles.qCompareLabel}>After</span>
          {data.qRowAfter.map((v, i) => {
            const changed = data.qRowBefore[i] !== data.qRowAfter[i];
            return (
              <div key={i} style={{
                ...styles.qCell,
                borderColor: changed ? colors.accent.purple : colors.border.subtle,
                backgroundColor: changed ? colors.accent.purple + '22' : 'transparent',
              }}>
                <div style={styles.qCellAction}>{ALL_MOVES[i]}</div>
                <div style={{
                  ...styles.qCellValue,
                  color: v > 0 ? colors.accent.green : v < 0 ? colors.accent.red : colors.text.disabled,
                  fontWeight: changed ? 'bold' : 'normal',
                }}>
                  {v.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FormulaRow: React.FC<{
  num: number;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ num, label, value, highlight }) => (
  <div style={{
    ...formulaStyles.row,
    backgroundColor: highlight ? colors.accent.purple + '22' : 'transparent',
  }}>
    <span style={formulaStyles.num}>{num}.</span>
    <span style={formulaStyles.label}>{label}</span>
    <span style={formulaStyles.eq}>=</span>
    <span style={{
      ...formulaStyles.value,
      color: highlight ? colors.accent.purple : colors.text.primary,
      fontWeight: highlight ? 'bold' : 'normal',
    }}>
      {value}
    </span>
  </div>
);

const formulaStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    padding: '2px 6px',
    borderRadius: 2,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  num: {
    color: colors.text.disabled,
    minWidth: 16,
    textAlign: 'right',
  },
  label: {
    color: colors.text.secondary,
    flex: 1,
  },
  eq: {
    color: colors.text.disabled,
  },
  value: {
    minWidth: 70,
    textAlign: 'right',
  },
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
    color: colors.accent.purple,
    fontFamily: 'monospace',
  },
  formula: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  updateResult: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
    padding: '4px 6px',
    backgroundColor: colors.bg.surface,
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  qCompare: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  qCompareRow: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  qCompareLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    minWidth: 40,
  },
  qCell: {
    flex: '1 1 0',
    padding: '3px 4px',
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 3,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  qCellAction: {
    fontSize: 8,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  qCellValue: {
    fontSize: 10,
  },
};

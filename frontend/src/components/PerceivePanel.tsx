/**
 * PerceivePanel — Phase 0: Shows sensor readings and base-3 encoding.
 */
import React from 'react';
import type { PerceivePhaseData } from '../engine/phase-data';
import { PerceptionDisplay } from './PerceptionDisplay';
import { colors } from '../colors';

interface Props {
  data: PerceivePhaseData;
}

export const PerceivePanel: React.FC<Props> = ({ data }) => {
  const total = data.encodingDigits.reduce((sum, d) => sum + d.contribution, 0);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Perceive</div>
      <div style={styles.subtitle}>
        Bender reads 5 sensors at position ({data.benderPosition[0] + 1}, {data.benderPosition[1] + 1})
      </div>

      {/* Reuse existing PerceptionDisplay compass rose */}
      <div style={styles.compassWrap}>
        <PerceptionDisplay
          perceptionKey={data.perceptionKey}
          benderPosition={data.benderPosition}
        />
      </div>

      {/* Base-3 encoding table */}
      <div style={styles.sectionLabel}>Base-3 Encoding</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Direction</th>
            <th style={styles.th}>Percept</th>
            <th style={styles.th}>Digit</th>
            <th style={styles.th}>Weight</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Contribution</th>
          </tr>
        </thead>
        <tbody>
          {data.encodingDigits.map((d, i) => (
            <tr key={i}>
              <td style={styles.td}>{d.direction}</td>
              <td style={{ ...styles.td, color: perceptColor(d.percept) }}>{d.percept}</td>
              <td style={styles.td}>{d.digitValue}</td>
              <td style={styles.td}>{d.weight}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>{d.contribution}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Total</td>
            <td style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', color: colors.accent.teal }}>
              {total}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={styles.stateId}>
        State #{data.perceptionId}
      </div>
    </div>
  );
};

function perceptColor(percept: string): string {
  switch (percept) {
    case 'Wall': return colors.accent.red;
    case 'Can': return colors.accent.gold;
    default: return colors.text.secondary;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent.teal,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  compassWrap: {
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  table: {
    borderCollapse: 'collapse',
    fontFamily: 'monospace',
    fontSize: 11,
    width: '100%',
    maxWidth: 400,
  },
  th: {
    textAlign: 'left',
    padding: '3px 8px',
    color: colors.text.tertiary,
    borderBottom: `1px solid ${colors.border.subtle}`,
    fontSize: 10,
    fontWeight: 'normal',
    textTransform: 'uppercase',
  },
  td: {
    padding: '3px 8px',
    color: colors.text.primary,
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  stateId: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.accent.teal,
    fontFamily: 'monospace',
    marginTop: 4,
  },
};

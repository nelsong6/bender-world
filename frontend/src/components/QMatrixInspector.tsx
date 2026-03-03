import React, { useMemo } from 'react';
import { QMatrix } from '../engine/q-matrix';
import { ALL_MOVES } from '../engine/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QMatrixInspectorProps {
  qMatrix: QMatrix | null;
  currentPerceptionId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS = ALL_MOVES.map((m) => {
  switch (m) {
    case 'Left':
      return 'L';
    case 'Right':
      return 'R';
    case 'Up':
      return 'U';
    case 'Down':
      return 'D';
    case 'Grab':
      return 'G';
    default:
      return m;
  }
});

const MAX_VISIBLE_ROWS = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QMatrixInspector: React.FC<QMatrixInspectorProps> = ({
  qMatrix,
  currentPerceptionId,
}) => {
  const stateData = useMemo(() => {
    if (!qMatrix) return [];

    const stateIds = qMatrix.getStateIds();
    return stateIds.map((id) => ({
      id,
      values: qMatrix.getValues(id),
    }));
  }, [qMatrix]);

  const entryCount = qMatrix ? qMatrix.getEntryCount() : 0;

  if (!qMatrix) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Q-Matrix</h3>
        <div style={styles.empty}>Start training to see Q-values</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Q-Matrix{' '}
        <span style={styles.count}>({entryCount} states)</span>
      </h3>
      {currentPerceptionId && (
        <div style={styles.currentState}>
          Current: <span style={styles.currentStateValue}>{currentPerceptionId}</span>
        </div>
      )}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>State</th>
              {ACTION_LABELS.map((label) => (
                <th key={label} style={styles.th}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stateData.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>
                  No entries yet
                </td>
              </tr>
            ) : (
              stateData.map((entry) => {
                const isCurrentStr = currentPerceptionId === String(entry.id);
                const bestValue = Math.max(...entry.values);
                const hasBestValue = bestValue !== 0;

                return (
                  <tr
                    key={entry.id}
                    style={isCurrentStr ? styles.highlightRow : undefined}
                  >
                    <td
                      style={{
                        ...styles.td,
                        ...styles.stateIdCell,
                        ...(isCurrentStr ? styles.highlightCell : {}),
                      }}
                    >
                      {entry.id}
                    </td>
                    {entry.values.map((val, idx) => {
                      const isBest = hasBestValue && val === bestValue && val !== 0;
                      return (
                        <td
                          key={idx}
                          style={{
                            ...styles.td,
                            ...styles.valueCell,
                            ...(isBest ? styles.bestValueCell : {}),
                            ...(val > 0
                              ? styles.positiveValue
                              : val < 0
                                ? styles.negativeValue
                                : styles.zeroValue),
                          }}
                        >
                          {val.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
  count: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'normal',
  },
  currentState: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  currentStateValue: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  tableWrapper: {
    maxHeight: `${MAX_VISIBLE_ROWS * 28 + 32}px`,
    overflowY: 'auto' as const,
    borderRadius: 4,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  th: {
    position: 'sticky' as const,
    top: 0,
    backgroundColor: '#252540',
    color: '#aaa',
    padding: '6px 4px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #444',
    fontSize: 11,
    zIndex: 1,
  },
  td: {
    padding: '4px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #2a2a3e',
  },
  stateIdCell: {
    color: '#ccc',
    fontWeight: 'bold',
    textAlign: 'left' as const,
    paddingLeft: 8,
  },
  valueCell: {
    fontSize: 10,
  },
  positiveValue: {
    color: '#4caf50',
  },
  negativeValue: {
    color: '#f44336',
  },
  zeroValue: {
    color: '#555',
  },
  bestValueCell: {
    fontWeight: 'bold',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  highlightRow: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  highlightCell: {
    color: '#4caf50',
  },
  empty: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    padding: '16px 0',
    textAlign: 'center' as const,
  },
  emptyTd: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center' as const,
  },
};

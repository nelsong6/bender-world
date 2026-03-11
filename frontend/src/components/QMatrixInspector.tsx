import React, { useMemo, useState, useEffect } from 'react';
import { QMatrix } from '../engine/q-matrix';
import { ALL_MOVES, Percept } from '../engine/types';
import {
  getPerceptsById,
  getPerceptionKeyFromPercepts,
  getPerceptionId,
  getPerceptionKeyById,
} from '../engine/perception';
import type { PerceptionStateData } from '../engine/perception';

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
    case 'Left': return 'L';
    case 'Right': return 'R';
    case 'Up': return 'U';
    case 'Down': return 'D';
    case 'Grab': return 'G';
    default: return m;
  }
});

const ACTION_FULL_NAMES = ['Left', 'Right', 'Up', 'Down', 'Grab'];

const PERCEPT_OPTIONS: Percept[] = [Percept.Wall, Percept.Empty, Percept.Can];

const MAX_VISIBLE_ROWS = 20;

const PERCEPT_COLORS: Record<string, string> = {
  Wall: '#f44336',
  Can: '#ffd700',
  Empty: '#666',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QMatrixInspector: React.FC<QMatrixInspectorProps> = ({
  qMatrix,
  currentPerceptionId,
}) => {
  // Interactive selector state
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectorPercepts, setSelectorPercepts] = useState<PerceptionStateData | null>(null);

  const stateData = useMemo(() => {
    if (!qMatrix) return [];
    const stateIds = qMatrix.getStateIds();
    return stateIds.map((id) => ({
      id,
      values: qMatrix.getValues(id),
    }));
  }, [qMatrix]);

  const entryCount = qMatrix ? qMatrix.getEntryCount() : 0;

  // When current perception changes, auto-update selector to match
  useEffect(() => {
    if (!currentPerceptionId || !qMatrix) return;
    const id = getPerceptionId(currentPerceptionId);
    if (id >= 0) {
      setSelectedStateId(id);
      const percepts = getPerceptsById(id);
      if (percepts) setSelectorPercepts(percepts);
    }
  }, [currentPerceptionId, qMatrix]);

  // Handle percept dropdown change
  const handlePerceptChange = (direction: string, value: Percept) => {
    if (!selectorPercepts) return;
    const updated = { ...selectorPercepts, [direction]: value };
    setSelectorPercepts(updated);

    const key = getPerceptionKeyFromPercepts(
      updated.Left, updated.Right, updated.Down, updated.Up, updated.Grab,
    );
    const id = getPerceptionId(key);
    if (id >= 0) {
      setSelectedStateId(id);
    }
  };

  // Handle full state dropdown change
  const handleStateDropdownChange = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    setSelectedStateId(id);
    const percepts = getPerceptsById(id);
    if (percepts) setSelectorPercepts(percepts);
  };

  // Get Q-values for selected state
  const selectedValues = useMemo(() => {
    if (!qMatrix || selectedStateId === null) return null;
    if (!qMatrix.hasState(selectedStateId)) return null;
    return qMatrix.getValues(selectedStateId);
  }, [qMatrix, selectedStateId]);

  if (!qMatrix) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Q-Matrix</h3>
        <div style={styles.empty}>Start training to see Q-values</div>
      </div>
    );
  }

  const bestSelectedValue = selectedValues ? Math.max(...selectedValues) : 0;
  const hasBestSelected = bestSelectedValue !== 0;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Q-Matrix{' '}
        <span style={styles.count}>({entryCount} states)</span>
      </h3>

      {/* Interactive State Selector */}
      <div style={styles.selectorSection}>
        {/* Full state dropdown */}
        <div style={styles.selectorRow}>
          <label style={styles.selectorLabel}>State:</label>
          <select
            style={styles.stateDropdown}
            value={selectedStateId !== null ? String(selectedStateId) : ''}
            onChange={(e) => handleStateDropdownChange(e.target.value)}
          >
            <option value="">Select...</option>
            {stateData.map((entry) => (
              <option key={entry.id} value={String(entry.id)}>
                {entry.id} - {getPerceptionKeyById(entry.id)}
              </option>
            ))}
          </select>
        </div>

        {/* Per-direction percept dropdowns */}
        {selectorPercepts && (
          <div style={styles.perceptRow}>
            {(['Left', 'Right', 'Down', 'Up', 'Grab'] as const).map((dir) => (
              <div key={dir} style={styles.perceptDropdownGroup}>
                <span style={styles.perceptLabel}>{dir === 'Grab' ? 'Here' : dir}</span>
                <select
                  style={{
                    ...styles.perceptDropdown,
                    color: PERCEPT_COLORS[selectorPercepts[dir]] || '#ccc',
                  }}
                  value={selectorPercepts[dir]}
                  onChange={(e) => handlePerceptChange(dir, e.target.value as Percept)}
                >
                  {PERCEPT_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Selected state Q-values detail */}
        {selectedValues && (
          <div style={styles.detailRow}>
            {selectedValues.map((val, idx) => {
              const isBest = hasBestSelected && val === bestSelectedValue && val !== 0;
              return (
                <div key={idx} style={styles.detailItem}>
                  <span style={styles.detailLabel}>{ACTION_FULL_NAMES[idx]}</span>
                  <span style={{
                    ...styles.detailValue,
                    ...(isBest ? styles.bestDetailValue : {}),
                    color: val > 0 ? '#4caf50' : val < 0 ? '#f44336' : '#555',
                  }}>
                    {val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {selectedStateId !== null && !selectedValues && (
          <div style={styles.noData}>State {selectedStateId} has no Q-values yet</div>
        )}
      </div>

      {/* Current perception indicator */}
      {currentPerceptionId && (
        <div style={styles.currentState}>
          Current: <span style={styles.currentStateValue}>{currentPerceptionId}</span>
        </div>
      )}

      {/* Existing table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '25%' }}>State</th>
              {ACTION_LABELS.map((label) => (
                <th key={label} style={{ ...styles.th, width: '15%' }}>
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
                const isSelected = selectedStateId === entry.id;
                const bestValue = Math.max(...entry.values);
                const hasBestValue = bestValue !== 0;

                return (
                  <tr
                    key={entry.id}
                    style={{
                      ...(isCurrentStr ? styles.highlightRow : undefined),
                      ...(isSelected && !isCurrentStr ? styles.selectedRow : undefined),
                      cursor: 'pointer',
                    }}
                    onClick={() => handleStateDropdownChange(String(entry.id))}
                  >
                    <td
                      style={{
                        ...styles.td,
                        ...styles.stateIdCell,
                        ...(isCurrentStr ? styles.highlightCell : {}),
                        ...(isSelected && !isCurrentStr ? styles.selectedCell : {}),
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
  // Selector section
  selectorSection: {
    backgroundColor: '#252540',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    border: '1px solid #333',
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  selectorLabel: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap' as const,
  },
  stateDropdown: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #444',
    borderRadius: 3,
    padding: '3px 6px',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  perceptRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 6,
    flexWrap: 'wrap' as const,
  },
  perceptDropdownGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: '1 1 auto',
    minWidth: 50,
  },
  perceptLabel: {
    color: '#888',
    fontSize: 9,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  perceptDropdown: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: 3,
    padding: '2px 4px',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  detailItem: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    padding: '4px 6px',
    minWidth: 50,
  },
  detailLabel: {
    color: '#888',
    fontSize: 9,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  bestDetailValue: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 2,
    padding: '0 4px',
  },
  noData: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: 4,
  },
  // Current state
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
  // Table
  tableWrapper: {
    maxHeight: `${MAX_VISIBLE_ROWS * 28 + 32}px`,
    overflowY: 'auto' as const,
    borderRadius: 4,
  },
  table: {
    width: '100%',
    tableLayout: 'fixed' as const,
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
  selectedRow: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  highlightCell: {
    color: '#4caf50',
  },
  selectedCell: {
    color: '#2196f3',
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

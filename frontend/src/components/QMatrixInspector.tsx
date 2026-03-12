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
import { colors } from '../colors';

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
  Wall: colors.perception.wall,
  Can: colors.perception.can,
  Empty: colors.perception.empty,
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
                    color: PERCEPT_COLORS[selectorPercepts[dir]] || colors.text.secondary,
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
        {selectedStateId !== null && (
          <div style={styles.detailRow}>
            {(selectedValues ?? [0, 0, 0, 0, 0]).map((val, idx) => {
              const isBest = selectedValues && hasBestSelected && val === bestSelectedValue && val !== 0;
              return (
                <div key={idx} style={styles.detailItem}>
                  <span style={styles.detailLabel}>{ACTION_FULL_NAMES[idx]}</span>
                  <span style={{
                    ...styles.detailValue,
                    ...(isBest ? styles.bestDetailValue : {}),
                    color: val > 0 ? colors.qValue.positive : val < 0 ? colors.qValue.negative : colors.text.disabled,
                  }}>
                    {val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
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
    backgroundColor: colors.bg.raised,
    borderRadius: 8,
    padding: 12,
    border: `1px solid ${colors.border.subtle}`,
  },
  title: {
    margin: '0 0 8px 0',
    color: colors.text.primary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  count: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: 'normal',
  },
  // Selector section
  selectorSection: {
    backgroundColor: colors.bg.overlay,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    border: `1px solid ${colors.border.subtle}`,
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  selectorLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap' as const,
  },
  stateDropdown: {
    flex: 1,
    backgroundColor: colors.bg.base,
    color: colors.text.primary,
    border: `1px solid ${colors.border.strong}`,
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
    flex: '1 1 0',
    minWidth: 50,
  },
  perceptLabel: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  perceptDropdown: {
    width: '100%',
    backgroundColor: colors.bg.base,
    border: `1px solid ${colors.border.strong}`,
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
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    backgroundColor: colors.bg.base,
    borderRadius: 3,
    padding: '4px 6px',
    minWidth: 50,
  },
  detailLabel: {
    color: colors.text.tertiary,
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
    backgroundColor: 'rgba(95, 214, 77, 0.2)',
    borderRadius: 2,
    padding: '0 4px',
  },
  noData: {
    color: colors.text.disabled,
    fontSize: 10,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: 4,
  },
  // Current state
  currentState: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  currentStateValue: {
    color: colors.accent.green,
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
    backgroundColor: colors.bg.overlay,
    color: colors.text.secondary,
    padding: '6px 4px',
    textAlign: 'center' as const,
    borderBottom: `1px solid ${colors.border.strong}`,
    fontSize: 11,
    zIndex: 1,
  },
  td: {
    padding: '4px',
    textAlign: 'center' as const,
    borderBottom: `1px solid ${colors.border.subtle}`,
  },
  stateIdCell: {
    color: colors.text.secondary,
    fontWeight: 'bold',
    textAlign: 'left' as const,
    paddingLeft: 8,
  },
  valueCell: {
    fontSize: 10,
  },
  positiveValue: {
    color: colors.qValue.positive,
  },
  negativeValue: {
    color: colors.qValue.negative,
  },
  zeroValue: {
    color: colors.text.disabled,
  },
  bestValueCell: {
    fontWeight: 'bold',
    backgroundColor: 'rgba(95, 214, 77, 0.1)',
  },
  highlightRow: {
    backgroundColor: 'rgba(95, 214, 77, 0.15)',
  },
  selectedRow: {
    backgroundColor: 'rgba(77, 166, 255, 0.15)',
  },
  highlightCell: {
    color: colors.accent.green,
  },
  selectedCell: {
    color: colors.accent.blue,
  },
  empty: {
    color: colors.text.disabled,
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    padding: '16px 0',
    textAlign: 'center' as const,
  },
  emptyTd: {
    color: colors.text.disabled,
    fontSize: 12,
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center' as const,
  },
};

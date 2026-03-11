import React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PerceptionDisplayProps {
  perceptionKey: string;
  benderPosition: [number, number] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedPercepts {
  L: string;
  R: string;
  D: string;
  Up: string;
  Gr: string;
}

function parsePerception(perceptionKey: string): ParsedPercepts | null {
  const result: Record<string, string> = {};
  const regex = /\[(\w+): (\w+)\]/g;
  let match;
  while ((match = regex.exec(perceptionKey)) !== null) {
    result[match[1]] = match[2];
  }
  if (!result.L || !result.R || !result.D || !result.Up || !result.Gr) return null;
  return result as unknown as ParsedPercepts;
}

const PERCEPT_COLORS: Record<string, string> = {
  Wall: '#f44336',
  Can: '#ffd700',
  Empty: '#666',
};

function perceptStyle(percept: string): React.CSSProperties {
  return {
    color: PERCEPT_COLORS[percept] || '#888',
    fontWeight: 'bold',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PerceptionDisplay: React.FC<PerceptionDisplayProps> = ({ perceptionKey, benderPosition }) => {
  if (!perceptionKey || !benderPosition) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Current Perception</h3>
        <div style={styles.empty}>No step data yet</div>
      </div>
    );
  }

  const percepts = parsePerception(perceptionKey);
  const [bx, by] = benderPosition;

  if (!percepts) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Current Perception</h3>
        <div style={styles.id}>{perceptionKey}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Current Perception
        <span style={styles.position}> ({bx + 1}, {by + 1})</span>
      </h3>
      {/* Compass-rose layout */}
      <div style={styles.compassGrid}>
        {/* Row 1: Up */}
        <div style={styles.compassCell} />
        <div style={{ ...styles.compassCell, ...styles.compassCenter }}>
          <span style={styles.dirLabel}>Up</span>
          <span style={perceptStyle(percepts.Up)}>{percepts.Up}</span>
        </div>
        <div style={styles.compassCell} />

        {/* Row 2: Left, Current, Right */}
        <div style={{ ...styles.compassCell, ...styles.compassCenter }}>
          <span style={styles.dirLabel}>Left</span>
          <span style={perceptStyle(percepts.L)}>{percepts.L}</span>
        </div>
        <div style={{ ...styles.compassCell, ...styles.compassCenterMain }}>
          <span style={styles.dirLabel}>Here</span>
          <span style={perceptStyle(percepts.Gr)}>{percepts.Gr}</span>
        </div>
        <div style={{ ...styles.compassCell, ...styles.compassCenter }}>
          <span style={styles.dirLabel}>Right</span>
          <span style={perceptStyle(percepts.R)}>{percepts.R}</span>
        </div>

        {/* Row 3: Down */}
        <div style={styles.compassCell} />
        <div style={{ ...styles.compassCell, ...styles.compassCenter }}>
          <span style={styles.dirLabel}>Down</span>
          <span style={perceptStyle(percepts.D)}>{percepts.D}</span>
        </div>
        <div style={styles.compassCell} />
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
  position: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: 'normal',
  },
  compassGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 2,
    maxWidth: 240,
    margin: '0 auto',
  },
  compassCell: {
    minHeight: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  compassCenter: {
    backgroundColor: '#252540',
    borderRadius: 4,
    padding: '4px 8px',
  },
  compassCenterMain: {
    backgroundColor: '#2a2a5a',
    borderRadius: 4,
    padding: '4px 8px',
    border: '1px solid #4caf50',
  },
  dirLabel: {
    color: '#888',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  empty: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  id: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
};

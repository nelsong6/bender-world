import React from 'react';
import type { RunSummary } from '../api/client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RunHistoryProps {
  runs: RunSummary[];
  onLoadRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatConfig(config: RunSummary['config']): string {
  return `e=${config.epsilon} g=${config.gamma} n=${config.eta} ep=${config.episodeLimit}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#4caf50';
    case 'running':
      return '#ff9800';
    case 'failed':
      return '#f44336';
    default:
      return '#888';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RunHistory: React.FC<RunHistoryProps> = ({
  runs,
  onLoadRun,
  onDeleteRun,
  isAuthenticated,
  loading,
}) => {
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        Saved Runs{' '}
        <span style={styles.count}>({runs.length})</span>
      </h3>

      {loading && <div style={styles.loading}>Loading...</div>}

      {!loading && runs.length === 0 && (
        <div style={styles.empty}>No saved runs yet</div>
      )}

      <div style={styles.list}>
        {runs.map((run) => (
          <div key={run.id} style={styles.runItem}>
            <div style={styles.runHeader}>
              <span style={styles.runDate}>{formatDate(run.createdAt)}</span>
              <span
                style={{
                  ...styles.runStatus,
                  color: getStatusColor(run.status),
                }}
              >
                {run.status}
              </span>
            </div>
            <div style={styles.runConfig}>{formatConfig(run.config)}</div>
            {run.summary && (
              <div style={styles.runSummary}>
                {run.summary.totalEpisodes} episodes, avg reward:{' '}
                {run.summary.finalAvgReward?.toFixed(1) ?? 'N/A'}
              </div>
            )}
            <div style={styles.runActions}>
              <button
                onClick={() => onLoadRun(run.id)}
                style={styles.loadButton}
              >
                Load
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this run?')) {
                    onDeleteRun(run.id);
                  }
                }}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
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
  count: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'normal',
  },
  loading: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center' as const,
    padding: 12,
  },
  empty: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: 16,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    maxHeight: 300,
    overflowY: 'auto' as const,
  },
  runItem: {
    backgroundColor: '#252540',
    borderRadius: 6,
    padding: '10px 12px',
    border: '1px solid #333',
  },
  runHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  runDate: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  runStatus: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  runConfig: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  runSummary: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  runActions: {
    display: 'flex',
    gap: 6,
  },
  loadButton: {
    padding: '4px 10px',
    backgroundColor: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '4px 10px',
    backgroundColor: 'transparent',
    color: '#f44336',
    border: '1px solid #f44336',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
  },
};

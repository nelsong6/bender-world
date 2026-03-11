import React from 'react';
import { colors } from '../colors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TabId = 'overview' | 'inspect' | 'walkthrough';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'walkthrough', label: 'Walkthrough' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div style={styles.container}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            ...styles.tab,
            ...(activeTab === tab.id ? styles.activeTab : {}),
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 2,
    backgroundColor: colors.bg.raised,
    borderRadius: 8,
    padding: 3,
    border: `1px solid ${colors.border.subtle}`,
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: colors.text.tertiary,
    transition: 'all 0.15s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  activeTab: {
    backgroundColor: colors.bg.overlay,
    color: colors.text.primary,
    boxShadow: `0 0 8px ${colors.interactive.activeGlow}`,
  },
};

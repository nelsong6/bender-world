import React from 'react';
import { colors } from '../colors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TabId = 'getting-started' | 'config' | 'granular' | 'chart' | 'glossary';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; help: string }[] = [
  { id: 'getting-started', label: 'Getting Started', help: 'Introduction, help bar guide, and quick-start buttons' },
  { id: 'config', label: 'Config', help: 'Q-Learning parameters: epsilon, gamma, eta, episode/step limits, and presets' },
  { id: 'granular', label: 'Granular Step', help: 'Phase-by-phase walkthrough: see exactly how Bender perceives, decides, acts, gets rewarded, and learns at each step' },
  { id: 'chart', label: 'Full Step', help: 'Episode-level view: board, chart, and status side by side' },
  { id: 'glossary', label: 'Help / Glossary', help: 'Reinforcement learning concepts, controls reference, and glossary of terms' },
];

// ---------------------------------------------------------------------------
// Component — vertical sidebar tabs (matches eight-queens pattern)
// ---------------------------------------------------------------------------

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div style={styles.bar}>
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            style={{
              ...styles.wrapper,
              ...(isActive ? styles.wrapperActive : styles.wrapperInactive),
              ...(isActive && index === 0 ? { borderTop: 'none' } : {}),
            }}
          >
            <button
              onClick={() => onTabChange(tab.id)}
              data-help={tab.help}
              style={{
                ...styles.tab,
                color: isActive ? colors.text.primary : colors.text.tertiary,
                fontWeight: isActive ? 'bold' : ('normal' as const),
              }}
            >
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'stretch',
    paddingBottom: 16,
    gap: 0,
  },
  wrapper: {
    padding: '1px 0 1px 1px',
    position: 'relative' as const,
    marginBottom: -1,
    zIndex: 0,
  },
  wrapperActive: {
    padding: 0,
    borderLeft: `1px solid ${colors.border.subtle}`,
    borderTop: `1px solid ${colors.border.subtle}`,
    borderBottom: `1px solid ${colors.border.subtle}`,
    borderRight: 'none',
    backgroundColor: colors.bg.raised,
    marginRight: -1,
    zIndex: 1,
  },
  wrapperInactive: {},
  tab: {
    padding: '10px 16px',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: 'transparent',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    outline: 'none',
    border: 'none',
    width: '100%',
    display: 'block' as const,
    whiteSpace: 'nowrap' as const,
    letterSpacing: 0.3,
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
};

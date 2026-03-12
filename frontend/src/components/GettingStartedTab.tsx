import React from 'react';
import { colors } from '../colors';
import { Board } from './Board';

interface Props {
  onStartGranular: () => void;
  onStartFull: () => void;
  onOpenGlossary: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const GettingStartedTab: React.FC<Props> = ({ onStartGranular, onStartFull, onOpenGlossary }) => {
  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <div style={styles.twoCol}>
          <div style={styles.leftCol}>
            {/* Primary CTA at the very top — this is the first thing users see.
                The granular step flow is the core experience (see Intended User Flow). */}
            <div style={styles.ctaBox}>
              <div style={styles.buttonRow}>
                <button style={styles.primaryBtn} onClick={onStartGranular}>
                  Watch Bender Learn →
                </button>
                <button style={styles.secondaryBtn} onClick={onStartFull}>
                  Full Run (advanced) →
                </button>
              </div>
              <p style={styles.ctaHint}>
                Step through each action one by one — see what Bender perceives, which action he picks,
                and how Q-values update in real time.
              </p>
            </div>

            <h2 style={styles.pageTitle}>Getting Started</h2>
            <p style={styles.intro}>
              BenderWorld is a Q-Learning reinforcement learning visualizer. Watch Bender learn to
              collect beer cans on a 10×10 grid — step through each move to see exactly how
              Q-values evolve.
            </p>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Using the Help Bar</div>
              <div style={styles.sectionBody}>
                <p style={styles.para}>
                  Hover over any labeled element in the app to see a description in the help bar just
                  below the title.
                </p>
                <p style={styles.para}>
                  Press <kbd style={styles.kbd}>s</kbd> to <span style={styles.strong}>pin</span> the
                  help text. While pinned, key terms show a{' '}
                  <span style={styles.glossaryHint}>See in Glossary →</span> link you can click to jump
                  directly to the definition.
                </p>
                <p style={{ ...styles.para, margin: 0 }}>
                  Press <kbd style={styles.kbd}>s</kbd> again to unpin and resume following the mouse.
                </p>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>How It Works</div>
              <div style={styles.sectionBody}>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Grid</span>
                  <span style={styles.termVal}>10×10 board with beer cans (~50% density) and walls around the edges.</span>
                </div>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Beer Can</span>
                  <span style={styles.termVal}>Collecting a can gives +10 reward. Grabbing an empty cell gives −1.</span>
                </div>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Wall</span>
                  <span style={styles.termVal}>Moving into a wall gives −5 reward and Bender stays put.</span>
                </div>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Episode</span>
                  <span style={styles.termVal}>One complete run on the board (up to the step limit). The board resets each episode.</span>
                </div>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Q-Value</span>
                  <span style={styles.termVal}>Expected reward for taking an action in a given state. Higher = better.</span>
                </div>
                <div style={styles.termRow}>
                  <span style={styles.termKey}>Epsilon (ε)</span>
                  <span style={styles.termVal}>Exploration rate. Probability of a random action instead of the greedy best.</span>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionHeader}>Reference</div>
              <div style={styles.sectionBody}>
                <p style={{ ...styles.para, margin: 0 }}>
                  Unfamiliar with reinforcement learning or the terminology used in this app?{' '}
                  <button style={styles.linkBtn} onClick={onOpenGlossary}>
                    Browse Help &amp; Glossary →
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div style={styles.rightCol}>
            <div style={styles.boardWidget}>
              <div style={styles.boardLabel}>Bender's 10×10 Grid</div>
              <Board boardState={null} />
              <p style={styles.boardHint}>
                Bender perceives 5 adjacent cells (N/S/E/W + current), each as Wall, Can, or Empty.
                With 3⁵ = 243 possible perceptions and 5 actions, the Q-matrix has 1,215 entries to learn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  inner: {
    maxWidth: 920,
    margin: '0 auto',
    fontFamily: 'monospace',
  },
  twoCol: {
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  rightCol: {
    flexShrink: 0,
    width: 384,
  },
  boardWidget: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  boardLabel: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: colors.text.primary,
    letterSpacing: 0.2,
    alignSelf: 'flex-start',
  },
  boardHint: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.text.tertiary,
    lineHeight: '1.6',
    textAlign: 'center' as const,
    margin: 0,
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: 20,
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  intro: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  ctaBox: {
    marginBottom: 20,
    padding: '16px 18px 12px',
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 6,
    backgroundColor: colors.bg.surface,
  },
  ctaHint: {
    fontSize: 11,
    color: colors.text.tertiary,
    lineHeight: '1.7',
    margin: '10px 0 0 0',
  },
  section: {
    marginBottom: 16,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '10px 14px',
    backgroundColor: colors.bg.raised,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  sectionBody: {
    padding: '12px 16px',
    backgroundColor: colors.bg.surface,
  },
  para: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: '1.7',
    margin: '0 0 10px 0',
  },
  hint: {
    fontSize: 11,
    color: colors.text.tertiary,
    lineHeight: '1.7',
    margin: '12px 0 0 0',
  },
  kbd: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: colors.bg.overlay,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 3,
    color: colors.text.primary,
  },
  strong: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  glossaryHint: {
    color: colors.accent.purple,
    fontWeight: 'bold',
    fontSize: 11,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    margin: '8px 0',
    flexWrap: 'wrap' as const,
  },
  primaryBtn: {
    padding: '10px 20px',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    backgroundColor: colors.accent.purple,
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    padding: '10px 20px',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: colors.bg.raised,
    color: colors.text.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: 5,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  linkBtn: {
    padding: 0,
    fontSize: 12,
    fontFamily: 'monospace',
    background: 'none',
    border: 'none',
    color: colors.accent.purple,
    cursor: 'pointer',
    textDecoration: 'underline',
    letterSpacing: 0.2,
  },
  termRow: {
    display: 'flex',
    gap: 12,
    padding: '5px 0',
    borderBottom: `1px solid ${colors.border.subtle}`,
    fontSize: 12,
  },
  termKey: {
    color: colors.accent.purple,
    fontWeight: 'bold',
    whiteSpace: 'nowrap' as const,
    minWidth: 100,
    flexShrink: 0,
  },
  termVal: {
    color: colors.text.secondary,
    lineHeight: '1.5',
  },
};

// Centralized color palette for the BenderWorld app.
// All color values should be referenced from here — no raw hex/rgba in components.

export const colors = {
  // ── Backgrounds (layered from deepest to most elevated) ──
  bg: {
    base: '#0d0d1a',
    raised: '#14142b',
    surface: '#1c1c3a',
    overlay: '#252550',
  },

  // ── Borders ──
  border: {
    subtle: '#2a2a4e',
    strong: '#3a3a5e',
  },

  // ── Text ──
  text: {
    primary: '#e2e2ef',
    secondary: '#a0a0be',
    tertiary: '#6e6e8a',
    disabled: '#4a4a64',
  },

  // ── Accent colors ──
  accent: {
    green: '#4caf50',
    greenLight: '#66bb6a',
    gold: '#ffd700',
    blue: '#6bb8f0',
    orange: '#ff9800',
    red: '#f44336',
    teal: '#30c8b0',
    purple: '#7c6cf0',
  },

  // ── Board ──
  board: {
    background: '#1a1a2e',
    gridLine: '#333355',
    labelText: '#888',
    wallStroke: '#444',
    unexploredFill: '#c8c8c8',
    unexploredBorder: '#808080',
    exploredFill: '#c8c8c8',
    exploredBorder: '#3a6fb0',
    currentFill: '#c8c8c8',
    currentBorder: '#3a8a3a',
  },

  // ── Chart ──
  chart: {
    rewardLine: '#4caf50',
    rewardGlow: 'rgba(76, 175, 80, 0.35)',
    rewardFill: 'rgba(76, 175, 80, 0.08)',
    maLine: '#ff9800',
    maGlow: 'rgba(255, 152, 0, 0.3)',
    maFill: 'rgba(255, 152, 0, 0.06)',
    grid: 'rgba(124, 108, 240, 0.07)',
    axis: 'rgba(160, 160, 190, 0.5)',
    legend: 'rgba(180, 190, 230, 0.7)',
    tooltipBg: 'rgba(20, 20, 40, 0.92)',
    tooltipBorder: 'rgba(124, 108, 240, 0.2)',
    crosshair: 'rgba(160, 160, 190, 0.25)',
  },

  // ── Perception ──
  perception: {
    wall: '#f44336',
    can: '#ffd700',
    empty: '#666',
  },

  // ── Q-value heatmap ──
  qValue: {
    negative: '#f44336',
    zero: '#666',
    positive: '#4caf50',
    highlight: '#ffd700',
  },

  // ── Interactive states ──
  interactive: {
    hover: '#252550',
    selected: '#2e2e5a',
    activeGlow: 'rgba(124, 108, 240, 0.4)',
  },
} as const;

export type Colors = typeof colors;

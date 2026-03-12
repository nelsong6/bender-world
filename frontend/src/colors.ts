// Centralized color palette for the BenderWorld app.
// Futurama-themed: oxidized steel backgrounds, muted sage-green learning signals,
// warm beer-amber for cans, electric accents — grimy New New York control panel.
// All color values should be referenced from here — no raw hex/rgba in components.

export const colors = {
  // ── Backgrounds (layered from deepest to most elevated) ──
  // Grimy industrial control panels — dark oxidized steel
  bg: {
    base: '#0a0f14',
    raised: '#141f2a',
    surface: '#1a2a38',
    overlay: '#223d4e',
  },

  // ── Borders ──
  border: {
    subtle: '#2a3f52',
    strong: '#3d5666',
  },

  // ── Text ──
  text: {
    primary: '#d4e4f0',
    secondary: '#96aac0',
    tertiary: '#6a7c8a',
    disabled: '#4a5566',
  },

  // ── Accent colors ──
  accent: {
    green: '#5a8e70',
    greenLight: '#72a88a',
    gold: '#f5c842',
    blue: '#4da6ff',
    orange: '#ff8c3d',
    red: '#ff5555',
    teal: '#2fbfc9',
    purple: '#b876ff',
  },

  // ── Board ──
  board: {
    background: '#0f1820',
    gridLine: '#293d4d',
    labelText: '#7a8c9a',
    wallStroke: '#5a6f7f',
    unexploredFill: '#8c9cac',
    unexploredBorder: '#5a6a7a',
    exploredFill: '#8c9cac',
    exploredBorder: '#2fbfc9',
    currentFill: '#8c9cac',
    currentBorder: '#5a8e70',
  },

  // ── Chart ──
  chart: {
    rewardLine: '#5a8e70',
    rewardGlow: 'rgba(90, 142, 112, 0.4)',
    rewardFill: 'rgba(90, 142, 112, 0.1)',
    maLine: '#ff8c3d',
    maGlow: 'rgba(255, 140, 61, 0.35)',
    maFill: 'rgba(255, 140, 61, 0.08)',
    grid: 'rgba(77, 166, 255, 0.08)',
    axis: 'rgba(150, 170, 192, 0.45)',
    legend: 'rgba(184, 207, 230, 0.65)',
    tooltipBg: 'rgba(10, 15, 20, 0.94)',
    tooltipBorder: 'rgba(77, 166, 255, 0.25)',
    crosshair: 'rgba(150, 170, 192, 0.3)',
  },

  // ── Perception ──
  perception: {
    wall: '#ff5555',
    can: '#f5c842',
    empty: '#5a6f7f',
  },

  // ── Q-value heatmap ──
  qValue: {
    negative: '#ff5555',
    zero: '#5a6f7f',
    positive: '#5a8e70',
    highlight: '#f5c842',
  },

  // ── Interactive states ──
  interactive: {
    hover: '#2a4a62',
    selected: '#3a5a78',
    activeGlow: 'rgba(184, 118, 255, 0.45)',
  },
} as const;

export type Colors = typeof colors;

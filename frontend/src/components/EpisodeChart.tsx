import React, { useRef, useEffect } from 'react';
import type { EpisodeSummary } from '../engine/types';
import { colors } from '../colors';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  summariesRef: React.RefObject<EpisodeSummary[]>;
  playheadRef: React.RefObject<number>;
  lookaheadRef: React.RefObject<EpisodeSummary | null>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDING = { top: 28, right: 14, bottom: 22, left: 40 };

const C = {
  bg: colors.bg.base,
  grid: colors.chart.grid,
  axisText: colors.chart.axis,
  rewardLine: colors.chart.rewardLine,
  rewardGlow: colors.chart.rewardGlow,
  rewardFill: colors.chart.rewardFill,
  maLine: colors.chart.maLine,
  maGlow: colors.chart.maGlow,
  maFill: colors.chart.maFill,
  legendText: colors.chart.legend,
  tooltipBg: colors.chart.tooltipBg,
  tooltipBorder: colors.chart.tooltipBorder,
  crosshair: colors.chart.crosshair,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dataX(index: number, divisor: number, plotW: number): number {
  return PADDING.left + (index / divisor) * plotW;
}

/** Compute a running moving average from reward values. */
function computeMA(rewards: number[], windowSize: number): number[] {
  const ma: number[] = [];
  let sum = 0;
  for (let i = 0; i < rewards.length; i++) {
    sum += rewards[i];
    if (i >= windowSize) sum -= rewards[i - windowSize];
    ma.push(sum / Math.min(i + 1, windowSize));
  }
  return ma;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EpisodeChart: React.FC<Props> = ({ summariesRef, playheadRef, lookaheadRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number>(0);
  const sizeRef = useRef({ w: 400, h: 200 });
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const yMinAnimRef = useRef<number>(0);
  const yMaxAnimRef = useRef<number>(20);

  // Track container size via ResizeObserver
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        sizeRef.current = { w: Math.round(width), h: Math.round(height) };
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = sizeRef.current.w * dpr;
          canvas.height = sizeRef.current.h * dpr;
        }
      }
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // Track mouse for tooltip
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = null; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Persistent rAF draw loop — reads entirely from refs, no React render dependency
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = sizeRef.current.w * dpr;
    canvas.height = sizeRef.current.h * dpr;

    const drawFrame = () => {
      const summaries = summariesRef.current;
      const playhead = playheadRef.current;
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const PLOT_W = w - PADDING.left - PADDING.right;
      const PLOT_H = h - PADDING.top - PADDING.bottom;

      const curDpr = window.devicePixelRatio || 1;

      const lookahead = lookaheadRef.current;
      const maxDraw = lookahead ? summaries.length : summaries.length - 1;
      const drawUpTo = Math.min(playhead, maxDraw);
      const fullEps = Math.floor(drawUpTo);
      const frac = drawUpTo - fullEps;
      const visibleCount = Math.min(fullEps + 1, summaries.length);

      const xDiv = Math.max(drawUpTo + 1, 1);

      ctx.save();
      ctx.setTransform(curDpr, 0, 0, curDpr, 0, 0);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);

      const hasData = summaries.length > 0 && playhead >= 0;

      // Dynamic Y range from visible data
      let yMinTarget = 0;
      let yMaxTarget = 20;
      const hasTip = frac > 0 && fullEps < summaries.length;

      if (visibleCount >= 1) {
        let dataMin = Infinity;
        let dataMax = -Infinity;
        for (let i = 0; i < visibleCount; i++) {
          const r = summaries[i]!.totalReward;
          if (r < dataMin) dataMin = r;
          if (r > dataMax) dataMax = r;
        }
        // Also consider interpolated tip
        if (hasTip) {
          const nextSummary = fullEps + 1 < summaries.length
            ? summaries[fullEps + 1]!
            : lookahead;
          if (nextSummary) {
            const tipR = lerp(summaries[fullEps]!.totalReward, nextSummary.totalReward, frac);
            if (tipR < dataMin) dataMin = tipR;
            if (tipR > dataMax) dataMax = tipR;
          }
        }
        const range = dataMax - dataMin;
        const padding = Math.max(range * 0.1, 10);
        yMinTarget = dataMin - padding;
        yMaxTarget = dataMax + padding;
      }

      // Smoothly animate Y range
      const minDiff = yMinTarget - yMinAnimRef.current;
      if (Math.abs(minDiff) < 0.5) yMinAnimRef.current = yMinTarget;
      else yMinAnimRef.current += minDiff * 0.12;

      const maxDiff = yMaxTarget - yMaxAnimRef.current;
      if (Math.abs(maxDiff) < 0.5) yMaxAnimRef.current = yMaxTarget;
      else yMaxAnimRef.current += maxDiff * 0.12;

      const yMin = yMinAnimRef.current;
      const yMax = yMaxAnimRef.current;
      const yRange = yMax - yMin;

      const toY = (val: number) => PADDING.top + PLOT_H - ((val - yMin) / yRange) * PLOT_H;

      // Grid lines
      const gridStep = yRange <= 30 ? 5 : yRange <= 100 ? 10 : yRange <= 300 ? 50 : 100;
      const gridStart = Math.ceil(yMin / gridStep) * gridStep;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let y = gridStart; y <= yMax; y += gridStep) {
        const py = Math.round(toY(y)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(PADDING.left, py);
        ctx.lineTo(w - PADDING.right, py);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.fillStyle = C.axisText;
      ctx.font = '9px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = gridStart; y <= yMax; y += gridStep) {
        ctx.fillText(String(Math.round(y)), PADDING.left - 6, toY(y));
      }

      // Legend
      const legendX = w - PADDING.right;
      const legendY = 8;
      ctx.font = '9px "Inter", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.rewardLine;
      ctx.fillRect(legendX - 100, legendY - 1, 10, 2);
      ctx.fillStyle = C.legendText;
      ctx.textAlign = 'left';
      ctx.fillText('Reward', legendX - 88, legendY);
      ctx.fillStyle = C.maLine;
      ctx.fillRect(legendX - 48, legendY - 1, 10, 2);
      ctx.fillStyle = C.legendText;
      ctx.fillText('MA', legendX - 36, legendY);

      // X-axis labels
      const labelFadeZone = 20;
      ctx.font = '9px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelY = PADDING.top + PLOT_H + 6;
      const minLabelGap = 36;
      if (hasData) {
        ctx.fillStyle = C.axisText;
        ctx.fillText('0', PADDING.left, labelY);
        let lastLabelX = PADDING.left;

        for (let i = 0; i < summaries.length; i++) {
          const px = dataX(i + 1, xDiv, PLOT_W);
          if (px < PADDING.left - 8 || px > PADDING.left + PLOT_W + 4) continue;
          if (px - lastLabelX < minLabelGap) continue;
          const distFromLeft = px - PADDING.left;
          const alpha = distFromLeft < labelFadeZone
            ? Math.max(0, (distFromLeft + 8) / (labelFadeZone + 8))
            : 1;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = C.axisText;
          ctx.fillText(String(summaries[i]!.episodeNumber), px, labelY);
          ctx.globalAlpha = 1;
          lastLabelX = px;
        }
        // Tip label
        if (frac > 0.05 && lookahead) {
          const tipX = PADDING.left + PLOT_W;
          if (tipX - lastLabelX >= minLabelGap) {
            ctx.globalAlpha = Math.min((frac - 0.05) * 3, 1);
            ctx.fillStyle = C.axisText;
            ctx.fillText(String(lookahead.episodeNumber), tipX, labelY);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw data lines
      if (!hasData) {
        // Empty state message
        ctx.fillStyle = colors.text.tertiary;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No episode data yet', w / 2, h / 2);
        ctx.restore();
        rafIdRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      // Extract reward values for visible episodes
      const rewards: number[] = [];
      for (let i = 0; i < visibleCount; i++) rewards.push(summaries[i]!.totalReward);

      const drawLine = (
        getValues: () => number[],
        lineColor: string,
        glowColor: string,
        fillColor: string,
        showDot: boolean,
      ) => {
        const values = getValues();
        if (values.length < 1) return;

        const pts: [number, number][] = [];

        // Origin point anchored at bottom-left
        pts.push([PADDING.left, toY(yMin)]);

        for (let i = 0; i < Math.min(values.length, visibleCount); i++) {
          const px = dataX(i + 1, xDiv, PLOT_W);
          pts.push([px, toY(values[i])]);
        }

        // Interpolated tip
        if (frac > 0 && fullEps < summaries.length && values.length > fullEps) {
          const fromVal = values[fullEps];
          const nextSummary = fullEps + 1 < summaries.length
            ? summaries[fullEps + 1]!
            : lookahead;
          if (nextSummary) {
            // For reward line, tip value is the next summary's reward
            // For MA line, we approximate by interpolating
            const toVal = fullEps + 1 < values.length
              ? values[fullEps + 1]
              : nextSummary.totalReward;
            if (fullEps + 1 < summaries.length) {
              const fromX = dataX(fullEps + 1, xDiv, PLOT_W);
              const toX = dataX(fullEps + 2, xDiv, PLOT_W);
              pts.push([lerp(fromX, toX, frac), toY(lerp(fromVal, toVal, frac))]);
            } else {
              pts.push([PADDING.left + PLOT_W, toY(lerp(fromVal, toVal, frac))]);
            }
          }
        }

        if (pts.length === 0) return;

        // Gradient fill under line
        const grad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + PLOT_H);
        grad.addColorStop(0, fillColor);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.lineTo(pts[pts.length - 1]![0], PADDING.top + PLOT_H);
        ctx.lineTo(pts[0]![0], PADDING.top + PLOT_H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Glow pass
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.stroke();
        ctx.restore();

        // Crisp line
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.stroke();

        // Glowing dot at tip
        if (showDot && pts.length > 1) {
          const last = pts[pts.length - 1]!;
          ctx.save();
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(last[0], last[1], 3, 0, Math.PI * 2);
          ctx.fillStyle = lineColor;
          ctx.fill();
          ctx.restore();
        }
      };

      // Moving average (window = ~5% of total, min 10)
      const maWindow = Math.max(10, Math.floor(rewards.length * 0.05));
      const maValues = computeMA(rewards, maWindow);

      // Draw MA first (behind), then reward line on top
      if (visibleCount > 10) {
        drawLine(() => maValues, C.maLine, C.maGlow, C.maFill, false);
      }
      drawLine(() => rewards, C.rewardLine, C.rewardGlow, C.rewardFill, true);

      // Hover tooltip
      const mouse = mouseRef.current;
      if (mouse && visibleCount >= 1) {
        const mx = mouse.x;
        const my = mouse.y;
        if (mx >= PADDING.left && mx <= w - PADDING.right && my >= PADDING.top && my <= PADDING.top + PLOT_H) {
          const ratio = (mx - PADDING.left) / PLOT_W;
          const nearestIdx = Math.round(ratio * xDiv) - 1;
          const idx = Math.max(0, Math.min(nearestIdx, visibleCount - 1));
          const s = summaries[idx]!;
          const px = dataX(idx + 1, xDiv, PLOT_W);
          const rewardY = toY(s.totalReward);

          // Vertical crosshair
          ctx.save();
          ctx.strokeStyle = C.crosshair;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px, PADDING.top);
          ctx.lineTo(px, PADDING.top + PLOT_H);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dot on reward line
          ctx.beginPath();
          ctx.arc(px, rewardY, 4, 0, Math.PI * 2);
          ctx.fillStyle = C.rewardLine;
          ctx.fill();

          // Dot on MA line if visible
          if (visibleCount > 10 && idx < maValues.length) {
            const maY = toY(maValues[idx]);
            ctx.beginPath();
            ctx.arc(px, maY, 4, 0, Math.PI * 2);
            ctx.fillStyle = C.maLine;
            ctx.fill();
          }

          // Tooltip box
          ctx.font = '10px "Inter", system-ui, sans-serif';
          const epLabel = `Ep ${s.episodeNumber}`;
          const rewardLabel = `Reward: ${s.totalReward}`;
          const cansLabel = `Cans: ${s.cansCollected}`;
          const stepsLabel = `Steps: ${s.stepsUsed}`;
          const textW = Math.max(
            ctx.measureText(epLabel).width,
            ctx.measureText(rewardLabel).width,
            ctx.measureText(cansLabel).width,
            ctx.measureText(stepsLabel).width,
          );
          const boxW = textW + 16;
          const boxH = 60;
          let tx = px + 10;
          if (tx + boxW > w - PADDING.right) tx = px - boxW - 10;
          let ty = rewardY - boxH - 6;
          if (ty < PADDING.top) ty = rewardY + 10;

          ctx.fillStyle = C.tooltipBg;
          ctx.beginPath();
          ctx.roundRect(tx, ty, boxW, boxH, 4);
          ctx.fill();
          ctx.strokeStyle = C.tooltipBorder;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = C.legendText;
          ctx.fillText(epLabel, tx + 8, ty + 4);
          ctx.fillStyle = C.rewardLine;
          ctx.fillText(rewardLabel, tx + 8, ty + 18);
          ctx.fillStyle = colors.accent.gold;
          ctx.fillText(cansLabel, tx + 8, ty + 32);
          ctx.fillStyle = colors.text.tertiary;
          ctx.fillText(stepsLabel, tx + 8, ty + 46);

          ctx.restore();
        }
      }

      ctx.restore();
      rafIdRef.current = requestAnimationFrame(drawFrame);
    };

    rafIdRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={styles.panel} data-help="Episode rewards over time — green line is per-episode reward, orange is moving average">
      <h3 style={styles.title} data-help="Tracks how Bender's reward evolves as episodes progress">Episode Rewards</h3>
      <div ref={wrapperRef} style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: colors.bg.base,
    borderRadius: 10,
    padding: '14px 16px 12px',
    border: `1px solid ${colors.chart.tooltipBorder}`,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    flexShrink: 0,
  },
  canvasWrapper: {
    flex: 1,
    minHeight: 150,
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    display: 'block',
  },
};

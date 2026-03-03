import React, { useRef, useEffect, useCallback } from 'react';
import type { EpisodeSummary } from '../engine/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EpisodeChartProps {
  episodeSummaries: EpisodeSummary[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
const COLORS = {
  background: '#1a1a2e',
  gridLine: '#2a2a3e',
  axisLine: '#444',
  axisLabel: '#888',
  line: '#4caf50',
  point: '#66bb6a',
  movingAvg: '#ff9800',
  titleText: '#e0e0e0',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EpisodeChart: React.FC<EpisodeChartProps> = ({ episodeSummaries }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    const plotX = CHART_PADDING.left;
    const plotY = CHART_PADDING.top;
    const plotW = w - CHART_PADDING.left - CHART_PADDING.right;
    const plotH = h - CHART_PADDING.top - CHART_PADDING.bottom;

    if (episodeSummaries.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No episode data yet', w / 2, h / 2);
      return;
    }

    // Calculate data range
    const rewards = episodeSummaries.map((ep) => ep.totalReward);
    let minReward = Math.min(...rewards);
    let maxReward = Math.max(...rewards);

    // Add a bit of padding to the y range
    const range = maxReward - minReward;
    if (range === 0) {
      minReward -= 10;
      maxReward += 10;
    } else {
      minReward -= range * 0.05;
      maxReward += range * 0.05;
    }

    const numEpisodes = episodeSummaries.length;
    const xScale = plotW / Math.max(numEpisodes - 1, 1);
    const yScale = plotH / (maxReward - minReward);

    // Helper: data coords to canvas coords
    const toCanvasX = (idx: number) => plotX + idx * xScale;
    const toCanvasY = (val: number) => plotY + plotH - (val - minReward) * yScale;

    // Draw grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    // Horizontal grid lines (Y axis)
    const numYTicks = 5;
    const yTickStep = (maxReward - minReward) / numYTicks;
    ctx.font = '10px monospace';
    ctx.fillStyle = COLORS.axisLabel;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numYTicks; i++) {
      const val = minReward + i * yTickStep;
      const cy = toCanvasY(val);

      ctx.beginPath();
      ctx.moveTo(plotX, cy);
      ctx.lineTo(plotX + plotW, cy);
      ctx.stroke();

      ctx.fillText(val.toFixed(0), plotX - 6, cy);
    }

    // Vertical grid lines (X axis)
    const maxXTicks = 6;
    const xTickStep = Math.max(1, Math.floor(numEpisodes / maxXTicks));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < numEpisodes; i += xTickStep) {
      const cx = toCanvasX(i);

      ctx.strokeStyle = COLORS.gridLine;
      ctx.beginPath();
      ctx.moveTo(cx, plotY);
      ctx.lineTo(cx, plotY + plotH);
      ctx.stroke();

      ctx.fillStyle = COLORS.axisLabel;
      ctx.fillText(
        String(episodeSummaries[i].episodeNumber),
        cx,
        plotY + plotH + 6,
      );
    }

    // Draw axes
    ctx.strokeStyle = COLORS.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    // Draw reward line
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < numEpisodes; i++) {
      const cx = toCanvasX(i);
      const cy = toCanvasY(rewards[i]);

      if (i === 0) {
        ctx.moveTo(cx, cy);
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();

    // Draw moving average (window size = ~5% of total or at least 10)
    if (numEpisodes > 10) {
      const windowSize = Math.max(10, Math.floor(numEpisodes * 0.05));
      const movingAvg: number[] = [];

      let sum = 0;
      for (let i = 0; i < numEpisodes; i++) {
        sum += rewards[i];
        if (i >= windowSize) {
          sum -= rewards[i - windowSize];
        }
        const count = Math.min(i + 1, windowSize);
        movingAvg.push(sum / count);
      }

      ctx.strokeStyle = COLORS.movingAvg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < numEpisodes; i++) {
        const cx = toCanvasX(i);
        const cy = toCanvasY(movingAvg[i]);
        if (i === 0) {
          ctx.moveTo(cx, cy);
        } else {
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = COLORS.axisLabel;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Episode', plotX + plotW / 2, plotY + plotH + 24);

    ctx.save();
    ctx.translate(14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Total Reward', 0, 0);
    ctx.restore();

    // Legend
    const legendX = plotX + plotW - 120;
    const legendY = plotY + 4;

    ctx.fillStyle = COLORS.line;
    ctx.fillRect(legendX, legendY, 12, 3);
    ctx.fillStyle = COLORS.axisLabel;
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Reward', legendX + 16, legendY + 2);

    if (numEpisodes > 10) {
      ctx.fillStyle = COLORS.movingAvg;
      ctx.fillRect(legendX, legendY + 14, 12, 3);
      ctx.fillStyle = COLORS.axisLabel;
      ctx.fillText('Moving Avg', legendX + 16, legendY + 16);
    }
  }, [episodeSummaries]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = 200;
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        draw();
      }
    });

    resizeObserver.observe(container);

    // Initial
    const width = container.clientWidth;
    canvas.width = width;
    canvas.height = 200;
    canvas.style.width = `${width}px`;
    canvas.style.height = '200px';

    return () => resizeObserver.disconnect();
  }, [draw]);

  // Redraw on data change
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Episode Rewards</h3>
      <div ref={containerRef} style={styles.canvasWrapper}>
        <canvas ref={canvasRef} />
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
  canvasWrapper: {
    width: '100%',
  },
};

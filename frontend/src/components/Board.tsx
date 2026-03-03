import React, { useRef, useEffect, useCallback } from 'react';
import type { BoardState } from '../hooks/use-algorithm';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BoardProps {
  boardState: BoardState | null;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
  background: '#1a1a2e',
  wall: '#444444',
  empty: '#2a2a3e',
  can: '#ffd700',
  bender: '#4caf50',
  benderOnCan: '#4caf50',
  gridLine: '#333355',
  labelText: '#888',
  benderText: '#fff',
  canIndicator: '#ffd700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Board: React.FC<BoardProps> = ({ boardState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const labelMargin = 30;
    const gridSize = size - labelMargin;
    const cellSize = gridSize / 10;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size, size);

    // Draw column labels (1-10) at top
    ctx.fillStyle = COLORS.labelText;
    ctx.font = `${Math.max(10, cellSize * 0.3)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 0; x < 10; x++) {
      ctx.fillText(
        String(x + 1),
        labelMargin + x * cellSize + cellSize / 2,
        labelMargin / 2,
      );
    }

    // Draw row labels (1-10) on left
    // The board coordinate system: board[x][y] where y=0 is bottom, y=9 is top
    // We render y=9 at the top of the canvas and y=0 at the bottom
    for (let y = 0; y < 10; y++) {
      const canvasRow = 9 - y; // flip so y=9 is at top
      ctx.fillText(
        String(y + 1),
        labelMargin / 2,
        labelMargin + canvasRow * cellSize + cellSize / 2,
      );
    }

    // Draw cells
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const canvasRow = 9 - y; // flip y
        const cellX = labelMargin + x * cellSize;
        const cellY = labelMargin + canvasRow * cellSize;

        // Determine cell type
        let fillColor = COLORS.empty;
        let hasCan = false;
        let hasBender = false;
        let hasWall = false;

        if (boardState) {
          const cell = boardState.board[x][y];
          hasCan = cell.hasCan;
          hasBender = cell.hasBender;
          hasWall = cell.walls.length > 0;

          if (hasBender) {
            fillColor = COLORS.bender;
          } else if (hasCan) {
            fillColor = COLORS.can;
          } else if (hasWall) {
            fillColor = COLORS.wall;
          } else {
            fillColor = COLORS.empty;
          }
        }

        // Fill cell
        ctx.fillStyle = fillColor;
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);

        // Draw wall indicators as darker borders on restricted sides
        if (boardState && hasWall) {
          const cell = boardState.board[x][y];
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 3;
          for (const wall of cell.walls) {
            ctx.beginPath();
            if (wall === 'Left') {
              ctx.moveTo(cellX, cellY);
              ctx.lineTo(cellX, cellY + cellSize);
            } else if (wall === 'Right') {
              ctx.moveTo(cellX + cellSize, cellY);
              ctx.lineTo(cellX + cellSize, cellY + cellSize);
            } else if (wall === 'Up') {
              // Up in board coords = top in canvas (since we flipped)
              ctx.moveTo(cellX, cellY);
              ctx.lineTo(cellX + cellSize, cellY);
            } else if (wall === 'Down') {
              // Down in board coords = bottom in canvas
              ctx.moveTo(cellX, cellY + cellSize);
              ctx.lineTo(cellX + cellSize, cellY + cellSize);
            }
            ctx.stroke();
          }
        }

        // Draw Bender indicator
        if (hasBender) {
          ctx.fillStyle = COLORS.benderText;
          ctx.font = `bold ${Math.max(12, cellSize * 0.45)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('B', cellX + cellSize / 2, cellY + cellSize / 2);

          // If Bender is on a can, draw a small can indicator
          if (hasCan) {
            ctx.fillStyle = COLORS.canIndicator;
            const dotR = Math.max(3, cellSize * 0.1);
            ctx.beginPath();
            ctx.arc(
              cellX + cellSize - dotR - 3,
              cellY + dotR + 3,
              dotR,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(labelMargin + i * cellSize, labelMargin);
      ctx.lineTo(labelMargin + i * cellSize, labelMargin + gridSize);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(labelMargin, labelMargin + i * cellSize);
      ctx.lineTo(labelMargin + gridSize, labelMargin + i * cellSize);
      ctx.stroke();
    }
  }, [boardState]);

  // Resize canvas to fit container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const size = Math.min(width, 600);
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        draw();
      }
    });

    resizeObserver.observe(container);

    // Initial sizing
    const width = container.clientWidth;
    const size = Math.min(width, 600);
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    return () => resizeObserver.disconnect();
  }, [draw]);

  // Redraw whenever board state changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
      {!boardState && (
        <div style={styles.placeholder}>
          Configure and start to see the board
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  canvas: {
    borderRadius: 8,
    border: '1px solid #333',
  },
  placeholder: {
    position: 'absolute',
    color: '#666',
    fontSize: 16,
    fontFamily: 'monospace',
  },
};

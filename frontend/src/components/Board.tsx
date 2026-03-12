import React, { useRef, useEffect, useCallback } from 'react';
import type { BoardState } from '../hooks/use-buffered-algorithm';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BoardProps {
  boardState: BoardState | null;
}

// ---------------------------------------------------------------------------
// Sprite loader (SVG character sprites only)
// ---------------------------------------------------------------------------

const SPRITE_PATHS = {
  beer: '/sprites/beer.png',
  bender: '/sprites/bender.png',
  benderAndBeer: '/sprites/bender-and-beer.png',
} as const;

type SpriteMap = Record<keyof typeof SPRITE_PATHS, HTMLImageElement>;

function loadSprites(): Promise<SpriteMap> {
  const entries = Object.entries(SPRITE_PATHS) as [keyof typeof SPRITE_PATHS, string][];
  const promises = entries.map(
    ([key, src]) =>
      new Promise<[keyof typeof SPRITE_PATHS, HTMLImageElement]>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve([key, img]);
        img.onerror = reject;
        img.src = src;
      }),
  );
  return Promise.all(promises).then((pairs) =>
    Object.fromEntries(pairs) as SpriteMap,
  );
}

// ---------------------------------------------------------------------------
// Canvas-drawn tile backgrounds (replaces PNG tilesets)
// ---------------------------------------------------------------------------

/** Fills a cell with a solid color and a colored border. */
function drawTileBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fillColor: string,
  borderColor: string,
) {
  const border = Math.max(2, size * 0.06);
  // Outer border
  ctx.fillStyle = borderColor;
  ctx.fillRect(x, y, size, size);
  // Inner fill
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + border, y + border, size - border * 2, size - border * 2);
}

// Tile color schemes matching the original sprites
const TILE = {
  unexplored: { fill: '#c8c8c8', border: '#808080' },  // gray border (like bg-unexplored)
  explored:   { fill: '#c8c8c8', border: '#3a6fb0' },  // blue border (like bg-explored)
  current:    { fill: '#c8c8c8', border: '#3a8a3a' },  // green border (like bg-current)
};

// ---------------------------------------------------------------------------
// Other colors
// ---------------------------------------------------------------------------

const COLORS = {
  background: '#1a1a2e',
  gridLine: '#333355',
  labelText: '#888',
  wallStroke: '#444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Board: React.FC<BoardProps> = ({ boardState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spritesRef = useRef<SpriteMap | null>(null);
  const visitedRef = useRef<Set<string>>(new Set());

  // Load sprites once
  useEffect(() => {
    loadSprites().then((sprites) => {
      spritesRef.current = sprites;
      draw();
    });
  }, []);

  // Track visited cells — reset when board goes null (new episode/reset)
  useEffect(() => {
    if (!boardState) {
      visitedRef.current.clear();
      return;
    }
    const [bx, by] = boardState.benderPosition;
    visitedRef.current.add(`${bx},${by}`);
  }, [boardState]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sprites = spritesRef.current;
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
    for (let y = 0; y < 10; y++) {
      const canvasRow = 9 - y;
      ctx.fillText(
        String(y + 1),
        labelMargin / 2,
        labelMargin + canvasRow * cellSize + cellSize / 2,
      );
    }

    // Draw cells
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const canvasRow = 9 - y;
        const cellX = labelMargin + x * cellSize;
        const cellY = labelMargin + canvasRow * cellSize;
        const inset = 1;
        const drawX = cellX + inset;
        const drawY = cellY + inset;
        const drawSize = cellSize - inset * 2;

        let hasCan = false;
        let hasBender = false;

        if (boardState) {
          const cell = boardState.board[x][y];
          hasCan = cell.hasCan;
          hasBender = cell.hasBender;
        }

        // Background tile (canvas-drawn)
        let tile = TILE.unexplored;
        if (hasBender) {
          tile = TILE.current;
        } else if (visitedRef.current.has(`${x},${y}`)) {
          tile = TILE.explored;
        }
        drawTileBackground(ctx, drawX, drawY, drawSize, tile.fill, tile.border);

        // Character/item sprite on top of background
        if (sprites) {
          // Slight padding so sprite doesn't fill entire cell
          const pad = drawSize * 0.08;
          const spriteX = drawX + pad;
          const spriteY = drawY + pad;
          const spriteSize = drawSize - pad * 2;

          if (hasBender && hasCan) {
            ctx.drawImage(sprites.benderAndBeer, spriteX, spriteY, spriteSize, spriteSize);
          } else if (hasBender) {
            ctx.drawImage(sprites.bender, spriteX, spriteY, spriteSize, spriteSize);
          } else if (hasCan) {
            ctx.drawImage(sprites.beer, spriteX, spriteY, spriteSize, spriteSize);
          }
        } else {
          // Fallback text indicators before sprites load
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${Math.max(12, cellSize * 0.45)}px monospace`;
          if (hasBender) {
            ctx.fillStyle = '#2a6e2a';
            ctx.fillText('B', cellX + cellSize / 2, cellY + cellSize / 2);
          } else if (hasCan) {
            ctx.fillStyle = '#3a6fb0';
            ctx.fillText('C', cellX + cellSize / 2, cellY + cellSize / 2);
          }
        }

        // Draw wall indicators on restricted sides
        if (boardState) {
          const cell = boardState.board[x][y];
          if (cell.walls.length > 0) {
            ctx.strokeStyle = COLORS.wallStroke;
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
                ctx.moveTo(cellX, cellY);
                ctx.lineTo(cellX + cellSize, cellY);
              } else if (wall === 'Down') {
                ctx.moveTo(cellX, cellY + cellSize);
                ctx.lineTo(cellX + cellSize, cellY + cellSize);
              }
              ctx.stroke();
            }
          }
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(labelMargin + i * cellSize, labelMargin);
      ctx.lineTo(labelMargin + i * cellSize, labelMargin + gridSize);
      ctx.stroke();

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
    maxWidth: 600,
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

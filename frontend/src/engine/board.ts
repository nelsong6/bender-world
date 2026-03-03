// ============================================================================
// board.ts - Game board with 10x10 grid, walls, cans, and Bender
// Ported from C# GameBoard.cs, BaseBoard.cs, BoardSquare.cs, Unit.cs,
//   BoardSquareWalls.cs, BaseSquare.cs
//
// Coordinate system matches the C# code:
//   board[x][y] where x is the column (left/right) and y is the row (down/up).
//   Left = x-1, Right = x+1, Down = y-1, Up = y+1.
//   Walls surround the 10x10 grid at x=0, x=9, y=0, y=9.
// ============================================================================

import {
  Percept,
  MoveType,
  MoveResult,
  MOVE_GRID_ADJUSTMENT,
} from './types';
import {
  getPerceptionKeyFromPercepts,
  getPerceptionId,
} from './perception';

/** Represents a single square on the board. */
interface BoardCell {
  hasCan: boolean;
  hasBender: boolean;
  /** Set of MoveTypes that are blocked by walls at this cell. */
  restrictedMoves: Set<MoveType>;
}

/**
 * GameBoard manages the 10x10 grid, Bender's position, cans, and walls.
 * Faithfully ported from the C# GameBoard, BaseBoard, BoardSquare, and
 * BoardSquareWalls classes.
 */
export class GameBoard {
  /** 10x10 grid indexed as board[x][y]. */
  private board: BoardCell[][];

  /** Bender's current position as [x, y]. */
  private benderX: number;
  private benderY: number;

  /** The current perception state key for Bender. */
  private currentPerceptionKey: string;
  private currentPerceptionId: number;

  constructor() {
    // Initialize 10x10 grid with empty cells
    this.board = [];
    for (let x = 0; x < 10; x++) {
      this.board[x] = [];
      for (let y = 0; y < 10; y++) {
        this.board[x][y] = {
          hasCan: false,
          hasBender: false,
          restrictedMoves: new Set(),
        };
      }
    }

    this.addWalls();

    // Place Bender at a random position initially
    this.benderX = 0;
    this.benderY = 0;
    this.currentPerceptionKey = '';
    this.currentPerceptionId = -1;
    this.shuffleBender();
  }

  /**
   * Copy constructor equivalent. Creates a deep copy of another GameBoard.
   */
  static clone(source: GameBoard): GameBoard {
    const copy = new GameBoard();

    // Deep copy cell state (walls are already set by constructor)
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        copy.board[x][y].hasCan = source.board[x][y].hasCan;
        copy.board[x][y].hasBender = source.board[x][y].hasBender;
      }
    }

    copy.benderX = source.benderX;
    copy.benderY = source.benderY;
    copy.currentPerceptionKey = source.currentPerceptionKey;
    copy.currentPerceptionId = source.currentPerceptionId;

    return copy;
  }

  // --------------------------------------------------------------------------
  // Wall setup (matches C# GameBoard.add_walls)
  // --------------------------------------------------------------------------

  private addWalls(): void {
    // Clear all walls first
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        this.board[x][y].restrictedMoves = new Set();
      }
    }

    // Left wall: board_data[0][i] for i=1..8, restricts Left movement
    for (let i = 1; i <= 8; i++) {
      this.board[0][i].restrictedMoves = new Set([MoveType.Left]);
    }
    // Right wall: board_data[9][i] for i=1..8, restricts Right movement
    for (let i = 1; i <= 8; i++) {
      this.board[9][i].restrictedMoves = new Set([MoveType.Right]);
    }
    // Bottom wall: board_data[i][0] for i=1..8, restricts Down movement
    for (let i = 1; i <= 8; i++) {
      this.board[i][0].restrictedMoves = new Set([MoveType.Down]);
    }
    // Top wall: board_data[i][9] for i=1..8, restricts Up movement
    for (let i = 1; i <= 8; i++) {
      this.board[i][9].restrictedMoves = new Set([MoveType.Up]);
    }

    // Corner walls (two restricted directions each)
    this.board[0][0].restrictedMoves = new Set([MoveType.Left, MoveType.Down]);   // bottom-left
    this.board[9][9].restrictedMoves = new Set([MoveType.Right, MoveType.Up]);     // top-right
    this.board[0][9].restrictedMoves = new Set([MoveType.Left, MoveType.Up]);      // top-left
    this.board[9][0].restrictedMoves = new Set([MoveType.Right, MoveType.Down]);   // bottom-right
  }

  // --------------------------------------------------------------------------
  // Shuffling (matches C# GameBoard.shuffle_cans_and_bender, shuffle_bender)
  // --------------------------------------------------------------------------

  /**
   * Shuffle cans and Bender for a new episode.
   * Each non-wall cell gets a ~50% chance of having a can.
   * Bender is placed at a random position.
   * Matches C# GameBoard.shuffle_cans_and_bender().
   */
  shuffleCansAndBender(): void {
    // Randomize can presence for each cell (50% chance)
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        // C# uses MyRandom.Next(1, 101) < 50, which gives 49% chance
        // We match the same probability: random int 1..100, < 50 means 1..49 = 49 values
        this.board[x][y].hasCan = randomInt(1, 100) < 50;
      }
    }

    this.shuffleBender();
  }

  /**
   * Place Bender at a random position on the board.
   * Matches C# GameBoard.shuffle_bender().
   */
  private shuffleBender(): void {
    // Remove Bender from current position
    this.board[this.benderX][this.benderY].hasBender = false;

    // Random new position (0-9 inclusive for both x and y)
    this.benderX = randomInt(0, 9);
    this.benderY = randomInt(0, 9);

    this.board[this.benderX][this.benderY].hasBender = true;

    // Update Bender's perception
    this.updatePerception();
  }

  // --------------------------------------------------------------------------
  // Perception (matches C# GameBoard.percieve, bender_percieves)
  // --------------------------------------------------------------------------

  /**
   * Determine what Bender perceives in a given direction.
   * For directional moves: if wall blocks the move, perceive Wall.
   *   Otherwise check the adjacent cell for Can or Empty.
   * For Grab: check the current cell for Can or Empty.
   * Matches C# GameBoard.percieve().
   */
  getPercept(move: MoveType): Percept {
    const cell = this.board[this.benderX][this.benderY];

    // For non-grab moves, check if walls prevent movement
    if (move !== MoveType.Grab && cell.restrictedMoves.has(move)) {
      return Percept.Wall;
    }

    // For Grab, check the current cell
    // For directional moves, check the adjacent cell
    const [dx, dy] = MOVE_GRID_ADJUSTMENT[move];
    const targetX = this.benderX + dx;
    const targetY = this.benderY + dy;

    const targetCell = this.board[targetX][targetY];
    return targetCell.hasCan ? Percept.Can : Percept.Empty;
  }

  /**
   * Update Bender's cached perception state.
   * Called after any board change (move, can collection, shuffle).
   * Matches C# GameBoard.bender_percieves().
   */
  private updatePerception(): void {
    // Percepts are gathered in Move.order: Left, Right, Down, Up, Grab
    const left = this.getPercept(MoveType.Left);
    const right = this.getPercept(MoveType.Right);
    const down = this.getPercept(MoveType.Down);
    const up = this.getPercept(MoveType.Up);
    const grab = this.getPercept(MoveType.Grab);

    this.currentPerceptionKey = getPerceptionKeyFromPercepts(left, right, down, up, grab);
    this.currentPerceptionId = getPerceptionId(this.currentPerceptionKey);
  }

  /**
   * Get the current perception state key string.
   */
  getPerceptionState(): string {
    return this.currentPerceptionKey;
  }

  /**
   * Get the current perception state numeric ID (0-242).
   */
  getPerceptionStateId(): number {
    return this.currentPerceptionId;
  }

  // --------------------------------------------------------------------------
  // Move application (matches C# GameBoard.ApplyMove)
  // --------------------------------------------------------------------------

  /**
   * Apply a move to the board and return the result.
   * Matches C# GameBoard.ApplyMove().
   *
   * - If wall blocks the move direction -> HitWall
   * - If Grab and current cell has can -> CanCollected (can removed)
   * - If Grab and current cell has no can -> CanMissing
   * - Otherwise -> MoveSuccessful (Bender moves to adjacent cell)
   */
  applyMove(move: MoveType): MoveResult {
    const currentCell = this.board[this.benderX][this.benderY];

    // Check if walls prevent this move
    if (currentCell.restrictedMoves.has(move)) {
      return MoveResult.HitWall;
    }

    // Handle Grab
    if (move === MoveType.Grab) {
      if (currentCell.hasCan) {
        this.collectCan();
        return MoveResult.CanCollected;
      } else {
        return MoveResult.CanMissing;
      }
    }

    // Directional move succeeds
    this.moveBender(move);
    return MoveResult.MoveSuccessful;
  }

  /**
   * Move Bender in the given direction.
   * Matches C# GameBoard.MoveBender().
   */
  private moveBender(move: MoveType): void {
    // Remove Bender from current cell
    this.board[this.benderX][this.benderY].hasBender = false;

    // Apply grid adjustment
    const [dx, dy] = MOVE_GRID_ADJUSTMENT[move];
    this.benderX += dx;
    this.benderY += dy;

    // Place Bender on new cell
    this.board[this.benderX][this.benderY].hasBender = true;

    // Update perception after moving
    this.updatePerception();
  }

  /**
   * Collect the can at Bender's current position.
   * Matches C# GameBoard.collect_can().
   */
  private collectCan(): void {
    this.board[this.benderX][this.benderY].hasCan = false;

    // Update perception after collecting (current cell percept changes)
    this.updatePerception();
  }

  // --------------------------------------------------------------------------
  // Board queries
  // --------------------------------------------------------------------------

  /** Get Bender's current position as [x, y]. */
  getBenderPosition(): [number, number] {
    return [this.benderX, this.benderY];
  }

  /** Check if a cell has a can. */
  cellHasCan(x: number, y: number): boolean {
    return this.board[x][y].hasCan;
  }

  /** Check if Bender is on a can. */
  isBenderOnCan(): boolean {
    return this.board[this.benderX][this.benderY].hasCan;
  }

  /** Count the remaining cans on the board. */
  getCansRemaining(): number {
    let total = 0;
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (this.board[x][y].hasCan) {
          total++;
        }
      }
    }
    return total;
  }

  /** Clear all cans from the board. Matches C# GameBoard.ClearCans(). */
  clearCans(): void {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        this.board[x][y].hasCan = false;
      }
    }
  }

  /**
   * Get the full board state as a 10x10 grid for visualization.
   * Each cell reports: hasCan, hasBender, restricted moves (walls).
   */
  getBoardState(): {
    hasCan: boolean;
    hasBender: boolean;
    walls: MoveType[];
  }[][] {
    const state: { hasCan: boolean; hasBender: boolean; walls: MoveType[] }[][] = [];
    for (let x = 0; x < 10; x++) {
      state[x] = [];
      for (let y = 0; y < 10; y++) {
        state[x][y] = {
          hasCan: this.board[x][y].hasCan,
          hasBender: this.board[x][y].hasBender,
          walls: Array.from(this.board[x][y].restrictedMoves),
        };
      }
    }
    return state;
  }
}

// ============================================================================
// Random utility
// ============================================================================

/**
 * Generate a random integer in the range [min, max] inclusive.
 * Matches the behavior of C# MyRandom.Next(min, max+1) where the upper bound
 * in C# is exclusive.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

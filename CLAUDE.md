# bender-world

Q-Learning reinforcement learning visualization. Bender learns to collect beer cans on a 10×10 grid.
Ported from C# WinForms app, then rebooted with architecture from the eight-queens project.
Original C# code is in `d:\workspace\BenderWorld-repo`.

## Project Philosophy

This is an **educational visualization tool**, not a production RL system. Every design decision prioritizes:

1. **Transparency** — the user should be able to see exactly what the algorithm is doing at every level of granularity, from full episode overviews down to individual step-by-step Q-value updates.
2. **Deterministic replay** — seeded PRNG makes every run reproducible. Undo/redo via lightweight snapshots lets the user rewind and replay without losing state.
3. **Faithful C# port** — the engine layer is a bit-exact port of the original C# implementation. Enum values, perception encoding, Q-update formulas, PRNG seeds — all produce identical results to the C# version.
4. **Architecture parity with eight-queens** — the UI layout, animation system, help system, tab structure, color palette, and component patterns are shared with the `eight-queens` genetic algorithm visualizer at `d:\repos\eight-queens`. Changes to shared patterns should be mirrored between the two projects.
5. **No backend** — this is a frontend-only static app. All computation happens in the browser. No API, no server, no database.

## Intended User Flow

The primary experience (99% of users) is **Granular Step mode** — watching Bender's Q-learning algorithm think, one phase at a time. The app should funnel users toward this as quickly as possible:

1. **Getting Started tab** → user reads the brief intro, clicks **"Watch Bender Learn →"**
2. **Granular Step tab** → user clicks **Step (→)** to advance one phase at a time through the 5 phases of each micro-step (Perceive → Decide → Act → Reward → Learn)
3. The **PhaseBar** shows pipeline progress, while the **phase detail panel** shows the math: sensor readings, epsilon roll, Q-value lookup, reward mapping, and the full Q-update formula with all intermediate values
4. The **Board** animates (where Bender goes) and the **QMatrixInspector** updates (what Bender is learning)

The **Full Step tab** exists for power users who want to watch convergence over thousands of episodes, but the core appeal is the phase-by-phase micro view where you can see the algorithm thinking. Design decisions should prioritize making this granular flow feel responsive, intuitive, and visually clear.

## Overview

Frontend-only static app (Vite + React 19 + TypeScript 5.6). No backend or API.
Seeded PRNG enables deterministic replay and undo/redo via lightweight snapshots.

## Tech Stack

- **React 19.0.0** — UI framework (functional components, hooks only)
- **TypeScript 5.6** — strict types throughout
- **Vite 6.0** — dev server and production bundler
- **No CSS files** — all styles are inline `React.CSSProperties` objects
- **No external UI libraries** — no Tailwind, no component library, no state management library
- **Canvas API** — Board and EpisodeChart rendered via `<canvas>` for performance
- **No tests** — no test framework configured (yet)

## Q-Learning Algorithm

### The Problem

Bender lives on a 10×10 grid. Some cells contain beer cans (~50% density), the edges are walls. Bender can move in 4 cardinal directions or attempt to grab a can from his current cell. The goal: learn a policy that maximizes total reward over an episode.

### Perception System

Bender perceives 5 adjacent cells: Left, Right, Down, Up, and the cell he's standing on (Here/Current). Each sensor returns one of 3 values: Wall, Can, or Empty. This creates 3⁵ = 243 unique perception states.

Perception states are encoded as base-3 numbers (0–242). The encoding order is [Left, Right, Down, Up, Current], where Left is the most significant digit. A perception key string like `"[L: Can][R: Empty][D: Wall][U: Empty][H: Can]"` maps to a numeric ID used as the Q-matrix row index.

### Q-Matrix

The Q-matrix is a 243×5 sparse map (perception state → 5 action values). Actions are indexed in `ALL_MOVES` order: [Left=0, Right=1, Up=2, Down=3, Grab=4].

Internally stored as `Map<number, number[]>` — only states with non-zero values are stored.

### Action Selection (Epsilon-Greedy)

With probability ε, Bender picks a uniformly random action (exploration). Otherwise, he picks the action with the highest Q-value for his current perception (exploitation). Ties among best actions are broken randomly.

### Q-Value Update Formula

The Q-update matches the C# implementation exactly:

```
finalValue = eta * ((newBestValue - oldBestValue) * gamma^(step-1) + baseReward)
Q[state][action] = finalValue
```

This **sets** the Q-value to the computed value (not an incremental update). Only updates if `finalValue !== 0`.

Note: This differs from the standard textbook Q-learning update. It matches the original C# codebase.

### Epsilon Decay

Linear decay per episode: `epsilon -= epsilon_initial / episodeLimit`. By the final episode, epsilon reaches ~0 (fully greedy).

### Rewards

| Outcome | Default Reward | Description |
|---------|---------------|-------------|
| CanCollected | +10 | Successfully grabbed a can |
| HitWall | −5 | Tried to move into a wall |
| CanMissing | −1 | Tried to grab from empty cell |
| MoveSuccessful | 0 | Normal movement |

Reward values are configurable via the Config panel sliders.

### Algorithm Termination

The algorithm ends when `currentStep >= stepLimit AND currentEpisode >= episodeLimit`. Each episode runs up to `stepLimit` steps, then the board is reshuffled for the next episode. The complete sequence of all episodes is called a **run**.

## Engine Layer (`frontend/src/engine/`)

The engine is pure TypeScript with zero React dependencies. It can run standalone.

### `types.ts` — Core Types and Constants

All enums, interfaces, and constants for the Q-Learning system.

**Enums:**
- `Percept` — Wall, Can, Empty (sensor values)
- `MoveType` — Left, Right, Down, Up, Grab (5 actions)
- `MoveResult` — HitWall, CanCollected, CanMissing, MoveSuccessful (outcomes)

**Key Interfaces:**
- `AlgorithmConfig` — epsilon, gamma, eta, episodeLimit, stepLimit, rewards? (optional RewardConfig), seed? (optional PRNG seed)
- `RewardConfig` — `Record<MoveResult, number>`, maps each outcome to a reward value
- `StepResult` — benderPosition, move, moveResult, reward, episodeReward, perception, wasRandomMove, cansCollected
- `EpisodeSummary` — episodeNumber, totalReward, cansCollected, stepsUsed, epsilonAtStart
- `BoardStateSnapshot` — serializable board state for replay

**Constants:**
- `DEFAULT_CONFIG` — epsilon=0.2, gamma=0.9, eta=0.1, 5000 episodes, 200 steps
- `DEFAULT_REWARD_CONFIG` — CanCollected=+10, HitWall=−5, CanMissing=−1, MoveSuccessful=0
- `MOVE_GRID_ADJUSTMENT` — direction → [dx, dy] grid offset
- `ALL_MOVES` — [Left, Right, Up, Down, Grab] (Q-matrix index order)
- `MOVES_BY_ORDER` — [Left, Right, Down, Up, Grab] (perception encoding order, matches C#)
- `MOVE_SHORT_NAMES` — L, R, D, Up, Gr (used in perception key strings)

### `prng.ts` — Seeded Pseudo-Random Number Generator

Deterministic randomness for reproducible algorithm runs.

- `mulberry32(seed)` — Mulberry32 PRNG returning values in [0, 1). Fast, simple, sufficient for RL demo.
- `createPrngWithState(seed)` — PRNG with observable `getState()` for snapshot/restore. Critical for undo/redo.
- `randomInt(rng, min, max)` — generate integers in [min, max] range.
- `generateSeed()` — create random seed from `Math.random()`.

**Why this matters:** Saving the PRNG state at an episode boundary, then restoring it later, guarantees the board reshuffles identically and the algorithm makes the same random choices. This is how undo works without storing full episode history.

### `perception.ts` — Perception State Encoding

Maps 5 directional percepts to 243 unique numeric IDs using base-3 encoding.

- `getPerceptionKey(perceptions)` — build string key `"[L: Wall][R: Can]..."` matching C# format
- `getPerceptionId(key)` — map key string → numeric ID (0–242)
- `getPerceptionKeyById(id)` — reverse mapping (ID → key string)
- `getPerceptsById(id)` — decode ID back to 5 individual `Percept` values
- `TOTAL_PERCEPTION_STATES = 243`
- `getAllPerceptionKeys()` — all 243 perception key strings

All 243 states are pre-computed at module load in a static IIFE, stored in `KEY_TO_ID` Map and `ALL_STATE_KEYS` array. This is an exact port of the C# `PerceptionState` static constructor.

### `board.ts` — GameBoard Class (10×10 Grid)

Manages board state, Bender's position, can placement, wall collisions, and perception queries.

**Internal structure:**
- 10×10 array of `BoardCell` objects, each with `hasCan: boolean`, `hasBender: boolean`, `restrictedMoves: Set<MoveType>`
- Walls at borders: x=0 restricts Left, x=9 restricts Right, y=0 restricts Down, y=9 restricts Up. Corners restrict two directions.
- Bender position tracked as `[benderX, benderY]`
- Cached current perception (key + ID) updated after each action

**Key methods:**
- `shuffleCansAndBender()` — randomize cans (~50% density) and Bender position for each new episode
- `getPercept(move)` — query what Bender perceives in a direction (Wall if restricted, else check adjacent cell)
- `applyMove(move)` — execute move, return `MoveResult`. Grab checks current cell for can. Movement checks wall restrictions.
- `getBoardState()` — return full 10×10 snapshot as `BoardCellState[][]` for UI rendering
- `static clone(source)` — deep copy for snapshots

**Coordinate system (matches C#):** x = column (Left=x−1, Right=x+1), y = row (Down=y−1, Up=y+1).

### `q-matrix.ts` — Q-Learning Value Storage

Sparse Q-value storage with epsilon-greedy action selection.

**Key methods:**
- `getValues(stateId)` — get 5 action values for a state (lazy-init to zeros)
- `getBestValue(stateId)` — max Q-value across actions (0 if state unseen)
- `selectAction(stateId, epsilon, rng)` — epsilon-greedy with random tie-breaking
- `selectActionDetailed(stateId, epsilon, rng)` — like `selectAction` but returns `DecidePhaseData` with all intermediate decision values (epsilon roll, Q-values examined, tie-breaking). Consumes PRNG in identical order for determinism.
- `update(...)` — Q-value update (exact C# formula)
- `updateDetailed(...)` — like `update` but returns all 8 intermediate computation values (oldBestValue, newBestValue, difference, discountFactor, etc.) plus before/after Q-row. Also performs the actual update.
- `snapshot()` / `restore()` — deep copy for undo/redo
- `toJSON()` / `fromJSON()` — serialization
- `getEntryCount()` — count states with non-zero values

### `algorithm-runner.ts` — Main Q-Learning Orchestrator

Wraps board + Q-matrix + PRNG. Runs episodes and steps. Provides snapshots for undo/redo.

**Key methods:**
- `runStep()` — execute one step: perceive → select action → apply move → get reward → update Q-matrix → return `StepResult`
- `runStepWithPhases()` — like `runStep` but captures all intermediate phase data (`PhaseStepData`) at each of the 5 phases. Returns `{ stepResult, phases }`. Uses `selectActionDetailed` and `updateDetailed` internally while maintaining identical PRNG sequence.
- `runEpisode()` — run full episode (up to stepLimit steps), return `EpisodeSummary`
- `startNewEpisode()` — shuffle board, reset counters, decay epsilon
- `getSnapshot()` / `restoreSnapshot()` — save/restore algorithm state (Q-matrix + PRNG + counters)
- `getCurrentState()` — return current board state for visualization
- `reset(config?)` — reset to initial state

**Design decision:** Does NOT store full step history (unlike C# version). Step history is optionally captured by the `EpisodeBuffer` when the granular tab is active.

### `episode-buffer.ts` — Async Episode Pre-computation Buffer

Decouples episode computation from animation playback. Pre-computes episodes ahead of the playhead so playback never stutters.

**Architecture:**
- Rolling buffer of `EpisodeBufferEntry` objects (each: `EpisodeSummary` + optional `WalkthroughStep[]`)
- Producer loop runs via `setTimeout(0)` to avoid blocking the main thread
- Configurable batch size scales with playback speed

**Key concept:** The animation clock consumes episodes from the buffer at the playhead rate. The producer fills the buffer in the background. At high speeds, batch size increases so the buffer stays ahead.

**Key methods:**
- `startProducing()` / `stopProducing()` — control background loop
- `setBatchSize(size)` — episodes computed per setTimeout tick (1–50)
- `available` — count of episodes ready for consumption
- `consume()` — pop next episode (called when animation crosses an integer boundary)
- `peek(offset)` — look ahead without consuming (for chart interpolation)
- `computeImmediate(count)` — synchronous batch computation (for manual step-N)
- `computeOne()` — single episode with optional step history (for manual step)
- `captureSteps` flag — when true, each step's full state is recorded as `WalkthroughStep` (board snapshot + step result). Only enabled when the granular tab is active because it's expensive.

**`WalkthroughStep` interface:**
```ts
{
  step: StepResult;
  boardSnapshot: { board, benderPosition, perceptionKey };
  qMatrixSnapshot?: Map<number, number[]>;  // per-step Q-matrix state for QMatrixInspector
  phases?: PhaseStepData;                    // 5-phase decomposition for granular drill-down
}
```

### `phase-data.ts` — Phase Decomposition Types

Defines the data model for decomposing each Q-learning step into 5 observable phases.

**Enums & Constants:**
- `StepPhase` — enum (0–4): Perceive, Decide, Act, Reward, Learn
- `PHASE_COUNT = 5`
- `PHASE_LABELS` — human-readable names for each phase

**Data Interfaces:**
- `EncodingDigit` — base-3 encoding table row: direction, percept, digitValue, weight, contribution
- `PerceivePhaseData` — benderPosition, 5 sensor readings, perceptionKey, perceptionId, encoding digits
- `DecidePhaseData` — epsilon, randomRoll (1–100), threshold, isExploring, qValuesForState, bestValue, bestIndices (ties), tieBreakRoll, chosenActionIndex/Name
- `ActPhaseData` — move, moveResult, positionBefore/After
- `RewardPhaseData` — moveResult, reward, full rewardConfig, episodeRewardBefore/After
- `LearnPhaseData` — perceptionBefore/After IDs, actionIndex/Name, stepNumber, 8 formula intermediates (oldBestValue through finalValue), wasUpdated, qRowBefore/After (5 values each)
- `PhaseStepData` — aggregate: `{ perceive, decide, act, reward, learn }`

### `animation-clock.ts` — requestAnimationFrame Playhead Driver

Drives a fractional playhead via `requestAnimationFrame`. The playhead represents the current position in episode-space (e.g., 42.7 = between episode 42 and 43).

**Two modes:**
1. **Normal playback** — advance at constant rate based on speed setting
2. **Sweep mode** — animated interpolation to a target position (used for step/stepN visual feedback)

**Key methods:**
- `setSpeed(uiSpeed)` — convert UI speed (1–500) to internal `episodesPerMs`. Formula: `delayMs = 501 - uiSpeed`, `episodesPerMs = 1 / delayMs`
- `start()` / `stop()` — control rAF loop
- `startSweep(target, duration, easing)` — animate playhead to target (ease-out or ease-in-out)
- `finishSweepImmediate()` — jump to sweep target instantly
- `stopAtNextBoundary()` — pause after next integer crossing (clean pause)
- `setPlayhead(value)` — set playhead directly (for undo/redo)
- `reset()` — stop and reset to -1

**Callbacks:**
- `onTick(playhead, dt)` — every rAF frame (chart reads playhead for smooth interpolation)
- `onBoundary(episodeIndex)` — when playhead crosses an integer (consume episode from buffer)
- `onSweepComplete()` — when sweep animation finishes

## State Management (`frontend/src/hooks/`)

### `use-buffered-algorithm.ts` — Central Orchestration Hook

Wires the engine layer (AlgorithmRunner + EpisodeBuffer + AnimationClock) to React state. This is the single source of truth for the entire app.

**Refs (high-frequency, no re-renders):**
- `bufferRef` — EpisodeBuffer instance
- `clockRef` — AnimationClock instance
- `undoStackRef` — `HistorySnapshot[]` (max 50)
- `redoStackRef` — `EpisodeBufferEntry[]`
- `allSummariesRef` — `EpisodeSummary[]` (chart data, read by rAF loop)
- `chartPlayheadRef` — current fractional playhead (read by chart canvas)
- `lookaheadSummaryRef` — next episode summary for chart tip interpolation

**React state (synced on episode boundaries):**
- `running`, `speed`, `currentEpisode`, `currentStep`
- `episodeReward`, `totalReward`, `cansCollected`, `cansRemaining`, `epsilon`
- `boardState` (10×10 grid for Board component)
- `episodeSummaries` (for any component that needs full history)
- `algorithmEnded`, `algorithmConfig`, `qMatrix`, `currentPerceptionId`
- `canGoBack`, `lastStepHistory` (WalkthroughStep[] for granular tab)

**Actions:**
- `start(config)` — initialize new training run (creates buffer + clock, resets stacks)
- `resume()` — start playback. Prefills buffer from redo stack if available. Sets up `onBoundary` callback to consume episodes and push undo snapshots.
- `pause()` — stop playback (pause at next boundary for clean stop)
- `step()` — single episode advance. Pushes undo snapshot, consumes from redo stack or computes new. Triggers sweep animation for chart visual feedback.
- `stepN(count)` — batch advance. Synchronous computation, sweep animation to final position.
- `goBack()` — pop undo stack, restore algorithm state (Q-matrix + PRNG + counters), trim summaries, snap playhead. Pushes consumed entry to redo stack.
- `reset()` — clear everything, return to initial state
- `setSpeed(speed)` — update batch size state and buffer computation batch size (does NOT affect AnimationClock)
- `setClockSpeed(uiSpeed)` — update AnimationClock playback rate (separated from batch size)
- `setCaptureSteps(enabled)` — toggle step-by-step capture on the buffer

**Undo/Redo Architecture:**
- Each undo snapshot is lightweight (~10KB): `AlgorithmSnapshot` (Q-matrix sparse map + PRNG state + episode counters) + `summariesLength` (index into summaries array)
- Max 50 undo slots (FIFO eviction when full)
- Redo stack stores consumed `EpisodeBufferEntry` objects. On `resume()`, redo entries are prefilled into the buffer so they replay in order.

**Performance pattern:** The rAF loop reads from refs (`chartPlayheadRef`, `allSummariesRef`, `lookaheadSummaryRef`) without triggering React re-renders. React state is only synced when the playhead crosses an episode boundary (integer crossing), which happens at most once per `1000/speed` milliseconds.

## UI Components (`frontend/src/components/`)

### App.tsx — Root Layout & Orchestration

The main layout follows the eight-queens sidebar+content pattern:

```
┌─────────────────────────────────────────────────┐
│ Header: "BenderWorld: Reinforcement Learning"   │  sticky top
├─────────────────────────────────────────────────┤
│ HelpBar: hover help text, S to pin/unpin        │  sticky top
├─────────────────────────────────────────────────┤
│ Controls: Play/Pause/Back/Step/+10/+100/Reset   │  sticky top (only when started)
│           + logarithmic speed slider (1-500)     │
├─────┬───────────────────────────────────────────┤
│ Tab │  Content Area (changes per active tab)    │
│ Bar │                                           │
│     │  getting-started: GettingStartedTab       │  flex: 1
│ (v  │  config: ConfigPanel + SettingsSummary    │  minHeight: 0
│  e  │  granular: PhaseBar + Board | PhasePanel  │  overflowY: auto
│  r  │            + QMatrixInspector             │
│  t  │  chart: Board+StatusBar | EpisodeChart    │
│  i  │  glossary: [section picker] + content     │
│  c  │                                           │
│  a  │                                           │
│  l  │                                           │
│  )  │                                           │
└─────┴───────────────────────────────────────────┘
```

**Sticky top section** (`flexShrink: 0`, `zIndex: 160`):
- Header with title + subtitle + Fry squinting image (far right, decorative, 64px tall, flush with bottom border)
- HelpBar (always visible)
- Controls bar (only when `hasStarted` — i.e., after config is submitted). Callbacks are tab-aware: on the Granular Step tab, Controls receives phase-level callbacks (`handleGranularStep`, etc.) instead of episode-level callbacks. A `microPlaying` state + `setInterval` drives auto-play at the phase level.

**Main section** (`flex: 1`, `flexDirection: row`, `minHeight: 0`):
- Left sidebar: vertical `TabBar` + Planet Express ship image (bottom, decorative, 120×90px, 40% opacity)
- Optional secondary sidebar: glossary section picker (only on glossary tab)
- Tab content area: `flex: 1`, scrolls independently

**Client-side URL routing** via History API (pushState/popstate, no library). `tabFromPath()` maps URL slugs to `TabId` (unknown paths fall back to `getting-started`), `pathFromTab()` maps the default tab to `/` and all others to `/{tabId}`. `navigateTab` callback replaces all direct `setActiveTab` calls — updates state and pushes URL. A `popstate` listener handles browser back/forward. `staticwebapp.config.json` has `navigationFallback` rewriting all paths to `index.html`.

**Quick-start callbacks:** The Getting Started tab has buttons that auto-start with `DEFAULT_CONFIG` and switch to the appropriate tab.

### TabBar.tsx — Vertical Sidebar Tab Navigation

5 tabs matching the eight-queens pattern:

| Tab ID | Label | Content |
|--------|-------|---------|
| `getting-started` | Getting Started | Welcome, quick-start buttons, how-it-works terms |
| `config` | Config | Preset buttons, parameter sliders, settings summary |
| `granular` | Granular Step | PhaseBar + Board (left) alongside phase detail panel + QMatrixInspector (right) |
| `chart` | Full Step | Board + StatusBar alongside EpisodeChart (2 columns) |
| `glossary` | Help / Glossary | Secondary section picker sidebar + glossary content |

**Styling pattern (shared with eight-queens):**
- Inactive tabs: `padding: '1px 0 1px 1px'` reserves space for border
- Active tab: `borderLeft/Top/Bottom` with `borderRight: 'none'`, `marginRight: -1` to overlap content area border, `zIndex: 1` to stack above inactive tabs
- Font: monospace, 12px, `letterSpacing: 0.3`
- Color: `colors.text.primary` when active, `colors.text.tertiary` when inactive
- Weight: bold when active

### GettingStartedTab.tsx — Introduction & Quick Start

Two-column layout (text left, board preview right):

**Left column sections:**
1. **CTA box** — "Watch Bender Learn →"
2. **Title + intro**
3. **Using the Help Bar** — hover for help, press S to pin/unpin, glossary links
4. **How It Works** — brief glossary terms: Grid, Beer Can, Wall, Episode, Run, Q-Value, Epsilon
5. **Reference** — link to "Browse Help & Glossary →"

**Right column:**
- Pre-populated `<Board boardState={PREVIEW_BOARD} />` (static board with cans and Bender, fixed seed 42)
- Caption: "Bender's 10×10 Grid"
- Hint text about perception and Q-matrix size

**Styles:** Copied from eight-queens `GettingStartedTab.tsx`, same color palette.

### HelpBar.tsx — Contextual Help Display

A 28px-tall bar below the header that shows help text for whatever UI element the user is hovering over.

**How it works:**
- Document-level `mouseover` listener checks for `[data-help]` attribute on hovered element (or ancestor via `closest()`)
- If found, displays that element's `data-help` value. If not, shows default text: "Hover over any control to see what it does. Press S to pin help text."
- Press `S` key to pin/hold the current help text (shows "HELD" badge in gold)
- While pinned, if the element has `[data-help-glossary]`, a "See in Glossary →" button appears
- Press `S` again to unpin; help text resumes following the mouse
- Mouse position tracked via `mousemove` so unpinning recalculates from current position

**Adding help to any element:** Add `data-help="Description text"` attribute. Optionally add `data-help-glossary="term-id"` to link to a glossary entry.

### HelpGlossary.tsx — Educational Content & Glossary

Renders glossary content for the selected section. Used with a secondary sidebar section picker.

**6 sections** (`HelpSectionId`):
| ID | Label | Content |
|----|-------|---------|
| `problem` | The Problem | Grid, beer cans, walls, episodes, steps |
| `algorithm` | Q-Learning | Q-values, epsilon, gamma, eta, rewards, convergence, run |
| `qmatrix` | Q-Matrix | States (perceptions), actions, greedy vs random |
| `perception` | Perception | 5 sensors, sensor values, perception keys, base-3 encoding |
| `controls` | Controls | Playback shortcuts, tab descriptions, hold help |
| `presets` | Presets | Description of each preset configuration |

**`<Term>` helper component:** Renders key-value pairs with purple key text and secondary-color value text.

**Section picker:** When the glossary tab is active, App.tsx renders a secondary vertical sidebar (`opTabStrip` style) with buttons for each section. This mirrors the eight-queens operation tab strip.

### ConfigPanel.tsx — Configuration Sliders & Presets

**Preset buttons:** Default, Fast Learner, Cautious, Explorer. Clicking applies all parameters at once.

**Parameter sliders (SliderParam sub-component):**
- Epsilon (ε): 0–1, step 0.01
- Gamma (γ): 0–1, step 0.01
- Eta (η): 0–1, step 0.01
- Episode Limit: 100–100,000, step 100
- Step Limit: 50–500, step 10

**Reward sliders:**
- Can Collected: −20 to +50
- Hit Wall: −50 to 0
- Can Missing: −20 to 0
- Move OK: −10 to +10

**Start Training button:** Calls `onStart(config)` with current slider values. Disabled while running.

### Controls.tsx — Playback Control Bar

Flat horizontal bar in the sticky top section (only visible after training starts).

**Tab-aware granularity:** Controls automatically switch between episode-level and phase-level behavior based on the active tab. On the Granular Step tab, all buttons operate on individual phases within a step (5 phases per step). On all other tabs, they operate on full episodes. This is achieved by App.tsx passing different callback functions — Controls itself is mostly tab-unaware, receiving only an `isMicro` prop for label changes.

**Buttons (episode mode — Full Step tab and others):**

| Button | Shortcut | Action | Color |
|--------|----------|--------|-------|
| Play/Pause | Space | Toggle episode playback | Green |
| Back | Left arrow | Undo last episode | Purple |
| Step | Right arrow | Advance `batchSize` episodes | Blue |
| +10 | Shift+Right | Advance `10 × batchSize` episodes | Blue |
| +100 | — | Advance `100 × batchSize` episodes | Dark blue |
| Reset | — | Return to config screen | Red |

**Buttons (phase mode — Granular Step tab):**

| Button | Shortcut | Action |
|--------|----------|--------|
| Play/Pause | Space | Toggle phase auto-play (setInterval-driven) |
| Back | Left arrow | Go back 1 phase; if at phase 0 step 0, undo episode |
| Step | Right arrow | Advance `batchSize` phases; wraps to next episode at end |
| +10 | Shift+Right | Advance `10 × batchSize` phases (wrapping across episodes) |
| +100 | — | Advance `100 × batchSize` phases (wrapping across episodes) |

**Two sliders:**

1. **Batch size** (green, logarithmic 1–500) — controls how many phases (granular) or episodes (full step) advance per Step press. At batch=5 in granular mode, each Step press advances one full Q-learning step (5 phases). +10/+100 buttons multiply: +10 at batch=5 = 50 phases. Values are click-to-edit for direct text entry.
2. **Playback speed** (orange, logarithmic 0.25–500) — controls auto-play rate when Play is active. In granular mode, drives the `setInterval` tick rate. In episode mode, drives the AnimationClock rate. Values below 1 snap to quarter increments (0.25, 0.5, 0.75). Also click-to-edit.

**Props:** `batchSize`, `onBatchSizeChange`, `playSpeed`, `onPlaySpeedChange`, `isMicro?: boolean` — `isMicro` changes suffix labels (phases/step vs ep/step, ticks/s vs ep/s).

**Keyboard shortcuts** (registered via `useEffect` + `keydown` listener):
- Space: Play/Pause (only when algorithm is active and not ended)
- Right arrow: Step once (only when paused)
- Shift+Right: Step 10 (only when paused)
- Left arrow: Back/undo (only when paused and undo available)
- All shortcuts ignore input when focus is on `<input>`, `<select>`, or `<textarea>`

**"Complete" badge:** Green badge appears when `algorithmEnded` is true.

### Board.tsx — Canvas-Rendered 10×10 Grid

Renders the game board using HTML5 Canvas with sprite overlays.

**Rendering pipeline:**
1. Column labels (1–10) across top
2. Row labels (1–10) down left side
3. 10×10 grid of cells:
   - Fill color based on state (unexplored=gray, explored=blue border, current=green border)
   - Border drawn around each cell
   - Wall indicators (darker stroked lines on restricted cell edges)
4. Sprites drawn on top:
   - `bender.png` — Bender character
   - `beer.png` — beer can
   - `bender-and-beer.png` — when Bender is on a can cell
5. Grid lines (subtle overlay)

**Sprite loading:** Async image loading with fallback to text indicators ("B" for Bender, "C" for can) while sprites load. Sprites loaded once and cached.

**Responsive sizing:** Container uses `aspectRatio: '1'` with `maxWidth: 600` to establish a stable square layout from the first frame. Canvas fills via CSS (`width/height: 100%`) — no JS-driven CSS sizing. A `ResizeObserver` (set up once with `[]` deps, decoupled from draw via `drawRef`) only updates the canvas buffer resolution (`canvas.width/height = cssSize * devicePixelRatio`) for HiDPI sharpness. This eliminates the "zoom" animation that occurred when JS set canvas CSS size after layout settled.

**Visited tracking:** Board tracks which cells Bender has visited (explored border color vs unexplored). By default, an internal `visitedRef` Set accumulates positions on each render. In Granular Step mode, an optional `visitedCells?: Set<string>` prop overrides this — App.tsx computes the set from `lastStepHistory[0..stepIndex]` so stepping backward correctly removes teal highlights from cells not yet visited.

**No null callers:** All Board render sites pass a valid `BoardState` (Getting Started uses a static preview board, other tabs use algorithm state).

### StatusBar.tsx — Real-time Statistics Display

Horizontal flex row of colored badges showing current algorithm state:

| Stat | Color | Format |
|------|-------|--------|
| Episode | Green | current / limit |
| Step | Blue | current / limit |
| Episode Reward | Green (≥0) / Red (<0) | signed number |
| Total Reward | Green (≥0) / Red (<0) | signed number |
| Cans | Gold | count |
| Cans Left | Gold | count |
| Epsilon (ε) | Orange | decimal |
| Gamma (γ) | Purple | decimal |

### EpisodeChart.tsx — Canvas Chart with Gradient Fills & Tooltips

Visualizes episode rewards over time using a persistent rAF draw loop.

**Features:**
- **Reward line** (green) with glow effect + gradient fill below
- **Moving average line** (orange, ~5% window) with glow + fill
- **Dynamic Y-axis scaling** with smooth animated transitions
- **Grid lines** with logarithmic step sizing
- **Tooltip** on hover: Episode number, Reward, Cans collected, Steps used
- **Vertical crosshair** at hover position
- **Legend** (top-right corner)
- **X-axis labels** with fade-out near edges
- **Interpolated tip** — playhead fraction used to interpolate between last consumed episode and lookahead for smooth animation

**Performance:** The chart reads directly from refs (`summariesRef`, `playheadRef`, `lookaheadRef`) in its own rAF loop. No React re-renders needed — the chart animates independently of React state updates.

**HiDPI:** Canvas resolution scaled by `devicePixelRatio`; CSS size stays responsive.

### PerceptionDisplay.tsx — Compass Rose Sensor Display

3×3 CSS grid showing Bender's current 5-cell perception:

```
     [North]
[West] [HERE] [East]
     [South]
```

Each cell is color-coded:
- **Red** — Wall
- **Gold** — Can
- **Gray** — Empty

Center cell (Current/Here) has a green border. Shows Bender's grid coordinates (1-indexed) and the full perception key string.

Parses the perception key string via regex to extract individual percept values.

### QMatrixInspector.tsx — Interactive Q-Value Table Viewer

Two-part Q-value explorer:

**State selector (top):**
- Dropdown with all 243 perception states
- 5 individual percept dropdowns (Left, Right, Down, Up, Current) for targeted lookup
- Auto-syncs to current perception when algorithm runs

**Detail row (middle):**
- Always renders 5 action boxes when a state is selected (shows `0.000` in disabled color if the state has no Q-values yet)
- Highlights best action (boldface, light green background)
- Color-codes values: green (positive), red (negative), gray (zero)

**Full table (bottom, scrollable):**
- All populated states with their 5 Q-values
- Sticky header row
- Current perception highlighted in green
- Selected state highlighted in blue
- Best action highlighted per row
- Entry count shown in title

### SettingsSummary.tsx — Active Configuration Display

Two-column key-value display of the active algorithm configuration. Shows:
- Episodes, Steps/Episode, Epsilon (initial), Gamma, Eta
- Reward values for each outcome (CanCollected, HitWall, CanMissing, MoveOK)

Only renders when `algorithmConfig` is not null (i.e., after training starts).

### StepWalkthrough.tsx — Step-by-Step Episode Replay

Legacy component, no longer used in the Granular Step tab (replaced by PhaseBar + phase panels). Retained in the codebase but not rendered. Shows individual step details within an episode with slider navigation.

### PhaseBar.tsx — Pipeline Progress Bar

Horizontal bar showing the 5 phases of each Q-learning step, adapted from eight-queens `PipelineBar.tsx`.

**5 segments with phase colors:**

| Phase | Label | Color |
|-------|-------|-------|
| 0 | PERCEIVE | teal |
| 1 | DECIDE | orange |
| 2 | ACT | blue |
| 3 | REWARD | gold |
| 4 | LEARN | purple |

- Current phase: full color + box-shadow glow
- Past phases: color at 55% opacity
- Future phases: `colors.bg.raised`
- Labels below each segment

**Counters:** Episode and step counters on the left side (`Ep X / Y`, `Step X / Y`).

**Props:** `currentPhase`, `onPhaseClick`, `currentStep`, `totalSteps`, `currentEpisode`, `totalEpisodes`, `hasData`

### PerceivePanel.tsx — Phase 0: Sensor Readings

Embeds the existing `PerceptionDisplay` compass rose component and adds a base-3 encoding table below it.

**Encoding table columns:** Direction | Percept | Digit | Weight | Contribution

**Footer:** Sum total → State #ID

### DecidePanel.tsx — Phase 1: Epsilon-Greedy Decision

- **Epsilon bar:** Visual threshold zone (orange) with roll position marker
- **Roll result:** "73 > 20 → EXPLOIT" or "12 < 20 → EXPLORE"
- **Q-values table:** 5 action boxes when exploiting, best highlighted, tie info shown
- **Random action display:** When exploring or state is new
- **Decision badge:** Action name colored by strategy (blue=greedy, orange=random)

### ActPanel.tsx — Phase 2: Move Execution

- Action badge (Move Right / Grab)
- Result badge (color-coded: green=CanCollected, red=HitWall, orange=CanMissing, gray=MoveSuccessful)
- Position change: `(3, 5) → (4, 5)` or wall bounce indicator

### RewardPanel.tsx — Phase 3: Reward Mapping

- Reward config table with all 4 outcomes, active one highlighted with gold background + arrow
- Running total: `episodeRewardBefore + reward = episodeRewardAfter`

### LearnPanel.tsx — Phase 4: Q-Value Update

7-line formula walkthrough using `FormulaRow` sub-component:
```
1. oldBestValue = Q_best(State #194)           = 0.850
2. newBestValue = Q_best(State #207)           = 0.920
3. difference   = 0.920 - 0.850                = 0.070
4. discountFactor = γ^(step-1) = 0.9^14        = 0.229
5. discounted   = 0.070 × 0.229                = 0.016
6. combined     = 0.016 + 10                   = 10.016
7. finalValue   = η × 10.016 = 0.1 × 10.016   = 1.002
   Q[194][Right] = 1.002  ✓ Updated
```

- Line 7 highlighted with purple background
- Before/after Q-row comparison (5 cells, changed cell highlighted in purple)

## Color Palette (`frontend/src/colors.ts`)

Futurama-themed palette: oxidized steel backgrounds, muted sage-green learning signals, warm beer-amber for cans, electric accents. All components import from `colors.ts` — no raw hex in components (except `#fff` for button text).

```
bg.base      = #0a0f14   (deep gunmetal steel)
bg.raised    = #141f2a   (oxidized steel panel)
bg.surface   = #1a2a38   (brushed steel surface)
bg.overlay   = #223d4e   (elevated panel zone)

border.subtle = #2a3f52   (faint rust line)
border.strong = #3d5666   (corroded metal edge)

text.primary   = #d4e4f0  (bright steel-blue-white)
text.secondary = #96aac0  (duller steel gray)
text.tertiary  = #6a7c8a  (dim metal)
text.disabled  = #4a5566  (very dark steel)

accent.green      = #5a8e70   (muted sage — play button, positive values, reward line)
accent.greenLight = #72a88a   (lighter sage)
accent.gold       = #f5c842   (warm beer-amber — cans, held badge)
accent.blue       = #4da6ff   (sharp electric blue — step buttons, greedy strategy)
accent.orange     = #ff8c3d   (warm orange — moving average, random strategy, epsilon)
accent.red        = #ff5555   (neon red — walls, negative values, reset)
accent.teal       = #2fbfc9   (acidic teal — explored cells)
accent.purple     = #b876ff   (electric purple — primary CTA, glossary links, back button)
```

Additional domain-specific palettes: `board.*`, `chart.*`, `perception.*`, `qValue.*`, `interactive.*`.

## Data (`frontend/src/data/`)

### `presets.ts` — Algorithm Configuration Presets

| ID | Name | ε | γ | η | Episodes | Steps | Philosophy |
|----|------|---|---|---|----------|-------|------------|
| `default` | Default | 0.2 | 0.9 | 0.1 | 5000 | 200 | Balanced baseline |
| `fast-learner` | Fast Learner | 0.3 | 0.9 | 0.3 | 3000 | 200 | High learning rate + exploration, fewer episodes |
| `cautious` | Cautious | 0.1 | 0.95 | 0.05 | 10000 | 200 | Low exploration, high discount, slow steady learning |
| `explorer` | Explorer | 0.5 | 0.8 | 0.2 | 5000 | 300 | Very high exploration, more steps per episode |

Each preset has `id`, `name`, `description`, and `config` (partial `AlgorithmConfig`).

## Animation Architecture

Same pattern as eight-queens. Three layers work together:

### Layer 1: EpisodeBuffer (Producer)

Pre-computes episodes via `setTimeout(0)` producer loop. Batch size scales with speed (at speed 500, computes ~5 episodes per tick). The buffer stays ahead of the playhead so playback never stutters.

### Layer 2: AnimationClock (Driver)

rAF-based fractional playhead. In normal mode, advances at constant rate. `floor(playhead)` gives the current episode index. When the playhead crosses an integer boundary, the `onBoundary` callback fires.

### Layer 3: useBufferedAlgorithm (Consumer)

On boundary: consumes one episode from the buffer, appends to summaries, syncs React state, pushes undo snapshot.

On tick: updates `chartPlayheadRef` for smooth chart animation (no React re-render).

### Sweep Mode

When the user clicks Step or Step-N, the clock enters sweep mode: it animates the playhead from current position to the target over a duration (300ms for single step, 400–800ms for step-N). This creates smooth chart scrolling instead of jarring jumps. The `onSweepComplete` callback finalizes the episode summaries after the animation.

## Undo/Redo

### How It Works

1. **Before each step/resume:** Push a `HistorySnapshot` onto the undo stack
2. **HistorySnapshot contains:** `AlgorithmSnapshot` (Q-matrix sparse data + PRNG state + episode counters) + `summariesLength`
3. **On goBack:** Pop undo stack, restore algorithm state, trim summaries to saved length, snap chart playhead
4. **Redo stack:** The consumed episode entry is pushed to the redo stack. On resume/play, redo entries are prefilled into the buffer so they replay in order.
5. **Max 50 undo slots** — oldest entries evicted when full

### Why Snapshots Are Small (~10KB)

- Q-matrix is sparse: only non-zero entries stored (at most 243 states × 5 values)
- PRNG state is a single 32-bit integer
- Episode counters are a few numbers
- No full board state or step history stored — board state is reconstructed from PRNG seed on restore

## Keyboard Shortcuts

| Key | Action (Full Step tab) | Action (Granular Step tab) | Context |
| ----- | ------------------------ | --------------------------- | --------- |
| Space | Play / Pause episodes | Play / Pause phases | Only when algorithm started and not ended |
| → | Step `batchSize` episodes | Step `batchSize` phases (wraps across episodes) | Auto-starts with DEFAULT_CONFIG if not started; otherwise only when paused |
| Shift+→ | Step `10 × batchSize` episodes | Step `10 × batchSize` phases (wrapping) | Only when paused |
| ← | Back (undo episode) | Back one phase (undo episode at step 0, phase 0) | Only when paused and undo/phase available |
| S | Pin/unpin help text | Pin/unpin help text | Always (except when typing in inputs) |

## Sprites (`frontend/public/sprites/`)

PNG sprites for board rendering:

- `bender.png` — Bender character (rendered on Bender's current cell)
- `beer.png` — beer can (rendered on cells with cans)
- `bender-and-beer.png` — combined sprite (when Bender stands on a can)

Board.tsx loads these asynchronously via `new Image()`. While loading, falls back to text indicators ("B" for Bender, "C" for can).

Decorative images (not used by Board):

- `spaceship.png` — Planet Express ship (120×90px, displayed in left sidebar below tabs, 40% opacity)
- `fry-squinting.png` — Fry squinting meme (41×57px, displayed in header bar far right, 50% opacity)

## UI Patterns & Conventions

### Styling

- **All styles:** inline `React.CSSProperties` objects defined as `const styles: Record<string, React.CSSProperties>` at the bottom of each component file
- **No CSS files, no Tailwind, no styled-components**
- **Colors:** import from `frontend/src/colors.ts` — never use raw hex in new components
- **Font:** `'Segoe UI', 'Roboto', monospace` for the app shell, pure `monospace` for component text
- **Font sizes:** 10–14px range for most UI text, 20px for page titles

### Help System

- Add `data-help="Description"` to any element that should show help on hover
- Add `data-help-glossary="term-id"` to link to a glossary term (shows "See in Glossary →" when pinned)
- HelpBar automatically picks up these attributes via document-level event listeners

### Tab Border Technique

Active tabs use `borderLeft/Top/Bottom` with `borderRight: 'none'` and `marginRight: -1` to visually "open" into the content area. Inactive tabs use `padding` instead of border to reserve the same space without visible lines. `zIndex: 1` ensures the active tab renders above neighbors. `marginBottom: -1` creates seamless stacking.

### Canvas Rendering Pattern

Board and EpisodeChart use Canvas for performance:
1. Canvas element with refs
2. HiDPI: set `canvas.width = cssWidth * devicePixelRatio`, scale context by `devicePixelRatio`
3. ResizeObserver for responsive sizing (Board: buffer resolution only, CSS handles display size; Chart: sets both)
4. For chart: own rAF loop reading from refs (no React dependency)
5. For board: container with `aspectRatio: '1'` provides stable layout; ResizeObserver decoupled from draw via `drawRef` (empty `[]` deps — never torn down); re-render on state change via `useEffect`

### Flex Layout Pattern

Used throughout for scrollable nested flex columns:
```css
display: flex;
flex-direction: column;
flex: 1;
min-height: 0;    /* CRITICAL — allows flex children to shrink below content size */
overflow-y: auto;  /* on the content that should scroll */
```

## Infrastructure (`tofu/`)

OpenTofu (Terraform) in `tofu/`. Manages:
- `azurerm_resource_group` (bender-world-rg)
- `azurerm_static_web_app` (bender-world-app, Free tier)
- DNS CNAME record for bender.romaine.life
- `azurerm_static_web_app_custom_domain` with cname-delegation validation

Provider versions are centrally managed by infra-bootstrap (injected at runtime by Spacelift `before_init` hook).
Shared infra vars (`infra_resource_group_name`, `infra_dns_zone_name`) injected via Spacelift stack dependencies.

In infra-bootstrap: `bender-world` is `has_backend = false` (frontend-only, no Container App/Cosmos/AppConfig).

## CI/CD (`.github/workflows/`)

- `deploy.yml` — Phase 3 CD; triggered by push to main, `spacelift_infra_ready` dispatch, or manual. Builds Vite, fetches SWA deployment token via Spacelift outputs + Azure OIDC, deploys to Azure Static Web App.
- `lint.yml` — linting via shared template
- `spacelift-stack-to-main.yml` — resets Spacelift stack on PR merge
- `tofu-lockfile-check.yml` / `tofu-lockfile-update.yml` — OpenTofu lock file management

## Development

```bash
cd frontend
npm install
npm run dev     # Vite dev server (port 5173)
npm run build   # Production build (output: dist/)
npx tsc --noEmit  # Type check
```

## File Manifest

### Engine (`frontend/src/engine/`)
```
types.ts             - Enums, interfaces, constants (Percept, MoveType, MoveResult, AlgorithmConfig, etc.)
prng.ts              - Mulberry32 seeded PRNG; StatefulPrng for snapshot/restore
perception.ts        - 3^5 base-3 perception state encoding; getPerceptionId, getPerceptsById
board.ts             - GameBoard class; 10×10 grid, can placement, wall detection, move execution
q-matrix.ts          - QMatrix class; 243×5 sparse map; epsilon-greedy selection; snapshot/restore
algorithm-runner.ts  - AlgorithmRunner; wraps board+qmatrix+prng; runs episodes/steps; snapshots
episode-buffer.ts    - EpisodeBuffer; async producer loop (setTimeout); WalkthroughStep capture
animation-clock.ts   - AnimationClock; rAF playhead; normal + sweep modes; boundary callbacks
phase-data.ts        - Phase decomposition types; StepPhase enum; 5 phase data interfaces
```

### Components (`frontend/src/components/`)
```
App.tsx              - Root layout (sticky top + sidebar + content); tab orchestration
TabBar.tsx           - 5-tab vertical sidebar navigation
GettingStartedTab.tsx - Welcome page with quick-start button and board preview
HelpBar.tsx          - Contextual help display (data-help hover + S pin)
HelpGlossary.tsx     - 6-section glossary (Problem, Q-Learning, Q-Matrix, Perception, Controls, Presets)
ConfigPanel.tsx      - Preset buttons + parameter sliders + reward sliders + Start button
Controls.tsx         - Playback bar: Play/Pause/Back/Step/+10/+100/Reset + speed slider
Board.tsx            - Canvas-rendered 10×10 grid with sprites
StatusBar.tsx        - Real-time stats badges (episode, step, reward, epsilon, etc.)
EpisodeChart.tsx     - Canvas reward chart with gradients, moving average, tooltips
PerceptionDisplay.tsx - 3×3 compass rose showing 5-cell perception
QMatrixInspector.tsx - Q-value table viewer with state selector and full table
SettingsSummary.tsx  - Active configuration key-value display
StepWalkthrough.tsx  - Step-by-step episode replay (legacy, no longer rendered)
PhaseBar.tsx         - 5-segment pipeline progress bar (Perceive/Decide/Act/Reward/Learn)
PerceivePanel.tsx    - Phase 0: sensor readings + base-3 encoding table
DecidePanel.tsx      - Phase 1: epsilon-greedy decision visualization
ActPanel.tsx         - Phase 2: move execution + result badge
RewardPanel.tsx      - Phase 3: reward lookup + running episode total
LearnPanel.tsx       - Phase 4: Q-update formula walkthrough + before/after Q-row
```

### Hooks & Data
```
hooks/use-buffered-algorithm.ts  - Central state hook (engine + buffer + clock + undo/redo)
data/presets.ts                  - 4 algorithm presets (Default, Fast Learner, Cautious, Explorer)
colors.ts                        - Centralized color palette
main.tsx                         - React entry point (StrictMode + createRoot)
```

### Config & Static
```
index.html           - HTML template (root div + module script)
vite.config.ts       - Vite config (React plugin, port 5173)
public/sprites/      - bender.png, beer.png, bender-and-beer.png
```

## Change Log

Reverse-chronological record of significant changes, decisions, and context that isn't obvious from the code or git history alone. Prune entries that become stale or are fully captured by the code itself.

### 2026-03-11
- Restructured App.tsx to match eight-queens sidebar+content layout. Previous attempt (~50 conversations worth of incremental changes) had partially updated TabBar/Controls/StepWalkthrough/HelpBar/HelpGlossary to use new tab IDs and vertical sidebar styling, but left App.tsx on old tab IDs (`overview`/`inspect`/`walkthrough`) and old two-column layout — app was completely broken because TabBar exported new IDs that App.tsx didn't reference.
- Created GettingStartedTab.tsx adapted from eight-queens: two-column layout with welcome text, help bar guide, quick-start buttons, how-it-works terms, and a static board preview. Quick-start buttons auto-start with DEFAULT_CONFIG and navigate to the correct tab.
- Wired HelpBar and HelpGlossary into App.tsx. Glossary tab gets a secondary vertical sidebar (opTabStrip pattern) for section picking.
- Full Step tab: Board+StatusBar | EpisodeChart (2-column flex). Granular Step tab: StepWalkthrough+Board (left col) | PerceptionDisplay+QMatrixInspector (right col, scrolls).
- Fixed StepWalkthrough props (was passing `stepHistory={null}` and missing `onNextEpisode`/`onPrevEpisode`/`canGoBack`/`algorithmEnded`).
- Rewrote CLAUDE.md with comprehensive documentation of every feature, component, engine module, and pattern.
- Added this Change Log section — going forward, every session should append a dated entry summarizing what changed, why, what was tried/rejected, and any open threads.
- Fixed board "slow expand" on tab switch to Granular Step. The `granularLeftCol` used `flex: '0 0 auto'`, letting flexbox negotiate width over multiple frames — Board's ResizeObserver fired on each intermediate size, causing the canvas to visually grow. Fixed by locking the column to `flex: '0 0 600px'` and adding `maxWidth: 600` to Board's container style.
- Fixed page-level scrollbar on Granular Step tab. The browser's default `body { margin: 8px }` pushed the `100vh` app container beyond the viewport. Added `body { margin: 0; }` reset in `index.html`.
- Fixed Board and PerceptionDisplay not updating when stepping through an episode in Granular Step tab. Board and PerceptionDisplay were always receiving end-of-episode state (`algorithm.boardState`/`algorithm.currentPerceptionId`). Now derives per-step state from `lastStepHistory[stepIndex].boardSnapshot` when available, so Bender visually moves on the grid as the user clicks ">" in StepWalkthrough.
- Fixed QMatrixInspector not updating per-step in Granular Step tab (same pattern as Board/PerceptionDisplay bug above). Added `qMatrixSnapshot: Map<number, number[]>` to `WalkthroughStep` in episode-buffer.ts, captured per step in `computeEpisodeWithSteps`. App.tsx now reconstructs a per-step QMatrix via `useMemo` and passes it to QMatrixInspector along with the per-step perception key. ~10KB per snapshot × 200 steps = ~2MB per episode, acceptable since only one episode's history is kept.

### 2026-03-12
- Moved StepWalkthrough from the left column to the right column in the Granular Step tab. StepWalkthrough and PerceptionDisplay now sit side-by-side in a 50/50 flex row at the top of the right column, with QMatrixInspector below. Board is now the sole occupant of the left column. Added `granularTopRow` and `granularTopRowHalf` styles to App.tsx.
- Replaced the generic Material Design color palette with a Futurama-themed palette in `colors.ts`. Backgrounds shifted from dark indigo to oxidized gunmetal steel (`#0a0f14`–`#223d4e`). Accents changed to acidic lime green (`#5fd64d`), warm beer-amber (`#f5c842`), electric blue/purple, neon red — industrial feel matching Bender's universe. Board tiles shifted from light gray with colored borders to metallic silver with teal (explored) and lime (current) borders.
- Migrated all 7 legacy components from hardcoded hex colors to `colors.ts` tokens: QMatrixInspector (38 values), Board (13), PerceptionDisplay (11), ConfigPanel (11), StatusBar (11), SettingsSummary (9), Controls (2). Only `#fff` (white button text) remains as inline hex across the codebase. Removed local `PERCEPT_COLORS` / `TILE` / `COLORS` redefinitions in favor of `colors.perception.*` and `colors.board.*`.
- Fixed jarring size jump in StepWalkthrough between empty and populated states. Detail rows (Position, Move, Strategy, etc.) are now always rendered — showing "—" placeholders in `colors.text.disabled` when no step data exists, so the component maintains stable height before and after the first step.
- Fixed jarring size jump in QMatrixInspector detail row between states with and without Q-values. Previously showed a small italic "State X has no Q-values yet" text vs 5 action boxes — now always renders the 5 action boxes, showing `0.000` in disabled color when the state has no Q-values yet.
- Fixed QMatrixInspector detail boxes and percept dropdowns shifting width based on content (e.g., "-0.500" wider than "0.000"). Changed `flex: '1 1 auto'` → `flex: '1 1 0'` on both `detailItem` and `perceptDropdownGroup` styles so all boxes share equal width regardless of value.
- Pre-populated the Board on the Getting Started tab. Instead of `boardState={null}` (empty gray grid + placeholder text), GettingStartedTab now creates a static `PREVIEW_BOARD` via a module-level IIFE: `GameBoard` with fixed seed 42, shuffled cans and Bender. Removed the dead placeholder overlay and style from Board.tsx.
- Adopted **"run"** as the formal term for the complete sequence of all episodes in a training session. Added "Run" glossary term to HelpGlossary (algorithm section) and GettingStartedTab (How It Works terms). Documented in CLAUDE.md Algorithm Termination section. (Eight-queens already had "epoch" for the equivalent concept.)
- Added pre-start → (right arrow) shortcut: pressing → before training starts auto-starts with `DEFAULT_CONFIG`, switches to Granular Step tab, enables step capture, and steps one episode. Implemented as a `useEffect` in App.tsx that only runs when `!hasStarted` — no conflict with Controls.tsx's keyboard handler which only mounts after start. Explicitly calls `setCaptureSteps(true)` before `step()` because the tab-switching `useEffect` won't fire until the next render.
- Fixed visited cell (teal border) highlights not updating when stepping backward in Granular Step tab. Board's internal `visitedRef` Set only grew — never shrank on backward navigation. Added optional `visitedCells?: Set<string>` prop to Board. App.tsx computes the set from `lastStepHistory[0..stepIndex]` positions so stepping backward correctly removes teal highlights from cells Bender hasn't visited yet at that step. Internal `visitedRef` tracking is skipped when the prop is provided. Full Step tab and Getting Started tab are unaffected (no prop passed, use internal tracking).
- Fixed subtle vertical layout shift in Granular Step tab when stepping the first episode. The StepWalkthrough slider row changed height between placeholder text ("Click > to step the first episode") and the actual `<input type="range">` — placeholder could wrap at narrow widths, and bold vs normal-weight values in detail rows had slightly different line heights. Fixed by adding explicit `height: 28` on the slider row and `height: 22` on each detail row, plus `whiteSpace: nowrap` on the placeholder text. This eliminates the ~2px shift that caused QMatrixInspector to jump up.
- Added decorative Futurama images sourced from the original C# repo on GitHub (`nelsong6/BenderWorld`). Planet Express ship (`spaceship.png`, resized from 1024×768 to 120×90) in the left sidebar below the tab bar, pushed to bottom via `marginTop: 'auto'`, 40% opacity. Fry squinting (`fry-squinting.png`, 41×57) in the header bar far right, 64px display height, aligned flush with the header's bottom border via `alignSelf: 'flex-end'` + `marginBottom: -12`, 50% opacity. Both are `pointerEvents: 'none'` decorations.
- Made Controls bar (Play/Back/Step/+10/+100) operate at micro-step granularity when the Granular Step tab is active. Previously all controls always advanced full episodes, forcing users to use the small `< >` buttons in StepWalkthrough. Now App.tsx wraps the Controls callbacks based on `activeTab === 'granular'`: Step advances one micro-step within the episode (advancing to next episode at end), Back goes back one step (undoing the episode at step 0), +10/+100 jump N steps clamped to episode end. Play uses a `setInterval`-based auto-advance loop (`microPlaying` state + `microIntervalRef`) instead of the AnimationClock pipeline. Controls.tsx gained a minimal `isMicro` prop for the label; all behavioral logic lives in App.tsx. Safety effects stop micro-play on tab switch, reset, and algorithm end.
- Replaced all green accent colors with muted sage-green (`#5a8e70`) to match the Planet Express ship hull color. Changed 7 values in `colors.ts`: `accent.green`, `accent.greenLight`, `board.currentBorder`, `chart.rewardLine/Glow/Fill`, `qValue.positive`. The previous bright acidic lime (`#5fd64d`) was visually inconsistent with the ship sprite. Teal (`#2fbfc9`) left unchanged — it serves a distinct semantic role for explored cells.
- **Phase-level granular step mode.** Replaced the step-level Granular Step tab with a 5-phase drill-down that decomposes each Q-learning micro-step into Perceive → Decide → Act → Reward → Learn. Each phase has its own detail panel showing all intermediate calculations (sensor readings, epsilon roll, move outcome, reward lookup, full Q-update formula with 8 intermediate values). Controls advance one phase per click (5 phases = 1 full step). New engine layer: `phase-data.ts` (types), `q-matrix.selectActionDetailed()` / `updateDetailed()` (capture intermediates without breaking PRNG determinism), `algorithm-runner.runStepWithPhases()`, extended `WalkthroughStep.phases`. New UI: `PhaseBar.tsx` (pipeline progress bar), `PerceivePanel.tsx`, `DecidePanel.tsx`, `ActPanel.tsx`, `RewardPanel.tsx`, `LearnPanel.tsx`. Removed `full` tab → replaced with `chart` tab (EpisodeChart + Board + StatusBar). Removed "Full Run (advanced) →" button from GettingStartedTab.
- Renamed "Chart" tab label to **"Full Step"** (tab ID remains `chart`). Updated HelpGlossary controls section — replaced stale "Overview Tab" / "Inspect Tab" / "Walkthrough Tab" entries with current "Full Step Tab" and "Granular Step Tab" descriptions. Updated all CLAUDE.md references from "Chart tab" to "Full Step tab".
- Fixed board "zoom" animation on tab switch to Granular Step. Root cause: Board.tsx set canvas CSS size via JavaScript (in a `ResizeObserver` callback), which always lagged layout by at least one frame — the canvas was painted at intermediate sizes as flexbox settled. Multiple approaches tried and rejected: minimum-width guards on ResizeObserver (still fired at intermediate widths >50px), opacity-hide-then-reveal (ResizeObserver effect depended on `[draw]` which changed every render, resetting opacity each time), decoupling ResizeObserver from draw via `drawRef` + `[]` deps (fixed the re-creation but canvas still appeared at wrong size before first callback). Final fix: container uses `aspectRatio: '1'` for stable square layout from first frame, canvas fills via CSS (`width/height: 100%`), ResizeObserver only sets buffer resolution (`canvas.width/height * devicePixelRatio`) — JS never touches `canvas.style.width/height`.

### 2026-03-13

- **Split speed slider into Batch + Speed.** The single speed slider previously controlled both playback rate and was mislabeled (displayed "N steps/s" but used formula `501 - N` which didn't match). Replaced with two independent sliders: **Batch** (green, 1–500, controls how many phases/episodes per Step press — at batch=5 in granular mode, each press = one full Q-learning step) and **Speed** (orange, 0.25–500, controls auto-play tick rate). Both values are click-to-edit for direct text entry via `EditableValue` sub-component (span always rendered for layout stability, input overlays absolutely when editing). Speed slider minimum is 0.25 (4 seconds per tick), fractional values below 1 snap to quarter increments.
- **Separated batch size from clock speed in the hook.** `use-buffered-algorithm.ts` `setSpeed` now only updates batch size state + buffer computation batch size. New `setClockSpeed` method updates only the AnimationClock rate. App.tsx owns `playSpeed` as local state and syncs it to the clock via `setClockSpeed`.
- **Removed `handleGranularStep` (single-phase advance).** All granular stepping now goes through `handleGranularStepN(count)`, which also handles episode boundaries (advances to next episode when batch overflows instead of clamping and getting stuck). Previously `handleGranularStepN` clamped to the episode end, causing auto-play to freeze at the last phase.
- **Micro-play interval uses fixed tick rate.** Previously interval delay was `501 - speed` (broken formula). Now fires at `1000 / playSpeed` ms per tick, advancing `batchSize` phases per tick. `playSpeed` and `batchSize` are independent — higher batch = more work per tick, higher speed = more ticks per second.

### 2026-03-16

- **Client-side URL routing via History API.** Added `tabFromPath()`/`pathFromTab()` helpers and a `navigateTab` callback that calls `setActiveTab` + `history.pushState`. Default tab (`getting-started`) maps to `/`, all others to `/{tabId}`. A `popstate` listener handles browser back/forward. All `setActiveTab` call sites (TabBar `onTabChange`, `handleOpenGlossary`, `handleStartGranular`, pre-start arrow-key shortcut) replaced with `navigateTab`. `staticwebapp.config.json` already had `navigationFallback` with `rewrite: "/index.html"`. Pattern matches kill-me implementation.

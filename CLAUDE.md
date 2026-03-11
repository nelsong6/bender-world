# bender-world

Q-Learning reinforcement learning visualization. Bender learns to collect beer cans on a 10x10 grid.
Ported from C# WinForms app, then rebooted with architecture from eight-queens project.
Original C# code is in d:\workspace\BenderWorld-repo.

## Overview

Frontend-only static app (Vite + React + TypeScript). No backend or API.
Seeded PRNG enables deterministic replay and undo/redo via lightweight snapshots.

## Q-Learning Algorithm

- 10x10 grid with randomly placed beer cans (~50% density)
- Bender perceives 5 inputs: Left, Right, Down, Up, Here (each: Wall/Can/Empty)
- 5 possible actions: Left, Right, Down, Up, Grab
- 3^5 = 243 possible perception states, each with 5 Q-values
- Epsilon-greedy action selection (epsilon decays over episodes)
- Q-update: Q(s,a) += eta * (reward + gamma * max(Q(s',a')) - Q(s,a))
- Rewards: CanCollected (+10), HitWall (-5), CanMissing (-1), MoveSuccessful (0)

## Engine Layer (frontend/src/engine/)

```
prng.ts            - Mulberry32 seeded PRNG; StatefulPrng for snapshot/restore
perception.ts      - Perception state encoding (3^5 base-3 system); getPerceptionId, getPerceptsById
board.ts           - GameBoard class; 10x10 grid, can placement, wall detection; takes rng in constructor
q-matrix.ts        - QMatrix class; 243x5 sparse map; selectAction(epsilon-greedy); snapshot/restore
algorithm-runner.ts - AlgorithmRunner; wraps board+qmatrix; runs episodes; getSnapshot/restoreSnapshot
episode-buffer.ts  - EpisodeBuffer; async lookahead buffer (setTimeout); pre-computes episodes ahead
animation-clock.ts - AnimationClock; rAF-based fractional playhead; normal mode + sweep animations
types.ts           - All interfaces: AlgorithmConfig, EpisodeSummary, StepResult, etc.
```

Hook: `useBufferedAlgorithm` wires everything to React state. Manages undo/redo (MAX_UNDO=50), chart refs, speed.

## Key Types

- `AlgorithmConfig` — epsilon, gamma, eta, episodeLimit, stepLimit, rewards?, seed?
- `EpisodeSummary` — episodeNumber, totalReward, cansCollected, stepsUsed, epsilonAtStart
- `StepResult` — benderPosition, move, moveResult, reward, episodeReward, perception, wasRandomMove
- `AlgorithmSnapshot` — qMatrixData, currentEpisode, currentEpsilon, totalReward, prngState
- `BoardState` — board (10x10 cells with hasCan/hasBender/walls), benderPosition, perceptionKey

## UI Layout (App.tsx)

Two-column layout with tab-driven right panel.

**Header:** Title + subtitle

**Left column:**
- `Board` — Canvas-drawn 10x10 grid with sprite overlays (Bender, beer can)
- `Controls` — Play/Pause/Back/Step/+10/+100/Reset + logarithmic speed slider (1-500 ep/s)
- `StatusBar` — Episode, Step, Rewards, Cans, Epsilon, Gamma

**Right column (tabbed):**
- **Overview tab:** ConfigPanel (presets + sliders) + SettingsSummary + EpisodeChart
- **Inspect tab:** PerceptionDisplay (compass rose) + QMatrixInspector (state selector + table)
- **Walkthrough tab:** StepWalkthrough (step slider + move/result/reward details)

## Animation Architecture

Same pattern as eight-queens:

1. **EpisodeBuffer** pre-computes episodes via setTimeout(0) producer loop
2. **AnimationClock** drives rAF fractional playhead; `floor(playhead)` = episode index
3. **EpisodeChart** reads from refs (summariesRef, playheadRef, lookaheadRef) — no React re-render needed
4. Chart interpolates tip between last consumed episode and lookahead for smooth animation
5. Sweep mode: step/stepN triggers an eased animation to the target playhead position

## Undo/Redo

Lightweight snapshots (~10KB each): Q-matrix sparse map + PRNG state + episode count.
Max 50 undo slots. Back button pops undo stack, pushes to redo. Redo entries are consumed on play/step.

## Keyboard Shortcuts

- Space: Play/Pause
- Right arrow: Step one episode
- Shift+Right: Step 10 episodes
- Left arrow: Back (undo)

## Presets (frontend/src/data/presets.ts)

| id | name | epsilon | gamma | eta | episodes | steps |
|----|------|---------|-------|-----|----------|-------|
| default | Default | 0.2 | 0.9 | 0.1 | 5000 | 200 |
| fast-learner | Fast Learner | 0.3 | 0.9 | 0.3 | 3000 | 200 |
| cautious | Cautious | 0.1 | 0.95 | 0.05 | 10000 | 200 |
| explorer | Explorer | 0.5 | 0.8 | 0.2 | 5000 | 300 |

## UI Patterns

- **Colors**: Centralized palette in `frontend/src/colors.ts` (new components use it; legacy components have inline hex)
- **All styles**: inline `React.CSSProperties` objects — no CSS files, no Tailwind
- **Chart**: Canvas-based with gradient fills, glow effects, HiDPI support, hover tooltips
- **data-help**: Elements use `data-help` attributes for future HelpBar integration

## Sprites

PNG sprites in `frontend/public/sprites/`: bender.png, beer.png, bender-and-beer.png.
Board.tsx loads them asynchronously; falls back to text "B"/"C" while loading.

## Infra (tofu/)

OpenTofu (Terraform) in `tofu/`. Manages:
- `azurerm_resource_group` (bender-world-rg)
- `azurerm_static_web_app` (bender-world-app, Free tier)
- DNS CNAME record for bender.romaine.life
- `azurerm_static_web_app_custom_domain` with cname-delegation validation

Provider versions are centrally managed by infra-bootstrap (injected at runtime by Spacelift `before_init` hook).
Shared infra vars (`infra_resource_group_name`, `infra_dns_zone_name`) injected via Spacelift stack dependencies.

In infra-bootstrap: `bender-world` is `has_backend = false` (frontend-only, no Container App/Cosmos/AppConfig).

## CI/CD (.github/workflows/)

- `deploy.yml` — Phase 3 CD; triggered by push to main, `spacelift_infra_ready` dispatch, or manual. Builds Vite, fetches SWA deployment token via Spacelift outputs + Azure OIDC, deploys to Azure Static Web App.
- `lint.yml` — linting via shared template
- `spacelift-stack-to-main.yml` — resets Spacelift stack on PR merge
- `tofu-lockfile-check.yml` / `tofu-lockfile-update.yml` — OpenTofu lock file management

## Development

```bash
cd frontend
npm install
npm run dev     # Vite dev server
npm run build   # Production build
npx tsc --noEmit  # Type check
```

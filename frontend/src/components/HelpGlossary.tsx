import React from 'react';
import { colors } from '../colors';

export type HelpSectionId = 'problem' | 'algorithm' | 'qmatrix' | 'perception' | 'controls' | 'presets';

export const HELP_SECTIONS: Array<{ id: HelpSectionId; label: string; helpText: string }> = [
  { id: 'problem',    label: 'The Problem',   helpText: "Bender's world: a 10×10 grid with beer cans and walls" },
  { id: 'algorithm',  label: 'Q-Learning',    helpText: 'Q-Learning algorithm concepts: episodes, steps, rewards, convergence' },
  { id: 'qmatrix',    label: 'Q-Matrix',      helpText: 'The Q-value table that stores learned action values for each state' },
  { id: 'perception', label: 'Perception',     helpText: "How Bender perceives the world: 5 sensors × 3 states = 243 possible perceptions" },
  { id: 'controls',   label: 'Controls',       helpText: 'Playback, keyboard shortcuts, tabs, and step walkthrough' },
  { id: 'presets',    label: 'Presets',        helpText: 'Configuration presets for different learning behaviors' },
];

const SECTION_TITLES: Record<HelpSectionId, string> = {
  problem:    "Bender's World",
  algorithm:  'Q-Learning Algorithm',
  qmatrix:    'The Q-Matrix',
  perception: 'Perception System',
  controls:   'Using the Controls',
  presets:    'Configuration Presets',
};

const Term: React.FC<{ term: string; id?: string; children: React.ReactNode }> = ({ term, id, children }) => (
  <div id={id} style={styles.term}>
    <span style={styles.termKey}>{term}</span>
    <span style={styles.termVal}>{children}</span>
  </div>
);

interface Props {
  section: HelpSectionId;
}

export const HelpGlossary: React.FC<Props> = ({ section }) => (
  <div style={styles.container}>
    <div style={styles.inner}>
      <h3 style={styles.sectionTitle}>{SECTION_TITLES[section]}</h3>

      {section === 'problem' && (
        <>
          <p style={styles.para}>
            Bender lives on a 10×10 grid. Some cells contain beer cans, some have walls.
            The goal: learn to collect as many cans as possible in each episode.
          </p>
          <Term term="Grid" id="glossary-grid">
            10×10 board. Each cell is empty, has a beer can, or is a wall. Bender can move North, South, East, West, or attempt to Pick Up a can.
          </Term>
          <Term term="Beer Can" id="glossary-beer-can">
            Collecting a can gives +10 reward. Attempting to pick up where no can exists gives −1.
          </Term>
          <Term term="Wall" id="glossary-wall">
            Moving into a wall gives −5 reward and Bender stays put.
          </Term>
          <Term term="Episode" id="glossary-episode">
            One complete run on the board (up to the step limit). The board is reset with fresh cans each episode.
          </Term>
          <Term term="Step" id="glossary-step">
            One action within an episode: Bender perceives, chooses an action, receives a reward.
          </Term>
        </>
      )}

      {section === 'algorithm' && (
        <>
          <p style={styles.para}>
            Q-Learning is a model-free reinforcement learning algorithm. The agent learns a value
            (Q-value) for each state-action pair through repeated trial and error.
          </p>
          <Term term="Q-Value" id="glossary-q-value">
            The expected cumulative reward for taking an action in a given state. Higher = better.
          </Term>
          <Term term="Epsilon (ε)" id="glossary-epsilon">
            Exploration rate. With probability ε, Bender picks a random action instead of the greedy best. Decays over time so the agent explores less as it learns.
          </Term>
          <Term term="Gamma (γ)" id="glossary-gamma">
            Discount factor (0–1). How much future rewards matter vs. immediate reward. Higher γ = more farsighted.
          </Term>
          <Term term="Eta (η)" id="glossary-eta">
            Learning rate. How quickly new experience overrides old Q-values. Higher η = faster learning but more volatile.
          </Term>
          <Term term="Reward" id="glossary-reward">
            Immediate feedback: +10 for picking up a can, −1 for a missed pickup, −5 for hitting a wall, 0 for a normal move.
          </Term>
          <Term term="Convergence" id="glossary-convergence">
            The Q-values stabilize and the agent consistently achieves high reward. Visible as the chart flattening at a high level.
          </Term>
          <Term term="Run" id="glossary-run">
            The full training session — all episodes from start to completion. A run ends when the episode limit is reached.
          </Term>
        </>
      )}

      {section === 'qmatrix' && (
        <>
          <p style={styles.para}>
            The Q-matrix maps each perception (state) to Q-values for all 5 possible actions.
            With 243 possible perceptions × 5 actions, the full matrix has 1,215 entries.
          </p>
          <Term term="State (Perception)" id="glossary-state">
            What Bender sees: 5 sensor readings (North, South, East, West, Current), each with 3 possible values (Empty, Can, Wall). 3⁵ = 243 unique states.
          </Term>
          <Term term="Action" id="glossary-action">
            One of 5 moves: MoveNorth, MoveSouth, MoveEast, MoveWest, PickUp.
          </Term>
          <Term term="Greedy Action" id="glossary-greedy">
            The action with the highest Q-value for the current perception. Chosen when not exploring.
          </Term>
          <Term term="Random Action" id="glossary-random">
            A uniformly random action, chosen with probability ε for exploration.
          </Term>
        </>
      )}

      {section === 'perception' && (
        <>
          <p style={styles.para}>
            Bender can sense 5 adjacent cells: the four cardinal directions plus the cell he's standing on.
            Each sensor returns one of 3 values, encoded as a base-3 digit.
          </p>
          <Term term="Sensor Values">
            Empty (0), Can (1), Wall (2). The cell under Bender can only be Empty or Can.
          </Term>
          <Term term="Perception Key" id="glossary-perception-key">
            A 5-character string like "10201" representing [North, South, East, West, Current].
            Converted to a base-3 number (0–242) as the Q-matrix row index.
          </Term>
          <Term term="Example">
            "10201" means: Can to the North, Empty to the South, Wall to the East, Empty to the West, Can underfoot.
          </Term>
        </>
      )}

      {section === 'controls' && (
        <>
          <Term term="Play / Pause (Space)">Run episodes continuously at the configured speed, or pause.</Term>
          <Term term="Step (→)">Advance one episode. In walkthrough mode, advances one step within an episode.</Term>
          <Term term="Step 10 (Shift+→)">Advance 10 episodes at once using fast-sweep mode.</Term>
          <Term term="Back (←)">Undo the last episode (up to 50 undo slots).</Term>
          <Term term="Reset">Return to the configuration screen. All progress is lost.</Term>
          <Term term="Speed Slider">Logarithmic 1–500 episodes/second. Controls auto-play speed.</Term>
          <Term term="Overview Tab">Configuration, settings summary, and the episode reward chart.</Term>
          <Term term="Inspect Tab">Perception display and Q-matrix inspector for the current state.</Term>
          <Term term="Walkthrough Tab">Step-by-step playback of a single episode with board snapshots.</Term>
          <Term term="Hold Help (S)">Press S to pin the current help text. Press S again to unpin.</Term>
        </>
      )}

      {section === 'presets' && (
        <>
          <Term term="Default">Standard parameters: ε=0.15, γ=0.9, η=0.2, 5000 episodes, 200 steps.</Term>
          <Term term="Fast Learner">Higher learning rate (η=0.3) and exploration (ε=0.3). Learns quickly but may be unstable.</Term>
          <Term term="Cautious">Low exploration (ε=0.1), high discount (γ=0.95), tiny learning rate (η=0.05). Slow but steady convergence.</Term>
          <Term term="Explorer">Very high exploration (ε=0.5). Tries many random actions before settling on a policy.</Term>
        </>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 0',
  },
  inner: {
    maxWidth: 800,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: -0.3,
    borderBottom: `1px solid ${colors.border.subtle}`,
    paddingBottom: 10,
  },
  para: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: '1.7',
    margin: '0 0 10px 0',
  },
  term: {
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
    minWidth: 140,
    flexShrink: 0,
  },
  termVal: {
    color: colors.text.secondary,
    lineHeight: '1.5',
  },
};

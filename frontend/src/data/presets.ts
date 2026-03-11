import { AlgorithmConfig, DEFAULT_CONFIG } from '../engine/types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: AlgorithmConfig;
}

export const PRESETS: Preset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard Q-Learning parameters',
    config: { ...DEFAULT_CONFIG },
  },
  {
    id: 'fast-learner',
    name: 'Fast Learner',
    description: 'Higher learning rate, more exploration',
    config: { epsilon: 0.3, gamma: 0.9, eta: 0.3, episodeLimit: 3000, stepLimit: 200 },
  },
  {
    id: 'cautious',
    name: 'Cautious',
    description: 'Low exploration, high discount',
    config: { epsilon: 0.1, gamma: 0.95, eta: 0.05, episodeLimit: 10000, stepLimit: 200 },
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'High exploration rate',
    config: { epsilon: 0.5, gamma: 0.8, eta: 0.2, episodeLimit: 5000, stepLimit: 300 },
  },
];

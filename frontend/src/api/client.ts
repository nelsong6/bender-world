const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: {
    epsilon: number;
    gamma: number;
    eta: number;
    episodeLimit: number;
    stepLimit: number;
  };
}

export interface RunSummary {
  id: string;
  createdAt: string;
  status: string;
  config: Preset['config'];
  summary: { totalEpisodes: number; finalAvgReward: number };
}

export interface RunDetail extends RunSummary {
  episodes: Array<{
    episodeNumber: number;
    totalReward: number;
    cansCollected: number;
    stepsUsed: number;
    epsilonAtStart: number;
  }>;
  qMatrix: { data: Record<string, number[]>; snapshotEpisode: number };
}

export const api = {
  getPresets: () => request<Preset[]>('/api/presets'),

  listRuns: () => request<RunSummary[]>('/api/runs'),

  createRun: (config: Preset['config']) =>
    request<RunDetail>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),

  getRun: (id: string) => request<RunDetail>(`/api/runs/${id}`),

  appendEpisodes: (
    id: string,
    episodes: RunDetail['episodes'],
    summary?: Partial<RunDetail['summary']>,
  ) =>
    request<{ episodeCount: number; summary: RunDetail['summary'] }>(
      `/api/runs/${id}/episodes`,
      { method: 'PATCH', body: JSON.stringify({ episodes, summary }) },
    ),

  updateQMatrix: (
    id: string,
    qMatrix: RunDetail['qMatrix'],
    status?: string,
  ) =>
    request<{ snapshotEpisode: number }>(`/api/runs/${id}/qmatrix`, {
      method: 'PATCH',
      body: JSON.stringify({ qMatrix, status }),
    }),

  deleteRun: (id: string) =>
    request<void>(`/api/runs/${id}`, { method: 'DELETE' }),
};

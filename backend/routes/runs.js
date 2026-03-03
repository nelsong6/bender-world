import { Router } from 'express';
import crypto from 'crypto';

/**
 * Creates the /api routes for managing training runs.
 *
 * Public routes:
 *   GET /api/presets - curated preset configurations
 *
 * Owner-only routes:
 *   GET    /api/runs           - list all runs
 *   POST   /api/runs           - create a new run
 *   GET    /api/runs/:id       - get a run with full data
 *   PATCH  /api/runs/:id/episodes - append episode summaries
 *   PATCH  /api/runs/:id/qmatrix  - update Q-matrix snapshot
 *   DELETE /api/runs/:id       - delete a run
 */
export function createRunRoutes({ container, requireAuth, requireOwner }) {
  const router = Router();

  // ── Curated presets (public) ──────────────────────────────────────────
  const PRESETS = [
    {
      id: 'quick-demo',
      name: 'Quick Demo',
      description: 'Fast run to see the algorithm in action',
      config: { epsilon: 0.3, gamma: 0.9, eta: 0.2, episodeLimit: 100, stepLimit: 50 },
    },
    {
      id: 'standard',
      name: 'Standard Training',
      description: 'Balanced parameters for a full training session',
      config: { epsilon: 0.2, gamma: 0.9, eta: 0.1, episodeLimit: 5000, stepLimit: 200 },
    },
    {
      id: 'long-run',
      name: 'Long Run',
      description: 'Extended training for deeper convergence',
      config: { epsilon: 0.15, gamma: 0.95, eta: 0.05, episodeLimit: 20000, stepLimit: 200 },
    },
    {
      id: 'high-exploration',
      name: 'High Exploration',
      description: 'More randomness to explore diverse strategies',
      config: { epsilon: 0.5, gamma: 0.8, eta: 0.1, episodeLimit: 5000, stepLimit: 200 },
    },
  ];

  router.get('/api/presets', (req, res) => {
    res.json(PRESETS);
  });

  // ── Owner-only routes ─────────────────────────────────────────────────
  router.get('/api/runs', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { resources } = await container.items.query({
        query: 'SELECT c.id, c.createdAt, c.status, c.config, c.summary FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      }).fetchAll();

      res.json(resources);
    } catch (error) {
      console.error('Error listing runs:', error);
      res.status(500).json({ error: 'Failed to list runs' });
    }
  });

  router.post('/api/runs', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { config } = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Request body must contain a config object' });
      }

      const run = {
        id: `run_${crypto.randomUUID()}`,
        userId,
        type: 'run',
        createdAt: new Date().toISOString(),
        status: 'running',
        config,
        summary: { totalEpisodes: 0, finalAvgReward: 0 },
        episodes: [],
        qMatrix: { data: {}, snapshotEpisode: 0 },
      };

      const { resource } = await container.items.create(run);
      res.status(201).json(resource);
    } catch (error) {
      console.error('Error creating run:', error);
      res.status(500).json({ error: 'Failed to create run' });
    }
  });

  router.get('/api/runs/:id', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { resource } = await container.item(req.params.id, userId).read();

      if (!resource) {
        return res.status(404).json({ error: 'Run not found' });
      }

      res.json(resource);
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Run not found' });
      }
      console.error('Error fetching run:', error);
      res.status(500).json({ error: 'Failed to fetch run' });
    }
  });

  router.patch('/api/runs/:id/episodes', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { episodes, summary } = req.body;

      if (!Array.isArray(episodes)) {
        return res.status(400).json({ error: 'Request body must contain an episodes array' });
      }

      // Read current doc, append episodes, update summary
      const { resource: current } = await container.item(req.params.id, userId).read();
      if (!current) {
        return res.status(404).json({ error: 'Run not found' });
      }

      current.episodes.push(...episodes);
      if (summary) {
        current.summary = { ...current.summary, ...summary };
      }

      const { resource } = await container.item(req.params.id, userId).replace(current);
      res.json({ episodeCount: resource.episodes.length, summary: resource.summary });
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Run not found' });
      }
      console.error('Error appending episodes:', error);
      res.status(500).json({ error: 'Failed to append episodes' });
    }
  });

  router.patch('/api/runs/:id/qmatrix', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      const { qMatrix } = req.body;

      if (!qMatrix || typeof qMatrix !== 'object') {
        return res.status(400).json({ error: 'Request body must contain a qMatrix object' });
      }

      const { resource: current } = await container.item(req.params.id, userId).read();
      if (!current) {
        return res.status(404).json({ error: 'Run not found' });
      }

      current.qMatrix = qMatrix;
      if (req.body.status) {
        current.status = req.body.status;
      }

      const { resource } = await container.item(req.params.id, userId).replace(current);
      res.json({ snapshotEpisode: resource.qMatrix.snapshotEpisode });
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Run not found' });
      }
      console.error('Error updating Q-matrix:', error);
      res.status(500).json({ error: 'Failed to update Q-matrix' });
    }
  });

  router.delete('/api/runs/:id', requireAuth, requireOwner, async (req, res) => {
    try {
      const userId = req.user.sub;
      await container.item(req.params.id, userId).delete();
      res.status(204).end();
    } catch (error) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Run not found' });
      }
      console.error('Error deleting run:', error);
      res.status(500).json({ error: 'Failed to delete run' });
    }
  });

  return router;
}

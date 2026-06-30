import { Hono } from 'hono';
import { jobsRoutes } from './routes/jobs';
import { healthRoutes } from './routes/health';

export function createApp(): Hono {
  const app = new Hono();
  app.route('/', healthRoutes);
  app.route('/', jobsRoutes);
  return app;
}

export const app = createApp();

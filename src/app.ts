import { Hono } from 'hono';
import { createJobsRoutes } from './routes/jobs';
import { healthRoutes } from './routes/health';
import { startAnalysis } from './services/analyzer';

export function createApp(analyze: typeof startAnalysis = startAnalysis): Hono {
  const app = new Hono();
  app.route('/', healthRoutes);
  app.route('/', createJobsRoutes(analyze));
  return app;
}

export const app = createApp();

// src/app.ts

import express from 'express';
import { env } from './config/env';
import db from './config/database';
import router from './routes';
import { setupSwagger } from './config/swagger';

const app = express();

app.use(express.json());
setupSwagger(app);

app.get('/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/v1', router);

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await db.destroy();
    console.log('Database pool closed. Exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

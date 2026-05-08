// src/app.ts
import express from 'express';
import { env } from './config/env';
import db from './config/database';
import { connected } from 'process';

const app = express();

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

export default app;

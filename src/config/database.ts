// src/config/database.ts
import Knex from 'knex';
import { env } from './env';

const db = Knex({
  client: 'mysql2',
  connection: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
  },
  pool: { min: 2, max: 10 },
});

export default db;

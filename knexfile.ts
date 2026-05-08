// knexfile.ts
import dotenv from 'dotenv';
dotenv.config();

import { Knex } from 'knex';

const connection = {
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection,
    migrations: {
      directory: './db/migrations',
      extension: 'ts',
    },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: 'mysql2',
    connection: { ...connection, ssl: { rejectUnauthorized: false } },
    migrations: {
      directory: './db/migrations',
      extension: 'ts',
    },
    pool: { min: 2, max: 10 },
  },
};

export default config;

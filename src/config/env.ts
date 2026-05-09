// src/config/env.ts
import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  db: {
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    name: required('DB_NAME'),
  },
  JWT_SECRET: required('JWT_SECRET'),
  ADJUTOR_API_KEY: required('ADJUTOR_API_KEY'),
  SKIP_KARMA_CHECK: process.env.SKIP_KARMA_CHECK === 'true',
};

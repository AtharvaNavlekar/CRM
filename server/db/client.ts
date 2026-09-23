import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const errorMessage = '[DATABASE CRITICAL ERROR] DATABASE_URL environment variable is mandatory. DialPulse CRM requires PostgreSQL persistence and does not permit in-memory or mock database fallbacks.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const queryClient = postgres(databaseUrl, { prepare: false });
export const db = drizzle(queryClient, { schema });

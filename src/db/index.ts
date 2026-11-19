import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// Disable prepared statements for Supabase Supavisor Transaction Pooler (port 6543)
const client = connectionString
  ? postgres(connectionString, { prepare: false, max: 5 })
  : null;

export const db = client ? drizzle(client, { schema }) : null;
export const hasDatabase = Boolean(db);

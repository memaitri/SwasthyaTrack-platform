// 1️⃣ Load .env variables at the very top
import 'dotenv/config';  // <-- this will load your .env

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as ws from "ws";
import * as schema from "./shared/schema.js";

neonConfig.webSocketConstructor = ws.default || ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
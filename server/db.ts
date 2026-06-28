import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// dateStrings: true prevents mysql2 from converting DATE/DATETIME columns to JS Date objects,
// which avoids UTC timezone shifting (e.g. 2026-03-19 stored as 2026-03-18T18:30:00Z in IST).
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  dateStrings: true,
});
export const db = drizzle(pool, { schema, mode: 'default' });

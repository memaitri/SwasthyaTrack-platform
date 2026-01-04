import express from 'express';
import { createServer } from 'http';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

async function main() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);

  await registerRoutes(httpServer, app);
  const server = httpServer.listen(0);
  const port = server.address().port;

  // create admin user
  const adminUser = await storage.createUser({
    username: `report-sample-admin-${Date.now()}`,
    password: 'test-pass',
    email: 'report-sample@example.com',
    fullName: 'Report Sample',
    role: 'Admin',
    isActive: true,
  });

  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'swasthya-track-secret-key-2025';
  const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });

  const fixturesDir = path.join(process.cwd(), 'server', 'tests', 'fixtures');
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });

  const reports = ['monthly-checkup', 'annual-health'];
  const sizes = ['A4', 'Letter'];
  const orientations = ['portrait', 'landscape'];

  for (const type of reports) {
    for (const size of sizes) {
      for (const orientation of orientations) {
        const url = `http://127.0.0.1:${port}/api/reports/${type}?format=pdf&pageSize=${size}&orientation=${orientation}`;
        console.log('Fetching', url);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          console.error('Failed to fetch report', type, size, orientation, res.status, await res.text());
          continue;
        }
        const buf = await res.arrayBuffer();
        const safeType = type.replace(/[^a-z0-9\-]/gi, '_');
        const outPath = path.join(fixturesDir, `report-${safeType}-${size.toLowerCase()}-${orientation}.pdf`);
        fs.writeFileSync(outPath, Buffer.from(buf));
        console.log('Saved', outPath);
      }
    }
  }

  server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
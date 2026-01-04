import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

describe('Image Upload Integration', () => {
  let app: express.Express;
  let server: any;
  let token: string;
  let adminUser: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const httpServer = createServer(app);

    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    adminUser = await storage.createUser({
      username: `test-user-${Date.now()}`,
      password: 'test-pass',
      email: 'u@example.com',
      fullName: 'Test User',
      role: 'Admin',
      isActive: true,
    } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try {
      server && server.close();
    } catch (e) {}
  });

  it('returns 401 when no Authorization header present', async () => {
    const res = await request(app).post('/api/upload/image').send();
    expect(res.status).toBe(401);
  });

  it('returns 400 when no image file is provided', async () => {
    const res = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
  });
});
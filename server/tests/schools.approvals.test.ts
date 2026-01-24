import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let adminToken: string;

describe('School approval flow', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    const adminUser = await storage.createUser({ username: `admin-${Date.now()}`, password: 'p', email: `a${Date.now()}@example.com`, fullName: 'Admin User', role: 'Admin', isActive: true } as any);
    const jwt = require('jsonwebtoken');
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('submitting new school marks it pending and not active', async () => {
    const schoolData = { name: `Pending School ${Date.now()}`, district: 'D-TEST', region: 'R1', block: 'B1', contactEmail: `s${Date.now()}@example.com` };

    const res = await request(app).post('/api/schools').send(schoolData);

    expect(res.status).toBe(201);
    const created = res.body;
    expect(created).toBeDefined();
    expect(created.approvalStatus).toBe('Pending');
    expect(created.isActive).toBe(false);
  });

  it('admin can approve pending school and it becomes active', async () => {
    const schoolData = { name: `Pending School ${Date.now()}`, district: 'D-TEST', region: 'R1', block: 'B1', contactEmail: `s${Date.now()}@example.com` };
    const r = await request(app).post('/api/schools').send(schoolData);
    const created = r.body;

    expect(created.approvalStatus).toBe('Pending');

    const approve = await request(app).post(`/api/schools/${created.id}/approve`).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(approve.status).toBe(200);

    const updated = await storage.getSchool(created.id);
    expect(updated).toBeDefined();
    expect(updated?.approvalStatus).toBe('Approved');
    expect(updated?.isActive).toBe(true);
  });

  it('admin can reject pending school and it stays inactive', async () => {
    const schoolData = { name: `Pending School ${Date.now()}`, district: 'D-TEST', region: 'R1', block: 'B1', contactEmail: `s${Date.now()}@example.com` };
    const r = await request(app).post('/api/schools').send(schoolData);
    const created = r.body;

    expect(created.approvalStatus).toBe('Pending');

    const reject = await request(app).post(`/api/schools/${created.id}/reject`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'Invalid' });
    expect(reject.status).toBe(200);

    const updated = await storage.getSchool(created.id);
    expect(updated).toBeDefined();
    expect(updated?.approvalStatus).toBe('Rejected');
    expect(updated?.isActive).toBe(false);
    expect(updated?.approverNote).toBe('Invalid');
  });
});

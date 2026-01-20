import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

let app: express.Express;
let server: any;
let hmToken: string;
let school: any;

describe('Account approval flow', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    school = await storage.createSchool({ name: 'Approval Test School', district: 'D-TEST', schoolType: 'Government' } as any);

    const hmUser = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM User', role: 'Headmaster', isActive: true, schoolId: school.id } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    hmToken = jwt.sign({ id: hmUser.id, username: hmUser.username, role: hmUser.role, schoolId: hmUser.schoolId }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('headmaster can approve pending user', async () => {
    const pendingUser = await storage.createUser({ username: `u-${Date.now()}`, password: 'p', email: `u${Date.now()}@example.com`, fullName: 'Pending User', role: 'ClassTeacher', isActive: false, approvalStatus: 'Pending', schoolId: school.id } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingUser.id}/approve`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({});

    expect(res.status).toBe(200);

    const updated = await storage.getUser(pendingUser.id);
    expect(updated).toBeDefined();
    expect(updated?.isActive).toBe(true);
    expect(updated?.approvalStatus).toBe('Approved');
  });

  it('headmaster can reject pending user', async () => {
    const pendingUser = await storage.createUser({ username: `u2-${Date.now()}`, password: 'p', email: `u2${Date.now()}@example.com`, fullName: 'Pending User 2', role: 'HostelWarden', isActive: false, approvalStatus: 'Pending', schoolId: school.id } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingUser.id}/reject`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ reason: 'Not suitable' });

    expect(res.status).toBe(200);

    const updated = await storage.getUser(pendingUser.id);
    expect(updated).toBeDefined();
    expect(updated?.isActive).toBe(false);
    expect(updated?.approvalStatus).toBe('Rejected');
    expect(updated?.approverNote).toBe('Not suitable');
  });

  it('headmaster cannot approve PO or Headmaster roles', async () => {
    const pendingPO = await storage.createUser({ username: `po-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'Pending PO', role: 'PO', isActive: false, approvalStatus: 'Pending' } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingPO.id}/approve`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({});

    expect(res.status).toBe(403);

    const pendingHM = await storage.createUser({ username: `hm2-${Date.now()}`, password: 'p', email: `hm2${Date.now()}@example.com`, fullName: 'Pending HM', role: 'Headmaster', isActive: false, approvalStatus: 'Pending' } as any);

    const res2 = await request(app)
      .post(`/api/approvals/${pendingHM.id}/approve`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({});

    expect(res2.status).toBe(403);
  });

  it('admin can approve PO and Headmaster roles', async () => {
    const adminUser = await storage.createUser({ username: `admin-${Date.now()}`, password: 'p', email: `a${Date.now()}@example.com`, fullName: 'Admin User', role: 'Admin', isActive: true } as any);
    const jwt = require('jsonwebtoken');
    const adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025', { expiresIn: '1h' });

    const pendingPO = await storage.createUser({ username: `po2-${Date.now()}`, password: 'p', email: `po2${Date.now()}@example.com`, fullName: 'Pending PO 2', role: 'PO', isActive: false, approvalStatus: 'Pending' } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingPO.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);

    const updated = await storage.getUser(pendingPO.id);
    expect(updated?.approvalStatus).toBe('Approved');
    expect(updated?.isActive).toBe(true);

    const pendingHM = await storage.createUser({ username: `hm3-${Date.now()}`, password: 'p', email: `hm3${Date.now()}@example.com`, fullName: 'Pending HM 3', role: 'Headmaster', isActive: false, approvalStatus: 'Pending' } as any);

    const res2 = await request(app)
      .post(`/api/approvals/${pendingHM.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res2.status).toBe(200);

    const updated2 = await storage.getUser(pendingHM.id);
    expect(updated2?.approvalStatus).toBe('Approved');
    expect(updated2?.isActive).toBe(true);
  });
});

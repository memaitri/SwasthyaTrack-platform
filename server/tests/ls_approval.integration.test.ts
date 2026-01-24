import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';
import { db } from '../db.js';
import { auditLogs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

let app: express.Express;
let server: any;
let hmToken: string;
let school: any;

describe('Lady Superintendent approval flow', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    school = await storage.createSchool({ name: 'LS Test School', district: 'D-LS', schoolType: 'Government' } as any);

    const hmUser = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM User', role: 'Headmaster', isActive: true, schoolId: school.id } as any);
    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    hmToken = jwt.sign({ id: hmUser.id, username: hmUser.username, role: hmUser.role, schoolId: hmUser.schoolId }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('HM can approve pending LS when no active LS exists', async () => {
    const pendingLS = await storage.createUser({ username: `ls-${Date.now()}`, password: 'p', email: `ls${Date.now()}@example.com`, fullName: 'Pending LS', role: 'Lady Superintendent', isActive: false, approvalStatus: 'Pending', schoolId: school.id } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingLS.id}/approve`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({});

    expect(res.status).toBe(200);

    const updated = await storage.getUser(pendingLS.id);
    expect(updated).toBeDefined();
    expect(updated?.isActive).toBe(true);
    expect(updated?.approvalStatus).toBe('Approved');

    // Audit log entry exists
    const entries = await db.select().from(auditLogs).where(eq(auditLogs.entityId, pendingLS.id));
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('HM cannot approve pending LS if an active LS already exists', async () => {
    // Create an active LS
    const activeLS = await storage.createUser({ username: `lsact-${Date.now()}`, password: 'p', email: `lsact${Date.now()}@example.com`, fullName: 'Active LS', role: 'Lady Superintendent', isActive: true, approvalStatus: 'Approved', schoolId: school.id } as any);

    const pendingLS = await storage.createUser({ username: `ls2-${Date.now()}`, password: 'p', email: `ls2${Date.now()}@example.com`, fullName: 'Pending LS2', role: 'Lady Superintendent', isActive: false, approvalStatus: 'Pending', schoolId: school.id } as any);

    const res = await request(app)
      .post(`/api/approvals/${pendingLS.id}/approve`)
      .set('Authorization', `Bearer ${hmToken}`)
      .send({});

    expect(res.status).toBe(409);

    const updated = await storage.getUser(pendingLS.id);
    expect(updated).toBeDefined();
    expect(updated?.isActive).toBe(false);
    expect(updated?.approvalStatus).toBe('Pending');
  });

  it('Registration API blocks creating new LS when active LS exists', async () => {
    // Ensure an active LS exists
    const existing = await storage.createUser({ username: `lsreg-${Date.now()}`, password: 'p', email: `lsreg${Date.now()}@example.com`, fullName: 'Existing LS', role: 'Lady Superintendent', isActive: true, approvalStatus: 'Approved', schoolId: school.id } as any);

    const res = await request(app).post('/api/auth/register').send({
      username: `lsreg2-${Date.now()}`,
      password: 'p',
      email: `lsreg2${Date.now()}@example.com`,
      fullName: 'New LS',
      role: 'Lady Superintendent',
      schoolId: school.id,
    });

    expect(res.status).toBe(409);
  });
});

import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { app } from '../index.js';
import { storage } from '../storage.js';

let adminUser: any;
let accessToken: string;

describe('Admin dashboard route', () => {
  beforeAll(async () => {
    adminUser = await storage.createUser({ username: `adm-${Date.now()}`, password: 'p', email: `adm-${Date.now()}@example.com`, fullName: 'Admin Test', role: 'Admin', isActive: true } as any);
    const loginRes = await request(app).post('/api/auth/login').send({ username: adminUser.username, password: 'p' });
    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body?.accessToken;
  });

  afterAll(async () => {
    try { await storage.updateUser(adminUser.id, { isActive: false } as any); } catch (e) {}
  });

  it('returns dashboard without serialization errors', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body).toHaveProperty('metrics');
    expect(res.body.metrics).toHaveProperty('monthlyTrends');
    expect(Array.isArray(res.body.metrics.monthlyTrends)).toBeTruthy();
  });

  it('handles metrics with throwing getters and non-function toISOString properties', async () => {
    // Stub storage to return a problematic object
    const original = storage.getDashboardMetrics;
    (storage as any).getDashboardMetrics = async () => ({
      totalSchools: 1,
      monthlyTrends: [],
      broken: {
        get exploded() { throw new Error('getter explosion'); },
        toISOString: 'not-a-function'
      }
    });

    const res2 = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${accessToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body).toBeDefined();
    expect(res2.body).toHaveProperty('metrics');
    // Metrics should be present but broken properties should have been skipped or stringified
    expect(res2.body.metrics).not.toBeNull();

    // Restore
    (storage as any).getDashboardMetrics = original;
  });
});
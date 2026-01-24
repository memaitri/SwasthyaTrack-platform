import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let adminToken: string;
let hmToken: string;
let hmNoSchoolToken: string;
let hm: any;

describe('API smoke tests', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    const jwt = require('jsonwebtoken');
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';

    // create users
    const admin = await storage.createUser({ username: `admin-${Date.now()}`, password: 'p', email: `a${Date.now()}@example.com`, fullName: 'Admin', role: 'Admin', isActive: true } as any);
    adminToken = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, secret, { expiresIn: '1h' });

    const hm = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM', role: 'Headmaster', isActive: true, schoolId: null } as any);
    hmNoSchoolToken = jwt.sign({ id: hm.id, username: hm.username, role: hm.role }, secret, { expiresIn: '1h' });

    const hmWithSchool = await storage.createUser({ username: `hmw-${Date.now()}`, password: 'p', email: `hmw${Date.now()}@example.com`, fullName: 'HMWS', role: 'Headmaster', isActive: true } as any);
    hmToken = jwt.sign({ id: hmWithSchool.id, username: hmWithSchool.username, role: hmWithSchool.role }, secret, { expiresIn: '1h' });

    // create school and student
    const school = await storage.createSchool({ name: 'Smoke School', district: 'Smoke-D', schoolType: 'Government' } as any);
    await storage.updateUser(hmWithSchool.id, { schoolId: school.id } as any);

    await storage.createStudent({ fullName: 'Smoke Student', uniqueId: `SS-${Date.now()}`, gender: 'M', classSection: '4-A', schoolId: school.id, dateOfBirth: new Date('2016-01-01') } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('GET /api/schools returns list for Admin', async () => {
    const res = await request(app).get('/api/schools').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.schools)).toBe(true);
  });

  it('GET /api/annual-cards returns results for Headmaster with school', async () => {
    const res = await request(app).get('/api/annual-cards').set('Authorization', `Bearer ${hmToken}`);
    expect(res.status).toBe(200);
    expect(res.body.cards).toBeDefined();
  });

  it('GET /api/annual-cards returns results for Headmaster without school when they created cards', async () => {
    // Create a card with createdBy pointing to the headmaster without school
    const student = (await storage.getStudents({ limit: 1 })).students[0];
    await storage.createAnnualHealthCard({ studentId: student.id, schoolId: null, year: new Date().getFullYear(), nameOfChild: student.fullName, classSection: student.classSection, gender: student.gender, createdBy: hm.id } as any).catch(() => null);

    const res = await request(app).get('/api/annual-cards').set('Authorization', `Bearer ${hmNoSchoolToken}`);
    expect(res.status).toBe(200);
    expect(res.body.cards).toBeDefined();
    const found = res.body.cards.find((c: any) => c.createdBy === hm.id);
    expect(found).toBeDefined();
  });
});
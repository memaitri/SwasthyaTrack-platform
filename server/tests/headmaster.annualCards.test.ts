import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

let app: express.Express;
let server: any;
let hmToken: string;
let hmUser: any;
let student: any;
let card: any;

describe('Headmaster annual-cards fallback (createdBy)', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create Headmaster user with no schoolId assigned
    hmUser = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM User', role: 'Headmaster', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    hmToken = jwt.sign({ id: hmUser.id, username: hmUser.username, role: hmUser.role }, secret, { expiresIn: '1h' });

    // create a student (can be without school)
    student = await storage.createStudent({ fullName: 'HM Student', uniqueId: `HMS-${Date.now()}`, gender: 'F', classSection: '6-B', dateOfBirth: new Date('2016-06-01') } as any);

    // Create an annual health card with createdBy pointing to the headmaster and no schoolId
    card = await storage.createAnnualHealthCard({
      studentId: student.id,
      schoolId: null,
      year: new Date().getFullYear(),
      nameOfChild: student.fullName,
      classSection: student.classSection,
      gender: student.gender,
      weightKg: 28,
      heightCm: 125,
      bmi: 17.9,
      createdBy: hmUser.id,
    } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('returns cards created by Headmaster who has no schoolId', async () => {
    const res = await request(app)
      .get(`/api/annual-cards`)
      .set('Authorization', `Bearer ${hmToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.cards).toBeDefined();
    const found = body.cards.find((c: any) => c.id === card.id);
    expect(found).toBeDefined();
  });
});
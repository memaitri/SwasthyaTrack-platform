import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let hmToken: string;
let school: any;
let student: any;
let card: any;

describe('Headmaster dashboard referral fallback', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create Headmaster user and school/student
    const hmUser = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM User', role: 'Headmaster', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    hmToken = jwt.sign({ id: hmUser.id, username: hmUser.username, role: hmUser.role }, secret, { expiresIn: '1h' });

    school = await storage.createSchool({ name: 'HM Test School', district: 'D-TEST', schoolType: 'Government' } as any);
    student = await storage.createStudent({ fullName: 'Referral Student', uniqueId: `RS-${Date.now()}`, gender: 'M', classSection: '5-A', schoolId: school.id, dateOfBirth: new Date('2016-06-01') } as any);

    // Create an annual health card with referral flags (no explicit referral row created)
    card = await storage.createAnnualHealthCard({
      studentId: student.id,
      schoolId: school.id,
      year: new Date().getFullYear(),
      nameOfChild: student.fullName,
      classSection: student.classSection,
      gender: student.gender,
      weightKg: 30,
      heightCm: 130,
      bmi: 17.8,
      c8_suspected: true,
      referral_recommended: true,
      referral_disease_facility_date: new Date().toISOString().split('T')[0],
    } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('headmaster dashboard derives referrals from health-cards when referrals table empty', async () => {
    const res = await request(app)
      .get(`/api/headmaster/dashboard?month=${String(new Date().getMonth()+1)}&year=${String(new Date().getFullYear())}`)
      .set('Authorization', `Bearer ${hmToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.referralData).toBeDefined();
    expect(body.referralData.totalReferrals).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.referralData.referralsByClass)).toBe(true);
    const classEntry = body.referralData.referralsByClass.find((c: any) => c.classSection === student.classSection);
    expect(classEntry).toBeDefined();
    expect(classEntry.total).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

let app: express.Express;
let server: any;
let poToken: string;
let schoolA: any;
let schoolB: any;
let studentA: any;
let studentB: any;

describe('Hostel attendance PO district restrictions', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    schoolA = await storage.createSchool({ name: 'PO District School A', district: 'D-PO-1' } as any);
    schoolB = await storage.createSchool({ name: 'Other District School B', district: 'D-OTHER' } as any);

    studentA = await storage.createStudent({ fullName: 'PO Student A', uniqueId: `PS-A-${Date.now()}`, gender: 'M', classSection: '5-A', schoolId: schoolA.id } as any);
    studentB = await storage.createStudent({ fullName: 'Other Student B', uniqueId: `OS-B-${Date.now()}`, gender: 'F', classSection: '5-B', schoolId: schoolB.id } as any);

    const poUser = await storage.createUser({ username: `po-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'Program Officer', role: 'PO', district: 'D-PO-1', isActive: true } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    poToken = jwt.sign({ id: poUser.id, username: poUser.username, role: poUser.role }, secret, { expiresIn: '1h' });

    // Add an attendance record for each student for today's date so results are present
    const today = new Date().toISOString().split('T')[0];
    await storage.createHostelAttendance({ studentId: studentA.id, schoolId: schoolA.id, date: today, checkInTime: new Date().toISOString(), recordedBy: poUser.id, recorderRole: 'HostelWarden', status: 'Present' } as any);
    await storage.createHostelAttendance({ studentId: studentB.id, schoolId: schoolB.id, date: today, checkInTime: new Date().toISOString(), recordedBy: poUser.id, recorderRole: 'HostelWarden', status: 'Present' } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('forbids PO from viewing hostel attendance for a school in another district', async () => {
    const res = await request(app)
      .get(`/api/hostel/attendance?schoolId=${schoolB.id}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(403);
  });

  it('allows PO to view aggregated hostel attendance only for their district', async () => {
    const res = await request(app)
      .get(`/api/hostel/attendance`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.students)).toBe(true);
    // Ensure all returned students belong to PO's district (schoolA)
    const schoolIds = Array.from(new Set(res.body.students.map((s: any) => s.schoolId as string))) as string[];
    expect(schoolIds.length).toBeGreaterThanOrEqual(1);
    expect(schoolIds.every((id: any) => id === schoolA.id)).toBe(true);
  });
});

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

let app: express.Express;
let server: any;
let teacherToken: string;
let wardenToken: string;
let school: any;
let studentA: any;
let studentB: any;

describe('Hostel vacation permissions', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create school and students
    school = await storage.createSchool({ name: 'Vacation Test School', district: 'D-TEST' } as any);
    studentA = await storage.createStudent({ fullName: 'Vacation Student A', uniqueId: `VS-A-${Date.now()}`, gender: 'M', classSection: '5-A', schoolId: school.id } as any);
    studentB = await storage.createStudent({ fullName: 'Vacation Student B', uniqueId: `VS-B-${Date.now()}`, gender: 'F', classSection: '5-B', schoolId: school.id } as any);

    // Class teacher for 5-A
    const teacherUser = await storage.createUser({ username: `teacher-${Date.now()}`, password: 'p', email: `teacher${Date.now()}@example.com`, fullName: 'Class Teacher', role: 'ClassTeacher', schoolId: school.id, classSection: '5-A', isActive: true } as any);

    // Hostel warden user
    const wardenUser = await storage.createUser({ username: `warden-${Date.now()}`, password: 'p', email: `warden${Date.now()}@example.com`, fullName: 'Hostel Warden', role: 'HostelWarden', schoolId: school.id, isActive: true } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    teacherToken = jwt.sign({ id: teacherUser.id, username: teacherUser.username, role: teacherUser.role, schoolId: teacherUser.schoolId, classSection: teacherUser.classSection }, secret, { expiresIn: '1h' });
    wardenToken = jwt.sign({ id: wardenUser.id, username: wardenUser.username, role: wardenUser.role, schoolId: wardenUser.schoolId }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('allows ClassTeacher to mark vacation for a student in their class', async () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: studentA.id, vacationStartDate: start, vacationEndDate: end, vacationReason: 'Sick' });

    expect(res.status).toBe(201);
    expect(res.body.records).toBeDefined();
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBeGreaterThanOrEqual(1);
    expect(res.body.records[0].studentId).toBe(studentA.id);
  });

  it('forbids ClassTeacher from marking vacation for a student outside their class', async () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: studentB.id, vacationStartDate: start, vacationEndDate: end, vacationReason: 'Sick' });

    expect(res.status).toBe(403);
  });

  it('allows HostelWarden to mark vacation for any student', async () => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ studentId: studentB.id, vacationStartDate: start, vacationEndDate: end, vacationReason: 'Family work' });

    expect(res.status).toBe(201);
    expect(res.body.records).toBeDefined();
    expect(res.body.records[0].studentId).toBe(studentB.id);
  });
});

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

describe('Referrals update integration', () => {
  let app: express.Express;
  let server: any;
  let teacherToken: string;
  let otherTeacherToken: string;
  let adminToken: string;
  let student: any;
  let referral: any;
  let schoolId = `test-school-${Date.now()}`;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const httpServer = createServer(app);

    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create school user & student
    student = await storage.createStudent({
      fullName: `Student ${Date.now()}`,
      uniqueId: `UID${Date.now()}`,
      gender: 'M',
      classSection: '1-A',
      schoolId,
    } as any);

    const teacher = await storage.createUser({ username: `teacher1-${Date.now()}`, password: 'password', email: 't1@example.com', fullName: 'Teacher One', role: 'ClassTeacher', isActive: true, schoolId, classSection: '1-A' } as any);

    const otherTeacher = await storage.createUser({ username: `teacher2-${Date.now()}`, password: 'password', email: 't2@example.com', fullName: 'Teacher Two', role: 'ClassTeacher', isActive: true, schoolId, classSection: '1-B' } as any);

    const adminUser = await storage.createUser({ username: `admin-${Date.now()}`, password: 'password', email: 'a@example.com', fullName: 'Admin', role: 'Admin', isActive: true } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    teacherToken = jwt.sign({ id: teacher.id, username: teacher.username, role: teacher.role }, secret, { expiresIn: '1h' });
    otherTeacherToken = jwt.sign({ id: otherTeacher.id, username: otherTeacher.username, role: otherTeacher.role }, secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });

    // Create a referral for this student
    referral = await storage.createReferral({
      studentId: student.id,
      schoolId,
      healthCardId: 'hc-1',
      referralType: 'deficiency',
      referralCode: 'B1',
      issue: 'Severe deficiency',
      facility: 'PHC',
      referralDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      createdBy: adminUser.id,
    } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('returns 401 when no auth provided', async () => {
    const res = await request(app)
      .patch(`/api/referrals/${referral.id}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(401);
  });

  it('forbids teacher from other class', async () => {
    const res = await request(app)
      .patch(`/api/referrals/${referral.id}`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(403);
  });

  it('allows class teacher to update status', async () => {
    const res = await request(app)
      .patch(`/api/referrals/${referral.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
  });

  it('admin can mark completed and completionDate is set', async () => {
    const res = await request(app)
      .patch(`/api/referrals/${referral.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Completed');
    expect(res.body.completionDate).toBeDefined();
  });
});
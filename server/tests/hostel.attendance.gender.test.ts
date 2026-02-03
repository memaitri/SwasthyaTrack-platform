import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let lsToken: string;
let msToken: string;
let school: any;
let maleStudent: any;
let femaleStudent: any;
let lsUser: any;
let msUser: any;

describe('Hostel attendance gender-based role segregation', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // Create school
    school = await storage.createSchool({ 
      name: 'Gender Test School', 
      district: 'D-GENDER-TEST',
      block: 'B-GENDER-TEST',
      region: 'R-GENDER-TEST',
      schoolType: 'Government' 
    } as any);

    // Create male and female students
    maleStudent = await storage.createStudent({ 
      fullName: 'Male Student', 
      uniqueId: `MS-${Date.now()}`, 
      gender: 'M', 
      classSection: '5-A', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    } as any);

    femaleStudent = await storage.createStudent({ 
      fullName: 'Female Student', 
      uniqueId: `FS-${Date.now()}`, 
      gender: 'F', 
      classSection: '5-B', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    } as any);

    // Create Lady Superintendent user
    lsUser = await storage.createUser({ 
      username: `ls-${Date.now()}`, 
      password: 'password', 
      email: `ls${Date.now()}@example.com`, 
      fullName: 'Lady Superintendent', 
      role: 'Lady Superintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    } as any);

    // Create Meal Superintendent user
    msUser = await storage.createUser({ 
      username: `ms-${Date.now()}`, 
      password: 'password', 
      email: `ms${Date.now()}@example.com`, 
      fullName: 'Meal Superintendent', 
      role: 'MealSuperintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    lsToken = jwt.sign({ 
      id: lsUser.id, 
      username: lsUser.username, 
      role: lsUser.role, 
      schoolId: lsUser.schoolId 
    }, secret, { expiresIn: '1h' });

    msToken = jwt.sign({ 
      id: msUser.id, 
      username: msUser.username, 
      role: msUser.role, 
      schoolId: msUser.schoolId 
    }, secret, { expiresIn: '1h' });

    // Add attendance records for both students
    const today = new Date().toISOString().split('T')[0];
    await storage.createHostelAttendance({ 
      studentId: maleStudent.id, 
      schoolId: school.id, 
      date: today, 
      checkInTime: new Date(), 
      recordedBy: lsUser.id, 
      recorderRole: 'HostelWarden', 
      status: 'Present' 
    } as any);

    await storage.createHostelAttendance({ 
      studentId: femaleStudent.id, 
      schoolId: school.id, 
      date: today, 
      checkInTime: new Date(), 
      recordedBy: msUser.id, 
      recorderRole: 'HostelWarden', 
      status: 'Present' 
    } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('allows Lady Superintendent to view only female students in hostel attendance', async () => {
    const res = await request(app)
      .get('/api/hostel/attendance')
      .set('Authorization', `Bearer ${lsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toBeDefined();
    expect(res.body.students.length).toBe(1);
    expect(res.body.students[0].gender).toBe('F');
    expect(res.body.students[0].fullName).toBe('Female Student');
  });

  it('allows Meal Superintendent to view only male students in hostel attendance', async () => {
    const res = await request(app)
      .get('/api/hostel/attendance')
      .set('Authorization', `Bearer ${msToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toBeDefined();
    expect(res.body.students.length).toBe(1);
    expect(res.body.students[0].gender).toBe('M');
    expect(res.body.students[0].fullName).toBe('Male Student');
  });

  it('prevents Lady Superintendent from checking in male students', async () => {
    const res = await request(app)
      .post('/api/hostel/checkin')
      .set('Authorization', `Bearer ${lsToken}`)
      .send({
        studentId: maleStudent.id,
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
        checkInReason: 'Test check-in'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Lady Superintendent can only manage female students');
  });

  it('prevents Meal Superintendent from checking in female students', async () => {
    const res = await request(app)
      .post('/api/hostel/checkin')
      .set('Authorization', `Bearer ${msToken}`)
      .send({
        studentId: femaleStudent.id,
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
        checkInReason: 'Test check-in'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Meal Superintendent can only manage male students');
  });

  it('allows Lady Superintendent to check in female students', async () => {
    const res = await request(app)
      .post('/api/hostel/checkin')
      .set('Authorization', `Bearer ${lsToken}`)
      .send({
        studentId: femaleStudent.id,
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
        checkInReason: 'LS check-in test'
      });

    expect(res.status).toBe(201);
    expect(res.body.studentId).toBe(femaleStudent.id);
    expect(res.body.recorderRole).toBe('Lady Superintendent');
  });

  it('allows Meal Superintendent to check in male students', async () => {
    const res = await request(app)
      .post('/api/hostel/checkin')
      .set('Authorization', `Bearer ${msToken}`)
      .send({
        studentId: maleStudent.id,
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
        checkInReason: 'MS check-in test'
      });

    expect(res.status).toBe(201);
    expect(res.body.studentId).toBe(maleStudent.id);
    expect(res.body.recorderRole).toBe('MealSuperintendent');
  });

  it('prevents Lady Superintendent from marking vacation for male students', async () => {
    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${lsToken}`)
      .send({
        studentId: maleStudent.id,
        vacationStartDate: new Date().toISOString().split('T')[0],
        vacationEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        vacationReason: 'Test vacation'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Lady Superintendent can only mark vacations for female students');
  });

  it('prevents Meal Superintendent from marking vacation for female students', async () => {
    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${msToken}`)
      .send({
        studentId: femaleStudent.id,
        vacationStartDate: new Date().toISOString().split('T')[0],
        vacationEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        vacationReason: 'Test vacation'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Meal Superintendent can only mark vacations for male students');
  });

  it('allows Lady Superintendent to mark vacation for female students', async () => {
    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${lsToken}`)
      .send({
        studentId: femaleStudent.id,
        vacationStartDate: new Date().toISOString().split('T')[0],
        vacationEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        vacationReason: 'LS vacation test'
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].studentId).toBe(femaleStudent.id);
    expect(res.body[0].isVacation).toBe(true);
  });

  it('allows Meal Superintendent to mark vacation for male students', async () => {
    const res = await request(app)
      .post('/api/hostel/vacation')
      .set('Authorization', `Bearer ${msToken}`)
      .send({
        studentId: maleStudent.id,
        vacationStartDate: new Date().toISOString().split('T')[0],
        vacationEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        vacationReason: 'MS vacation test'
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].studentId).toBe(maleStudent.id);
    expect(res.body[0].isVacation).toBe(true);
  });

  it('filters monthly report by gender for Lady Superintendent', async () => {
    const res = await request(app)
      .get('/api/hostel/monthly-report?month=1&year=2025')
      .set('Authorization', `Bearer ${lsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toBeDefined();
    // Should only see female students
    const femaleStudents = res.body.students.filter((s: any) => s.gender === 'F');
    const maleStudents = res.body.students.filter((s: any) => s.gender === 'M');
    expect(femaleStudents.length).toBeGreaterThan(0);
    expect(maleStudents.length).toBe(0);
  });

  it('filters monthly report by gender for Meal Superintendent', async () => {
    const res = await request(app)
      .get('/api/hostel/monthly-report?month=1&year=2025')
      .set('Authorization', `Bearer ${msToken}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toBeDefined();
    // Should only see male students
    const femaleStudents = res.body.students.filter((s: any) => s.gender === 'F');
    const maleStudents = res.body.students.filter((s: any) => s.gender === 'M');
    expect(maleStudents.length).toBeGreaterThan(0);
    expect(femaleStudents.length).toBe(0);
  });

  it('prevents Lady Superintendent without school assignment from accessing hostel attendance', async () => {
    // Create LS without school assignment
    const lsNoSchool = await storage.createUser({ 
      username: `ls-no-school-${Date.now()}`, 
      password: 'password', 
      email: `ls-no-school${Date.now()}@example.com`, 
      fullName: 'LS No School', 
      role: 'Lady Superintendent', 
      isActive: true,
      approvalStatus: 'Approved'
    } as any);

    const jwt = require('jsonwebtoken');
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const lsNoSchoolToken = jwt.sign({ 
      id: lsNoSchool.id, 
      username: lsNoSchool.username, 
      role: lsNoSchool.role 
    }, secret, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/hostel/attendance')
      .set('Authorization', `Bearer ${lsNoSchoolToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Lady Superintendent is not assigned to a school');
  });

  it('prevents Meal Superintendent without school assignment from accessing hostel attendance', async () => {
    // Create MS without school assignment
    const msNoSchool = await storage.createUser({ 
      username: `ms-no-school-${Date.now()}`, 
      password: 'password', 
      email: `ms-no-school${Date.now()}@example.com`, 
      fullName: 'MS No School', 
      role: 'MealSuperintendent', 
      isActive: true,
      approvalStatus: 'Approved'
    } as any);

    const jwt = require('jsonwebtoken');
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const msNoSchoolToken = jwt.sign({ 
      id: msNoSchool.id, 
      username: msNoSchool.username, 
      role: msNoSchool.role 
    }, secret, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/hostel/attendance')
      .set('Authorization', `Bearer ${msNoSchoolToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Meal Superintendent is not assigned to a school');
  });
});
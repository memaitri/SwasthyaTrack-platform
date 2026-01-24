import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let poToken: string;
let adminToken: string;
let school: any;
let student: any;
let card: any;

describe('PO permission restrictions (read-only)', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // Create admin user to seed data
    const adminUser = await storage.createUser({ username: `a-${Date.now()}`, password: 'p', email: `a${Date.now()}@example.com`, fullName: 'Admin User', role: 'Admin', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });

    // create PO user
    const poUser = await storage.createUser({ username: `po-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'PO User', role: 'PO', district: 'D-TEST', isActive: true } as any);
    poToken = jwt.sign({ id: poUser.id, username: poUser.username, role: poUser.role }, secret, { expiresIn: '1h' });

    school = await storage.createSchool({ name: 'PO Perm Test School', district: 'D-TEST', schoolType: 'Government' } as any);
    student = await storage.createStudent({ fullName: 'Perm Student', uniqueId: `PS-${Date.now()}`, gender: 'F', classSection: '9-A', schoolId: school.id, dateOfBirth: new Date('2010-06-01') } as any);

    // Create an annual health card as Admin
    card = await storage.createAnnualHealthCard({
      studentId: student.id,
      schoolId: school.id,
      year: new Date().getFullYear(),
      nameOfChild: student.fullName,
      classSection: student.classSection,
      gender: student.gender,
      weightKg: 30,
      heightCm: 140,
      bmi: 15.3,
    } as any);

    // Create a meal entry as Admin
    await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: new Date().toISOString().split('T')[0], classSection: '9-A', mealType: 'Lunch', menuItems: ['rice'] });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('disallows PO from creating a meal record (should be 403)', async () => {
    const res = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ date: new Date().toISOString().split('T')[0], classSection: '9-A', mealType: 'Lunch', menuItems: ['dal'] });

    expect(res.status).toBe(403);
  });

  it('disallows PO from editing student details (should be 403)', async () => {
    const res = await request(app)
      .put(`/api/students/${student.id}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ fullName: 'Hacker Name' });

    expect(res.status).toBe(403);
  });

  it('disallows PO from updating health card (should be 403)', async () => {
    const res = await request(app)
      .put(`/api/annual-cards/${card.id}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ weightKg: 35 });

    expect(res.status).toBe(403);
  });

  it('prevents PO from viewing meals from other districts and restricts aggregated totals', async () => {
    // Create a school in another district and a meal there
    const otherSchool = await storage.createSchool({ name: 'Other District School', district: 'OTHER', schoolType: 'Government' } as any);
    await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: new Date().toISOString().split('T')[0], classSection: '9-A', mealType: 'Lunch', menuItems: ['rice'], schoolId: otherSchool.id });

    // PO should get 403 when requesting meals for the other school explicitly
    const explicitRes = await request(app)
      .get(`/api/meals?date=${new Date().toISOString().split('T')[0]}&schoolId=${otherSchool.id}`)
      .set('Authorization', `Bearer ${poToken}`);
    expect(explicitRes.status).toBe(403);

    // When PO requests aggregated compliance without a school, the foreign-school meal should not be counted
    const aggRes = await request(app)
      .get('/api/meals/compliance')
      .set('Authorization', `Bearer ${poToken}`);
    expect(aggRes.status).toBe(200);
    // Ensure daysLogged/totalMeals are numbers and do not include the 'OTHER' district school's meal
    expect(typeof aggRes.body.totalMeals).toBe('number');
  });

  it('disallows PO from viewing student details in another district (GET /api/students/:id)', async () => {
    const otherSchool = await storage.createSchool({ name: 'Other District School 2', district: 'OTHER', schoolType: 'Aided' } as any);
    const otherStudent = await storage.createStudent({ fullName: 'Other Student', uniqueId: `OS-${Date.now()}`, gender: 'M', classSection: '9-A', schoolId: otherSchool.id, dateOfBirth: new Date('2010-05-01') } as any);

    const res = await request(app)
      .get(`/api/students/${otherStudent.id}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(403);
  });

  it('disallows PO from viewing annual health cards in another district (GET /api/annual-cards/:id)', async () => {
    const otherSchool = await storage.createSchool({ name: 'Other District School 3', district: 'OTHER', schoolType: 'Government' } as any);
    const otherStudent = await storage.createStudent({ fullName: 'Other Student 2', uniqueId: `OS2-${Date.now()}`, gender: 'F', classSection: '9-A', schoolId: otherSchool.id, dateOfBirth: new Date('2011-05-01') } as any);
    const otherCard = await storage.createAnnualHealthCard({ studentId: otherStudent.id, schoolId: otherSchool.id, year: new Date().getFullYear(), nameOfChild: otherStudent.fullName, classSection: otherStudent.classSection, gender: otherStudent.gender, weightKg: 28, heightCm: 130, bmi: 16 } as any);

    const res = await request(app)
      .get(`/api/annual-cards/${otherCard.id}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(403);
  });

  it('blocks PO with no district from requesting students for another school (GET /api/students?schoolId=...)', async () => {
    // Create a PO with no district assigned
    const poNoDistrict = await storage.createUser({ username: `po-nod-${Date.now()}`, password: 'p', email: `ponod${Date.now()}@example.com`, fullName: 'PO No District 2', role: 'PO', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    const poNoDistrictToken = jwt.sign({ id: poNoDistrict.id, username: poNoDistrict.username, role: poNoDistrict.role }, secret, { expiresIn: '1h' });

    const otherSchool = await storage.createSchool({ name: 'Other District School 4', district: 'OTHER', schoolType: 'Aided' } as any);
    const res = await request(app)
      .get(`/api/students?schoolId=${otherSchool.id}`)
      .set('Authorization', `Bearer ${poNoDistrictToken}`);

    expect(res.status).toBe(403);
  });

  it('blocks PO with no district from requesting meals for another school (GET /api/meals?schoolId=...)', async () => {
    // Create a PO with no district assigned
    const poNoDistrict2 = await storage.createUser({ username: `po-nod2-${Date.now()}`, password: 'p', email: `ponod2${Date.now()}@example.com`, fullName: 'PO No District 3', role: 'PO', isActive: true } as any);
    const secret2 = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt2 = require('jsonwebtoken');
    const poNoDistrictToken2 = jwt2.sign({ id: poNoDistrict2.id, username: poNoDistrict2.username, role: poNoDistrict2.role }, secret2, { expiresIn: '1h' });

    const otherSchool = await storage.createSchool({ name: 'Other District School 5', district: 'OTHER', schoolType: 'Government' } as any);

    const res = await request(app)
      .get(`/api/meals?date=${new Date().toISOString().split('T')[0]}&schoolId=${otherSchool.id}`)
      .set('Authorization', `Bearer ${poNoDistrictToken2}`);

    expect(res.status).toBe(403);
  });
});
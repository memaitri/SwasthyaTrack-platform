import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let teacherToken: string;
let school: any;
let student: any;

describe('ClassTeacher meal participation metrics', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create school and student
    school = await storage.createSchool({ name: 'Meal Test School', district: 'D-TEST', schoolType: 'Government' } as any);
    student = await storage.createStudent({ fullName: 'Meal Student', uniqueId: `MS-${Date.now()}`, gender: 'M', classSection: '9-A', schoolId: school.id } as any);

    // create class teacher user
    const teacherUser = await storage.createUser({ username: `teacher-${Date.now()}`, password: 'p', email: `teacher${Date.now()}@example.com`, fullName: 'Class Teacher', role: 'ClassTeacher', schoolId: school.id, classSection: '9-A', isActive: true } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    teacherToken = jwt.sign({ id: teacherUser.id, username: teacherUser.username, role: teacherUser.role, schoolId: teacherUser.schoolId, classSection: teacherUser.classSection }, secret, { expiresIn: '1h' });

    // create a meal log for current month
    const today = new Date();
    await storage.createMealLog({ schoolId: school.id, studentId: student.id, classSection: '9-A', date: today.toISOString(), mealType: 'Lunch', items: ['Rice'], recorderId: teacherUser.id } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('returns mealParticipation metrics for class teacher', async () => {
    const res = await request(app)
      .get(`/api/teacher/dashboard?class_id=9-A`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.mealParticipation).toBeDefined();
    expect(body.mealParticipation.totalMeals).toBeGreaterThanOrEqual(1);
    expect(body.mealParticipation.expectedMeals).toBeGreaterThanOrEqual(1);
  });

  it('returns student health card flattened fields (weight/height/bmi) on dashboard', async () => {
    // Create an annual health card for the student
    await storage.createAnnualHealthCard({ studentId: student.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: student.fullName, classSection: student.classSection, gender: student.gender, weightKg: 40, heightCm: 150, bmi: 17.8 } as any);

    const res = await request(app)
      .get(`/api/teacher/dashboard?class_id=9-A`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(Array.isArray(body.students)).toBe(true);
    const found = body.students.find((s: any) => s.uniqueId === student.uniqueId);
    expect(found).toBeDefined();
    expect(found.weight).toBe(40);
    expect(found.height).toBe(150);
    expect(found.bmi).toBe(17.8);
  });

  it('allows posting a class-level meal (no student) and it is visible to ClassTeacher', async () => {
    const today = new Date().toISOString().split('T')[0];
    // Post a class-level meal (no studentId)
    const postRes = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ date: today, classSection: '9-A', mealType: 'Breakfast', menuItems: ['poha'] });

    expect(postRes.status).toBe(201);
    const created = postRes.body;
    expect(created).toBeDefined();
    expect(created.classSection).toBe('9-A');

    // GET meals for today should include the class-level meal
    const getRes = await request(app)
      .get(`/api/meals?date=${today}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.meals)).toBe(true);
    expect(getRes.body.meals.length).toBeGreaterThanOrEqual(1);

    // Compliance should count totalMeals for the month
    const compRes = await request(app)
      .get('/api/meals/compliance')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(compRes.status).toBe(200);
    expect(compRes.body.totalMeals).toBeGreaterThanOrEqual(1);
  });

  it('allows class teacher to edit and delete a meal entry', async () => {
    const today = new Date().toISOString().split('T')[0];
    // Create a meal to edit
    const postRes = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ date: today, classSection: '9-A', mealType: 'Lunch', menuItems: ['dal'] });

    expect(postRes.status).toBe(201);
    const meal = postRes.body;

    // Update the meal
    const updateRes = await request(app)
      .put(`/api/meals/${meal.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ menuItems: ['dal', 'roti'], notes: 'Updated' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.menuItems).toEqual(['dal', 'roti']);
    expect(updateRes.body.notes).toBe('Updated');

    // Delete the meal
    const deleteRes = await request(app)
      .delete(`/api/meals/${meal.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('Meal deleted');

    // Confirm deletion
    const confirmRes = await request(app)
      .get(`/api/meals?date=${today}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.meals.find((m: any) => m.id === meal.id)).toBeUndefined();
  });
});

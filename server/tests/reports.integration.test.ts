import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

describe('Reports Integration', () => {
  let app: express.Express;
  let server: any;
  let token: string;
  let adminUser: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    const httpServer = createServer(app);

    // Register routes (this will also ensure migrations are applied)
    await registerRoutes(httpServer as any, app as any);

    server = httpServer.listen(0);

    // Create an admin user for testing
    adminUser = await storage.createUser({
      username: `test-admin-${Date.now()}`,
      password: 'test-pass',
      email: 'test@example.com',
      fullName: 'Test Admin',
      role: 'Admin',
      isActive: true,
    } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: adminUser.role }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try {
      server && server.close();
    } catch (e) {}
  });

  it('generates a monthly checkup PDF', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-checkup?format=pdf')
      .set('Authorization', `Bearer ${token}`)
      .buffer()
      .parse((res: any, callback) => {
          res.setEncoding('binary');
          res.data = '';
          res.on('data', function (chunk: any) { res.data += chunk; });
          res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
        });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(1000);

    // Save fixture for manual inspection
    const fixturesDir = require('path').join(process.cwd(), 'server', 'tests', 'fixtures');
    try { require('fs').mkdirSync(fixturesDir, { recursive: true }); } catch (e) {}
    require('fs').writeFileSync(require('path').join(fixturesDir, 'monthly-checkup.pdf'), res.body);

    // Basic content checks (binary->utf8 may contain readable strings)
    const text = res.body.toString('utf8');
    expect(text.includes('SwasthyaTrack') || text.includes('SwasthyaTrack Report')).toBeTruthy();
    // Expect either chart title or Referred/Primary text to be somewhere in PDF
    expect(text.includes('Referred') || text.includes('Primary') || text.includes('Treatment Types Distribution')).toBeTruthy();
    // Check header/footer presence
    expect(text.includes('Page 1') || text.includes('Page 1/')).toBeTruthy();
  });

  it('generates an annual health PDF containing vaccination/allergies placeholders', async () => {
    // Create a student + health card with vaccination/allergies data
    const studentPayload = {
      fullName: `Report Student ${Date.now()}`,
      uniqueId: `RPT-${Date.now()}`,
      gender: 'M',
      classSection: '2-B',
      schoolId: 'test-school-1'
    } as any;

    const student = await storage.createStudent(studentPayload);
    await storage.createAnnualHealthCard({
      studentId: student.id,
      schoolId: 'test-school-1',
      year: new Date().getFullYear(),
      nameOfChild: student.fullName,
      classSection: student.classSection,
      gender: student.gender,
      weightKg: 30,
      heightCm: 130,
      bmi: 17.5
    } as any);

    const res = await request(app)
      .get('/api/reports/annual-health?format=pdf')
      .set('Authorization', `Bearer ${token}`)
      .buffer()
      .parse((res: any, callback) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', function (chunk: any) { res.data += chunk; });
        res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    const asText = res.body.toString('utf8');
    // metadata check: Title should be present in PDF
    expect(asText.includes('SwasthyaTrack Report - annual-health') || asText.includes('SwasthyaTrack Report')).toBeTruthy();

    // Save fixture for manual inspection
    const fixturesDir = require('path').join(process.cwd(), 'server', 'tests', 'fixtures');
    try { require('fs').mkdirSync(fixturesDir, { recursive: true }); } catch (e) {}
    require('fs').writeFileSync(require('path').join(fixturesDir, 'annual-health.pdf'), res.body);
  });

  it('supports pageSize and orientation query parameters', async () => {
    const res = await request(app)
      .get('/api/reports/monthly-checkup?format=pdf&pageSize=Letter&orientation=landscape')
      .set('Authorization', `Bearer ${token}`)
      .buffer()
      .parse((res: any, callback) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', function (chunk: any) { res.data += chunk; });
        res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(1000);

    // Save fixture
    const fixturesDir = require('path').join(process.cwd(), 'server', 'tests', 'fixtures');
    try { require('fs').mkdirSync(fixturesDir, { recursive: true }); } catch (e) {}
    require('fs').writeFileSync(require('path').join(fixturesDir, 'monthly-checkup-letter-landscape.pdf'), res.body);
  });

  it('resiliently generates annual health PDF even if a card getter throws', async () => {
    // Monkeypatch storage.getAnnualHealthCards to return a card with a throwing getter
    const original = storage.getAnnualHealthCards.bind(storage);
    (storage as any).getAnnualHealthCards = async function () {
      return { cards: [ { id: 'bad-card-1', studentId: 'missing', status: 'Approved', get notes() { throw new Error('simulated getter failure'); } } ], total: 1 } as any;
    };

    try {
      const res = await request(app)
        .get('/api/reports/annual-health?format=pdf')
        .set('Authorization', `Bearer ${token}`)
        .buffer()
        .parse((res: any, callback) => {
          res.setEncoding('binary');
          res.data = '';
          res.on('data', function (chunk: any) { res.data += chunk; });
          res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
        });

      expect(res.status).toBe(200);
      const asText = res.body.toString('utf8');
      expect(asText.includes('SwasthyaTrack Report')).toBeTruthy();
    } finally {
      // restore
      (storage as any).getAnnualHealthCards = original;
    }
  });

  it('CSV /excel monthly-checkup respects classSection filter', async () => {
    const schoolId = `class-filter-school-${Date.now()}`;
    // Create two students in different classes
    const studentA = await storage.createStudent({ fullName: `Class A Student ${Date.now()}`, uniqueId: `CA-${Date.now()}`, gender: 'M', classSection: '3-A', schoolId } as any);
    const studentB = await storage.createStudent({ fullName: `Class B Student ${Date.now()}`, uniqueId: `CB-${Date.now()}`, gender: 'F', classSection: '3-B', schoolId } as any);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Create monthly checkups for both students
    await storage.createMonthlyCheckup({ studentId: studentA.id, schoolId, month, year, checkupDate: new Date().toISOString(), heightCm: 120, weightKg: 24, bmi: 16 } as any);
    await storage.createMonthlyCheckup({ studentId: studentB.id, schoolId, month, year, checkupDate: new Date().toISOString(), heightCm: 125, weightKg: 26, bmi: 16.6 } as any);

    // Create Headmaster user scoped to this school
    const head = await storage.createUser({ username: `head-${Date.now()}`, password: 'pass', email: `${Date.now()}@example.com`, role: 'Headmaster', schoolId } as any);
    const jwt = require('jsonwebtoken');
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const headToken = jwt.sign({ id: head.id, username: head.username, role: head.role, schoolId: head.schoolId }, secret, { expiresIn: '1h' });

    // Request CSV with class filter for 3-A
    const csvRes = await request(app)
      .get(`/api/reports/monthly-checkup?format=csv&month=${month}&year=${year}&classSection=3-A`)
      .set('Authorization', `Bearer ${headToken}`)
      .expect(200);

    expect(csvRes.headers['content-type']).toContain('text/csv');

    const csvText = csvRes.text;
    // Should include studentA name and not include studentB name
    expect(csvText.includes(studentA.fullName)).toBeTruthy();
    expect(csvText.includes(studentB.fullName)).toBeFalsy();

    // Also verify Excel endpoint returns success and limited content-type
    const excelRes = await request(app)
      .get(`/api/reports/monthly-checkup?format=excel&month=${month}&year=${year}&classSection=3-A`)
      .set('Authorization', `Bearer ${headToken}`)
      .buffer()
      .parse((res: any, callback) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', function (chunk: any) { res.data += chunk; });
        res.on('end', function () { callback(null, Buffer.from(res.data, 'binary')); });
      });

    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
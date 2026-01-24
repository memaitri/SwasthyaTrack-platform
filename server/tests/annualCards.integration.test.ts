import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

describe('Annual Health Cards Integration', () => {
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

  it('creates a student with health card and detects referral', async () => {
    // Create student + health card with a B1 referral
    const payload = {
      student: {
        fullName: `Test Student ${Date.now()}`,
        uniqueId: `UID${Date.now()}`,
        gender: 'M',
        classSection: '1-A',
        schoolId: 'test-school-1'
      },
      healthCard: {
        weightKg: '25',
        heightCm: '120',
        b1_severe_thinning: true,
        b1_referral_facility: 'PHC',
        b1_referral_date: '2025-12-05'
      }
    };

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    const createdStudent = res.body;
    expect(createdStudent.id).toBeDefined();

    // Find the created health card via storage
    const { cards } = await storage.getAnnualHealthCards({ studentId: createdStudent.id, limit: 10 });
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const card = cards[0];
    expect(card).toBeDefined();

    // Call referrals export endpoint
    const exportRes = await request(app)
      .get(`/api/annual-cards/${card.id}/referrals`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(exportRes.status).toBe(200);
    expect(exportRes.body).toHaveProperty('referrals');
    const referrals = exportRes.body.referrals as any[];
    // There should be at least one referral (B1)
    const b1 = referrals.find(r => r.label === 'B1' || r.label === 'B1');
    expect(b1).toBeDefined();
    expect(b1.facility).toBe('PHC');
  });

  it('fetches a full saved health card including student and basic sections', async () => {
    // Create a student + health card with vaccination/allergies data
    const createPayload = {
      student: {
        fullName: `Test Student VC ${Date.now()}`,
        uniqueId: `UIDVC${Date.now()}`,
        gender: 'F',
        classSection: '2-B',
        schoolId: 'test-school-1'
      },
      healthCard: {
        weightKg: '30',
        heightCm: '130'
      }
    };

    const createRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(createPayload);

    expect(createRes.status).toBe(201);
    const createdStudent = createRes.body;

    const { cards } = await storage.getAnnualHealthCards({ studentId: createdStudent.id, limit: 10 });
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const card = cards[0];

    // Fetch via API
    const getRes = await request(app)
      .get(`/api/annual-cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty('card');
    expect(getRes.body).toHaveProperty('student');

    const returnedCard = getRes.body.card as any;
    expect(returnedCard.weightKg).toBeDefined();
    expect(returnedCard.heightCm).toBeDefined();
  });

  it('supports fetching cards by studentId via query param', async () => {
    // Create a student + health card
    const createPayload = {
      student: {
        fullName: `Test Student ByStudent ${Date.now()}`,
        uniqueId: `UIDST${Date.now()}`,
        gender: 'F',
        classSection: '4-D',
        schoolId: 'test-school-1'
      },
      healthCard: {
        weightKg: '28',
        heightCm: '125'
      }
    };

    const createRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(createPayload);

    expect(createRes.status).toBe(201);
    const createdStudent = createRes.body;

    // Call list endpoint with studentId
    const listRes = await request(app)
      .get(`/api/annual-cards?studentId=${createdStudent.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveProperty('cards');
    const cardsList = listRes.body.cards as any[];
    expect(Array.isArray(cardsList)).toBeTruthy();
    expect(cardsList.length).toBeGreaterThanOrEqual(1);
    expect(cardsList[0].studentId).toBe(createdStudent.id);
  });

  it('saves and returns extended health card fields when full form submitted', async () => {
    const createPayload = {
      student: {
        fullName: `Test Student Extended ${Date.now()}`,
        uniqueId: `UIDEXT${Date.now()}`,
        gender: 'M',
        classSection: '3-C',
        schoolId: 'test-school-1'
      },
      healthCard: {
        weightKg: '40',
        heightCm: '140',
        a1_visible_defect: true,
        a1_visible_defect_notes: 'Cleft lip',
        b3_severe_anemia: true,
        b3_referral_facility: 'PHC',
        c7_suspected: true,
        c7_referral_facility: 'District Hospital',
        c8_suspected: true,
        c8_referral_facility: 'TB Center',
        e1_life_events_difficulty: true,
        e1_referral_suggested: 'AFHC',
        notes: 'Extended fields test'
      }
    };

    const createRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send(createPayload);

    expect(createRes.status).toBe(201);
    const createdStudent = createRes.body;

    const { cards } = await storage.getAnnualHealthCards({ studentId: createdStudent.id, limit: 10 });
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const card = cards[0];

    // Fetch via API
    const getRes = await request(app)
      .get(`/api/annual-cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(getRes.status).toBe(200);
    const returnedCard = getRes.body.card as any;

    // Verify that extended fields are present and persisted
    expect(returnedCard.a1_visible_defect).toBeTruthy();
    expect(returnedCard.a1_visible_defect_notes).toBe('Cleft lip');
    expect(returnedCard.b3_severe_anemia).toBeTruthy();
    expect(returnedCard.b3_referral_facility).toBe('PHC');
    expect(returnedCard.c7_suspected).toBeTruthy();
    expect(returnedCard.c7_referral_facility).toBe('District Hospital');
    expect(returnedCard.c8_suspected).toBeTruthy();
    expect(returnedCard.c8_referral_facility).toBe('TB Center');
    expect(returnedCard.e1_life_events_difficulty).toBeTruthy();
    expect(returnedCard.e1_referral_suggested).toBe('AFHC');
    expect(returnedCard.notes).toBe('Extended fields test');
    // BMI category is calculated and stored
    expect(returnedCard.bmi_category).toBeDefined();
  });

  it('returns 500 for an incomplete health card (missing student/data)', async () => {
    // Create a card with a non-existent student id to simulate incomplete fetch
    const fakeStudentId = '00000000-0000-0000-0000-000000000000';
    const inserted = await storage.createAnnualHealthCard({ studentId: fakeStudentId, year: 2025 } as any);

    const res = await request(app)
      .get(`/api/annual-cards/${inserted.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Incomplete health card data');
    expect(Array.isArray(res.body.missing)).toBeTruthy();
  });
});

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

let app: express.Express;
let server: any;
let poToken: string;
let school: any;
let student: any;
let card: any;

describe('PO Dashboard disease and adolescent data', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    // create PO user and school/student
    const poUser = await storage.createUser({ username: `po-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'PO User', role: 'PO', district: 'D-TEST', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    poToken = jwt.sign({ id: poUser.id, username: poUser.username, role: poUser.role }, secret, { expiresIn: '1h' });

    school = await storage.createSchool({ name: 'PO Test School', district: 'D-TEST', schoolType: 'Government' } as any);
    student = await storage.createStudent({ fullName: 'Adol Student', uniqueId: `AS-${Date.now()}`, gender: 'F', classSection: '9-A', schoolId: school.id, dateOfBirth: new Date('2010-06-01') } as any);

    // Create an annual health card with TB and adolescent flags
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
      c8_suspected: true,
      c8_symptoms: { persistent_cough: true, fever: true, night_sweats: false, hemoptysis: 'mild' },
      // mark TB referral as completed on the health card
      referral_tb_facility_date: new Date().toISOString(),
      c7_suspected: true,
      c7_types: { patchy: true, plaque: false },
      c7_clinical_features: { sensory_deficit_in_lesion: true },
      // mark Leprosy referral as completed on the health card
      referral_leprosy_facility_date: new Date().toISOString(),
      e1_life_events_difficulty: true,
      e3_persistent_sadness: true,
      e4_menstruation_started: true,
    } as any);

    // Also create a simple convulsive case to assert mapping
    await storage.createAnnualHealthCard({
      studentId: student.id,
      schoolId: school.id,
      year: new Date().getFullYear(),
      nameOfChild: student.fullName + ' Convulsive',
      classSection: student.classSection,
      gender: student.gender,
      c1_convulsive: true,
    } as any);
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });



  it('returns tb symptoms breakdown and leprosy subtype distribution and adolescent samples', async () => {
    const res = await request(app)
      .get(`/api/po/dashboard?month=${String(new Date().getMonth()+1)}&year=${String(new Date().getFullYear())}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.tbAnalytics).toBeDefined();
    expect(body.tbAnalytics.symptomsBreakdown).toBeDefined();
    expect(body.tbAnalytics.symptomsBreakdown.counts.persistent_cough).toBeGreaterThanOrEqual(1);

    expect(body.leprosyAnalytics).toBeDefined();
    expect(body.leprosyAnalytics.subTypeDistribution.patchy).toBeGreaterThanOrEqual(1);

    expect(body.adolescentHealth).toBeDefined();
    expect(body.adolescentHealth.adolescentCardCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.adolescentHealth.samples)).toBe(true);
    expect(body.adolescentHealth.samples.length).toBeGreaterThanOrEqual(1);

    // Convulsive mapping renamed from vision -> convulsive
    expect(body.diseasesInsights.convulsive).toBeDefined();
    expect(body.diseasesInsights.convulsive.totalCases).toBeGreaterThanOrEqual(1);

    // Backwards compatibility: 'vision' alias should also exist
    expect(body.diseasesInsights.vision).toBeDefined();
    expect(body.diseasesInsights.vision.totalCases).toBeGreaterThanOrEqual(1);

    // New: deficiencies insights should include totalCases and pendingReferrals
    expect(body.deficienciesInsights).toBeDefined();
    expect(body.deficienciesInsights.iron).toBeDefined();
    expect(typeof body.deficienciesInsights.iron.totalCases).toBe('number');
    expect(typeof body.deficienciesInsights.iron.pendingReferrals).toBe('number');

    // New: referral completion should be derived from health-card fields
    expect(body.leprosyAnalytics.referralStatus.completed).toBeGreaterThanOrEqual(1);
    expect(body.tbAnalytics.referralStatus.completed).toBeGreaterThanOrEqual(1);
    expect(body.diseasesInsights.leprosy.referralCompletion).toBeGreaterThanOrEqual(1);
    expect(body.diseasesInsights.tb.referralCompletion).toBeGreaterThanOrEqual(1);
  });

  it('returns exact counts for sample disease and adolescent scenario', async () => {
    // Seed leprosy cases (3) with no completed referrals
    for (let i = 0; i < 3; i++) {
      const s = await storage.createStudent({ fullName: `Leprosy ${i} ${Date.now()}`, uniqueId: `L-${Date.now()}-${i}`, gender: 'M', classSection: '3-A', schoolId: school.id, dateOfBirth: new Date('2016-01-01') } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, c7_suspected: true } as any);
    }

    // Seed TB cases (7) with 3 completed referrals and symptoms distribution
    for (let i = 0; i < 7; i++) {
      const s = await storage.createStudent({ fullName: `TB ${i} ${Date.now()}`, uniqueId: `T-${Date.now()}-${i}`, gender: 'M', classSection: '4-A', schoolId: school.id, dateOfBirth: new Date('2016-01-01') } as any);
      const symptoms: any = {};
      if (i < 6) symptoms.persistent_cough = true; // 6
      if (i < 5) symptoms.fever = true; // 5
      if (i < 4) symptoms.unexplained_weight_loss = true; // 4
      if (i < 3) symptoms.fatigue = true; // 3
      if (i < 2) symptoms.night_sweats = true; // 2
      const cardData: any = { studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, c8_suspected: true, c8_symptoms: symptoms };
      if (i < 3) cardData.referral_tb_facility_date = new Date().toISOString(); // mark 3 referrals complete
      await storage.createAnnualHealthCard(cardData as any);
    }

    // Seed adolescent developmental concerns (ensure age >=10)
    const currentYear = new Date().getFullYear();
    const buildDob = (ageYears: number) => new Date(`${currentYear - ageYears}-01-01`);

    for (let i = 0; i < 12; i++) {
      const s = await storage.createStudent({ fullName: `Vision ${i} ${Date.now()}`, uniqueId: `V-${Date.now()}-${i}`, gender: 'M', classSection: '9-A', schoolId: school.id, dateOfBirth: buildDob(12) } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, d1_seeing_difficulty: true } as any);
    }
    for (let i = 0; i < 8; i++) {
      const s = await storage.createStudent({ fullName: `Hearing ${i} ${Date.now()}`, uniqueId: `H-${Date.now()}-${i}`, gender: 'M', classSection: '9-A', schoolId: school.id, dateOfBirth: buildDob(13) } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, d5_hearing_difficulty: true } as any);
    }
    for (let i = 0; i < 15; i++) {
      const s = await storage.createStudent({ fullName: `Learning ${i} ${Date.now()}`, uniqueId: `LE-${Date.now()}-${i}`, gender: 'M', classSection: '9-A', schoolId: school.id, dateOfBirth: buildDob(14) } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, d7_learning_difficulty: true } as any);
    }
    for (let i = 0; i < 6; i++) {
      const s = await storage.createStudent({ fullName: `Motor ${i} ${Date.now()}`, uniqueId: `M-${Date.now()}-${i}`, gender: 'M', classSection: '9-A', schoolId: school.id, dateOfBirth: buildDob(11) } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, d2_walking_delay: true } as any);
    }

    // Create a student with severe anemia (pending referral expected)
    const anemiaStudent = await storage.createStudent({ fullName: `Anemia ${Date.now()}`, uniqueId: `A-${Date.now()}`, gender: 'F', classSection: '7-A', schoolId: school.id, dateOfBirth: buildDob(12) } as any);
    await storage.createAnnualHealthCard({ studentId: anemiaStudent.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: anemiaStudent.fullName, classSection: anemiaStudent.classSection, gender: anemiaStudent.gender, b3_severe_anemia: true } as any);
    for (let i = 0; i < 10; i++) {
      const s = await storage.createStudent({ fullName: `Behavior ${i} ${Date.now()}`, uniqueId: `B-${Date.now()}-${i}`, gender: 'M', classSection: '9-A', schoolId: school.id, dateOfBirth: buildDob(12) } as any);
      await storage.createAnnualHealthCard({ studentId: s.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: s.fullName, classSection: s.classSection, gender: s.gender, d9_behavioral_concerns: true } as any);
    }

    const res = await request(app)
      .get(`/api/po/dashboard?month=${String(new Date().getMonth()+1)}&year=${String(new Date().getFullYear())}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(200);
    const body = res.body;

    // Leprosy checks
    expect(body.leprosyAnalytics.totalSuspectedCases).toBe(3);
    expect(body.leprosyAnalytics.referralStatus.completed).toBe(0);
    expect(body.diseasesInsights.leprosy.referralCompletion).toBe(0);

    // TB checks
    expect(body.tbAnalytics.totalSuspectedCases).toBe(7);
    expect(body.tbAnalytics.referralStatus.completed).toBe(3);
    expect(body.tbAnalytics.symptomsBreakdown.counts.persistent_cough).toBe(6);
    expect(body.tbAnalytics.symptomsBreakdown.counts.fever).toBe(5);
    expect(body.tbAnalytics.symptomsBreakdown.counts.unexplained_weight_loss).toBe(4);
    expect(body.tbAnalytics.symptomsBreakdown.counts.fatigue).toBe(3);
    expect(body.tbAnalytics.symptomsBreakdown.counts.night_sweats).toBe(2);

    // Adolescent developmental concerns
    expect(body.adolescentHealth.visionConcerns).toBe(12);
    expect(body.adolescentHealth.hearingConcerns).toBe(8);
    expect(body.adolescentHealth.learningConcerns).toBe(15);
    expect(body.adolescentHealth.motorConcerns).toBe(6);
    expect(body.adolescentHealth.behavioralConcerns).toBe(10);

    // Referral summary should still exist and provide counts — for PO the detailed list is intentionally absent
    expect(body.referralManagement).toBeDefined();
    expect(typeof body.referralManagement.pendingReferrals).toBe('number');
    expect(body.referralManagement.pendingReferrals).toBeGreaterThanOrEqual(1);
    expect(typeof body.referralManagement.totalReferralsGenerated).toBe('number');
    expect(body.referralManagement.totalReferralsGenerated).toBeGreaterThanOrEqual(1);

    // Since this is the PO dashboard response, the detailed list must not be present
    expect(body.referralManagement.pendingReferralsList).toBeUndefined();
  });

  it('PO school detail returns students with flattened health card fields', async () => {
    // Create a health card for the initial student with known anthropometry
    await storage.createAnnualHealthCard({ studentId: student.id, schoolId: school.id, year: new Date().getFullYear(), nameOfChild: student.fullName, classSection: student.classSection, gender: student.gender, weightKg: 32, heightCm: 141, bmi: 16.1 } as any);

    const res = await request(app)
      .get(`/api/po/schools/${school.id}`)
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(Array.isArray(body.students)).toBe(true);
    const found = body.students.find((s: any) => s.uniqueId === student.uniqueId);
    expect(found).toBeDefined();
    expect(found.weight).toBe(32);
    expect(found.height).toBe(141);
    expect(found.bmi).toBe(16.1);
  });
});
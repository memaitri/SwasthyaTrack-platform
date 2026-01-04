import express from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';
import jwt from 'jsonwebtoken';

async function run() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  // create PO user and school/student/card (similar to tests)
  const poUser = await storage.createUser({ username: `po-check-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'PO Check', role: 'PO', district: 'D-CHECK', isActive: true });
  const school = await storage.createSchool({ name: 'PO Check School', district: 'D-CHECK' });
  const student = await storage.createStudent({ fullName: 'Check Student', uniqueId: `CS-${Date.now()}`, gender: 'F', classSection: '9-A', schoolId: school.id, dateOfBirth: new Date('2010-06-01') });

  const card = await storage.createAnnualHealthCard({
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
    c7_suspected: true,
    c7_types: { patchy: true, plaque: false },
    c7_clinical_features: { sensory_deficit_in_lesion: true },
    e1_life_events_difficulty: true,
    e3_persistent_sadness: true,
    e4_menstruation_started: true,
  });

  const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
  const token = jwt.sign({ id: poUser.id, username: poUser.username, role: poUser.role }, secret, { expiresIn: '1h' });

  const month = String(new Date().getMonth() + 1);
  const year = String(new Date().getFullYear());

  try {
    const res = await request(app)
      .get(`/api/po/dashboard?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${token}`)
      .timeout(5000);

    console.log('Status:', res.status);
    console.log('Body keys:', Object.keys(res.body));
    console.log('diseasesInsights:', JSON.stringify(res.body.diseasesInsights, null, 2));
    console.log('leprosyAnalytics:', JSON.stringify(res.body.leprosyAnalytics, null, 2));
    console.log('tbAnalytics:', JSON.stringify(res.body.tbAnalytics, null, 2));
    console.log('adolescentHealth:', JSON.stringify(res.body.adolescentHealth, null, 2));
    console.log('deficienciesInsights:', JSON.stringify(res.body.deficienciesInsights, null, 2));
  } catch (err) {
    console.error('Request error:', err);
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
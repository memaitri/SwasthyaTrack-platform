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

describe('Schools listing PO district restrictions', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    schoolA = await storage.createSchool({ name: 'PO School A', district: 'D-PO-1' } as any);
    schoolB = await storage.createSchool({ name: 'Other School B', district: 'D-OTHER' } as any);

    const poUser = await storage.createUser({ username: `po-${Date.now()}`, password: 'p', email: `po${Date.now()}@example.com`, fullName: 'Program Officer', role: 'PO', district: 'D-PO-1', isActive: true } as any);

    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    poToken = jwt.sign({ id: poUser.id, username: poUser.username, role: poUser.role }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('returns only PO district schools to PO user', async () => {
    const res = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${poToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.schools)).toBe(true);
    // Ensure only schools in PO's district are returned
    expect(res.body.schools.every((s: any) => s.district === 'D-PO-1')).toBe(true);
  });

  it('returns empty list if PO has no district and no assigned school', async () => {
    const poNoDistrict = await storage.createUser({ username: `po-no-d-${Date.now()}`, password: 'p', email: `po${Date.now()}nod@example.com`, fullName: 'PO No District', role: 'PO', isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    const poNoDistrictToken = jwt.sign({ id: poNoDistrict.id, username: poNoDistrict.username, role: poNoDistrict.role }, secret, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${poNoDistrictToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.schools)).toBe(true);
    expect(res.body.schools.length).toBe(0);
  });

  it('returns only assigned school when PO has schoolId but no district', async () => {
    const assignedSchool = await storage.createSchool({ name: 'Assigned School', district: 'ASSIGN' } as any);
    const poWithSchool = await storage.createUser({ username: `po-s-${Date.now()}`, password: 'p', email: `pos${Date.now()}@example.com`, fullName: 'PO With School', role: 'PO', schoolId: assignedSchool.id, isActive: true } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    const poWithSchoolToken = jwt.sign({ id: poWithSchool.id, username: poWithSchool.username, role: poWithSchool.role }, secret, { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${poWithSchoolToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.schools)).toBe(true);
    expect(res.body.schools.length).toBe(1);
    expect(res.body.schools[0].id).toBe(assignedSchool.id);
  });
});

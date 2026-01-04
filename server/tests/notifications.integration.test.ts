import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { notifications } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

let app: express.Express;
let server: any;
let hmToken: string;
let headmaster: any;
let school: any;

describe('Notifications by-role endpoint', () => {
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    await registerRoutes(httpServer as any, app as any);
    server = httpServer.listen(0);

    school = await storage.createSchool({ name: 'Notifications Test School', district: 'D-TEST' } as any);

    headmaster = await storage.createUser({ username: `hm-${Date.now()}`, password: 'p', email: `hm${Date.now()}@example.com`, fullName: 'HM User', role: 'Headmaster', isActive: true, schoolId: school.id } as any);
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    const jwt = require('jsonwebtoken');
    hmToken = jwt.sign({ id: headmaster.id, username: headmaster.username, role: headmaster.role, schoolId: headmaster.schoolId }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try { server && server.close(); } catch (e) {}
  });

  it('returns stored notifications for the headmaster', async () => {
    const created = await storage.createNotification({
      senderId: headmaster.id,
      senderRole: headmaster.role as any,
      receiverRole: 'Headmaster' as any,
      receiverSchoolId: school.id,
      type: 'system' as any,
      title: 'Test Notification',
      message: 'Hello Headmaster'
    } as any);

    const res = await request(app)
      .get('/api/notifications/by-role')
      .set('Authorization', `Bearer ${hmToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    const found = (res.body.notifications || []).find((n: any) => n.id === created.id || n.title === 'Test Notification');
    expect(found).toBeDefined();
  });

  it('can mark a single notification as read', async () => {
    const created = await storage.createNotification({
      senderId: headmaster.id,
      senderRole: headmaster.role as any,
      receiverRole: 'Headmaster' as any,
      receiverSchoolId: school.id,
      type: 'system' as any,
      title: 'Mark Read Test',
      message: 'Please read this'
    } as any);

    const res = await request(app)
      .patch('/api/notifications/mark-read')
      .set('Authorization', `Bearer ${hmToken}`)
      .send({ notificationId: created.id });

    expect(res.status).toBe(200);
    expect(res.body.notification).toBeDefined();

    const [row] = await db.select().from(notifications).where(eq(notifications.id, created.id));
    expect(row).toBeDefined();
    expect(row.isRead).toBe(true);
  });

  it('can mark all notifications as read for headmaster scope', async () => {
    const n1 = await storage.createNotification({ senderId: headmaster.id, senderRole: headmaster.role as any, receiverRole: 'Headmaster' as any, receiverSchoolId: school.id, type: 'system' as any, title: 'All Read 1', message: 'm1' } as any);
    const n2 = await storage.createNotification({ senderId: headmaster.id, senderRole: headmaster.role as any, receiverRole: 'Headmaster' as any, receiverSchoolId: school.id, type: 'system' as any, title: 'All Read 2', message: 'm2' } as any);

    const res = await request(app)
      .patch('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${hmToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.updated).toBeGreaterThanOrEqual(2);

    const rows = await db.select().from(notifications).where(and(eq(notifications.receiverRole, 'Headmaster'), eq(notifications.receiverSchoolId, school.id)));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    rows.forEach((r: any) => expect(r.isRead).toBe(true));
  });
});
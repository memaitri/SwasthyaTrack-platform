import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { storage } from '../storage';

let schoolA: any;
let schoolB: any;
let studentA: any;
let studentB: any;
let referralA: any;

describe('Dashboard metrics - referrals counts', () => {
  beforeAll(async () => {
    // Create two schools in same district
    schoolA = await storage.createSchool({ name: `School A ${Date.now()}`, district: 'D1', region: 'R1' } as any);
    schoolB = await storage.createSchool({ name: `School B ${Date.now()}`, district: 'D1', region: 'R1' } as any);

    // Create students in those schools
    studentA = await storage.createStudent({ fullName: 'Student A', uniqueId: `SA-${Date.now()}`, gender: 'M', classSection: '1-A', schoolId: schoolA.id } as any);
    studentB = await storage.createStudent({ fullName: 'Student B', uniqueId: `SB-${Date.now()}`, gender: 'F', classSection: '1-A', schoolId: schoolB.id } as any);

    // Create a referral for studentA under schoolA
    referralA = await storage.createReferral({
      studentId: studentA.id,
      schoolId: schoolA.id,
      healthCardId: null,
      referralType: 'deficiency',
      referralCode: 'R1',
      issue: 'Test issue',
      facility: 'PHC',
      referralDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      createdBy: null,
    } as any);
  });

  afterAll(async () => {
    // Note: cleanup may not be necessary in test DB, but attempt to remove created rows
    try { await storage.updateReferral(referralA.id, { status: 'Deleted' } as any); } catch (e) {}
  });

  it('counts referrals for a specific school', async () => {
    const metrics = await storage.getDashboardMetrics('Admin', 'u1', schoolA.id);
    expect(metrics.referredCount).toBeGreaterThanOrEqual(1);
  });

  it('counts referrals across district for PO role', async () => {
    const metrics = await storage.getDashboardMetrics('PO', 'u1', undefined, undefined, 'D1');
    // Should include referral in schoolA
    expect(metrics.referredCount).toBeGreaterThanOrEqual(1);
  });
});
import { describe, it, beforeAll, expect } from 'vitest';
import { storage } from '../storage';

let school: any;
let student: any;

describe('Dashboard metrics fields presence', () => {
  beforeAll(async () => {
    school = await storage.createSchool({ name: `FieldTest School ${Date.now()}`, district: 'DT', region: 'RG', schoolType: 'Government' } as any);
    student = await storage.createStudent({ fullName: 'Field Student', uniqueId: `FS-${Date.now()}`, gender: 'M', classSection: '1-A', schoolId: school.id } as any);
  });

  it('returns vaccinationCoverage, dataCompleteness and monthlyTrends', async () => {
    const metrics = await storage.getDashboardMetrics('Admin', 'u1', school.id);
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('vaccinationCoverage');
    expect(metrics).toHaveProperty('dataCompleteness');
    expect(metrics).toHaveProperty('monthlyTrends');
    expect(Array.isArray(metrics.monthlyTrends)).toBeTruthy();
  });
});
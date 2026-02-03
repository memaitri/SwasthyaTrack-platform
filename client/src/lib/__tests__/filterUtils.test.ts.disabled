/**
 * Tests for filtering utilities
 * Ensures consistent and reliable filtering across the application
 */

import { describe, it, expect } from 'vitest';
import {
  filterBySchoolType,
  filterByDistrict,
  filterByTimePeriod,
  applyFilters,
  validateFilterConfig,
  getFilterOptions,
  buildFilterParams,
  groupBySchoolType,
  calculateSchoolTypeStats,
  type FilterConfig,
  type FilterableSchool,
  type FilterableData
} from '../../../../lib/filterUtils';

// Mock data for testing
const mockSchools: (FilterableSchool & FilterableData)[] = [
  {
    id: '1',
    name: 'Government Primary School A',
    schoolType: 'Government',
    district: 'District 1',
    block: 'Block A',
    createdAt: new Date('2025-01-15'),
    month: 1,
    year: 2025
  },
  {
    id: '2',
    name: 'Aided High School B',
    schoolType: 'Aided',
    district: 'District 1',
    block: 'Block B',
    createdAt: new Date('2025-02-10'),
    month: 2,
    year: 2025
  },
  {
    id: '3',
    name: 'Government Secondary School C',
    schoolType: 'Government',
    district: 'District 2',
    block: 'Block A',
    createdAt: new Date('2024-12-20'),
    month: 12,
    year: 2024
  },
  {
    id: '4',
    name: 'Aided Primary School D',
    schoolType: 'Aided',
    district: 'District 1',
    block: 'Block C',
    createdAt: new Date('2025-01-25'),
    month: 1,
    year: 2025
  }
];

describe('filterBySchoolType', () => {
  it('should return all schools when filter is "all"', () => {
    const result = filterBySchoolType(mockSchools, 'all');
    expect(result).toHaveLength(4);
    expect(result).toEqual(mockSchools);
  });

  it('should filter Government schools correctly', () => {
    const result = filterBySchoolType(mockSchools, 'Government');
    expect(result).toHaveLength(2);
    expect(result.every(school => school.schoolType === 'Government')).toBe(true);
  });

  it('should filter Aided schools correctly', () => {
    const result = filterBySchoolType(mockSchools, 'Aided');
    expect(result).toHaveLength(2);
    expect(result.every(school => school.schoolType === 'Aided')).toBe(true);
  });

  it('should handle invalid school type gracefully', () => {
    const result = filterBySchoolType(mockSchools, 'Invalid' as any);
    expect(result).toEqual(mockSchools); // Should return all when invalid
  });

  it('should handle empty array', () => {
    const result = filterBySchoolType([], 'Government');
    expect(result).toHaveLength(0);
  });
});

describe('filterByDistrict', () => {
  it('should return all schools when no district specified', () => {
    const result = filterByDistrict(mockSchools);
    expect(result).toEqual(mockSchools);
  });

  it('should filter by district correctly', () => {
    const result = filterByDistrict(mockSchools, 'District 1');
    expect(result).toHaveLength(3);
    expect(result.every(school => school.district === 'District 1')).toBe(true);
  });

  it('should be case insensitive', () => {
    const result = filterByDistrict(mockSchools, 'district 1');
    expect(result).toHaveLength(3);
  });

  it('should handle non-existent district', () => {
    const result = filterByDistrict(mockSchools, 'Non-existent District');
    expect(result).toHaveLength(0);
  });
});

describe('validateFilterConfig', () => {
  it('should validate correct config', () => {
    const config: FilterConfig = {
      schoolType: 'Government',
      month: 6,
      year: 2025
    };

    const result = validateFilterConfig(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch invalid school type', () => {
    const config: FilterConfig = {
      schoolType: 'Invalid' as any
    };

    const result = validateFilterConfig(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid school type: Invalid');
  });

  it('should catch invalid month', () => {
    const config: FilterConfig = {
      month: 13
    };

    const result = validateFilterConfig(config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid month: 13. Must be between 1 and 12.');
  });
});

describe('filterByTimePeriod', () => {
  it('should filter by month correctly', () => {
    const result = filterByTimePeriod(mockSchools, 1);
    expect(result).toHaveLength(2);
    expect(result.every(school => school.month === 1)).toBe(true);
  });

  it('should filter by year correctly', () => {
    const result = filterByTimePeriod(mockSchools, undefined, 2025);
    expect(result).toHaveLength(3);
    expect(result.every(school => school.year === 2025)).toBe(true);
  });

  it('should filter by both month and year', () => {
    const result = filterByTimePeriod(mockSchools, 1, 2025);
    expect(result).toHaveLength(2);
    expect(result.every(school => school.month === 1 && school.year === 2025)).toBe(true);
  });
});

describe('applyFilters', () => {
  it('should apply multiple filters correctly', () => {
    const config: FilterConfig = {
      schoolType: 'Government',
      district: 'District 1'
    };

    const result = applyFilters(mockSchools, config);
    expect(result).toHaveLength(1);
    expect(result[0].schoolType).toBe('Government');
    expect(result[0].district).toBe('District 1');
  });

  it('should handle empty config', () => {
    const result = applyFilters(mockSchools, {});
    expect(result).toEqual(mockSchools);
  });
});

describe('getFilterOptions', () => {
  it('should return available school types and districts', () => {
    const result = getFilterOptions(mockSchools);
    
    expect(result.schoolTypes).toHaveLength(3); // all, Government, Aided
    expect(result.schoolTypes[0]).toEqual({ value: 'all', label: 'All Schools' });
    
    expect(result.districts).toHaveLength(2); // District 1, District 2
    expect(result.districts.map(d => d.value)).toContain('District 1');
    expect(result.districts.map(d => d.value)).toContain('District 2');
  });
});

describe('buildFilterParams', () => {
  it('should build URL params correctly', () => {
    const config: FilterConfig = {
      schoolType: 'Government',
      district: 'District 1',
      month: 6,
      year: 2025
    };

    const params = buildFilterParams(config);
    expect(params.get('schoolType')).toBe('Government');
    expect(params.get('district')).toBe('District 1');
    expect(params.get('month')).toBe('6');
    expect(params.get('year')).toBe('2025');
  });

  it('should skip "all" school type', () => {
    const config: FilterConfig = {
      schoolType: 'all'
    };

    const params = buildFilterParams(config);
    expect(params.has('schoolType')).toBe(false);
  });
});

describe('groupBySchoolType', () => {
  it('should group schools by type correctly', () => {
    const result = groupBySchoolType(mockSchools);
    
    expect(result.all).toHaveLength(4);
    expect(result.Government).toHaveLength(2);
    expect(result.Aided).toHaveLength(2);
  });
});

describe('calculateSchoolTypeStats', () => {
  it('should calculate statistics correctly', () => {
    const result = calculateSchoolTypeStats(mockSchools);
    
    expect(result.total).toBe(4);
    expect(result.government.count).toBe(2);
    expect(result.government.percentage).toBe(50);
    expect(result.aided.count).toBe(2);
    expect(result.aided.percentage).toBe(50);
  });

  it('should handle empty array', () => {
    const result = calculateSchoolTypeStats([]);
    
    expect(result.total).toBe(0);
    expect(result.government.percentage).toBe(0);
    expect(result.aided.percentage).toBe(0);
  });
});
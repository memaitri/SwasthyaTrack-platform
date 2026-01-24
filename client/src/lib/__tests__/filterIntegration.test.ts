/**
 * Integration tests for the complete filtering system
 * Tests the integration between client parameters and server utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { validateFilterConfig, buildFilterParams, filterBySchoolType, filterByDistrict, applyFilters, type FilterConfig } from '../../../../lib/filterUtils';

// Mock the shared schema
vi.mock('@shared/schema', () => ({
  schoolTypeEnum: ['Government', 'Aided']
}));

describe('Filter System Integration', () => {
  describe('Client-Server Parameter Integration', () => {
    it('should validate parameters from client correctly', () => {
      // Simulate parameters coming from client
      const clientParams = new URLSearchParams();
      clientParams.append('schoolType', 'Government');
      clientParams.append('month', '6');
      clientParams.append('year', '2025');
      
      // Convert to server filter config (like server routes do)
      const serverConfig: FilterConfig = {
        schoolType: clientParams.get('schoolType') as any,
        month: parseInt(clientParams.get('month') || '0'),
        year: parseInt(clientParams.get('year') || '0')
      };
      
      // Validate server-side
      const validation = validateFilterConfig(serverConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle missing schoolType parameter correctly', () => {
      const clientParams = new URLSearchParams();
      clientParams.append('month', '6');
      clientParams.append('year', '2025');
      // schoolType is missing (should default to "all")
      
      const serverConfig: FilterConfig = {
        month: parseInt(clientParams.get('month') || '0'),
        year: parseInt(clientParams.get('year') || '0')
        // schoolType is undefined, which is valid
      };
      
      const validation = validateFilterConfig(serverConfig);
      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid parameters from client', () => {
      const clientParams = new URLSearchParams();
      clientParams.append('schoolType', 'InvalidType');
      clientParams.append('month', '13');
      clientParams.append('year', '2050');
      
      const serverConfig: FilterConfig = {
        schoolType: clientParams.get('schoolType') as any,
        month: parseInt(clientParams.get('month') || '0'),
        year: parseInt(clientParams.get('year') || '0')
      };
      
      const validation = validateFilterConfig(serverConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid school type: InvalidType');
      expect(validation.errors).toContain('Invalid month: 13. Must be between 1 and 12.');
      expect(validation.errors).toContain('Invalid year: 2050. Must be between 2020 and 2030.');
    });
  });

  describe('URL Parameter Building', () => {
    it('should build consistent URL parameters', () => {
      const config: FilterConfig = {
        schoolType: 'Government',
        district: 'Test District',
        month: 6,
        year: 2025
      };

      const params = buildFilterParams(config);
      
      expect(params.get('schoolType')).toBe('Government');
      expect(params.get('district')).toBe('Test District');
      expect(params.get('month')).toBe('6');
      expect(params.get('year')).toBe('2025');
    });

    it('should skip "all" school type in URL parameters', () => {
      const config: FilterConfig = {
        schoolType: 'all',
        month: 6,
        year: 2025
      };

      const params = buildFilterParams(config);
      
      expect(params.has('schoolType')).toBe(false);
      expect(params.get('month')).toBe('6');
      expect(params.get('year')).toBe('2025');
    });
  });

  describe('Data Filtering Integration', () => {
    const mockSchools = [
      {
        id: '1',
        name: 'Government Primary School A',
        schoolType: 'Government' as const,
        district: 'District 1',
        block: 'Block A',
        createdAt: new Date('2025-01-15'),
        month: 1,
        year: 2025
      },
      {
        id: '2',
        name: 'Aided High School B',
        schoolType: 'Aided' as const,
        district: 'District 1',
        block: 'Block B',
        createdAt: new Date('2025-02-10'),
        month: 2,
        year: 2025
      },
      {
        id: '3',
        name: 'Government Secondary School C',
        schoolType: 'Government' as const,
        district: 'District 2',
        block: 'Block A',
        createdAt: new Date('2024-12-20'),
        month: 12,
        year: 2024
      }
    ];

    it('should apply filters in the same way as server routes', () => {
      // Simulate server route filtering logic
      const selectedSchoolType = 'Government';
      const poDistrict = 'District 1';
      
      // Apply district filter first (like PO access control)
      let filteredSchools = filterByDistrict(mockSchools, poDistrict);
      expect(filteredSchools).toHaveLength(2);
      
      // Apply school type filter
      filteredSchools = filterBySchoolType(filteredSchools, selectedSchoolType);
      expect(filteredSchools).toHaveLength(1);
      expect(filteredSchools[0].schoolType).toBe('Government');
      expect(filteredSchools[0].district).toBe('District 1');
    });

    it('should handle combined filters correctly', () => {
      const config: FilterConfig = {
        schoolType: 'Government',
        district: 'District 1',
        month: 1,
        year: 2025
      };

      const result = applyFilters(mockSchools, config);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return all schools when no filters applied', () => {
      const config: FilterConfig = {};
      const result = applyFilters(mockSchools, config);
      expect(result).toHaveLength(3);
    });
  });

  describe('Filter Validation Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      const boundaryTests = [
        { month: 1, year: 2020, shouldBeValid: true },
        { month: 12, year: 2030, shouldBeValid: true },
        { month: 0, year: 2025, shouldBeValid: false },
        { month: 13, year: 2025, shouldBeValid: false },
        { month: 6, year: 2019, shouldBeValid: false },
        { month: 6, year: 2031, shouldBeValid: false }
      ];

      boundaryTests.forEach(({ month, year, shouldBeValid }) => {
        const config: FilterConfig = { month, year };
        const validation = validateFilterConfig(config);
        expect(validation.isValid).toBe(shouldBeValid, 
          `Failed for month: ${month}, year: ${year}`);
      });
    });

    it('should provide meaningful error messages', () => {
      const config: FilterConfig = {
        schoolType: 'Invalid' as any,
        month: 13,
        year: 2050
      };

      const validation = validateFilterConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid school type: Invalid');
      expect(validation.errors).toContain('Invalid month: 13. Must be between 1 and 12.');
      expect(validation.errors).toContain('Invalid year: 2050. Must be between 2020 and 2030.');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle PO dashboard filtering scenario', () => {
      // Simulate a PO dashboard request
      const queryParams = new URLSearchParams('?month=1&year=2025&schoolType=Government');
      
      // Server-side parameter extraction
      const filterConfig: FilterConfig = {
        schoolType: queryParams.get('schoolType') as any,
        month: parseInt(queryParams.get('month') || '1'),
        year: parseInt(queryParams.get('year') || '2025')
      };
      
      // Validation (like server routes do)
      const validation = validateFilterConfig(filterConfig);
      expect(validation.isValid).toBe(true);
      
      // Apply filters to mock data
      const mockData = [
        { id: '1', schoolType: 'Government' as const, month: 1, year: 2025, district: 'Test' },
        { id: '2', schoolType: 'Aided' as const, month: 1, year: 2025, district: 'Test' },
        { id: '3', schoolType: 'Government' as const, month: 2, year: 2025, district: 'Test' }
      ];
      
      const filtered = applyFilters(mockData, filterConfig);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should handle empty filter scenario', () => {
      const queryParams = new URLSearchParams('?month=1&year=2025');
      // No schoolType parameter (should default to "all")
      
      const filterConfig: FilterConfig = {
        month: parseInt(queryParams.get('month') || '1'),
        year: parseInt(queryParams.get('year') || '2025')
      };
      
      const validation = validateFilterConfig(filterConfig);
      expect(validation.isValid).toBe(true);
      
      // Should not filter by school type
      const mockData = [
        { id: '1', schoolType: 'Government' as const, month: 1, year: 2025 },
        { id: '2', schoolType: 'Aided' as const, month: 1, year: 2025 }
      ];
      
      const filtered = applyFilters(mockData, filterConfig);
      expect(filtered).toHaveLength(2); // Both schools should be included
    });
  });
});
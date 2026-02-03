// Filter utilities for the SwasthyaTrack platform
// This file provides filtering functionality for schools and data

export interface FilterConfig {
  schoolType?: string;
  district?: string;
  month?: number;
  year?: number;
}

export interface FilterableSchool {
  id: string;
  schoolType: string;
  district: string;
}

export interface FilterableData {
  month?: number;
  year?: number;
}

export function validateFilterConfig(config: FilterConfig): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (typeof config !== 'object' || config === null) {
    errors.push('Config must be an object');
  }
  
  if (config.month && (config.month < 1 || config.month > 12)) {
    errors.push('Month must be between 1 and 12');
  }
  
  if (config.year && (config.year < 2020 || config.year > 2030)) {
    errors.push('Year must be between 2020 and 2030');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function buildFilterParams(config: FilterConfig): Record<string, any> {
  const params: Record<string, any> = {};
  
  if (config.schoolType) params.schoolType = config.schoolType;
  if (config.district) params.district = config.district;
  if (config.month) params.month = config.month;
  if (config.year) params.year = config.year;
  
  return params;
}

export function filterBySchoolType<T extends FilterableSchool>(data: T[], schoolType: string): T[] {
  return data.filter(item => item.schoolType === schoolType);
}

export function filterByDistrict<T extends FilterableSchool>(data: T[], district: string): T[] {
  return data.filter(item => item.district === district);
}

export function applyFilters<T extends FilterableSchool & FilterableData>(data: T[], config: FilterConfig): T[] {
  let filtered = data;
  
  if (config.schoolType) {
    filtered = filterBySchoolType(filtered, config.schoolType);
  }
  
  if (config.district) {
    filtered = filterByDistrict(filtered, config.district);
  }
  
  if (config.month) {
    filtered = filtered.filter(item => item.month === config.month);
  }
  
  if (config.year) {
    filtered = filtered.filter(item => item.year === config.year);
  }
  
  return filtered;
}

export function groupBySchoolType<T extends FilterableSchool>(data: T[]): Record<string, T[]> {
  return data.reduce((acc, item) => {
    if (!acc[item.schoolType]) {
      acc[item.schoolType] = [];
    }
    acc[item.schoolType].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function calculateSchoolTypeStats<T extends FilterableSchool>(data: T[]): Record<string, number> {
  const grouped = groupBySchoolType(data);
  const stats: Record<string, number> = {};
  
  for (const [type, items] of Object.entries(grouped)) {
    stats[type] = items.length;
  }
  
  return stats;
}
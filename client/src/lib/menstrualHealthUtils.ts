/**
 * Utility functions for menstrual health tracking restrictions and validations
 */

export interface Student {
  id: string;
  gender: 'M' | 'F' | 'O';
  dateOfBirth?: string | Date;
  fullName: string;
  classSection: string;
  menstruationStartedAt?: string | Date;
}

/**
 * Calculate age in years from date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return age;
}

/**
 * Check if a student is eligible for menstrual cycle tracking
 * Requirements: Female student aged 10 years or older
 */
export function isEligibleForMenstrualTracking(student: Student): boolean {
  if (student.gender !== 'F') return false;
  if (!student.dateOfBirth) return false;
  
  const age = calculateAge(student.dateOfBirth);
  return age >= 10;
}

/**
 * Check if a user role can access menstrual health features
 */
export function canAccessMenstrualHealth(userRole: string): boolean {
  return ['ClassTeacher', 'Lady Superintendent', 'Admin'].includes(userRole);
}

/**
 * Check if a user role can mark menstruation as started
 * Only ClassTeacher can mark menstruation as started
 */
export function canMarkMenstruationStarted(userRole: string): boolean {
  return userRole === 'ClassTeacher';
}

/**
 * Check if a user role can view detailed menstrual tracking data
 * Lady Superintendent and Admin have full access
 */
export function canViewDetailedMenstrualData(userRole: string): boolean {
  return ['Lady Superintendent', 'Admin'].includes(userRole);
}

/**
 * Get validation message for menstrual tracking eligibility
 */
export function getMenstrualTrackingValidationMessage(student: Student): string | null {
  if (student.gender !== 'F') {
    return 'Menstrual cycle tracking is only available for female students';
  }
  
  if (!student.dateOfBirth) {
    return 'Date of birth is required to determine eligibility for menstrual tracking';
  }
  
  const age = calculateAge(student.dateOfBirth);
  if (age < 10) {
    return `Student must be at least 10 years old for menstrual tracking (current age: ${age} years)`;
  }
  
  return null; // No validation errors
}

/**
 * Check if menstruation has already been marked for a student
 */
export function isMenstruationAlreadyMarked(student: Student): boolean {
  return !!student.menstruationStartedAt;
}

/**
 * Format menstruation status for display
 */
export function formatMenstruationStatus(student: Student): string {
  if (!isEligibleForMenstrualTracking(student)) {
    return 'Not applicable';
  }
  
  if (isMenstruationAlreadyMarked(student)) {
    return 'Marked as started';
  }
  
  return 'Not yet marked';
}

/**
 * Get CSS classes for menstrual health UI elements based on eligibility
 */
export function getMenstrualHealthUIClasses(student: Student): {
  containerClass: string;
  labelClass: string;
  inputClass: string;
} {
  const isEligible = isEligibleForMenstrualTracking(student);
  
  return {
    containerClass: isEligible ? 'border-pink-300' : 'border-gray-300 opacity-50',
    labelClass: isEligible ? 'text-pink-700' : 'text-gray-500',
    inputClass: isEligible ? '' : 'cursor-not-allowed opacity-50'
  };
}
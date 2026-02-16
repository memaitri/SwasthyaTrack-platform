/**
 * Calculate the number of years a student has been in school
 * @param admissionDate - The date when student was admitted to school
 * @returns Number of years (with decimal precision) the student has been in school
 */
export function calculateYearsInSchool(admissionDate: string | Date): number {
  const admission = new Date(admissionDate);
  const today = new Date();
  
  // Calculate the difference in milliseconds
  const diffTime = today.getTime() - admission.getTime();
  
  // Convert to years (365.25 days per year to account for leap years)
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  // Round to 1 decimal place
  return Math.round(diffYears * 10) / 10;
}

/**
 * Format years in school for display
 * @param years - Number of years
 * @returns Formatted string like "2.5 years" or "1 year"
 */
export function formatYearsInSchool(years: number): string {
  if (years === 1) {
    return "1 year";
  } else if (years < 1) {
    const months = Math.round(years * 12);
    return months === 1 ? "1 month" : `${months} months`;
  } else {
    return `${years} years`;
  }
}

/**
 * Get a descriptive label for years in school
 * @param years - Number of years
 * @returns Descriptive label
 */
export function getSchoolTenureLabel(years: number): string {
  if (years < 0.5) return "New Student";
  if (years < 1) return "Recent Admission";
  if (years < 2) return "1st Year";
  if (years < 3) return "2nd Year";
  if (years < 4) return "3rd Year";
  if (years < 5) return "4th Year";
  if (years < 6) return "5th Year";
  return "Senior Student";
}

/**
 * Get all available class sections
 * Classes 1-10 have A and B sections
 * Classes 11-12 have Science and Commerce streams with A and B sections
 */
export function getClassOptions(): string[] {
  const classes: string[] = [];
  
  // Classes 1-10 with A and B sections
  for (let i = 1; i <= 10; i++) {
    classes.push(`${i}A`);
    classes.push(`${i}B`);
  }
  
  // Class 11 and 12 with Science and Commerce streams
  classes.push('11A-Science');
  classes.push('11B-Science');
  classes.push('11A-Commerce');
  classes.push('11B-Commerce');
  classes.push('12A-Science');
  classes.push('12B-Science');
  classes.push('12A-Commerce');
  classes.push('12B-Commerce');
  
  return classes;
}

/**
 * Parse class section to extract class number, section, and stream
 */
export function parseClassSection(classSection: string): {
  classNumber: number;
  section: string;
  stream?: string;
} {
  const match = classSection.match(/^(\d+)([AB])?(?:-(\w+))?$/i);
  if (!match) {
    return { classNumber: 0, section: '' };
  }
  
  return {
    classNumber: parseInt(match[1]),
    section: match[2] || '',
    stream: match[3] || undefined,
  };
}
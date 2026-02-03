/**
 * Date utilities for SwasthyaTrack platform
 * Provides dynamic year generation and date formatting functions
 */

/**
 * Generate dynamic year options for filters
 * @param startYear - Starting year (default: 2020)
 * @param futureYears - Number of future years to include (default: 5)
 * @returns Array of year objects with value and label
 */
export function generateYearOptions(startYear: number = 2020, futureYears: number = 5) {
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + futureYears;
  const years = [];
  
  for (let year = startYear; year <= endYear; year++) {
    years.push({
      value: year.toString(),
      label: year.toString(),
      isCurrent: year === currentYear
    });
  }
  
  return years.reverse(); // Most recent first
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/**
 * Generate month options
 */
export function generateMonthOptions() {
  return [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Check if a year is valid for the platform
 */
export function isValidYear(year: number): boolean {
  const currentYear = getCurrentYear();
  return year >= 2020 && year <= currentYear + 10;
}

/**
 * Check if a month is valid
 */
export function isValidMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}
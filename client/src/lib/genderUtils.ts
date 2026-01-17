/**
 * Utility functions for gender display and formatting
 */

export type Gender = 'M' | 'F' | 'O';

/**
 * Convert gender code to display label
 */
export function formatGenderDisplay(gender: Gender | string | null | undefined): string {
  if (!gender) return 'Not specified';
  
  switch (gender.toString().toUpperCase()) {
    case 'M':
      return 'Male';
    case 'F':
      return 'Female';
    case 'O':
      return 'Other';
    default:
      return 'Not specified';
  }
}

/**
 * Get gender icon for display
 */
export function getGenderIcon(gender: Gender | string | null | undefined): string {
  if (!gender) return '👤';
  
  switch (gender.toString().toUpperCase()) {
    case 'M':
      return '👨';
    case 'F':
      return '👩';
    case 'O':
      return '👤';
    default:
      return '👤';
  }
}

/**
 * Get gender color class for styling
 */
export function getGenderColorClass(gender: Gender | string | null | undefined): string {
  if (!gender) return 'text-gray-500';
  
  switch (gender.toString().toUpperCase()) {
    case 'M':
      return 'text-blue-600';
    case 'F':
      return 'text-pink-600';
    case 'O':
      return 'text-purple-600';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get gender badge variant for UI components
 */
export function getGenderBadgeVariant(gender: Gender | string | null | undefined): 'default' | 'secondary' | 'outline' {
  if (!gender) return 'outline';
  
  switch (gender.toString().toUpperCase()) {
    case 'M':
      return 'default';
    case 'F':
      return 'secondary';
    case 'O':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Format gender for display with icon and label
 */
export function formatGenderWithIcon(gender: Gender | string | null | undefined): {
  icon: string;
  label: string;
  colorClass: string;
} {
  return {
    icon: getGenderIcon(gender),
    label: formatGenderDisplay(gender),
    colorClass: getGenderColorClass(gender),
  };
}
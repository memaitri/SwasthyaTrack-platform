/**
 * Standardized referral facility options
 * These are used throughout the application for consistency and to avoid case sensitivity issues in analysis
 */

export const REFERRAL_FACILITIES = {
  // Primary Healthcare
  "PHC/CHC": "PHC/CHC",
  "Primary Health Center": "Primary Health Center",
  "Community Health Center": "Community Health Center",
  
  // Hospital
  "District Hospital": "District Hospital",
  "Medical College Hospital": "Medical College Hospital",
  "Government Hospital": "Government Hospital",
  
  // Specialized Centers
  "DEIC": "DEIC", // Disability Evaluation and Certification
  "DOTS Centre": "DOTS Centre",
  "Leprosy Clinic": "Leprosy Clinic",
  "Leprosy Specialist Clinic": "Leprosy Specialist Clinic",
  "TB Clinic": "TB Clinic",
  "TB Specialist": "TB Specialist",
  "Eye Care Center": "Eye Care Center",
  "Dental Clinic": "Dental Clinic",
  "Orthopedic Center": "Orthopedic Center",
  "ENT Clinic": "ENT Clinic",
  "Cardiology Center": "Cardiology Center",
  "Neurology Center": "Neurology Center",
  "Pediatric Center": "Pediatric Center",
  "Developmental Center": "Developmental Center",
  "Psychology/Counseling Center": "Psychology/Counseling Center",
  "Psychiatry Center": "Psychiatry Center",
  "Nutrition Clinic": "Nutrition Clinic",
  
  // Rehabilitation
  "Rehabilitation Center": "Rehabilitation Center",
  "Physiotherapy Center": "Physiotherapy Center",
  
  // Special
  "Private Clinic": "Private Clinic",
  "Medical Camp": "Medical Camp",
} as const;

export type ReferralFacility = keyof typeof REFERRAL_FACILITIES;

export const REFERRAL_FACILITY_OPTIONS = Object.keys(REFERRAL_FACILITIES) as ReferralFacility[];

// Default referral facilities by disease/condition
export const DEFAULT_REFERRAL_FACILITIES = {
  leprosy: ["PHC/CHC", "District Hospital", "DEIC", "Leprosy Specialist Clinic"],
  tuberculosis: ["PHC/CHC", "DOTS Centre", "District Hospital", "TB Specialist"],
  deficiency: ["PHC/CHC", "District Hospital", "Nutrition Clinic"],
  disease: ["PHC/CHC", "District Hospital", "Eye Care Center", "Dental Clinic", "ENT Clinic", "Cardiology Center"],
  developmental: ["DEIC", "Developmental Center", "Rehabilitation Center", "Physiotherapy Center"],
  adolescent: ["PHC/CHC", "Psychology/Counseling Center", "Psychiatry Center", "District Hospital"],
} as const;

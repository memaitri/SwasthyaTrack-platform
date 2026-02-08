/**
 * Critical Students Identification Service
 * 
 * Evaluates students against predefined health and wellness thresholds
 * to identify those requiring immediate attention.
 */

import { db } from "./db.js";
import { students, schools, annualHealthCards, monthlyCheckups, mealLogs, hostelAttendance } from "../shared/schema.js";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

// Threshold definitions for critical student identification
export const CRITICAL_THRESHOLDS = {
  // BMI thresholds (WHO standards for children/adolescents)
  BMI_SEVERELY_UNDERWEIGHT: 13.5,
  BMI_UNDERWEIGHT: 16.0,
  BMI_OVERWEIGHT: 25.0,
  BMI_OBESE: 30.0,
  
  // Nutrition thresholds (daily requirements)
  MIN_DAILY_CALORIES: 1500,
  MIN_DAILY_PROTEIN: 40, // grams
  
  // Attendance threshold
  MIN_ATTENDANCE_PERCENT: 75,
  ATTENDANCE_EVALUATION_DAYS: 30,
  
  // Health flags
  SEVERE_ANEMIA: true,
  REFERRAL_PENDING_DAYS: 14,
} as const;

export interface CriticalReason {
  category: 'health' | 'nutrition' | 'attendance' | 'medical';
  severity: 'high' | 'medium' | 'low';
  description: string;
  value?: string | number;
  threshold?: string | number;
}

export interface CriticalStudent {
  studentId: string;
  studentName: string;
  schoolId: string;
  schoolName: string;
  classSection: string;
  gender: string;
  age?: number;
  isCritical: boolean;
  reasons: CriticalReason[];
  lastUpdated: Date;
  priorityScore: number; // 0-100, higher = more critical
}

/**
 * Calculate student age from date of birth
 */
function calculateAge(dateOfBirth: Date | string | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Evaluate a single student for critical status
 */
export async function evaluateStudent(studentId: string): Promise<CriticalStudent | null> {
  // Fetch student basic info
  const studentData = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      schoolId: students.schoolId,
      classSection: students.classSection,
      gender: students.gender,
      dateOfBirth: students.dateOfBirth,
    })
    .from(students)
    .where(and(
      eq(students.id, studentId),
      eq(students.isActive, true)
    ))
    .limit(1);

  if (studentData.length === 0) return null;

  const student = studentData[0];
  const reasons: CriticalReason[] = [];
  let priorityScore = 0;

  // Get school name
  const schoolInfo = await db.query.schools.findFirst({
    where: (schools, { eq }) => eq(schools.id, student.schoolId),
    columns: { name: true },
  });

  // 1. Check health metrics from latest annual health card
  const latestHealthCard = await db
    .select()
    .from(annualHealthCards)
    .where(eq(annualHealthCards.studentId, studentId))
    .orderBy(desc(annualHealthCards.year))
    .limit(1);

  if (latestHealthCard.length > 0) {
    const card = latestHealthCard[0];
    const bmi = card.bmi ? parseFloat(card.bmi.toString()) : null;

    // BMI evaluation
    if (bmi !== null) {
      if (bmi < CRITICAL_THRESHOLDS.BMI_SEVERELY_UNDERWEIGHT) {
        reasons.push({
          category: 'health',
          severity: 'high',
          description: 'Severely Underweight',
          value: bmi.toFixed(1),
          threshold: CRITICAL_THRESHOLDS.BMI_SEVERELY_UNDERWEIGHT,
        });
        priorityScore += 30;
      } else if (bmi < CRITICAL_THRESHOLDS.BMI_UNDERWEIGHT) {
        reasons.push({
          category: 'health',
          severity: 'medium',
          description: 'Underweight',
          value: bmi.toFixed(1),
          threshold: CRITICAL_THRESHOLDS.BMI_UNDERWEIGHT,
        });
        priorityScore += 20;
      } else if (bmi >= CRITICAL_THRESHOLDS.BMI_OBESE) {
        reasons.push({
          category: 'health',
          severity: 'high',
          description: 'Obese',
          value: bmi.toFixed(1),
          threshold: CRITICAL_THRESHOLDS.BMI_OBESE,
        });
        priorityScore += 25;
      } else if (bmi >= CRITICAL_THRESHOLDS.BMI_OVERWEIGHT) {
        reasons.push({
          category: 'health',
          severity: 'medium',
          description: 'Overweight',
          value: bmi.toFixed(1),
          threshold: CRITICAL_THRESHOLDS.BMI_OVERWEIGHT,
        });
        priorityScore += 15;
      }
    }

    // Severe anemia check
    if (card.b3_severe_anemia) {
      reasons.push({
        category: 'medical',
        severity: 'high',
        description: 'Severe Anemia Detected',
      });
      priorityScore += 35;
    }

    // Critical disease flags
    if (card.c7_suspected) {
      reasons.push({
        category: 'medical',
        severity: 'high',
        description: 'Leprosy Suspected',
      });
      priorityScore += 40;
    }

    if (card.c8_suspected) {
      reasons.push({
        category: 'medical',
        severity: 'high',
        description: 'Tuberculosis Suspected',
      });
      priorityScore += 40;
    }

    if (card.c9_suspected) {
      reasons.push({
        category: 'medical',
        severity: 'high',
        description: 'Sickle Cell Anemia Suspected',
      });
      priorityScore += 35;
    }

    // Vitamin deficiencies
    if (card.b4_vitamin_a_deficiency) {
      reasons.push({
        category: 'health',
        severity: 'medium',
        description: 'Vitamin A Deficiency',
      });
      priorityScore += 15;
    }

    if (card.b5_vitamin_d_deficiency) {
      reasons.push({
        category: 'health',
        severity: 'medium',
        description: 'Vitamin D Deficiency',
      });
      priorityScore += 15;
    }

    // Pending referrals
    if (card.referral_recommended) {
      const daysSinceVisit = card.date_of_visit 
        ? Math.floor((Date.now() - new Date(card.date_of_visit).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (daysSinceVisit > CRITICAL_THRESHOLDS.REFERRAL_PENDING_DAYS) {
        reasons.push({
          category: 'medical',
          severity: 'high',
          description: 'Overdue Referral',
          value: `${daysSinceVisit} days`,
          threshold: CRITICAL_THRESHOLDS.REFERRAL_PENDING_DAYS,
        });
        priorityScore += 30;
      }
    }
  }

  // 2. Check nutrition from recent meal logs (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const recentMeals = await db
    .select({
      totalCalories: mealLogs.totalCalories,
      totalProtein: mealLogs.totalProtein,
      date: mealLogs.date,
    })
    .from(mealLogs)
    .where(and(
      eq(mealLogs.studentId, studentId),
      sql`${mealLogs.date} >= ${sevenDaysAgoStr}`
    ));

  if (recentMeals.length > 0) {
    // Calculate average daily nutrition
    const avgCalories = recentMeals.reduce((sum, meal) => 
      sum + (meal.totalCalories ? parseFloat(meal.totalCalories.toString()) : 0), 0
    ) / recentMeals.length;

    const avgProtein = recentMeals.reduce((sum, meal) => 
      sum + (meal.totalProtein ? parseFloat(meal.totalProtein.toString()) : 0), 0
    ) / recentMeals.length;

    if (avgCalories < CRITICAL_THRESHOLDS.MIN_DAILY_CALORIES) {
      reasons.push({
        category: 'nutrition',
        severity: 'high',
        description: 'Low Calorie Intake',
        value: Math.round(avgCalories),
        threshold: CRITICAL_THRESHOLDS.MIN_DAILY_CALORIES,
      });
      priorityScore += 25;
    }

    if (avgProtein < CRITICAL_THRESHOLDS.MIN_DAILY_PROTEIN) {
      reasons.push({
        category: 'nutrition',
        severity: 'medium',
        description: 'Low Protein Intake',
        value: `${avgProtein.toFixed(1)}g`,
        threshold: `${CRITICAL_THRESHOLDS.MIN_DAILY_PROTEIN}g`,
      });
      priorityScore += 20;
    }

    // Check for irregular meal intake (missing meals)
    const uniqueDays = new Set(recentMeals.map(m => m.date)).size;
    if (uniqueDays < 5) { // Less than 5 days of meals in last 7 days
      reasons.push({
        category: 'nutrition',
        severity: 'medium',
        description: 'Irregular Meal Intake',
        value: `${uniqueDays} days`,
        threshold: '5 days',
      });
      priorityScore += 15;
    }
  } else {
    // No meal data available
    reasons.push({
      category: 'nutrition',
      severity: 'low',
      description: 'No Recent Meal Data',
    });
    priorityScore += 10;
  }

  // 3. Check attendance (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - CRITICAL_THRESHOLDS.ATTENDANCE_EVALUATION_DAYS);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const attendanceRecords = await db
    .select({
      date: hostelAttendance.date,
      status: hostelAttendance.status,
      isVacation: hostelAttendance.isVacation,
    })
    .from(hostelAttendance)
    .where(and(
      eq(hostelAttendance.studentId, studentId),
      sql`${hostelAttendance.date} >= ${thirtyDaysAgoStr}`
    ));

  if (attendanceRecords.length > 0) {
    const presentDays = attendanceRecords.filter(r => 
      r.status === 'Present' || r.isVacation
    ).length;
    const attendancePercent = (presentDays / attendanceRecords.length) * 100;

    if (attendancePercent < CRITICAL_THRESHOLDS.MIN_ATTENDANCE_PERCENT) {
      reasons.push({
        category: 'attendance',
        severity: 'high',
        description: 'Poor Attendance',
        value: `${attendancePercent.toFixed(1)}%`,
        threshold: `${CRITICAL_THRESHOLDS.MIN_ATTENDANCE_PERCENT}%`,
      });
      priorityScore += 25;
    }
  }

  // 4. Check recent monthly checkups for flags
  const recentCheckup = await db
    .select()
    .from(monthlyCheckups)
    .where(eq(monthlyCheckups.studentId, studentId))
    .orderBy(desc(monthlyCheckups.checkupDate))
    .limit(1);

  if (recentCheckup.length > 0) {
    const checkup = recentCheckup[0];
    
    if (checkup.treatmentType === 'Referred' && checkup.referredTo) {
      reasons.push({
        category: 'medical',
        severity: 'medium',
        description: 'Recent Referral Required',
        value: checkup.referredTo,
      });
      priorityScore += 20;
    }
  }

  const age = calculateAge(student.dateOfBirth);
  const isCritical = reasons.length > 0;

  return {
    studentId: student.id,
    studentName: student.fullName,
    schoolId: student.schoolId,
    schoolName: schoolInfo?.name || 'Unknown School',
    classSection: student.classSection,
    gender: student.gender,
    age,
    isCritical,
    reasons,
    lastUpdated: new Date(),
    priorityScore: Math.min(priorityScore, 100), // Cap at 100
  };
}

/**
 * Get all critical students for a district (PO view)
 */
export async function getCriticalStudentsForDistrict(
  district: string,
  options?: {
    schoolType?: 'Government' | 'Aided' | 'All';
    minPriorityScore?: number;
    limit?: number;
  }
): Promise<CriticalStudent[]> {
  const { schoolType = 'All', minPriorityScore = 0, limit = 100 } = options || {};

  console.log(`[CriticalStudents] Fetching for district: "${district}", schoolType: ${schoolType}`);

  // Handle null or empty district
  if (!district || district.trim() === '') {
    console.warn('[CriticalStudents] No district provided, returning empty array');
    return [];
  }

  // Normalize schoolType - handle "all", "All", "ALL" etc.
  const schoolTypeStr = String(schoolType || 'All');
  const normalizedSchoolType = schoolTypeStr.toLowerCase() === 'all' 
    ? 'All' 
    : schoolType;

  console.log(`[CriticalStudents] Normalized schoolType: "${normalizedSchoolType}"`);

  // Get all schools in district (case-insensitive match)
  const schoolsInDistrict = await db
    .select({ id: schools.id, name: schools.name, district: schools.district })
    .from(schools)
    .where(
      and(
        sql`LOWER(${schools.district}) = LOWER(${district})`,
        eq(schools.isActive, true),
        normalizedSchoolType !== 'All' 
          ? eq(schools.schoolType, normalizedSchoolType as any)
          : undefined
      )
    );

  console.log(`[CriticalStudents] Found ${schoolsInDistrict.length} schools in district "${district}"`);
  
  if (schoolsInDistrict.length === 0) {
    console.warn(`[CriticalStudents] No schools found for district: "${district}", schoolType: "${normalizedSchoolType}"`);
    
    // Try to find similar districts
    const allDistricts = await db
      .select({ district: schools.district })
      .from(schools)
      .where(eq(schools.isActive, true))
      .groupBy(schools.district);
    
    console.log('[CriticalStudents] Available districts:', allDistricts.map(d => d.district).join(', '));
    
    return [];
  }

  const schoolIds = schoolsInDistrict.map(s => s.id);

  // Get all active students in these schools
  const studentsInDistrict = await db
    .select({ id: students.id, fullName: students.fullName })
    .from(students)
    .where(and(
      inArray(students.schoolId, schoolIds),
      eq(students.isActive, true)
    ))
    .limit(limit * 2); // Get more than needed to filter

  console.log(`[CriticalStudents] Found ${studentsInDistrict.length} students to evaluate`);

  // Evaluate each student
  const criticalStudents: CriticalStudent[] = [];
  let evaluatedCount = 0;
  
  for (const student of studentsInDistrict) {
    try {
      const evaluation = await evaluateStudent(student.id);
      evaluatedCount++;
      
      if (evaluation && evaluation.isCritical && evaluation.priorityScore >= minPriorityScore) {
        criticalStudents.push(evaluation);
        console.log(`[CriticalStudents] ✓ ${student.fullName}: Priority ${evaluation.priorityScore}, Reasons: ${evaluation.reasons.length}`);
      }
    } catch (error) {
      console.error(`[CriticalStudents] Error evaluating student ${student.id}:`, error);
    }
  }

  console.log(`[CriticalStudents] Evaluated ${evaluatedCount} students, found ${criticalStudents.length} critical`);

  // Sort by priority score (highest first) and limit
  return criticalStudents
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

/**
 * Get critical students for a specific school
 */
export async function getCriticalStudentsForSchool(
  schoolId: string,
  options?: {
    minPriorityScore?: number;
  }
): Promise<CriticalStudent[]> {
  const { minPriorityScore = 0 } = options || {};

  // Get all active students in school
  const studentsInSchool = await db
    .select({ id: students.id })
    .from(students)
    .where(and(
      eq(students.schoolId, schoolId),
      eq(students.isActive, true)
    ));

  // Evaluate each student
  const criticalStudents: CriticalStudent[] = [];
  
  for (const student of studentsInSchool) {
    const evaluation = await evaluateStudent(student.id);
    if (evaluation && evaluation.isCritical && evaluation.priorityScore >= minPriorityScore) {
      criticalStudents.push(evaluation);
    }
  }

  // Sort by priority score (highest first)
  return criticalStudents.sort((a, b) => b.priorityScore - a.priorityScore);
}

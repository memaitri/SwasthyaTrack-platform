import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, boolean, timestamp, decimal, json, date, unique, mysqlEnum } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = ["PO", "Headmaster", "ClassTeacher", "MedicalTeam", "Admin", "HostelWarden", "MealSuperintendent", "Lady Superintendent"] as const;
export type Role = typeof roleEnum[number];

export const genderEnum = ["M", "F", "O"] as const;
export type Gender = typeof genderEnum[number];

export const statusEnum = ["Pending", "Approved", "Rejected", "Completed"] as const;
export type Status = typeof statusEnum[number];

export const treatmentTypeEnum = ["Primary", "Referred"] as const;
export type TreatmentType = typeof treatmentTypeEnum[number];

export const mealTypeEnum = ["breakfast", "lunch", "dinner"] as const;
export type MealType = typeof mealTypeEnum[number];

export const notificationTypeEnum = ["system", "manual", "health_alert", "meal_alert"] as const;
export type NotificationType = typeof notificationTypeEnum[number];

export const flowCategoryEnum = ["none", "spotting", "light", "medium", "heavy"] as const;
export type FlowCategory = typeof flowCategoryEnum[number];

export const schoolTypeEnum = ["Government", "Aided"] as const;
export type SchoolType = typeof schoolTypeEnum[number];

export const academicStatusEnum = ["Active", "Promoted", "Demoted", "Detained"] as const;
export type AcademicStatus = typeof academicStatusEnum[number];

export const academicActionEnum = ["Promote", "Demote", "Detain"] as const;
export type AcademicAction = typeof academicActionEnum[number];

export const medicalTeamRoleEnum = ["Doctor", "Pharmacist", "Nurse", "Technician", "Other"] as const;
export type MedicalTeamRole = typeof medicalTeamRoleEnum[number];

export const checkupStatusEnum = ["Not started", "In progress", "Completed"] as const;
export type CheckupStatus = typeof checkupStatusEnum[number];

export const referralStatusEnum = ["Pending", "In Progress", "Completed", "Overdue", "Rejected"] as const;
export type ReferralStatus = typeof referralStatusEnum[number];

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().$type<Role>(),
  schoolId: varchar("school_id", { length: 36 }),
  classSection: text("class_section"),
  region: text("region"),
  district: text("district"),
  block: text("block"),
  isActive: boolean("is_active").default(true),
  isBlocked: boolean("is_blocked").default(false),
  blockedBy: varchar("blocked_by", { length: 36 }),
  blockedAt: timestamp("blocked_at"),
  blockReason: text("block_reason"),
  approvalStatus: text("approval_status").notNull().$type<Status>().default("Approved"),
  approverId: varchar("approver_id", { length: 36 }),
  approverNote: text("approver_note"),
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schools = mysqlTable("schools", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  code: varchar("code", { length: 100 }).unique(),
  schoolType: text("school_type").notNull().$type<SchoolType>(),
  region: text("region").notNull(),
  district: text("district").notNull(),
  block: text("block").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  headmasterId: varchar("headmaster_id", { length: 36 }),
  totalStudents: int("total_students").default(0),
  isActive: boolean("is_active").default(true),
  approvalStatus: text("approval_status").default("Pending"),
  approverId: varchar("approver_id", { length: 36 }),
  approverNote: text("approver_note"),
  requestedByEmail: text("requested_by_email"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const students = mysqlTable("students", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  uniqueId: varchar("unique_id", { length: 255 }).notNull().unique(),
  aadhaarNo: text("aadhaar_no"),
  pranNo: text("pran_no"),
  fullName: text("full_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender").notNull().$type<Gender>(),
  classSection: text("class_section").notNull(),
  fatherGuardianName: text("father_guardian_name"),
  fatherContact: text("father_contact"),
  motherName: text("mother_name"),
  motherContact: text("mother_contact"),
  address: text("address"),
  enrollmentDate: date("enrollment_date"),
  schoolAdmissionDate: date("school_admission_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  menstruationStartedAt: timestamp("menstruation_started_at"),
  menstruationMarkedBy: varchar("menstruation_marked_by", { length: 36 }),
  academicStatus: text("academic_status").notNull().$type<AcademicStatus>().default("Active"),
  academicYear: int("academic_year").default(sql`(YEAR(CURDATE()))`),
  previousClassSection: text("previous_class_section"),
});

export const annualHealthCards = mysqlTable("annual_health_cards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  year: int("year").notNull(),
  district: text("district"),
  block: text("block"),
  schoolName: text("school_name"),
  schoolId: varchar("school_id", { length: 36 }),
  mobileHealthTeamId: text("mobile_health_team_id"),
  nameOfChild: text("name_of_child"),
  ageYears: int("age_years"),
  ageMonths: int("age_months"),
  gender: text("gender").$type<Gender>(),
  classSection: text("class_section"),
  aadhaarNo: text("aadhaar_no"),
  pranNo: text("pran_no"),
  uniqueId: text("unique_id"),
  fatherGuardianName: text("father_guardian_name"),
  fatherContact: text("father_contact"),
  motherName: text("mother_name"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  bloodPressure: text("blood_pressure"),
  bpCategory: text("bp_category"),
  sbp: int("sbp"),
  dbp: int("dbp"),
  visionRight: text("vision_right"),
  visionLeft: text("vision_left"),
  visualAcuitySnellen: text("visual_acuity_snellen"),
  visualAcuityNotes: text("visual_acuity_notes"),
  defectAtBirth: boolean("defect_at_birth").default(false),
  defectsAtBirth: json("defects_at_birth").$type<string[]>().default([]),
  /* Section A */
  a1_visible_defect: boolean("a1_visible_defect").default(false),
  a1_visible_defect_notes: text("a1_visible_defect_notes"),
  a1_referral_facility: text("a1_referral_facility"),
  a1_referral_date: date("a1_referral_date"),
  summary_defects_neural_tube: boolean("summary_defects_neural_tube").default(false),
  summary_defects_down_syndrome: boolean("summary_defects_down_syndrome").default(false),
  summary_defects_cleft: boolean("summary_defects_cleft").default(false),
  summary_defects_talipes: boolean("summary_defects_talipes").default(false),
  summary_defects_hip_dysplasia: boolean("summary_defects_hip_dysplasia").default(false),
  summary_defects_congenital_deafness: boolean("summary_defects_congenital_deafness").default(false),
  summary_defects_other: text("summary_defects_other"),
  /* Section B */
  deficiencySam: boolean("deficiency_sam").default(false),
  deficiencyOedema: boolean("deficiency_oedema").default(false),
  deficiencyAnemia: boolean("deficiency_anemia").default(false),
  deficiencyVitaminA: boolean("deficiency_vitamin_a").default(false),
  deficiencyVitaminD: boolean("deficiency_vitamin_d").default(false),
  deficiencyGoitre: boolean("deficiency_goitre").default(false),
  deficiencyObesity: boolean("deficiency_obesity").default(false),
  deficiencyVitaminB: boolean("deficiency_vitamin_b").default(false),
  deficiencies: json("deficiencies").$type<string[]>().default([]),
  b1_severe_thinning: boolean("b1_severe_thinning").default(false),
  b1_counsel_moderate: boolean("b1_counsel_moderate").default(false),
  b1_referral_facility: text("b1_referral_facility"),
  b1_referral_date: date("b1_referral_date"),
  b2_bilateral_oedema: boolean("b2_bilateral_oedema").default(false),
  b2_referral_facility: text("b2_referral_facility"),
  b2_referral_date: date("b2_referral_date"),
  b3_severe_anemia: boolean("b3_severe_anemia").default(false),
  b3_referral_facility: text("b3_referral_facility"),
  b3_referral_date: date("b3_referral_date"),
  b4_vitamin_a_deficiency: boolean("b4_vitamin_a_deficiency").default(false),
  b4_night_blindness: boolean("b4_night_blindness").default(false),
  b4_bitots_spots: boolean("b4_bitots_spots").default(false),
  b4_referral_facility: text("b4_referral_facility"),
  b4_referral_date: date("b4_referral_date"),
  b5_vitamin_d_deficiency: boolean("b5_vitamin_d_deficiency").default(false),
  b5_wrist_widening: boolean("b5_wrist_widening").default(false),
  b5_bowing_legs: boolean("b5_bowing_legs").default(false),
  b5_referral_facility: text("b5_referral_facility"),
  b5_referral_date: date("b5_referral_date"),
  b6_goitre: boolean("b6_goitre").default(false),
  b6_referral_facility: text("b6_referral_facility"),
  b6_referral_date: date("b6_referral_date"),
  b7_obesity: boolean("b7_obesity").default(false),
  b7_referral_facility: text("b7_referral_facility"),
  b7_referral_date: date("b7_referral_date"),
  b8_vitb_deficiency: boolean("b8_vitb_deficiency").default(false),
  b8_angular_stomatitis: boolean("b8_angular_stomatitis").default(false),
  b8_raw_tongue: boolean("b8_raw_tongue").default(false),
  b8_corneal_vascularization: boolean("b8_corneal_vascularization").default(false),
  b8_referral_facility: text("b8_referral_facility"),
  b8_referral_date: date("b8_referral_date"),
  summary_deficiency_anemia: boolean("summary_deficiency_anemia").default(false),
  summary_deficiency_vitamin_a: boolean("summary_deficiency_vitamin_a").default(false),
  summary_deficiency_vitamin_d: boolean("summary_deficiency_vitamin_d").default(false),
  summary_deficiency_sam_stunting: boolean("summary_deficiency_sam_stunting").default(false),
  summary_deficiency_goitre: boolean("summary_deficiency_goitre").default(false),
  summary_deficiency_vitamin_b: boolean("summary_deficiency_vitamin_b").default(false),
  summary_deficiency_other: text("summary_deficiency_other"),
  /* Section C */
  c1_convulsive: boolean("c1_convulsive").default(false),
  c1_referral_facility: text("c1_referral_facility"),
  c1_referral_date: date("c1_referral_date"),
  c2_otitis_media: boolean("c2_otitis_media").default(false),
  c2_assess_hearing: boolean("c2_assess_hearing").default(false),
  c2_referral_facility: text("c2_referral_facility"),
  c2_referral_date: date("c2_referral_date"),
  c3_dental: boolean("c3_dental").default(false),
  c3_white_discoloration: boolean("c3_white_discoloration").default(false),
  c3_brown_discoloration: boolean("c3_brown_discoloration").default(false),
  c3_gum_swelling: boolean("c3_gum_swelling").default(false),
  c3_plaque: boolean("c3_plaque").default(false),
  c3_referral_facility: text("c3_referral_facility"),
  c3_referral_date: date("c3_referral_date"),
  c4_skin_conditions: boolean("c4_skin_conditions").default(false),
  c4_itching: boolean("c4_itching").default(false),
  c4_scaly_lesions: boolean("c4_scaly_lesions").default(false),
  c4_round_lesions: boolean("c4_round_lesions").default(false),
  c4_referral_facility: text("c4_referral_facility"),
  c4_referral_date: date("c4_referral_date"),
  c5_asthma: boolean("c5_asthma").default(false),
  c5_breathlessness: boolean("c5_breathlessness").default(false),
  c5_wheezing: boolean("c5_wheezing").default(false),
  c5_referral_facility: text("c5_referral_facility"),
  c5_referral_date: date("c5_referral_date"),
  c6_rheumatic_heart: boolean("c6_rheumatic_heart").default(false),
  c6_murmur: boolean("c6_murmur").default(false),
  c6_referral_facility: text("c6_referral_facility"),
  c6_referral_date: date("c6_referral_date"),
  c7_suspected: boolean("c7_suspected").default(false),
  c7_skin_lesion_present: boolean("c7_skin_lesion_present").default(false),
  c7_hypopigmented_reddish_lesion: boolean("c7_hypopigmented_reddish_lesion").default(false),
  c7_lesion_sensory_deficit: boolean("c7_lesion_sensory_deficit").default(false),
  c7_skin_characteristics: json("c7_skin_characteristics").$type<Record<string, boolean>>().default({}),
  c7_num_lesions: text("c7_num_lesions"),
  c7_lesion_type: json("c7_lesion_type").$type<Record<string, boolean>>().default({}),
  c7_nerves_involved: json("c7_nerves_involved").$type<Record<string, boolean>>().default({}),
  c7_nerve_signs: json("c7_nerve_signs").$type<Record<string, boolean>>().default({}),
  c7_contractures_deformities: json("c7_contractures_deformities").$type<Record<string, boolean>>().default({}),
  c7_referral_facility: text("c7_referral_facility"),
  c7_referral_date: date("c7_referral_date"),
  c8_suspected: boolean("c8_suspected").default(false),
  c8_cough_gt14_days: boolean("c8_cough_gt14_days").default(false),
  c8_cough_antibiotics_failed: boolean("c8_cough_antibiotics_failed").default(false),
  c8_cough_with_bronchodilators_failed: boolean("c8_cough_with_bronchodilators_failed").default(false),
  c8_persistent_fever: boolean("c8_persistent_fever").default(false),
  c8_fever_temperature: decimal("c8_fever_temperature", { precision: 4, scale: 1 }),
  c8_fever_duration_weeks: int("c8_fever_duration_weeks"),
  c8_reduced_playfulness: boolean("c8_reduced_playfulness").default(false),
  c8_reduced_daily_activity: boolean("c8_reduced_daily_activity").default(false),
  c8_reduced_appetite: boolean("c8_reduced_appetite").default(false),
  c8_reduced_interaction: boolean("c8_reduced_interaction").default(false),
  c8_reduction_duration_days: int("c8_reduction_duration_days"),
  c8_recent_headache_irritability: boolean("c8_recent_headache_irritability").default(false),
  c8_altered_behavior: boolean("c8_altered_behavior").default(false),
  c8_altered_behavior_duration_days: int("c8_altered_behavior_duration_days"),
  c8_weight_loss_gt5_percent: boolean("c8_weight_loss_gt5_percent").default(false),
  c8_weight_loss_not_responding_deworming: boolean("c8_weight_loss_not_responding_deworming").default(false),
  c8_weight_loss_not_responding_micronutrient: boolean("c8_weight_loss_not_responding_micronutrient").default(false),
  c8_weight_loss_not_responding_nutrition: boolean("c8_weight_loss_not_responding_nutrition").default(false),
  c8_close_contact_known_tb: boolean("c8_close_contact_known_tb").default(false),
  c8_contact_relation: text("c8_contact_relation"),
  c8_measles_varicella_3mo: boolean("c8_measles_varicella_3mo").default(false),
  c8_steroids_chemotherapy_1mo: boolean("c8_steroids_chemotherapy_1mo").default(false),
  c8_abdominal_pain_dull_aching: boolean("c8_abdominal_pain_dull_aching").default(false),
  c8_abdominal_swelling: boolean("c8_abdominal_swelling").default(false),
  c8_painless_abdominal_mass: boolean("c8_painless_abdominal_mass").default(false),
  c8_hepatomegaly: boolean("c8_hepatomegaly").default(false),
  c8_splenomegaly: boolean("c8_splenomegaly").default(false),
  c8_lymph_node_swelling_painless: boolean("c8_lymph_node_swelling_painless").default(false),
  c8_lymph_node_not_responding_antibiotics: boolean("c8_lymph_node_not_responding_antibiotics").default(false),
  c8_lymph_node_characteristics: json("c8_lymph_node_characteristics").$type<Record<string, boolean>>().default({}),
  c8_spine_pain_stiffness: boolean("c8_spine_pain_stiffness").default(false),
  c8_spinal_deformity: boolean("c8_spinal_deformity").default(false),
  c8_cold_abscess: boolean("c8_cold_abscess").default(false),
  c8_night_cries_typical: boolean("c8_night_cries_typical").default(false),
  c8_kyphotic_deformity: boolean("c8_kyphotic_deformity").default(false),
  c8_altered_consciousness: boolean("c8_altered_consciousness").default(false),
  c8_convulsions_no_fever: boolean("c8_convulsions_no_fever").default(false),
  c8_vomiting_no_diarrhea: boolean("c8_vomiting_no_diarrhea").default(false),
  c8_focal_neuro_deficit: boolean("c8_focal_neuro_deficit").default(false),
  c8_abnormal_movements: boolean("c8_abnormal_movements").default(false),
  c8_cranial_nerve_palsy: boolean("c8_cranial_nerve_palsy").default(false),
  c8_neck_stiffness_rigidity: boolean("c8_neck_stiffness_rigidity").default(false),
  c8_respiratory_distress: boolean("c8_respiratory_distress").default(false),
  c8_difficulty_breathing: boolean("c8_difficulty_breathing").default(false),
  c8_persistent_cough_2weeks: boolean("c8_persistent_cough_2weeks").default(false),
  c8_increased_respiratory_rate: boolean("c8_increased_respiratory_rate").default(false),
  c8_difficult_pneumonia: boolean("c8_difficult_pneumonia").default(false),
  c8_limping_recent_onset: boolean("c8_limping_recent_onset").default(false),
  c8_joint_pain_swelling: boolean("c8_joint_pain_swelling").default(false),
  c8_bone_joint_night_cry: boolean("c8_bone_joint_night_cry").default(false),
  c8_referral_facility: text("c8_referral_facility"),
  c8_referral_date: date("c8_referral_date"),
  c9_suspected: boolean("c9_suspected").default(false),
  c9_clinical_features: json("c9_clinical_features").$type<Record<string, boolean>>().default({}),
  c9_hemoglobin_type: json("c9_hemoglobin_type").$type<Record<string, boolean>>().default({}),
  c9_referral_facility: text("c9_referral_facility"),
  c9_referral_date: date("c9_referral_date"),
  summary_disease_skin_conditions: boolean("summary_disease_skin_conditions").default(false),
  summary_disease_vision_impairment: boolean("summary_disease_vision_impairment").default(false),
  summary_disease_hearing_impairment: boolean("summary_disease_hearing_impairment").default(false),
  summary_disease_dental: boolean("summary_disease_dental").default(false),
  summary_disease_reactive_airway: boolean("summary_disease_reactive_airway").default(false),
  summary_disease_heart: boolean("summary_disease_heart").default(false),
  summary_disease_convulsive: boolean("summary_disease_convulsive").default(false),
  summary_disease_neuro_motor: boolean("summary_disease_neuro_motor").default(false),
  summary_disease_cognitive_delay: boolean("summary_disease_cognitive_delay").default(false),
  summary_disease_motor_delay: boolean("summary_disease_motor_delay").default(false),
  summary_disease_speech_delay: boolean("summary_disease_speech_delay").default(false),
  summary_disease_behavioral_disorder: boolean("summary_disease_behavioral_disorder").default(false),
  summary_disease_tuberculosis: boolean("summary_disease_tuberculosis").default(false),
  summary_disease_leprosy: boolean("summary_disease_leprosy").default(false),
  summary_disease_sickle_cell_anaemia: boolean("summary_disease_sickle_cell_anaemia").default(false),
  summary_disease_other: text("summary_disease_other"),
  /* Section D */
  d1_seeing_difficulty: boolean("d1_seeing_difficulty").default(false),
  d1_referral_facility: text("d1_referral_facility"),
  d1_referral_date: date("d1_referral_date"),
  d2_walking_delay: boolean("d2_walking_delay").default(false),
  d2_referral_facility: text("d2_referral_facility"),
  d2_referral_date: date("d2_referral_date"),
  d3_reading_writing: boolean("d3_reading_writing").default(false),
  d3_referral_facility: text("d3_referral_facility"),
  d3_referral_date: date("d3_referral_date"),
  d4_muscle_stiffness: boolean("d4_muscle_stiffness").default(false),
  d4_referral_facility: text("d4_referral_facility"),
  d4_referral_date: date("d4_referral_date"),
  d5_hearing_difficulty: boolean("d5_hearing_difficulty").default(false),
  d5_referral_facility: text("d5_referral_facility"),
  d5_referral_date: date("d5_referral_date"),
  d6_speech_difficulty: boolean("d6_speech_difficulty").default(false),
  d6_referral_facility: text("d6_referral_facility"),
  d6_referral_date: date("d6_referral_date"),
  d7_learning_difficulty: boolean("d7_learning_difficulty").default(false),
  d7_referral_facility: text("d7_referral_facility"),
  d7_referral_date: date("d7_referral_date"),
  d8_inattention_hyperactivity: boolean("d8_inattention_hyperactivity").default(false),
  d8_referral_facility: text("d8_referral_facility"),
  d8_referral_date: date("d8_referral_date"),
  d9_behavioral_concerns: boolean("d9_behavioral_concerns").default(false),
  d9_referral_facility: text("d9_referral_facility"),
  d9_referral_date: date("d9_referral_date"),
  /* Section E */
  e1_life_events_difficulty: boolean("e1_life_events_difficulty").default(false),
  e1_referral_suggested: boolean("e1_referral_suggested").default(false),
  e1_referral_facility: text("e1_referral_facility"),
  e1_referral_date: date("e1_referral_date"),
  e2_peer_pressure_substance: boolean("e2_peer_pressure_substance").default(false),
  e2_referral_suggested: boolean("e2_referral_suggested").default(false),
  e2_referral_facility: text("e2_referral_facility"),
  e2_referral_date: date("e2_referral_date"),
  e3_persistent_sadness: boolean("e3_persistent_sadness").default(false),
  e3_referral_suggested: boolean("e3_referral_suggested").default(false),
  e3_referral_facility: text("e3_referral_facility"),
  e3_referral_date: date("e3_referral_date"),
  e4_menstruation_started: boolean("e4_menstruation_started").default(false),
  e4_referral_suggested: boolean("e4_referral_suggested").default(false),
  e4_referral_facility: text("e4_referral_facility"),
  e4_referral_date: date("e4_referral_date"),
  e5_pain_urination: boolean("e5_pain_urination").default(false),
  e5_referral_suggested: boolean("e5_referral_suggested").default(false),
  e5_referral_facility: text("e5_referral_facility"),
  e5_referral_date: date("e5_referral_date"),
  e6_foul_discharge: boolean("e6_foul_discharge").default(false),
  e6_referral_suggested: boolean("e6_referral_suggested").default(false),
  e6_referral_facility: text("e6_referral_facility"),
  e6_referral_date: date("e6_referral_date"),
  e7_severe_menstrual_pain: boolean("e7_severe_menstrual_pain").default(false),
  e7_referral_suggested: boolean("e7_referral_suggested").default(false),
  e7_referral_facility: text("e7_referral_facility"),
  e7_referral_date: date("e7_referral_date"),
  menstrual_cycle_regular: boolean("menstrual_cycle_regular").default(false),
  menstrual_cycle_length_days: int("menstrual_cycle_length_days"),
  menstrual_period_duration_days: int("menstrual_period_duration_days"),
  menstrual_last_period_date: date("menstrual_last_period_date"),
  menstrual_irregularities: json("menstrual_irregularities").$type<Record<string, unknown>>().default({}),
  menstrual_symptoms: json("menstrual_symptoms").$type<Record<string, unknown>>().default({}),
  menstrual_hygiene_practices: json("menstrual_hygiene_practices").$type<Record<string, unknown>>().default({}),
  menstrual_educational_resources_accessed: boolean("menstrual_educational_resources_accessed").default(false),
  summary_adolescent_substance_use: boolean("summary_adolescent_substance_use").default(false),
  summary_adolescent_depressed: boolean("summary_adolescent_depressed").default(false),
  summary_adolescent_burning_urination: boolean("summary_adolescent_burning_urination").default(false),
  summary_adolescent_discharge: boolean("summary_adolescent_discharge").default(false),
  summary_adolescent_other: text("summary_adolescent_other"),
  defects_summary: json("defects_summary").$type<Record<string, unknown>>().default({}),
  deficiencies_summary: json("deficiencies_summary").$type<Record<string, unknown>>().default({}),
  diseases_summary: json("diseases_summary").$type<Record<string, unknown>>().default({}),
  referral_summary: json("referral_summary").$type<Record<string, unknown>>().default({}),
  bmi_category: text("bmi_category"),
  bp_classification: text("bp_classification"),
  doctor_mht_name: text("doctor_mht_name"),
  doctor_signature_date: date("doctor_signature_date"),
  data_entry_register: boolean("data_entry_register").default(false),
  referral_defect_at_birth_yes: boolean("referral_defect_at_birth_yes").default(false),
  referral_defect_at_birth_facility_date: text("referral_defect_at_birth_facility_date"),
  referral_deficiency_yes: boolean("referral_deficiency_yes").default(false),
  referral_deficiency_facility_date: text("referral_deficiency_facility_date"),
  referral_disease_yes: boolean("referral_disease_yes").default(false),
  referral_disease_facility_date: text("referral_disease_facility_date"),
  referral_leprosy_yes: boolean("referral_leprosy_yes").default(false),
  referral_leprosy_facility_date: text("referral_leprosy_facility_date"),
  referral_tb_yes: boolean("referral_tb_yes").default(false),
  referral_tb_facility_date: text("referral_tb_facility_date"),
  referral_developmental_yes: boolean("referral_developmental_yes").default(false),
  referral_developmental_facility_date: text("referral_developmental_facility_date"),
  referral_adolescent_yes: boolean("referral_adolescent_yes").default(false),
  referral_adolescent_facility_date: text("referral_adolescent_facility_date"),
  date_of_visit: date("date_of_visit"),
  referral_recommended: boolean("referral_recommended").default(false),
  notes: text("notes"),
  dataEntryBy: varchar("data_entry_by", { length: 36 }),
  dateOfEntry: timestamp("date_of_entry").defaultNow(),
  status: text("status").$type<Status>().default("Pending"),
  approvalBy: varchar("approval_by", { length: 36 }),
  approvalDate: timestamp("approval_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const monthlyCheckups = mysqlTable("monthly_checkups", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  checkupDate: date("checkup_date").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  symptoms: json("symptoms").$type<string[]>().default([]),
  suggestedMedicines: json("suggested_medicines").$type<string[]>().default([]),
  treatmentType: text("treatment_type").$type<TreatmentType>().default("Primary"),
  referredTo: text("referred_to"),
  referralStatus: text("referral_status"),
  referralCompletionDate: date("referral_completion_date"),
  referralNotes: text("referral_notes"),
  present: boolean("present").default(true),
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mealLogs = mysqlTable("meal_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  studentId: varchar("student_id", { length: 36 }),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull().$type<MealType>(),
  menuItems: json("menu_items").$type<string[]>().default([]),
  imageUrl: text("image_url"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  uploadedBy: varchar("uploaded_by", { length: 36 }),
  notes: text("notes"),
  totalCalories: decimal("total_calories", { precision: 8, scale: 2 }),
  totalProtein: decimal("total_protein", { precision: 8, scale: 2 }),
  totalFat: decimal("total_fat", { precision: 8, scale: 2 }),
  totalCarbs: decimal("total_carbs", { precision: 8, scale: 2 }),
  totalFiber: decimal("total_fiber", { precision: 8, scale: 2 }),
  nutritionBreakdown: json("nutrition_breakdown"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hostelAttendanceRecorderEnum = ["HostelWarden", "ClassTeacher", "Admin", "Headmaster"] as const;
export type HostelAttendanceRecorder = typeof hostelAttendanceRecorderEnum[number];

export const hostelAttendance = mysqlTable("hostel_attendance", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  date: date("date").notNull(),
  eventIndex: int("event_index").default(0),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  checkInImageUrl: text("check_in_image_url"),
  checkOutImageUrl: text("check_out_image_url"),
  checkInReason: text("check_in_reason"),
  checkOutReason: text("check_out_reason"),
  isVacation: boolean("is_vacation").default(false),
  vacationStartDate: date("vacation_start_date"),
  vacationEndDate: date("vacation_end_date"),
  vacationReason: text("vacation_reason"),
  recordedBy: varchar("recorded_by", { length: 36 }),
  recorderRole: text("recorder_role").$type<HostelAttendanceRecorder>(),
  status: text("status").default("Present"),
  morningRollCall: boolean("morning_roll_call"),
  nightRollCall: boolean("night_roll_call"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  details: json("details").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentAcademicActions = mysqlTable("student_academic_actions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  actionType: text("action_type").notNull().$type<AcademicAction>(),
  oldStatus: text("old_status").notNull().$type<AcademicStatus>(),
  newStatus: text("new_status").notNull().$type<AcademicStatus>(),
  oldClassSection: text("old_class_section").notNull(),
  newClassSection: text("new_class_section").notNull(),
  oldTeacherId: varchar("old_teacher_id", { length: 36 }),
  newTeacherId: varchar("new_teacher_id", { length: 36 }),
  reason: text("reason").notNull(),
  academicYear: int("academic_year").notNull(),
  performedBy: varchar("performed_by", { length: 36 }).notNull(),
  performedByRole: text("performed_by_role").notNull().$type<Role>(),
  performedAt: timestamp("performed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const refreshTokens = mysqlTable("refresh_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = mysqlTable("referrals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  healthCardId: varchar("health_card_id", { length: 36 }).notNull(),
  referralType: text("referral_type").notNull(),
  referralCode: text("referral_code").notNull(),
  issue: text("issue").notNull(),
  facility: text("facility"),
  referralDate: date("referral_date").notNull(),
  status: text("status").notNull().$type<Status>().default("Pending"),
  completionDate: date("completion_date"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  senderId: varchar("sender_id", { length: 36 }).notNull(),
  senderRole: text("sender_role").notNull().$type<Role>(),
  receiverRole: text("receiver_role").notNull().$type<Role>(),
  receiverSchoolId: varchar("receiver_school_id", { length: 36 }),
  receiverClassSection: text("receiver_class_section"),
  type: text("type").notNull().$type<NotificationType>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isImportant: boolean("is_important").default(false),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  relatedStudentId: varchar("related_student_id", { length: 36 }),
  relatedSchoolId: varchar("related_school_id", { length: 36 }),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usageTracking = mysqlTable("usage_tracking", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 36 }),
  pageViews: int("page_views").default(1),
  loginAttempts: int("login_attempts").default(0),
  successfulLogins: int("successful_logins").default(0),
  firstVisit: timestamp("first_visit").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  sessionDuration: int("session_duration").default(0),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  browserName: text("browser_name"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const periodTrackerEntries = mysqlTable("period_tracker_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  schoolId: varchar("school_id", { length: 36 }).notNull(),
  entryDate: date("entry_date").notNull(),
  moods: json("moods").$type<string[]>().default([]),
  bodyTemperatureCelsius: decimal("body_temperature_celsius", { precision: 4, scale: 2 }),
  painIntensity: int("pain_intensity"),
  flowCategory: text("flow_category").$type<FlowCategory>(),
  symptoms: json("symptoms").$type<string[]>().default([]),
  notes: text("notes"),
  isReferred: boolean("is_referred").default(false),
  referredDate: date("referred_date"),
  referralFacility: text("referral_facility"),
  referralStatus: text("referral_status"),
  referralCompletionDate: date("referral_completion_date"),
  referralNotes: text("referral_notes"),
  recordedBy: varchar("recorded_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalTeams = mysqlTable("medical_teams", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  primaryContactMemberId: varchar("primary_contact_member_id", { length: 36 }),
  defaultMedications: json("default_medications").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalTeamMembers = mysqlTable("medical_team_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  teamId: varchar("team_id", { length: 36 }).notNull(),
  role: text("role").notNull().$type<MedicalTeamRole>(),
  fullName: text("full_name").notNull(),
  designation: text("designation").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  regNumber: text("reg_number"),
  licenseExpiry: date("license_expiry"),
  facility: text("facility"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalEvents = mysqlTable("medical_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  teamId: varchar("team_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  eventDate: date("event_date").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
});

export const studentCheckups = mysqlTable("student_checkups", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  studentId: varchar("student_id", { length: 36 }).notNull(),
  eventId: varchar("event_id", { length: 36 }).notNull(),
  teamId: varchar("team_id", { length: 36 }).notNull(),
  status: text("status").notNull().$type<CheckupStatus>().default("In progress"),
  present: boolean("present").default(true),
  checkupMonth: int("checkup_month").notNull().default(sql`(MONTH(CURDATE()))`),
  checkupYear: int("checkup_year").notNull().default(sql`(YEAR(CURDATE()))`),
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  temperatureC: decimal("temperature_c", { precision: 4, scale: 2 }),
  bpSystolic: int("bp_systolic"),
  bpDiastolic: int("bp_diastolic"),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  medicationsGiven: text("medications_given"),
  referredTo: text("referred_to"),
  referralStatus: text("referral_status").$type<ReferralStatus>(),
  referralNotes: text("referral_notes"),
  referralDate: date("referral_date"),
  referralFacility: varchar("referral_facility", { length: 255 }),
  referralCompletionDate: date("referral_completion_date"),
  isCompleted: boolean("is_completed").default(false),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueStudentEventMonthYear: unique("unique_student_event_month_year").on(
    table.studentId,
    table.eventId,
    table.checkupMonth,
    table.checkupYear
  ),
}));

export const mealOptions = mysqlTable("meal_options", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  mealType: text("meal_type").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = mysqlTable("reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  reportId: varchar("report_id", { length: 255 }).notNull().unique(),
  reportType: text("report_type").notNull(),
  reportCategory: text("report_category").notNull(),
  roleAllowed: text("role_allowed").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: int("file_size"),
  generatedBy: varchar("generated_by", { length: 36 }).notNull(),
  generatedFor: varchar("generated_for", { length: 36 }),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sharedReports = mysqlTable("shared_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  reportId: varchar("report_id", { length: 36 }).notNull(),
  sharedBy: varchar("shared_by", { length: 36 }).notNull(),
  sharedWith: json("shared_with").notNull(),
  message: text("message"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  auditLogs: many(auditLogs),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  headmaster: one(users, { fields: [schools.headmasterId], references: [users.id] }),
  students: many(students),
  mealLogs: many(mealLogs),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  annualHealthCards: many(annualHealthCards),
  monthlyCheckups: many(monthlyCheckups),
  hostelAttendance: many(hostelAttendance),
}));

export const annualHealthCardsRelations = relations(annualHealthCards, ({ one }) => ({
  student: one(students, { fields: [annualHealthCards.studentId], references: [students.id] }),
  dataEntryUser: one(users, { fields: [annualHealthCards.dataEntryBy], references: [users.id] }),
  approvalUser: one(users, { fields: [annualHealthCards.approvalBy], references: [users.id] }),
}));

export const monthlyCheckupsRelations = relations(monthlyCheckups, ({ one }) => ({
  student: one(students, { fields: [monthlyCheckups.studentId], references: [students.id] }),
  school: one(schools, { fields: [monthlyCheckups.schoolId], references: [schools.id] }),
  recordedByUser: one(users, { fields: [monthlyCheckups.recordedBy], references: [users.id] }),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  school: one(schools, { fields: [mealLogs.schoolId], references: [schools.id] }),
  student: one(students, { fields: [mealLogs.studentId], references: [students.id] }),
  uploadedByUser: one(users, { fields: [mealLogs.uploadedBy], references: [users.id] }),
}));

export const hostelAttendanceRelations = relations(hostelAttendance, ({ one }) => ({
  student: one(students, { fields: [hostelAttendance.studentId], references: [students.id] }),
  school: one(schools, { fields: [hostelAttendance.schoolId], references: [schools.id] }),
  recordedByUser: one(users, { fields: [hostelAttendance.recordedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  student: one(students, { fields: [referrals.studentId], references: [students.id] }),
  school: one(schools, { fields: [referrals.schoolId], references: [schools.id] }),
  healthCard: one(annualHealthCards, { fields: [referrals.healthCardId], references: [annualHealthCards.id] }),
  createdByUser: one(users, { fields: [referrals.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [referrals.updatedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  sender: one(users, { fields: [notifications.senderId], references: [users.id] }),
  relatedStudent: one(students, { fields: [notifications.relatedStudentId], references: [students.id] }),
  relatedSchool: one(schools, { fields: [notifications.relatedSchoolId], references: [schools.id] }),
}));

export const periodTrackerEntriesRelations = relations(periodTrackerEntries, ({ one }) => ({
  student: one(students, { fields: [periodTrackerEntries.studentId], references: [students.id] }),
  school: one(schools, { fields: [periodTrackerEntries.schoolId], references: [schools.id] }),
  recordedByUser: one(users, { fields: [periodTrackerEntries.recordedBy], references: [users.id] }),
}));

export const medicalTeamsRelations = relations(medicalTeams, ({ one, many }) => ({
  primaryContact: one(medicalTeamMembers, { fields: [medicalTeams.primaryContactMemberId], references: [medicalTeamMembers.id] }),
  members: many(medicalTeamMembers),
  events: many(medicalEvents),
}));

export const medicalTeamMembersRelations = relations(medicalTeamMembers, ({ one }) => ({
  team: one(medicalTeams, { fields: [medicalTeamMembers.teamId], references: [medicalTeams.id] }),
}));

export const medicalEventsRelations = relations(medicalEvents, ({ one, many }) => ({
  team: one(medicalTeams, { fields: [medicalEvents.teamId], references: [medicalTeams.id] }),
  createdByUser: one(users, { fields: [medicalEvents.createdBy], references: [users.id] }),
  checkups: many(studentCheckups),
}));

export const studentCheckupsRelations = relations(studentCheckups, ({ one }) => ({
  student: one(students, { fields: [studentCheckups.studentId], references: [students.id] }),
  event: one(medicalEvents, { fields: [studentCheckups.eventId], references: [medicalEvents.id] }),
  team: one(medicalTeams, { fields: [studentCheckups.teamId], references: [medicalTeams.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  generatedByUser: one(users, { fields: [reports.generatedBy], references: [users.id] }),
}));

export const sharedReportsRelations = relations(sharedReports, ({ one }) => ({
  report: one(reports, { fields: [sharedReports.reportId], references: [reports.id] }),
  sharedByUser: one(users, { fields: [sharedReports.sharedBy], references: [users.id] }),
}));

// ─── Insert Schemas (Zod) ─────────────────────────────────────────────────────

// Helper: accepts string or Date, always outputs Date (or undefined if optional)
const coerceDate = z.union([z.string(), z.date()]).transform(v => new Date(v));
const coerceDateOptional = z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined);

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dateOfBirth: coerceDateOptional,
  enrollmentDate: coerceDateOptional,
  schoolAdmissionDate: coerceDate,
});

export const insertAnnualHealthCardSchema = createInsertSchema(annualHealthCards).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  studentId: z.string().min(1, "Student ID is required"),
  schoolId: z.string().min(1, "School ID is required"),
  year: z.number().min(2020).max(new Date().getFullYear() + 1),
  nameOfChild: z.string().min(1).max(100).optional(),
  classSection: z.string().min(1).optional(),
  gender: z.enum(genderEnum).optional(),
  weightKg: z.number().min(1).max(200).optional(),
  heightCm: z.number().min(30).max(250).optional(),
  aadhaarNo: z.string().optional().refine((v) => !v || v.length === 12, "Aadhaar must be 12 digits"),
  pranNo: z.string().optional().refine((v) => !v || v.length >= 6, "PRAN seems invalid"),
  fatherContact: z.string().optional().refine((v) => !v || /^\d{10}$/.test(v), "Contact must be 10 digits"),
  motherContact: z.string().optional().refine((v) => !v || /^\d{10}$/.test(v), "Contact must be 10 digits"),
  visionRight: z.string().optional().refine((v) => !v || /^6\/\d{1,2}$/.test(v), "Vision format should be 6/X"),
  visionLeft: z.string().optional().refine((v) => !v || /^6\/\d{1,2}$/.test(v), "Vision format should be 6/X"),
  bloodPressure: z.string().optional().refine((v) => !v || /^\d{2,3}\/\d{2,3}$/.test(v), "BP format should be systolic/diastolic"),
  sbp: z.number().optional().refine((v) => !v || (v >= 60 && v <= 250), "SBP out of range"),
  dbp: z.number().optional().refine((v) => !v || (v >= 40 && v <= 150), "DBP out of range"),
});

export const insertMonthlyCheckupSchema = createInsertSchema(monthlyCheckups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMealLogSchema = createInsertSchema(mealLogs).omit({ id: true, createdAt: true }).extend({
  date: coerceDate,
});
export const insertHostelAttendanceSchema = createInsertSchema(hostelAttendance).omit({ id: true, createdAt: true }).extend({
  date: coerceDate,
  vacationStartDate: coerceDateOptional,
  vacationEndDate: coerceDateOptional,
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  referralDate: coerceDate,
  completionDate: coerceDateOptional,
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPeriodTrackerEntrySchema = createInsertSchema(periodTrackerEntries).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  entryDate: coerceDate,
  referredDate: coerceDateOptional,
  referralCompletionDate: coerceDateOptional,
});
export const insertMedicalTeamSchema = createInsertSchema(medicalTeams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMedicalTeamMemberSchema = createInsertSchema(medicalTeamMembers).omit({ id: true, createdAt: true }).extend({
  licenseExpiry: coerceDateOptional,
});
export const insertMedicalEventSchema = createInsertSchema(medicalEvents).omit({ id: true, createdAt: true }).extend({
  eventDate: coerceDate,
});
export const insertStudentCheckupSchema = createInsertSchema(studentCheckups).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  referralDate: coerceDateOptional,
  referralCompletionDate: coerceDateOptional,
  followUpDate: coerceDateOptional,
});
export const insertStudentAcademicActionSchema = createInsertSchema(studentAcademicActions).omit({ id: true, createdAt: true, performedAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSharedReportSchema = createInsertSchema(sharedReports).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Login Schema ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(roleEnum),
  schoolId: z.string().optional(),
  district: z.string().optional(),
  block: z.string().optional(),
  region: z.string().optional(),
  classSection: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;
export type AnnualHealthCard = typeof annualHealthCards.$inferSelect;
export type InsertAnnualHealthCard = typeof annualHealthCards.$inferInsert;
export type MonthlyCheckup = typeof monthlyCheckups.$inferSelect;
export type InsertMonthlyCheckup = typeof monthlyCheckups.$inferInsert;
export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = typeof mealLogs.$inferInsert;
export type HostelAttendance = typeof hostelAttendance.$inferSelect;
export type InsertHostelAttendance = typeof hostelAttendance.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PeriodTrackerEntry = typeof periodTrackerEntries.$inferSelect;
export type InsertPeriodTrackerEntry = typeof periodTrackerEntries.$inferInsert;
export type MedicalTeam = typeof medicalTeams.$inferSelect;
export type InsertMedicalTeam = typeof medicalTeams.$inferInsert;
export type MedicalTeamMember = typeof medicalTeamMembers.$inferSelect;
export type InsertMedicalTeamMember = typeof medicalTeamMembers.$inferInsert;
export type MedicalEvent = typeof medicalEvents.$inferSelect;
export type InsertMedicalEvent = typeof medicalEvents.$inferInsert;
export type StudentCheckup = typeof studentCheckups.$inferSelect;
export type InsertStudentCheckup = typeof studentCheckups.$inferInsert;
export type StudentAcademicAction = typeof studentAcademicActions.$inferSelect;
export type InsertStudentAcademicAction = typeof studentAcademicActions.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type SharedReport = typeof sharedReports.$inferSelect;
export type InsertSharedReport = typeof sharedReports.$inferInsert;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;
export type MealOption = typeof mealOptions.$inferSelect;
export type InsertMealOption = typeof mealOptions.$inferInsert;

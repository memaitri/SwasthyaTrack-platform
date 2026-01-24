import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, date } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().$type<Role>(),
  schoolId: varchar("school_id"),
  classSection: text("class_section"), // For ClassTeacher - assigned class
  district: text("district"),
  block: text("block"),
  isActive: boolean("is_active").default(true),
  approvalStatus: text("approval_status").notNull().$type<Status>().default("Approved"),
  approverId: varchar("approver_id"),
  approverNote: text("approver_note"),
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").unique(),
  schoolType: text("school_type").notNull().$type<SchoolType>(),
  region: text("region").notNull(), // Region for PO matching
  district: text("district").notNull(),
  block: text("block").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  headmasterId: varchar("headmaster_id"),
  totalStudents: integer("total_students").default(0),
  isActive: boolean("is_active").default(true),
  // Approval workflow fields
  approvalStatus: text("approval_status").default("Pending"),
  approverId: varchar("approver_id"),
  approverNote: text("approver_note"),
  requestedByEmail: text("requested_by_email"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull(),
  uniqueId: text("unique_id").notNull().unique(),
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
  // Menstruation marking: set once by ClassTeacher when first cycle starts
  menstruationStartedAt: timestamp("menstruation_started_at"),
  menstruationMarkedBy: varchar("menstruation_marked_by"),
  // Academic status tracking
  academicStatus: text("academic_status").notNull().$type<AcademicStatus>().default("Active"),
  academicYear: integer("academic_year").default(sql`EXTRACT(YEAR FROM CURRENT_DATE)`),
  previousClassSection: text("previous_class_section"),
});

export const annualHealthCards = pgTable("annual_health_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  year: integer("year").notNull(),
  district: text("district"),
  block: text("block"),
  schoolName: text("school_name"),
  schoolId: varchar("school_id"),
  mobileHealthTeamId: text("mobile_health_team_id"),
  nameOfChild: text("name_of_child"),
  ageYears: integer("age_years"),
  ageMonths: integer("age_months"),
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
  sbp: integer("sbp"),
  dbp: integer("dbp"),
  visionRight: text("vision_right"),
  visionLeft: text("vision_left"),
  visualAcuitySnellen: text("visual_acuity_snellen"),
  visualAcuityNotes: text("visual_acuity_notes"),
  defectAtBirth: boolean("defect_at_birth").default(false),
  defectsAtBirth: jsonb("defects_at_birth").$type<string[]>().default([]),
  /* Section A: Defects at Birth */

  a1_visible_defect: boolean("a1_visible_defect").default(false),
  a1_visible_defect_notes: text("a1_visible_defect_notes"),
  a1_referral_facility: text("a1_referral_facility"),
  a1_referral_date: date("a1_referral_date"),

  /* Section A: Summary of Defects at Birth */
  summary_defects_neural_tube: boolean("summary_defects_neural_tube").default(false),
  summary_defects_down_syndrome: boolean("summary_defects_down_syndrome").default(false),
  summary_defects_cleft: boolean("summary_defects_cleft").default(false),
  summary_defects_talipes: boolean("summary_defects_talipes").default(false),
  summary_defects_hip_dysplasia: boolean("summary_defects_hip_dysplasia").default(false),
  summary_defects_congenital_deafness: boolean("summary_defects_congenital_deafness").default(false),
  summary_defects_other: text("summary_defects_other"),

  /* Section B: Deficiencies */
  deficiencySam: boolean("deficiency_sam").default(false),
  deficiencyOedema: boolean("deficiency_oedema").default(false),
  deficiencyAnemia: boolean("deficiency_anemia").default(false),
  deficiencyVitaminA: boolean("deficiency_vitamin_a").default(false),
  deficiencyVitaminD: boolean("deficiency_vitamin_d").default(false),
  deficiencyGoitre: boolean("deficiency_goitre").default(false),
  deficiencyObesity: boolean("deficiency_obesity").default(false),
  deficiencyVitaminB: boolean("deficiency_vitamin_b").default(false),
  deficiencies: jsonb("deficiencies").$type<string[]>().default([]),
  /* Section B: Deficiencies — B1 to B8 with detailed referral capture */
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
  /* Section B: Summary of Deficiencies */
  summary_deficiency_anemia: boolean("summary_deficiency_anemia").default(false),
  summary_deficiency_vitamin_a: boolean("summary_deficiency_vitamin_a").default(false),
  summary_deficiency_vitamin_d: boolean("summary_deficiency_vitamin_d").default(false),
  summary_deficiency_sam_stunting: boolean("summary_deficiency_sam_stunting").default(false),
  summary_deficiency_goitre: boolean("summary_deficiency_goitre").default(false),
  summary_deficiency_vitamin_b: boolean("summary_deficiency_vitamin_b").default(false),
  summary_deficiency_other: text("summary_deficiency_other"),

  /* Section C: Diseases — C1 to C6 with referral */
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

  /* Section C7: Childhood Leprosy Disease (Hansen's Disease) */
  c7_suspected: boolean("c7_suspected").default(false),
  
  /* C7.1 Skin Lesion Assessment */
  c7_skin_lesion_present: boolean("c7_skin_lesion_present").default(false),
  c7_hypopigmented_reddish_lesion: boolean("c7_hypopigmented_reddish_lesion").default(false),
  c7_lesion_sensory_deficit: boolean("c7_lesion_sensory_deficit").default(false),
  c7_skin_characteristics: jsonb("c7_skin_characteristics").$type<{
    not_painful?: boolean;
    not_itchy?: boolean;
    not_shedding_scales?: boolean;
    not_seasonal?: boolean;
    no_prior_inflammation?: boolean;
    not_dark_red_depigmented?: boolean;
  }>().default({}),
  c7_num_lesions: text("c7_num_lesions"), // '1-5' or 'more-than-5'
  c7_lesion_type: jsonb("c7_lesion_type").$type<{
    patchy?: boolean;
    plaque?: boolean;
    nodular?: boolean;
    diffuse_infiltration?: boolean;
  }>().default({}),
  
  /* C7.2 Peripheral Nerve Involvement */
  c7_nerves_involved: jsonb("c7_nerves_involved").$type<{
    greater_auricular?: boolean;
    ulnar?: boolean;
    radial_cutaneous?: boolean;
    peroneal?: boolean;
    posterior_tibial?: boolean;
  }>().default({}),
  c7_nerve_signs: jsonb("c7_nerve_signs").$type<{
    thickening?: boolean;
    loss_sensation?: boolean;
    weakness_hand?: boolean;
    weakness_foot?: boolean;
    weakness_eye?: boolean;
  }>().default({}),
  
  /* C7.3 Contractures & Deformities */
  c7_contractures_deformities: jsonb("c7_contractures_deformities").$type<{
    right_hand?: boolean;
    left_hand?: boolean;
    right_foot?: boolean;
    left_foot?: boolean;
    eyes?: boolean;
    face?: boolean;
  }>().default({}),
  
  /* C7 Referral */
  c7_referral_facility: text("c7_referral_facility"),
  c7_referral_date: date("c7_referral_date"),

  /* Section C8: Childhood Tubercular Disease */
  c8_suspected: boolean("c8_suspected").default(false),
  
  /* C8.1 Pulmonary TB Screening - Cough */
  c8_cough_gt14_days: boolean("c8_cough_gt14_days").default(false),
  c8_cough_antibiotics_failed: boolean("c8_cough_antibiotics_failed").default(false),
  c8_cough_with_bronchodilators_failed: boolean("c8_cough_with_bronchodilators_failed").default(false),
  
  /* C8.2 Persistent Fever */
  c8_persistent_fever: boolean("c8_persistent_fever").default(false),
  c8_fever_temperature: decimal("c8_fever_temperature", { precision: 4, scale: 1 }),
  c8_fever_duration_weeks: integer("c8_fever_duration_weeks"),
  
  /* C8.3 Marked Reduction in */
  c8_reduced_playfulness: boolean("c8_reduced_playfulness").default(false),
  c8_reduced_daily_activity: boolean("c8_reduced_daily_activity").default(false),
  c8_reduced_appetite: boolean("c8_reduced_appetite").default(false),
  c8_reduced_interaction: boolean("c8_reduced_interaction").default(false),
  c8_reduction_duration_days: integer("c8_reduction_duration_days"),
  
  /* C8.4 Headache and Irritability */
  c8_recent_headache_irritability: boolean("c8_recent_headache_irritability").default(false),
  c8_altered_behavior: boolean("c8_altered_behavior").default(false),
  c8_altered_behavior_duration_days: integer("c8_altered_behavior_duration_days"),
  
  /* C8.5 Weight Loss */
  c8_weight_loss_gt5_percent: boolean("c8_weight_loss_gt5_percent").default(false),
  c8_weight_loss_not_responding_deworming: boolean("c8_weight_loss_not_responding_deworming").default(false),
  c8_weight_loss_not_responding_micronutrient: boolean("c8_weight_loss_not_responding_micronutrient").default(false),
  c8_weight_loss_not_responding_nutrition: boolean("c8_weight_loss_not_responding_nutrition").default(false),
  
  /* C8.6 Close Contact with TB */
  c8_close_contact_known_tb: boolean("c8_close_contact_known_tb").default(false),
  c8_contact_relation: text("c8_contact_relation"), // parents, siblings, relatives, caregivers, neighbors, teachers
  
  /* C8.7 Immunocompromised History */
  c8_measles_varicella_3mo: boolean("c8_measles_varicella_3mo").default(false),
  c8_steroids_chemotherapy_1mo: boolean("c8_steroids_chemotherapy_1mo").default(false),
  
  /* C8.8 Abdominal TB */
  c8_abdominal_pain_dull_aching: boolean("c8_abdominal_pain_dull_aching").default(false),
  c8_abdominal_swelling: boolean("c8_abdominal_swelling").default(false),
  c8_painless_abdominal_mass: boolean("c8_painless_abdominal_mass").default(false),
  c8_hepatomegaly: boolean("c8_hepatomegaly").default(false),
  c8_splenomegaly: boolean("c8_splenomegaly").default(false),
  
  /* C8.9 TB Lymph Nodes */
  c8_lymph_node_swelling_painless: boolean("c8_lymph_node_swelling_painless").default(false),
  c8_lymph_node_not_responding_antibiotics: boolean("c8_lymph_node_not_responding_antibiotics").default(false),
  c8_lymph_node_characteristics: jsonb("c8_lymph_node_characteristics").$type<{
    single_discrete?: boolean;
    multiple_matted?: boolean;
    non_tender_painless?: boolean;
    discharging_sinus?: boolean;
  }>().default({}),
  
  /* C8.10 TB Spine */
  c8_spine_pain_stiffness: boolean("c8_spine_pain_stiffness").default(false),
  c8_spinal_deformity: boolean("c8_spinal_deformity").default(false),
  c8_cold_abscess: boolean("c8_cold_abscess").default(false),
  c8_night_cries_typical: boolean("c8_night_cries_typical").default(false),
  c8_kyphotic_deformity: boolean("c8_kyphotic_deformity").default(false),
  
  /* C8.11 CNS TB */
  c8_altered_consciousness: boolean("c8_altered_consciousness").default(false),
  c8_convulsions_no_fever: boolean("c8_convulsions_no_fever").default(false),
  c8_vomiting_no_diarrhea: boolean("c8_vomiting_no_diarrhea").default(false),
  c8_focal_neuro_deficit: boolean("c8_focal_neuro_deficit").default(false),
  c8_abnormal_movements: boolean("c8_abnormal_movements").default(false),
  c8_cranial_nerve_palsy: boolean("c8_cranial_nerve_palsy").default(false),
  c8_neck_stiffness_rigidity: boolean("c8_neck_stiffness_rigidity").default(false),
  
  /* C8.12 Severe Respiratory Disease */
  c8_respiratory_distress: boolean("c8_respiratory_distress").default(false),
  c8_difficulty_breathing: boolean("c8_difficulty_breathing").default(false),
  c8_persistent_cough_2weeks: boolean("c8_persistent_cough_2weeks").default(false),
  c8_increased_respiratory_rate: boolean("c8_increased_respiratory_rate").default(false),
  c8_difficult_pneumonia: boolean("c8_difficult_pneumonia").default(false),
  
  /* C8.13 Bone & Joint TB */
  c8_limping_recent_onset: boolean("c8_limping_recent_onset").default(false),
  c8_joint_pain_swelling: boolean("c8_joint_pain_swelling").default(false),
  c8_bone_joint_night_cry: boolean("c8_bone_joint_night_cry").default(false),
  
  /* C8 Referral */
  c8_referral_facility: text("c8_referral_facility"),
  c8_referral_date: date("c8_referral_date"),

  /* Section C9: Sickle Cell Anaemia */
  c9_suspected: boolean("c9_suspected").default(false),
  
  /* C9.1 Clinical Features */
  c9_clinical_features: jsonb("c9_clinical_features").$type<{
    pain_crisis?: boolean;
    swelling_hands_feet?: boolean;
    shortness_breath?: boolean;
    fatigue?: boolean;
    jaundice?: boolean;
    delayed_growth?: boolean;
    severe_infections?: boolean;
  }>().default({}),
  
  /* C9.2 Hemoglobin Type Classification */
  c9_hemoglobin_type: jsonb("c9_hemoglobin_type").$type<{
    hbss?: boolean;
    hbsc?: boolean;
    hbs_beta_thalassemia?: boolean;
    hbsd?: boolean;
    hbse?: boolean;
  }>().default({}),
  
  /* C9 Referral */
  c9_referral_facility: text("c9_referral_facility"),
  c9_referral_date: date("c9_referral_date"),

  /* Section C: Summary of Diseases */
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

  /* Section D: Developmental Delay/Disability — D1 to D9 with detailed referral */
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

  /* Section E: Adolescent-Specific Questionnaire — E1 to E7 */
  /* Age gating: show only if age >= 10 years */
  /* Gender-specific: E4, E7 only for females */

  e1_life_events_difficulty: boolean("e1_life_events_difficulty").default(false),
  e1_referral_suggested: boolean("e1_referral_suggested").default(false),
  e1_referral_facility: text("e1_referral_facility"),
  e1_referral_date: date("e1_referral_date"),

  e2_peer_pressure_substance: boolean("e2_peer_pressure_substance").default(false),
  e3_persistent_sadness: boolean("e3_persistent_sadness").default(false),
  e5_pain_urination: boolean("e5_pain_urination").default(false),
  e6_foul_discharge: boolean("e6_foul_discharge").default(false),
  e2_referral_suggested: boolean("e2_referral_suggested").default(false),
  e3_referral_suggested: boolean("e3_referral_suggested").default(false),
  e5_referral_suggested: boolean("e5_referral_suggested").default(false),
  e6_referral_suggested: boolean("e6_referral_suggested").default(false),
  e2_referral_facility: text("e2_referral_facility"),
  e2_referral_date: date("e2_referral_date"),
  e3_referral_facility: text("e3_referral_facility"),
  e3_referral_date: date("e3_referral_date"),
  e5_referral_facility: text("e5_referral_facility"),
  e5_referral_date: date("e5_referral_date"),
  e6_referral_facility: text("e6_referral_facility"),
  e6_referral_date: date("e6_referral_date"),

  /* E4 & E7: Female-only menstrual health fields */
  e4_menstruation_started: boolean("e4_menstruation_started").default(false),
  e4_referral_suggested: boolean("e4_referral_suggested").default(false),
  e4_referral_facility: text("e4_referral_facility"),
  e4_referral_date: date("e4_referral_date"),
  
  e7_severe_menstrual_pain: boolean("e7_severe_menstrual_pain").default(false),
  e7_referral_suggested: boolean("e7_referral_suggested").default(false),
  e7_referral_facility: text("e7_referral_facility"),
  e7_referral_date: date("e7_referral_date"),

  /* Detailed Menstrual Cycle Tracking (Female students aged 10+) */
  menstrual_cycle_regular: boolean("menstrual_cycle_regular").default(false),
  menstrual_cycle_length_days: integer("menstrual_cycle_length_days"),
  menstrual_period_duration_days: integer("menstrual_period_duration_days"),
  menstrual_last_period_date: date("menstrual_last_period_date"),
  menstrual_irregularities: jsonb("menstrual_irregularities").$type<{
    irregular_periods?: boolean;
    missed_periods?: boolean;
    heavy_bleeding?: boolean;
    prolonged_periods?: boolean;
    frequent_periods?: boolean;
    painful_periods?: boolean;
    other?: string;
  }>().default({}),
  menstrual_symptoms: jsonb("menstrual_symptoms").$type<{
    severe_cramps?: boolean;
    heavy_bleeding?: boolean;
    nausea_vomiting?: boolean;
    headaches?: boolean;
    mood_changes?: boolean;
    fatigue?: boolean;
    bloating?: boolean;
    breast_tenderness?: boolean;
    other?: string;
  }>().default({}),
  menstrual_hygiene_practices: jsonb("menstrual_hygiene_practices").$type<{
    sanitary_pads?: boolean;
    tampons?: boolean;
    menstrual_cup?: boolean;
    cloth?: boolean;
    adequate_facilities?: boolean;
    proper_disposal?: boolean;
  }>().default({}),
  menstrual_educational_resources_accessed: boolean("menstrual_educational_resources_accessed").default(false),



  /* Section E: Summary of Adolescent Health Concerns */
  summary_adolescent_substance_use: boolean("summary_adolescent_substance_use").default(false),
  summary_adolescent_depressed: boolean("summary_adolescent_depressed").default(false),
  summary_adolescent_burning_urination: boolean("summary_adolescent_burning_urination").default(false),
  summary_adolescent_discharge: boolean("summary_adolescent_discharge").default(false),
  summary_adolescent_other: text("summary_adolescent_other"),

  /* Additional Summary Fields */
  defects_summary: jsonb("defects_summary").$type<Record<string, unknown>>().default({}),
  deficiencies_summary: jsonb("deficiencies_summary").$type<Record<string, unknown>>().default({}),
  diseases_summary: jsonb("diseases_summary").$type<Record<string, unknown>>().default({}),
  referral_summary: jsonb("referral_summary").$type<Record<string, unknown>>().default({}),

  /* BMI Classification and BP Classification */
  bmi_category: text("bmi_category"),
  bp_classification: text("bp_classification"),

  /* Doctor signature and data entry fields */
  doctor_mht_name: text("doctor_mht_name"),
  doctor_signature_date: date("doctor_signature_date"),
  data_entry_register: boolean("data_entry_register").default(false),

  /* Referral summary by category */
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

  /* Date of visit */
  date_of_visit: date("date_of_visit"),

  /* Overall referral flag (auto-set if ANY referral is needed) */
  referral_recommended: boolean("referral_recommended").default(false),
  notes: text("notes"),
  dataEntryBy: varchar("data_entry_by"),
  dateOfEntry: timestamp("date_of_entry").defaultNow(),
  status: text("status").$type<Status>().default("Pending"),
  approvalBy: varchar("approval_by"),
  approvalDate: timestamp("approval_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const monthlyCheckups = pgTable("monthly_checkups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  schoolId: varchar("school_id").notNull(),
  checkupDate: date("checkup_date").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  symptoms: jsonb("symptoms").$type<string[]>().default([]),
  suggestedMedicines: jsonb("suggested_medicines").$type<string[]>().default([]),
  treatmentType: text("treatment_type").$type<TreatmentType>().default("Primary"),
  referredTo: text("referred_to"),
  present: boolean("present").default(true),
  notes: text("notes"),
  recordedBy: varchar("recorded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mealLogs = pgTable("meal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull(),
  studentId: varchar("student_id"),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull().$type<MealType>(),
  menuItems: jsonb("menu_items").$type<string[]>().default([]),
  imageUrl: text("image_url"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  uploadedBy: varchar("uploaded_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hostelAttendanceRecorderEnum = ["HostelWarden", "ClassTeacher", "Admin", "Headmaster"] as const;
export type HostelAttendanceRecorder = typeof hostelAttendanceRecorderEnum[number];

export const hostelAttendance = pgTable("hostel_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  schoolId: varchar("school_id").notNull(),
  date: date("date").notNull(),
  eventIndex: integer("event_index").default(0), // Track sequence: 0=first checkin, 1=first checkout, 2=second checkin, etc.
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
  recordedBy: varchar("recorded_by"),
  recorderRole: text("recorder_role").$type<HostelAttendanceRecorder>(), // Track who recorded: HostelWarden has priority
  status: text("status").default("Present"), // Present, Absent, On Vacation, Late
  morningRollCall: boolean("morning_roll_call"),
  nightRollCall: boolean("night_roll_call"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentAcademicActions = pgTable("student_academic_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  actionType: text("action_type").notNull().$type<AcademicAction>(),
  oldStatus: text("old_status").notNull().$type<AcademicStatus>(),
  newStatus: text("new_status").notNull().$type<AcademicStatus>(),
  oldClassSection: text("old_class_section").notNull(),
  newClassSection: text("new_class_section").notNull(),
  oldTeacherId: varchar("old_teacher_id"),
  newTeacherId: varchar("new_teacher_id"),
  reason: text("reason").notNull(),
  academicYear: integer("academic_year").notNull(),
  performedBy: varchar("performed_by").notNull(),
  performedByRole: text("performed_by_role").notNull().$type<Role>(),
  performedAt: timestamp("performed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  schoolId: varchar("school_id").notNull(),
  healthCardId: varchar("health_card_id").notNull(),
  referralType: text("referral_type").notNull(), // 'defect', 'deficiency', 'disease', 'developmental', 'adolescent'
  referralCode: text("referral_code").notNull(), // 'A1', 'B1', 'C1', etc.
  issue: text("issue").notNull(), // Human readable description
  facility: text("facility"), // Referral facility
  referralDate: date("referral_date").notNull(),
  status: text("status").notNull().$type<Status>().default("Pending"), // Pending, Approved, Rejected
  completionDate: date("completion_date"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull().$type<Role>(),
  receiverRole: text("receiver_role").notNull().$type<Role>(),
  receiverSchoolId: varchar("receiver_school_id"), // For school-specific notifications
  receiverClassSection: text("receiver_class_section"), // For class-specific notifications
  type: text("type").notNull().$type<NotificationType>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isImportant: boolean("is_important").default(false),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  relatedStudentId: varchar("related_student_id"), // For health/meal alerts
  relatedSchoolId: varchar("related_school_id"), // For school-specific alerts
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), // Additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const periodTrackerEntries = pgTable("period_tracker_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  schoolId: varchar("school_id").notNull(),
  entryDate: date("entry_date").notNull(),
  
  // Mood tracking (multiple selections)
  moods: jsonb("moods").$type<string[]>().default([]),
  // Options: happy, sad, anxious, irritable, energetic, tired, calm, stressed, emotional, normal
  
  // Physical measurements
  bodyTemperatureCelsius: decimal("body_temperature_celsius", { precision: 4, scale: 2 }),
  
  // Pain intensity (0-10 scale)
  painIntensity: integer("pain_intensity"),
  
  // Flow category
  flowCategory: text("flow_category").$type<FlowCategory>(),
  
  // Detailed symptoms (multiple selections)
  symptoms: jsonb("symptoms").$type<string[]>().default([]),
  // Options: cramps, headache, nausea, bloating, breast_tenderness, back_pain, 
  //          fatigue, dizziness, acne, food_cravings, insomnia, diarrhea, constipation
  
  // Optional notes
  notes: text("notes"),
  
  // Referral fields
  isReferred: boolean("is_referred").default(false),
  referredDate: date("referred_date"),
  referralFacility: text("referral_facility"),
  
  // Tracking metadata
  recordedBy: varchar("recorded_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  auditLogs: many(auditLogs),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  headmaster: one(users, {
    fields: [schools.headmasterId],
    references: [users.id],
  }),
  students: many(students),
  mealLogs: many(mealLogs),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  annualHealthCards: many(annualHealthCards),
  monthlyCheckups: many(monthlyCheckups),
  hostelAttendance: many(hostelAttendance),
}));

export const annualHealthCardsRelations = relations(annualHealthCards, ({ one }) => ({
  student: one(students, {
    fields: [annualHealthCards.studentId],
    references: [students.id],
  }),
  dataEntryUser: one(users, {
    fields: [annualHealthCards.dataEntryBy],
    references: [users.id],
  }),
  approvalUser: one(users, {
    fields: [annualHealthCards.approvalBy],
    references: [users.id],
  }),
}));

export const monthlyCheckupsRelations = relations(monthlyCheckups, ({ one }) => ({
  student: one(students, {
    fields: [monthlyCheckups.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [monthlyCheckups.schoolId],
    references: [schools.id],
  }),
  recordedByUser: one(users, {
    fields: [monthlyCheckups.recordedBy],
    references: [users.id],
  }),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  school: one(schools, {
    fields: [mealLogs.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [mealLogs.studentId],
    references: [students.id],
  }),
  uploadedByUser: one(users, {
    fields: [mealLogs.uploadedBy],
    references: [users.id],
  }),
}));

export const hostelAttendanceRelations = relations(hostelAttendance, ({ one }) => ({
  student: one(students, {
    fields: [hostelAttendance.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [hostelAttendance.schoolId],
    references: [schools.id],
  }),
  recordedByUser: one(users, {
    fields: [hostelAttendance.recordedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  student: one(students, {
    fields: [referrals.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [referrals.schoolId],
    references: [schools.id],
  }),
  healthCard: one(annualHealthCards, {
    fields: [referrals.healthCardId],
    references: [annualHealthCards.id],
  }),
  createdByUser: one(users, {
    fields: [referrals.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [referrals.updatedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
  }),
  relatedStudent: one(students, {
    fields: [notifications.relatedStudentId],
    references: [students.id],
  }),
  relatedSchool: one(schools, {
    fields: [notifications.relatedSchoolId],
    references: [schools.id],
  }),
}));

export const periodTrackerEntriesRelations = relations(periodTrackerEntries, ({ one }) => ({
  student: one(students, {
    fields: [periodTrackerEntries.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [periodTrackerEntries.schoolId],
    references: [schools.id],
  }),
  recordedByUser: one(users, {
    fields: [periodTrackerEntries.recordedBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnualHealthCardSchema = createInsertSchema(annualHealthCards).omit({ id: true, createdAt: true, updatedAt: true }).extend({
   // Required field validations
   studentId: z.string().min(1, "Student ID is required"),
   schoolId: z.string().min(1, "School ID is required"),
   year: z.number().min(2020, "Year must be 2020 or later").max(new Date().getFullYear() + 1, "Year cannot be in the future"),
   nameOfChild: z.string().min(1, "Student name is required").max(100, "Name too long"),
   classSection: z.string().min(1, "Class section is required"),
   gender: z.enum(genderEnum, { required_error: "Gender is required" }),
   weightKg: z.number().min(1, "Weight must be at least 1kg").max(200, "Weight seems unrealistic"),
   heightCm: z.number().min(30, "Height must be at least 30cm").max(250, "Height seems unrealistic"),
  aadhaarNo: z.string().optional().refine((val) => !val || val.length === 12, "Aadhaar number must be 12 digits"),
  pranNo: z.string().optional().refine((val) => !val || val.length >= 6, "PRAN number seems invalid"),
   fatherGuardianName: z.string().optional().refine((val) => !val || val.length <= 100, "Name too long"),
   fatherContact: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), "Contact must be 10 digits"),
   motherName: z.string().optional().refine((val) => !val || val.length <= 100, "Name too long"),
   motherContact: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), "Contact must be 10 digits"),
   visionRight: z.string().optional().refine((val) => !val || /^6\/\d{1,2}$/.test(val), "Vision format should be 6/X"),
   visionLeft: z.string().optional().refine((val) => !val || /^6\/\d{1,2}$/.test(val), "Vision format should be 6/X"),
   bloodPressure: z.string().optional().refine((val) => !val || /^\d{2,3}\/\d{2,3}$/.test(val), "BP format should be systolic/diastolic"),
   sbp: z.number().optional().refine((val) => !val || (val >= 60 && val <= 250), "SBP out of normal range"),
   dbp: z.number().optional().refine((val) => !val || (val >= 40 && val <= 150), "DBP out of normal range"),
   // Menstrual cycle validations removed
  c7_clinical_features: z.object({
    sensory_deficit_in_lesion: z.boolean().optional(),
    hypopigmented_anaesthetic_patches: z.boolean().optional(),
    thickened_peripheral_nerves: z.boolean().optional(),
    nodules_plaques: z.boolean().optional(),
    ulceration_trophic_changes_deformity: z.boolean().optional(),
  }).optional(),
  c7_types: z.object({
    patchy: z.boolean().optional(),
    plaque: z.boolean().optional(),
    nodular: z.boolean().optional(),
    diffuse: z.boolean().optional(),
  }).optional(),
  c7_nerve_involvement: z.object({
    behind_ear: z.boolean().optional(),
    elbow: z.boolean().optional(),
    wrist: z.boolean().optional(),
    knee: z.boolean().optional(),
    ankle: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  c7_functional_impact: z.object({
    sensory_loss: z.string().optional(),
    motor_weakness: z.string().optional(),
    contractures: z.string().optional(),
  }).optional(),
  c7: z.record(z.any()).optional(),
  c7_suspected: z.boolean().optional(),
  c8: z.record(z.any()).optional(),
  c8_suspected: z.boolean().optional(),

  c8_symptoms: z.object({
    persistent_cough: z.boolean().optional(),
    fever: z.boolean().optional(),
    unexplained_weight_loss: z.boolean().optional(),
    night_sweats: z.boolean().optional(),
    lethargy_fatigue: z.boolean().optional(),
    respiratory_distress: z.boolean().optional(),
    hemoptysis: z.string().optional(),
  }).optional(),
  c8_relevant_history: z.object({
    known_contact: z.boolean().optional(),
    previous_tb_treatment: z.boolean().optional(),
  }).optional(),
  c8_extra_pulmonary: z.object({
    lymph_node_enlargement: z.string().optional(),
    abdominal_mass_ascites: z.boolean().optional(),
    joint_pain_swelling: z.string().optional(),
    spine_pain_gibbus: z.boolean().optional(),
    neurological_symptoms: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  // Add referral_date fields as dates
  b1_referral_date: z.coerce.date().nullable().optional(),
  b2_referral_date: z.coerce.date().nullable().optional(),
  b3_referral_date: z.coerce.date().nullable().optional(),
  b4_referral_date: z.coerce.date().nullable().optional(),
  b5_referral_date: z.coerce.date().nullable().optional(),
  b6_referral_date: z.coerce.date().nullable().optional(),
  b7_referral_date: z.coerce.date().nullable().optional(),
  b8_referral_date: z.coerce.date().nullable().optional(),
  c1_referral_date: z.coerce.date().nullable().optional(),
  c2_referral_date: z.coerce.date().nullable().optional(),
  c3_referral_date: z.coerce.date().nullable().optional(),
  c4_referral_date: z.coerce.date().nullable().optional(),
  c5_referral_date: z.coerce.date().nullable().optional(),
  c6_referral_date: z.coerce.date().nullable().optional(),
  c7_referral_date: z.coerce.date().nullable().optional(),
  c8_referral_date: z.coerce.date().nullable().optional(),
  d1_referral_date: z.coerce.date().nullable().optional(),
  d2_referral_date: z.coerce.date().nullable().optional(),
  d3_referral_date: z.coerce.date().nullable().optional(),
  d4_referral_date: z.coerce.date().nullable().optional(),
  d5_referral_date: z.coerce.date().nullable().optional(),
  d6_referral_date: z.coerce.date().nullable().optional(),
  d7_referral_date: z.coerce.date().nullable().optional(),
  d8_referral_date: z.coerce.date().nullable().optional(),
  d9_referral_date: z.coerce.date().nullable().optional(),
  e1_referral_date: z.coerce.date().nullable().optional(),
  e2_referral_date: z.coerce.date().nullable().optional(),
  e3_referral_date: z.coerce.date().nullable().optional(),
  e4_referral_date: z.coerce.date().nullable().optional(),
  e5_referral_date: z.coerce.date().nullable().optional(),
  e6_referral_date: z.coerce.date().nullable().optional(),
  e7_referral_date: z.coerce.date().nullable().optional(),

  // Client field names for adolescent health (non-menstrual)
  e1_difficulty_life_events: z.boolean().optional(),
  e2_peer_pressure: z.boolean().optional(),
  e3_persistent_sadness: z.boolean().optional(),
  e5_pain_urination: z.boolean().optional(),
  e6_foul_smell_discharge: z.boolean().optional(),
  e1_referral_suggested: z.boolean().optional(),
  e2_referral_suggested: z.boolean().optional(),
  e3_referral_suggested: z.boolean().optional(),
  e5_referral_suggested: z.boolean().optional(),
  e6_referral_suggested: z.boolean().optional(),

  // E4 & E7: Female-only menstrual health fields
  e4_menstruation_started: z.boolean().optional(),
  e4_referral_suggested: z.boolean().optional(),
  e4_referral_facility: z.string().nullable().optional(),
  e7_severe_menstrual_pain: z.boolean().optional(),
  e7_referral_suggested: z.boolean().optional(),

  // Detailed Menstrual Cycle Tracking
  menstrual_cycle_regular: z.boolean().optional(),
  menstrual_cycle_length_days: z.number().min(20).max(40).optional(),
  menstrual_period_duration_days: z.number().min(1).max(10).optional(),
  menstrual_last_period_date: z.coerce.date().nullable().optional(),
  menstrual_irregularities: z.record(z.any()).optional(),
  menstrual_symptoms: z.record(z.any()).optional(),
  menstrual_hygiene_practices: z.record(z.any()).optional(),
  menstrual_educational_resources_accessed: z.boolean().optional(),


  // Additional fields
  bpCategory: z.string().optional(),
  // bmi_category is now calculated automatically, not user-input
  a1_visible_defect: z.boolean().optional(),
  a1_visible_defect_notes: z.string().nullable().optional(),
  a1_referral_facility: z.string().nullable().optional(),
  /* B1 - B8 */
  b1_severe_thinning: z.boolean().optional(),
  b1_counsel_moderate: z.boolean().optional(),
  b1_referral_facility: z.string().nullable().optional(),
  b2_bilateral_oedema: z.boolean().optional(),
  b2_referral_facility: z.string().nullable().optional(),
  b3_severe_anemia: z.boolean().optional(),
  b3_referral_facility: z.string().nullable().optional(),
  b4_vitamin_a_deficiency: z.boolean().optional(),
  b4_night_blindness: z.boolean().optional(),
  b4_bitots_spots: z.boolean().optional(),
  b4_referral_facility: z.string().nullable().optional(),
  b5_vitamin_d_deficiency: z.boolean().optional(),
  b5_wrist_widening: z.boolean().optional(),
  b5_bowing_legs: z.boolean().optional(),
  b5_referral_facility: z.string().nullable().optional(),
  b6_goitre: z.boolean().optional(),
  b6_referral_facility: z.string().nullable().optional(),
  b7_obesity: z.boolean().optional(),
  b7_referral_facility: z.string().nullable().optional(),
  b8_vitb_deficiency: z.boolean().optional(),
  b8_angular_stomatitis: z.boolean().optional(),
  b8_raw_tongue: z.boolean().optional(),
  b8_corneal_vascularization: z.boolean().optional(),
  b8_referral_facility: z.string().nullable().optional(),
  symptoms: z.array(z.string()).optional(),
  suggestedMedicines: z.array(z.string()).optional(),
  c1: z.boolean().optional(),
  c2: z.boolean().optional(),
  c3: z.boolean().optional(),
  c4: z.boolean().optional(),
  c5: z.boolean().optional(),
  c6: z.boolean().optional(),
  d1: z.boolean().optional(),
  d2: z.boolean().optional(),
  d3: z.boolean().optional(),
  d4: z.boolean().optional(),
  d5: z.boolean().optional(),
  d6: z.boolean().optional(),
  d7: z.boolean().optional(),
  d8: z.boolean().optional(),
  d9: z.boolean().optional(),
  // Add full field names for C and D sections
  c1_convulsive: z.boolean().optional(),
  c2_otitis_media: z.boolean().optional(),
  c3_dental: z.boolean().optional(),
  c4_skin_conditions: z.boolean().optional(),
  c5_asthma: z.boolean().optional(),
  c6_rheumatic_heart: z.boolean().optional(),
  c1_referral_facility: z.string().nullable().optional(),
  c2_referral_facility: z.string().nullable().optional(),
  c3_referral_facility: z.string().nullable().optional(),
  c4_referral_facility: z.string().nullable().optional(),
  c5_referral_facility: z.string().nullable().optional(),
  c6_referral_facility: z.string().nullable().optional(),
  c7_referral_facility: z.string().nullable().optional(),
  c8_referral_facility: z.string().nullable().optional(),
  c9_suspected: z.boolean().optional(),
  c9_clinical_features: z.record(z.boolean()).optional(),
  c9_hemoglobin_type: z.record(z.boolean()).optional(),
  c9_referral_facility: z.string().nullable().optional(),
  c9_referral_date: z.coerce.date().nullable().optional(),
  d1_seeing_difficulty: z.boolean().optional(),
  d2_walking_delay: z.boolean().optional(),
  d3_reading_writing: z.boolean().optional(),
  d4_muscle_stiffness: z.boolean().optional(),
  d5_hearing_difficulty: z.boolean().optional(),
  d6_speech_difficulty: z.boolean().optional(),
  d7_learning_difficulty: z.boolean().optional(),
  d8_inattention_hyperactivity: z.boolean().optional(),
  d9_behavioral_concerns: z.boolean().optional(),
  d1_referral_facility: z.string().nullable().optional(),
  d2_referral_facility: z.string().nullable().optional(),
  d3_referral_facility: z.string().nullable().optional(),
  d4_referral_facility: z.string().nullable().optional(),
  d5_referral_facility: z.string().nullable().optional(),
  d6_referral_facility: z.string().nullable().optional(),
  d7_referral_facility: z.string().nullable().optional(),
  d8_referral_facility: z.string().nullable().optional(),
  d9_referral_facility: z.string().nullable().optional(),
  e1_referral_facility: z.string().nullable().optional(),
  e2_referral_facility: z.string().nullable().optional(),
  e3_referral_facility: z.string().nullable().optional(),
  e5_referral_facility: z.string().nullable().optional(),
  e6_referral_facility: z.string().nullable().optional(),
  e7_referral_facility: z.string().nullable().optional(),


  doctor_mht_name: z.string().optional(),
  doctor_signature_date: z.coerce.date().nullable().optional(),
  data_entry_register: z.boolean().optional(),
  date_of_visit: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  dataEntryBy: z.string().optional(),
  approvalBy: z.string().optional(),
  approvalDate: z.coerce.date().optional(),
  rejectionReason: z.string().optional(),
});

export const insertMonthlyCheckupSchema = createInsertSchema(monthlyCheckups).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  treatmentType: z.enum(treatmentTypeEnum).optional(),
  symptoms: z.array(z.string()).optional(),
  suggestedMedicines: z.array(z.string()).optional(),
});

export const insertMealLogSchema = createInsertSchema(mealLogs).omit({ id: true, createdAt: true }).extend({
  mealType: z.enum(mealTypeEnum),
  menuItems: z.array(z.string()).optional(),
});

export const insertHostelAttendanceSchema = createInsertSchema(hostelAttendance).omit({ id: true, createdAt: true }).extend({
  recorderRole: z.enum(hostelAttendanceRecorderEnum).optional(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export const insertStudentAcademicActionSchema = createInsertSchema(studentAcademicActions).omit({ id: true, createdAt: true, performedAt: true }).extend({
  actionType: z.enum(academicActionEnum),
  oldStatus: z.enum(academicStatusEnum),
  newStatus: z.enum(academicStatusEnum),
  performedByRole: z.enum(roleEnum),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(statusEnum).optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  senderRole: z.enum(roleEnum),
  receiverRole: z.enum(roleEnum),
  type: z.enum(notificationTypeEnum),
});

export const insertPeriodTrackerEntrySchema = createInsertSchema(periodTrackerEntries).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  flowCategory: z.enum(flowCategoryEnum).optional(),
  moods: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  painIntensity: z.number().min(0).max(10).optional(),
  bodyTemperatureCelsius: z.number().min(35).max(42).optional(),
  entryDate: z.coerce.date(),
});

export const updateAnnualHealthCardSchema = insertAnnualHealthCardSchema.partial();

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(roleEnum).default("ClassTeacher"),
  schoolId: z.string().optional(),
  classSection: z.string().optional(), // For ClassTeacher - assigned class
  region: z.string().optional(), // For PO - region matching schools
  district: z.string().optional(),
  block: z.string().optional(),
}).refine((data) => {
  // ClassTeacher and Headmaster MUST have schoolId
  if ((data.role === "ClassTeacher" || data.role === "Headmaster" || data.role === "MedicalTeam" || data.role === "HostelWarden") && !data.schoolId) {
    return false;
  }
  // ClassTeacher MUST have classSection
  if (data.role === "ClassTeacher" && !data.classSection) {
    return false;
  }
  // PO MUST have region, district, and block
  if (data.role === "PO" && (!data.region || !data.district || !data.block)) {
    return false;
  }
  return true;
}, {
  message: "School ID is required for ClassTeacher, Headmaster, and MedicalTeam roles. ClassTeacher also requires classSection. PO requires region, district, and block.",
  path: ["schoolId"],
});

export const healthCardSchema = z.object({
  // Removed referral_date fields
  // Add other fields as needed based on the health card structure
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertAnnualHealthCard = z.infer<typeof insertAnnualHealthCardSchema>;
export type AnnualHealthCard = typeof annualHealthCards.$inferSelect;

export type InsertMonthlyCheckup = z.infer<typeof insertMonthlyCheckupSchema>;
export type MonthlyCheckup = typeof monthlyCheckups.$inferSelect;

export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type MealLog = typeof mealLogs.$inferSelect;

export type InsertHostelAttendance = z.infer<typeof insertHostelAttendanceSchema>;
export type HostelAttendance = typeof hostelAttendance.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertStudentAcademicAction = typeof studentAcademicActions.$inferInsert;
export type StudentAcademicAction = typeof studentAcademicActions.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertPeriodTrackerEntry = z.infer<typeof insertPeriodTrackerEntrySchema>;
export type PeriodTrackerEntry = typeof periodTrackerEntries.$inferSelect;

export type UpdateAnnualHealthCard = z.infer<typeof updateAnnualHealthCardSchema>;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = exports.loginSchema = exports.updateAnnualHealthCardSchema = exports.insertPeriodTrackerEntrySchema = exports.insertNotificationSchema = exports.insertReferralSchema = exports.insertStudentAcademicActionSchema = exports.insertAuditLogSchema = exports.insertHostelAttendanceSchema = exports.insertMealLogSchema = exports.insertMonthlyCheckupSchema = exports.insertAnnualHealthCardSchema = exports.insertStudentSchema = exports.insertSchoolSchema = exports.insertUserSchema = exports.periodTrackerEntriesRelations = exports.notificationsRelations = exports.referralsRelations = exports.auditLogsRelations = exports.hostelAttendanceRelations = exports.mealLogsRelations = exports.monthlyCheckupsRelations = exports.annualHealthCardsRelations = exports.studentsRelations = exports.schoolsRelations = exports.usersRelations = exports.periodTrackerEntries = exports.notifications = exports.referrals = exports.refreshTokens = exports.studentAcademicActions = exports.auditLogs = exports.hostelAttendance = exports.hostelAttendanceRecorderEnum = exports.mealLogs = exports.monthlyCheckups = exports.annualHealthCards = exports.students = exports.schools = exports.users = exports.academicActionEnum = exports.academicStatusEnum = exports.schoolTypeEnum = exports.flowCategoryEnum = exports.notificationTypeEnum = exports.mealTypeEnum = exports.treatmentTypeEnum = exports.statusEnum = exports.genderEnum = exports.roleEnum = void 0;
exports.healthCardSchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_2 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
exports.roleEnum = ["PO", "Headmaster", "ClassTeacher", "MedicalTeam", "Admin", "HostelWarden", "MealSuperintendent", "Lady Superintendent"];
exports.genderEnum = ["M", "F", "O"];
exports.statusEnum = ["Pending", "Approved", "Rejected", "Completed"];
exports.treatmentTypeEnum = ["Primary", "Referred"];
exports.mealTypeEnum = ["breakfast", "lunch", "dinner"];
exports.notificationTypeEnum = ["system", "manual", "health_alert", "meal_alert"];
exports.flowCategoryEnum = ["none", "spotting", "light", "medium", "heavy"];
exports.schoolTypeEnum = ["Government", "Aided"];
exports.academicStatusEnum = ["Active", "Promoted", "Demoted", "Detained"];
exports.academicActionEnum = ["Promote", "Demote", "Detain"];
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    role: (0, pg_core_1.text)("role").notNull().$type(),
    schoolId: (0, pg_core_1.varchar)("school_id"),
    classSection: (0, pg_core_1.text)("class_section"), // For ClassTeacher - assigned class
    district: (0, pg_core_1.text)("district"),
    block: (0, pg_core_1.text)("block"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    approvalStatus: (0, pg_core_1.text)("approval_status").notNull().$type().default("Approved"),
    approverId: (0, pg_core_1.varchar)("approver_id"),
    approverNote: (0, pg_core_1.text)("approver_note"),
    requestedAt: (0, pg_core_1.timestamp)("requested_at"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.schools = (0, pg_core_1.pgTable)("schools", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    code: (0, pg_core_1.text)("code").unique(),
    schoolType: (0, pg_core_1.text)("school_type").notNull().$type(),
    region: (0, pg_core_1.text)("region").notNull(), // Region for PO matching
    district: (0, pg_core_1.text)("district").notNull(),
    block: (0, pg_core_1.text)("block").notNull(),
    address: (0, pg_core_1.text)("address"),
    contactPhone: (0, pg_core_1.text)("contact_phone"),
    contactEmail: (0, pg_core_1.text)("contact_email"),
    latitude: (0, pg_core_1.decimal)("latitude", { precision: 10, scale: 8 }),
    longitude: (0, pg_core_1.decimal)("longitude", { precision: 11, scale: 8 }),
    headmasterId: (0, pg_core_1.varchar)("headmaster_id"),
    totalStudents: (0, pg_core_1.integer)("total_students").default(0),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    // Approval workflow fields
    approvalStatus: (0, pg_core_1.text)("approval_status").default("Pending"),
    approverId: (0, pg_core_1.varchar)("approver_id"),
    approverNote: (0, pg_core_1.text)("approver_note"),
    requestedByEmail: (0, pg_core_1.text)("requested_by_email"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.students = (0, pg_core_1.pgTable)("students", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    uniqueId: (0, pg_core_1.text)("unique_id").notNull().unique(),
    aadhaarNo: (0, pg_core_1.text)("aadhaar_no"),
    pranNo: (0, pg_core_1.text)("pran_no"),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    dateOfBirth: (0, pg_core_1.date)("date_of_birth"),
    gender: (0, pg_core_1.text)("gender").notNull().$type(),
    classSection: (0, pg_core_1.text)("class_section").notNull(),
    fatherGuardianName: (0, pg_core_1.text)("father_guardian_name"),
    fatherContact: (0, pg_core_1.text)("father_contact"),
    motherName: (0, pg_core_1.text)("mother_name"),
    motherContact: (0, pg_core_1.text)("mother_contact"),
    address: (0, pg_core_1.text)("address"),
    enrollmentDate: (0, pg_core_1.date)("enrollment_date"),
    schoolAdmissionDate: (0, pg_core_1.date)("school_admission_date").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    // Menstruation marking: set once by ClassTeacher when first cycle starts
    menstruationStartedAt: (0, pg_core_1.timestamp)("menstruation_started_at"),
    menstruationMarkedBy: (0, pg_core_1.varchar)("menstruation_marked_by"),
    // Academic status tracking
    academicStatus: (0, pg_core_1.text)("academic_status").notNull().$type().default("Active"),
    academicYear: (0, pg_core_1.integer)("academic_year").default((0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM CURRENT_DATE)`),
    previousClassSection: (0, pg_core_1.text)("previous_class_section"),
});
exports.annualHealthCards = (0, pg_core_1.pgTable)("annual_health_cards", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    year: (0, pg_core_1.integer)("year").notNull(),
    district: (0, pg_core_1.text)("district"),
    block: (0, pg_core_1.text)("block"),
    schoolName: (0, pg_core_1.text)("school_name"),
    schoolId: (0, pg_core_1.varchar)("school_id"),
    mobileHealthTeamId: (0, pg_core_1.text)("mobile_health_team_id"),
    nameOfChild: (0, pg_core_1.text)("name_of_child"),
    ageYears: (0, pg_core_1.integer)("age_years"),
    ageMonths: (0, pg_core_1.integer)("age_months"),
    gender: (0, pg_core_1.text)("gender").$type(),
    classSection: (0, pg_core_1.text)("class_section"),
    aadhaarNo: (0, pg_core_1.text)("aadhaar_no"),
    pranNo: (0, pg_core_1.text)("pran_no"),
    uniqueId: (0, pg_core_1.text)("unique_id"),
    fatherGuardianName: (0, pg_core_1.text)("father_guardian_name"),
    fatherContact: (0, pg_core_1.text)("father_contact"),
    motherName: (0, pg_core_1.text)("mother_name"),
    weightKg: (0, pg_core_1.decimal)("weight_kg", { precision: 5, scale: 2 }),
    heightCm: (0, pg_core_1.decimal)("height_cm", { precision: 5, scale: 2 }),
    bmi: (0, pg_core_1.decimal)("bmi", { precision: 5, scale: 2 }),
    bloodPressure: (0, pg_core_1.text)("blood_pressure"),
    bpCategory: (0, pg_core_1.text)("bp_category"),
    sbp: (0, pg_core_1.integer)("sbp"),
    dbp: (0, pg_core_1.integer)("dbp"),
    visionRight: (0, pg_core_1.text)("vision_right"),
    visionLeft: (0, pg_core_1.text)("vision_left"),
    visualAcuitySnellen: (0, pg_core_1.text)("visual_acuity_snellen"),
    visualAcuityNotes: (0, pg_core_1.text)("visual_acuity_notes"),
    defectAtBirth: (0, pg_core_1.boolean)("defect_at_birth").default(false),
    defectsAtBirth: (0, pg_core_1.jsonb)("defects_at_birth").$type().default([]),
    /* Section A: Defects at Birth */
    a1_visible_defect: (0, pg_core_1.boolean)("a1_visible_defect").default(false),
    a1_visible_defect_notes: (0, pg_core_1.text)("a1_visible_defect_notes"),
    a1_referral_facility: (0, pg_core_1.text)("a1_referral_facility"),
    a1_referral_date: (0, pg_core_1.date)("a1_referral_date"),
    /* Section A: Summary of Defects at Birth */
    summary_defects_neural_tube: (0, pg_core_1.boolean)("summary_defects_neural_tube").default(false),
    summary_defects_down_syndrome: (0, pg_core_1.boolean)("summary_defects_down_syndrome").default(false),
    summary_defects_cleft: (0, pg_core_1.boolean)("summary_defects_cleft").default(false),
    summary_defects_talipes: (0, pg_core_1.boolean)("summary_defects_talipes").default(false),
    summary_defects_hip_dysplasia: (0, pg_core_1.boolean)("summary_defects_hip_dysplasia").default(false),
    summary_defects_congenital_deafness: (0, pg_core_1.boolean)("summary_defects_congenital_deafness").default(false),
    summary_defects_other: (0, pg_core_1.text)("summary_defects_other"),
    /* Section B: Deficiencies */
    deficiencySam: (0, pg_core_1.boolean)("deficiency_sam").default(false),
    deficiencyOedema: (0, pg_core_1.boolean)("deficiency_oedema").default(false),
    deficiencyAnemia: (0, pg_core_1.boolean)("deficiency_anemia").default(false),
    deficiencyVitaminA: (0, pg_core_1.boolean)("deficiency_vitamin_a").default(false),
    deficiencyVitaminD: (0, pg_core_1.boolean)("deficiency_vitamin_d").default(false),
    deficiencyGoitre: (0, pg_core_1.boolean)("deficiency_goitre").default(false),
    deficiencyObesity: (0, pg_core_1.boolean)("deficiency_obesity").default(false),
    deficiencyVitaminB: (0, pg_core_1.boolean)("deficiency_vitamin_b").default(false),
    deficiencies: (0, pg_core_1.jsonb)("deficiencies").$type().default([]),
    /* Section B: Deficiencies — B1 to B8 with detailed referral capture */
    b1_severe_thinning: (0, pg_core_1.boolean)("b1_severe_thinning").default(false),
    b1_counsel_moderate: (0, pg_core_1.boolean)("b1_counsel_moderate").default(false),
    b1_referral_facility: (0, pg_core_1.text)("b1_referral_facility"),
    b1_referral_date: (0, pg_core_1.date)("b1_referral_date"),
    b2_bilateral_oedema: (0, pg_core_1.boolean)("b2_bilateral_oedema").default(false),
    b2_referral_facility: (0, pg_core_1.text)("b2_referral_facility"),
    b2_referral_date: (0, pg_core_1.date)("b2_referral_date"),
    b3_severe_anemia: (0, pg_core_1.boolean)("b3_severe_anemia").default(false),
    b3_referral_facility: (0, pg_core_1.text)("b3_referral_facility"),
    b3_referral_date: (0, pg_core_1.date)("b3_referral_date"),
    b4_vitamin_a_deficiency: (0, pg_core_1.boolean)("b4_vitamin_a_deficiency").default(false),
    b4_night_blindness: (0, pg_core_1.boolean)("b4_night_blindness").default(false),
    b4_bitots_spots: (0, pg_core_1.boolean)("b4_bitots_spots").default(false),
    b4_referral_facility: (0, pg_core_1.text)("b4_referral_facility"),
    b4_referral_date: (0, pg_core_1.date)("b4_referral_date"),
    b5_vitamin_d_deficiency: (0, pg_core_1.boolean)("b5_vitamin_d_deficiency").default(false),
    b5_wrist_widening: (0, pg_core_1.boolean)("b5_wrist_widening").default(false),
    b5_bowing_legs: (0, pg_core_1.boolean)("b5_bowing_legs").default(false),
    b5_referral_facility: (0, pg_core_1.text)("b5_referral_facility"),
    b5_referral_date: (0, pg_core_1.date)("b5_referral_date"),
    b6_goitre: (0, pg_core_1.boolean)("b6_goitre").default(false),
    b6_referral_facility: (0, pg_core_1.text)("b6_referral_facility"),
    b6_referral_date: (0, pg_core_1.date)("b6_referral_date"),
    b7_obesity: (0, pg_core_1.boolean)("b7_obesity").default(false),
    b7_referral_facility: (0, pg_core_1.text)("b7_referral_facility"),
    b7_referral_date: (0, pg_core_1.date)("b7_referral_date"),
    b8_vitb_deficiency: (0, pg_core_1.boolean)("b8_vitb_deficiency").default(false),
    b8_angular_stomatitis: (0, pg_core_1.boolean)("b8_angular_stomatitis").default(false),
    b8_raw_tongue: (0, pg_core_1.boolean)("b8_raw_tongue").default(false),
    b8_corneal_vascularization: (0, pg_core_1.boolean)("b8_corneal_vascularization").default(false),
    b8_referral_facility: (0, pg_core_1.text)("b8_referral_facility"),
    b8_referral_date: (0, pg_core_1.date)("b8_referral_date"),
    /* Section B: Summary of Deficiencies */
    summary_deficiency_anemia: (0, pg_core_1.boolean)("summary_deficiency_anemia").default(false),
    summary_deficiency_vitamin_a: (0, pg_core_1.boolean)("summary_deficiency_vitamin_a").default(false),
    summary_deficiency_vitamin_d: (0, pg_core_1.boolean)("summary_deficiency_vitamin_d").default(false),
    summary_deficiency_sam_stunting: (0, pg_core_1.boolean)("summary_deficiency_sam_stunting").default(false),
    summary_deficiency_goitre: (0, pg_core_1.boolean)("summary_deficiency_goitre").default(false),
    summary_deficiency_vitamin_b: (0, pg_core_1.boolean)("summary_deficiency_vitamin_b").default(false),
    summary_deficiency_other: (0, pg_core_1.text)("summary_deficiency_other"),
    /* Section C: Diseases — C1 to C6 with referral */
    c1_convulsive: (0, pg_core_1.boolean)("c1_convulsive").default(false),
    c1_referral_facility: (0, pg_core_1.text)("c1_referral_facility"),
    c1_referral_date: (0, pg_core_1.date)("c1_referral_date"),
    c2_otitis_media: (0, pg_core_1.boolean)("c2_otitis_media").default(false),
    c2_assess_hearing: (0, pg_core_1.boolean)("c2_assess_hearing").default(false),
    c2_referral_facility: (0, pg_core_1.text)("c2_referral_facility"),
    c2_referral_date: (0, pg_core_1.date)("c2_referral_date"),
    c3_dental: (0, pg_core_1.boolean)("c3_dental").default(false),
    c3_white_discoloration: (0, pg_core_1.boolean)("c3_white_discoloration").default(false),
    c3_brown_discoloration: (0, pg_core_1.boolean)("c3_brown_discoloration").default(false),
    c3_gum_swelling: (0, pg_core_1.boolean)("c3_gum_swelling").default(false),
    c3_plaque: (0, pg_core_1.boolean)("c3_plaque").default(false),
    c3_referral_facility: (0, pg_core_1.text)("c3_referral_facility"),
    c3_referral_date: (0, pg_core_1.date)("c3_referral_date"),
    c4_skin_conditions: (0, pg_core_1.boolean)("c4_skin_conditions").default(false),
    c4_itching: (0, pg_core_1.boolean)("c4_itching").default(false),
    c4_scaly_lesions: (0, pg_core_1.boolean)("c4_scaly_lesions").default(false),
    c4_round_lesions: (0, pg_core_1.boolean)("c4_round_lesions").default(false),
    c4_referral_facility: (0, pg_core_1.text)("c4_referral_facility"),
    c4_referral_date: (0, pg_core_1.date)("c4_referral_date"),
    c5_asthma: (0, pg_core_1.boolean)("c5_asthma").default(false),
    c5_breathlessness: (0, pg_core_1.boolean)("c5_breathlessness").default(false),
    c5_wheezing: (0, pg_core_1.boolean)("c5_wheezing").default(false),
    c5_referral_facility: (0, pg_core_1.text)("c5_referral_facility"),
    c5_referral_date: (0, pg_core_1.date)("c5_referral_date"),
    c6_rheumatic_heart: (0, pg_core_1.boolean)("c6_rheumatic_heart").default(false),
    c6_murmur: (0, pg_core_1.boolean)("c6_murmur").default(false),
    c6_referral_facility: (0, pg_core_1.text)("c6_referral_facility"),
    c6_referral_date: (0, pg_core_1.date)("c6_referral_date"),
    /* Section C7: Childhood Leprosy Disease (Hansen's Disease) */
    c7_suspected: (0, pg_core_1.boolean)("c7_suspected").default(false),
    /* C7.1 Skin Lesion Assessment */
    c7_skin_lesion_present: (0, pg_core_1.boolean)("c7_skin_lesion_present").default(false),
    c7_hypopigmented_reddish_lesion: (0, pg_core_1.boolean)("c7_hypopigmented_reddish_lesion").default(false),
    c7_lesion_sensory_deficit: (0, pg_core_1.boolean)("c7_lesion_sensory_deficit").default(false),
    c7_skin_characteristics: (0, pg_core_1.jsonb)("c7_skin_characteristics").$type().default({}),
    c7_num_lesions: (0, pg_core_1.text)("c7_num_lesions"), // '1-5' or 'more-than-5'
    c7_lesion_type: (0, pg_core_1.jsonb)("c7_lesion_type").$type().default({}),
    /* C7.2 Peripheral Nerve Involvement */
    c7_nerves_involved: (0, pg_core_1.jsonb)("c7_nerves_involved").$type().default({}),
    c7_nerve_signs: (0, pg_core_1.jsonb)("c7_nerve_signs").$type().default({}),
    /* C7.3 Contractures & Deformities */
    c7_contractures_deformities: (0, pg_core_1.jsonb)("c7_contractures_deformities").$type().default({}),
    /* C7 Referral */
    c7_referral_facility: (0, pg_core_1.text)("c7_referral_facility"),
    c7_referral_date: (0, pg_core_1.date)("c7_referral_date"),
    /* Section C8: Childhood Tubercular Disease */
    c8_suspected: (0, pg_core_1.boolean)("c8_suspected").default(false),
    /* C8.1 Pulmonary TB Screening - Cough */
    c8_cough_gt14_days: (0, pg_core_1.boolean)("c8_cough_gt14_days").default(false),
    c8_cough_antibiotics_failed: (0, pg_core_1.boolean)("c8_cough_antibiotics_failed").default(false),
    c8_cough_with_bronchodilators_failed: (0, pg_core_1.boolean)("c8_cough_with_bronchodilators_failed").default(false),
    /* C8.2 Persistent Fever */
    c8_persistent_fever: (0, pg_core_1.boolean)("c8_persistent_fever").default(false),
    c8_fever_temperature: (0, pg_core_1.decimal)("c8_fever_temperature", { precision: 4, scale: 1 }),
    c8_fever_duration_weeks: (0, pg_core_1.integer)("c8_fever_duration_weeks"),
    /* C8.3 Marked Reduction in */
    c8_reduced_playfulness: (0, pg_core_1.boolean)("c8_reduced_playfulness").default(false),
    c8_reduced_daily_activity: (0, pg_core_1.boolean)("c8_reduced_daily_activity").default(false),
    c8_reduced_appetite: (0, pg_core_1.boolean)("c8_reduced_appetite").default(false),
    c8_reduced_interaction: (0, pg_core_1.boolean)("c8_reduced_interaction").default(false),
    c8_reduction_duration_days: (0, pg_core_1.integer)("c8_reduction_duration_days"),
    /* C8.4 Headache and Irritability */
    c8_recent_headache_irritability: (0, pg_core_1.boolean)("c8_recent_headache_irritability").default(false),
    c8_altered_behavior: (0, pg_core_1.boolean)("c8_altered_behavior").default(false),
    c8_altered_behavior_duration_days: (0, pg_core_1.integer)("c8_altered_behavior_duration_days"),
    /* C8.5 Weight Loss */
    c8_weight_loss_gt5_percent: (0, pg_core_1.boolean)("c8_weight_loss_gt5_percent").default(false),
    c8_weight_loss_not_responding_deworming: (0, pg_core_1.boolean)("c8_weight_loss_not_responding_deworming").default(false),
    c8_weight_loss_not_responding_micronutrient: (0, pg_core_1.boolean)("c8_weight_loss_not_responding_micronutrient").default(false),
    c8_weight_loss_not_responding_nutrition: (0, pg_core_1.boolean)("c8_weight_loss_not_responding_nutrition").default(false),
    /* C8.6 Close Contact with TB */
    c8_close_contact_known_tb: (0, pg_core_1.boolean)("c8_close_contact_known_tb").default(false),
    c8_contact_relation: (0, pg_core_1.text)("c8_contact_relation"), // parents, siblings, relatives, caregivers, neighbors, teachers
    /* C8.7 Immunocompromised History */
    c8_measles_varicella_3mo: (0, pg_core_1.boolean)("c8_measles_varicella_3mo").default(false),
    c8_steroids_chemotherapy_1mo: (0, pg_core_1.boolean)("c8_steroids_chemotherapy_1mo").default(false),
    /* C8.8 Abdominal TB */
    c8_abdominal_pain_dull_aching: (0, pg_core_1.boolean)("c8_abdominal_pain_dull_aching").default(false),
    c8_abdominal_swelling: (0, pg_core_1.boolean)("c8_abdominal_swelling").default(false),
    c8_painless_abdominal_mass: (0, pg_core_1.boolean)("c8_painless_abdominal_mass").default(false),
    c8_hepatomegaly: (0, pg_core_1.boolean)("c8_hepatomegaly").default(false),
    c8_splenomegaly: (0, pg_core_1.boolean)("c8_splenomegaly").default(false),
    /* C8.9 TB Lymph Nodes */
    c8_lymph_node_swelling_painless: (0, pg_core_1.boolean)("c8_lymph_node_swelling_painless").default(false),
    c8_lymph_node_not_responding_antibiotics: (0, pg_core_1.boolean)("c8_lymph_node_not_responding_antibiotics").default(false),
    c8_lymph_node_characteristics: (0, pg_core_1.jsonb)("c8_lymph_node_characteristics").$type().default({}),
    /* C8.10 TB Spine */
    c8_spine_pain_stiffness: (0, pg_core_1.boolean)("c8_spine_pain_stiffness").default(false),
    c8_spinal_deformity: (0, pg_core_1.boolean)("c8_spinal_deformity").default(false),
    c8_cold_abscess: (0, pg_core_1.boolean)("c8_cold_abscess").default(false),
    c8_night_cries_typical: (0, pg_core_1.boolean)("c8_night_cries_typical").default(false),
    c8_kyphotic_deformity: (0, pg_core_1.boolean)("c8_kyphotic_deformity").default(false),
    /* C8.11 CNS TB */
    c8_altered_consciousness: (0, pg_core_1.boolean)("c8_altered_consciousness").default(false),
    c8_convulsions_no_fever: (0, pg_core_1.boolean)("c8_convulsions_no_fever").default(false),
    c8_vomiting_no_diarrhea: (0, pg_core_1.boolean)("c8_vomiting_no_diarrhea").default(false),
    c8_focal_neuro_deficit: (0, pg_core_1.boolean)("c8_focal_neuro_deficit").default(false),
    c8_abnormal_movements: (0, pg_core_1.boolean)("c8_abnormal_movements").default(false),
    c8_cranial_nerve_palsy: (0, pg_core_1.boolean)("c8_cranial_nerve_palsy").default(false),
    c8_neck_stiffness_rigidity: (0, pg_core_1.boolean)("c8_neck_stiffness_rigidity").default(false),
    /* C8.12 Severe Respiratory Disease */
    c8_respiratory_distress: (0, pg_core_1.boolean)("c8_respiratory_distress").default(false),
    c8_difficulty_breathing: (0, pg_core_1.boolean)("c8_difficulty_breathing").default(false),
    c8_persistent_cough_2weeks: (0, pg_core_1.boolean)("c8_persistent_cough_2weeks").default(false),
    c8_increased_respiratory_rate: (0, pg_core_1.boolean)("c8_increased_respiratory_rate").default(false),
    c8_difficult_pneumonia: (0, pg_core_1.boolean)("c8_difficult_pneumonia").default(false),
    /* C8.13 Bone & Joint TB */
    c8_limping_recent_onset: (0, pg_core_1.boolean)("c8_limping_recent_onset").default(false),
    c8_joint_pain_swelling: (0, pg_core_1.boolean)("c8_joint_pain_swelling").default(false),
    c8_bone_joint_night_cry: (0, pg_core_1.boolean)("c8_bone_joint_night_cry").default(false),
    /* C8 Referral */
    c8_referral_facility: (0, pg_core_1.text)("c8_referral_facility"),
    c8_referral_date: (0, pg_core_1.date)("c8_referral_date"),
    /* Section C9: Sickle Cell Anaemia */
    c9_suspected: (0, pg_core_1.boolean)("c9_suspected").default(false),
    /* C9.1 Clinical Features */
    c9_clinical_features: (0, pg_core_1.jsonb)("c9_clinical_features").$type().default({}),
    /* C9.2 Hemoglobin Type Classification */
    c9_hemoglobin_type: (0, pg_core_1.jsonb)("c9_hemoglobin_type").$type().default({}),
    /* C9 Referral */
    c9_referral_facility: (0, pg_core_1.text)("c9_referral_facility"),
    c9_referral_date: (0, pg_core_1.date)("c9_referral_date"),
    /* Section C: Summary of Diseases */
    summary_disease_skin_conditions: (0, pg_core_1.boolean)("summary_disease_skin_conditions").default(false),
    summary_disease_vision_impairment: (0, pg_core_1.boolean)("summary_disease_vision_impairment").default(false),
    summary_disease_hearing_impairment: (0, pg_core_1.boolean)("summary_disease_hearing_impairment").default(false),
    summary_disease_dental: (0, pg_core_1.boolean)("summary_disease_dental").default(false),
    summary_disease_reactive_airway: (0, pg_core_1.boolean)("summary_disease_reactive_airway").default(false),
    summary_disease_heart: (0, pg_core_1.boolean)("summary_disease_heart").default(false),
    summary_disease_convulsive: (0, pg_core_1.boolean)("summary_disease_convulsive").default(false),
    summary_disease_neuro_motor: (0, pg_core_1.boolean)("summary_disease_neuro_motor").default(false),
    summary_disease_cognitive_delay: (0, pg_core_1.boolean)("summary_disease_cognitive_delay").default(false),
    summary_disease_motor_delay: (0, pg_core_1.boolean)("summary_disease_motor_delay").default(false),
    summary_disease_speech_delay: (0, pg_core_1.boolean)("summary_disease_speech_delay").default(false),
    summary_disease_behavioral_disorder: (0, pg_core_1.boolean)("summary_disease_behavioral_disorder").default(false),
    summary_disease_tuberculosis: (0, pg_core_1.boolean)("summary_disease_tuberculosis").default(false),
    summary_disease_leprosy: (0, pg_core_1.boolean)("summary_disease_leprosy").default(false),
    summary_disease_sickle_cell_anaemia: (0, pg_core_1.boolean)("summary_disease_sickle_cell_anaemia").default(false),
    summary_disease_other: (0, pg_core_1.text)("summary_disease_other"),
    /* Section D: Developmental Delay/Disability — D1 to D9 with detailed referral */
    d1_seeing_difficulty: (0, pg_core_1.boolean)("d1_seeing_difficulty").default(false),
    d1_referral_facility: (0, pg_core_1.text)("d1_referral_facility"),
    d1_referral_date: (0, pg_core_1.date)("d1_referral_date"),
    d2_walking_delay: (0, pg_core_1.boolean)("d2_walking_delay").default(false),
    d2_referral_facility: (0, pg_core_1.text)("d2_referral_facility"),
    d2_referral_date: (0, pg_core_1.date)("d2_referral_date"),
    d3_reading_writing: (0, pg_core_1.boolean)("d3_reading_writing").default(false),
    d3_referral_facility: (0, pg_core_1.text)("d3_referral_facility"),
    d3_referral_date: (0, pg_core_1.date)("d3_referral_date"),
    d4_muscle_stiffness: (0, pg_core_1.boolean)("d4_muscle_stiffness").default(false),
    d4_referral_facility: (0, pg_core_1.text)("d4_referral_facility"),
    d4_referral_date: (0, pg_core_1.date)("d4_referral_date"),
    d5_hearing_difficulty: (0, pg_core_1.boolean)("d5_hearing_difficulty").default(false),
    d5_referral_facility: (0, pg_core_1.text)("d5_referral_facility"),
    d5_referral_date: (0, pg_core_1.date)("d5_referral_date"),
    d6_speech_difficulty: (0, pg_core_1.boolean)("d6_speech_difficulty").default(false),
    d6_referral_facility: (0, pg_core_1.text)("d6_referral_facility"),
    d6_referral_date: (0, pg_core_1.date)("d6_referral_date"),
    d7_learning_difficulty: (0, pg_core_1.boolean)("d7_learning_difficulty").default(false),
    d7_referral_facility: (0, pg_core_1.text)("d7_referral_facility"),
    d7_referral_date: (0, pg_core_1.date)("d7_referral_date"),
    d8_inattention_hyperactivity: (0, pg_core_1.boolean)("d8_inattention_hyperactivity").default(false),
    d8_referral_facility: (0, pg_core_1.text)("d8_referral_facility"),
    d8_referral_date: (0, pg_core_1.date)("d8_referral_date"),
    d9_behavioral_concerns: (0, pg_core_1.boolean)("d9_behavioral_concerns").default(false),
    d9_referral_facility: (0, pg_core_1.text)("d9_referral_facility"),
    d9_referral_date: (0, pg_core_1.date)("d9_referral_date"),
    /* Section E: Adolescent-Specific Questionnaire — E1 to E7 */
    /* Age gating: show only if age >= 10 years */
    /* Gender-specific: E4, E7 only for females */
    e1_life_events_difficulty: (0, pg_core_1.boolean)("e1_life_events_difficulty").default(false),
    e1_referral_suggested: (0, pg_core_1.boolean)("e1_referral_suggested").default(false),
    e1_referral_facility: (0, pg_core_1.text)("e1_referral_facility"),
    e1_referral_date: (0, pg_core_1.date)("e1_referral_date"),
    e2_peer_pressure_substance: (0, pg_core_1.boolean)("e2_peer_pressure_substance").default(false),
    e3_persistent_sadness: (0, pg_core_1.boolean)("e3_persistent_sadness").default(false),
    e5_pain_urination: (0, pg_core_1.boolean)("e5_pain_urination").default(false),
    e6_foul_discharge: (0, pg_core_1.boolean)("e6_foul_discharge").default(false),
    e2_referral_suggested: (0, pg_core_1.boolean)("e2_referral_suggested").default(false),
    e3_referral_suggested: (0, pg_core_1.boolean)("e3_referral_suggested").default(false),
    e5_referral_suggested: (0, pg_core_1.boolean)("e5_referral_suggested").default(false),
    e6_referral_suggested: (0, pg_core_1.boolean)("e6_referral_suggested").default(false),
    e2_referral_facility: (0, pg_core_1.text)("e2_referral_facility"),
    e2_referral_date: (0, pg_core_1.date)("e2_referral_date"),
    e3_referral_facility: (0, pg_core_1.text)("e3_referral_facility"),
    e3_referral_date: (0, pg_core_1.date)("e3_referral_date"),
    e5_referral_facility: (0, pg_core_1.text)("e5_referral_facility"),
    e5_referral_date: (0, pg_core_1.date)("e5_referral_date"),
    e6_referral_facility: (0, pg_core_1.text)("e6_referral_facility"),
    e6_referral_date: (0, pg_core_1.date)("e6_referral_date"),
    /* E4 & E7: Female-only menstrual health fields */
    e4_menstruation_started: (0, pg_core_1.boolean)("e4_menstruation_started").default(false),
    e4_referral_suggested: (0, pg_core_1.boolean)("e4_referral_suggested").default(false),
    e4_referral_facility: (0, pg_core_1.text)("e4_referral_facility"),
    e4_referral_date: (0, pg_core_1.date)("e4_referral_date"),
    e7_severe_menstrual_pain: (0, pg_core_1.boolean)("e7_severe_menstrual_pain").default(false),
    e7_referral_suggested: (0, pg_core_1.boolean)("e7_referral_suggested").default(false),
    e7_referral_facility: (0, pg_core_1.text)("e7_referral_facility"),
    e7_referral_date: (0, pg_core_1.date)("e7_referral_date"),
    /* Detailed Menstrual Cycle Tracking (Female students aged 10+) */
    menstrual_cycle_regular: (0, pg_core_1.boolean)("menstrual_cycle_regular").default(false),
    menstrual_cycle_length_days: (0, pg_core_1.integer)("menstrual_cycle_length_days"),
    menstrual_period_duration_days: (0, pg_core_1.integer)("menstrual_period_duration_days"),
    menstrual_last_period_date: (0, pg_core_1.date)("menstrual_last_period_date"),
    menstrual_irregularities: (0, pg_core_1.jsonb)("menstrual_irregularities").$type().default({}),
    menstrual_symptoms: (0, pg_core_1.jsonb)("menstrual_symptoms").$type().default({}),
    menstrual_hygiene_practices: (0, pg_core_1.jsonb)("menstrual_hygiene_practices").$type().default({}),
    menstrual_educational_resources_accessed: (0, pg_core_1.boolean)("menstrual_educational_resources_accessed").default(false),
    /* Section E: Summary of Adolescent Health Concerns */
    summary_adolescent_substance_use: (0, pg_core_1.boolean)("summary_adolescent_substance_use").default(false),
    summary_adolescent_depressed: (0, pg_core_1.boolean)("summary_adolescent_depressed").default(false),
    summary_adolescent_burning_urination: (0, pg_core_1.boolean)("summary_adolescent_burning_urination").default(false),
    summary_adolescent_discharge: (0, pg_core_1.boolean)("summary_adolescent_discharge").default(false),
    summary_adolescent_other: (0, pg_core_1.text)("summary_adolescent_other"),
    /* Additional Summary Fields */
    defects_summary: (0, pg_core_1.jsonb)("defects_summary").$type().default({}),
    deficiencies_summary: (0, pg_core_1.jsonb)("deficiencies_summary").$type().default({}),
    diseases_summary: (0, pg_core_1.jsonb)("diseases_summary").$type().default({}),
    referral_summary: (0, pg_core_1.jsonb)("referral_summary").$type().default({}),
    /* BMI Classification and BP Classification */
    bmi_category: (0, pg_core_1.text)("bmi_category"),
    bp_classification: (0, pg_core_1.text)("bp_classification"),
    /* Doctor signature and data entry fields */
    doctor_mht_name: (0, pg_core_1.text)("doctor_mht_name"),
    doctor_signature_date: (0, pg_core_1.date)("doctor_signature_date"),
    data_entry_register: (0, pg_core_1.boolean)("data_entry_register").default(false),
    /* Referral summary by category */
    referral_defect_at_birth_yes: (0, pg_core_1.boolean)("referral_defect_at_birth_yes").default(false),
    referral_defect_at_birth_facility_date: (0, pg_core_1.text)("referral_defect_at_birth_facility_date"),
    referral_deficiency_yes: (0, pg_core_1.boolean)("referral_deficiency_yes").default(false),
    referral_deficiency_facility_date: (0, pg_core_1.text)("referral_deficiency_facility_date"),
    referral_disease_yes: (0, pg_core_1.boolean)("referral_disease_yes").default(false),
    referral_disease_facility_date: (0, pg_core_1.text)("referral_disease_facility_date"),
    referral_leprosy_yes: (0, pg_core_1.boolean)("referral_leprosy_yes").default(false),
    referral_leprosy_facility_date: (0, pg_core_1.text)("referral_leprosy_facility_date"),
    referral_tb_yes: (0, pg_core_1.boolean)("referral_tb_yes").default(false),
    referral_tb_facility_date: (0, pg_core_1.text)("referral_tb_facility_date"),
    referral_developmental_yes: (0, pg_core_1.boolean)("referral_developmental_yes").default(false),
    referral_developmental_facility_date: (0, pg_core_1.text)("referral_developmental_facility_date"),
    referral_adolescent_yes: (0, pg_core_1.boolean)("referral_adolescent_yes").default(false),
    referral_adolescent_facility_date: (0, pg_core_1.text)("referral_adolescent_facility_date"),
    /* Date of visit */
    date_of_visit: (0, pg_core_1.date)("date_of_visit"),
    /* Overall referral flag (auto-set if ANY referral is needed) */
    referral_recommended: (0, pg_core_1.boolean)("referral_recommended").default(false),
    notes: (0, pg_core_1.text)("notes"),
    dataEntryBy: (0, pg_core_1.varchar)("data_entry_by"),
    dateOfEntry: (0, pg_core_1.timestamp)("date_of_entry").defaultNow(),
    status: (0, pg_core_1.text)("status").$type().default("Pending"),
    approvalBy: (0, pg_core_1.varchar)("approval_by"),
    approvalDate: (0, pg_core_1.timestamp)("approval_date"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.monthlyCheckups = (0, pg_core_1.pgTable)("monthly_checkups", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    checkupDate: (0, pg_core_1.date)("checkup_date").notNull(),
    month: (0, pg_core_1.integer)("month").notNull(),
    year: (0, pg_core_1.integer)("year").notNull(),
    heightCm: (0, pg_core_1.decimal)("height_cm", { precision: 5, scale: 2 }),
    weightKg: (0, pg_core_1.decimal)("weight_kg", { precision: 5, scale: 2 }),
    bmi: (0, pg_core_1.decimal)("bmi", { precision: 5, scale: 2 }),
    symptoms: (0, pg_core_1.jsonb)("symptoms").$type().default([]),
    suggestedMedicines: (0, pg_core_1.jsonb)("suggested_medicines").$type().default([]),
    treatmentType: (0, pg_core_1.text)("treatment_type").$type().default("Primary"),
    referredTo: (0, pg_core_1.text)("referred_to"),
    present: (0, pg_core_1.boolean)("present").default(true),
    notes: (0, pg_core_1.text)("notes"),
    recordedBy: (0, pg_core_1.varchar)("recorded_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.mealLogs = (0, pg_core_1.pgTable)("meal_logs", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    studentId: (0, pg_core_1.varchar)("student_id"),
    date: (0, pg_core_1.date)("date").notNull(),
    mealType: (0, pg_core_1.text)("meal_type").notNull().$type(),
    menuItems: (0, pg_core_1.jsonb)("menu_items").$type().default([]),
    imageUrl: (0, pg_core_1.text)("image_url"),
    latitude: (0, pg_core_1.decimal)("latitude", { precision: 10, scale: 8 }),
    longitude: (0, pg_core_1.decimal)("longitude", { precision: 11, scale: 8 }),
    uploadedBy: (0, pg_core_1.varchar)("uploaded_by"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.hostelAttendanceRecorderEnum = ["HostelWarden", "ClassTeacher", "Admin", "Headmaster"];
exports.hostelAttendance = (0, pg_core_1.pgTable)("hostel_attendance", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    date: (0, pg_core_1.date)("date").notNull(),
    eventIndex: (0, pg_core_1.integer)("event_index").default(0), // Track sequence: 0=first checkin, 1=first checkout, 2=second checkin, etc.
    checkInTime: (0, pg_core_1.timestamp)("check_in_time"),
    checkOutTime: (0, pg_core_1.timestamp)("check_out_time"),
    checkInImageUrl: (0, pg_core_1.text)("check_in_image_url"),
    checkOutImageUrl: (0, pg_core_1.text)("check_out_image_url"),
    checkInReason: (0, pg_core_1.text)("check_in_reason"),
    checkOutReason: (0, pg_core_1.text)("check_out_reason"),
    isVacation: (0, pg_core_1.boolean)("is_vacation").default(false),
    vacationStartDate: (0, pg_core_1.date)("vacation_start_date"),
    vacationEndDate: (0, pg_core_1.date)("vacation_end_date"),
    vacationReason: (0, pg_core_1.text)("vacation_reason"),
    recordedBy: (0, pg_core_1.varchar)("recorded_by"),
    recorderRole: (0, pg_core_1.text)("recorder_role").$type(), // Track who recorded: HostelWarden has priority
    status: (0, pg_core_1.text)("status").default("Present"), // Present, Absent, On Vacation, Late
    morningRollCall: (0, pg_core_1.boolean)("morning_roll_call"),
    nightRollCall: (0, pg_core_1.boolean)("night_roll_call"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull(),
    action: (0, pg_core_1.text)("action").notNull(),
    entityType: (0, pg_core_1.text)("entity_type").notNull(),
    entityId: (0, pg_core_1.varchar)("entity_id"),
    details: (0, pg_core_1.jsonb)("details").$type().default({}),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.studentAcademicActions = (0, pg_core_1.pgTable)("student_academic_actions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    actionType: (0, pg_core_1.text)("action_type").notNull().$type(),
    oldStatus: (0, pg_core_1.text)("old_status").notNull().$type(),
    newStatus: (0, pg_core_1.text)("new_status").notNull().$type(),
    oldClassSection: (0, pg_core_1.text)("old_class_section").notNull(),
    newClassSection: (0, pg_core_1.text)("new_class_section").notNull(),
    oldTeacherId: (0, pg_core_1.varchar)("old_teacher_id"),
    newTeacherId: (0, pg_core_1.varchar)("new_teacher_id"),
    reason: (0, pg_core_1.text)("reason").notNull(),
    academicYear: (0, pg_core_1.integer)("academic_year").notNull(),
    performedBy: (0, pg_core_1.varchar)("performed_by").notNull(),
    performedByRole: (0, pg_core_1.text)("performed_by_role").notNull().$type(),
    performedAt: (0, pg_core_1.timestamp)("performed_at").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.refreshTokens = (0, pg_core_1.pgTable)("refresh_tokens", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.referrals = (0, pg_core_1.pgTable)("referrals", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    healthCardId: (0, pg_core_1.varchar)("health_card_id").notNull(),
    referralType: (0, pg_core_1.text)("referral_type").notNull(), // 'defect', 'deficiency', 'disease', 'developmental', 'adolescent'
    referralCode: (0, pg_core_1.text)("referral_code").notNull(), // 'A1', 'B1', 'C1', etc.
    issue: (0, pg_core_1.text)("issue").notNull(), // Human readable description
    facility: (0, pg_core_1.text)("facility"), // Referral facility
    referralDate: (0, pg_core_1.date)("referral_date").notNull(),
    status: (0, pg_core_1.text)("status").notNull().$type().default("Pending"), // Pending, Approved, Rejected
    completionDate: (0, pg_core_1.date)("completion_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdBy: (0, pg_core_1.varchar)("created_by"),
    updatedBy: (0, pg_core_1.varchar)("updated_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    senderId: (0, pg_core_1.varchar)("sender_id").notNull(),
    senderRole: (0, pg_core_1.text)("sender_role").notNull().$type(),
    receiverRole: (0, pg_core_1.text)("receiver_role").notNull().$type(),
    receiverSchoolId: (0, pg_core_1.varchar)("receiver_school_id"), // For school-specific notifications
    receiverClassSection: (0, pg_core_1.text)("receiver_class_section"), // For class-specific notifications
    type: (0, pg_core_1.text)("type").notNull().$type(),
    title: (0, pg_core_1.text)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    isImportant: (0, pg_core_1.boolean)("is_important").default(false),
    isRead: (0, pg_core_1.boolean)("is_read").default(false),
    readAt: (0, pg_core_1.timestamp)("read_at"),
    relatedStudentId: (0, pg_core_1.varchar)("related_student_id"), // For health/meal alerts
    relatedSchoolId: (0, pg_core_1.varchar)("related_school_id"), // For school-specific alerts
    metadata: (0, pg_core_1.jsonb)("metadata").$type().default({}), // Additional data
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.periodTrackerEntries = (0, pg_core_1.pgTable)("period_tracker_entries", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    studentId: (0, pg_core_1.varchar)("student_id").notNull(),
    schoolId: (0, pg_core_1.varchar)("school_id").notNull(),
    entryDate: (0, pg_core_1.date)("entry_date").notNull(),
    // Mood tracking (multiple selections)
    moods: (0, pg_core_1.jsonb)("moods").$type().default([]),
    // Options: happy, sad, anxious, irritable, energetic, tired, calm, stressed, emotional, normal
    // Physical measurements
    bodyTemperatureCelsius: (0, pg_core_1.decimal)("body_temperature_celsius", { precision: 4, scale: 2 }),
    // Pain intensity (0-10 scale)
    painIntensity: (0, pg_core_1.integer)("pain_intensity"),
    // Flow category
    flowCategory: (0, pg_core_1.text)("flow_category").$type(),
    // Detailed symptoms (multiple selections)
    symptoms: (0, pg_core_1.jsonb)("symptoms").$type().default([]),
    // Options: cramps, headache, nausea, bloating, breast_tenderness, back_pain, 
    //          fatigue, dizziness, acne, food_cravings, insomnia, diarrhea, constipation
    // Optional notes
    notes: (0, pg_core_1.text)("notes"),
    // Referral fields
    isReferred: (0, pg_core_1.boolean)("is_referred").default(false),
    referredDate: (0, pg_core_1.date)("referred_date"),
    referralFacility: (0, pg_core_1.text)("referral_facility"),
    // Tracking metadata
    recordedBy: (0, pg_core_1.varchar)("recorded_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.usersRelations = (0, drizzle_orm_2.relations)(exports.users, ({ one, many }) => ({
    school: one(exports.schools, {
        fields: [exports.users.schoolId],
        references: [exports.schools.id],
    }),
    auditLogs: many(exports.auditLogs),
}));
exports.schoolsRelations = (0, drizzle_orm_2.relations)(exports.schools, ({ one, many }) => ({
    headmaster: one(exports.users, {
        fields: [exports.schools.headmasterId],
        references: [exports.users.id],
    }),
    students: many(exports.students),
    mealLogs: many(exports.mealLogs),
}));
exports.studentsRelations = (0, drizzle_orm_2.relations)(exports.students, ({ one, many }) => ({
    school: one(exports.schools, {
        fields: [exports.students.schoolId],
        references: [exports.schools.id],
    }),
    annualHealthCards: many(exports.annualHealthCards),
    monthlyCheckups: many(exports.monthlyCheckups),
    hostelAttendance: many(exports.hostelAttendance),
}));
exports.annualHealthCardsRelations = (0, drizzle_orm_2.relations)(exports.annualHealthCards, ({ one }) => ({
    student: one(exports.students, {
        fields: [exports.annualHealthCards.studentId],
        references: [exports.students.id],
    }),
    dataEntryUser: one(exports.users, {
        fields: [exports.annualHealthCards.dataEntryBy],
        references: [exports.users.id],
    }),
    approvalUser: one(exports.users, {
        fields: [exports.annualHealthCards.approvalBy],
        references: [exports.users.id],
    }),
}));
exports.monthlyCheckupsRelations = (0, drizzle_orm_2.relations)(exports.monthlyCheckups, ({ one }) => ({
    student: one(exports.students, {
        fields: [exports.monthlyCheckups.studentId],
        references: [exports.students.id],
    }),
    school: one(exports.schools, {
        fields: [exports.monthlyCheckups.schoolId],
        references: [exports.schools.id],
    }),
    recordedByUser: one(exports.users, {
        fields: [exports.monthlyCheckups.recordedBy],
        references: [exports.users.id],
    }),
}));
exports.mealLogsRelations = (0, drizzle_orm_2.relations)(exports.mealLogs, ({ one }) => ({
    school: one(exports.schools, {
        fields: [exports.mealLogs.schoolId],
        references: [exports.schools.id],
    }),
    student: one(exports.students, {
        fields: [exports.mealLogs.studentId],
        references: [exports.students.id],
    }),
    uploadedByUser: one(exports.users, {
        fields: [exports.mealLogs.uploadedBy],
        references: [exports.users.id],
    }),
}));
exports.hostelAttendanceRelations = (0, drizzle_orm_2.relations)(exports.hostelAttendance, ({ one }) => ({
    student: one(exports.students, {
        fields: [exports.hostelAttendance.studentId],
        references: [exports.students.id],
    }),
    school: one(exports.schools, {
        fields: [exports.hostelAttendance.schoolId],
        references: [exports.schools.id],
    }),
    recordedByUser: one(exports.users, {
        fields: [exports.hostelAttendance.recordedBy],
        references: [exports.users.id],
    }),
}));
exports.auditLogsRelations = (0, drizzle_orm_2.relations)(exports.auditLogs, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.auditLogs.userId],
        references: [exports.users.id],
    }),
}));
exports.referralsRelations = (0, drizzle_orm_2.relations)(exports.referrals, ({ one }) => ({
    student: one(exports.students, {
        fields: [exports.referrals.studentId],
        references: [exports.students.id],
    }),
    school: one(exports.schools, {
        fields: [exports.referrals.schoolId],
        references: [exports.schools.id],
    }),
    healthCard: one(exports.annualHealthCards, {
        fields: [exports.referrals.healthCardId],
        references: [exports.annualHealthCards.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.referrals.createdBy],
        references: [exports.users.id],
    }),
    updatedByUser: one(exports.users, {
        fields: [exports.referrals.updatedBy],
        references: [exports.users.id],
    }),
}));
exports.notificationsRelations = (0, drizzle_orm_2.relations)(exports.notifications, ({ one }) => ({
    sender: one(exports.users, {
        fields: [exports.notifications.senderId],
        references: [exports.users.id],
    }),
    relatedStudent: one(exports.students, {
        fields: [exports.notifications.relatedStudentId],
        references: [exports.students.id],
    }),
    relatedSchool: one(exports.schools, {
        fields: [exports.notifications.relatedSchoolId],
        references: [exports.schools.id],
    }),
}));
exports.periodTrackerEntriesRelations = (0, drizzle_orm_2.relations)(exports.periodTrackerEntries, ({ one }) => ({
    student: one(exports.students, {
        fields: [exports.periodTrackerEntries.studentId],
        references: [exports.students.id],
    }),
    school: one(exports.schools, {
        fields: [exports.periodTrackerEntries.schoolId],
        references: [exports.schools.id],
    }),
    recordedByUser: one(exports.users, {
        fields: [exports.periodTrackerEntries.recordedBy],
        references: [exports.users.id],
    }),
}));
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    role: zod_1.z.enum(exports.roleEnum),
});
exports.insertSchoolSchema = (0, drizzle_zod_1.createInsertSchema)(exports.schools).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    code: zod_1.z.string().optional(),
    requestedByEmail: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    schoolType: zod_1.z.enum(exports.schoolTypeEnum, {
        required_error: "School Type is required",
        invalid_type_error: "Invalid school type. Must be either 'Government' or 'Aided'",
    }),
});
exports.insertStudentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.students).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    gender: zod_1.z.enum(exports.genderEnum),
    dateOfBirth: zod_1.z.coerce.date({ invalid_type_error: "Date of Birth is required" }).nullable(),
    schoolAdmissionDate: zod_1.z.coerce.date({
        required_error: "School Admission Date is required",
        invalid_type_error: "School Admission Date must be a valid date"
    }),
    enrollmentDate: zod_1.z.coerce.date().nullable().optional(),
    uniqueId: zod_1.z.string().optional(),
    pranNo: zod_1.z.string().min(6, "PRAN number is required and seems too short"),
    aadhaarNo: zod_1.z.string().refine((val) => !!val && String(val).length === 12, { message: "Aadhaar number must be 12 digits" }),
    classSection: zod_1.z.string().optional(),
    schoolId: zod_1.z.string().optional(),
});
exports.insertAnnualHealthCardSchema = (0, drizzle_zod_1.createInsertSchema)(exports.annualHealthCards).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    // Required field validations
    studentId: zod_1.z.string().min(1, "Student ID is required"),
    schoolId: zod_1.z.string().min(1, "School ID is required"),
    year: zod_1.z.number().min(2020, "Year must be 2020 or later").max(new Date().getFullYear() + 1, "Year cannot be in the future"),
    nameOfChild: zod_1.z.string().min(1, "Student name is required").max(100, "Name too long"),
    classSection: zod_1.z.string().min(1, "Class section is required"),
    gender: zod_1.z.enum(exports.genderEnum, { required_error: "Gender is required" }),
    weightKg: zod_1.z.number().min(1, "Weight must be at least 1kg").max(200, "Weight seems unrealistic"),
    heightCm: zod_1.z.number().min(30, "Height must be at least 30cm").max(250, "Height seems unrealistic"),
    aadhaarNo: zod_1.z.string().optional().refine((val) => !val || val.length === 12, "Aadhaar number must be 12 digits"),
    pranNo: zod_1.z.string().optional().refine((val) => !val || val.length >= 6, "PRAN number seems invalid"),
    fatherGuardianName: zod_1.z.string().optional().refine((val) => !val || val.length <= 100, "Name too long"),
    fatherContact: zod_1.z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), "Contact must be 10 digits"),
    motherName: zod_1.z.string().optional().refine((val) => !val || val.length <= 100, "Name too long"),
    motherContact: zod_1.z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), "Contact must be 10 digits"),
    visionRight: zod_1.z.string().optional().refine((val) => !val || /^6\/\d{1,2}$/.test(val), "Vision format should be 6/X"),
    visionLeft: zod_1.z.string().optional().refine((val) => !val || /^6\/\d{1,2}$/.test(val), "Vision format should be 6/X"),
    bloodPressure: zod_1.z.string().optional().refine((val) => !val || /^\d{2,3}\/\d{2,3}$/.test(val), "BP format should be systolic/diastolic"),
    sbp: zod_1.z.number().optional().refine((val) => !val || (val >= 60 && val <= 250), "SBP out of normal range"),
    dbp: zod_1.z.number().optional().refine((val) => !val || (val >= 40 && val <= 150), "DBP out of normal range"),
    // Menstrual cycle validations removed
    c7_clinical_features: zod_1.z.object({
        sensory_deficit_in_lesion: zod_1.z.boolean().optional(),
        hypopigmented_anaesthetic_patches: zod_1.z.boolean().optional(),
        thickened_peripheral_nerves: zod_1.z.boolean().optional(),
        nodules_plaques: zod_1.z.boolean().optional(),
        ulceration_trophic_changes_deformity: zod_1.z.boolean().optional(),
    }).optional(),
    c7_types: zod_1.z.object({
        patchy: zod_1.z.boolean().optional(),
        plaque: zod_1.z.boolean().optional(),
        nodular: zod_1.z.boolean().optional(),
        diffuse: zod_1.z.boolean().optional(),
    }).optional(),
    c7_nerve_involvement: zod_1.z.object({
        behind_ear: zod_1.z.boolean().optional(),
        elbow: zod_1.z.boolean().optional(),
        wrist: zod_1.z.boolean().optional(),
        knee: zod_1.z.boolean().optional(),
        ankle: zod_1.z.boolean().optional(),
        other: zod_1.z.string().optional(),
    }).optional(),
    c7_functional_impact: zod_1.z.object({
        sensory_loss: zod_1.z.string().optional(),
        motor_weakness: zod_1.z.string().optional(),
        contractures: zod_1.z.string().optional(),
    }).optional(),
    c7: zod_1.z.record(zod_1.z.any()).optional(),
    c7_suspected: zod_1.z.boolean().optional(),
    c8: zod_1.z.record(zod_1.z.any()).optional(),
    c8_suspected: zod_1.z.boolean().optional(),
    c8_symptoms: zod_1.z.object({
        persistent_cough: zod_1.z.boolean().optional(),
        fever: zod_1.z.boolean().optional(),
        unexplained_weight_loss: zod_1.z.boolean().optional(),
        night_sweats: zod_1.z.boolean().optional(),
        lethargy_fatigue: zod_1.z.boolean().optional(),
        respiratory_distress: zod_1.z.boolean().optional(),
        hemoptysis: zod_1.z.string().optional(),
    }).optional(),
    c8_relevant_history: zod_1.z.object({
        known_contact: zod_1.z.boolean().optional(),
        previous_tb_treatment: zod_1.z.boolean().optional(),
    }).optional(),
    c8_extra_pulmonary: zod_1.z.object({
        lymph_node_enlargement: zod_1.z.string().optional(),
        abdominal_mass_ascites: zod_1.z.boolean().optional(),
        joint_pain_swelling: zod_1.z.string().optional(),
        spine_pain_gibbus: zod_1.z.boolean().optional(),
        neurological_symptoms: zod_1.z.string().optional(),
        other: zod_1.z.string().optional(),
    }).optional(),
    // Add referral_date fields as dates
    b1_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b2_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b3_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b4_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b5_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b6_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b7_referral_date: zod_1.z.coerce.date().nullable().optional(),
    b8_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c1_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c2_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c3_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c4_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c5_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c6_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c7_referral_date: zod_1.z.coerce.date().nullable().optional(),
    c8_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d1_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d2_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d3_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d4_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d5_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d6_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d7_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d8_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d9_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e1_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e2_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e3_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e4_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e5_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e6_referral_date: zod_1.z.coerce.date().nullable().optional(),
    e7_referral_date: zod_1.z.coerce.date().nullable().optional(),
    // Client field names for adolescent health (non-menstrual)
    e1_difficulty_life_events: zod_1.z.boolean().optional(),
    e2_peer_pressure: zod_1.z.boolean().optional(),
    e3_persistent_sadness: zod_1.z.boolean().optional(),
    e5_pain_urination: zod_1.z.boolean().optional(),
    e6_foul_smell_discharge: zod_1.z.boolean().optional(),
    e1_referral_suggested: zod_1.z.boolean().optional(),
    e2_referral_suggested: zod_1.z.boolean().optional(),
    e3_referral_suggested: zod_1.z.boolean().optional(),
    e5_referral_suggested: zod_1.z.boolean().optional(),
    e6_referral_suggested: zod_1.z.boolean().optional(),
    // E4 & E7: Female-only menstrual health fields
    e4_menstruation_started: zod_1.z.boolean().optional(),
    e4_referral_suggested: zod_1.z.boolean().optional(),
    e4_referral_facility: zod_1.z.string().nullable().optional(),
    e7_severe_menstrual_pain: zod_1.z.boolean().optional(),
    e7_referral_suggested: zod_1.z.boolean().optional(),
    // Detailed Menstrual Cycle Tracking
    menstrual_cycle_regular: zod_1.z.boolean().optional(),
    menstrual_cycle_length_days: zod_1.z.number().min(20).max(40).optional(),
    menstrual_period_duration_days: zod_1.z.number().min(1).max(10).optional(),
    menstrual_last_period_date: zod_1.z.coerce.date().nullable().optional(),
    menstrual_irregularities: zod_1.z.record(zod_1.z.any()).optional(),
    menstrual_symptoms: zod_1.z.record(zod_1.z.any()).optional(),
    menstrual_hygiene_practices: zod_1.z.record(zod_1.z.any()).optional(),
    menstrual_educational_resources_accessed: zod_1.z.boolean().optional(),
    // Additional fields
    bpCategory: zod_1.z.string().optional(),
    // bmi_category is now calculated automatically, not user-input
    a1_visible_defect: zod_1.z.boolean().optional(),
    a1_visible_defect_notes: zod_1.z.string().nullable().optional(),
    a1_referral_facility: zod_1.z.string().nullable().optional(),
    /* B1 - B8 */
    b1_severe_thinning: zod_1.z.boolean().optional(),
    b1_counsel_moderate: zod_1.z.boolean().optional(),
    b1_referral_facility: zod_1.z.string().nullable().optional(),
    b2_bilateral_oedema: zod_1.z.boolean().optional(),
    b2_referral_facility: zod_1.z.string().nullable().optional(),
    b3_severe_anemia: zod_1.z.boolean().optional(),
    b3_referral_facility: zod_1.z.string().nullable().optional(),
    b4_vitamin_a_deficiency: zod_1.z.boolean().optional(),
    b4_night_blindness: zod_1.z.boolean().optional(),
    b4_bitots_spots: zod_1.z.boolean().optional(),
    b4_referral_facility: zod_1.z.string().nullable().optional(),
    b5_vitamin_d_deficiency: zod_1.z.boolean().optional(),
    b5_wrist_widening: zod_1.z.boolean().optional(),
    b5_bowing_legs: zod_1.z.boolean().optional(),
    b5_referral_facility: zod_1.z.string().nullable().optional(),
    b6_goitre: zod_1.z.boolean().optional(),
    b6_referral_facility: zod_1.z.string().nullable().optional(),
    b7_obesity: zod_1.z.boolean().optional(),
    b7_referral_facility: zod_1.z.string().nullable().optional(),
    b8_vitb_deficiency: zod_1.z.boolean().optional(),
    b8_angular_stomatitis: zod_1.z.boolean().optional(),
    b8_raw_tongue: zod_1.z.boolean().optional(),
    b8_corneal_vascularization: zod_1.z.boolean().optional(),
    b8_referral_facility: zod_1.z.string().nullable().optional(),
    symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    suggestedMedicines: zod_1.z.array(zod_1.z.string()).optional(),
    c1: zod_1.z.boolean().optional(),
    c2: zod_1.z.boolean().optional(),
    c3: zod_1.z.boolean().optional(),
    c4: zod_1.z.boolean().optional(),
    c5: zod_1.z.boolean().optional(),
    c6: zod_1.z.boolean().optional(),
    d1: zod_1.z.boolean().optional(),
    d2: zod_1.z.boolean().optional(),
    d3: zod_1.z.boolean().optional(),
    d4: zod_1.z.boolean().optional(),
    d5: zod_1.z.boolean().optional(),
    d6: zod_1.z.boolean().optional(),
    d7: zod_1.z.boolean().optional(),
    d8: zod_1.z.boolean().optional(),
    d9: zod_1.z.boolean().optional(),
    // Add full field names for C and D sections
    c1_convulsive: zod_1.z.boolean().optional(),
    c2_otitis_media: zod_1.z.boolean().optional(),
    c3_dental: zod_1.z.boolean().optional(),
    c4_skin_conditions: zod_1.z.boolean().optional(),
    c5_asthma: zod_1.z.boolean().optional(),
    c6_rheumatic_heart: zod_1.z.boolean().optional(),
    c1_referral_facility: zod_1.z.string().nullable().optional(),
    c2_referral_facility: zod_1.z.string().nullable().optional(),
    c3_referral_facility: zod_1.z.string().nullable().optional(),
    c4_referral_facility: zod_1.z.string().nullable().optional(),
    c5_referral_facility: zod_1.z.string().nullable().optional(),
    c6_referral_facility: zod_1.z.string().nullable().optional(),
    c7_referral_facility: zod_1.z.string().nullable().optional(),
    c8_referral_facility: zod_1.z.string().nullable().optional(),
    c9_suspected: zod_1.z.boolean().optional(),
    c9_clinical_features: zod_1.z.record(zod_1.z.boolean()).optional(),
    c9_hemoglobin_type: zod_1.z.record(zod_1.z.boolean()).optional(),
    c9_referral_facility: zod_1.z.string().nullable().optional(),
    c9_referral_date: zod_1.z.coerce.date().nullable().optional(),
    d1_seeing_difficulty: zod_1.z.boolean().optional(),
    d2_walking_delay: zod_1.z.boolean().optional(),
    d3_reading_writing: zod_1.z.boolean().optional(),
    d4_muscle_stiffness: zod_1.z.boolean().optional(),
    d5_hearing_difficulty: zod_1.z.boolean().optional(),
    d6_speech_difficulty: zod_1.z.boolean().optional(),
    d7_learning_difficulty: zod_1.z.boolean().optional(),
    d8_inattention_hyperactivity: zod_1.z.boolean().optional(),
    d9_behavioral_concerns: zod_1.z.boolean().optional(),
    d1_referral_facility: zod_1.z.string().nullable().optional(),
    d2_referral_facility: zod_1.z.string().nullable().optional(),
    d3_referral_facility: zod_1.z.string().nullable().optional(),
    d4_referral_facility: zod_1.z.string().nullable().optional(),
    d5_referral_facility: zod_1.z.string().nullable().optional(),
    d6_referral_facility: zod_1.z.string().nullable().optional(),
    d7_referral_facility: zod_1.z.string().nullable().optional(),
    d8_referral_facility: zod_1.z.string().nullable().optional(),
    d9_referral_facility: zod_1.z.string().nullable().optional(),
    e1_referral_facility: zod_1.z.string().nullable().optional(),
    e2_referral_facility: zod_1.z.string().nullable().optional(),
    e3_referral_facility: zod_1.z.string().nullable().optional(),
    e5_referral_facility: zod_1.z.string().nullable().optional(),
    e6_referral_facility: zod_1.z.string().nullable().optional(),
    e7_referral_facility: zod_1.z.string().nullable().optional(),
    doctor_mht_name: zod_1.z.string().optional(),
    doctor_signature_date: zod_1.z.coerce.date().nullable().optional(),
    data_entry_register: zod_1.z.boolean().optional(),
    date_of_visit: zod_1.z.coerce.date().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
    dataEntryBy: zod_1.z.string().optional(),
    approvalBy: zod_1.z.string().optional(),
    approvalDate: zod_1.z.coerce.date().optional(),
    rejectionReason: zod_1.z.string().optional(),
});
exports.insertMonthlyCheckupSchema = (0, drizzle_zod_1.createInsertSchema)(exports.monthlyCheckups).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    treatmentType: zod_1.z.enum(exports.treatmentTypeEnum).optional(),
    symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    suggestedMedicines: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.insertMealLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mealLogs).omit({
    id: true,
    createdAt: true,
}).extend({
    mealType: zod_1.z.enum(exports.mealTypeEnum),
    menuItems: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.insertHostelAttendanceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.hostelAttendance).omit({
    id: true,
    createdAt: true,
}).extend({
    recorderRole: zod_1.z.enum(exports.hostelAttendanceRecorderEnum).optional(),
});
exports.insertAuditLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.auditLogs).omit({
    id: true,
    createdAt: true,
});
exports.insertStudentAcademicActionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.studentAcademicActions).omit({
    id: true,
    createdAt: true,
    performedAt: true,
}).extend({
    actionType: zod_1.z.enum(exports.academicActionEnum),
    oldStatus: zod_1.z.enum(exports.academicStatusEnum),
    newStatus: zod_1.z.enum(exports.academicStatusEnum),
    performedByRole: zod_1.z.enum(exports.roleEnum),
});
exports.insertReferralSchema = (0, drizzle_zod_1.createInsertSchema)(exports.referrals).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: zod_1.z.enum(exports.statusEnum).optional(),
});
exports.insertNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notifications).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    senderRole: zod_1.z.enum(exports.roleEnum),
    receiverRole: zod_1.z.enum(exports.roleEnum),
    type: zod_1.z.enum(exports.notificationTypeEnum),
});
exports.insertPeriodTrackerEntrySchema = (0, drizzle_zod_1.createInsertSchema)(exports.periodTrackerEntries).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    flowCategory: zod_1.z.enum(exports.flowCategoryEnum).optional(),
    moods: zod_1.z.array(zod_1.z.string()).optional(),
    symptoms: zod_1.z.array(zod_1.z.string()).optional(),
    painIntensity: zod_1.z.number().min(0).max(10).optional(),
    bodyTemperatureCelsius: zod_1.z.number().min(35).max(42).optional(),
    entryDate: zod_1.z.coerce.date(),
});
exports.updateAnnualHealthCardSchema = exports.insertAnnualHealthCardSchema.partial();
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    fullName: zod_1.z.string().min(2, "Full name is required"),
    role: zod_1.z.enum(exports.roleEnum).default("ClassTeacher"),
    schoolId: zod_1.z.string().optional(),
    classSection: zod_1.z.string().optional(), // For ClassTeacher - assigned class
    region: zod_1.z.string().optional(), // For PO - region matching schools
    district: zod_1.z.string().optional(),
    block: zod_1.z.string().optional(),
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
exports.healthCardSchema = zod_1.z.object({
// Removed referral_date fields
// Add other fields as needed based on the health card structure
});

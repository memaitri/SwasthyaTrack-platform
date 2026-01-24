/**
 * Health Card Referral Logic
 * Determines when referrals should be created based on health card findings
 */

export function isC7ReferralNeeded(healthCardData: any): boolean {
  // C7 Referral Rule: If ANY of these are positive → REFER FOR LEPROSY
  // C7.1 Skin lesion positive
  const skinLesionPositive = 
    (healthCardData.c7_hypopigmented_reddish_lesion || false) &&
    (healthCardData.c7_lesion_sensory_deficit || false) &&
    healthCardData.c7_num_lesions;

  // C7.2 Nerve involvement positive
  const nerveInvolvement = healthCardData.c7_nerves_involved || {};
  const nerveSignsPositive = healthCardData.c7_nerve_signs || {};
  const hasNerveInvolvement = Object.values(nerveInvolvement).some((v: any) => v === true) ||
                              Object.values(nerveSignsPositive).some((v: any) => v === true);

  // C7.3 Contracture/deformity present
  const contractureDeformities = healthCardData.c7_contractures_deformities || {};
  const hasContractures = Object.values(contractureDeformities).some((v: any) => v === true);

  return healthCardData.c7_suspected === true || skinLesionPositive || hasNerveInvolvement || hasContractures;
}

export function isC8ReferralNeeded(healthCardData: any): boolean {
  // C8 Referral Rule: If ANY of these are positive → REFER FOR TB SCREENING/DIAGNOSIS
  
  // Pulmonary TB screening
  const coughPositive = (healthCardData.c8_cough_gt14_days === true) && 
                        (healthCardData.c8_cough_with_bronchodilators_failed === true);
  
  const feverPositive = (healthCardData.c8_persistent_fever === true) &&
                       (healthCardData.c8_fever_duration_weeks && healthCardData.c8_fever_duration_weeks > 2);
  
  const reductionPositive = (healthCardData.c8_reduced_playfulness === true ||
                            healthCardData.c8_reduced_daily_activity === true ||
                            healthCardData.c8_reduced_appetite === true ||
                            healthCardData.c8_reduced_interaction === true) &&
                           (healthCardData.c8_reduction_duration_days && healthCardData.c8_reduction_duration_days >= 7);
  
  const behaviorPositive = (healthCardData.c8_recent_headache_irritability === true ||
                           healthCardData.c8_altered_behavior === true) &&
                          (healthCardData.c8_altered_behavior_duration_days && healthCardData.c8_altered_behavior_duration_days > 5);
  
  const weightLossPositive = (healthCardData.c8_weight_loss_gt5_percent === true) &&
                            (healthCardData.c8_weight_loss_not_responding_deworming === true ||
                             healthCardData.c8_weight_loss_not_responding_micronutrient === true ||
                             healthCardData.c8_weight_loss_not_responding_nutrition === true);
  
  const contactPositive = healthCardData.c8_close_contact_known_tb === true;
  
  const immunoPositive = (healthCardData.c8_measles_varicella_3mo === true) ||
                        (healthCardData.c8_steroids_chemotherapy_1mo === true);

  // Extra-pulmonary TB
  const abdominalTBPositive = healthCardData.c8_abdominal_pain_dull_aching === true ||
                             healthCardData.c8_abdominal_swelling === true ||
                             healthCardData.c8_painless_abdominal_mass === true ||
                             healthCardData.c8_hepatomegaly === true ||
                             healthCardData.c8_splenomegaly === true;

  const lymphNodeTBPositive = (healthCardData.c8_lymph_node_swelling_painless === true ||
                              healthCardData.c8_lymph_node_not_responding_antibiotics === true);

  const spineTBPositive = healthCardData.c8_spine_pain_stiffness === true ||
                         healthCardData.c8_spinal_deformity === true ||
                         healthCardData.c8_cold_abscess === true ||
                         healthCardData.c8_night_cries_typical === true ||
                         healthCardData.c8_kyphotic_deformity === true;

  // CNS TB
  const cnsTBPositive = healthCardData.c8_altered_consciousness === true ||
                       healthCardData.c8_convulsions_no_fever === true ||
                       healthCardData.c8_vomiting_no_diarrhea === true ||
                       healthCardData.c8_focal_neuro_deficit === true ||
                       healthCardData.c8_abnormal_movements === true ||
                       healthCardData.c8_cranial_nerve_palsy === true ||
                       healthCardData.c8_neck_stiffness_rigidity === true;

  // Severe respiratory
  const respiratoryPositive = healthCardData.c8_respiratory_distress === true ||
                             healthCardData.c8_difficulty_breathing === true ||
                             healthCardData.c8_persistent_cough_2weeks === true ||
                             healthCardData.c8_increased_respiratory_rate === true ||
                             healthCardData.c8_difficult_pneumonia === true;

  // Bone & Joint TB
  const boneJointTBPositive = healthCardData.c8_limping_recent_onset === true ||
                             healthCardData.c8_joint_pain_swelling === true ||
                             healthCardData.c8_bone_joint_night_cry === true;

  return healthCardData.c8_suspected === true ||
         coughPositive ||
         feverPositive ||
         reductionPositive ||
         behaviorPositive ||
         weightLossPositive ||
         contactPositive ||
         immunoPositive ||
         abdominalTBPositive ||
         lymphNodeTBPositive ||
         spineTBPositive ||
         cnsTBPositive ||
         respiratoryPositive ||
         boneJointTBPositive;
}

export function generateC7ReferralIssue(healthCardData: any): string {
  const issues: string[] = [];
  
  if (healthCardData.c7_hypopigmented_reddish_lesion) issues.push("Hypopigmented/reddish lesion with sensory deficit");
  if (healthCardData.c7_num_lesions) issues.push(`${healthCardData.c7_num_lesions} lesions`);
  
  const lesionTypes = healthCardData.c7_lesion_type || {};
  const types = Object.keys(lesionTypes).filter(k => lesionTypes[k]).map(k => k.replace(/_/g, ' '));
  if (types.length > 0) issues.push(`Type: ${types.join(', ')}`);

  const nerveInvolvement = healthCardData.c7_nerves_involved || {};
  const nerves = Object.keys(nerveInvolvement).filter(k => nerveInvolvement[k]).map(k => k.replace(/_/g, ' '));
  if (nerves.length > 0) issues.push(`Nerves involved: ${nerves.join(', ')}`);

  const nerveS = healthCardData.c7_nerve_signs || {};
  const signs = Object.keys(nerveS).filter(k => nerveS[k]).map(k => k.replace(/_/g, ' '));
  if (signs.length > 0) issues.push(`Nerve signs: ${signs.join(', ')}`);

  const contractures = healthCardData.c7_contractures_deformities || {};
  const deformities = Object.keys(contractures).filter(k => contractures[k]).map(k => k.replace(/_/g, ' '));
  if (deformities.length > 0) issues.push(`Contractures/deformities: ${deformities.join(', ')}`);

  return issues.length > 0 ? `Leprosy suspected: ${issues.join('; ')}` : "Leprosy suspected";
}

export function generateC8ReferralIssue(healthCardData: any): string {
  const issues: string[] = [];

  if (healthCardData.c8_cough_gt14_days && healthCardData.c8_cough_with_bronchodilators_failed) {
    issues.push("Persistent cough > 14 days not responding to antibiotics/bronchodilators");
  }

  if (healthCardData.c8_persistent_fever && healthCardData.c8_fever_duration_weeks && healthCardData.c8_fever_duration_weeks > 2) {
    issues.push(`Persistent fever (${healthCardData.c8_fever_temperature}°C) > 2 weeks`);
  }

  if (healthCardData.c8_weight_loss_gt5_percent) {
    issues.push("Weight loss > 5% not responding to standard interventions");
  }

  if (healthCardData.c8_close_contact_known_tb) {
    issues.push("Close contact with TB case");
  }

  if (healthCardData.c8_abdominal_pain_dull_aching || healthCardData.c8_abdominal_swelling ||
      healthCardData.c8_painless_abdominal_mass || healthCardData.c8_hepatomegaly ||
      healthCardData.c8_splenomegaly) {
    issues.push("Abdominal TB findings");
  }

  if (healthCardData.c8_lymph_node_swelling_painless || healthCardData.c8_lymph_node_not_responding_antibiotics) {
    issues.push("TB lymph node swelling");
  }

  if (healthCardData.c8_spine_pain_stiffness || healthCardData.c8_cold_abscess ||
      healthCardData.c8_spinal_deformity || healthCardData.c8_kyphotic_deformity) {
    issues.push("Suspected TB spine (Pott's disease)");
  }

  if (healthCardData.c8_altered_consciousness || healthCardData.c8_convulsions_no_fever ||
      healthCardData.c8_neck_stiffness_rigidity) {
    issues.push("CNS TB suspected");
  }

  return issues.length > 0 ? `Tuberculosis suspected: ${issues.join('; ')}` : "Tuberculosis suspected";
}

export function isC9ReferralNeeded(healthCardData: any): boolean {
  // C9 Referral Rule: If suspected → REFER FOR HEMATOLOGY EVALUATION & SPECIALIZED CARE
  // Sickle cell disease is a serious condition requiring specialist management
  
  // Check if C9 is suspected
  if (healthCardData.c9_suspected === true) {
    return true;
  }

  // Check if any clinical features are present
  const clinicalFeatures = healthCardData.c9_clinical_features || {};
  const hasAnyFeature = Object.values(clinicalFeatures).some((v: any) => v === true);
  if (hasAnyFeature) {
    return true;
  }

  // Check if hemoglobin type is documented (indicates confirmed diagnosis)
  const hemoglobinType = healthCardData.c9_hemoglobin_type || {};
  const hasTypeConfirmed = Object.values(hemoglobinType).some((v: any) => v === true);
  if (hasTypeConfirmed) {
    return true;
  }

  return false;
}

export function getC9ReferralDescription(healthCardData: any): string {
  const issues: string[] = [];

  if (healthCardData.c9_suspected === true) {
    issues.push("Sickle cell anaemia suspected");
  }

  const clinicalFeatures = healthCardData.c9_clinical_features || {};
  if (clinicalFeatures.pain_crisis) {
    issues.push("Vaso-occlusive pain crisis");
  }
  if (clinicalFeatures.swelling_hands_feet) {
    issues.push("Hand-foot swelling (dactylitis)");
  }
  if (clinicalFeatures.shortness_breath) {
    issues.push("Acute chest syndrome");
  }
  if (clinicalFeatures.fatigue) {
    issues.push("Severe fatigue/lethargy");
  }
  if (clinicalFeatures.jaundice) {
    issues.push("Jaundice");
  }
  if (clinicalFeatures.delayed_growth) {
    issues.push("Delayed growth/development");
  }
  if (clinicalFeatures.severe_infections) {
    issues.push("Recurrent severe infections");
  }

  const hemoglobinType = healthCardData.c9_hemoglobin_type || {};
  if (hemoglobinType.hbss) {
    issues.push("HbSS disease confirmed");
  }
  if (hemoglobinType.hbsc) {
    issues.push("HbSC disease confirmed");
  }
  if (hemoglobinType.hbs_beta_thalassemia) {
    issues.push("HbS/β-Thalassemia confirmed");
  }
  if (hemoglobinType.hbsd) {
    issues.push("HbSD variant");
  }
  if (hemoglobinType.hbse) {
    issues.push("HbSE variant");
  }

  return issues.length > 0 ? `Sickle cell disease: ${issues.join('; ')}` : "Sickle cell disease evaluation needed";
}


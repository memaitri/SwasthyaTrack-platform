-- Update an existing health card to have disease concerns marked as TRUE
-- This will test if the dashboard properly fetches and displays disease data

UPDATE "public"."annual_health_cards"
SET 
  -- Mark disease concerns as TRUE
  "c1_convulsive" = true,
  "c2_otitis_media" = true,
  "c3_dental" = true,
  "c5_asthma" = true,
  "c7_suspected" = true,      -- Leprosy
  "c8_suspected" = true,      -- TB
  -- Mark developmental delays as TRUE
  "d1_seeing_difficulty" = true,
  "d2_walking_delay" = true,
  "d5_hearing_difficulty" = true,
  "d7_learning_difficulty" = true,
  -- Mark adolescent health concerns as TRUE (for students 10+)
  "e1_life_events_difficulty" = true,
  "e2_peer_pressure_substance" = true,
  "e3_persistent_sadness" = true,
  "e4_menstruation_started" = true,
  "e5_pain_urination" = true,
  "e7_severe_menstrual_pain" = true
WHERE "student_id" = 'e7fab262-f1fe-4638-9187-3514d9574d6f'   -- First card (pqr, age 16)
  AND "year" = '2025';

-- Update a second card with some concerns
UPDATE "public"."annual_health_cards"
SET 
  "c2_otitis_media" = true,
  "c3_dental" = true,
  "c6_rheumatic_heart" = true,
  "d1_seeing_difficulty" = true,
  "d5_hearing_difficulty" = true,
  "e1_life_events_difficulty" = true,
  "e4_menstruation_started" = true
WHERE "student_id" = '5ef651b8-cf7a-45e6-ab57-405874edfb52'   -- Second card (Jia, age 13)
  AND "year" = '2025';

-- Update a third card with TB concern
UPDATE "public"."annual_health_cards"
SET 
  "c8_suspected" = true,   -- TB
  "d2_walking_delay" = true,
  "d7_learning_difficulty" = true
WHERE "student_id" = 'ce13d9f9-c9f3-42d5-8bbe-8e1f3f1b903f'   -- Third card (Krish, age 12)
  AND "year" = '2025';

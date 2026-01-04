-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR NOT NULL,
  school_id VARCHAR NOT NULL,
  health_card_id VARCHAR NOT NULL,
  referral_type TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  issue TEXT NOT NULL,
  facility TEXT,
  referral_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending',
  completion_date DATE,
  notes TEXT,
  created_by VARCHAR,
  updated_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_student FOREIGN KEY (student_id) REFERENCES students(id);
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_health_card FOREIGN KEY (health_card_id) REFERENCES annual_health_cards(id);
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX idx_referrals_student_id ON referrals(student_id);
CREATE INDEX idx_referrals_school_id ON referrals(school_id);
CREATE INDEX idx_referrals_health_card_id ON referrals(health_card_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_referral_date ON referrals(referral_date);
CREATE INDEX idx_referrals_type ON referrals(referral_type);
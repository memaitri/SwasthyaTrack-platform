-- Enable RLS for the students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow Class Teachers to access only their assigned class sections
CREATE POLICY class_teacher_access_policy
ON students
FOR SELECT
USING (
  auth.role = 'ClassTeacher' AND class_section = auth.class_section
);

-- Create a policy to allow Admins to access all data
CREATE POLICY admin_access_policy
ON students
FOR SELECT
USING (
  auth.role = 'Admin'
);
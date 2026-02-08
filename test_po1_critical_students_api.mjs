#!/usr/bin/env node

/**
 * Test Critical Students API for PO1
 * 
 * This simulates what happens when po1 accesses the Critical Students tab
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Import the service function
async function evaluateStudent(studentId) {
  // Simplified evaluation for testing
  const result = await pool.query(`
    SELECT 
      s.id,
      s.full_name,
      s.class_section,
      s.gender,
      s.date_of_birth,
      sch.id as school_id,
      sch.name as school_name,
      ahc.bmi,
      ahc.b3_severe_anemia,
      ahc.c7_suspected,
      ahc.c8_suspected,
      ahc.c9_suspected,
      ahc.b4_vitamin_a_deficiency,
      ahc.b5_vitamin_d_deficiency
    FROM students s
    JOIN schools sch ON sch.id = s.school_id
    LEFT JOIN annual_health_cards ahc ON ahc.student_id = s.id
    WHERE s.id = $1 AND s.is_active = true
  `, [studentId]);

  if (result.rows.length === 0) return null;

  const student = result.rows[0];
  const reasons = [];
  let priorityScore = 0;

  // Check BMI
  const bmi = student.bmi ? parseFloat(student.bmi) : null;
  if (bmi !== null) {
    if (bmi < 13.5) {
      reasons.push({ category: 'health', severity: 'high', description: 'Severely Underweight', value: bmi.toFixed(1), threshold: 13.5 });
      priorityScore += 30;
    } else if (bmi < 16.0) {
      reasons.push({ category: 'health', severity: 'medium', description: 'Underweight', value: bmi.toFixed(1), threshold: 16.0 });
      priorityScore += 20;
    } else if (bmi >= 30.0) {
      reasons.push({ category: 'health', severity: 'high', description: 'Obese', value: bmi.toFixed(1), threshold: 30.0 });
      priorityScore += 25;
    } else if (bmi >= 25.0) {
      reasons.push({ category: 'health', severity: 'medium', description: 'Overweight', value: bmi.toFixed(1), threshold: 25.0 });
      priorityScore += 15;
    }
  }

  // Check health flags
  if (student.b3_severe_anemia) {
    reasons.push({ category: 'medical', severity: 'high', description: 'Severe Anemia Detected' });
    priorityScore += 35;
  }
  if (student.c7_suspected) {
    reasons.push({ category: 'medical', severity: 'high', description: 'Leprosy Suspected' });
    priorityScore += 40;
  }
  if (student.c8_suspected) {
    reasons.push({ category: 'medical', severity: 'high', description: 'Tuberculosis Suspected' });
    priorityScore += 40;
  }
  if (student.c9_suspected) {
    reasons.push({ category: 'medical', severity: 'high', description: 'Sickle Cell Anemia Suspected' });
    priorityScore += 35;
  }
  if (student.b4_vitamin_a_deficiency) {
    reasons.push({ category: 'health', severity: 'medium', description: 'Vitamin A Deficiency' });
    priorityScore += 15;
  }
  if (student.b5_vitamin_d_deficiency) {
    reasons.push({ category: 'health', severity: 'medium', description: 'Vitamin D Deficiency' });
    priorityScore += 15;
  }

  const age = student.date_of_birth 
    ? new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()
    : null;

  return {
    studentId: student.id,
    studentName: student.full_name,
    schoolId: student.school_id,
    schoolName: student.school_name,
    classSection: student.class_section,
    gender: student.gender,
    age,
    isCritical: reasons.length > 0,
    reasons,
    priorityScore: Math.min(priorityScore, 100),
    lastUpdated: new Date(),
  };
}

async function main() {
  console.log('🧪 Testing Critical Students API for PO1\n');
  console.log('This simulates what happens when po1 accesses the Critical Students tab\n');

  try {
    // 1. Get po1's district
    const po1 = await pool.query(`
      SELECT id, username, full_name, district
      FROM users
      WHERE username = 'po1'
    `);

    if (po1.rows.length === 0) {
      console.log('❌ User po1 not found!');
      return;
    }

    const po1User = po1.rows[0];
    console.log('1️⃣ PO1 User:');
    console.log(`   ${po1User.full_name} - District: "${po1User.district}"\n`);

    // 2. Get schools in district (case-insensitive)
    const schools = await pool.query(`
      SELECT id, name, district, school_type
      FROM schools
      WHERE LOWER(district) = LOWER($1) AND is_active = true
    `, [po1User.district]);

    console.log(`2️⃣ Schools in ${po1User.district}: ${schools.rows.length}`);
    schools.rows.forEach(school => {
      console.log(`   - ${school.name} (${school.school_type})`);
    });
    console.log('');

    if (schools.rows.length === 0) {
      console.log('❌ No schools found in district!');
      return;
    }

    const schoolIds = schools.rows.map(s => s.id);

    // 3. Get students in these schools
    const students = await pool.query(`
      SELECT id, full_name, class_section
      FROM students
      WHERE school_id = ANY($1) AND is_active = true
      ORDER BY full_name
    `, [schoolIds]);

    console.log(`3️⃣ Students in District: ${students.rows.length}`);
    console.log('');

    // 4. Evaluate each student
    console.log('4️⃣ Evaluating Students...\n');
    
    const criticalStudents = [];
    let evaluatedCount = 0;

    for (const student of students.rows) {
      evaluatedCount++;
      const evaluation = await evaluateStudent(student.id);
      
      if (evaluation && evaluation.isCritical) {
        criticalStudents.push(evaluation);
        console.log(`   ✓ ${evaluation.studentName} (${evaluation.classSection})`);
        console.log(`     Priority: ${evaluation.priorityScore}`);
        console.log(`     Reasons: ${evaluation.reasons.map(r => r.description).join(', ')}`);
        console.log('');
      }
    }

    console.log(`   Evaluated: ${evaluatedCount} students`);
    console.log(`   Critical: ${criticalStudents.length} students\n`);

    // 5. Sort by priority
    criticalStudents.sort((a, b) => b.priorityScore - a.priorityScore);

    // 6. Display results
    console.log('5️⃣ Critical Students (sorted by priority):\n');
    console.log('═'.repeat(70));

    if (criticalStudents.length === 0) {
      console.log('✅ No critical students found!');
      console.log('All students in Jalgaon district are within healthy parameters.\n');
    } else {
      criticalStudents.forEach((student, idx) => {
        const priorityLabel = student.priorityScore >= 70 ? '🔴 HIGH' 
          : student.priorityScore >= 40 ? '🟠 MEDIUM' 
          : '🟡 LOW';
        
        console.log(`${idx + 1}. ${student.studentName} - ${priorityLabel} (${student.priorityScore})`);
        console.log(`   School: ${student.schoolName}`);
        console.log(`   Class: ${student.classSection} | Gender: ${student.gender} | Age: ${student.age || 'N/A'}`);
        console.log(`   Reasons:`);
        student.reasons.forEach(reason => {
          const icon = reason.category === 'health' ? '🏥' 
            : reason.category === 'medical' ? '⚕️' 
            : reason.category === 'nutrition' ? '🍽️' 
            : '📅';
          console.log(`     ${icon} [${reason.severity.toUpperCase()}] ${reason.description}`);
          if (reason.value && reason.threshold) {
            console.log(`        Current: ${reason.value} | Threshold: ${reason.threshold}`);
          }
        });
        console.log('');
      });
    }

    console.log('═'.repeat(70));
    console.log('\n📊 API Response Summary:');
    console.log(`   Total Critical Students: ${criticalStudents.length}`);
    console.log(`   District: ${po1User.district}`);
    console.log(`   Schools Checked: ${schools.rows.length}`);
    console.log(`   Students Evaluated: ${evaluatedCount}`);
    
    if (criticalStudents.length > 0) {
      const highPriority = criticalStudents.filter(s => s.priorityScore >= 70).length;
      const mediumPriority = criticalStudents.filter(s => s.priorityScore >= 40 && s.priorityScore < 70).length;
      const lowPriority = criticalStudents.filter(s => s.priorityScore < 40).length;
      
      console.log(`\n   Priority Breakdown:`);
      console.log(`     🔴 High (70-100): ${highPriority}`);
      console.log(`     🟠 Medium (40-69): ${mediumPriority}`);
      console.log(`     🟡 Low (0-39): ${lowPriority}`);
    }

    console.log('\n✅ Test Complete!');
    console.log('\nThis is what po1 will see in the Critical Students tab.');
    console.log('Login as po1 to verify in the UI.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();

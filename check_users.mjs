#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 CHECKING USERS IN DATABASE\n');
console.log('='.repeat(80));

async function checkUsers() {
  try {
    // Get all users
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return;
    }

    console.log(`\n📊 TOTAL USERS: ${allUsers.length}\n`);

    // Group by role
    const byRole = {};
    allUsers.forEach(user => {
      const role = user.role || 'No Role';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(user);
    });

    console.log('👥 USERS BY ROLE:\n');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`   ${role}: ${byRole[role].length}`);
      byRole[role].forEach(user => {
        console.log(`     - ${user.full_name || user.username} (${user.username})`);
        console.log(`       ID: ${user.id}`);
        console.log(`       Active: ${user.is_active ? 'YES' : 'NO'}`);
        console.log(`       Approved: ${user.approval_status || 'N/A'}`);
        if (user.region) console.log(`       Region: ${user.region}`);
        if (user.district) console.log(`       District: ${user.district}`);
        if (user.school_id) console.log(`       School ID: ${user.school_id}`);
        console.log('');
      });
    });

    // Check for PO users specifically
    const poUsers = allUsers.filter(u => u.role === 'PO');
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎯 PO USERS: ${poUsers.length}\n`);

    if (poUsers.length === 0) {
      console.log('❌ NO PO USERS FOUND IN DATABASE!');
      console.log('\n💡 SOLUTION: You need to create a PO user first.');
      console.log('\nOptions:');
      console.log('   1. Register a new PO user through the registration page');
      console.log('   2. Update an existing user to PO role');
      console.log('   3. Run a script to create a PO user');
    } else {
      poUsers.forEach(po => {
        console.log(`✅ PO User: ${po.full_name || po.username}`);
        console.log(`   Username: ${po.username}`);
        console.log(`   Active: ${po.is_active ? 'YES' : 'NO'}`);
        console.log(`   Approved: ${po.approval_status || 'N/A'}`);
        console.log(`   Region: ${po.region || 'NOT SET ⚠️'}`);
        console.log(`   District: ${po.district || 'NOT SET ⚠️'}`);
        console.log(`   School ID: ${po.school_id || 'NOT SET'}`);
        console.log('');
      });
    }

    // Check schools
    const { data: schools } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true);

    console.log('\n' + '='.repeat(80));
    console.log(`\n🏫 SCHOOLS: ${schools ? schools.length : 0}\n`);

    if (schools && schools.length > 0) {
      schools.forEach(school => {
        console.log(`   ${school.name}`);
        console.log(`     ID: ${school.id}`);
        console.log(`     Region: ${school.region || 'NOT SET'}`);
        console.log(`     District: ${school.district || 'NOT SET'}`);
        console.log('');
      });
    }

    // Check students
    const { data: students } = await supabase
      .from('students')
      .select('id, school_id, is_active')
      .limit(1000);

    console.log('\n' + '='.repeat(80));
    console.log(`\n👥 STUDENTS: ${students ? students.length : 0}`);
    if (students) {
      const activeStudents = students.filter(s => s.is_active !== false);
      console.log(`   Active: ${activeStudents.length}`);
      console.log(`   Inactive: ${students.length - activeStudents.length}`);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkUsers();

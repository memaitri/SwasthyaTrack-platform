#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkTestUsers() {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/swasthyatrack';
    const sql = postgres(connectionString);
    const db = drizzle(sql);
    
    console.log('🔍 Checking for test users...\n');
    
    // Get all users
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      schoolId: users.schoolId,
      classSection: users.classSection,
      isActive: users.isActive,
      approvalStatus: users.approvalStatus
    }).from(users).limit(10);
    
    console.log(`Found ${allUsers.length} users:`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.fullName})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   School: ${user.schoolId || 'None'}`);
      console.log(`   Class: ${user.classSection || 'None'}`);
      console.log(`   Status: ${user.approvalStatus} ${user.isActive ? '(Active)' : '(Inactive)'}`);
      console.log('');
    });
    
    // Look for ClassTeacher users specifically
    const classTeachers = allUsers.filter(u => u.role === 'ClassTeacher');
    console.log(`📚 ClassTeacher users: ${classTeachers.length}`);
    
    if (classTeachers.length > 0) {
      console.log('\n💡 You can test with these ClassTeacher credentials:');
      classTeachers.forEach(teacher => {
        console.log(`- Username: ${teacher.username}`);
        console.log(`  School: ${teacher.schoolId}`);
        console.log(`  Class: ${teacher.classSection}`);
        console.log(`  Status: ${teacher.approvalStatus}`);
      });
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    console.log('\n💡 Make sure the database is running and accessible.');
  }
}

checkTestUsers();
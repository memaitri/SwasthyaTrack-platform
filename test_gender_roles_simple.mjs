import { storage } from './dist/server/storage.js';
import jwt from 'jsonwebtoken';

async function testGenderRoles() {
  try {
    console.log('Testing gender-based role creation...');
    
    // Create school
    const school = await storage.createSchool({ 
      name: 'Gender Test School', 
      district: 'D-GENDER-TEST',
      block: 'B-GENDER-TEST',
      region: 'R-GENDER-TEST',
      schoolType: 'Government' 
    });
    console.log('✓ School created:', school.id);

    // Create students
    const maleStudent = await storage.createStudent({ 
      fullName: 'Male Student', 
      uniqueId: `MS-${Date.now()}`, 
      gender: 'M', 
      classSection: '5-A', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Male student created:', maleStudent.id);

    const femaleStudent = await storage.createStudent({ 
      fullName: 'Female Student', 
      uniqueId: `FS-${Date.now()}`, 
      gender: 'F', 
      classSection: '5-B', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Female student created:', femaleStudent.id);

    // Create Lady Superintendent user
    const lsUser = await storage.createUser({ 
      username: `ls-${Date.now()}`, 
      password: 'password', 
      email: `ls${Date.now()}@example.com`, 
      fullName: 'Lady Superintendent', 
      role: 'Lady Superintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    });
    console.log('✓ Lady Superintendent created:', lsUser.id, 'Role:', lsUser.role);

    // Create Meal Superintendent user
    const msUser = await storage.createUser({ 
      username: `ms-${Date.now()}`, 
      password: 'password', 
      email: `ms${Date.now()}@example.com`, 
      fullName: 'Meal Superintendent', 
      role: 'MealSuperintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    });
    console.log('✓ Meal Superintendent created:', msUser.id, 'Role:', msUser.role);

    // Test JWT creation
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    
    const lsToken = jwt.sign({ 
      id: lsUser.id, 
      username: lsUser.username, 
      role: lsUser.role, 
      schoolId: lsUser.schoolId 
    }, secret, { expiresIn: '1h' });
    console.log('✓ LS JWT created');

    const msToken = jwt.sign({ 
      id: msUser.id, 
      username: msUser.username, 
      role: msUser.role, 
      schoolId: msUser.schoolId 
    }, secret, { expiresIn: '1h' });
    console.log('✓ MS JWT created');

    // Verify JWT decoding
    const lsDecoded = jwt.verify(lsToken, secret);
    console.log('✓ LS JWT decoded:', lsDecoded.role);

    const msDecoded = jwt.verify(msToken, secret);
    console.log('✓ MS JWT decoded:', msDecoded.role);

    console.log('\n✅ All gender role tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testGenderRoles();
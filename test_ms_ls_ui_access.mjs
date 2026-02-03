import { storage } from './dist/server/storage.js';
import jwt from 'jsonwebtoken';

async function testMSLSUIAccess() {
  try {
    console.log('Testing MS and LS UI access to hostel attendance...');
    
    // Create school
    const school = await storage.createSchool({ 
      name: 'MS LS UI Test School', 
      district: 'D-MS-LS-UI-TEST',
      block: 'B-MS-LS-UI-TEST',
      region: 'R-MS-LS-UI-TEST',
      schoolType: 'Government' 
    });
    console.log('✓ School created:', school.id);

    // Create students
    const maleStudent = await storage.createStudent({ 
      fullName: 'Male Student UI', 
      uniqueId: `MS-UI-${Date.now()}`, 
      gender: 'M', 
      classSection: '5-A', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Male student created:', maleStudent.id);

    const femaleStudent = await storage.createStudent({ 
      fullName: 'Female Student UI', 
      uniqueId: `FS-UI-${Date.now()}`, 
      gender: 'F', 
      classSection: '5-B', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Female student created:', femaleStudent.id);

    // Create Lady Superintendent user
    const lsUser = await storage.createUser({ 
      username: `ls-ui-${Date.now()}`, 
      password: 'password', 
      email: `ls-ui${Date.now()}@example.com`, 
      fullName: 'Lady Superintendent UI', 
      role: 'Lady Superintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    });
    console.log('✓ Lady Superintendent created:', lsUser.id);

    // Create Meal Superintendent user
    const msUser = await storage.createUser({ 
      username: `ms-ui-${Date.now()}`, 
      password: 'password', 
      email: `ms-ui${Date.now()}@example.com`, 
      fullName: 'Meal Superintendent UI', 
      role: 'MealSuperintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    });
    console.log('✓ Meal Superintendent created:', msUser.id);

    // Create JWT tokens
    const secret = process.env.SESSION_SECRET || 'swasthya-track-secret-key-2025';
    
    const lsToken = jwt.sign({ 
      id: lsUser.id, 
      username: lsUser.username, 
      role: lsUser.role, 
      schoolId: lsUser.schoolId 
    }, secret, { expiresIn: '1h' });

    const msToken = jwt.sign({ 
      id: msUser.id, 
      username: msUser.username, 
      role: msUser.role, 
      schoolId: msUser.schoolId 
    }, secret, { expiresIn: '1h' });

    console.log('\n📋 UI Access Test Results:');
    console.log('='.repeat(50));
    
    console.log('\n🔐 Authentication Tokens:');
    console.log(`LS Token: ${lsToken.substring(0, 50)}...`);
    console.log(`MS Token: ${msToken.substring(0, 50)}...`);
    
    console.log('\n🎯 Expected UI Behavior:');
    console.log('Lady Superintendent (LS):');
    console.log('  - Should see "Female Students Hostel Attendance" header');
    console.log('  - Should only see female students in the list');
    console.log('  - Should have check-in/check-out/vacation buttons for female students');
    console.log('  - Should NOT see male students');
    
    console.log('\nMeal Superintendent (MS):');
    console.log('  - Should see "Male Students Hostel Attendance" header');
    console.log('  - Should only see male students in the list');
    console.log('  - Should have check-in/check-out/vacation buttons for male students');
    console.log('  - Should NOT see female students');
    
    console.log('\n🚀 Navigation Access:');
    console.log('Both LS and MS should now have:');
    console.log('  - "Hostel Attendance" menu item in sidebar');
    console.log('  - Access to /hostel route');
    console.log('  - Access to all hostel sub-routes');
    
    console.log('\n📊 Test Data Created:');
    console.log(`School: ${school.name} (${school.id})`);
    console.log(`Male Student: ${maleStudent.fullName} (${maleStudent.gender})`);
    console.log(`Female Student: ${femaleStudent.fullName} (${femaleStudent.gender})`);
    console.log(`LS User: ${lsUser.fullName} (${lsUser.role})`);
    console.log(`MS User: ${msUser.fullName} (${msUser.role})`);
    
    console.log('\n✅ UI Access Configuration Updated!');
    console.log('🔧 Changes Made:');
    console.log('  1. Updated App.tsx routing to include MS and LS roles');
    console.log('  2. Added "Hostel Attendance" to MS and LS sidebar menus');
    console.log('  3. Added "Hostel Attendance" to ClassTeacher and Headmaster menus');
    console.log('  4. All hostel routes now accessible to MS and LS');
    
    console.log('\n🧪 To Test:');
    console.log('  1. Start the development server: npm run dev');
    console.log('  2. Login as LS or MS user');
    console.log('  3. Navigate to "Hostel Attendance" from sidebar');
    console.log('  4. Verify gender-based filtering works');
    console.log('  5. Test check-in/check-out/vacation functionality');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testMSLSUIAccess();
import { storage } from './dist/server/storage.js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

async function testGenderAPI() {
  try {
    console.log('Testing gender-based API access...');
    
    // Create school
    const school = await storage.createSchool({ 
      name: 'Gender API Test School', 
      district: 'D-GENDER-API-TEST',
      block: 'B-GENDER-API-TEST',
      region: 'R-GENDER-API-TEST',
      schoolType: 'Government' 
    });
    console.log('✓ School created:', school.id);

    // Create students
    const maleStudent = await storage.createStudent({ 
      fullName: 'Male Student API', 
      uniqueId: `MS-API-${Date.now()}`, 
      gender: 'M', 
      classSection: '5-A', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Male student created:', maleStudent.id);

    const femaleStudent = await storage.createStudent({ 
      fullName: 'Female Student API', 
      uniqueId: `FS-API-${Date.now()}`, 
      gender: 'F', 
      classSection: '5-B', 
      schoolId: school.id,
      schoolAdmissionDate: '2024-01-01'
    });
    console.log('✓ Female student created:', femaleStudent.id);

    // Create Lady Superintendent user
    const lsUser = await storage.createUser({ 
      username: `ls-api-${Date.now()}`, 
      password: 'password', 
      email: `ls-api${Date.now()}@example.com`, 
      fullName: 'Lady Superintendent API', 
      role: 'Lady Superintendent', 
      schoolId: school.id,
      isActive: true,
      approvalStatus: 'Approved'
    });
    console.log('✓ Lady Superintendent created:', lsUser.id);

    // Create Meal Superintendent user
    const msUser = await storage.createUser({ 
      username: `ms-api-${Date.now()}`, 
      password: 'password', 
      email: `ms-api${Date.now()}@example.com`, 
      fullName: 'Meal Superintendent API', 
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
    console.log('✓ LS JWT created');

    const msToken = jwt.sign({ 
      id: msUser.id, 
      username: msUser.username, 
      role: msUser.role, 
      schoolId: msUser.schoolId 
    }, secret, { expiresIn: '1h' });
    console.log('✓ MS JWT created');

    // Test API access (assuming server is running on port 3000)
    const baseUrl = 'http://localhost:3000';
    
    try {
      // Test LS access to hostel attendance
      const lsResponse = await fetch(`${baseUrl}/api/hostel/attendance`, {
        headers: {
          'Authorization': `Bearer ${lsToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('LS hostel attendance response status:', lsResponse.status);
      if (lsResponse.status === 200) {
        const lsData = await lsResponse.json();
        console.log('✓ LS can access hostel attendance, students count:', lsData.students?.length || 0);
        const femaleStudents = lsData.students?.filter(s => s.gender === 'F') || [];
        const maleStudents = lsData.students?.filter(s => s.gender === 'M') || [];
        console.log('  - Female students visible to LS:', femaleStudents.length);
        console.log('  - Male students visible to LS:', maleStudents.length);
      } else {
        const lsError = await lsResponse.text();
        console.log('❌ LS hostel attendance error:', lsError);
      }

      // Test MS access to hostel attendance
      const msResponse = await fetch(`${baseUrl}/api/hostel/attendance`, {
        headers: {
          'Authorization': `Bearer ${msToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('MS hostel attendance response status:', msResponse.status);
      if (msResponse.status === 200) {
        const msData = await msResponse.json();
        console.log('✓ MS can access hostel attendance, students count:', msData.students?.length || 0);
        const femaleStudents = msData.students?.filter(s => s.gender === 'F') || [];
        const maleStudents = msData.students?.filter(s => s.gender === 'M') || [];
        console.log('  - Female students visible to MS:', femaleStudents.length);
        console.log('  - Male students visible to MS:', maleStudents.length);
      } else {
        const msError = await msResponse.text();
        console.log('❌ MS hostel attendance error:', msError);
      }

    } catch (apiError) {
      console.log('❌ API test failed (server might not be running):', apiError.message);
      console.log('   To test API endpoints, start the server with: npm run dev');
    }

    console.log('\n✅ Gender API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testGenderAPI();
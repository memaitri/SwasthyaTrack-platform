#!/usr/bin/env node

import { storage } from './server/dist/storage.js';

console.log('🔍 Testing PO Dashboard Data Fetching');
console.log('=====================================');

async function testPODashboard() {
  try {
    // Test basic database connectivity
    console.log('\n📋 Step 1: Testing database connectivity...');
    
    // Get schools
    const schoolsResult = await storage.getSchools(1, 10);
    console.log(`✅ Found ${schoolsResult.schools?.length || 0} schools`);
    
    if (schoolsResult.schools?.length > 0) {
      const sampleSchool = schoolsResult.schools[0];
      console.log(`📍 Sample school: ${sampleSchool.name} (${sampleSchool.district})`);
      
      // Get students for the school
      const studentsResult = await storage.getStudents({ schoolId: sampleSchool.id, limit: 5 });
      console.log(`👥 Found ${studentsResult.students?.length || 0} students in sample school`);
      
      // Get health cards for the school
      const cardsResult = await storage.getAnnualHealthCards({ 
        schoolId: sampleSchool.id, 
        year: 2025, 
        limit: 5 
      });
      console.log(`🏥 Found ${cardsResult.cards?.length || 0} health cards for 2025`);
      
      if (cardsResult.cards?.length > 0) {
        const sampleCard = cardsResult.cards[0];
        console.log('📊 Sample health card data:');
        console.log(`  - Student ID: ${sampleCard.studentId}`);
        console.log(`  - BMI: ${sampleCard.bmi}`);
        console.log(`  - Height: ${sampleCard.heightCm}cm`);
        console.log(`  - Weight: ${sampleCard.weightKg}kg`);
        console.log(`  - C1 (Convulsive): ${sampleCard.c1}`);
        console.log(`  - C2 (Otitis): ${sampleCard.c2}`);
        console.log(`  - C3 (Dental): ${sampleCard.c3}`);
        console.log(`  - C4 (Skin): ${sampleCard.c4}`);
        console.log(`  - C5 (Asthma): ${sampleCard.c5}`);
        console.log(`  - C6 (Heart): ${sampleCard.c6}`);
        console.log(`  - C7 (Leprosy): ${JSON.stringify(sampleCard.c7)}`);
        console.log(`  - C8 (TB): ${JSON.stringify(sampleCard.c8)}`);
        console.log(`  - B3 (Severe Anemia): ${sampleCard.b3_severe_anemia}`);
        console.log(`  - E1 (Life Events): ${sampleCard.e1_difficulty_life_events}`);
        console.log(`  - E2 (Peer Pressure): ${sampleCard.e2_peer_pressure}`);
        console.log(`  - E3 (Sadness): ${sampleCard.e3_persistent_sadness}`);
      }
      
      // Test referrals
      try {
        const referralsResult = await storage.getReferrals({ schoolId: sampleSchool.id, limit: 5 });
        console.log(`🔗 Found ${referralsResult.referrals?.length || 0} referrals`);
      } catch (error) {
        console.log(`⚠️ Referrals table not available: ${error.message}`);
      }
    }
    
    console.log('\n✅ Database connectivity test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPODashboard().then(() => {
  console.log('\n🎉 PO Dashboard data fetching test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
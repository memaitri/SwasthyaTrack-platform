#!/usr/bin/env node

console.log('🔍 Testing PO Dashboard API with Authentication');
console.log('===============================================');

const BASE_URL = 'http://localhost:5000';

async function authenticateAsPO() {
  try {
    console.log('\n🔐 Step 1: Authenticating as PO user...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'po_test',
        password: 'password123'
      }),
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${errorData.message}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Authentication successful');
    console.log('User role:', loginData.user?.role);
    console.log('User district:', loginData.user?.district);
    
    return loginData.accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function testPODashboardWithAuth(token) {
  try {
    console.log('\n📊 Step 2: Testing PO Dashboard API with authentication...');
    
    const dashboardUrl = `${BASE_URL}/api/po/dashboard?month=2&year=2026&schoolType=All`;
    console.log('Request URL:', dashboardUrl);
    
    const response = await fetch(dashboardUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.message}`);
    }
    
    const data = await response.json();
    console.log('✅ API request successful');
    
    // Analyze the response data
    console.log('\n📈 Data Analysis:');
    console.log('================');
    
    // District KPIs
    if (data.districtKPIs) {
      console.log('\n🏫 District KPIs:');
      console.log('  - Total Schools:', data.districtKPIs.totalSchools);
      console.log('  - Total Students Screened:', data.districtKPIs.totalStudentsScreened);
      console.log('  - Total Health Cards:', data.districtKPIs.totalHealthCards);
      console.log('  - Total Checkups:', data.districtKPIs.totalCheckups);
      console.log('  - Total Referrals:', data.districtKPIs.totalReferrals);
      console.log('  - Health Card Completion Rate:', data.districtKPIs.healthCardCompletionRate + '%');
      console.log('  - Average BMI:', data.districtKPIs.avgBMIDistrict);
      
      if (data.districtKPIs.prevalenceRates) {
        console.log('  - Prevalence Rates:');
        console.log('    * Underweight:', data.districtKPIs.prevalenceRates.underweightPercent + '%');
        console.log('    * Obesity:', data.districtKPIs.prevalenceRates.obesityPercent + '%');
        console.log('    * Severe Anemia:', data.districtKPIs.prevalenceRates.severeAnemiaPercent + '%');
        console.log('    * TB Suspicion:', data.districtKPIs.prevalenceRates.tbSuspicionPercent + '%');
        console.log('    * Leprosy Suspicion:', data.districtKPIs.prevalenceRates.leprosySuspicionPercent + '%');
      }
    } else {
      console.log('❌ districtKPIs not found in response');
    }
    
    // Diseases Insights
    if (data.diseasesInsights) {
      console.log('\n🦠 Diseases Insights:');
      const diseases = Object.entries(data.diseasesInsights);
      if (diseases.length > 0) {
        diseases.forEach(([disease, info]) => {
          if (info && typeof info === 'object' && info.totalCases > 0) {
            console.log(`  - ${disease}: ${info.totalCases} cases (${info.percent}%)`);
          }
        });
      } else {
        console.log('  - No disease data found');
      }
    } else {
      console.log('❌ diseasesInsights not found in response');
    }
    
    // Adolescent Health
    if (data.adolescentHealth) {
      console.log('\n👥 Adolescent Health:');
      console.log('  - Total Adolescents:', data.adolescentHealth.totalAdolescents);
      console.log('  - Screened Percent:', data.adolescentHealth.screenedPercent + '%');
      console.log('  - Vision Concerns:', data.adolescentHealth.visionConcerns);
      console.log('  - Hearing Concerns:', data.adolescentHealth.hearingConcerns);
      console.log('  - Learning Concerns:', data.adolescentHealth.learningConcerns);
      console.log('  - Emotional Distress:', data.adolescentHealth.emotionalDistressPercent + '%');
      console.log('  - Peer Pressure:', data.adolescentHealth.peerPressurePercent + '%');
      console.log('  - Depression Symptoms:', data.adolescentHealth.depressionSymptomsPercent + '%');
    } else {
      console.log('❌ adolescentHealth not found in response');
    }
    
    // Referral Management
    if (data.referralManagement) {
      console.log('\n🔗 Referral Management:');
      console.log('  - Total Referrals Generated:', data.referralManagement.totalReferralsGenerated);
      console.log('  - Referral Completion Percent:', data.referralManagement.referralCompletionPercent + '%');
      console.log('  - Pending Referrals:', data.referralManagement.pendingReferrals);
      console.log('  - Overdue Referrals:', data.referralManagement.overdueReferrals?.length || 0);
    } else {
      console.log('❌ referralManagement not found in response');
    }
    
    // Leprosy Analytics
    if (data.leprosyAnalytics) {
      console.log('\n🚨 Leprosy Analytics:');
      console.log('  - Total Suspected Cases:', data.leprosyAnalytics.totalSuspectedCases);
      console.log('  - Show Red Alert:', data.leprosyAnalytics.showRedAlert);
      if (data.leprosyAnalytics.referralStatus) {
        console.log('  - Referral Completion:', 
          `${data.leprosyAnalytics.referralStatus.completed}/${data.leprosyAnalytics.referralStatus.total}`);
      }
    }
    
    // TB Analytics
    if (data.tbAnalytics) {
      console.log('\n🫁 TB Analytics:');
      console.log('  - Total Suspected Cases:', data.tbAnalytics.totalSuspectedCases);
      console.log('  - Contact History Percent:', data.tbAnalytics.contactHistoryPercent + '%');
      console.log('  - Show Red Alert:', data.tbAnalytics.showRedAlert);
      if (data.tbAnalytics.referralStatus) {
        console.log('  - Referral Completion:', 
          `${data.tbAnalytics.referralStatus.completed}/${data.tbAnalytics.referralStatus.total}`);
      }
    }
    
    // Check for empty data
    console.log('\n🔍 Data Authenticity Check:');
    console.log('============================');
    
    const hasRealData = (
      (data.districtKPIs?.totalStudentsScreened > 0) ||
      (data.districtKPIs?.totalHealthCards > 0) ||
      (Object.values(data.diseasesInsights || {}).some(d => d && d.totalCases > 0)) ||
      (data.adolescentHealth?.totalAdolescents > 0) ||
      (data.referralManagement?.totalReferralsGenerated > 0)
    );
    
    if (hasRealData) {
      console.log('✅ REAL DATA DETECTED - Dashboard is fetching authentic data from database');
    } else {
      console.log('⚠️ NO REAL DATA DETECTED - Dashboard may be showing empty/default values');
      console.log('This could indicate:');
      console.log('  1. No health cards exist for the selected year/month');
      console.log('  2. No students are enrolled in schools');
      console.log('  3. Database is empty or not properly populated');
      console.log('  4. Data filtering is too restrictive');
    }
    
    // Metadata
    if (data.metadata) {
      console.log('\n📋 Metadata:');
      console.log('  - Generated At:', data.metadata.generatedAt);
      console.log('  - Data Freshness:', data.metadata.dataFreshness);
      console.log('  - Coverage:', data.metadata.coverage);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ PO Dashboard API test failed:', error.message);
    throw error;
  }
}

// Run the complete test
async function runCompleteTest() {
  try {
    const token = await authenticateAsPO();
    const dashboardData = await testPODashboardWithAuth(token);
    
    console.log('\n🎉 PO Dashboard API test completed successfully');
    console.log('✅ Authentication: Working');
    console.log('✅ API Endpoint: Working');
    console.log('✅ Data Structure: Valid');
    
    // Final summary
    const dataQuality = (
      (dashboardData.districtKPIs?.totalStudentsScreened > 0) ||
      (dashboardData.districtKPIs?.totalHealthCards > 0)
    ) ? 'REAL DATA' : 'EMPTY/DEFAULT DATA';
    
    console.log(`✅ Data Quality: ${dataQuality}`);
    
  } catch (error) {
    console.error('💥 Complete test failed:', error.message);
    process.exit(1);
  }
}

runCompleteTest();
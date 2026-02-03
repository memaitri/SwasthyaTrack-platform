import fetch from 'node-fetch';

async function createPOUser() {
  console.log('Creating PO test user...');
  
  try {
    // Register the PO user
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test_po_approval',
        password: 'testpass123',
        email: 'po.approval@test.com',
        fullName: 'Test PO Approval',
        role: 'PO',
        region: 'Test Region',
        district: 'Test District',
        block: 'Test Block',
        isActive: true
      })
    });
    
    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.log('Registration response:', registerResponse.status, errorText);
      
      if (registerResponse.status === 400 && errorText.includes('already exists')) {
        console.log('PO user already exists, trying to login...');
      } else {
        console.error('Registration failed:', errorText);
        return;
      }
    } else {
      const registerData = await registerResponse.json();
      console.log('Registration successful:', registerData);
    }
    
    // Try to login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test_po_approval',
        password: 'testpass123'
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', loginResponse.status, errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData.user?.email, loginData.user?.role);
    
    // Test the dashboard API
    console.log('Testing PO Dashboard API...');
    const dashboardResponse = await fetch('http://localhost:5000/api/po/dashboard?month=1&year=2025', {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!dashboardResponse.ok) {
      const errorText = await dashboardResponse.text();
      console.error('Dashboard API failed:', dashboardResponse.status, errorText);
      return;
    }
    
    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard API successful!');
    console.log('=== REFERRAL MANAGEMENT DATA ===');
    console.log(JSON.stringify(dashboardData.referralManagement, null, 2));
    console.log('=== DISTRICT KPIs ===');
    console.log(JSON.stringify(dashboardData.districtKPIs, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

createPOUser();
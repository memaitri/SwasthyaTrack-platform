async function testLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Login failed:', error);
      return;
    }

    const data = await response.json();
    console.log('Login successful!');
    console.log('Access Token:', data.accessToken);
    console.log('User:', data.user);

    // Test approvals endpoint (pending cards)
    const approvalsResponse = await fetch('http://localhost:5000/api/annual-cards?status=Pending&page=1', {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!approvalsResponse.ok) {
      const error = await approvalsResponse.text();
      console.error('Approvals API call failed:', approvalsResponse.status, error);
    } else {
      const approvalsData = await approvalsResponse.json();
      console.log('Approvals API Response:', JSON.stringify(approvalsData, null, 2));
    }

    // Test health cards endpoint (all cards)
    const healthCardsResponse = await fetch('http://localhost:5000/api/annual-cards?status=all&year=2025&page=1', {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!healthCardsResponse.ok) {
      const error = await healthCardsResponse.text();
      console.error('Health Cards API call failed:', healthCardsResponse.status, error);
    } else {
      const healthCardsData = await healthCardsResponse.json();
      console.log('Health Cards API Response:', JSON.stringify(healthCardsData, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
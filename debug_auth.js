// Debug script to check authentication
console.log('🔍 Debugging authentication...');

// Check localStorage
const accessToken = localStorage.getItem('accessToken');
const user = localStorage.getItem('user');

console.log('Access Token:', accessToken ? 'Present' : 'Missing');
console.log('User:', user ? JSON.parse(user) : 'Missing');

if (accessToken) {
  console.log('Token length:', accessToken.length);
  console.log('Token starts with:', accessToken.substring(0, 20) + '...');
}

// Test API call
if (accessToken) {
  fetch('/api/students', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(response => {
    console.log('API Response Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('API Response:', data);
  })
  .catch(error => {
    console.error('API Error:', error);
  });
}
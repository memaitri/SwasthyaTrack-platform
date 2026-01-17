import { storage } from './server/storage';
import jwt from 'jsonwebtoken';

async function getLSToken() {
  try {
    // Find a Lady Superintendent user
    const { users } = await storage.getUsers(1, 100);
    const lsUser = users.find(u => u.role === 'Lady Superintendent' && u.isActive);
    
    if (!lsUser) {
      console.log('No active Lady Superintendent found');
      return;
    }
    
    console.log('Found LS user:', lsUser.fullName, lsUser.id);
    
    // Generate a JWT token
    const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "swasthya-track-secret-key-2025";
    const token = jwt.sign(
      { 
        id: lsUser.id, 
        username: lsUser.username, 
        role: lsUser.role,
        schoolId: lsUser.schoolId
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log('JWT Token:', token);
    console.log('\nTest command:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5000/api/period-tracker/04ab9f10-d144-44ff-a292-6620b4406fd3`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getLSToken();
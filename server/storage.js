// Minimal storage.js for testing
export const storage = {
  saveRefreshToken: async (userId, token, expiresAt) => {
    console.log("saveRefreshToken called (stub)");
    return true;
  },
  getSchool: async (schoolId) => {
    console.log("getSchool called (stub)");
    return { name: "Test School" };
  }
};
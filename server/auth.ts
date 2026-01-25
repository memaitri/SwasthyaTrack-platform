import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, usageTracking } from "../shared/schema.js";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { eq, sql } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'swasthya-track-secret-key-2025';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Login route
router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    
    // Track login attempt
    const sessionId = req.headers['x-session-id'] as string || `login-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Update usage tracking for login attempt
    try {
      const existingSession = await db.select().from(usageTracking).where(eq(usageTracking.sessionId, sessionId)).limit(1);
      
      if (existingSession.length > 0) {
        // Update existing session with login attempt
        await db.update(usageTracking)
          .set({
            loginAttempts: sql`${usageTracking.loginAttempts} + 1`,
            lastActivity: new Date(),
            updatedAt: new Date()
          })
          .where(eq(usageTracking.sessionId, sessionId));
      } else {
        // Create new session with login attempt
        await db.insert(usageTracking).values({
          sessionId,
          ipAddress,
          userAgent,
          loginAttempts: 1,
          firstVisit: new Date(),
          lastActivity: new Date()
        });
      }
    } catch (trackingError) {
      console.warn('Login attempt tracking failed:', trackingError);
      // Continue with login even if tracking fails
    }
    
    // Find user by username
    const user = await storage.getUserByUsername(data.username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is not active. Please contact administrator." });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Track successful login
    try {
      await db.update(usageTracking)
        .set({
          successfulLogins: sql`${usageTracking.successfulLogins} + 1`,
          userId: user.id,
          lastActivity: new Date(),
          updatedAt: new Date()
        })
        .where(eq(usageTracking.sessionId, sessionId));
    } catch (trackingError) {
      console.warn('Successful login tracking failed:', trackingError);
      // Continue with login even if tracking fails
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        schoolId: user.schoolId, 
        classSection: user.classSection 
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await storage.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Return user without password and include session ID
    const { password: _, ...userWithoutPassword } = user;
    
    res.setHeader('X-Session-ID', sessionId);
    res.status(200).json({
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Invalid input data", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        // Invalidate refresh token
        await storage.deleteRefreshTokensByUserId(decoded.id);
      } catch (jwtError) {
        // Token might be invalid, but we still want to logout
        console.warn("Invalid token during logout:", jwtError);
      }
    }
    
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
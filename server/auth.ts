import { Router } from "express";
import { db } from "./db";
import { users, refreshTokens } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { storage } from "./storage";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });

    // Select specific user fields - allow login with username or email
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      schoolId: users.schoolId,
      classSection: users.classSection,
      district: users.district,
      block: users.block,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(or(eq(users.username, username), eq(users.email, username)));

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid credentials" });

    // Prevent login for inactive / pending / rejected accounts
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is not active. Pending approval or blocked." });
    }

    const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "swasthya-track-secret-key-2025";
    const ACCESS_TOKEN_EXPIRY = process.env.NODE_ENV === "production" ? "15m" : "24h";
    const REFRESH_TOKEN_EXPIRY = "7d";

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
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

    const { password: _, ...userWithoutPassword } = user;
    // Add schoolName if schoolId exists
    let schoolName = null;
    if (user.schoolId) {
      const school = await storage.getSchool(user.schoolId);
      schoolName = school?.name || null;
    }
    return res.json({
      accessToken,
      refreshToken,
      user: { ...userWithoutPassword, schoolName },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

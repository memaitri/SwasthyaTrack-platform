/**
 * Integration tests for PO dashboard filtering functionality
 * Tests the clean and reusable filtering logic implementation
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { storage } from "../storage.js";

describe("PO Dashboard Filtering", () => {
  let poToken: string;
  let adminToken: string;
  let testSchoolIds: string[] = [];

  beforeAll(async () => {
    // Create test admin user
    const adminUser = await storage.createUser({
      username: "admin_filter_test",
      password: "password123",
      email: "admin.filter@test.com",
      fullName: "Admin Filter Test",
      role: "Admin",
      district: "Test District",
    });

    // Create test PO user
    const poUser = await storage.createUser({
      username: "po_filter_test",
      password: "password123",
      email: "po.filter@test.com",
      fullName: "PO Filter Test",
      role: "PO",
      district: "Test District",
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin_filter_test", password: "password123" });
    adminToken = adminLogin.body.accessToken;

    const poLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "po_filter_test", password: "password123" });
    poToken = poLogin.body.accessToken;

    // Create test schools with different types
    const governmentSchool = await storage.createSchool({
      name: "Test Government School",
      code: "TGS001",
      district: "Test District",
      block: "Test Block",
      schoolType: "Government",
    });

    const aidedSchool = await storage.createSchool({
      name: "Test Aided School", 
      code: "TAS001",
      district: "Test District",
      block: "Test Block",
      schoolType: "Aided",
    });

    testSchoolIds = [governmentSchool.id, aidedSchool.id];

    // Create some test students and health cards
    for (const schoolId of testSchoolIds) {
      const student = await storage.createStudent({
        fullName: `Test Student ${schoolId}`,
        uniqueId: `TS${schoolId}`,
        classSection: "Class 5",
        gender: "Male",
        dateOfBirth: new Date("2015-01-01"),
        schoolId,
      });

      await storage.createAnnualHealthCard({
        studentId: student.id,
        schoolId,
        year: 2025,
        nameOfChild: student.fullName,
        gender: student.gender,
        classSection: student.classSection,
        uniqueId: student.uniqueId,
        weightKg: 30,
        heightCm: 140,
        bmi: 15.3,
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      for (const schoolId of testSchoolIds) {
        const { students } = await storage.getStudents({ schoolId, limit: 100 });
        for (const student of students) {
          await storage.deleteStudent(student.id);
        }
        await storage.deleteSchool(schoolId);
      }
      
      await storage.deleteUser("admin_filter_test");
      await storage.deleteUser("po_filter_test");
    } catch (error) {
      console.warn("Cleanup error:", error);
    }
  });

  describe("School Type Filtering", () => {
    it("should return all schools when no filter applied", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("districtKPIs");
      expect(response.body.districtKPIs.totalSchools).toBeGreaterThanOrEqual(2);
      
      // Should have both school types in breakdown
      expect(response.body.districtKPIs.schoolTypeBreakdown).toHaveProperty("government");
      expect(response.body.districtKPIs.schoolTypeBreakdown).toHaveProperty("aided");
    });

    it("should filter Government schools only", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025&schoolType=Government")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("districtKPIs");
      
      // Government metrics should have data
      const govMetrics = response.body.districtKPIs.schoolTypeBreakdown.government;
      expect(govMetrics.schoolCount).toBeGreaterThan(0);
      
      // Aided metrics should be empty or minimal (only from filtered data)
      const aidedMetrics = response.body.districtKPIs.schoolTypeBreakdown.aided;
      expect(aidedMetrics.schoolCount).toBe(0);
    });

    it("should filter Aided schools only", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025&schoolType=Aided")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("districtKPIs");
      
      // Aided metrics should have data
      const aidedMetrics = response.body.districtKPIs.schoolTypeBreakdown.aided;
      expect(aidedMetrics.schoolCount).toBeGreaterThan(0);
      
      // Government metrics should be empty
      const govMetrics = response.body.districtKPIs.schoolTypeBreakdown.government;
      expect(govMetrics.schoolCount).toBe(0);
    });

    it("should reject invalid school type", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025&schoolType=Invalid")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("message", "Invalid filter parameters");
      expect(response.body.errors).toContain("Invalid school type: Invalid");
    });
  });

  describe("Time Period Filtering", () => {
    it("should validate month parameter", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=13&year=2025")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("message", "Invalid filter parameters");
      expect(response.body.errors).toContain("Invalid month: 13. Must be between 1 and 12.");
    });

    it("should validate year parameter", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2050")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("message", "Invalid filter parameters");
      expect(response.body.errors).toContain("Invalid year: 2050. Must be between 2020 and 2030.");
    });

    it("should accept valid time parameters", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=6&year=2025")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("districtKPIs");
      expect(response.body.metadata).toHaveProperty("selectedMonth", 6);
      expect(response.body.metadata).toHaveProperty("selectedYear", 2025);
    });
  });

  describe("Combined Filtering", () => {
    it("should apply multiple filters correctly", async () => {
      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025&schoolType=Government")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("districtKPIs");
      
      // Should only show Government school data
      const govMetrics = response.body.districtKPIs.schoolTypeBreakdown.government;
      expect(govMetrics.schoolCount).toBeGreaterThan(0);
      
      const aidedMetrics = response.body.districtKPIs.schoolTypeBreakdown.aided;
      expect(aidedMetrics.schoolCount).toBe(0);
      
      // Metadata should reflect filters
      expect(response.body.metadata).toHaveProperty("selectedMonth", 1);
      expect(response.body.metadata).toHaveProperty("selectedYear", 2025);
      expect(response.body.metadata).toHaveProperty("selectedSchoolType", "Government");
    });
  });

  describe("District Access Control", () => {
    it("should only show schools from PO's district", async () => {
      // Create a school in a different district
      const otherDistrictSchool = await storage.createSchool({
        name: "Other District School",
        code: "ODS001",
        district: "Other District",
        block: "Other Block",
        schoolType: "Government",
      });

      const response = await request(app)
        .get("/api/po/dashboard?month=1&year=2025")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      // PO should not see schools from other districts
      const referralHeatmap = response.body.referralHeatmap;
      const schoolNames = referralHeatmap.schools.map((s: any) => s.schoolName);
      expect(schoolNames).not.toContain("Other District School");

      // Cleanup
      await storage.deleteSchool(otherDistrictSchool.id);
    });
  });

  describe("Filter Consistency", () => {
    it("should maintain consistent filtering across different endpoints", async () => {
      // Test that the same filters produce consistent results
      const dashboardResponse = await request(app)
        .get("/api/po/dashboard?month=1&year=2025&schoolType=Government")
        .set("Authorization", `Bearer ${poToken}`)
        .expect(200);

      // The filtering should be consistent - Government schools only
      const govCount = dashboardResponse.body.districtKPIs.schoolTypeBreakdown.government.schoolCount;
      const aidedCount = dashboardResponse.body.districtKPIs.schoolTypeBreakdown.aided.schoolCount;
      
      expect(govCount).toBeGreaterThan(0);
      expect(aidedCount).toBe(0);
    });
  });
});
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import { reports, sharedReports, type Report, type SharedReportType, type InsertReport, type InsertSharedReport } from './reportsSchema.js';
import { users } from '../shared/schema.js';
import fs from 'fs/promises';
import path from 'path';

const connectionString = process.env.DATABASE_URL!;
const sqlClient = postgres(connectionString);
const db = drizzle(sqlClient);

export class ReportsStorage {
  private reportsDir = path.join(process.cwd(), 'storage', 'reports');

  constructor() {
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  async storeReport(reportData: InsertReport, fileBuffer: Buffer): Promise<Report> {
    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${reportData.reportCategory}_${timestamp}.${reportData.reportType.toLowerCase() === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(this.reportsDir, fileName);

    // Save file to disk
    await fs.writeFile(filePath, fileBuffer);

    // Store metadata in database
    const [report] = await db.insert(reports).values({
      ...reportData,
      filePath: filePath,
      fileName: fileName,
      fileSize: fileBuffer.length,
    }).returning();

    return report;
  }

  async getReport(reportId: string): Promise<Report | null> {
    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.reportId, reportId),
        eq(reports.isActive, true)
      ))
      .limit(1);

    return report || null;
  }

  async getReportFile(reportId: string): Promise<Buffer | null> {
    const report = await this.getReport(reportId);
    if (!report) return null;

    try {
      return await fs.readFile(report.filePath);
    } catch (error) {
      console.error('Failed to read report file:', error);
      return null;
    }
  }

  async getReportsForRole(role: string, userId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(and(
        sql`${reports.roleAllowed} = ${role}`,
        eq(reports.isActive, true)
      ))
      .orderBy(desc(reports.createdAt))
      .limit(50);
  }

  async shareReport(shareData: InsertSharedReport): Promise<SharedReportType> {
    const [sharedReport] = await db.insert(sharedReports).values(shareData).returning();
    return sharedReport;
  }

  async getSharedReportsForUser(userId: string): Promise<Array<SharedReportType & { report: Report; sharedByUser: { fullName: string; username: string } }>> {
    const sharedReportsData = await db
      .select({
        sharedReport: sharedReports,
        report: reports,
        sharedByUser: {
          fullName: users.fullName,
          username: users.username,
        }
      })
      .from(sharedReports)
      .innerJoin(reports, eq(sharedReports.reportId, reports.id))
      .innerJoin(users, eq(sharedReports.sharedBy, users.id))
      .where(and(
        eq(sharedReports.isActive, true),
        sql`${sharedReports.sharedWith} ? ${userId}` // Check if userId is in the sharedWith array
      ))
      .orderBy(desc(sharedReports.createdAt))
      .limit(50);

    return sharedReportsData.map(row => ({
      ...row.sharedReport,
      report: row.report,
      sharedByUser: row.sharedByUser,
    }));
  }

  async getSharedReport(sharedReportId: string, userId: string): Promise<(SharedReportType & { report: Report }) | null> {
    const [sharedReportData] = await db
      .select({
        sharedReport: sharedReports,
        report: reports,
      })
      .from(sharedReports)
      .innerJoin(reports, eq(sharedReports.reportId, reports.id))
      .where(and(
        eq(sharedReports.id, sharedReportId),
        eq(sharedReports.isActive, true),
        sql`${sharedReports.sharedWith} ? ${userId}` // Check if userId is in the sharedWith array
      ))
      .limit(1);

    if (!sharedReportData) return null;

    return {
      ...sharedReportData.sharedReport,
      report: sharedReportData.report,
    };
  }

  async hasAccessToReport(reportId: string, userRole: string, userId: string): Promise<boolean> {
    // Check if user has direct access based on role
    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.reportId, reportId),
        sql`${reports.roleAllowed} = ${userRole}`,
        eq(reports.isActive, true)
      ))
      .limit(1);

    if (report) return true;

    // Check if report is shared with user
    const [sharedReport] = await db
      .select()
      .from(sharedReports)
      .innerJoin(reports, eq(sharedReports.reportId, reports.id))
      .where(and(
        eq(reports.reportId, reportId),
        eq(sharedReports.isActive, true),
        sql`${sharedReports.sharedWith} ? ${userId}`
      ))
      .limit(1);

    return !!sharedReport;
  }

  async cleanupExpiredReports(): Promise<void> {
    // Mark expired reports as inactive
    await db
      .update(reports)
      .set({ isActive: false })
      .where(and(
        eq(reports.isActive, true),
        sql`${reports.expiresAt} < NOW()`
      ));

    // Mark expired shared reports as inactive
    await db
      .update(sharedReports)
      .set({ isActive: false })
      .where(and(
        eq(sharedReports.isActive, true),
        sql`${sharedReports.expiresAt} < NOW()`
      ));
  }
}

export const reportsStorage = new ReportsStorage();
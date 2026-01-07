import { db } from "./db";
import {
  users,
  schools,
  students,
  annualHealthCards,
  monthlyCheckups,
  mealLogs,
  hostelAttendance,
  auditLogs,
  refreshTokens,
  type User,
  type InsertUser,
  type School,
  type InsertSchool,
  type Student,
  type InsertStudent,
  type AnnualHealthCard,
  type InsertAnnualHealthCard,
  type MonthlyCheckup,
  type InsertMonthlyCheckup,
  type MealLog,
  type InsertMealLog,
  type HostelAttendance,
  type InsertHostelAttendance,
  type AuditLog,
  type InsertAuditLog,
  notifications,
  type Notification,
  type InsertNotification,
  referrals,
  type Referral,
  type InsertReferral,
  annualHealthCards as annualHealthCardsTable,
} from "@shared/schema";
import { eq, and, like, or, desc, gte, lte, sql, count, inArray, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getUserProfile(id: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getUsers(page?: number, limit?: number): Promise<{ users: User[]; total: number }>;

  getSchool(id: string, includePending?: boolean): Promise<School | undefined>;
  getSchools(page?: number, limit?: number, region?: string, includePending?: boolean): Promise<{ schools: School[]; total: number }>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: string, data: Partial<InsertSchool>): Promise<School | undefined>;

  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUniqueId(uniqueId: string): Promise<Student | undefined>;
  getStudents(params?: {
    schoolId?: string;
    classSection?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ students: Student[]; total: number }>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, data: Partial<InsertStudent>): Promise<Student | undefined>;

  getAnnualHealthCard(id: string): Promise<AnnualHealthCard | undefined>;
  getAnnualHealthCards(params?: {
    studentId?: string;
    schoolId?: string;
    status?: string;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<{ cards: AnnualHealthCard[]; total: number }>;
  createAnnualHealthCard(card: InsertAnnualHealthCard): Promise<AnnualHealthCard>;
  updateAnnualHealthCard(id: string, data: Partial<InsertAnnualHealthCard>): Promise<AnnualHealthCard | undefined>;

  getMonthlyCheckup(id: string): Promise<MonthlyCheckup | undefined>;
  getMonthlyCheckups(params?: {
    studentId?: string;
    schoolId?: string;
    classSection?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<{ checkups: MonthlyCheckup[]; total: number }>;
  createMonthlyCheckup(checkup: InsertMonthlyCheckup): Promise<MonthlyCheckup>;

  getMealLog(id: string): Promise<MealLog | undefined>;
  getMealLogs(params?: {
    schoolId?: string;
    schoolIds?: string[];
    classSection?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    mealType?: string;
    limit?: number;
  }): Promise<MealLog[]>;
  createMealLog(log: InsertMealLog): Promise<MealLog>;
  updateMealLog(id: string, data: Partial<InsertMealLog>): Promise<MealLog | undefined>;
  deleteMealLog(id: string): Promise<void>;

  getHostelAttendance(params: {
    schoolId?: string;
    date: string;
  }): Promise<HostelAttendance[]>;
  createHostelAttendance(attendance: InsertHostelAttendance): Promise<HostelAttendance>;
  updateHostelAttendance(id: string, data: Partial<InsertHostelAttendance>): Promise<HostelAttendance | undefined>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getRefreshToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deleteRefreshToken(token: string): Promise<void>;

  getDashboardMetrics(role: string, userId: string, schoolId?: string, classSection?: string, district?: string, month?: number, year?: number): Promise<any>;

  // Referral methods
  getReferral(id: string): Promise<Referral | undefined>;
  getReferrals(params?: {
    studentId?: string;
    schoolId?: string;
    healthCardId?: string;
    status?: string;
    referralType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ referrals: Referral[]; total: number }>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: string, data: Partial<InsertReferral>): Promise<Referral | undefined>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(params?: {
    userId?: string;
    role?: string;
    schoolId?: string;
    classSection?: string;
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: Notification[]; total: number }>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string, role: string, schoolId?: string, classSection?: string): Promise<number>;
  getUnreadNotificationCount(userId: string, role: string, schoolId?: string, classSection?: string): Promise<number>;

  // Drilldown method
  getDrilldownStudents(params: {
    metric: string;
    schoolIds: string[];
    year: number;
    month: number;
  }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
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
      approvalStatus: users.approvalStatus,
      approverId: users.approverId,
      approverNote: users.approverNote,
      requestedAt: users.requestedAt,
      approvedAt: users.approvedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
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
      approvalStatus: users.approvalStatus,
      approverId: users.approverId,
      approverNote: users.approverNote,
      requestedAt: users.requestedAt,
      approvedAt: users.approvedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.username, username));
    return user;
  }

  async getUserProfile(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const [totalResult] = await db.select({ count: count() }).from(users);
    const result = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    return { users: result, total: totalResult?.count || 0 };
  }

  async getSchool(id: string, includePending = false): Promise<School | undefined> {
    let query = db.select().from(schools).where(eq(schools.id, id)) as any;
    if (!includePending) {
      query = query.where(eq(schools.approvalStatus, "Approved"), eq(schools.isActive, true)) as any;
    }
    const [school] = await query;
    return school;
  }

  async getSchools(page = 1, limit = 100, region?: string, includePending = false): Promise<{ schools: School[]; total: number }> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (!includePending) {
      conditions.push(eq(schools.approvalStatus, "Approved"));
      conditions.push(eq(schools.isActive, true));
    }
    if (region) {
      conditions.push(eq(schools.region, region));
    }

    let query = db.select().from(schools);
    let countQuery = db.select({ count: count() }).from(schools);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [totalResult] = await countQuery;
    const result = await query.orderBy(desc(schools.createdAt)).limit(limit).offset(offset);
    return { schools: result, total: totalResult?.count || 0 };
  }

  async createSchool(school: InsertSchool): Promise<School> {
    // Ensure by default programmatic / fixture-created schools remain approved and active
    const insert = { ...(school as any) } as any;
    if (insert.approvalStatus === undefined || insert.approvalStatus === null) {
      insert.approvalStatus = "Approved"; // programmatic default
    }
    if (insert.isActive === undefined || insert.isActive === null) {
      insert.isActive = true;
    }

    const [newSchool] = await db.insert(schools).values(insert as any).returning();
    return newSchool;
  }

  async updateSchool(id: string, data: Partial<InsertSchool>): Promise<School | undefined> {
    const [school] = await db
      .update(schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByUniqueId(uniqueId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.uniqueId, uniqueId));
    return student;
  }

  async getStudents(params?: {
    schoolId?: string;
    classSection?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ students: Student[]; total: number }> {
    const { schoolId, classSection, search, page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;

    let query = db.select().from(students);

    const conditions = [];
    if (schoolId) conditions.push(eq(students.schoolId, schoolId));
    if (classSection && classSection !== "all") conditions.push(eq(students.classSection, classSection));
    if (search) {
      conditions.push(
        or(
          like(students.fullName, `%${search}%`),
          like(students.uniqueId, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count with same conditions
    let countQuery = db.select({ count: count() }).from(students);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [totalResult] = await countQuery;
    
    const result = await query.orderBy(desc(students.createdAt)).limit(limit).offset(offset);

    return { students: result, total: totalResult?.count || 0 };
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    // Drizzle expects date columns to be strings in 'YYYY-MM-DD' format for inserts.
    const insertData: any = { ...student };
    if (student.dateOfBirth) {
      insertData.dateOfBirth = student.dateOfBirth.toISOString().split('T')[0];
    }
    if (student.enrollmentDate) {
      insertData.enrollmentDate = student.enrollmentDate.toISOString().split('T')[0];
    }

    const [newStudent] = await db.insert(students).values(insertData).returning();
    return newStudent;
  }

  async updateStudent(id: string, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const updateData: { [key: string]: any } = { ...data, updatedAt: new Date() };

    // Drizzle expects date columns to be strings in 'YYYY-MM-DD' format for updates.
    if (data.dateOfBirth) {
      const dateOfBirth = data.dateOfBirth instanceof Date ? data.dateOfBirth : new Date(data.dateOfBirth);
      updateData.dateOfBirth = dateOfBirth.toISOString().split('T')[0];
    }
    if (data.enrollmentDate) {
      const enrollmentDate = data.enrollmentDate instanceof Date ? data.enrollmentDate : new Date(data.enrollmentDate);
      updateData.enrollmentDate = enrollmentDate.toISOString().split('T')[0];
    }
    const [student] = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, id))
      .returning();
    return student;
  }

  async getAnnualHealthCard(id: string): Promise<AnnualHealthCard | undefined> {
    const [card] = await db.select().from(annualHealthCards).where(eq(annualHealthCards.id, id));
    return card;
  }

  async getAnnualHealthCards(params?: {
    studentId?: string;
    schoolId?: string;
    classSection?: string;
    status?: string;
    year?: number | string;
    page?: number;
    limit?: number;
    createdBy?: string;
  }): Promise<{ cards: AnnualHealthCard[]; total: number }> {
    const { studentId, schoolId, classSection, status, year, page = 1, limit = 10, createdBy } = params || {};
    const offset = (page - 1) * limit;

    const conditions = [];
    if (studentId) conditions.push(eq(annualHealthCards.studentId, studentId));
    if (schoolId) conditions.push(eq(annualHealthCards.schoolId, schoolId));
    if (classSection) conditions.push(eq(annualHealthCards.classSection, classSection));
    if (createdBy) conditions.push(eq(annualHealthCards.dataEntryBy, createdBy));
    if (status && status !== "all") {
      const s = String(status);
      conditions.push(sql`lower(${annualHealthCards.status}) = ${s.toLowerCase()}`);
    }
    // Year filter temporarily disabled so health cards return regardless of year
    // (Re-enable by adding a numeric year check here if needed in future)

    let query = db.select().from(annualHealthCards);
    let countQuery = db.select({ count: count() }).from(annualHealthCards);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [totalResult] = await countQuery;
    const result = await query.orderBy(desc(annualHealthCards.createdAt)).limit(limit).offset(offset);

    return { cards: result, total: totalResult?.count || 0 };
  }

  async createAnnualHealthCard(card: InsertAnnualHealthCard): Promise<AnnualHealthCard> {
    const [newCard] = await db.insert(annualHealthCards).values(card as any).returning();
    return newCard;
  }

  async updateAnnualHealthCard(id: string, data: Partial<InsertAnnualHealthCard>): Promise<AnnualHealthCard | undefined> {
    const [card] = await db
      .update(annualHealthCards)
      .set({ ...data as any, updatedAt: new Date() })
      .where(eq(annualHealthCards.id, id))
      .returning();
    return card;
  }

  async getMonthlyCheckup(id: string): Promise<MonthlyCheckup | undefined> {
    const [checkup] = await db.select().from(monthlyCheckups).where(eq(monthlyCheckups.id, id));
    return checkup;
  }

  async getMonthlyCheckups(params?: {
    studentId?: string;
    schoolId?: string;
    classSection?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }): Promise<{ checkups: MonthlyCheckup[]; total: number }> {
    const { studentId, schoolId, classSection, month, year, page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;

    const conditions = [];
    if (studentId) conditions.push(eq(monthlyCheckups.studentId, studentId));
    if (schoolId) conditions.push(eq(monthlyCheckups.schoolId, schoolId));
    if (month) conditions.push(eq(monthlyCheckups.month, month));
    if (year) conditions.push(eq(monthlyCheckups.year, year));

    if (classSection) {
      // Need to join with students table to filter by classSection
      let query = db.select({ checkup: monthlyCheckups }).from(monthlyCheckups).innerJoin(students, eq(monthlyCheckups.studentId, students.id));
      let countQuery = db.select({ count: count() }).from(monthlyCheckups).innerJoin(students, eq(monthlyCheckups.studentId, students.id));

      const allConditions = [...conditions, eq(students.classSection, classSection)];

      query = query.where(and(...allConditions)) as any;
      countQuery = countQuery.where(and(...allConditions)) as any;

      const [totalResult] = await countQuery;
      const joinedResult = await query.orderBy(desc(monthlyCheckups.createdAt)).limit(limit).offset(offset);

      return { checkups: joinedResult.map(r => r.checkup), total: totalResult?.count || 0 };
    } else {
      let query = db.select().from(monthlyCheckups);
      let countQuery = db.select({ count: count() }).from(monthlyCheckups);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
        countQuery = countQuery.where(and(...conditions)) as any;
      }

      const [totalResult] = await countQuery;
      const result = await query.orderBy(desc(monthlyCheckups.createdAt)).limit(limit).offset(offset);

      return { checkups: result, total: totalResult?.count || 0 };
    }
  }

  async createMonthlyCheckup(checkup: InsertMonthlyCheckup): Promise<MonthlyCheckup> {
    const [newCheckup] = await db.insert(monthlyCheckups).values(checkup).returning();
    return newCheckup;
  }

  async getMealLog(id: string): Promise<MealLog | undefined> {
    const [log] = await db.select().from(mealLogs).where(eq(mealLogs.id, id));
    return log;
  }

  async getMealLogs(params?: {
    schoolId?: string;
    schoolIds?: string[];
    date?: string;
    startDate?: string;
    endDate?: string;
    mealType?: string;
    limit?: number;
  }): Promise<MealLog[]> {
    const { schoolId, schoolIds, date, startDate, endDate, mealType, limit } = params || {};

    const conditions = [];
    if (schoolId) conditions.push(eq(mealLogs.schoolId, schoolId));
    if (!schoolId && schoolIds && schoolIds.length > 0) {
      conditions.push(inArray(mealLogs.schoolId, schoolIds));
    }
    if (date) conditions.push(eq(mealLogs.date, date));
    if (startDate) conditions.push(gte(mealLogs.date, startDate));
    if (endDate) conditions.push(lte(mealLogs.date, endDate));
    if (mealType) conditions.push(eq(mealLogs.mealType, mealType as any));

    let query = db.select().from(mealLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(mealLogs.date), desc(mealLogs.createdAt)) as any;
    if (limit) {
      query = query.limit(limit) as any;
    }

    return await query;
  }

  async createMealLog(log: InsertMealLog): Promise<MealLog> {
    // Normalize mealType to lowercase to keep DB values consistent and comparisons simple
    const insert = { ...log } as any;
    if (insert.mealType) insert.mealType = String(insert.mealType).toLowerCase();

    const [newLog] = await db.insert(mealLogs).values(insert).returning();
    return newLog;
  }

  async updateMealLog(id: string, data: Partial<InsertMealLog>): Promise<MealLog | undefined> {
    const [updatedLog] = await db
      .update(mealLogs)
      .set({ ...data })
      .where(eq(mealLogs.id, id))
      .returning();
    return updatedLog;
  }

  async deleteMealLog(id: string): Promise<void> {
    await db.delete(mealLogs).where(eq(mealLogs.id, id));
  }

  async getHostelAttendance(params: {
    schoolId?: string;
    studentId?: string;
    date: string;
  }): Promise<HostelAttendance[]> {
    const { schoolId, studentId, date } = params;

    const conditions = [eq(hostelAttendance.date, date)];
    if (schoolId) conditions.push(eq(hostelAttendance.schoolId, schoolId));
    if (studentId) conditions.push(eq(hostelAttendance.studentId, studentId));

    return await db
      .select()
      .from(hostelAttendance)
      .where(and(...conditions))
      .orderBy(desc(hostelAttendance.createdAt));
  }

  async createHostelAttendance(attendance: InsertHostelAttendance): Promise<HostelAttendance> {
    const [newAttendance] = await db.insert(hostelAttendance).values(attendance).returning();
    return newAttendance;
  }

  async updateHostelAttendance(id: string, data: Partial<InsertHostelAttendance>): Promise<HostelAttendance | undefined> {
    const [attendance] = await db
      .update(hostelAttendance)
      .set(data)
      .where(eq(hostelAttendance.id, id))
      .returning();
    return attendance;
  }

  async getHostelMonthlyStats(params: {
    schoolId?: string;
    month: number;
    year: number;
    classSection?: string;
  }): Promise<{ summary: any; students: any[] }> {
    const { schoolId, month, year, classSection } = params;
    const { students: allStudentsRaw } = await this.getStudents({ schoolId, limit: 1000 });
    
    // Filter by classSection if provided
    const allStudents = classSection 
      ? allStudentsRaw.filter(s => s.classSection === classSection)
      : allStudentsRaw;
    
    const monthStart = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

    const records = await db
      .select()
      .from(hostelAttendance)
      .where(
        and(
          schoolId ? eq(hostelAttendance.schoolId, schoolId) : undefined as any,
          gte(hostelAttendance.date, monthStart),
          lte(hostelAttendance.date, monthEnd)
        )
      );

    const studentStats = allStudents.map((student) => {
      const studentRecords = records.filter((r) => r.studentId === student.id);
      const presentDays = studentRecords.filter((r) => r.checkInTime && !r.isVacation).length;
      const stayDays = studentRecords.filter((r) => r.checkInTime && !r.checkOutTime && !r.isVacation).length;
      const vacationDays = studentRecords.filter((r) => r.isVacation).reduce((sum, r) => {
        if (r.vacationStartDate && r.vacationEndDate) {
          const start = new Date(r.vacationStartDate);
          const end = new Date(r.vacationEndDate);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return sum;
      }, 0);

      const daysInMonth = new Date(year, month, 0).getDate();
      const presencePercentage = daysInMonth > 0 ? Math.round((presentDays / daysInMonth) * 100) : 0;

      return {
        ...student,
        presentDays,
        stayDays,
        vacationDays,
        presencePercentage,
      };
    });

    const totalStudents = allStudents.length;
    const avgPresentDays = totalStudents > 0 ? Math.round(studentStats.reduce((sum, s) => sum + s.presentDays, 0) / totalStudents) : 0;
    const avgStayDays = totalStudents > 0 ? Math.round(studentStats.reduce((sum, s) => sum + s.stayDays, 0) / totalStudents) : 0;
    const avgVacationDays = totalStudents > 0 ? Math.round(studentStats.reduce((sum, s) => sum + s.vacationDays, 0) / totalStudents) : 0;

    return {
      summary: {
        totalStudents,
        presentDays: avgPresentDays,
        stayDays: avgStayDays,
        vacationDays: avgVacationDays,
      },
      students: studentStats,
    };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(refreshTokens).values({ userId, token, expiresAt });
  }

  async getRefreshToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
    const [result] = await db
      .select({ userId: refreshTokens.userId, expiresAt: refreshTokens.expiresAt })
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return result;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async getPOAttendanceSummary(params: {
    schoolIds: string[];
    month: number;
    year: number;
  }): Promise<{
    totalStudents: number;
    totalPresent: number;
    totalAbsent: number;
    presentPercentage: number;
    schoolWise: Array<{
      schoolId: string;
      schoolName: string;
      totalStudents: number;
      present: number;
      absent: number;
      presentPercentage: number;
    }>;
  }> {
    const { schoolIds, month, year } = params;
    if (schoolIds.length === 0) {
      return {
        totalStudents: 0,
        totalPresent: 0,
        totalAbsent: 0,
        presentPercentage: 0,
        schoolWise: [],
      };
    }

    const monthStart = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

    // Get all students for these schools
    const allStudents: Student[] = [];
    for (const schoolId of schoolIds) {
      const { students } = await this.getStudents({ schoolId, limit: 10000 });
      allStudents.push(...students);
    }

    // Get attendance records for the month
    const attendanceRecords = await db
      .select()
      .from(hostelAttendance)
      .where(
        and(
          inArray(hostelAttendance.schoolId, schoolIds),
          sql`${hostelAttendance.date} >= ${sql.raw(`'${monthStart}'`)}`,
          sql`${hostelAttendance.date} <= ${sql.raw(`'${monthEnd}'`)}`
        )
      );

    // Get school names
    const schoolMap = new Map<string, string>();
    for (const schoolId of schoolIds) {
      const school = await this.getSchool(schoolId);
      if (school) schoolMap.set(schoolId, school.name);
    }

    // Calculate attendance by school
    const schoolStats = new Map<string, { students: Set<string>; presentDays: Map<string, number> }>();
    
    for (const student of allStudents) {
      if (!schoolStats.has(student.schoolId)) {
        schoolStats.set(student.schoolId, { students: new Set(), presentDays: new Map() });
      }
      schoolStats.get(student.schoolId)!.students.add(student.id);
    }

    // Count present days for each student
    for (const record of attendanceRecords) {
      if (record.checkInTime && !record.isVacation) {
        const stats = schoolStats.get(record.schoolId);
        if (stats) {
          const currentDays = stats.presentDays.get(record.studentId) || 0;
          stats.presentDays.set(record.studentId, currentDays + 1);
        }
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const schoolWise: Array<{
      schoolId: string;
      schoolName: string;
      totalStudents: number;
      present: number;
      absent: number;
      presentPercentage: number;
    }> = [];

    let totalStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    for (const [schoolId, stats] of Array.from(schoolStats.entries())) {
      const studentCount = stats.students.size;
      // A student is considered present if they have at least 1 day of attendance
      const present = Array.from(stats.presentDays.values()).filter(days => days > 0).length;
      const absent = studentCount - present;
      const presentPercentage = studentCount > 0 ? Math.round((present / studentCount) * 100) : 0;

      schoolWise.push({
        schoolId,
        schoolName: schoolMap.get(schoolId) || "Unknown School",
        totalStudents: studentCount,
        present,
        absent,
        presentPercentage,
      });

      totalStudents += studentCount;
      totalPresent += present;
      totalAbsent += absent;
    }

    const presentPercentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    return {
      totalStudents,
      totalPresent,
      totalAbsent,
      presentPercentage,
      schoolWise,
    };
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral;
  }

  async getReferrals(params?: {
    studentId?: string;
    schoolId?: string;
    healthCardId?: string;
    status?: string;
    referralType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ referrals: Referral[]; total: number }> {
    const { studentId, schoolId, healthCardId, status, referralType, page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;

    const conditions = [];
    if (studentId) conditions.push(eq(referrals.studentId, studentId));
    if (schoolId) conditions.push(eq(referrals.schoolId, schoolId));
    if (healthCardId) conditions.push(eq(referrals.healthCardId, healthCardId));
    if (status && status !== "all") conditions.push(eq(referrals.status, status as any));
    if (referralType) conditions.push(eq(referrals.referralType, referralType));

    let query = db.select().from(referrals);
    let countQuery = db.select({ count: count() }).from(referrals);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [totalResult] = await countQuery;
    const result = await query.orderBy(desc(referrals.createdAt)).limit(limit).offset(offset);

    return { referrals: result, total: totalResult?.count || 0 };
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async updateReferral(id: string, data: Partial<InsertReferral>): Promise<Referral | undefined> {
    const [referral] = await db
      .update(referrals)
      .set({ ...data as any, updatedAt: new Date() })
      .where(eq(referrals.id, id))
      .returning();
    return referral;
  }

  async getDashboardMetrics(role: string, userId: string, schoolId?: string, classSection?: string, district?: string, month?: number, year?: number): Promise<any> {
    const selectedYear = year || new Date().getFullYear();
    const selectedMonth = month || new Date().getMonth() + 1;

    // Build conditions for filtering
    const studentConditions = [];
    if (schoolId) studentConditions.push(eq(students.schoolId, schoolId));
    if (classSection) studentConditions.push(eq(students.classSection, classSection));
    const schoolCondition = studentConditions.length > 0 ? and(...studentConditions) : undefined;

    // For PO role, filter by district if no schoolId is provided
    let districtCondition = undefined;
    // If district filtering maps to a set of school IDs, we capture them here for use with other tables
    let schoolIdsForDistrict: string[] | undefined = undefined;
    if (role === "PO" && district && !schoolId) {
      // Get all schools in the district and filter students by those schools
      const schoolsInDistrict = await db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.district, district));

      const schoolIds = schoolsInDistrict.map(s => s.id);
      if (schoolIds.length > 0) {
        districtCondition = inArray(students.schoolId, schoolIds);
        schoolIdsForDistrict = schoolIds;
      } else {
        // No schools in district, return empty metrics
        return {
          totalSchools: 0,
          totalStudents: 0,
          pendingApprovals: 0,
          pendingHealthCards: 0,
          approvedCards: 0,
          rejectedCards: 0,
          healthCardCompletion: 0,
          monthlyCheckupCoverage: 0,
          referredCount: 0,
          primaryTreatmentCount: 0,
          mealCompliance: 0,
          totalCheckups: 0,
          monthlyCheckupsDue: 0,
          completedCheckups: 0,
          studentsChecked: 0,
          activeUsers: 0,
        };
      }
    }
    
    const cardSchoolCondition = schoolId ? eq(annualHealthCards.schoolId, schoolId) : undefined;
    const checkupSchoolCondition = schoolId ? eq(monthlyCheckups.schoolId, schoolId) : undefined;

    // For district filtering, we need to apply it to health cards and checkups too
    const cardDistrictCondition = districtCondition ? sql`${annualHealthCards.studentId} IN (SELECT id FROM students WHERE ${districtCondition})` : undefined;
    const checkupDistrictCondition = districtCondition ? sql`${monthlyCheckups.studentId} IN (SELECT id FROM students WHERE ${districtCondition})` : undefined;

    // For ClassTeacher, we need to filter cards and checkups by student's classSection
    // This requires joining with students table or filtering after fetch
    const [totalStudentsResult] = await db
      .select({ count: count() })
      .from(students)
      .where(schoolCondition || districtCondition || undefined);

    const [totalSchoolsResult] = await db.select({ count: count() }).from(schools);

    const [pendingCardsResult] = await db
      .select({ count: count() })
      .from(annualHealthCards)
      .where(and(eq(annualHealthCards.status, "Pending"), cardSchoolCondition));

    const [approvedCardsResult] = await db
      .select({ count: count() })
      .from(annualHealthCards)
      .where(and(eq(annualHealthCards.status, "Approved"), cardSchoolCondition));

    const [rejectedCardsResult] = await db
      .select({ count: count() })
      .from(annualHealthCards)
      .where(and(eq(annualHealthCards.status, "Rejected"), cardSchoolCondition));

    // For ClassTeacher, filter checkups by student's classSection
    let checkupsResult: any, referredResult: any, primaryResult: any;
    if (role === "ClassTeacher" && classSection) {
      // Get all checkups for the school, then filter by student's classSection
      const allCheckups = await db
        .select()
        .from(monthlyCheckups)
        .where(
          and(
            eq(monthlyCheckups.month, selectedMonth),
            eq(monthlyCheckups.year, selectedYear),
            checkupSchoolCondition
          )
        );
      
      const checkupsWithStudents = await Promise.all(
        allCheckups.map(async (checkup) => {
          const student = await this.getStudent(checkup.studentId);
          return { checkup, student };
        })
      );
      
      const filteredCheckups = checkupsWithStudents.filter(c => c.student?.classSection === classSection);
      checkupsResult = { count: filteredCheckups.length };
      referredResult = { count: filteredCheckups.filter(c => c.checkup.treatmentType === "Referred").length };
      primaryResult = { count: filteredCheckups.filter(c => c.checkup.treatmentType === "Primary").length };
    } else {
      [checkupsResult] = await db
        .select({ count: count() })
        .from(monthlyCheckups)
        .where(
          and(
            eq(monthlyCheckups.month, selectedMonth),
            eq(monthlyCheckups.year, selectedYear),
            checkupSchoolCondition
          )
        );

      [referredResult] = await db
        .select({ count: count() })
        .from(monthlyCheckups)
        .where(
          and(
            eq(monthlyCheckups.treatmentType, "Referred"),
            eq(monthlyCheckups.year, selectedYear),
            checkupSchoolCondition
          )
        );

      [primaryResult] = await db
        .select({ count: count() })
        .from(monthlyCheckups)
        .where(
          and(
            eq(monthlyCheckups.treatmentType, "Primary"),
            eq(monthlyCheckups.year, selectedYear),
            checkupSchoolCondition
          )
        );
    }

    // Calculate real meal compliance
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
    const monthEnd = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

    const mealLogsResult = await db
      .select()
      .from(mealLogs)
      .where(
        and(
          schoolId ? eq(mealLogs.schoolId, schoolId) : undefined as any,
          gte(mealLogs.date, monthStart),
          lte(mealLogs.date, monthEnd)
        )
      );

    const uniqueMealDates = new Set(mealLogsResult.map(log => log.date)).size;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const mealCompliance = daysInMonth > 0 ? Math.round((uniqueMealDates / daysInMonth) * 100) : 0;

    // Calculate total referrals for the school (not just monthly)
    let totalReferrals = 0;
    try {
      // Build conditions directly for referrals table to avoid referencing other tables in WHERE
      const referralConditions: any[] = [];
      if (schoolId) {
        referralConditions.push(eq(referrals.schoolId, schoolId));
      } else if (Array.isArray(schoolIdsForDistrict) && schoolIdsForDistrict.length > 0) {
        // PO/district-level filtering: restrict by the list of school IDs in this district
        referralConditions.push(inArray(referrals.schoolId, schoolIdsForDistrict));
      }

      let totalQuery: any = db.select({ count: count() }).from(referrals);
      if (referralConditions.length > 0) {
        totalQuery = totalQuery.where(and(...referralConditions)) as any;
      }

      const [totalReferralsResult] = await totalQuery;
      totalReferrals = totalReferralsResult?.count || 0;
    } catch (error: any) {
      console.warn("Referrals table not available for total referrals:", error?.message || String(error));
    }

    const totalStudents = Number(totalStudentsResult?.count) || 0;
    const healthCardCompletion = totalStudents > 0
      ? Math.round(((Number(approvedCardsResult?.count) || 0) / totalStudents) * 100)
      : 0;
    const checkupCoverage = totalStudents > 0
      ? Math.round(((Number(checkupsResult?.count) || 0) / totalStudents) * 100)
      : 0;

    // Total health cards for the selected year
    const [totalHealthCardsResult] = await db
      .select({ count: count() })
      .from(annualHealthCards)
      .where(and(eq(annualHealthCards.year, selectedYear), cardSchoolCondition || undefined, cardDistrictCondition || undefined) as any);

    // Vaccination coverage: proportion of students with an annual health card this year (proxy for vaccination data availability)
    const vaccinationCoverage = totalStudents > 0
      ? Math.round(((totalHealthCardsResult?.count || 0) / totalStudents) * 100)
      : 0;

    // Data completeness heuristic: average of health card completion and monthly checkup coverage
    const dataCompleteness = Math.round((healthCardCompletion + checkupCoverage) / 2);

    // System uptime percentage based on process uptime over 30 days window
    const systemUptime = Math.min(100, parseFloat(((process.uptime() / (30 * 24 * 60 * 60)) * 100).toFixed(2)));

    // Monthly trends for the last 6 months (health cards, checkups, vaccinations)
    const monthlyTrends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      // Use Date objects for range comparisons (driver expects Date for timestamps)
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);

      let cardsCount = 0;
      let checkupsCount = 0;
      try {
        const [cardsInMonth] = await db
          .select({ count: count() })
          .from(annualHealthCards)
          .where(and(eq(annualHealthCards.year, y), gte(annualHealthCards.createdAt as any, startDate), lte(annualHealthCards.createdAt as any, endDate), cardSchoolCondition || undefined, cardDistrictCondition || undefined) as any);

        const [checkupsInMonth] = await db
          .select({ count: count() })
          .from(monthlyCheckups)
          .where(and(eq(monthlyCheckups.month, m), eq(monthlyCheckups.year, y), checkupSchoolCondition || undefined, checkupDistrictCondition || undefined) as any);

        cardsCount = Number(cardsInMonth?.count) || 0;
        checkupsCount = Number(checkupsInMonth?.count) || 0;
      } catch (err: any) {
        console.error('monthlyTrends DB query failed for', { year: y, month: m, startDate: startDate, endDate: endDate, err: err?.message || String(err) });
        // fallback to 0 counts so that dashboard still returns
        cardsCount = 0;
        checkupsCount = 0;
      }

      monthlyTrends.push({ month: date.toLocaleString('default', { month: 'short' }), healthCards: cardsCount, checkups: checkupsCount, vaccinations: cardsCount });
    }

    return {
      totalSchools: Number(totalSchoolsResult?.count) || 0,
      totalStudents,
      totalHealthCards: Number(totalHealthCardsResult?.count) || 0,
      pendingApprovals: Number(pendingCardsResult?.count) || 0,
      pendingHealthCards: Number(pendingCardsResult?.count) || 0,
      approvedCards: Number(approvedCardsResult?.count) || 0,
      rejectedCards: Number(rejectedCardsResult?.count) || 0,
      healthCardCompletion,
      monthlyCheckupCoverage: checkupCoverage,
      vaccinationCoverage,
      healthScreeningRate: checkupCoverage,
      dataCompleteness,
      systemUptime,
      monthlyTrends,
      referredCount: totalReferrals,
      primaryTreatmentCount: Number(primaryResult?.count) || 0,
      mealCompliance,
      totalCheckups: Number(checkupsResult?.count) || 0,
      monthlyCheckupsDue: Math.max(0, totalStudents - (Number(checkupsResult?.count) || 0)),
      completedCheckups: Number(checkupsResult?.count) || 0,
      studentsChecked: Number(checkupsResult?.count) || 0,
      activeUsers: 0, // Will be calculated from actual active users
    };
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification as any).returning();
    return newNotification;
  }

  async getNotifications(params?: {
    userId?: string;
    role?: string;
    schoolId?: string;
    classSection?: string;
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const { userId, role, schoolId, classSection, isRead, type, page = 1, limit = 10 } = params || {};
    const offset = (page - 1) * limit;

    const conditions = [];
    if (role) conditions.push(eq(notifications.receiverRole, role as any));
    if (schoolId) {
      // Show notifications targeted to their school OR broadcast to all schools (null)
      conditions.push(or(
        eq(notifications.receiverSchoolId, schoolId),
        isNull(notifications.receiverSchoolId)
      ) as any);
    }
    if (classSection !== undefined) {
      // For ClassTeacher, show notifications that are either:
      // 1. Targeted to their specific class, OR
      // 2. Not targeted to any specific class (null)
      conditions.push(or(
        eq(notifications.receiverClassSection, classSection),
        isNull(notifications.receiverClassSection)
      ) as any);
    }
    if (isRead !== undefined) conditions.push(eq(notifications.isRead, isRead));
    if (type) conditions.push(eq(notifications.type, type as any));

    let query = db.select().from(notifications);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count
    let countQuery = db.select({ count: count() }).from(notifications);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [totalResult] = await countQuery;

    const result = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return { notifications: result, total: totalResult?.count || 0 };
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: string, role: string, schoolId?: string, classSection?: string): Promise<number> {
    const conditions = [
      eq(notifications.receiverRole, role as any),
      eq(notifications.isRead, false)
    ];

    if (schoolId) {
      conditions.push(or(
        eq(notifications.receiverSchoolId, schoolId),
        isNull(notifications.receiverSchoolId)
      ) as any);
    }
    if (classSection !== undefined) {
      conditions.push(or(
        eq(notifications.receiverClassSection, classSection),
        isNull(notifications.receiverClassSection)
      ) as any);
    }

    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(...conditions))
      .returning({ id: notifications.id });

    return result.length;
  }

  async getUnreadNotificationCount(userId: string, role: string, schoolId?: string, classSection?: string): Promise<number> {
    const conditions = [
      eq(notifications.receiverRole, role as any),
      eq(notifications.isRead, false)
    ];

    if (schoolId) {
      // Count notifications targeted to their school OR broadcast to all schools (null)
      conditions.push(or(
        eq(notifications.receiverSchoolId, schoolId),
        isNull(notifications.receiverSchoolId)
      ) as any);
    }
    if (classSection !== undefined) {
      // For ClassTeacher, count notifications that are either:
      // 1. Targeted to their specific class, OR
      // 2. Not targeted to any specific class (null)
      conditions.push(or(
        eq(notifications.receiverClassSection, classSection),
        isNull(notifications.receiverClassSection)
      ) as any);
    }

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(...conditions));

    return result?.count || 0;
  }

  async getDrilldownStudents(params: {
    metric: string;
    schoolIds: string[];
    year: number;
    month: number;
    schoolId?: string; // For single school drilldown
  }): Promise<any[]> {
    const { metric, schoolIds, year, month } = params;
  
    // Get all students for the given schools first
    const allStudentsInSchools = await db
      .select()
      .from(students)
      .where(inArray(students.schoolId, schoolIds));
  
    if (allStudentsInSchools.length === 0) {
      return [];
    }
  
    const studentIds = allStudentsInSchools.map(s => s.id);
  
    // Get all relevant monthly and annual cards for these students
    const monthlyCheckupsForMonth = await db
      .select()
      .from(monthlyCheckups)
      .where(and(
        inArray(monthlyCheckups.studentId, studentIds),
        eq(monthlyCheckups.month, month),
        eq(monthlyCheckups.year, year)
      ));
  
    const annualCardsForYear = await db
      .select()
      .from(annualHealthCardsTable)
      .where(and(
        inArray(annualHealthCardsTable.studentId, studentIds),
        eq(annualHealthCardsTable.year, year)
      ));
  
    const filteredStudentIds = new Set<string>();
  
    // Apply logic for each student
    for (const student of allStudentsInSchools) {
      const monthlyCard = monthlyCheckupsForMonth.find(c => c.studentId === student.id);
      const annualCard = annualCardsForYear.find(c => c.studentId === student.id);
  
      let conditionMet = false;
  
      switch (metric) {
        case "underweight":
          if (monthlyCard?.bmi) {
            conditionMet = parseFloat(monthlyCard.bmi) < 18.5;
          } else if (annualCard?.bmi) {
            conditionMet = parseFloat(annualCard.bmi) < 18.5;
          }
          break;
        case "overweight":
        case "obesity":
          if (monthlyCard?.bmi) {
            conditionMet = parseFloat(monthlyCard.bmi) >= 25;
          } else if (annualCard?.bmi) {
            conditionMet = parseFloat(annualCard.bmi) >= 25;
          }
          break;
        case "anemia":
          if (monthlyCard?.symptoms?.includes("Anemia")) {
            conditionMet = true;
          } else if (annualCard) {
            conditionMet = annualCard.summary_deficiency_anemia === true || annualCard.b3_severe_anemia === true;
          }
          break;
        case "tb":
          if (monthlyCard?.symptoms?.some(s => s.toLowerCase().includes('tb') || s.toLowerCase().includes('tuberculosis'))) {
            conditionMet = true;
          } else if (annualCard) {
            conditionMet = annualCard.summary_disease_tuberculosis === true || annualCard.c8_suspected === true;
          }
          break;
        case "leprosy":
          if (monthlyCard?.symptoms?.some(s => s.toLowerCase().includes('leprosy'))) {
            conditionMet = true;
          } else if (annualCard) {
            conditionMet = annualCard.summary_disease_leprosy === true || annualCard.c7_suspected === true;
          }
          break;
        case "menstrual_issues":
          if (monthlyCard?.symptoms?.some(s => s.toLowerCase().includes('menstrual'))) {
            conditionMet = true;
          } else if (annualCard) {
            conditionMet = annualCard.summary_adolescent_menstrual_issues === true || annualCard.e7_severe_menstrual_pain === true;
          }
          break;
        case "referrals":
          if (monthlyCard?.treatmentType === "Referred") {
            conditionMet = true;
          } else if (annualCard) {
            conditionMet = annualCard.referral_recommended === true;
          }
          break;
        case "high_risk":
          let monthlyHighRisk = monthlyCard?.bmi ? parseFloat(monthlyCard.bmi) < 11.5 : false;
          let annualHighRisk = annualCard ? (annualCard.c7_suspected === true || annualCard.c8_suspected === true || annualCard.b3_severe_anemia === true || (annualCard.bmi ? parseFloat(annualCard.bmi) < 11.5 : false)) : false;
          conditionMet = monthlyHighRisk || annualHighRisk;
          break;
        default:
          // Handle generic deficiencies and diseases
          const isDeficiency = metric.startsWith("deficiency_");
          const isDisease = metric.startsWith("disease_");
          if (isDeficiency || isDisease) {
            const keyword = metric.replace("deficiency_", "").replace("disease_", "");
            if (monthlyCard?.symptoms?.some(s => s.toLowerCase().includes(keyword))) {
              conditionMet = true;
            } else if (annualCard) {
              const field = isDeficiency ? `summary_deficiency_${keyword}` : `summary_disease_${keyword}`;
              if (field in annualCard) {
                conditionMet = (annualCard as any)[field] === true;
              }
            }
          }
      }
  
      if (conditionMet) {
        filteredStudentIds.add(student.id);
      }
    }
  
    if (filteredStudentIds.size === 0) {
      return [];
    }
  
    const studentIdList = Array.from(filteredStudentIds);
  
    switch (metric) {
      // No specific logic needed here for now as we are fetching all details below
      // but this is where you could add metric-specific joins if needed for performance.
      default:
        break;
    }
  
    const studentDetails = await db
      .select()
      .from(students)
      .where(inArray(students.id, studentIdList));

    const studentDetailsWithCards = await Promise.all(studentDetails.map(async (student) => {
      const { cards: annualCards } = await this.getAnnualHealthCards({ studentId: student.id, year, limit: 1 });
      const { checkups: monthlyCards } = await this.getMonthlyCheckups({ studentId: student.id, month, year, limit: 1 });
      let referrals: any[] = [];
      try {
        const referralResult = await this.getReferrals({ studentId: student.id, limit: 5 });
        referrals = referralResult.referrals;
      } catch (error: any) {
        console.warn("Referrals table not available for drilldown:", error?.message || String(error));
      }
      const school = await this.getSchool(student.schoolId);
      const teacher = await db.query.users.findFirst({
        where: and(eq(users.schoolId, student.schoolId), eq(users.classSection, student.classSection), eq(users.role, 'ClassTeacher'))
      });

      return {
        ...student,
        schoolName: school?.name || 'N/A',
        classTeacherName: teacher?.fullName || 'N/A',
        annualHealthCard: annualCards[0] || null,
        monthlyHealthCard: monthlyCards[0] || null,
        referralDetails: referrals,
      };
    }));

    return studentDetailsWithCards;
  }
}


export const storage = new DatabaseStorage();

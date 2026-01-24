import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, roleEnum } from "../shared/schema.js";

export const reportTypeEnum = ["PDF", "EXCEL"] as const;
export type ReportType = typeof reportTypeEnum[number];

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: text("report_id").notNull().unique(), // User-friendly report ID
  reportType: text("report_type").notNull().$type<ReportType>(),
  reportCategory: text("report_category").notNull(), // annual-health, monthly-checkup, etc.
  roleAllowed: text("role_allowed").notNull().$type<typeof roleEnum[number]>(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  generatedBy: varchar("generated_by").notNull(),
  generatedFor: varchar("generated_for"), // schoolId, studentId, etc.
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sharedReports = pgTable("shared_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  sharedBy: varchar("shared_by").notNull(),
  sharedWith: jsonb("shared_with").$type<string[]>().notNull(), // Array of user IDs
  message: text("message"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportsRelations = relations(reports, ({ one, many }) => ({
  generatedByUser: one(users, {
    fields: [reports.generatedBy],
    references: [users.id],
  }),
  sharedReports: many(sharedReports),
}));

export const sharedReportsRelations = relations(sharedReports, ({ one }) => ({
  report: one(reports, {
    fields: [sharedReports.reportId],
    references: [reports.id],
  }),
  sharedByUser: one(users, {
    fields: [sharedReports.sharedBy],
    references: [users.id],
  }),
}));

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSharedReportSchema = createInsertSchema(sharedReports).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertSharedReport = z.infer<typeof insertSharedReportSchema>;
export type SharedReportType = typeof sharedReports.$inferSelect;
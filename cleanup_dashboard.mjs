import * as fs from "fs";

const storagePath = "server/storage.ts";
let content = fs.readFileSync(storagePath, "utf-8");

// Find the getLSDashboardMetrics method and replace it entirely
const methodRegex = /async getLSDashboardMetrics\(userId: string, schoolId\?: string\): Promise<any> \{\s*\/\/ Menstrual tracking deprecated[\s\S]*?(?=\n  \/\/ Notification methods|$)/;

const replacement = `async getLSDashboardMetrics(userId: string, schoolId?: string): Promise<any> {
    // Menstrual tracking deprecated - returning empty metrics
    return { message: "Menstrual metrics deprecated" };
  }

  // Notification methods`;

content = content.replace(methodRegex, replacement);

// Remove any remaining references to menstrualHealthRecords
content = content.replace(/[\s]*await db\.select[\s\S]*?menstrualHealthRecords[\s\S]*?;?\n/g, "");
content = content.replace(/[\s]*const \[[\w]+\] = await db\.select[\s\S]*?menstrualRecordProblems[\s\S]*?;?\n/g, "");

fs.writeFileSync(storagePath, content, "utf-8");

console.log("✅ Cleaned up getLSDashboardMetrics method");

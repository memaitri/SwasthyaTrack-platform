import * as fs from "fs";

const storagePath = "server/storage.ts";
let content = fs.readFileSync(storagePath, "utf-8");

// Remove interface methods for menstrual records
content = content.replace(
  /\n  // Menstrual health records.*?\n  updateMenstrualRecord.*?\n/s,
  "\n"
);

// Remove the interface method declarations
content = content.replace(/\n  getMenstrualRecord.*?\n/s, "\n");
content = content.replace(/\n  getMenstrualRecords.*?\n/s, "\n");
content = content.replace(/\n  createMenstrualRecord.*?\n/s, "\n");
content = content.replace(/\n  updateMenstrualRecord.*?\n/s, "\n");

// Remove implementation - find and remove async getMenstrualRecord
const pattern1 = /\n  async getMenstrualRecord\(id: string\)[\s\S]*?^\n  \}/m;
content = content.replace(pattern1, "");

// Remove async getMenstrualRecords
const pattern2 = /\n  async getMenstrualRecords\([\s\S]*?^\n  \}/m;
content = content.replace(pattern2, "");

// Remove async createMenstrualRecord
const pattern3 = /\n  async createMenstrualRecord\([\s\S]*?^\n  \}/m;
content = content.replace(pattern3, "");

// Remove async updateMenstrualRecord
const pattern4 = /\n  async updateMenstrualRecord\([\s\S]*?^\n  \}/m;
content = content.replace(pattern4, "");

// Remove async getLSDashboardMetrics completely
const pattern5 = /\n  async getLSDashboardMetrics\([\s\S]*?^\n  \}/m;
content = content.replace(pattern5, "");

fs.writeFileSync(storagePath, content, "utf-8");

console.log("✅ Cleaned storage.ts");

import * as fs from "fs";

const storagePath = "server/storage.ts";
let content = fs.readFileSync(storagePath, "utf-8");

// Remove async getMenstrualRecord method
content = content.replace(
  /  async getMenstrualRecord\(id: string\):[\s\S]*?\n  \}\n\n/,
  ""
);

// Remove async getMenstrualRecords method
content = content.replace(
  /  async getMenstrualRecords\(params\?:[\s\S]*?\n  \}\n\n/,
  ""
);

// Remove async createMenstrualRecord method
content = content.replace(
  /  async createMenstrualRecord\(record: any\):[\s\S]*?\n  \}\n\n/,
  ""
);

// Remove async updateMenstrualRecord method
content = content.replace(
  /  async updateMenstrualRecord\(id: string, data: any\):[\s\S]*?\n  \}\n\n/,
  ""
);

// Remove any remaining references in markMenstruationStarted that call createMenstrualRecord
// Find the line with createMenstrualRecord call and comment it out or remove it
content = content.replace(
  /(\s+)await this\.createMenstrualRecord\(recordPayload\);?\n/g,
  ""
);

fs.writeFileSync(storagePath, content, "utf-8");

console.log("✅ Removed all menstrual record methods from storage.ts");

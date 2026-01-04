import http from 'http';
import https from 'https';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { storage } from '../server/storage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Lightweight HTTP helpers to avoid external dependencies like axios
async function httpRequest(url: string, opts: { method?: string; headers?: Record<string, string>; body?: any; responseType?: 'text'|'arraybuffer'|'json' } = { method: 'GET', headers: {}, responseType: 'text' }) {
  const u = new URL(url);
  const lib = u.protocol === 'https:' ? https : http;
  const requestOptions: any = {
    method: opts.method || 'GET',
    headers: opts.headers || {},
  };

  return new Promise<{ status: number; headers: any; body: string | Buffer }>((resolve, reject) => {
    const req = lib.request(u, requestOptions, (res: any) => {
      const chunks: any[] = [];
      res.on('data', (chunk: any) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buffer });
      });
    });
    req.on('error', (err: any) => reject(err));
    if (opts.body) {
      const payload = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      req.write(payload);
    }
    req.end();
  });
}

async function httpGetText(url: string, token?: string) {
  const res = await httpRequest(url, { headers: { Authorization: token ? `Bearer ${token}` : '' }, responseType: 'text' });
  if (res.status && res.status >= 400) throw new Error(`HTTP ${res.status}`);
  return res.body.toString('utf8');
}

async function httpGetArrayBuffer(url: string, token?: string) {
  const res = await httpRequest(url, { headers: { Authorization: token ? `Bearer ${token}` : '' }, responseType: 'arraybuffer' });
  if (res.status && res.status >= 400) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(res.body as Buffer);
}

async function httpPostJson(url: string, body: any) {
  const res = await httpRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (res.status && res.status >= 400) {
    const text = res.body?.toString?.('utf8') || '';
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  const txt = res.body.toString('utf8');
  try { return JSON.parse(txt); } catch (e) { return txt; }
}

async function ensureAuth() {
  const username = process.env.VERIFY_USER || 'export_tester';
  const password = process.env.VERIFY_PASS || 'Export123!';
  try {
    // Try login first
    const loginRes = await httpPostJson(`${BASE_URL}/api/auth/login`, { username, password });
    return loginRes.accessToken;
  } catch (e) {
    // Try register (idempotent if already exists will return error)
    try {
      await httpPostJson(`${BASE_URL}/api/auth/register`, {
        username,
        password,
        email: `${username}@example.com`,
        fullName: 'Export Verifier',
        role: 'Admin'
      });
      const loginRes = await httpPostJson(`${BASE_URL}/api/auth/login`, { username, password });
      return loginRes.accessToken;
    } catch (regErr) {
      // If register or login both failed, rethrow the login error
      throw new Error('Failed to obtain credentials for verification: ' + (regErr as any)?.message);
    }
  }
}

function parseCSVRows(csv: string) {
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  // assume first line is header
  return lines.slice(1);
}

async function countExcelRows(buffer: Buffer | ArrayBuffer | Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  // Normalize input to a Node Buffer so ExcelJS accepts it consistently
  let buf: Buffer;
  if (Buffer.isBuffer(buffer)) {
    buf = buffer;
  } else if (buffer instanceof ArrayBuffer) {
    buf = Buffer.from(new Uint8Array(buffer));
  } else {
    buf = Buffer.from(buffer as Uint8Array);
  }
  await workbook.xlsx.load(buf as any);
  const ws = workbook.worksheets[0];
  const rows: any[] = [];
  // find header row (first row that contains text or non-empty cells)
  let headerRow = 1;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values = Array.isArray(row.values) ? row.values : [];
    const hasNonEmpty = values.some((v: any) => v !== null && v !== undefined && String(v).trim() !== '');
    if (hasNonEmpty) { headerRow = r; break; }
  }
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values = Array.isArray(row.values) ? row.values : [];
    const hasNonEmpty = values.some((v: any) => v !== null && v !== undefined && String(v).trim() !== '');
    if (hasNonEmpty) rows.push(values);
  }
  return rows.length;
}

async function verifyMonthlyCheckup(token: string, month?: number, year?: number) {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  // expected count via storage
  const { total } = await storage.getMonthlyCheckups({ month: m, year: y, page: 1, limit: 1 });
  const expected = total || 0;
  console.log(`Expected monthly-checkup rows for ${m}/${y}: ${expected}`);

  // CSV
  const csvText = await httpGetText(`${BASE_URL}/api/reports/monthly-checkup?format=csv&month=${m}&year=${y}`, token);
  const csvRows = parseCSVRows(csvText);
  console.log(`CSV rows downloaded: ${csvRows.length}`);
  const csvOk = csvRows.length === expected;
  if (!csvOk) {
    const outPath = path.join(process.cwd(), `./tmp/monthly-checkup-${y}-${m}.csv`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, csvText, 'utf8');
    console.error(`CSV mismatch: expected ${expected}, got ${csvRows.length}. Saved file to ${outPath}`);
  } else {
    console.log('CSV verification passed');
  }

  // Excel
  const excelBuffer = await httpGetArrayBuffer(`${BASE_URL}/api/reports/monthly-checkup?format=excel&month=${m}&year=${y}`, token);
  const excelCount = await countExcelRows(excelBuffer);
  console.log(`Excel rows detected: ${excelCount}`);
  const excelOk = excelCount === expected;
  if (!excelOk) {
    const outPath = path.join(process.cwd(), `./tmp/monthly-checkup-${y}-${m}.xlsx`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, excelBuffer);
    console.error(`Excel mismatch: expected ${expected}, got ${excelCount}. Saved file to ${outPath}`);
  } else {
    console.log('Excel verification passed');
  }
}

async function verifyAnnualHealth(token: string, year?: number) {
  const y = year || new Date().getFullYear();
  const { total } = await storage.getAnnualHealthCards({ year: y, page: 1, limit: 1 });
  const expected = total || 0;
  console.log(`Expected annual-health rows for ${y}: ${expected}`);

  // CSV
  const csvText = await httpGetText(`${BASE_URL}/api/reports/annual-health?format=csv&year=${y}`, token);
  const csvRows = parseCSVRows(csvText);
  console.log(`CSV rows downloaded: ${csvRows.length}`);
  if (csvRows.length !== expected) {
    const outPath = path.join(process.cwd(), `./tmp/annual-health-${y}.csv`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, csvText, 'utf8');
    console.error(`CSV mismatch: expected ${expected}, got ${csvRows.length}. Saved file to ${outPath}`);
  } else {
    console.log('CSV verification passed');
  }

  // Excel
  const excelBuffer = await httpGetArrayBuffer(`${BASE_URL}/api/reports/annual-health?format=excel&year=${y}`, token);
  const excelCount = await countExcelRows(excelBuffer);
  console.log(`Excel rows detected: ${excelCount}`);
  if (excelCount !== expected) {
    const outPath = path.join(process.cwd(), `./tmp/annual-health-${y}.xlsx`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, excelBuffer);
    console.error(`Excel mismatch: expected ${expected}, got ${excelCount}. Saved file to ${outPath}`);
  } else {
    console.log('Excel verification passed');
  }
}

async function main() {
  try {
    const token = await ensureAuth();
    console.log('Got token');

    await verifyMonthlyCheckup(token);
    await verifyAnnualHealth(token);

    console.log('Export verification complete');
  } catch (err) {
    console.error('Verification failed:', (err as any)?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

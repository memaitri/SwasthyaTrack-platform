import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { reportsStorage } from "./reportsStorage.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertStudentSchema, insertSchoolSchema, insertMedicalTeamSchema, insertMedicalTeamMemberSchema, insertMedicalEventSchema, insertStudentCheckupSchema, registerSchema, annualHealthCards, users, schools, students, notifications, usageTracking } from "../shared/schema.js";
import { z } from "zod";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import multer from "multer";
import path from "path";
import fs from "fs";
// @ts-ignore - Module resolution issue, but works at runtime
import { db } from "./db.js";
import { sql, eq, and, desc, inArray, not } from "drizzle-orm";

// Normalize status values from DB/third-party sources to canonical casing
function normalizeStatus(s?: string) {
  if (!s) return "Pending";
  const v = String(s).trim().toLowerCase();
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  if (v === "pending") return "Pending";
  // Preserve other known values (Active/Inactive/Present/Absent)
  if (v === "active") return "Active";
  if (v === "inactive") return "Inactive";
  if (v === "present") return "Present";
  if (v === "absent") return "Absent";
  return s;
}
import { createClient } from "@supabase/supabase-js";
import { isC7ReferralNeeded, isC8ReferralNeeded, isC9ReferralNeeded, generateC7ReferralIssue, generateC8ReferralIssue, getC9ReferralDescription } from "./referralLogic.js";
import { getBMIClassification } from "../lib/bmiColors.js";

// Initialize Supabase client (graceful fallback when env vars are missing)
let supabase: any;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; continuing without Supabase. Upload features will be no-ops.');
  // Minimal noop client to avoid runtime crashes when Supabase is not configured
  supabase = {
    storage: {
      from: (_bucket: string) => ({
        list: async () => ({ data: [], error: null }),
        upload: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: null } }),
      }),
      createBucket: async (_name: string) => ({ data: null, error: null }),
    },
  } as any;
}

// Default bucket for file uploads (set via env). Will attempt to create the bucket automatically if missing.
const SUPABASE_UPLOAD_BUCKET = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
if (!process.env.SUPABASE_UPLOAD_BUCKET) {
  console.warn(`SUPABASE_UPLOAD_BUCKET env not set; defaulting to "${SUPABASE_UPLOAD_BUCKET}". The server will attempt to create this bucket if it does not exist.`);
}

// Helper to upload a local file to Supabase storage and return a public URL
async function uploadFileToSupabase(localFilePath: string, remotePathPrefix = "meals") {
  const fileName = path.basename(localFilePath);
  const remotePath = `${remotePathPrefix}/${Date.now()}-${fileName}`;

  const fileBuffer = fs.readFileSync(localFilePath);

  // Helper to attempt upload
  async function attemptUpload() {
    const { data, error } = await supabase.storage
      .from(SUPABASE_UPLOAD_BUCKET)
      .upload(remotePath, fileBuffer, { contentType: undefined });
    if (error) throw error;
    return data;
  }

  try {
    try {
      await attemptUpload();
    } catch (uploadErr: any) {
      const msg = (uploadErr && (uploadErr.message || uploadErr.error_description || uploadErr.details)) || String(uploadErr || 'Unknown error');
      console.warn('Initial Supabase upload failed:', msg);

      // If the error indicates the bucket is missing, try to create it (requires service role key)
      if (msg && /bucket not found|Bucket not found|404|no such bucket/i.test(msg)) {
        console.log(`Bucket "${SUPABASE_UPLOAD_BUCKET}" not found. Attempting to create it...`);
        const { error: createErr } = await supabase.storage.createBucket(SUPABASE_UPLOAD_BUCKET, { public: true });
        if (createErr) {
          console.error('Failed to create Supabase bucket:', createErr.message || createErr);
          throw createErr;
        }
        console.log(`Bucket "${SUPABASE_UPLOAD_BUCKET}" created successfully.`);

        // Retry upload once
        await attemptUpload();
      } else {
        throw uploadErr;
      }
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(SUPABASE_UPLOAD_BUCKET)
      .getPublicUrl(remotePath);

    const publicUrl = publicData?.publicUrl || null;
    if (!publicUrl) throw new Error('Failed to obtain public URL from Supabase after upload');
    return publicUrl;
  } catch (err) {
    console.error("uploadFileToSupabase failed:", (err as any)?.message || err);
    throw err;
  }
}

// Helper function to generate CSV from data
function generateCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle arrays and objects
        if (Array.isArray(value)) {
          return `"${value.join("; ")}"`;
        } else if (typeof value === "object" && value !== null) {
          return `"${JSON.stringify(value)}"`;
        } else {
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || "");
          return stringValue.includes(",") ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        }
      }).join(",")
    )
  ];

  return csvRows.join("\n");
}

// Helper function to generate chart image using puppeteer
async function generateChartImage(chartConfig: any, width: number = 800, height: number = 400, deviceScaleFactor = 2): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });

    const canvasWidth = width * deviceScaleFactor;
    const canvasHeight = height * deviceScaleFactor;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=${width}, initial-scale=1" />
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            body { margin: 0; padding: 20px; background: white; }
            canvas { width: ${canvasWidth}px; height: ${canvasHeight}px; }
          </style>
        </head>
        <body>
          <canvas id="chart" width="${canvasWidth}" height="${canvasHeight}"></canvas>
          <script>
            const ctx = document.getElementById('chart').getContext('2d');
            // Scale chart for high-DPI
            Chart.defaults.devicePixelRatio = ${deviceScaleFactor};
            new Chart(ctx, ${JSON.stringify(chartConfig)});
          </script>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForSelector('#chart');

    // Take a clipped screenshot of the canvas area only
    const element = await page.$('#chart');
    const screenshot = await element!.screenshot({ type: 'png' });

    return Buffer.from(screenshot) as Buffer;
  } finally {
    await browser.close();
  }
}

// Helper for safe sampling of potentially non-serializable objects for logging
function safeSample(obj: any, maxLen = 1000) {
  try {
    const s = JSON.stringify(obj, (_k, v) => {
      if (typeof v === 'bigint') return String(v);
      if (v instanceof Date) return v.toISOString();
      return v;
    }, 2);
    return s.length > maxLen ? s.slice(0, maxLen) + '... (truncated)' : s;
  } catch (err) {
    try {
      return String(obj).slice(0, maxLen) + '... (toString)';
    } catch (e) {
      return '<<unable to sample value>>';
    }
  }
}

// PDF helper utilities (consistent layout, headers, footers, charts, table rendering)
const PDF_DEFAULT_OPTIONS = { size: 'A4', margins: { top: 72, bottom: 72, left: 50, right: 50 } };
function ensureSpace(doc: any, requiredHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  // Use heightOfString to account for wrapping
  const estimatedHeight = typeof requiredHeight === 'number' ? requiredHeight : doc.heightOfString(String(requiredHeight), { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
  if (doc.y + estimatedHeight > bottom) {
    // If we're still on the first (fresh) page and no content has been added (y near top margin),
    // prefer keeping the content on the first page instead of creating an almost-empty front page.
    const topThreshold = doc.page.margins.top + 40;
    if (doc.page.number === 1 && doc.y <= topThreshold) {
      // do not add a page; allow content to be placed and let it flow naturally
      return;
    }

    doc.addPage();
    drawHeaderFooter(doc, undefined, (doc as any)._generatedDate);
  }
}

// Ensure a block of content (title/date/summary) fits together on the same page.
// If there's not enough room, start a new page and draw headers consistently.
function ensureBlockFits(doc: any, requiredHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + requiredHeight > bottom) {
    // If we are still on the first (fresh) page and the cursor is near the top,
    // prefer keeping the block on the first page rather than adding a nearly-empty front page.
    const topThreshold = doc.page.margins.top + 40;
    if (doc.page.number === 1 && doc.y <= topThreshold) {
      // do not add a page; allow the block to remain on the first page
      console.log('ensureBlockFits: keeping block on first page despite fit check');
      return;
    }

    console.log('ensureBlockFits: adding new page to fit block');
    doc.addPage();
    drawHeaderFooter(doc, undefined, (doc as any)._generatedDate);
  }
}

function drawHeaderFooter(doc: any, title = 'SwasthyaTrack Report', generatedDate?: Date) {
  // Avoid drawing header more than once per page
  if (!(doc as any)._headersDrawn) (doc as any)._headersDrawn = new Set<number>();
  const drawn = (doc as any)._headersDrawn as Set<number>;
  const pageNum = doc.page.number || 1;
  if (drawn.has(pageNum)) return;
  drawn.add(pageNum);

  const { left, right, top } = doc.page.margins;
  const headerY = top - 8;
  const dateToShow = generatedDate || (doc as any)._generatedDate || new Date();

  doc.save();
  try {
    const logoPath = path.resolve(process.cwd(), 'client', 'public', 'favicon.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, left, headerY - 6, { width: 28, height: 28 });
    }
  } catch (e) {}

  // Draw header in absolute positions; do NOT mutate doc.y or rely on moveTo so we don't disrupt layout
  doc.fillColor('black').fontSize(12).font('Helvetica-Bold').text(title, left + 36, headerY, { align: 'left' });
  try {
    doc.fontSize(10).font('Helvetica').text(`Generated: ${dateToShow.toLocaleDateString()}`, left, headerY + 2, { align: 'right', width: doc.page.width - left - right - 20 });
  } catch (e) {
    doc.fontSize(10).font('Helvetica').text(`Generated: ${String(dateToShow)}`, left, headerY + 2, { align: 'right', width: doc.page.width - left - right - 20 });
  }
  doc.restore();

  // Footer (absolute)
  const bottomY = doc.page.height - doc.page.margins.bottom + 10;
  doc.save();
  doc.fillColor('gray').fontSize(10).font('Helvetica').text(`Page ${pageNum}`, 0, bottomY, { align: 'center' });
  doc.restore();
}

function drawSimpleChart(doc: any, chartConfig: any, width = 500, height = 300) {
  // Lightweight vector fallback chart renderer (bar and pie simplifications)
  const printableWidth = Math.min(width, doc.page.width - doc.page.margins.left - doc.page.margins.right);
  const startX = doc.page.margins.left + ((doc.page.width - doc.page.margins.left - doc.page.margins.right - printableWidth) / 2);
  const startY = doc.y;

  // Title
  const title = chartConfig?.options?.plugins?.title?.text || chartConfig?.title || 'Chart';
  doc.fontSize(12).font('Helvetica-Bold').fillColor('black').text(title, startX, startY, { align: 'center', width: printableWidth });
  doc.moveDown(0.3);
  const chartTop = doc.y;
  const chartHeight = Math.min(height - 30, doc.page.height - doc.page.margins.bottom - chartTop);

  // BAR chart fallback
  if (chartConfig?.type === 'bar' && chartConfig?.data && chartConfig.data.labels && chartConfig.data.datasets && chartConfig.data.datasets.length) {
    const labels = chartConfig.data.labels;
    const values = (chartConfig.data.datasets[0].data || []).map((v: any) => Number(v) || 0);
    const maxVal = Math.max(...values, 1);

    // draw axis box
    doc.save();
    doc.rect(startX, chartTop, printableWidth, chartHeight).stroke();
    const barAreaWidth = printableWidth * 0.92;
    const barLeft = startX + (printableWidth - barAreaWidth) / 2;
    const gap = Math.max(6, (barAreaWidth / labels.length) * 0.12);
    const barWidth = Math.max(10, (barAreaWidth - gap * (labels.length + 1)) / labels.length);
    let cx = barLeft + gap;
    for (let i = 0; i < labels.length; i++) {
      const h = (values[i] / maxVal) * (chartHeight - 24);
      doc.rect(cx, chartTop + (chartHeight - h - 12), barWidth, h).fill('#36A2EB').stroke();
      doc.fontSize(8).fillColor('black').text(String(labels[i] || ''), cx, chartTop + chartHeight - 10, { width: barWidth, align: 'center' });
      cx += barWidth + gap;
    }
    doc.restore();
    doc.moveDown(1);
    return;
  }

  // PIE chart fallback or generic list
  if (chartConfig?.type === 'pie' && chartConfig?.data && chartConfig.data.labels && chartConfig.data.datasets && chartConfig.data.datasets.length) {
    const labels = chartConfig.data.labels;
    const values = (chartConfig.data.datasets[0].data || []).map((v: any) => Number(v) || 0);
    const total = values.reduce((s: number, v: number) => s + v, 0) || 1;
    const radius = Math.min(printableWidth, chartHeight) / 4;
    let startAngle = -Math.PI / 2;
    for (let i = 0; i < labels.length; i++) {
      const slice = values[i] / total;
      const endAngle = startAngle + slice * Math.PI * 2;
      // approximate slices with filled arcs using bezier curves is complex; instead draw simple legend
      startAngle = endAngle;
    }
    // simple legend instead
    doc.fontSize(10).fillColor('black');
    for (let i = 0; i < labels.length; i++) {
      doc.text(`• ${labels[i]}: ${values[i]}`, startX + 6, chartTop + i * 12, { width: printableWidth - 12 });
    }
    doc.moveDown(1);
    return;
  }

  // Generic fallback: show data list
  doc.fontSize(10).fillColor('black').text('Chart (summary):', startX, chartTop);
  const labels = chartConfig?.data?.labels || [];
  const dataset = chartConfig?.data?.datasets && chartConfig.data.datasets[0];
  for (let i = 0; i < labels.length; i++) {
    const v = dataset?.data?.[i];
    doc.text(`• ${labels[i]}: ${v}`, { indent: 10 });
  }
}

async function addChartToDoc(doc: any, chartConfig: any, width = 500, height = 300) {
  console.log('addChartToDoc start', { type: chartConfig?.type, width, height });
  try {
    // Ensure there is room for the chart first to avoid expensive re-generation after page break
    ensureSpace(doc, height + 20);

    // Prepare a copy of the config and apply sensible defaults for print
    const cfg = JSON.parse(JSON.stringify(chartConfig || {}));
    cfg.options = cfg.options || {};
    cfg.options.responsive = false;
    cfg.options.maintainAspectRatio = false;
    cfg.options.plugins = cfg.options.plugins || {};
    cfg.options.plugins.title = cfg.options.plugins.title || { display: true, text: cfg.title || (cfg.data && cfg.data.labels ? cfg.data.labels.join(', ') : 'Chart') };
    cfg.options.plugins.legend = cfg.options.plugins.legend || { display: true, position: 'bottom' };

    // For cartesian charts, ensure axis titles exist
    if (cfg.type === 'bar' || cfg.type === 'line') {
      cfg.options.scales = cfg.options.scales || {};
      cfg.options.scales.x = cfg.options.scales.x || {};
      cfg.options.scales.y = cfg.options.scales.y || {};
      cfg.options.scales.x.title = cfg.options.scales.x.title || { display: true, text: (cfg._xLabel || 'Category') };
      cfg.options.scales.y.title = cfg.options.scales.y.title || { display: true, text: (cfg._yLabel || 'Value') };
      cfg.options.scales.y.beginAtZero = cfg.options.scales.y.beginAtZero !== undefined ? cfg.options.scales.y.beginAtZero : true;
    }

    const chartImage = await generateChartImage(cfg, width, height);
    console.log('addChartToDoc: chart image generated');

    // Use fit and center properly
    const maxWidth = Math.min(width, doc.page.width - doc.page.margins.left - doc.page.margins.right);
    doc.image(chartImage, doc.page.margins.left + ((doc.page.width - doc.page.margins.left - doc.page.margins.right - maxWidth) / 2), doc.y, { fit: [maxWidth, height], align: 'center' });
    doc.moveDown();
  } catch (err: any) {
    console.error('Failed to render chart image, using vector fallback:', (err as any)?.message || err);
    try {
      drawSimpleChart(doc, chartConfig, width, height);
    } catch (fallbackErr) {
      console.error('Fallback chart rendering also failed:', (fallbackErr as any)?.message || fallbackErr);
      // Render a bold placeholder message so the PDF is still useful and it's obvious a chart failed
      ensureSpace(doc, 40);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('red').text('Chart unavailable', { align: 'center' });
      doc.moveDown();
      doc.fillColor('black');
    }
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "swasthya-track-secret-key-2025";
const ACCESS_TOKEN_EXPIRY = process.env.NODE_ENV === "production" ? "15m" : "24h"; // Longer expiry for development
const REFRESH_TOKEN_EXPIRY = "7d";

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    schoolId?: string;
    classSection?: string;
  };
}

async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await storage.getUser(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId ?? undefined,
      classSection: user.classSection ?? undefined,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
}

function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Admin has access to everything unless explicitly blocked by denyAdmin
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== "Admin")) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

// Deny access to endpoints for Admin users only. Use this middleware on routes
// that should not be visible or accessible to Admins (but keep approvals available).
function denyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "Admin") {
    return res.status(403).json({ message: "Admins are not allowed to access this resource" });
  }
  next();
}

// Helper: normalize district strings for safe comparison (case- and whitespace-insensitive)
function normalizeDistrict(v?: string) {
  return (v ?? '').toString().trim().toLowerCase();
}

function sameDistrict(a?: string, b?: string) {
  return normalizeDistrict(a) === normalizeDistrict(b);
}

// Helper to build a complete AnnualHealthCard payload from submitted form data
function buildHealthCardPayload(student: any, schoolId: string, healthCardData: any, userId?: string) {
  const weight = healthCardData.weightKg !== undefined && healthCardData.weightKg !== null && healthCardData.weightKg !== "" ? parseFloat(healthCardData.weightKg) : null;
  const height = healthCardData.heightCm !== undefined && healthCardData.heightCm !== null && healthCardData.heightCm !== "" ? parseFloat(healthCardData.heightCm) : null;
  const bmi = (height && weight) ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(2)) : null;

  // systolic/diastolic from explicit fields or bloodPressure string
  let sbp: number | undefined = undefined;
  let dbp: number | undefined = undefined;
  if (healthCardData.sbp !== undefined && healthCardData.sbp !== null && healthCardData.sbp !== "") {
    sbp = parseInt(String(healthCardData.sbp));
  }
  if (healthCardData.dbp !== undefined && healthCardData.dbp !== null && healthCardData.dbp !== "") {
    dbp = parseInt(String(healthCardData.dbp));
  }
  if ((sbp === undefined || dbp === undefined) && healthCardData.bloodPressure) {
    const m = String(healthCardData.bloodPressure).match(/^(\d+)\/(\d+)$/);
    if (m) {
      sbp = parseInt(m[1]);
      dbp = parseInt(m[2]);
    }
  }

  // Normalize some inputs
  const parseOrNull = (v: any) => (v === undefined || v === null || v === "" ? null : v);

  // Return object with most fields present in schema (safely pick from healthCardData)
  return {
    studentId: student.id,
    schoolId,
    year: new Date().getFullYear(),
    nameOfChild: student.fullName,
    gender: student.gender,
    classSection: student.classSection || "",
    uniqueId: student.uniqueId,
    aadhaarNo: student.aadhaarNo ?? undefined,
    pranNo: student.pranNo ?? undefined,
    fatherGuardianName: student.fatherGuardianName ?? undefined,
    fatherContact: student.fatherContact ?? undefined,

    // Anthropometry
    weightKg: parseOrNull(weight),
    heightCm: parseOrNull(height),
    bmi: parseOrNull(bmi),
    bmi_category: parseOrNull(healthCardData.bmi_category || (bmi ? getBMIClassification(bmi) : null)),

    // Blood pressure and vision
    bloodPressure: parseOrNull(healthCardData.bloodPressure),
    sbp: sbp ?? undefined,
    dbp: dbp ?? undefined,
    bp_classification: parseOrNull(healthCardData.bpClassification || healthCardData.bp_classification || healthCardData.bpCategory),
    visionRight: parseOrNull(healthCardData.visionRight),
    visionLeft: parseOrNull(healthCardData.visionLeft),

    // Section A
    defectAtBirth: !!healthCardData.a1_visible_defect || !!healthCardData.defectAtBirth,
    a1_visible_defect: !!healthCardData.a1_visible_defect,
    a1_visible_defect_notes: parseOrNull(healthCardData.a1_visible_defect_notes),
    a1_referral_facility: parseOrNull(healthCardData.a1_referral_facility),
    a1_referral_date: parseOrNull(healthCardData.a1_referral_date),
    defectsAtBirth: Array.isArray(healthCardData.defectsAtBirth) ? healthCardData.defectsAtBirth : (typeof healthCardData.defectsAtBirth === 'string' ? healthCardData.defectsAtBirth.split(',').map((s:string)=>s.trim()).filter(Boolean) : []),
    summary_defects_neural_tube: !!healthCardData.summary_defects_neural_tube,
    summary_defects_down_syndrome: !!healthCardData.summary_defects_down_syndrome,
    summary_defects_cleft: !!healthCardData.summary_defects_cleft,
    summary_defects_talipes: !!healthCardData.summary_defects_talipes,
    summary_defects_hip_dysplasia: !!healthCardData.summary_defects_hip_dysplasia,
    summary_defects_congenital_deafness: !!healthCardData.summary_defects_congenital_deafness,
    summary_defects_other: parseOrNull(healthCardData.summary_defects_other),

    // Section B: Deficiencies
    deficiencySam: !!healthCardData.b1_severe_thinning || !!healthCardData.deficiencySam,
    b1_severe_thinning: !!healthCardData.b1_severe_thinning,
    b1_counsel_moderate: !!healthCardData.b1_counsel_moderate,
    b1_referral_facility: parseOrNull(healthCardData.b1_referral_facility),
    b1_referral_date: parseOrNull(healthCardData.b1_referral_date),

    b2_bilateral_oedema: !!healthCardData.b2_bilateral_oedema,
    b2_referral_facility: parseOrNull(healthCardData.b2_referral_facility),
    b2_referral_date: parseOrNull(healthCardData.b2_referral_date),

    b3_severe_anemia: !!healthCardData.b3_severe_anemia,
    b3_referral_facility: parseOrNull(healthCardData.b3_referral_facility),
    b3_referral_date: parseOrNull(healthCardData.b3_referral_date),

    b4_vitamin_a_deficiency: !!healthCardData.b4_vitamin_a_deficiency,
    b4_night_blindness: !!healthCardData.b4_night_blindness,
    b4_bitots_spots: !!healthCardData.b4_bitots_spots,
    b4_referral_facility: parseOrNull(healthCardData.b4_referral_facility),
    b4_referral_date: parseOrNull(healthCardData.b4_referral_date),

    b5_vitamin_d_deficiency: !!healthCardData.b5_vitamin_d_deficiency,
    b5_wrist_widening: !!healthCardData.b5_wrist_widening,
    b5_bowing_legs: !!healthCardData.b5_bowing_legs,
    b5_referral_facility: parseOrNull(healthCardData.b5_referral_facility),
    b5_referral_date: parseOrNull(healthCardData.b5_referral_date),

    b6_goitre: !!healthCardData.b6_goitre,
    b6_referral_facility: parseOrNull(healthCardData.b6_referral_facility),
    b6_referral_date: parseOrNull(healthCardData.b6_referral_date),

    b7_obesity: !!healthCardData.b7_obesity,
    b7_referral_facility: parseOrNull(healthCardData.b7_referral_facility),
    b7_referral_date: parseOrNull(healthCardData.b7_referral_date),

    b8_vitb_deficiency: !!healthCardData.b8_vitb_deficiency,
    b8_angular_stomatitis: !!healthCardData.b8_angular_stomatitis,
    b8_raw_tongue: !!healthCardData.b8_raw_tongue,
    b8_corneal_vascularization: !!healthCardData.b8_corneal_vascularization,
    b8_referral_facility: parseOrNull(healthCardData.b8_referral_facility),
    b8_referral_date: parseOrNull(healthCardData.b8_referral_date),

    summary_deficiency_anemia: !!healthCardData.summary_deficiency_anemia,
    summary_deficiency_vitamin_a: !!healthCardData.summary_deficiency_vitamin_a,
    summary_deficiency_vitamin_d: !!healthCardData.summary_deficiency_vitamin_d,
    summary_deficiency_sam_stunting: !!healthCardData.summary_deficiency_sam_stunting,
    summary_deficiency_goitre: !!healthCardData.summary_deficiency_goitre,
    summary_deficiency_vitamin_b: !!healthCardData.summary_deficiency_vitamin_b,
    summary_deficiency_other: parseOrNull(healthCardData.summary_deficiency_other),

    // Section C: Diseases
    c1_convulsive: !!healthCardData.c1_convulsive,
    c1_referral_facility: parseOrNull(healthCardData.c1_referral_facility),
    c1_referral_date: parseOrNull(healthCardData.c1_referral_date),

    c2_otitis_media: !!healthCardData.c2_otitis_media,
    c2_assess_hearing: !!healthCardData.c2_assess_hearing,
    c2_referral_facility: parseOrNull(healthCardData.c2_referral_facility),
    c2_referral_date: parseOrNull(healthCardData.c2_referral_date),

    c3_dental: !!healthCardData.c3_dental,
    c3_white_discoloration: !!healthCardData.c3_white_discoloration,
    c3_brown_discoloration: !!healthCardData.c3_brown_discoloration,
    c3_gum_swelling: !!healthCardData.c3_gum_swelling,
    c3_plaque: !!healthCardData.c3_plaque,
    c3_referral_facility: parseOrNull(healthCardData.c3_referral_facility),
    c3_referral_date: parseOrNull(healthCardData.c3_referral_date),

    c4_skin_conditions: !!healthCardData.c4_skin_conditions,
    c4_itching: !!healthCardData.c4_itching,
    c4_scaly_lesions: !!healthCardData.c4_scaly_lesions,
    c4_round_lesions: !!healthCardData.c4_round_lesions,
    c4_referral_facility: parseOrNull(healthCardData.c4_referral_facility),
    c4_referral_date: parseOrNull(healthCardData.c4_referral_date),

    c5_asthma: !!healthCardData.c5_asthma,
    c5_breathlessness: !!healthCardData.c5_breathlessness,
    c5_wheezing: !!healthCardData.c5_wheezing,
    c5_referral_facility: parseOrNull(healthCardData.c5_referral_facility),
    c5_referral_date: parseOrNull(healthCardData.c5_referral_date),

    c6_rheumatic_heart: !!healthCardData.c6_rheumatic_heart,
    c6_murmur: !!healthCardData.c6_murmur,
    c6_referral_facility: parseOrNull(healthCardData.c6_referral_facility),
    c6_referral_date: parseOrNull(healthCardData.c6_referral_date),

    // C7
    c7_suspected: !!healthCardData.c7_suspected,
    c7_skin_lesion_present: !!healthCardData.c7_skin_lesion_present,
    c7_hypopigmented_reddish_lesion: !!healthCardData.c7_hypopigmented_reddish_lesion,
    c7_lesion_sensory_deficit: !!healthCardData.c7_lesion_sensory_deficit,
    c7_skin_characteristics: healthCardData.c7_skin_characteristics || {},
    c7_num_lesions: parseOrNull(healthCardData.c7_num_lesions),
    c7_lesion_type: healthCardData.c7_lesion_type || {},
    c7_nerves_involved: healthCardData.c7_nerves_involved || {},
    c7_nerve_signs: healthCardData.c7_nerve_signs || {},
    c7_contractures_deformities: healthCardData.c7_contractures_deformities || {},
    c7_referral_facility: parseOrNull(healthCardData.c7_referral_facility),
    c7_referral_date: parseOrNull(healthCardData.c7_referral_date),

    // C8 (TB)
    c8_suspected: !!healthCardData.c8_suspected,
    c8_cough_gt14_days: !!healthCardData.c8_cough_gt14_days,
    c8_cough_antibiotics_failed: !!healthCardData.c8_cough_antibiotics_failed,
    c8_cough_with_bronchodilators_failed: !!healthCardData.c8_cough_with_bronchodilators_failed,
    c8_persistent_fever: !!healthCardData.c8_persistent_fever,
    c8_fever_temperature: healthCardData.c8_fever_temperature ? parseFloat(healthCardData.c8_fever_temperature) : undefined,
    c8_fever_duration_weeks: healthCardData.c8_fever_duration_weeks ? parseInt(healthCardData.c8_fever_duration_weeks) : undefined,
    c8_reduced_playfulness: !!healthCardData.c8_reduced_playfulness,
    c8_reduced_daily_activity: !!healthCardData.c8_reduced_daily_activity,
    c8_reduced_appetite: !!healthCardData.c8_reduced_appetite,
    c8_reduced_interaction: !!healthCardData.c8_reduced_interaction,
    c8_reduction_duration_days: healthCardData.c8_reduction_duration_days ? parseInt(healthCardData.c8_reduction_duration_days) : undefined,
    c8_recent_headache_irritability: !!healthCardData.c8_recent_headache_irritability,
    c8_altered_behavior: !!healthCardData.c8_altered_behavior,
    c8_altered_behavior_duration_days: healthCardData.c8_altered_behavior_duration_days ? parseInt(healthCardData.c8_altered_behavior_duration_days) : undefined,
    c8_weight_loss_gt5_percent: !!healthCardData.c8_weight_loss_gt5_percent,
    c8_weight_loss_not_responding_deworming: !!healthCardData.c8_weight_loss_not_responding_deworming,
    c8_weight_loss_not_responding_micronutrient: !!healthCardData.c8_weight_loss_not_responding_micronutrient,
    c8_weight_loss_not_responding_nutrition: !!healthCardData.c8_weight_loss_not_responding_nutrition,
    c8_close_contact_known_tb: !!healthCardData.c8_close_contact_known_tb,
    c8_contact_relation: parseOrNull(healthCardData.c8_contact_relation),
    c8_measles_varicella_3mo: !!healthCardData.c8_measles_varicella_3mo,
    c8_steroids_chemotherapy_1mo: !!healthCardData.c8_steroids_chemotherapy_1mo,
    c8_abdominal_pain_dull_aching: !!healthCardData.c8_abdominal_pain_dull_aching,
    c8_abdominal_swelling: !!healthCardData.c8_abdominal_swelling,
    c8_painless_abdominal_mass: !!healthCardData.c8_painless_abdominal_mass,
    c8_hepatomegaly: !!healthCardData.c8_hepatomegaly,
    c8_splenomegaly: !!healthCardData.c8_splenomegaly,
    c8_lymph_node_swelling_painless: !!healthCardData.c8_lymph_node_swelling_painless,
    c8_lymph_node_not_responding_antibiotics: !!healthCardData.c8_lymph_node_not_responding_antibiotics,
    c8_lymph_node_characteristics: healthCardData.c8_lymph_node_characteristics || {},
    c8_spine_pain_stiffness: !!healthCardData.c8_spine_pain_stiffness,
    c8_spinal_deformity: !!healthCardData.c8_spinal_deformity,
    c8_cold_abscess: !!healthCardData.c8_cold_abscess,
    c8_night_cries_typical: !!healthCardData.c8_night_cries_typical,
    c8_kyphotic_deformity: !!healthCardData.c8_kyphotic_deformity,
    c8_altered_consciousness: !!healthCardData.c8_altered_consciousness,
    c8_convulsions_no_fever: !!healthCardData.c8_convulsions_no_fever,
    c8_vomiting_no_diarrhea: !!healthCardData.c8_vomiting_no_diarrhea,
    c8_focal_neuro_deficit: !!healthCardData.c8_focal_neuro_deficit,
    c8_abnormal_movements: !!healthCardData.c8_abnormal_movements,
    c8_cranial_nerve_palsy: !!healthCardData.c8_cranial_nerve_palsy,
    c8_neck_stiffness_rigidity: !!healthCardData.c8_neck_stiffness_rigidity,
    c8_respiratory_distress: !!healthCardData.c8_respiratory_distress,
    c8_difficulty_breathing: !!healthCardData.c8_difficulty_breathing,
    c8_persistent_cough_2weeks: !!healthCardData.c8_persistent_cough_2weeks,
    c8_increased_respiratory_rate: !!healthCardData.c8_increased_respiratory_rate,
    c8_difficult_pneumonia: !!healthCardData.c8_difficult_pneumonia,
    c8_limping_recent_onset: !!healthCardData.c8_limping_recent_onset,
    c8_joint_pain_swelling: !!healthCardData.c8_joint_pain_swelling,
    c8_bone_joint_night_cry: !!healthCardData.c8_bone_joint_night_cry,
    c8_referral_facility: parseOrNull(healthCardData.c8_referral_facility),
    c8_referral_date: parseOrNull(healthCardData.c8_referral_date),

    // C9 (Sickle Cell Anaemia)
    c9_suspected: !!healthCardData.c9_suspected,
    c9_clinical_features: healthCardData.c9_clinical_features || {},
    c9_hemoglobin_type: healthCardData.c9_hemoglobin_type || {},
    c9_referral_facility: parseOrNull(healthCardData.c9_referral_facility),
    c9_referral_date: parseOrNull(healthCardData.c9_referral_date),

    summary_disease_skin_conditions: !!healthCardData.summary_disease_skin_conditions,
    summary_disease_vision_impairment: !!healthCardData.summary_disease_vision_impairment,
    summary_disease_hearing_impairment: !!healthCardData.summary_disease_hearing_impairment,
    summary_disease_dental: !!healthCardData.summary_disease_dental,
    summary_disease_reactive_airway: !!healthCardData.summary_disease_reactive_airway,
    summary_disease_heart: !!healthCardData.summary_disease_heart,
    summary_disease_convulsive: !!healthCardData.summary_disease_convulsive,
    summary_disease_neuro_motor: !!healthCardData.summary_disease_neuro_motor,
    summary_disease_cognitive_delay: !!healthCardData.summary_disease_cognitive_delay,
    summary_disease_motor_delay: !!healthCardData.summary_disease_motor_delay,
    summary_disease_speech_delay: !!healthCardData.summary_disease_speech_delay,
    summary_disease_behavioral_disorder: !!healthCardData.summary_disease_behavioral_disorder,
    summary_disease_tuberculosis: !!healthCardData.summary_disease_tuberculosis,
    summary_disease_leprosy: !!healthCardData.summary_disease_leprosy,
    summary_disease_sickle_cell_anaemia: !!healthCardData.summary_disease_sickle_cell_anaemia,
    summary_disease_other: parseOrNull(healthCardData.summary_disease_other),

    // Section D
    d1_seeing_difficulty: !!healthCardData.d1_seeing_difficulty,
    d1_referral_facility: parseOrNull(healthCardData.d1_referral_facility),
    d1_referral_date: parseOrNull(healthCardData.d1_referral_date),
    d2_walking_delay: !!healthCardData.d2_walking_delay,
    d2_referral_facility: parseOrNull(healthCardData.d2_referral_facility),
    d2_referral_date: parseOrNull(healthCardData.d2_referral_date),
    d3_reading_writing: !!healthCardData.d3_reading_writing,
    d3_referral_facility: parseOrNull(healthCardData.d3_referral_facility),
    d3_referral_date: parseOrNull(healthCardData.d3_referral_date),
    d4_muscle_stiffness: !!healthCardData.d4_muscle_stiffness,
    d4_referral_facility: parseOrNull(healthCardData.d4_referral_facility),
    d4_referral_date: parseOrNull(healthCardData.d4_referral_date),
    d5_hearing_difficulty: !!healthCardData.d5_hearing_difficulty,
    d5_referral_facility: parseOrNull(healthCardData.d5_referral_facility),
    d5_referral_date: parseOrNull(healthCardData.d5_referral_date),
    d6_speech_difficulty: !!healthCardData.d6_speech_difficulty,
    d6_referral_facility: parseOrNull(healthCardData.d6_referral_facility),
    d6_referral_date: parseOrNull(healthCardData.d6_referral_date),
    d7_learning_difficulty: !!healthCardData.d7_learning_difficulty,
    d7_referral_facility: parseOrNull(healthCardData.d7_referral_facility),
    d7_referral_date: parseOrNull(healthCardData.d7_referral_date),
    d8_inattention_hyperactivity: !!healthCardData.d8_inattention_hyperactivity,
    d8_referral_facility: parseOrNull(healthCardData.d8_referral_facility),
    d8_referral_date: parseOrNull(healthCardData.d8_referral_date),
    d9_behavioral_concerns: !!healthCardData.d9_behavioral_concerns,
    d9_referral_facility: parseOrNull(healthCardData.d9_referral_facility),
    d9_referral_date: parseOrNull(healthCardData.d9_referral_date),

    // Section E: Adolescent
    e1_life_events_difficulty: !!healthCardData.e1_life_events_difficulty,
    e1_referral_suggested: parseOrNull(healthCardData.e1_referral_suggested),
    e1_referral_facility: parseOrNull(healthCardData.e1_referral_facility),
    e1_referral_date: parseOrNull(healthCardData.e1_referral_date),
    e2_peer_pressure_substance: !!healthCardData.e2_peer_pressure_substance,
    e2_referral_suggested: parseOrNull(healthCardData.e2_referral_suggested),
    e2_referral_facility: parseOrNull(healthCardData.e2_referral_facility),
    e2_referral_date: parseOrNull(healthCardData.e2_referral_date),
    e3_persistent_sadness: !!healthCardData.e3_persistent_sadness,
    e3_referral_suggested: parseOrNull(healthCardData.e3_referral_suggested),
    e3_referral_facility: parseOrNull(healthCardData.e3_referral_facility),
    e3_referral_date: parseOrNull(healthCardData.e3_referral_date),
    e4_referral_date: parseOrNull(healthCardData.e4_referral_date),
    e5_pain_urination: !!healthCardData.e5_pain_urination,
    e5_referral_suggested: parseOrNull(healthCardData.e5_referral_suggested),
    e5_referral_facility: parseOrNull(healthCardData.e5_referral_facility),
    e5_referral_date: parseOrNull(healthCardData.e5_referral_date),
    e6_foul_discharge: !!healthCardData.e6_foul_discharge,
    e6_referral_suggested: parseOrNull(healthCardData.e6_referral_suggested),
    e6_referral_facility: parseOrNull(healthCardData.e6_referral_facility),
    e6_referral_date: parseOrNull(healthCardData.e6_referral_date),

    // E4 & E7: Female-only menstrual health fields
    e4_menstruation_started: !!healthCardData.e4_menstruation_started,
    e4_referral_suggested: parseOrNull(healthCardData.e4_referral_suggested),
    e4_referral_facility: parseOrNull(healthCardData.e4_referral_facility),
    e7_severe_menstrual_pain: !!healthCardData.e7_severe_menstrual_pain,
    e7_referral_suggested: parseOrNull(healthCardData.e7_referral_suggested),
    e7_referral_facility: parseOrNull(healthCardData.e7_referral_facility),
    e7_referral_date: parseOrNull(healthCardData.e7_referral_date),

    // Detailed Menstrual Cycle Tracking
    menstrual_cycle_regular: !!healthCardData.menstrual_cycle_regular,
    menstrual_cycle_length_days: healthCardData.menstrual_cycle_length_days ? parseInt(healthCardData.menstrual_cycle_length_days) : undefined,
    menstrual_period_duration_days: healthCardData.menstrual_period_duration_days ? parseInt(healthCardData.menstrual_period_duration_days) : undefined,
    menstrual_last_period_date: parseOrNull(healthCardData.menstrual_last_period_date),
    menstrual_irregularities: healthCardData.menstrual_irregularities || {},
    menstrual_symptoms: healthCardData.menstrual_symptoms || {},
    menstrual_hygiene_practices: healthCardData.menstrual_hygiene_practices || {},
    menstrual_educational_resources_accessed: !!healthCardData.menstrual_educational_resources_accessed,

    summary_adolescent_menstrual_issues: !!healthCardData.summary_adolescent_menstrual_issues,
    summary_adolescent_substance_use: !!healthCardData.summary_adolescent_substance_use,
    summary_adolescent_depressed: !!healthCardData.summary_adolescent_depressed,
    summary_adolescent_burning_urination: !!healthCardData.summary_adolescent_burning_urination,
    summary_adolescent_discharge: !!healthCardData.summary_adolescent_discharge,
    summary_adolescent_other: parseOrNull(healthCardData.summary_adolescent_other),

    // Referrals summary & final fields
    // Auto-set referralRecommended if any referral fields or critical flags are present
    referralRecommended: !!healthCardData.referralRecommended || (
      !!healthCardData.a1_visible_defect ||
      !!healthCardData.a1_referral_facility || !!healthCardData.a1_referral_date ||
      !!healthCardData.b1_referral_facility || !!healthCardData.b1_referral_date || !!healthCardData.b1_severe_thinning ||
      !!healthCardData.b2_referral_facility || !!healthCardData.b2_referral_date || !!healthCardData.b2_bilateral_oedema ||
      !!healthCardData.b3_referral_facility || !!healthCardData.b3_referral_date || !!healthCardData.b3_severe_anemia ||
      !!healthCardData.c7_referral_facility || !!healthCardData.c7_referral_date || !!healthCardData.c7_suspected ||
      !!healthCardData.c8_referral_facility || !!healthCardData.c8_referral_date || !!healthCardData.c8_suspected ||
      !!healthCardData.c9_referral_facility || !!healthCardData.c9_referral_date || !!healthCardData.c9_suspected ||
      !!healthCardData.e1_referral_suggested || !!healthCardData.e1_referral_facility || !!healthCardData.e1_referral_date ||
      !!healthCardData.e2_referral_suggested || !!healthCardData.e3_referral_suggested || !!healthCardData.e4_referral_suggested || !!healthCardData.e5_referral_suggested || !!healthCardData.e6_referral_suggested || !!healthCardData.e7_referral_suggested ||
      false
    ),
    referral_defect_at_birth_facility_date: parseOrNull(healthCardData.referral_defect_at_birth_facility_date),
    referral_deficiency_facility_date: parseOrNull(healthCardData.referral_deficiency_facility_date),
    referral_disease_facility_date: parseOrNull(healthCardData.referral_disease_facility_date),
    referral_leprosy_facility_date: parseOrNull(healthCardData.referral_leprosy_facility_date),
    referral_tb_facility_date: parseOrNull(healthCardData.referral_tb_facility_date),
    referral_developmental_facility_date: parseOrNull(healthCardData.referral_developmental_facility_date),
    referral_adolescent_facility_date: parseOrNull(healthCardData.referral_adolescent_facility_date),

    doctor_mht_name: parseOrNull(healthCardData.doctor_mht_name),
    date_of_visit: parseOrNull(healthCardData.date_of_visit),
    data_entry_register: !!healthCardData.data_entry_register,

    // Misc
    deficiencies: Array.isArray(healthCardData.deficiencies) ? healthCardData.deficiencies : (typeof healthCardData.deficiencies === 'string' ? healthCardData.deficiencies.split(',').map((s:string)=>s.trim()).filter(Boolean) : []),
    notes: parseOrNull(healthCardData.notes),
    dataEntryBy: userId,
    status: healthCardData.status || 'Pending',
    ageYears: (healthCardData.ageYears !== undefined && healthCardData.ageYears !== null) ? healthCardData.ageYears : (student.dateOfBirth ? (new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()) : undefined),
  } as any;
}

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint for Railway
  app.get("/", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "SwasthyaTrack API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  app.get("/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Ensure new hostel attendance columns exist (for older databases without latest schema)
  try {
    await db.execute(sql`
      ALTER TABLE hostel_attendance
      ADD COLUMN IF NOT EXISTS recorder_role text,
      ADD COLUMN IF NOT EXISTS event_index integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'Present',
      ADD COLUMN IF NOT EXISTS morning_roll_call boolean,
      ADD COLUMN IF NOT EXISTS night_roll_call boolean
    `);
  } catch (migrationError) {
    console.error("Failed to ensure hostel_attendance columns:", migrationError);
  }

  // Note: /api/auth/login is handled by auth.ts router mounted in index.ts
  // This route is kept as a fallback but auth.ts takes precedence

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Validate PO region and district/block
      if (data.role === "PO") {
        if (!data.region) {
          return res.status(400).json({ message: "Region is required for PO" });
        }
        if (!data.district) {
          return res.status(400).json({ message: "District is required for PO" });
        }
        if (!data.block) {
          return res.status(400).json({ message: "Block is required for PO" });
        }
        // Validate that selected school (if any) matches PO's region
        if (data.schoolId) {
          const school = await storage.getSchool(data.schoolId);
          if (!school) {
            return res.status(400).json({ message: "Invalid school ID" });
          }
          if (school.region !== data.region) {
            return res.status(400).json({ message: "Selected school must be in your assigned region" });
          }
        }
      }

      // Validate schoolId for role-specific requirements
      if ((data.role === "ClassTeacher" || data.role === "Headmaster" || data.role === "MedicalTeam" || data.role === "HostelWarden" || data.role === "MealSuperintendent") && !data.schoolId) {
        return res.status(400).json({ message: "School ID is required for this role" });
      }

      // Validate that school exists
      if (data.schoolId && data.role !== "PO") {
        const school = await storage.getSchool(data.schoolId);
        if (!school) {
          return res.status(404).json({ message: "Invalid school ID" });
        }
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Roles that require approval before activation
      // Add "Lady Superintendent" so LS accounts require Headmaster approval
      const approvalRoles = ["ClassTeacher", "MedicalTeam", "HostelWarden", "PO", "Headmaster", "MealSuperintendent", "Lady Superintendent"];

      if (approvalRoles.includes(data.role)) {
        // Create user in pending state (not active)
        // For Lady Superintendent, prevent creation if an active LS already exists for the school
        if (data.role === "Lady Superintendent" && data.schoolId) {
          const existingLS = await db.select().from(users).where(and(eq(users.schoolId, data.schoolId), eq(users.role, "Lady Superintendent"), eq(users.isActive, true))).limit(1);
          if ((existingLS || []).length > 0) {
            return res.status(409).json({ message: "An active Lady Superintendent already exists for this school" });
          }
        }

        const user = await storage.createUser({
          username: data.username,
          password: hashedPassword,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          schoolId: data.schoolId,
          classSection: data.classSection || null, // For ClassTeacher
          district: data.district,
          block: data.block,
          isActive: false,
          approvalStatus: "Pending",
          requestedAt: new Date(),
        });

        // Audit log: LS request creation (and other pending creations)
        try {
          await storage.createAuditLog({
            userId: user.id,
            action: data.role === "Lady Superintendent" ? "LS_REQUEST_CREATED" : "USER_REQUEST_CREATED",
            entityType: "user",
            entityId: user.id,
            details: { role: user.role, schoolId: user.schoolId },
          } as any);
        } catch (e) {
          console.warn("Failed to create audit log for pending user:", (e as any)?.message || e);
        }

        // Notify appropriate approver(s)
        try {
          if (data.role === "PO") {
            // For PO registrations, notify Admins
            await storage.createNotification({
              senderId: user.id,
              senderRole: user.role as any,
              receiverRole: "Admin" as any,
              type: "system" as any,
              title: "Account approval request",
              message: `${user.fullName} (${user.role}) has requested an account. Admin approval required.`,
              metadata: { pendingUserId: user.id },
            } as any);
          } else if (data.role === "Headmaster") {
            // For Headmaster registrations, notify POs in the same district
            if (data.district) {
              await storage.createNotification({
                senderId: user.id,
                senderRole: user.role as any,
                receiverRole: "PO" as any,
                type: "system" as any,
                title: "Headmaster approval request",
                message: `${user.fullName} (Headmaster) has requested an account for ${data.district} district. PO approval required.`,
                metadata: { pendingUserId: user.id, district: data.district },
              } as any);
            } else {
              // Fallback to Admin if no district specified
              await storage.createNotification({
                senderId: user.id,
                senderRole: user.role as any,
                receiverRole: "Admin" as any,
                type: "system" as any,
                title: "Account approval request",
                message: `${user.fullName} (${user.role}) has requested an account. Admin approval required.`,
                metadata: { pendingUserId: user.id },
              } as any);
            }
          } else {
            // Existing behavior: notify the school's headmaster (if configured)
            if (user.schoolId) {
              const school = await storage.getSchool(user.schoolId);
              const headmasterId = school?.headmasterId;
              if (headmasterId) {
                await storage.createNotification({
                  senderId: user.id,
                  senderRole: user.role as any,
                  receiverRole: "Headmaster" as any,
                  receiverSchoolId: user.schoolId,
                  type: "system" as any,
                  title: "Account approval request",
                  message: `${user.fullName} (${user.role}) has requested an account for your school. Please review and approve or reject.`,
                  metadata: { pendingUserId: user.id },
                } as any);
              } else {
                console.info(`Registration: no headmaster configured for school ${user.schoolId} (pending user ${user.id})`);
              }
            } else {
              console.info(`Registration: no schoolId provided for pending user ${user.id}`);
            }
          }
        } catch (e) {
          console.warn("Failed to create approval notification:", (e as any)?.message || e);
        }

        console.info(`Registration: created pending user ${user.id} role=${user.role} schoolId=${user.schoolId}`);

        let pendingMessage = "Account created and pending approval";
        if (data.role === "PO") {
          pendingMessage = "Account created and pending admin approval";
        } else if (data.role === "Headmaster") {
          pendingMessage = "Account created and pending PO approval";
        } else {
          pendingMessage = "Account created and pending headmaster approval";
        }
        
        return res.status(202).json({ message: pendingMessage, pending: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, schoolId: user.schoolId } });
      }

      // Default: immediate activation for other roles
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        schoolId: data.schoolId,
        classSection: data.classSection || null, // For ClassTeacher
        district: data.district,
        block: data.block,
        isActive: true,
      });

      const accessToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role, schoolId: user.schoolId, classSection: user.classSection },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await storage.saveRefreshToken(user.id, refreshToken, expiresAt);

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      const tokenData = await storage.getRefreshToken(refreshToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
      }

      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }

      const accessToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role, schoolId: user.schoolId, classSection: user.classSection },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      res.json({ accessToken });
    } catch (error: any) {
      console.error("Refresh error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Token refresh failed" });
    }
  });

  // Profile endpoints
  app.get("/api/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Get profile error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const updateData = req.body;
      // Don't allow role or password changes through profile update
      delete updateData.role;
      delete updateData.password;

      const user = await storage.updateUser(req.user!.id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update profile error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update profile" });
    }
  });

  // Get users that can be shared with (role-based filtering)
  app.get("/api/users/shareable", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all users with pagination
      const { users, total } = await storage.getUsers(1, 100);
      
      // Filter users based on role-based sharing permissions
      let shareableUsers = users.filter(u => u.id !== userId); // Exclude self
      
      switch (userRole) {
        case 'PO':
          // PO can share with other POs, Headmasters, and ClassTeachers in their district
          shareableUsers = shareableUsers.filter(u => 
            ['PO', 'Headmaster', 'ClassTeacher', 'MedicalTeam'].includes(u.role) &&
            (u.district === user.district || !u.district)
          );
          break;
          
        case 'Headmaster':
          // Headmaster can share with ClassTeachers, MedicalTeam in their school, and POs
          shareableUsers = shareableUsers.filter(u => 
            (u.role === 'ClassTeacher' && u.schoolId === user.schoolId) ||
            (u.role === 'MedicalTeam' && u.schoolId === user.schoolId) ||
            u.role === 'PO' ||
            u.role === 'Headmaster'
          );
          break;
          
        case 'ClassTeacher':
          // ClassTeacher can share with other ClassTeachers in same school, Headmaster, MedicalTeam, PO
          shareableUsers = shareableUsers.filter(u => 
            (u.role === 'ClassTeacher' && u.schoolId === user.schoolId) ||
            (u.role === 'Headmaster' && u.schoolId === user.schoolId) ||
            (u.role === 'MedicalTeam' && u.schoolId === user.schoolId) ||
            u.role === 'PO'
          );
          break;
          
        case 'MedicalTeam':
          // MedicalTeam can share with ClassTeachers, Headmaster in same school, and POs
          shareableUsers = shareableUsers.filter(u => 
            (u.role === 'ClassTeacher' && u.schoolId === user.schoolId) ||
            (u.role === 'Headmaster' && u.schoolId === user.schoolId) ||
            (u.role === 'MedicalTeam' && u.schoolId === user.schoolId) ||
            u.role === 'PO'
          );
          break;
          
        case 'Lady Superintendent':
        case 'HostelWarden':
        case 'MealSuperintendent':
          // These roles can share with ClassTeachers, Headmaster, MedicalTeam in same school, and POs
          shareableUsers = shareableUsers.filter(u => 
            (u.schoolId === user.schoolId && ['ClassTeacher', 'Headmaster', 'MedicalTeam'].includes(u.role)) ||
            u.role === 'PO'
          );
          break;
          
        default:
          // For other roles, limit to same school users
          shareableUsers = shareableUsers.filter(u => u.schoolId === user.schoolId);
      }
      
      // Add school names and remove passwords
      const usersWithSchoolNames = await Promise.all(
        shareableUsers.map(async (shareableUser) => {
          let schoolName = null;
          if (shareableUser.schoolId) {
            const school = await storage.getSchool(shareableUser.schoolId);
            schoolName = school?.name;
          }
          const { password: _, ...userWithoutPassword } = shareableUser;
          return { ...userWithoutPassword, schoolName };
        })
      );
      
      res.json({
        users: usersWithSchoolNames,
        totalItems: usersWithSchoolNames.length,
      });
      
    } catch (error: any) {
      console.error("Get shareable users error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch users" });
    }
  });

  app.get("/api/users", authenticateToken, denyAdmin, authorizeRoles("Admin"), async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const { users, total } = await storage.getUsers(page, 10);

      const usersWithSchoolNames = await Promise.all(
        users.map(async (user) => {
          let schoolName = null;
          if (user.schoolId) {
            const school = await storage.getSchool(user.schoolId);
            schoolName = school?.name;
          }
          const { password: _, ...userWithoutPassword } = user;
          return { ...userWithoutPassword, schoolName };
        })
      );

      res.json({
        users: usersWithSchoolNames,
        totalPages: Math.ceil(total / 10),
        totalItems: total,
      });
    } catch (error: any) {
      console.error("Get users error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id", authenticateToken, denyAdmin, authorizeRoles("Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update user error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, denyAdmin, authorizeRoles("Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted" });
    } catch (error: any) {
      console.error("Delete user error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to delete user" });
    }
  });





  // --- Approval endpoints (Headmaster and PO) ---
  app.get("/api/approvals/pending", authenticateToken, authorizeRoles("Headmaster", "PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const requester = req.user!;

      let pending: any[] = [];

      if (requester.role === "Headmaster") {
        const schoolId = requester.schoolId;
        if (!schoolId) return res.status(400).json({ message: "You are not assigned to a school" });

        pending = await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          schoolId: users.schoolId,
          classSection: users.classSection,
          district: users.district,
          block: users.block,
          requestedAt: users.requestedAt,
          createdAt: users.createdAt,
        }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.approvalStatus, "Pending")));

        console.info(`Approvals: headmaster ${requester.id} requested pending users for school ${schoolId}. Found ${pending.length}`);
      } else if (requester.role === "PO") {
        // PO can view pending Headmaster accounts in their district
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }

        pending = await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          schoolId: users.schoolId,
          classSection: users.classSection,
          district: users.district,
          block: users.block,
          requestedAt: users.requestedAt,
          createdAt: users.createdAt,
        }).from(users).where(and(
          eq(users.role, "Headmaster"), 
          eq(users.approvalStatus, "Pending"),
          eq(users.district, poDistrict)
        ));

        console.info(`Approvals: PO ${requester.id} requested pending Headmaster users for district ${poDistrict}. Found ${pending.length}`);
      } else if (requester.role === "Admin") {
        // Admin can view all pending user approvals across schools
        pending = await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          schoolId: users.schoolId,
          classSection: users.classSection,
          district: users.district,
          block: users.block,
          requestedAt: users.requestedAt,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.approvalStatus, "Pending"));

        console.info(`Approvals: admin ${requester.id} requested all pending users. Found ${pending.length}`);
      }

      return res.json({ pending });
    } catch (error: any) {
      console.error("Get pending approvals error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch pending approvals" });
    }
  });

  app.post("/api/approvals/:id/approve", authenticateToken, authorizeRoles("Headmaster", "PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requester = req.user!;

      const userToApprove = await storage.getUser(id);
      console.info(`Approvals: fetched user ${id} from DB: approvalStatus=${userToApprove?.approvalStatus} isActive=${userToApprove?.isActive} schoolId=${userToApprove?.schoolId} role=${userToApprove?.role}`);
      if (!userToApprove) return res.status(404).json({ message: "User not found" });
      if (userToApprove.approvalStatus !== "Pending") return res.status(400).json({ message: "User is not pending approval" });

      // Headmasters can approve pending users for their school, but cannot approve PO or Headmaster roles
      if (requester.role === "Headmaster") {
        if (userToApprove.role === "PO" || userToApprove.role === "Headmaster") {
          return res.status(403).json({ message: "Insufficient privileges to approve this role" });
        }
        if (userToApprove.schoolId !== requester.schoolId) return res.status(403).json({ message: "Cannot approve users from a different school" });
        // Additional check: if approving a Lady Superintendent, ensure no active LS exists for the school
        if (userToApprove.role === "Lady Superintendent") {
          const existingLS = await db.select().from(users).where(and(eq(users.schoolId, userToApprove.schoolId), eq(users.role, "Lady Superintendent"), eq(users.isActive, true))).limit(1);
          if ((existingLS || []).length > 0) {
            return res.status(409).json({ message: "An active Lady Superintendent already exists for this school. Approval blocked." });
          }
        }

        await db.update(users).set({ 
          approvalStatus: "Approved" as any, 
          isActive: true, 
          approverId: requester.id, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        // Audit log for approval
        try {
          if (userToApprove.role === "Lady Superintendent") {
            await storage.createAuditLog({ userId: requester.id, action: 'LS_REQUEST_APPROVED', entityType: 'user', entityId: userToApprove.id, details: { approvedBy: requester.id, approvedUserId: userToApprove.id } } as any);
          } else {
            await storage.createAuditLog({ userId: requester.id, action: 'USER_REQUEST_APPROVED', entityType: 'user', entityId: userToApprove.id, details: { approvedBy: requester.id, approvedUserId: userToApprove.id } } as any);
          }
        } catch (e) {
          console.warn('Failed to create audit log for approval:', (e as any)?.message || e);
        }
      } else if (requester.role === "PO") {
        // PO can approve Headmaster accounts in their district
        if (userToApprove.role !== "Headmaster") {
          return res.status(403).json({ message: "PO can only approve Headmaster accounts" });
        }
        
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }
        
        if (userToApprove.district !== poDistrict) {
          return res.status(403).json({ message: "Cannot approve Headmaster from a different district" });
        }

        await db.update(users).set({ 
          approvalStatus: "Approved" as any, 
          isActive: true, 
          approverId: requester.id, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        
        try {
          await storage.createAuditLog({ userId: requester.id, action: 'HEADMASTER_REQUEST_APPROVED', entityType: 'user', entityId: userToApprove.id, details: { approvedBy: requester.id, approvedUserId: userToApprove.id, district: poDistrict } } as any);
        } catch (e) {
          console.warn('Failed to create audit log for PO approval:', (e as any)?.message || e);
        }
      } else if (requester.role === "Admin") {
        // Admin can approve any pending user (including PO and Headmaster)
        await db.update(users).set({ 
          approvalStatus: "Approved" as any, 
          isActive: true, 
          approverId: requester.id, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        try {
          await storage.createAuditLog({ userId: requester.id, action: userToApprove.role === 'Lady Superintendent' ? 'LS_REQUEST_APPROVED' : 'USER_REQUEST_APPROVED', entityType: 'user', entityId: userToApprove.id, details: { approvedBy: requester.id } } as any);
        } catch (e) {
          console.warn('Failed to create audit log for admin approval:', (e as any)?.message || e);
        }
      } else {
        return res.status(403).json({ message: "Not authorized to approve users" });
      }

      await storage.createNotification({
        senderId: requester.id,
        senderRole: requester.role as any,
        receiverRole: userToApprove.role as any,
        receiverSchoolId: userToApprove.schoolId,
        type: "system" as any,
        title: "Account approved",
        message: `Your account has been approved by ${requester.username}`,
        metadata: { targetUserId: userToApprove.id },
      } as any);

      return res.json({ message: "User approved" });
    } catch (error: any) {
      console.error("Approve user error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to approve user" });
    }
  });

  app.post("/api/approvals/:id/reject", authenticateToken, authorizeRoles("Headmaster", "PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const requester = req.user!;

      const userToReject = await storage.getUser(id);
      console.info(`Approvals: fetched user ${id} from DB: approvalStatus=${userToReject?.approvalStatus} isActive=${userToReject?.isActive} schoolId=${userToReject?.schoolId} role=${userToReject?.role}`);
      if (!userToReject) return res.status(404).json({ message: "User not found" });
      if (userToReject.approvalStatus !== "Pending") return res.status(400).json({ message: "User is not pending approval" });

      // Headmasters cannot reject PO or Headmaster roles; Admin can reject any
      if (requester.role === "Headmaster") {
        if (userToReject.role === "PO" || userToReject.role === "Headmaster") {
          return res.status(403).json({ message: "Insufficient privileges to reject this role" });
        }
        if (userToReject.schoolId !== requester.schoolId) return res.status(403).json({ message: "Cannot reject users from a different school" });
        await db.update(users).set({ 
          approvalStatus: "Rejected" as any, 
          isActive: false, 
          approverId: requester.id, 
          approverNote: reason ?? null, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        try {
          await storage.createAuditLog({ userId: requester.id, action: userToReject.role === 'Lady Superintendent' ? 'LS_REQUEST_REJECTED' : 'USER_REQUEST_REJECTED', entityType: 'user', entityId: userToReject.id, details: { rejectedBy: requester.id, reason: reason ?? null } } as any);
        } catch (e) {
          console.warn('Failed to create audit log for rejection:', (e as any)?.message || e);
        }
      } else if (requester.role === "PO") {
        // PO can reject Headmaster accounts in their district
        if (userToReject.role !== "Headmaster") {
          return res.status(403).json({ message: "PO can only reject Headmaster accounts" });
        }
        
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }
        
        if (userToReject.district !== poDistrict) {
          return res.status(403).json({ message: "Cannot reject Headmaster from a different district" });
        }

        await db.update(users).set({ 
          approvalStatus: "Rejected" as any, 
          isActive: false, 
          approverId: requester.id, 
          approverNote: reason ?? null, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        
        try {
          await storage.createAuditLog({ userId: requester.id, action: 'HEADMASTER_REQUEST_REJECTED', entityType: 'user', entityId: userToReject.id, details: { rejectedBy: requester.id, reason: reason ?? null, district: poDistrict } } as any);
        } catch (e) {
          console.warn('Failed to create audit log for PO rejection:', (e as any)?.message || e);
        }
      } else if (requester.role === "Admin") {
        await db.update(users).set({ 
          approvalStatus: "Rejected" as any, 
          isActive: false, 
          approverId: requester.id, 
          approverNote: reason ?? null, 
          approvedAt: new Date() 
        } as any).where(eq(users.id, id));
        try {
          await storage.createAuditLog({ userId: requester.id, action: userToReject.role === 'Lady Superintendent' ? 'LS_REQUEST_REJECTED' : 'USER_REQUEST_REJECTED', entityType: 'user', entityId: userToReject.id, details: { rejectedBy: requester.id, reason: reason ?? null } } as any);
        } catch (e) {
          console.warn('Failed to create audit log for admin rejection:', (e as any)?.message || e);
        }
      } else {
        return res.status(403).json({ message: "Not authorized to reject users" });
      }

      await storage.createNotification({
        senderId: requester.id,
        senderRole: requester.role as any,
        receiverRole: userToReject.role as any,
        receiverSchoolId: userToReject.schoolId,
        type: "system" as any,
        title: "Account rejected",
        message: `Your account registration was rejected by ${requester.username}. Reason: ${reason ?? "Not provided"}`,
        metadata: { targetUserId: userToReject.id },
      } as any);

      return res.json({ message: "User rejected" });
    } catch (error: any) {
      console.error("Reject user error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to reject user" });
    }
  });

  app.get("/api/schools", async (req: AuthRequest | any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const region = req.query.region as string | undefined;

      // If user is authenticated and is PO, filter by their region
      let filterRegion = region;
      if (req.user && req.user.role === "PO") {
        // Get PO's region - keep using query param for region, but we'll enforce district filtering below
        filterRegion = region || undefined;
      }

      // If an Admin requests schools, include pending ones so admin can manage them
      const includePendingQuery = String(req.query.includePending || "false").toLowerCase() === "true";
      const includePending = includePendingQuery || (req.user && req.user.role === "Admin");
      const { schools, total } = await storage.getSchools(page, 100, filterRegion, includePending);

      // Diagnostic: log whether auth header or req.user is present so we can diagnose UI behavior
      const hasAuthHeader = !!req.headers?.authorization;
      console.info(`Get schools: authHeader=${hasAuthHeader} reqUser=${req.user?.id ?? 'none'} includePending=${includePending} returned ${schools.length} schools (totalItems=${total})`);

      // If the route is public but the client sent an Authorization header, attempt to decode it so we can apply PO filters even when authenticateToken middleware wasn't run.
      let effectiveReqUser = req.user;
      if (!effectiveReqUser && hasAuthHeader) {
        try {
          const token = (req.headers.authorization as string).split(' ')[1];
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded?.id) {
            const storedUser = await storage.getUser(decoded.id);
            if (storedUser && storedUser.isActive) {
              effectiveReqUser = {
                id: storedUser.id,
                username: storedUser.username,
                role: storedUser.role,
                schoolId: storedUser.schoolId ?? undefined,
                classSection: storedUser.classSection ?? undefined,
              } as any;
              console.info(`Get schools: decoded auth header user=${storedUser.id} district=${storedUser.district}`);
            }
          }
        } catch (err: any) {
          console.info('Get schools: auth header present but token invalid or expired');
        }
      }

      // If user is a PO, enforce strict district/school scoping
      if (effectiveReqUser && effectiveReqUser.role === "PO") {
        const poUser = await storage.getUser(effectiveReqUser.id);
        const poDistrict = poUser?.district ?? undefined;

        if (poDistrict) {
          const filteredSchools = (schools || []).filter(s => sameDistrict(s.district, poDistrict));
          const filteredTotal = filteredSchools.length;
          console.info(`Get schools (PO district filter applied: ${poDistrict}) returned ${filteredSchools.length} schools`);
          return res.json({
            schools: filteredSchools,
            totalPages: Math.ceil(filteredTotal / 100),
            totalItems: filteredTotal,
          });
        }

        // If PO has no district but is assigned to a specific school, only return that school
        if (poUser?.schoolId) {
          const filteredSchools = (schools || []).filter(s => s.id === poUser.schoolId);
          const filteredTotal = filteredSchools.length;
          console.info(`Get schools (PO assigned school filter applied: ${poUser.schoolId}) returned ${filteredSchools.length} schools`);
          return res.json({
            schools: filteredSchools,
            totalPages: Math.ceil(filteredTotal / 100),
            totalItems: filteredTotal,
          });
        }

        // If PO has neither district nor assigned school, return an empty list to avoid leaking other districts
        console.info('Get schools: PO has no district or assigned school - returning empty list');
        return res.json({
          schools: [],
          totalPages: 0,
          totalItems: 0,
        });
      }

      res.json({
        schools,
        totalPages: Math.ceil(total / 100),
        totalItems: total,
      });
    } catch (error: any) {
      console.error("Get schools error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch schools" });
    }
  });

  app.post("/api/schools", async (req, res) => {
    // Allow school request submission without auth for new account creation
    try {
      const data = insertSchoolSchema.parse(req.body);
      // Generate code if not provided
      if (!data.code) {
        data.code = `SCH-${Date.now().toString().slice(-6)}`;
      }
      // Mark as pending approval and do not activate
      (data as any).approvalStatus = "Pending";
      (data as any).isActive = false;
      // Keep a copy of contact email for notifying requester
      if ((data as any).contactEmail) (data as any).requestedByEmail = (data as any).contactEmail;

      const school = await storage.createSchool(data as any);
      console.info(`School request created: id=${school.id} approvalStatus=${school.approvalStatus} isActive=${school.isActive} requestedByEmail=${school.requestedByEmail ?? 'n/a'}`);

      // Notify system admins and POs about the new school request
      try {
        // Notifications require a valid senderId referencing an existing user.
        // Use an Admin user as the sender for system-generated notifications when possible.
        const [adminUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.role, "Admin")).limit(1) as any;
        if (adminUser && adminUser.id) {
          // Notify POs in the same district
          if (data.district) {
            await storage.createNotification({
              senderId: adminUser.id,
              senderRole: adminUser.role as any,
              receiverRole: "PO" as any,
              type: "school_request" as any,
              title: "New school approval request",
              message: `New school request: ${school.name} (${school.district} - ${school.block}) requires PO approval`,
              metadata: { schoolId: school.id, request: school, district: data.district },
            } as any);
          }
          
          // Also notify Admins as fallback
          await storage.createNotification({
            senderId: adminUser.id,
            senderRole: adminUser.role as any,
            receiverRole: "Admin" as any,
            type: "school_request" as any,
            title: "New school request",
            message: `New school request: ${school.name} (${school.district} - ${school.block})`,
            metadata: { schoolId: school.id, request: school },
          } as any);
        } else {
          console.warn("No Admin user found — skipping in-app notification for new school request");
        }
      } catch (nerr) {
        console.error("Failed to create notification for new school request:", nerr);
      }

      res.status(201).json(school);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create school error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to create school" });
    }
  });

  app.post("/api/schools/authenticated", authenticateToken, denyAdmin, authorizeRoles(), async (req: AuthRequest, res) => {
    try {
      const data = insertSchoolSchema.parse(req.body);
      // Generate code if not provided
      if (!data.code) {
        data.code = `SCH-${Date.now().toString().slice(-6)}`;
      }
      // If an Admin or PO creates the school via authenticated route, mark it Approved and active
      (data as any).approvalStatus = "Approved";
      (data as any).isActive = true;
      if (req.user) {
        (data as any).approverId = req.user.id;
        (data as any).approvedAt = new Date();
      }

      const school = await storage.createSchool(data);
      res.status(201).json(school);
    } catch (error: any) {
      const err = error as any;
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create school error:", err?.message || String(err));
      res.status(500).json({ message: err?.message || "Failed to create school" });
    }
  });

  // Admin and PO endpoints to review pending school requests
  app.get("/api/schools/pending", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const requester = req.user!;
      let pending: any[] = [];

      if (requester.role === "PO") {
        // PO can only see pending schools in their district
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }

        pending = await db.select().from(schools).where(and(
          eq(schools.approvalStatus, "Pending"),
          eq(schools.district, poDistrict)
        )).orderBy(desc(schools.createdAt));

        console.info(`PO ${requester.id} requested pending schools for district ${poDistrict}. Found ${pending.length}`);
      } else if (requester.role === "Admin") {
        // Admin can see all pending schools
        pending = await db.select().from(schools).where(eq(schools.approvalStatus, "Pending")).orderBy(desc(schools.createdAt));
        console.info(`Admin ${requester.id} requested all pending schools. Found ${pending.length}`);
      }

      return res.json({ pending });
    } catch (error: any) {
      console.error("Get pending schools error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch pending schools" });
    }
  });

  app.post("/api/schools/:id/approve", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requester = req.user!;

      const schoolToApprove = await storage.getSchool(id, true);
      console.info(`Approvals: fetched school ${id} from DB: approvalStatus=${schoolToApprove?.approvalStatus} isActive=${schoolToApprove?.isActive} requestedByEmail=${schoolToApprove?.requestedByEmail ?? 'n/a'}`);
      if (!schoolToApprove) return res.status(404).json({ message: "School not found" });
      if (schoolToApprove.approvalStatus !== "Pending") return res.status(400).json({ message: "School is not pending approval" });

      // PO can only approve schools in their district
      if (requester.role === "PO") {
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }
        
        if (schoolToApprove.district !== poDistrict) {
          return res.status(403).json({ message: "Cannot approve school from a different district" });
        }
      }

      await db.update(schools).set({ 
        approvalStatus: "Approved" as any, 
        isActive: true, 
        approverId: requester.id, 
        approvedAt: new Date() 
      } as any).where(eq(schools.id, id));

      // Notify admins and the requesting user (if exists)
      try {
        if (requester.role === "PO") {
          // Notify admins about PO approval
          await storage.createNotification({
            senderId: requester.id,
            senderRole: requester.role as any,
            receiverRole: "Admin" as any,
            type: "system" as any,
            title: "School approved by PO",
            message: `School ${schoolToApprove.name} has been approved by PO ${requester.username}`,
            metadata: { schoolId: id, approvedBy: "PO" },
          } as any);
        } else {
          // Admin approval notification
          await storage.createNotification({
            senderId: requester.id,
            senderRole: requester.role as any,
            receiverRole: "Admin" as any,
            type: "system" as any,
            title: "School approved",
            message: `School ${schoolToApprove.name} has been approved by ${requester.username}`,
            metadata: { schoolId: id },
          } as any);
        }

        if (schoolToApprove.requestedByEmail) {
          const [user] = await db.select().from(users).where(eq(users.email, schoolToApprove.requestedByEmail));
          if (user) {
            await storage.createNotification({
              senderId: requester.id,
              senderRole: requester.role as any,
              receiverRole: user.role as any,
              receiverSchoolId: user.schoolId,
              type: "system" as any,
              title: "School approved",
              message: `Your requested school ${schoolToApprove.name} has been approved and is now active.`,
              metadata: { schoolId: id },
            } as any);
          }
        }
      } catch (nerr) {
        console.error("Failed to create notification for school approval:", nerr);
      }

      return res.json({ message: "School approved" });
    } catch (error: any) {
      console.error("Approve school error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to approve school" });
    }
  });

  app.post("/api/schools/:id/reject", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const requester = req.user!;

      const schoolToReject = await storage.getSchool(id, true);
      if (!schoolToReject) return res.status(404).json({ message: "School not found" });
      if (schoolToReject.approvalStatus !== "Pending") return res.status(400).json({ message: "School is not pending approval" });

      // PO can only reject schools in their district
      if (requester.role === "PO") {
        const poUser = await storage.getUser(requester.id);
        const poDistrict = poUser?.district;
        
        if (!poDistrict) {
          return res.status(400).json({ message: "PO district not configured" });
        }
        
        if (schoolToReject.district !== poDistrict) {
          return res.status(403).json({ message: "Cannot reject school from a different district" });
        }
      }

      await db.update(schools).set({ 
        approvalStatus: "Rejected" as any, 
        isActive: false, 
        approverId: requester.id, 
        approverNote: reason ?? null, 
        approvedAt: new Date() 
      } as any).where(eq(schools.id, id));

      try {
        if (requester.role === "PO") {
          // Notify admins about PO rejection
          await storage.createNotification({
            senderId: requester.id,
            senderRole: requester.role as any,
            receiverRole: "Admin" as any,
            type: "system" as any,
            title: "School rejected by PO",
            message: `School ${schoolToReject.name} has been rejected by PO ${requester.username}. Reason: ${reason || 'No reason provided'}`,
            metadata: { schoolId: id, rejectedBy: "PO", reason: reason || null },
          } as any);
        } else {
          await storage.createNotification({
            senderId: requester.id,
            senderRole: requester.role as any,
            receiverRole: "Admin" as any,
            type: "system" as any,
            title: "School rejected",
            message: `School ${schoolToReject.name} has been rejected by ${requester.username}. Reason: ${reason ?? "Not provided"}`,
            metadata: { schoolId: id },
          } as any);
        }

        if (schoolToReject.requestedByEmail) {
          const [user] = await db.select().from(users).where(eq(users.email, schoolToReject.requestedByEmail));
          if (user) {
            await storage.createNotification({
              senderId: requester.id,
              senderRole: requester.role as any,
              receiverRole: user.role as any,
              receiverSchoolId: user.schoolId,
              type: "system" as any,
              title: "School request rejected",
              message: `Your requested school ${schoolToReject.name} was rejected. Reason: ${reason ?? "Not provided"}`,
              metadata: { schoolId: id },
            } as any);
          }
        }
      } catch (nerr) {
        console.error("Failed to create notification for school rejection:", nerr);
      }

      return res.json({ message: "School rejected" });
    } catch (error: any) {
      console.error("Reject school error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to reject school" });
    }
  });

  app.put("/api/schools/:id", authenticateToken, denyAdmin, authorizeRoles(), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const school = await storage.updateSchool(id, req.body);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      res.json(school);
    } catch (error: any) {
      console.error("Update school error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update school" });
    }
  });

  app.get("/api/students", authenticateToken, denyAdmin, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      // Admin can see all students, others filtered by school
      let schoolId = req.user?.role === "Admin"
        ? (req.query.schoolId as string || undefined)
        : (req.user?.role === "ClassTeacher" || req.user?.role === "Headmaster" || req.user?.role === "MedicalTeam")
        ? req.user.schoolId
        : req.query.schoolId as string | undefined;

      // If PO, ensure requested school is in their district or their assigned school; if no school specified, restrict to their district/school
      if (req.user?.role === "PO") {
        const user = await storage.getUser(req.user.id);
        if (req.query.schoolId) {
          const requestedSchool = await storage.getSchool(req.query.schoolId as string);
          if (!requestedSchool) return res.status(404).json({ message: "School not found" });

          // If PO has a district, ensure requested school is in same district (case/whitespace-insensitive)
          if (user?.district) {
            if (!sameDistrict(requestedSchool.district, user.district)) {
              return res.status(403).json({ message: "You can only access schools in your district" });
            }
          } else if (user?.schoolId) {
            // If PO has no district but is assigned to a school, restrict to that school
            if (requestedSchool.id !== user.schoolId) {
              return res.status(403).json({ message: "You can only access your assigned school" });
            }
          } else {
            // PO has no district and no assigned school - deny explicit school access
            return res.status(403).json({ message: "You can only access schools in your district" });
          }

          // Allow the requested school if checks pass
          schoolId = req.query.schoolId as string;
        } else {
          // no school specified - keep schoolId undefined here but later we'll fetch students only from district schools when building the list
          schoolId = undefined;
        }
      }

      const classSection = req.query.classSection as string;
      const search = req.query.search as string;
      
      // Lady Superintendent specific filters - only apply these for LS role
      let genderFilter: string | undefined;
      let menstruationStartedFilter: boolean | undefined;
      let minAgeFilter: number | undefined;
      
      if (req.user?.role === "Lady Superintendent") {
        genderFilter = req.query.gender as string;
        menstruationStartedFilter = req.query.menstruationStarted === 'true';
        minAgeFilter = req.query.minAge ? parseInt(req.query.minAge as string) : undefined;
      }

      // For ClassTeacher, filter by their assigned class
      let finalClassSection: string | undefined = classSection;
      // Lady Superintendent: enforce school-level scope, disallow class filtering, and show only female adolescent students
      if (req.user?.role === "Lady Superintendent") {
        // Disallow class-based filtering for LS
        if (classSection) {
          return res.status(403).json({ message: "Lady Superintendent cannot filter by class" });
        }
        // Enforce school scope
        if (!req.user.schoolId) return res.status(400).json({ message: "LS is not assigned to a school" });
        schoolId = req.user.schoolId;
        finalClassSection = undefined; // LS is school-wide
      }

      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        if (teacher?.classSection) {
          // Override classSection filter with teacher's assigned class
          const teacherClassSection = teacher.classSection ?? undefined;
          if (classSection && classSection !== teacherClassSection) {
            return res.status(403).json({ message: "You can only view students from your assigned class" });
          }
          // Set filter to teacher's class
          finalClassSection = teacherClassSection;
        }
      }

      let students: any[] = [];
      let total = 0;

      if (req.user?.role === "PO" && !req.query.schoolId) {
        // Aggregate students from all schools in PO's district
        const user = await storage.getUser(req.user.id);
        const { schools: allSchools } = await storage.getSchools(1, 1000);
        const allowedSchools = allSchools.filter(s => (user?.district ? s.district === user.district : (user?.schoolId ? s.id === user.schoolId : false)));

        // Fetch students for each school (no paging across schools for simplicity)
        for (const s of allowedSchools) {
          const res = await storage.getStudents({ 
            schoolId: s.id, 
            classSection: finalClassSection, 
            search, 
            gender: genderFilter,
            menstruationStarted: menstruationStartedFilter,
            minAge: minAgeFilter,
            page: 1, 
            limit: 1000 
          });
          students.push(...res.students);
          total += res.total;
        }
        // simple pagination: slice according to page and limit
        const offset = (page - 1) * 10;
        const pagedStudents = students.slice(offset, offset + 10);
        students = pagedStudents;
      } else {
        const result = await storage.getStudents({
          schoolId,
          classSection: finalClassSection,
          search,
          gender: genderFilter,
          menstruationStarted: menstruationStartedFilter,
          minAge: minAgeFilter,
          page,
          limit: 10,
        });
        students = result.students;
        total = result.total;
      }

      // Helper: check Supabase storage for an existing health-card file for a student
      const supabaseHasHealthCardForStudent = async (stu: any) => {
        if (!supabase) return false;
        const candidates = [
          `health-cards/${stu.id}`,
          `health-cards/${stu.uniqueId}`,
          `health_cards/${stu.id}`,
          `health_cards/${stu.uniqueId}`,
        ];
        try {
          for (const pathPrefix of candidates) {
            const { data, error } = await supabase.storage.from(SUPABASE_UPLOAD_BUCKET).list(pathPrefix, { limit: 1 });
            if (!error && data && data.length > 0) return true;
          }
        } catch (e) {
          console.warn('Supabase health-card check failed for', stu.id, (e as any)?.message || e);
        }
        return false;
      };

      const studentsWithHealthStatus = await Promise.all(
        students.map(async (student) => {
          const { cards } = await storage.getAnnualHealthCards({
            studentId: student.id,
            year: new Date().getFullYear(),
            limit: 1,
          });

          // If no DB card found but a file exists in Supabase storage, create an Approved placeholder
          if ((!cards || cards.length === 0) && await supabaseHasHealthCardForStudent(student)) {
            try {
              const payload = buildHealthCardPayload(student, student.schoolId || '', {}, req.user?.id);
              // Minimal required fields
              const createPayload = {
                ...payload,
                status: 'Approved',
                approvalBy: req.user?.id ?? null,
                approvalDate: new Date(),
                dataEntryBy: req.user?.id ?? null,
              } as any;

              const newCard = await storage.createAnnualHealthCard(createPayload);
              (cards as any[]).unshift(newCard);
              console.info(`Auto-created Approved health card from Supabase asset for student ${student.id} (${newCard.id})`);
            } catch (e) {
              console.warn('Failed to auto-create health card for student', student.id, (e as any)?.message || e);
            }
          }

          const rawStatus = cards[0]?.status as string | undefined;
          return {
            ...student,
            healthCardStatus: normalizeStatus(rawStatus),
            lastCheckup: null,
          };
        })
      );

      res.json({
        students: studentsWithHealthStatus,
        totalPages: Math.ceil(total / 10),
        totalItems: total,
      });
    } catch (error: any) {
      // Extract clean error message
      let errorMessage = "Failed to fetch students";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      // Don't log if it's a known variable error (likely from old code)
      if (!errorMessage.includes('studentQueryParams')) {
        console.error("Get students error:", errorMessage);
      }
      res.status(500).json({ message: errorMessage });
    }
  });

  app.get("/api/students/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Enforce access rules per role
      if (req.user?.role === "PO") {
        const user = await storage.getUser(req.user.id);
        const school = student.schoolId ? await storage.getSchool(student.schoolId) : null;
        if (user?.district && school?.district && !sameDistrict(school.district, user.district)) {
          return res.status(403).json({ message: "You can only access students in your district" });
        }
      }

      // Lady Superintendent: enforce school-level scope and only allow viewing female adolescent students eligible for menstrual tracking
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId) return res.status(400).json({ message: "LS is not assigned to a school" });
        if (student.schoolId !== req.user.schoolId) return res.status(403).json({ message: "Cannot access students from another school" });
        if (student.gender !== 'F') return res.status(403).json({ message: "LS can only access female students" });
        // Check age >= 10
        const dob = student.dateOfBirth ? new Date(student.dateOfBirth) : null;
        if (!dob) return res.status(403).json({ message: "Student date of birth required to determine eligibility" });
        const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 10) return res.status(403).json({ message: "Student not eligible for menstrual health tracking" });
      }

      res.json(student);
    } catch (error: any) {
      console.error("Get student error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch student" });
    }
  });

  // --- Lady Superintendent Dashboard (simplified) ---
  app.get("/api/ls/metrics", authenticateToken, authorizeRoles("Lady Superintendent"), async (req: AuthRequest, res) => {
    try {
      res.json({ message: "Metrics endpoint deprecated - using simplified dashboard" });
    } catch (err: any) {
      console.error('LS metrics error:', err?.message || err);
      res.status(500).json({ message: 'Failed to fetch LS metrics' });
    }
  });



  app.post("/api/students", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster"), async (req: AuthRequest, res) => {
    try {
      // Handle both formats: { student: {...}, healthCard: {...} } or direct student data
      const body = req.body;
      const studentData = body.student || body;
      const healthCardData = body.healthCard;

      // Set schoolId before validation
      let schoolId = req.user?.schoolId || studentData.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }

      // Generate uniqueId if not provided (prefer PRAN when available)
      let uniqueId = studentData.uniqueId || studentData.pranNo;
      if (!uniqueId) {
        uniqueId = `STD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }

      // Prepare student data with required fields before validation
      const studentDataWithDefaults = {
        ...studentData,
        schoolId,
        uniqueId
      };

      // Validate student data with schema
      const validatedStudentData = insertStudentSchema.parse(studentDataWithDefaults);

      // For ClassTeacher, ensure student is in their assigned class
      let classSection = validatedStudentData.classSection;
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        if (teacher?.schoolId !== schoolId) {
          return res.status(403).json({ message: "You can only add students to your school" });
        }
        // Use teacher's assigned class if not specified
        if (!classSection) {
          classSection = teacher?.classSection || "";
        }
        if (teacher?.classSection && classSection !== teacher.classSection) {
          return res.status(403).json({ message: `You can only add students to ${teacher.classSection || 'your assigned class section'}` });
        }
      }

      let student;
      try {
        student = await storage.createStudent({
          ...validatedStudentData,
          schoolId,
          uniqueId,
          classSection,
        });
      } catch (dbError: any) {
        console.error("Database error creating student:", dbError?.message || String(dbError));
        if (dbError?.code === '23505') {
          return res.status(400).json({ message: "Student with this information already exists" });
        }
        return res.status(500).json({ message: "Database error occurred" });
      }

      // Create health card if data provided (optional)
      let healthCard = null;
      if (healthCardData) {
        try {
          const weight = parseFloat(healthCardData.weightKg) || 0;
          const height = parseFloat(healthCardData.heightCm) || 0;
          const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(2) : null;

          // Parse blood pressure from string format "120/80"
          let sbp: number | undefined;
          let dbp: number | undefined;
          if (healthCardData.bloodPressure) {
            const bpMatch = healthCardData.bloodPressure.match(/^(\d+)\/(\d+)$/);
            if (bpMatch) {
              sbp = parseInt(bpMatch[1]);
              dbp = parseInt(bpMatch[2]);
            }
          }

          // Calculate age in years
          const birthYear = student.dateOfBirth ? new Date(student.dateOfBirth).getFullYear() : null;
          const ageYears = birthYear ? new Date().getFullYear() - birthYear : null;

          // Create a full health card payload from submitted data
          healthCard = await storage.createAnnualHealthCard(buildHealthCardPayload(student, schoolId, healthCardData, req.user?.id));

          // Calculate BP values for referral check
          let systolic = healthCardData.sbp ? parseInt(healthCardData.sbp) : null;
          let diastolic = healthCardData.dbp ? parseInt(healthCardData.dbp) : null;

          // If sbp/dbp not available, try to parse from bloodPressure string
          if ((!systolic || !diastolic) && healthCardData.bloodPressure) {
            const bpMatch = healthCardData.bloodPressure.match(/^(\d+)\/(\d+)$/);
            if (bpMatch) {
              systolic = parseInt(bpMatch[1]);
              diastolic = parseInt(bpMatch[2]);
            }
          }

          // Create referrals for critical health conditions using new C7 and C8 logic
          const referralConditions = [];

          // Check C7 Leprosy
          if (isC7ReferralNeeded(healthCardData)) {
            referralConditions.push({
              condition: true,
              type: "disease",
              code: "C7",
              issue: generateC7ReferralIssue(healthCardData),
              facility: healthCardData.c7_referral_facility || "District Hospital"
            });
          }

          // Check C8 Tuberculosis
          if (isC8ReferralNeeded(healthCardData)) {
            referralConditions.push({
              condition: true,
              type: "disease",
              code: "C8",
              issue: generateC8ReferralIssue(healthCardData),
              facility: healthCardData.c8_referral_facility || "District Hospital"
            });
          }

          // Check C9 Sickle Cell Anaemia
          if (isC9ReferralNeeded(healthCardData)) {
            referralConditions.push({
              condition: true,
              type: "disease",
              code: "C9",
              issue: getC9ReferralDescription(healthCardData),
              facility: healthCardData.c9_referral_facility || "Medical College/District Hospital"
            });
          }

          // Check other deficiencies and conditions
          referralConditions.push(
            {
              condition: healthCardData.b3_severe_anemia === true,
              type: "deficiency",
              code: "B3",
              issue: "Severe anemia detected",
              facility: healthCardData.b3_referral_facility || "PHC Center"
            },
            {
              condition: healthCardData.b6_goitre === true,
              type: "deficiency",
              code: "B6",
              issue: "Goitre detected",
              facility: healthCardData.b6_referral_facility || "PHC Center"
            },
            {
              condition: systolic && diastolic && (systolic >= 140 || diastolic >= 90),
              type: "deficiency",
              code: "BP",
              issue: `High blood pressure detected (${systolic}/${diastolic} mmHg)`,
              facility: "PHC Center"
            }
          );

          for (const referralCondition of referralConditions) {
            if (referralCondition.condition) {
              try {
                await storage.createReferral({
                  studentId: student.id,
                  schoolId,
                  healthCardId: healthCard.id,
                  referralType: referralCondition.type,
                  referralCode: referralCondition.code,
                  issue: referralCondition.issue,
                  facility: referralCondition.facility,
                  referralDate: new Date().toISOString().split('T')[0],
                  status: "Pending",
                  createdBy: req.user?.id,
                });
              } catch (referralError: any) {
                console.warn(`Failed to create referral for ${referralCondition.issue}:`, referralError?.message || String(referralError));
                // Don't fail the request if referral creation fails
              }
            }
          }
        } catch (healthCardError: any) {
          console.warn("Failed to create health card, but student was created:", healthCardError?.message || String(healthCardError));
          // Don't fail the request if health card creation fails
        }
      }

      res.status(201).json(student);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ message: `Validation error: ${errorMessage}` });
      }

      // Handle database errors
      if (error?.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: "Student with this unique ID already exists" });
      }

      console.error("Create student error:", error?.message || String(error));
      res.status(500).json({ message: "Failed to create student. Please try again." });
    }
  });

  app.put("/api/students/:id", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const payload = req.body as any;

      // For ClassTeacher, ensure they can only update students in their assigned class and school
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        const student = await storage.getStudent(id);
        
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        // Check if student is in teacher's school
        if (teacher?.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "You can only update students in your school" });
        }
        
        // Check if student is in teacher's assigned class
        if (teacher?.classSection && student.classSection !== teacher.classSection) {
          return res.status(403).json({ message: "You can only update students in your assigned class" });
        }
        
        // If updating classSection, ensure it's still the teacher's class
        if (payload.classSection && payload.classSection !== teacher?.classSection) {
          return res.status(403).json({ message: "You can only assign students to your class" });
        }
      }

      const updated = await storage.updateStudent(id, payload);

      if (!updated) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Update student error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update student" });
    }
  });

  // Mark menstruation started for a student (Class Teacher only)
  app.post("/api/students/:id/mark-menstruation", authenticateToken, authorizeRoles("ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      // Get the student
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify Class Teacher can only mark for their assigned class
      const teacher = await storage.getUser(req.user!.id);
      if (teacher?.schoolId !== student.schoolId) {
        return res.status(403).json({ message: "You can only mark menstruation for students in your school" });
      }
      if (teacher?.classSection && student.classSection !== teacher.classSection) {
        return res.status(403).json({ message: `You can only mark menstruation for students in ${teacher.classSection || 'your assigned class section'}` });
      }

      // Verify student is female
      if (student.gender !== 'F') {
        return res.status(400).json({ message: "Menstruation tracking is only applicable for female students" });
      }

      // Verify student is at least 10 years old
      if (student.dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 10) {
          return res.status(400).json({ message: "Student must be at least 10 years old for menstruation tracking" });
        }
      }

      // Check if already marked
      if (student.menstruationStartedAt) {
        return res.status(400).json({ 
          message: "Menstruation has already been marked for this student",
          markedAt: student.menstruationStartedAt,
          markedBy: student.menstruationMarkedBy
        });
      }

      // Mark menstruation started
      const updated = await storage.updateStudent(id, {
        menstruationStartedAt: new Date(),
        menstruationMarkedBy: req.user!.id,
      });

      if (!updated) {
        return res.status(500).json({ message: "Failed to mark menstruation" });
      }

      console.info(`[Menstruation Marked] Student ${id} by teacher ${req.user!.id} at ${new Date().toISOString()}`);

      res.json({ 
        message: "Menstruation marked successfully. Student is now visible in Lady Superintendent dashboard.",
        student: updated 
      });
    } catch (error: any) {
      console.error("Mark menstruation error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to mark menstruation" });
    }
  });

  // Student Academic Actions (Promote/Demote/Detain)
  app.post("/api/students/:id/academic-action", authenticateToken, authorizeRoles("ClassTeacher", "Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { actionType, reason } = req.body;

      // Validate input
      if (!actionType || !['Promote', 'Demote', 'Detain'].includes(actionType)) {
        return res.status(400).json({ message: "Invalid action type. Must be Promote, Demote, or Detain" });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "Reason is required and must be at least 10 characters long" });
      }

      // Perform the academic action
      const result = await storage.performStudentAcademicAction({
        studentId: id,
        actionType,
        reason: reason.trim(),
        performedBy: req.user!.id,
        performedByRole: req.user!.role,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({
        message: result.message,
        student: result.student,
      });
    } catch (error: any) {
      console.error("Academic action error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to perform academic action" });
    }
  });

  // Get student academic action history
  app.get("/api/students/:id/academic-actions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const academicYear = req.query.academicYear ? parseInt(req.query.academicYear as string) : undefined;

      // Verify access to student
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Role-based access control
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        if (teacher?.schoolId !== student.schoolId || 
            (teacher?.classSection && student.classSection !== teacher.classSection)) {
          return res.status(403).json({ message: "You can only view academic actions for students in your assigned class" });
        }
      } else if (req.user?.role === "Headmaster") {
        if (req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "You can only view academic actions for students in your school" });
        }
      }

      const result = await storage.getStudentAcademicActions({
        studentId: id,
        academicYear,
        page,
        limit,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Get academic actions error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to get academic actions" });
    }
  });

  // Validate academic action (for frontend validation)
  app.post("/api/students/:id/validate-academic-action", authenticateToken, authorizeRoles("ClassTeacher", "Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { actionType } = req.body;

      if (!actionType || !['Promote', 'Demote', 'Detain'].includes(actionType)) {
        return res.status(400).json({ message: "Invalid action type" });
      }

      const validation = await storage.validateAcademicAction(id, actionType, req.user!.id);
      res.json(validation);
    } catch (error: any) {
      console.error("Validate academic action error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to validate academic action" });
    }
  });

  app.get("/api/annual-cards", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Lady Superintendent should not have access to health cards at all
      if (req.user?.role === "Lady Superintendent") {
        return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const status = req.query.status as string;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const schoolId = req.user?.role === "ClassTeacher" || req.user?.role === "Headmaster"
        ? req.user.schoolId
        : req.query.schoolId as string;

      // For ClassTeacher, get their assigned class
      let teacherClassSection: string | undefined;
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      }

      // For Headmaster viewing pending cards for approval, default to Pending status
      let finalStatus = status;
      if (req.user?.role === "Headmaster" && !status) {
        finalStatus = "Pending";
      }

      // (No special createdBy fallback here.)

      try {
        const studentIdQuery = req.query.studentId as string | undefined;
        console.info('[GET /api/annual-cards] params', { userRole: req.user?.role, schoolId, status: finalStatus, year, studentIdQuery, teacherClassSection });
        const { cards, total } = await storage.getAnnualHealthCards({
          studentId: studentIdQuery,
          schoolId,
          status: finalStatus,
          year,
          page: 1, // Get all pages to filter by class
          limit: 10000, // Get all to filter properly
        });
        console.info('[GET /api/annual-cards] storage returned', { count: cards?.length, total });

        // Enrich cards with student details and filter by class for ClassTeacher
        const enrichedCards = await Promise.all(
          cards.map(async (card) => {
            const student = await storage.getStudent(card.studentId);
            
            // Calculate age from date of birth if not available in card
            let ageYears = card.ageYears;
            if (!ageYears && student?.dateOfBirth) {
              const today = new Date();
              const birthDate = new Date(student.dateOfBirth);
              ageYears = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                ageYears--;
              }
            }
            
            return {
              ...card,
              status: normalizeStatus((card as any).status),
              studentName: student?.fullName || card.nameOfChild,
              classSection: student?.classSection || card.classSection,
              studentId: student?.id,
              schoolName: card.schoolName,
              // Include age and gender for frontend
              ageYears: ageYears,
              gender: card.gender || student?.gender,
              student: student, // Include full student object for filtering
            };
          })
        );

        // Filter by classSection for ClassTeacher
        let filteredCards = enrichedCards;
        if (req.user?.role === "ClassTeacher" && teacherClassSection) {
          filteredCards = enrichedCards.filter(card =>
            card.student?.classSection === teacherClassSection || card.classSection === teacherClassSection
          );
        }

        // Paginate the filtered results
        const startIndex = (page - 1) * 10;
        const endIndex = startIndex + 10;
        const paginatedCards = filteredCards.slice(startIndex, endIndex);
        const filteredTotal = filteredCards.length;

        // Remove student object from response but keep age and gender
        const finalCards = paginatedCards.map(({ student, ...card }) => card);

        res.json({
          cards: finalCards,
          totalPages: Math.ceil(filteredTotal / 10),
          totalItems: filteredTotal,
        });
      } catch (queryError: any) {
        const errorMsg = String(queryError?.message || queryError);
        throw queryError;
      }
    } catch (error: any) {
      console.error("Get annual cards error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch health cards" });
    }
  });

  // Raw data endpoint to fetch real annual health card data without any processing
  app.get("/api/annual-cards/raw", authenticateToken, denyAdmin, async (req: AuthRequest, res) => {
    try {
      // Lady Superintendent should not have access to health cards at all
      if (req.user?.role === "Lady Superintendent") {
        return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const schoolId = req.query.schoolId as string;

      // Simple query to get raw data from database
      const rawCards = await db
        .select()
        .from(annualHealthCards)
        .where(sql`${annualHealthCards.year} = ${year}${schoolId ? sql` AND ${annualHealthCards.schoolId} = ${schoolId}` : sql``}`)
        .limit(1000);

      res.json({
        cards: rawCards,
        count: rawCards.length,
        year,
        schoolId
      });
    } catch (error: any) {
      console.error("Raw annual cards fetch error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch raw annual health card data" });
    }
  });

  // Debug endpoint: dump recent raw annual_health_cards rows for troubleshooting
  app.get("/api/debug/annual-cards-dump", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Lady Superintendent should not have access to health cards at all
      if (req.user?.role === "Lady Superintendent") {
        return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId;
      const studentId = req.query.studentId as string | undefined;

      // Build where clause dynamically
      let whereClause = sql`${annualHealthCards.year} = ${year}` as any;
      if (schoolId) whereClause = sql`${whereClause} AND ${annualHealthCards.schoolId} = ${schoolId}`;
      if (studentId) whereClause = sql`${whereClause} AND ${annualHealthCards.studentId} = ${studentId}`;

      const rawCards = await db
        .select()
        .from(annualHealthCards)
        .where(whereClause)
        .limit(100);

      // Return a compact projection to avoid huge payloads
      const projection = rawCards.map((r: any) => ({ id: r.id, studentId: r.studentId, schoolId: r.schoolId, status: normalizeStatus(r.status), approvalBy: r.approvalBy, approvalDate: r.approvalDate, createdAt: r.createdAt }));

      res.json({ count: projection.length, year, schoolId, studentId, rows: projection });
    } catch (error: any) {
      console.error("Debug dump error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to dump annual cards" });
    }
  });

  // Debug endpoint: latest card for a student
  app.get("/api/debug/annual-cards-latest", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Lady Superintendent should not have access to health cards at all
      if (req.user?.role === "Lady Superintendent") {
        return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
      }

      const studentId = req.query.studentId as string | undefined;
      if (!studentId) return res.status(400).json({ message: "studentId is required" });

      const [latest] = await db
        .select()
        .from(annualHealthCards)
        .where(eq(annualHealthCards.studentId, studentId))
        .orderBy(desc(annualHealthCards.createdAt))
        .limit(1);

      if (!latest) return res.status(404).json({ message: "No cards found for student" });
      (latest as any).status = normalizeStatus((latest as any).status);
      res.json({ card: latest });
    } catch (error: any) {
      console.error("Debug latest card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch latest card" });
    }
  });

  app.put("/api/annual-cards/:id/approve", authenticateToken, authorizeRoles("Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const card = await storage.updateAnnualHealthCard(id, {
        status: "Approved",
        approvalBy: req.user?.id,
        approvalDate: new Date(),
      });

      if (!card) {
        return res.status(404).json({ message: "Health card not found" });
      }

      // Normalize status before returning and log the change
      (card as any).status = normalizeStatus((card as any).status);
      console.info(`[PUT /api/annual-cards/${id}/approve] card updated - triggering automatic propagation`, { id: card.id, status: (card as any).status, approvalBy: card.approvalBy });
      
      res.json(card);
    } catch (error: any) {
      console.error("Approve card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to approve health card" });
    }
  });

  app.put("/api/annual-cards/:id/reject", authenticateToken, authorizeRoles("Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const card = await storage.updateAnnualHealthCard(id, {
        status: "Rejected",
        approvalBy: req.user?.id,
        approvalDate: new Date(),
        rejectionReason: reason,
      });

      if (!card) {
        return res.status(404).json({ message: "Health card not found" });
      }

      // Normalize status before returning and log the change
      (card as any).status = normalizeStatus((card as any).status);
      console.info(`[PUT /api/annual-cards/${id}/reject] card updated - triggering automatic propagation`, { id: card.id, status: (card as any).status, approvalBy: card.approvalBy });
      
      res.json(card);
    } catch (error: any) {
      console.error("Reject card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to reject health card" });
    }
  });

  app.get("/api/annual-cards/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Lady Superintendent should not have access to health cards at all
      if (req.user?.role === "Lady Superintendent") {
        return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
      }

      const { id } = req.params;
      const card = await storage.getAnnualHealthCard(id);

      if (!card) {
        return res.status(404).json({ message: "Health card not found" });
      }

      // Get student details for the card
      const student = await storage.getStudent(card.studentId);
      const school = card.schoolId ? await storage.getSchool(card.schoolId as string) : null;

      // Role-based access control
      // Enforce that PO users can only access cards for schools in their district
      if (req.user?.role === "PO") {
        const user = await storage.getUser(req.user.id);
        const cardSchool = school ?? (student ? await storage.getSchool(student.schoolId) : null);
        if (user?.district && cardSchool?.district && !sameDistrict(cardSchool.district, user.district)) {
          return res.status(403).json({ message: "You can only access records in your district" });
        }
      }

      // Lightweight logging to assist debugging without echoing PII
      console.info(`[GET /api/annual-cards/${id}] card retrieved, student=${student?.id ? student.id : 'missing'}, school=${school?.id ? school.id : 'missing'}`);

      // Validate essential fields to avoid returning partial/inconsistent data to UI
      const missing: string[] = [];
      if (!card.studentId) missing.push('studentId');
      if (!card.year) missing.push('year');
      if (!card.nameOfChild && !student?.fullName) missing.push('nameOfChild/student.fullName');

      if (missing.length > 0) {
        console.error(`[GET /api/annual-cards/${id}] Incomplete health card data: missing ${missing.join(', ')}`, { cardId: card.id, missing });
        return res.status(500).json({ message: 'Incomplete health card data', missing });
      }

      // Emit a short response log (keys only) to help debug missing fields in future
      console.debug(`[GET /api/annual-cards/${id}] sending response with keys:`, Object.keys(card));

      // Build a full-shaped card object, filling undefined schema fields with null so JSON contains all keys
      // Calculate age from date of birth if not available in card
      let ageYears = card.ageYears;
      if (!ageYears && student?.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(student.dateOfBirth);
        ageYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          ageYears--;
        }
      }
      
      const fullCard: any = {
        ...card,
        status: normalizeStatus((card as any).status),
        studentName: student?.fullName || card.nameOfChild,
        classSection: student?.classSection || card.classSection,
        schoolName: school?.name || card.schoolName || "Unknown School",
        // Ensure age and gender are available
        ageYears: ageYears,
        gender: card.gender || student?.gender,
      };

      try {
        const schemaFields = Object.keys((annualHealthCards as any).columns || {});
        for (const fieldName of schemaFields) {
          if (!(fieldName in fullCard)) {
            fullCard[fieldName] = null;
          }
        }
      } catch (e) {
        // If introspecting schema fails, gracefully continue
        console.warn('Could not enumerate annualHealthCards schema fields:', (e as any)?.message || e);
      }

      res.json({ card: fullCard, student });

      // Export referrals for a given health card (returns explicit referrals from referrals table
      // or derives referral entries from the health card fields when no referrals exist)
      app.get("/api/annual-cards/:id/referrals", authenticateToken, async (req: AuthRequest, res) => {
        try {
          // Lady Superintendent should not have access to health cards at all
          if (req.user?.role === "Lady Superintendent") {
            return res.status(403).json({ message: "Access denied: Lady Superintendent cannot access health cards" });
          }

          const { id } = req.params;
          const card = await storage.getAnnualHealthCard(id);
          if (!card) return res.status(404).json({ message: "Health card not found" });

          const student = await storage.getStudent(card.studentId);

          // First try explicit referrals table
          const { referrals } = await storage.getReferrals({ healthCardId: id, limit: 1000 });
          if (referrals && referrals.length > 0) {
            console.info(`[GET /api/annual-cards/${id}/referrals] Found ${referrals.length} explicit referrals`);
            return res.json({ referrals, student, card });
          }

          console.info(`[GET /api/annual-cards/${id}/referrals] No explicit referrals found — deriving from health card fields`);

          // Derive referrals from health card fields as a fallback
          const derived: any[] = [];
          const pushIf = (cond: boolean, obj: any) => { if (cond) derived.push(obj); };

          // Section A - Defects at birth
          pushIf(!!card.a1_referral_facility || !!card.a1_referral_date || !!card.a1_visible_defect, {
            label: 'A1',
            section: 'A',
            facility: card.a1_referral_facility || null,
            date: card.a1_referral_date || null,
            details: card.a1_visible_defect_notes || null,
          });

          // Section B - SAM / deficiencies
          pushIf(!!card.b1_referral_facility || !!card.b1_referral_date || !!card.b1_severe_thinning, {
            label: 'B1',
            section: 'B',
            facility: card.b1_referral_facility || null,
            date: card.b1_referral_date || null,
            details: null,
          });
          pushIf(!!card.b2_referral_facility || !!card.b2_referral_date || !!card.b2_bilateral_oedema, {
            label: 'B2',
            section: 'B',
            facility: card.b2_referral_facility || null,
            date: card.b2_referral_date || null,
            details: null,
          });
          pushIf(!!card.b3_referral_facility || !!card.b3_referral_date || !!card.b3_severe_anemia, {
            label: 'B3',
            section: 'B',
            facility: card.b3_referral_facility || null,
            date: card.b3_referral_date || null,
            details: null,
          });

          // Section C - Diseases (leprosy / TB)
          pushIf(!!card.c7_referral_facility || !!card.c7_referral_date || !!card.c7_suspected, {
            label: 'C7',
            section: 'C',
            facility: card.c7_referral_facility || null,
            date: card.c7_referral_date || null,
            details: card.c7_skin_characteristics || null,
          });
          pushIf(!!card.c8_referral_facility || !!card.c8_referral_date || !!card.c8_suspected, {
            label: 'C8',
            section: 'C',
            facility: card.c8_referral_facility || null,
            date: card.c8_referral_date || null,
            details: {
              cough_gt14_days: card.c8_cough_gt14_days || null,
              persistent_fever: card.c8_persistent_fever || null,
            },
          });

          // General referral flags (legacy consolidated fields)
          pushIf(!!card.referral_disease_facility_date || !!card.referral_disease_yes, {
            label: 'Disease Referral',
            section: 'General',
            facility: null,
            date: card.referral_disease_facility_date || null,
            details: null,
          });
          pushIf(!!card.referral_leprosy_facility_date || !!card.referral_leprosy_yes, {
            label: 'Leprosy Referral',
            section: 'General',
            facility: null,
            date: card.referral_leprosy_facility_date || null,
            details: null,
          });
          pushIf(!!card.referral_tb_facility_date || !!card.referral_tb_yes, {
            label: 'TB Referral',
            section: 'General',
            facility: null,
            date: card.referral_tb_facility_date || null,
            details: null,
          });

          // If still empty, include a placeholder indicating no referrals
          if (derived.length === 0) {
            return res.json({ referrals: [], student, card });
          }

          // Map derived to a response shape similar to Referral records
          const mapped = derived.map((d, idx) => ({
            id: `derived-${card.id}-${idx}`,
            studentId: card.studentId,
            healthCardId: card.id,
            facility: d.facility,
            date: d.date,
            label: d.label,
            section: d.section,
            details: d.details,
            status: 'Pending',
            createdAt: card.createdAt,
          }));

          res.json({ referrals: mapped, student, card });
        } catch (error: any) {
          console.error('Get card referrals error:', error?.message || String(error));
          res.status(500).json({ message: error?.message || 'Failed to fetch referrals for health card' });
        }
      });
    } catch (error: any) {
      console.error("Get health card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch health card" });
    }
  });

  app.put("/api/annual-cards/:id", authenticateToken, authorizeRoles("Admin", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      const { id: _, createdAt, ...allowedUpdates } = updateData;

      const card = await storage.updateAnnualHealthCard(id, allowedUpdates);

      if (!card) {
        return res.status(404).json({ message: "Health card not found" });
      }

      // Automatic propagation: Invalidate all related queries across all views
      console.info(`[Health Card Updated] Card ${id} updated - triggering automatic propagation`);
      
      // Note: In a real-time system, you would emit WebSocket events here
      // For now, the frontend query invalidation will handle propagation
      
      res.json(card);
    } catch (error: any) {
      console.error("Update health card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update health card" });
    }
  });

  // Allow Class Teachers to re-submit rejected health cards
  app.post("/api/annual-cards/:studentId/resubmit", authenticateToken, authorizeRoles("ClassTeacher", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { studentId } = req.params;
      const healthCardData = req.body;

      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify Class Teacher can only submit for their assigned class
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        if (teacher?.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "You can only submit health cards for students in your school" });
        }
        if (teacher?.classSection && student.classSection !== teacher.classSection) {
          return res.status(403).json({ message: `You can only submit health cards for students in ${teacher.classSection || 'your assigned class section'}` });
        }
      }

      const weight = parseFloat(healthCardData.weightKg) || 0;
      const height = parseFloat(healthCardData.heightCm) || 0;
      const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(2) : null;

      // Calculate age in years
      const birthYear = student.dateOfBirth ? new Date(student.dateOfBirth).getFullYear() : null;
      const ageYears = birthYear ? new Date().getFullYear() - birthYear : null;

      // Create new health card submission (allows re-submission after rejection)
      // Create a new resubmitted health card using full payload builder
      const newCard = await storage.createAnnualHealthCard(buildHealthCardPayload(student, student.schoolId, healthCardData, req.user?.id));

      // Calculate BP values for referral check
      let systolic = healthCardData.sbp ? parseInt(healthCardData.sbp) : null;
      let diastolic = healthCardData.dbp ? parseInt(healthCardData.dbp) : null;

      // If sbp/dbp not available, try to parse from bloodPressure string
      if ((!systolic || !diastolic) && healthCardData.bloodPressure) {
        const bpMatch = healthCardData.bloodPressure.match(/^(\d+)\/(\d+)$/);
        if (bpMatch) {
          systolic = parseInt(bpMatch[1]);
          diastolic = parseInt(bpMatch[2]);
        }
      }

      // Create referrals for critical health conditions using new C7 and C8 logic
      const referralConditions = [];

      // Check C7 Leprosy
      if (isC7ReferralNeeded(healthCardData)) {
        referralConditions.push({
          condition: true,
          type: "disease",
          code: "C7",
          issue: generateC7ReferralIssue(healthCardData),
          facility: healthCardData.c7_referral_facility || "District Hospital"
        });
      }

      // Check C8 Tuberculosis
      if (isC8ReferralNeeded(healthCardData)) {
        referralConditions.push({
          condition: true,
          type: "disease",
          code: "C8",
          issue: generateC8ReferralIssue(healthCardData),
          facility: healthCardData.c8_referral_facility || "District Hospital"
        });
      }

      // Check C9 Sickle Cell Anaemia
      if (isC9ReferralNeeded(healthCardData)) {
        referralConditions.push({
          condition: true,
          type: "disease",
          code: "C9",
          issue: getC9ReferralDescription(healthCardData),
          facility: healthCardData.c9_referral_facility || "Medical College/District Hospital"
        });
      }

      // Check other deficiencies and conditions
      referralConditions.push(
        {
          condition: healthCardData.b3_severe_anemia === true,
          type: "deficiency",
          code: "B3",
          issue: "Severe anemia detected",
          facility: healthCardData.b3_referral_facility || "PHC Center"
        },
        {
          condition: healthCardData.b6_goitre === true,
          type: "deficiency",
          code: "B6",
          issue: "Goitre detected",
          facility: healthCardData.b6_referral_facility || "PHC Center"
        },
        {
          condition: systolic && diastolic && (systolic >= 140 || diastolic >= 90),
          type: "deficiency",
          code: "BP",
          issue: `High blood pressure detected (${systolic}/${diastolic} mmHg)`,
          facility: "PHC Center"
        }
      );

      for (const referralCondition of referralConditions) {
        if (referralCondition.condition) {
          try {
            await storage.createReferral({
              studentId: student.id,
              schoolId: student.schoolId,
              healthCardId: newCard.id,
              referralType: referralCondition.type,
              referralCode: referralCondition.code,
              issue: referralCondition.issue,
              facility: referralCondition.facility,
              referralDate: new Date().toISOString().split('T')[0],
              status: "Pending",
              createdBy: req.user?.id,
            });
          } catch (referralError: any) {
            console.warn(`Failed to create referral for ${referralCondition.issue}:`, referralError?.message || String(referralError));
            // Don't fail the request if referral creation fails
          }
        }
      }

      res.status(201).json(newCard);
    } catch (error: any) {
      console.error("Re-submit health card error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to re-submit health card" });
    }
  });

  app.get("/api/monthly-checkups", authenticateToken, denyAdmin, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const schoolId = req.user?.role === "ClassTeacher" || req.user?.role === "MedicalTeam"
        ? req.user.schoolId
        : req.query.schoolId as string;

      // For ClassTeacher, get their assigned class
      let teacherClassSection: string | undefined;
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      }

      const { checkups, total } = await storage.getMonthlyCheckups({
        schoolId,
        month,
        year,
        page: 1, // Get all pages to filter by class
        limit: 10000, // Get all to filter properly
      });

      const checkupsWithStudentNames = await Promise.all(
        checkups.map(async (checkup) => {
          const student = await storage.getStudent(checkup.studentId);
          return {
            ...checkup,
            studentName: student?.fullName || "Unknown",
            student: student, // Include full student object for filtering
          };
        })
      );

      // Filter by classSection for ClassTeacher
      let filteredCheckups = checkupsWithStudentNames;
      if (req.user?.role === "ClassTeacher" && teacherClassSection) {
        filteredCheckups = checkupsWithStudentNames.filter(checkup =>
          checkup.student?.classSection === teacherClassSection
        );
      }

      // Paginate the filtered results
      const startIndex = (page - 1) * 10;
      const endIndex = startIndex + 10;
      const paginatedCheckups = filteredCheckups.slice(startIndex, endIndex);
      const filteredTotal = filteredCheckups.length;

      // Remove student object from response
      const finalCheckups = paginatedCheckups.map(({ student, ...checkup }) => checkup);

      res.json({
        checkups: finalCheckups,
        totalPages: Math.ceil(filteredTotal / 10),
        totalItems: filteredTotal,
      });
    } catch (error: any) {
      console.error("Get monthly checkups error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch checkups" });
    }
  });

  app.post("/api/monthly-checkups", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const { studentId, checkupDate, heightCm, weightKg, present, symptoms, suggestedMedicines, treatmentType, referredTo, notes } = req.body;

      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const date = new Date(checkupDate);
      const height = parseFloat(heightCm) || 0;
      const weight = parseFloat(weightKg) || 0;
      const bmi = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(2) : null;

      const checkup = await storage.createMonthlyCheckup({
        studentId,
        schoolId: student.schoolId,
        checkupDate,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        heightCm: heightCm || null,
        weightKg: weightKg || null,
        bmi: bmi || null,
        present,
        symptoms: symptoms || [],
        suggestedMedicines: suggestedMedicines || [],
        treatmentType: treatmentType || "Primary",
        referredTo: referredTo || null,
        notes: notes || null,
        recordedBy: req.user?.id,
      });

      res.status(201).json(checkup);
    } catch (error: any) {
      console.error("Create checkup error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to create checkup" });
    }
  });

  // Medical Teams API Routes
  app.get("/api/medical-teams", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await storage.getMedicalTeams(page, limit);
      res.json(result);
    } catch (error: any) {
      console.error("Get medical teams error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch medical teams" });
    }
  });

  app.post("/api/medical-teams", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const teamData = insertMedicalTeamSchema.parse(req.body);
      const team = await storage.createMedicalTeam(teamData);
      res.status(201).json(team);
    } catch (error: any) {
      console.error("Create medical team error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to create medical team" });
    }
  });

  app.get("/api/medical-teams/:id", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const team = await storage.getMedicalTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Medical team not found" });
      }
      res.json(team);
    } catch (error: any) {
      console.error("Get medical team error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch medical team" });
    }
  });

  app.put("/api/medical-teams/:id", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const teamData = insertMedicalTeamSchema.partial().parse(req.body);
      const team = await storage.updateMedicalTeam(req.params.id, teamData);
      if (!team) {
        return res.status(404).json({ message: "Medical team not found" });
      }
      res.json(team);
    } catch (error: any) {
      console.error("Update medical team error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to update medical team" });
    }
  });

  // Medical Team Members API Routes
  app.get("/api/medical-teams/:teamId/members", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const members = await storage.getMedicalTeamMembers(req.params.teamId);
      res.json(members);
    } catch (error: any) {
      console.error("Get medical team members error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch medical team members" });
    }
  });

  app.post("/api/medical-teams/:teamId/members", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const memberData = insertMedicalTeamMemberSchema.parse({ ...req.body, teamId: req.params.teamId });
      const member = await storage.createMedicalTeamMember(memberData);
      res.status(201).json(member);
    } catch (error: any) {
      console.error("Create medical team member error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to create medical team member" });
    }
  });

  app.put("/api/medical-team-members/:id", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const memberData = insertMedicalTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateMedicalTeamMember(req.params.id, memberData);
      if (!member) {
        return res.status(404).json({ message: "Medical team member not found" });
      }
      res.json(member);
    } catch (error: any) {
      console.error("Update medical team member error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to update medical team member" });
    }
  });

  app.delete("/api/medical-team-members/:id", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      await storage.deleteMedicalTeamMember(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete medical team member error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to delete medical team member" });
    }
  });

  // Medical Events API Routes
  app.get("/api/medical-events", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const teamId = req.query.teamId as string;
      
      const result = await storage.getMedicalEvents({ teamId, page, limit });
      res.json(result);
    } catch (error: any) {
      console.error("Get medical events error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch medical events" });
    }
  });

  app.post("/api/medical-events", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const eventData = insertMedicalEventSchema.parse({ ...req.body, createdBy: req.user?.id });
      
      // Create the event
      const event = await storage.createMedicalEvent(eventData);
      
      // Automatically create student checkup records for students based on user role
      const userContext = req.user?.role === "ClassTeacher" ? {
        role: req.user.role,
        schoolId: req.user.schoolId,
        classSection: req.user.classSection
      } : undefined;
      
      const { createdCount } = await storage.createStudentCheckupsForEvent(event.id, eventData.teamId, userContext);
      
      res.status(201).json({ event, createdCount });
    } catch (error: any) {
      console.error("Create medical event error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to create medical event" });
    }
  });

  app.get("/api/medical-events/:id", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const event = await storage.getMedicalEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Medical event not found" });
      }
      res.json(event);
    } catch (error: any) {
      console.error("Get medical event error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch medical event" });
    }
  });

  app.post("/api/medical-events/:id/generate-checkups", authenticateToken, authorizeRoles("Admin", "MedicalTeam"), async (req: AuthRequest, res) => {
    try {
      const event = await storage.getMedicalEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Medical event not found" });
      }
      
      const userContext = req.user?.role === "ClassTeacher" ? {
        role: req.user.role,
        schoolId: req.user.schoolId,
        classSection: req.user.classSection
      } : undefined;
      
      const { createdCount } = await storage.createStudentCheckupsForEvent(event.id, event.teamId, userContext);
      res.json({ createdCount });
    } catch (error: any) {
      console.error("Generate checkups error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to generate checkups" });
    }
  });

  // Student Checkups API Routes
  app.get("/api/medical-events/:eventId/checkups", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      const result = await storage.getStudentCheckups({ 
        eventId: req.params.eventId, 
        status, 
        month,
        year,
        page, 
        limit 
      });
      
      // Join with student data for display
      let checkupsWithStudents = await Promise.all(
        result.checkups.map(async (checkup) => {
          const student = await storage.getStudent(checkup.studentId);
          return { ...checkup, student };
        })
      );
      
      // For ClassTeacher, filter to only show students from their assigned class and school
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        if (teacher?.schoolId && teacher?.classSection) {
          checkupsWithStudents = checkupsWithStudents.filter(checkup => 
            checkup.student?.schoolId === teacher.schoolId && 
            checkup.student?.classSection === teacher.classSection
          );
        }
      }
      
      res.json({ 
        checkups: checkupsWithStudents, 
        total: checkupsWithStudents.length,
        month,
        year,
        isCurrentMonth: month === new Date().getMonth() + 1 && year === new Date().getFullYear()
      });
    } catch (error: any) {
      console.error("Get event checkups error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch event checkups" });
    }
  });

  // Create new monthly checkup for a student
  app.post("/api/medical-events/:eventId/checkups", authenticateToken, authorizeRoles("Admin", "MedicalTeam", "ClassTeacher"), async (req: AuthRequest, res) => {
    try {
      const { studentId, month, year } = req.body;
      const eventId = req.params.eventId;
      
      // Validate required fields
      if (!studentId || !month || !year) {
        return res.status(400).json({ message: "Student ID, month, and year are required" });
      }
      
      // Validate month and year ranges
      if (month < 1 || month > 12) {
        return res.status(400).json({ message: "Month must be between 1 and 12" });
      }
      
      if (year < 2020 || year > new Date().getFullYear() + 10) {
        return res.status(400).json({ message: `Year must be between 2020 and ${new Date().getFullYear() + 10}` });
      }
      
      // For ClassTeacher, ensure they can only create checkups for students in their assigned class
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        const student = await storage.getStudent(studentId);
        
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        if (teacher?.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "You can only create checkups for students in your school" });
        }
        
        if (teacher?.classSection && student.classSection !== teacher.classSection) {
          return res.status(403).json({ message: "You can only create checkups for students in your assigned class" });
        }
      }
      
      // Check if checkup already exists for this student/event/month/year
      const existingCheckup = await storage.getStudentCheckupByMonthYear(studentId, eventId, month, year);
      if (existingCheckup) {
        return res.status(409).json({ 
          message: `A checkup already exists for this student in ${getMonthName(month)} ${year}`,
          existingCheckup,
          canEdit: existingCheckup.status !== "Completed"
        });
      }
      
      // Get event and team info
      const event = await storage.getMedicalEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Medical event not found" });
      }
      
      // Create new checkup
      const checkupData = {
        studentId,
        eventId,
        teamId: event.teamId,
        checkupMonth: month,
        checkupYear: year,
        status: "Not started" as const,
        present: true,
        ...req.body
      };
      
      const checkup = await storage.createStudentCheckup(checkupData);
      res.status(201).json(checkup);
      
    } catch (error: any) {
      console.error("Create monthly checkup error:", error?.message || String(error));
      
      // Handle unique constraint violation
      if (error?.code === '23505' && error?.constraint === 'unique_student_event_month_year') {
        return res.status(409).json({ 
          message: "A checkup already exists for this student in the selected month and year" 
        });
      }
      
      res.status(500).json({ message: error?.message || "Failed to create monthly checkup" });
    }
  });

  // Helper function to get month name
  function getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  // Update student checkup
  app.put("/api/student-checkups/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const checkupData = insertStudentCheckupSchema.partial().parse(req.body);
      
      // Get the existing checkup to check if it's completed
      const existingCheckup = await storage.getStudentCheckup(req.params.id);
      if (!existingCheckup) {
        return res.status(404).json({ message: "Student checkup not found" });
      }
      
      // For ClassTeacher, ensure they can only update checkups for students in their assigned class and school
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        const student = await storage.getStudent(existingCheckup.studentId);
        
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        // Check if student is in teacher's school and class
        if (teacher?.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "You can only update checkups for students in your school" });
        }
        
        if (teacher?.classSection && student.classSection !== teacher.classSection) {
          return res.status(403).json({ message: "You can only update checkups for students in your assigned class" });
        }
        
        // CRITICAL: Check if checkup is already completed - if so, make it non-editable
        if (existingCheckup.status === "Completed") {
          return res.status(403).json({ 
            message: "This checkup has been completed and is now read-only. Only Medical Teams can modify completed checkups.",
            isCompleted: true 
          });
        }
      }
      
      // Calculate BMI if height and weight are provided
      let bmi = existingCheckup.bmi;
      if (checkupData.heightCm && checkupData.weightKg) {
        const heightM = checkupData.heightCm / 100;
        bmi = (checkupData.weightKg / (heightM * heightM)).toFixed(2);
      }
      
      // Add BMI to update data
      const updateData = { ...checkupData };
      if (bmi) {
        updateData.bmi = bmi;
      }
      
      const checkup = await storage.updateStudentCheckup(req.params.id, updateData);
      if (!checkup) {
        return res.status(404).json({ message: "Student checkup not found" });
      }
      res.json(checkup);
    } catch (error: any) {
      console.error("Update student checkup error:", error?.message || String(error));
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: error?.message || "Failed to update student checkup" });
    }
  });

  app.get("/api/meals", authenticateToken, denyAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split("T")[0];
      // Determine requested schoolId safely: prefer user's assigned school, otherwise use query
      let schoolId = req.user?.schoolId || req.query.schoolId as string | undefined;

      // If PO requests a specific school, ensure it's within their allowed scope (district or assigned school)
      if (req.user?.role === "PO" && req.query.schoolId) {
        const user = await storage.getUser(req.user.id);
        const requestedSchool = await storage.getSchool(req.query.schoolId as string);
        if (!requestedSchool) return res.status(404).json({ message: "School not found" });

        if (user?.district) {
          if (!sameDistrict(requestedSchool.district, user.district)) {
            return res.status(403).json({ message: "You can only access schools in your district" });
          }
        } else if (user?.schoolId) {
          if (requestedSchool.id !== user.schoolId) {
            return res.status(403).json({ message: "You can only access your assigned school" });
          }
        } else {
          // PO has no district and no assigned school - deny access
          return res.status(403).json({ message: "You can only access schools in your district" });
        }

        // allow requested school if checks pass
        schoolId = req.query.schoolId as string;
      }

      // For ClassTeacher, get their assigned class
      let teacherClassSection: string | undefined;
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      }

      let meals: any[] = [];

      // If PO and no specific school requested, restrict to PO's district schools
      if (req.user?.role === "PO" && !req.query.schoolId) {
        const user = await storage.getUser(req.user.id);
        const { schools: allSchools } = await storage.getSchools(1, 1000);
        const allowedSchoolIds = allSchools.filter(s => (user?.district ? sameDistrict(s.district, user.district) : (user?.schoolId ? s.id === user.schoolId : false))).map(s => s.id);
        meals = await storage.getMealLogs({ schoolIds: allowedSchoolIds, date });
      } else {
        meals = await storage.getMealLogs({ schoolId, date });
      }

      // Filter by classSection for ClassTeacher (include meals with a recorded classSection even when studentId is null)
      let filteredMeals = meals;
      if (req.user?.role === "ClassTeacher" && teacherClassSection) {
        const mealsWithStudents = await Promise.all(
          meals.map(async (meal) => {
            const student = meal.studentId ? await storage.getStudent(meal.studentId as string) : null;
            return { ...meal, student };
          })
        );
        filteredMeals = mealsWithStudents
          .filter(meal => meal.student?.classSection === teacherClassSection)
          .map(({ student, ...meal }) => meal);
      }

      res.json({ meals: filteredMeals });
    } catch (error: any) {
      console.error("Get meals error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch meals" });
    }
  });

  app.get("/api/meals/compliance", authenticateToken, denyAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Determine requested schoolId safely: prefer user's assigned school, otherwise use query
      let schoolId = req.user?.schoolId || req.query.schoolId as string | undefined;

      // If PO requests a specific school, ensure it's within their allowed scope (district or assigned school)
      if (req.user?.role === "PO" && req.query.schoolId) {
        const user = await storage.getUser(req.user.id);
        const requestedSchool = await storage.getSchool(req.query.schoolId as string);
        if (!requestedSchool) return res.status(404).json({ message: "School not found" });

        if (user?.district) {
          if (!sameDistrict(requestedSchool.district, user.district)) {
            return res.status(403).json({ message: "You can only access schools in your district" });
          }
        } else if (user?.schoolId) {
          if (requestedSchool.id !== user.schoolId) {
            return res.status(403).json({ message: "You can only access your assigned school" });
          }
        } else {
          // PO has no district and no assigned school - deny access
          return res.status(403).json({ message: "You can only access schools in your district" });
        }

        schoolId = req.query.schoolId as string;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // For ClassTeacher, get their assigned class
      let teacherClassSection: string | undefined;
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      }

      // Get all meals for current month
      const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
      const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

      const allMeals: any[] = [];
      for (let day = 1; day <= new Date(currentYear, currentMonth, 0).getDate(); day++) {
        const dateStr = new Date(currentYear, currentMonth - 1, day).toISOString().split("T")[0];
        let dayMeals: any[] = [];
        if (req.user?.role === "PO" && !req.query.schoolId) {
          const user = await storage.getUser(req.user.id);
          const { schools: allSchools } = await storage.getSchools(1, 1000);
          const allowedSchoolIds = allSchools.filter(s => (user?.district ? s.district === user.district : (user?.schoolId ? s.id === user.schoolId : false))).map(s => s.id);
          dayMeals = await storage.getMealLogs({ schoolIds: allowedSchoolIds, date: dateStr });
        } else {
          dayMeals = await storage.getMealLogs({ schoolId, date: dateStr });
        }
        allMeals.push(...dayMeals);
      }

      // Filter by classSection for ClassTeacher (include meals that have classSection set even without studentId)
      let filteredMeals = allMeals;
      if (req.user?.role === "ClassTeacher" && teacherClassSection) {
        const mealsWithStudents = await Promise.all(
          allMeals.map(async (meal) => {
            const student = meal.studentId ? await storage.getStudent(meal.studentId as string) : null;
            return { ...meal, student };
          })
        );
        filteredMeals = mealsWithStudents
          .filter(meal => meal.student?.classSection === teacherClassSection)
          .map(({ student, ...meal }) => meal);
      }

      const uniqueDates = new Set(filteredMeals.map(m => m.date)).size;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const daysLogged = uniqueDates;
      const daysMissed = daysInMonth - daysLogged;
      const totalMeals = filteredMeals.length;
      const overallCompliance = daysInMonth > 0 ? Math.round((daysLogged / daysInMonth) * 100) : 0;

      res.json({
        overallCompliance,
        daysLogged,
        daysMissed,
        totalMeals,
      });
    } catch (error: any) {
      console.error("Get meal compliance error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch meal compliance" });
    }
  });

  app.post("/api/meals", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const { date: dateFromBody, mealType, menuItems, imageUrl, latitude, longitude, notes, studentId } = req.body;
      const date = dateFromBody || new Date().toISOString().split("T")[0];
      // Reject future dates
      const today = new Date().toISOString().split("T")[0];
      if (date > today) return res.status(400).json({ message: "Meal date cannot be in the future" });

      // Require location and image for auditability
      if (!latitude || !longitude) return res.status(400).json({ message: "Location (latitude/longitude) is required" });
      if (!imageUrl) return res.status(400).json({ message: "Meal photo is required" });
      const schoolId = req.user?.schoolId || req.body.schoolId;

      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }

      // Normalize mealType to match DB enum and be case-insensitive for clients
      const normalizedMealType = String(mealType || '').toLowerCase();
      const allowedMeals = ['breakfast', 'lunch', 'dinner'] as const;
      // Validate input to avoid inserting an invalid enum value
      if (!allowedMeals.includes(normalizedMealType as typeof allowedMeals[number])) {
        return res.status(400).json({ message: "Invalid mealType. Supported values: breakfast, lunch, dinner" });
      }
      const mealTypeValue = normalizedMealType as typeof allowedMeals[number];

      const meal = await storage.createMealLog({
        schoolId,
        date,
        mealType: mealTypeValue,
        menuItems: menuItems || [],
        imageUrl: imageUrl || null,
        latitude: latitude || null,
        longitude: longitude || null,
        notes: notes || null,
        uploadedBy: req.user?.id,
        studentId: studentId || null,
      });

      console.log('Meal created:', { id: meal.id, schoolId: meal.schoolId, studentId: meal.studentId });

      res.status(201).json(meal);
    } catch (error: any) {
      console.error("Create meal error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to log meal" });
    }
  });

  // Update a meal entry
  app.put("/api/meals/:id", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const mealId = req.params.id;
      const { date: dateFromBody, mealType, menuItems, imageUrl, latitude, longitude, notes, studentId, classSection } = req.body;

      const existing = await storage.getMealLog(mealId);
      if (!existing) return res.status(404).json({ message: "Meal not found" });

      // Authorization checks
      const role = req.user?.role;
      if (role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user!.id);
        // CT may manage meals only for their school (class-specific restrictions removed)
        if (!teacher) return res.status(403).json({ message: "Insufficient permissions to update this meal" });
        if (teacher.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to update this meal" });
      } else if (role === "Headmaster") {
        if (req.user?.schoolId && req.user.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to update this meal" });
      } else if (role === "MealSuperintendent") {
        // Meal Superintendents can only manage meals for their assigned school
        if (req.user?.schoolId && req.user.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to update this meal" });
      }

      // Normalize mealType if provided
      let normalizedMealType: any = undefined;
      if (mealType !== undefined) {
        normalizedMealType = String(mealType || '').toLowerCase();
        const allowedMeals = ['breakfast', 'lunch', 'dinner'] as const;
        if (!allowedMeals.includes(normalizedMealType as any)) {
          return res.status(400).json({ message: "Invalid mealType. Supported values: breakfast, lunch, dinner" });
        }
      }

      // If update would remove image or location, block it (require image+location to exist)
      const newImage = (imageUrl === undefined) ? existing.imageUrl : imageUrl;
      const newLat = (latitude === undefined) ? existing.latitude : latitude;
      const newLng = (longitude === undefined) ? existing.longitude : longitude;
      if (!newImage || !newLat || !newLng) return res.status(400).json({ message: "Meal record must have photo and location" });

      const updated = await storage.updateMealLog(mealId, {
        date: dateFromBody || existing.date,
        mealType: normalizedMealType || existing.mealType,
        menuItems: menuItems ?? existing.menuItems,
        imageUrl: newImage,
        latitude: newLat,
        longitude: newLng,
        notes: notes ?? existing.notes,
        studentId: studentId ?? existing.studentId,
      });

      if (!updated) return res.status(500).json({ message: "Failed to update meal" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update meal error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update meal" });
    }
  });

  // Delete a meal entry
  app.delete("/api/meals/:id", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const mealId = req.params.id;
      const existing = await storage.getMealLog(mealId);
      if (!existing) return res.status(404).json({ message: "Meal not found" });

      const role = req.user?.role;
      if (role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user!.id);
        if (!teacher) return res.status(403).json({ message: "Insufficient permissions to delete this meal" });
        // ClassTeachers can manage meals only for their school now (class-specific checks removed)
        if (teacher.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to delete this meal" });
      } else if (role === "Headmaster") {
        if (req.user?.schoolId && req.user.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to delete this meal" });
      } else if (role === "MealSuperintendent") {
        if (req.user?.schoolId && req.user.schoolId !== existing.schoolId) return res.status(403).json({ message: "Insufficient permissions to delete this meal" });
      }

      await storage.deleteMealLog(mealId);
      res.json({ message: "Meal deleted" });
    } catch (error: any) {
      console.error("Delete meal error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to delete meal" });
    }
  });

  // Update referral status (ClassTeacher can update referrals for their class; HM/PO/Admin can update for their school)
  app.patch("/api/referrals/:id", authenticateToken, authorizeRoles("ClassTeacher", "Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const referralId = req.params.id;
      const { status, completionDate, notes } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const existing = await storage.getReferral(referralId);
      if (!existing) {
        return res.status(404).json({ message: "Referral not found" });
      }

      // Authorization: ClassTeacher can only update referrals for their class
      if (req.user?.role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user.id);
        const student = existing.studentId ? await storage.getStudent(existing.studentId) : null;
        if (!student) {
          return res.status(404).json({ message: "Associated student not found" });
        }
        if (teacher?.schoolId !== student.schoolId || teacher?.classSection !== student.classSection) {
          return res.status(403).json({ message: "Insufficient permissions to update this referral" });
        }
      }

      // If marking as Completed and no completionDate provided, set to today
      let completion = completionDate || null;
      if (status === "Completed" && !completion) {
        completion = new Date().toISOString().split("T")[0];
      }

      const updated = await storage.updateReferral(referralId, {
        status,
        completionDate: completion,
        notes: notes ?? existing.notes,
        updatedBy: req.user?.id,
      });

      // Invalidate or notify other systems (optionally create notifications)

      res.json(updated);
    } catch (error: any) {
      console.error("Update referral error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update referral" });
    }
  });

  // List referrals with optional filters and CSV export
  app.get("/api/referrals", authenticateToken, authorizeRoles("ClassTeacher", "Headmaster", "PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const studentId = req.query.studentId as string | undefined;
      const schoolId = req.query.schoolId as string | undefined;
      const status = req.query.status as string | undefined;
      const referralType = req.query.referralType as string | undefined;
      const page = parseInt(req.query.page as string || '1', 10) || 1;
      const limit = parseInt(req.query.limit as string || '20', 10) || 20;
      const source = req.query.source as string | undefined;
      const exportFmt = req.query.export as string | undefined;
      const facility = req.query.facility as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const params: any = { page, limit };
      if (studentId) params.studentId = studentId;
      if (schoolId) params.schoolId = schoolId;
      if (status && status !== 'all') params.status = status;
      if (referralType) params.referralType = referralType;

      // If caller requested menstrual-source referrals, menstrual tables are deprecated
      let menstrualLinkedReferralIds: string[] | null = null;
      if (source === 'menstrual') {
        menstrualLinkedReferralIds = [];
      }

      // fetch via storage
      const { referrals: raw, total } = await storage.getReferrals(params as any);

      // apply facility and date range filters client-side if provided
      let filtered = raw;

      // If menstrual source requested, further restrict to referrals that are either:
      // - linked via menstrual_record_referrals mapping, OR
      // - have textual indicators (issue mentions 'menstrual' / referralCode starts with 'm-')
      if (source === 'menstrual') {
        const idSet = new Set<string>((menstrualLinkedReferralIds || []));
        filtered = filtered.filter((r:any) => {
          const issue = String(r.issue || '').toLowerCase();
          const code = String(r.referralCode || r.referral_code || '').toLowerCase();
          const type = String(r.referralType || r.referral_type || '').toLowerCase();
          return idSet.has(r.id) || issue.includes('menstrual') || code.startsWith('m-') || type === 'adolescent';
        });
      }
      if (facility) filtered = filtered.filter((r:any) => (r.facility || '').toLowerCase().includes(facility.toLowerCase()));
      if (from) {
        const fromD = new Date(from);
        filtered = filtered.filter((r:any) => new Date(r.referralDate || r.referral_date || r.createdAt) >= fromD);
      }
      if (to) {
        const toD = new Date(to);
        filtered = filtered.filter((r:any) => new Date(r.referralDate || r.referral_date || r.createdAt) <= toD);
      }

      if (exportFmt === 'csv') {
        // generate CSV with basic columns
        const header = ['id','studentId','studentName','schoolId','schoolName','classSection','issue','facility','referralDate','status','createdBy','notes'];
        const rows = filtered.map((r:any) => header.map(h => {
          const v = r[h] ?? r[h.replace(/([A-Z])/g,'_$1').toLowerCase()];
          return typeof v === 'string' ? v.replace(/"/g,'""') : (v ?? '');
        }));
        const csv = [header.join(','), ...rows.map(row => row.map(c => `"${String(c)}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="referrals-${new Date().toISOString().slice(0,10)}.csv"`);
        return res.send(csv);
      }

      // Return the filtered total so the client-side "Total" reflects
      // the number of referrals after applying facility/date/source filters.
      const filteredTotal = filtered.length;
      res.json({ referrals: filtered, total: filteredTotal });
    } catch (error: any) {
      console.error('List referrals error:', error?.message || String(error));
      res.status(500).json({ message: error?.message || 'Failed to list referrals' });
    }
  });



  app.get("/api/hostel/attendance", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "PO", "HostelWarden", "Lady Superintendent", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split("T")[0];
      const requestedSchool = req.query.schoolId as string;
      const role = req.user?.role;

      // Determine PO's district (if PO) to restrict access
      let poDistrict: string | undefined;
      let poSchoolId: string | undefined;
      let poUser: any = null;
      if (role === "PO") {
        poUser = await storage.getUser(req.user!.id);
        poDistrict = poUser?.district ?? undefined;
        poSchoolId = poUser?.schoolId ?? undefined;
      }

      // Determine which school(s) data to return based on role
      let schoolId: string | undefined;
      let teacherClassSection: string | undefined;
      let genderFilter: string | undefined; // For LS/MS gender-based filtering
      
      if (role === "ClassTeacher") {
        schoolId = req.user?.schoolId; // CT sees only their school
        // Get ClassTeacher's assigned class
        const teacher = await storage.getUser(req.user!.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      } else if (role === "Headmaster" || role === "HostelWarden") {
        schoolId = req.user?.schoolId; // HM and Warden see only their school (warden sees all students, not filtered by class)
      } else if (role === "Lady Superintendent") {
        schoolId = req.user?.schoolId; // LS sees only their school
        genderFilter = "F"; // LS can only see female students
        if (!schoolId) {
          return res.status(400).json({ message: "Lady Superintendent is not assigned to a school" });
        }
      } else if (role === "MealSuperintendent") {
        schoolId = req.user?.schoolId; // MS sees only their school
        genderFilter = "M"; // MS can only see male students
        if (!schoolId) {
          return res.status(400).json({ message: "Meal Superintendent is not assigned to a school" });
        }
      } else if (role === "PO" || role === "Admin") {
        schoolId = requestedSchool; // PO can filter by school or see aggregated

        // If PO requested a specific school, ensure it belongs to their district or is their assigned school
        if (role === "PO" && requestedSchool) {
          const s = await storage.getSchool(requestedSchool);
          if (!s) return res.status(404).json({ message: "School not found" });
          if (poDistrict && !sameDistrict(s.district, poDistrict)) {
            return res.status(403).json({ message: "You can only access hostel attendance for schools in your district" });
          }
          if (!poDistrict && poSchoolId && s.id !== poSchoolId) {
            return res.status(403).json({ message: "You can only access hostel attendance for your assigned school" });
          }
        }
      }

      // Fetch students for this school. Special-case PO aggregate requests (no specific school requested)
      // so they only see students from their district (or assigned school when no district).
      let baseStudents: any[] = [];

      if (role === "PO" && !requestedSchool) {
        // PO aggregate view: determine allowed schools
        let allowedSchoolIds: string[] = [];
        if (poDistrict) {
          const { schools: allSchools } = await storage.getSchools(1, 1000);
          allowedSchoolIds = (allSchools || []).filter(s => sameDistrict(s.district, poDistrict)).map(s => s.id);
        } else if (poSchoolId) {
          allowedSchoolIds = [poSchoolId];
        } else {
          // PO has neither district nor assigned school — no students should be visible
          allowedSchoolIds = [];
        }

        if (allowedSchoolIds.length === 0) {
          baseStudents = [];
        } else {
          const { students: allStudents } = await storage.getStudents({ limit: 1000 });
          baseStudents = (allStudents || []).filter(s => allowedSchoolIds.includes(s.schoolId));
        }
      } else {
        const { students: schoolStudents } = await storage.getStudents({ schoolId, limit: 1000 });
        baseStudents = schoolStudents;

        // If no students found for the requested school, fall back to all students while respecting PO scoping
        if (!schoolStudents || schoolStudents.length === 0) {
          const { students: allStudentsFallback } = await storage.getStudents({ limit: 1000 });
          if (role === "PO") {
            if (poDistrict) {
              // Restrict fallback students to those whose school is in the PO's district
              const { schools: allSchools } = await storage.getSchools(1, 1000);
              const allowedSchoolIds = (allSchools || []).filter(s => sameDistrict(s.district, poDistrict)).map(s => s.id);
              baseStudents = allStudentsFallback.filter(s => allowedSchoolIds.includes(s.schoolId));
            } else if (poSchoolId) {
              baseStudents = allStudentsFallback.filter(s => s.schoolId === poSchoolId);
            } else {
              baseStudents = [];
            }
          } else {
            baseStudents = allStudentsFallback;
          }
        }
      }

      // Apply gender filtering for LS and MS roles
      if (genderFilter) {
        baseStudents = baseStudents.filter(s => s.gender === genderFilter);
      }

      // For ClassTeacher, filter students by their assigned class
      console.info(`Hostel attendance request: role=${role} requestedSchool=${requestedSchool ?? 'none'} poDistrict=${poDistrict ?? 'none'} poSchoolId=${poSchoolId ?? 'none'} genderFilter=${genderFilter ?? 'none'} baseStudents=${baseStudents.length}`);
      const students = role === "ClassTeacher" && teacherClassSection
        ? baseStudents.filter(s => s.classSection === teacherClassSection)
        : baseStudents;

      let attendance = await storage.getHostelAttendance({ schoolId, date });
      console.info(`Hostel attendance fetched ${attendance.length} records for schoolId=${schoolId ?? 'none'} date=${date}`);

      // Filter attendance records to only students we will display (safety for PO aggregated view)
      const allowedStudentIds = new Set(students.map(s => s.id));
      const filteredAttendance = attendance.filter(a => allowedStudentIds.has(a.studentId));
      console.info(`Hostel attendance filtered from ${attendance.length} to ${filteredAttendance.length} records by allowed students`);
      attendance = filteredAttendance;

      // Group attendance by student - allow multiple records per student per day
      // Implement fallback mechanism: HostelWarden records take priority over ClassTeacher
      const attendanceByStudent = new Map<string, any[]>();
      attendance.forEach(a => {
        if (!attendanceByStudent.has(a.studentId)) {
          attendanceByStudent.set(a.studentId, []);
        }
        attendanceByStudent.get(a.studentId)!.push(a);
      });

      const studentsWithAttendance = students.map(student => {
        const studentAttendance = attendanceByStudent.get(student.id) || [];

        // Fallback mechanism: prioritize HostelWarden records over ClassTeacher
        // 1. If HostelWarden has recorded attendance, use that
        // 2. Otherwise, fallback to ClassTeacher attendance
        const wardenRecords = studentAttendance.filter(a => a.recorderRole === "HostelWarden");
        const teacherRecords = studentAttendance.filter(a => a.recorderRole === "ClassTeacher");

        // Use warden records if available, otherwise use teacher records
        const prioritizedRecords = wardenRecords.length > 0 ? wardenRecords :
                                  teacherRecords.length > 0 ? teacherRecords : studentAttendance;

        // Get the most recent check-in from prioritized records
        const latestCheckIn = prioritizedRecords
          .filter(a => a.checkInTime)
          .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())[0];

        // Determine the data source for display
        const dataSource = latestCheckIn?.recorderRole || (prioritizedRecords[0]?.recorderRole) || null;

        return {
          ...student,
          studentId: student.id, // Preserve student ID explicitly
          ...(latestCheckIn || {}),
          allAttendance: studentAttendance, // Include all attendance records for the day
          dataSource, // Indicates whether data is from warden or teacher
          hasWardenRecord: wardenRecords.length > 0,
          hasTeacherRecord: teacherRecords.length > 0,
        };
      });

      // Count unique students with check-ins
      const studentsWithCheckIn = new Set(attendance.filter(a => a.checkInTime).map(a => a.studentId));
      const studentsWithCheckOut = new Set(attendance.filter(a => a.checkOutTime).map(a => a.studentId));
      const studentsOnVacation = new Set(attendance.filter(a => a.isVacation).map(a => a.studentId));

      const summary = {
        total: students.length,
        present: studentsWithCheckIn.size,
        checkedOut: studentsWithCheckOut.size,
        vacation: studentsOnVacation.size,
      };

      res.json({ students: studentsWithAttendance, summary });
    } catch (error: any) {
      console.error("Get attendance error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch attendance" });
    }
  });

  // Image upload endpoint for check-in (stores in Supabase if available, else falls back to local uploads)
  app.post("/api/upload/checkin-image", upload.single("image"), async (req: any, res) => {
    try {
      // Check auth header manually for file upload (after multer processes)
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: "Invalid authentication" });
      }

      const user = await storage.getUser(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Try uploading to Supabase storage
      const localPath = req.file.path;
      let publicUrl: string | null = null;
      try {
        publicUrl = await uploadFileToSupabase(localPath, "checkins");
        if (!publicUrl) throw new Error('Supabase upload did not return a public URL');
      } catch (err: any) {
        // Cleanup local file before returning
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) { console.warn('Failed to delete temp upload file:', e); }
        console.error("Supabase upload failed:", err?.message || err);
        return res.status(500).json({ message: "Supabase upload failed. Ensure SUPABASE_UPLOAD_BUCKET exists and SUPABASE_SERVICE_ROLE_KEY has correct storage permissions.", details: err?.message || String(err) });
      }

      // Remove local file after successful upload
      try {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch (e) {
        console.warn("Failed to delete temp upload file:", e);
      }

      // Return public URL from Supabase
      res.json({ imageUrl: publicUrl });
    } catch (error: any) {
      console.error("Upload error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to upload image" });
    }
  });

  // General image upload endpoint used by client (meals and others). Fallback to local storage if Supabase fails.
  app.post("/api/upload/image", upload.single("image"), async (req: any, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: "Invalid authentication" });
      }

      const user = await storage.getUser(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const localPath = req.file.path;
      let publicUrl: string | null = null;
      
      // Try Supabase first, fallback to local storage
      try {
        if (supabaseUrl && supabaseServiceKey) {
          publicUrl = await uploadFileToSupabase(localPath, "meals");
          if (!publicUrl) throw new Error('Supabase upload did not return a public URL');
        } else {
          throw new Error('Supabase not configured');
        }
      } catch (err: any) {
        console.warn("Supabase upload failed, using local storage:", err?.message || err);
        
        // Fallback to local storage - move file to uploads directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const fileName = `meal-${Date.now()}-${path.basename(req.file.originalname)}`;
        const finalPath = path.join(uploadsDir, fileName);
        
        try {
          fs.copyFileSync(localPath, finalPath);
          publicUrl = `/uploads/${fileName}`;
          console.log(`Image saved locally: ${publicUrl}`);
        } catch (localErr: any) {
          console.error("Local storage fallback failed:", localErr?.message || localErr);
          // Cleanup local file before returning
          try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) { console.warn('Failed to delete temp upload file:', e); }
          return res.status(500).json({ message: "Both Supabase and local storage failed", details: localErr?.message || String(localErr) });
        }
      }

      // Cleanup temp file after success
      try {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch (e) {
        console.warn("Failed to delete temp upload file:", e);
      }

      // Return public URL (either from Supabase or local)
      res.json({ imageUrl: publicUrl });
    } catch (error: any) {
      console.error("Upload error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to upload image" });
    }
  });

  app.post("/api/hostel/checkin", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "HostelWarden", "Lady Superintendent", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const { studentId, date, checkInTime, checkInImageUrl, checkInReason } = req.body;
      const student = await storage.getStudent(studentId);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Gender-based access control for LS and MS
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "F") {
          return res.status(403).json({ message: "Lady Superintendent can only manage female students" });
        }
      }

      if (req.user?.role === "MealSuperintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "M") {
          return res.status(403).json({ message: "Meal Superintendent can only manage male students" });
        }
      }

      // Get existing attendance records for this student/date to determine event index
      const existingAttendance = await storage.getHostelAttendance({ studentId, date });
      const maxEventIndex = existingAttendance.length > 0
        ? Math.max(...existingAttendance.map(a => (a as any).eventIndex || 0))
        : -1;

      // Next check-in should have eventIndex = maxEventIndex + 2 (must be even: 0, 2, 4...)
      // Check if last event was a checkout (odd index) or if this is first check-in
      const nextEventIndex = maxEventIndex % 2 === 0 ? maxEventIndex + 2 : maxEventIndex + 1;

      // Validate: can't check in if last event was a check-in without checkout
      if (maxEventIndex >= 0 && maxEventIndex % 2 === 0) {
        const lastRecord = existingAttendance.find(a => (a as any).eventIndex === maxEventIndex);
        if (lastRecord && lastRecord.checkInTime && !lastRecord.checkOutTime) {
          return res.status(400).json({ message: "Cannot check in: student must check out first" });
        }
      }

      const attendance = await storage.createHostelAttendance({
        studentId,
        schoolId: student.schoolId,
        date,
        eventIndex: nextEventIndex,
        checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
        checkInImageUrl: checkInImageUrl || null,
        checkInReason: checkInReason || null,
        recordedBy: req.user?.id,
        recorderRole: req.user?.role as any,
        status: "Present",
      } as any);

      res.status(201).json(attendance);
    } catch (error: any) {
      console.error("Check in error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to check in" });
    }
  });

  app.post("/api/hostel/checkout", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "HostelWarden", "Lady Superintendent", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const { studentId, date, checkOutTime, attendanceId, checkOutReason } = req.body;

      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const student = await storage.getStudent(studentId);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Gender-based access control for LS and MS
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "F") {
          return res.status(403).json({ message: "Lady Superintendent can only manage female students" });
        }
      }

      if (req.user?.role === "MealSuperintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "M") {
          return res.status(403).json({ message: "Meal Superintendent can only manage male students" });
        }
      }

      // If attendanceId is provided, update that specific record
      // Otherwise, find the most recent check-in without a checkout
      if (attendanceId) {
        // Get the record to validate
        const existingAttendance = await storage.getHostelAttendance({ studentId, date });
        const targetRecord = existingAttendance.find(a => a.id === attendanceId);

        if (!targetRecord) {
          return res.status(404).json({ message: "Attendance record not found" });
        }

        // Validate: can only checkout if there's a check-in
        if (!targetRecord.checkInTime) {
          return res.status(400).json({ message: "Cannot check out: no check-in found for this record" });
        }

        const updated = await storage.updateHostelAttendance(attendanceId, {
          checkOutTime: checkOutTime ? new Date(checkOutTime) : new Date(),
          checkOutReason: checkOutReason || null,
        } as any);
        if (!updated) {
          return res.status(404).json({ message: "Attendance record not found" });
        }
        return res.json(updated);
      }

      // Find the most recent check-in without checkout for this student on this date
      const existingAttendance = await storage.getHostelAttendance({ studentId, date });
      const record = existingAttendance
        .filter(a => a.checkInTime && !a.checkOutTime)
        .sort((a, b) => {
          const aIndex = (a as any).eventIndex || 0;
          const bIndex = (b as any).eventIndex || 0;
          return bIndex - aIndex;
        })[0];

      if (!record) {
        return res.status(404).json({ message: "No check-in record found for this student" });
      }

      const updated = await storage.updateHostelAttendance(record.id, {
        checkOutTime: checkOutTime ? new Date(checkOutTime) : new Date(),
        checkOutReason: checkOutReason || null,
      } as any);

      res.json(updated);
    } catch (error: any) {
      console.error("Check out error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to check out" });
    }
  });

  app.post("/api/hostel/vacation", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "HostelWarden", "Lady Superintendent", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const { studentId, vacationStartDate, vacationEndDate, vacationReason } = req.body;

      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      if (!vacationStartDate || !vacationEndDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const student = await storage.getStudent(studentId);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // If the caller is a ClassTeacher, ensure they can only mark vacations for students in their school/class
      if (req.user?.role === "ClassTeacher") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (req.user.classSection && student.classSection !== req.user.classSection) {
          return res.status(403).json({ message: `You can only mark vacations for students in ${req.user.classSection || 'your assigned class section'}` });
        }
      }

      // If the caller is a Lady Superintendent, ensure they can only mark vacations for female students in their school
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "F") {
          return res.status(403).json({ message: "Lady Superintendent can only mark vacations for female students" });
        }
      }

      // If the caller is a Meal Superintendent, ensure they can only mark vacations for male students in their school
      if (req.user?.role === "MealSuperintendent") {
        if (!req.user.schoolId || req.user.schoolId !== student.schoolId) {
          return res.status(403).json({ message: "Insufficient permissions for this student" });
        }
        if (student.gender !== "M") {
          return res.status(403).json({ message: "Meal Superintendent can only mark vacations for male students" });
        }
      }

      // Create records for each day in the vacation period
      const startDate = new Date(vacationStartDate);
      const endDate = new Date(vacationEndDate);
      const attendanceRecords = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const record = await storage.createHostelAttendance({
          studentId,
          schoolId: student.schoolId,
          date: dateStr,
          isVacation: true,
          vacationStartDate,
          vacationEndDate,
          vacationReason,
          recordedBy: req.user?.id,
          recorderRole: req.user?.role as any,
          status: "On Vacation",
        });
        attendanceRecords.push(record);
      }

      res.status(201).json({ records: attendanceRecords });
    } catch (error: any) {
      console.error("Mark vacation error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to mark vacation" });
    }
  });

  app.get("/api/hostel/monthly-report", authenticateToken, denyAdmin, authorizeRoles("ClassTeacher", "Headmaster", "PO", "HostelWarden", "Lady Superintendent", "MealSuperintendent"), async (req: AuthRequest, res) => {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const requestedSchool = req.query.schoolId as string;
      const role = req.user?.role;

      // For ClassTeacher, get their assigned class
      let teacherClassSection: string | undefined;
      if (role === "ClassTeacher") {
        const teacher = await storage.getUser(req.user!.id);
        teacherClassSection = teacher?.classSection ?? undefined;
      }

      // Determine which school(s) data to return based on role
      let schoolId: string | undefined;
      let genderFilter: string | undefined; // For LS/MS gender-based filtering
      
      if (role === "ClassTeacher" || role === "Headmaster" || role === "HostelWarden") {
        schoolId = req.user?.schoolId; // CT/HM/Warden see only their school
      } else if (role === "Lady Superintendent") {
        schoolId = req.user?.schoolId; // LS sees only their school
        genderFilter = "F"; // LS can only see female students
        if (!schoolId) {
          return res.status(400).json({ message: "Lady Superintendent is not assigned to a school" });
        }
      } else if (role === "MealSuperintendent") {
        schoolId = req.user?.schoolId; // MS sees only their school
        genderFilter = "M"; // MS can only see male students
        if (!schoolId) {
          return res.status(400).json({ message: "Meal Superintendent is not assigned to a school" });
        }
      } else if (role === "PO" || role === "Admin") {
        schoolId = requestedSchool; // PO can filter by school
      }

      const stats = await (storage as any).getHostelMonthlyStats({ schoolId, month, year, classSection: teacherClassSection });

      // Filter by classSection for ClassTeacher if needed (already done in storage, but ensure it's applied)
      let finalStats = stats;
      if (role === "ClassTeacher" && teacherClassSection) {
        finalStats = {
          ...stats,
          students: stats.students?.filter((s: any) => s.classSection === teacherClassSection) || [],
          summary: {
            ...stats.summary,
            totalStudents: stats.students?.filter((s: any) => s.classSection === teacherClassSection).length || 0,
          },
        };
      }

      // Apply gender filtering for LS and MS roles
      if (genderFilter) {
        finalStats = {
          ...finalStats,
          students: finalStats.students?.filter((s: any) => s.gender === genderFilter) || [],
          summary: {
            ...finalStats.summary,
            totalStudents: finalStats.students?.filter((s: any) => s.gender === genderFilter).length || 0,
          },
        };
      }

      res.json(finalStats);
    } catch (error: any) {
      console.error("Monthly hostel report error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch monthly report" });
    }
  });

// Helper function to calculate menstrual health analytics for PO dashboard
async function getMenstrualHealthAnalytics(schools: any[], selectedMonth: number, selectedYear: number) {
  try {
    console.log('Calculating menstrual health analytics for', schools.length, 'schools');
    
    // Get all female students eligible for menstrual tracking (age 10+, menstruation started)
    const allStudentsPromises = schools.map(async (school) => {
      try {
        const { students } = await storage.getStudents({ 
          schoolId: school.id, 
          gender: 'F',
          limit: 1000 
        });
        
        // Filter for eligible students (age 10+, menstruation started)
        const eligibleStudents = students.filter(student => {
          if (!student.dateOfBirth || !student.menstruationStartedAt) return false;
          const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          return age >= 10;
        });
        
        return eligibleStudents.map(s => ({ ...s, schoolName: school.name }));
      } catch (error) {
        console.error('Error fetching students for school', school.id, ':', error);
        return [];
      }
    });
    
    const allStudentsArrays = await Promise.all(allStudentsPromises);
    const eligibleStudents = allStudentsArrays.flat();
    
    console.log('Found', eligibleStudents.length, 'eligible female students for menstrual tracking');
    
    if (eligibleStudents.length === 0) {
      return {
        totalEligibleStudents: 0,
        totalTrackedStudents: 0,
        monthlyTrend: [],
        cycleRegularity: { regular: 0, irregular: 0, unknown: 0 },
        lateMenstruationCases: [],
        symptomAnalysis: { symptoms: [], moods: [] },
        referralAnalysis: { total: 0, byFacility: {} },
        ageWiseAnalysis: { distribution: {}, irregularities: {}, irregularityRates: {} }
      };
    }
    
    // Get period tracker entries for all eligible students
    const allEntriesPromises = eligibleStudents.map(async (student) => {
      try {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        const { entries } = await storage.getPeriodTrackerEntries({
          studentId: student.id,
          startDate,
          endDate,
          limit: 1000
        });
        return entries.map(e => ({ ...e, student }));
      } catch (error) {
        console.error('Error fetching period entries for student', student.id, ':', error);
        return [];
      }
    });
    
    const allEntriesArrays = await Promise.all(allEntriesPromises);
    const allEntries = allEntriesArrays.flat();
    
    console.log('Found', allEntries.length, 'period tracker entries');
    
    // Calculate monthly menstruation count trend
    const monthlyTrend = [];
    for (let month = 1; month <= 12; month++) {
      const monthEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.entryDate);
        return entryDate.getMonth() + 1 === month && entryDate.getFullYear() === selectedYear;
      });
      
      // Count unique students who had entries in this month
      const uniqueStudents = new Set(monthEntries.map(e => e.studentId)).size;
      
      monthlyTrend.push({
        month: new Date(selectedYear, month - 1).toLocaleString('default', { month: 'short' }),
        count: uniqueStudents,
        totalEntries: monthEntries.length
      });
    }
    
    // Analyze cycle regularity and detect late menstruation
    const studentCycleAnalysis = new Map();
    const lateMenstruationCases = [];
    
    for (const student of eligibleStudents) {
      const studentEntries = allEntries
        .filter(e => e.studentId === student.id && e.flowCategory && e.flowCategory !== 'none')
        .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
      
      if (studentEntries.length < 2) {
        studentCycleAnalysis.set(student.id, { regularity: 'unknown', cycleLengths: [] });
        continue;
      }
      
      // Calculate cycle lengths
      const cycleLengths = [];
      for (let i = 1; i < studentEntries.length; i++) {
        const prevDate = new Date(studentEntries[i - 1].entryDate);
        const currDate = new Date(studentEntries[i].entryDate);
        const cycleLength = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (cycleLength > 0 && cycleLength <= 60) { // Reasonable cycle length
          cycleLengths.push(cycleLength);
        }
      }
      
      if (cycleLengths.length === 0) {
        studentCycleAnalysis.set(student.id, { regularity: 'unknown', cycleLengths: [] });
        continue;
      }
      
      // Determine regularity
      const avgCycleLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
      const variance = cycleLengths.reduce((sum, length) => sum + Math.pow(length - avgCycleLength, 2), 0) / cycleLengths.length;
      const stdDev = Math.sqrt(variance);
      
      const regularity = stdDev <= 7 ? 'regular' : 'irregular';
      studentCycleAnalysis.set(student.id, { regularity, cycleLengths, avgCycleLength, stdDev });
      
      // Check for late menstruation (cycle length > 35 days or missed expected cycle)
      const lastEntry = studentEntries[studentEntries.length - 1];
      const lastEntryDate = new Date(lastEntry.entryDate);
      const daysSinceLastPeriod = Math.floor((Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const isLate = avgCycleLength > 35 || daysSinceLastPeriod > (avgCycleLength + 7);
      
      if (isLate && student.dateOfBirth) {
        const expectedDate = new Date(lastEntryDate);
        expectedDate.setDate(expectedDate.getDate() + Math.round(avgCycleLength));
        
        const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        
        lateMenstruationCases.push({
          studentId: student.id,
          studentName: student.fullName,
          age,
          school: student.schoolName,
          lastMenstruationDate: lastEntry.entryDate,
          expectedDate: expectedDate.toISOString().split('T')[0],
          delayDays: Math.max(daysSinceLastPeriod - Math.round(avgCycleLength), 0),
          riskFlag: daysSinceLastPeriod > (avgCycleLength + 14) ? 'Needs Attention' : 'Normal'
        });
      }
    }
    
    // Calculate cycle regularity summary
    const regularityStats: Record<string, number> = { regular: 0, irregular: 0, unknown: 0 };
    for (const analysis of Array.from(studentCycleAnalysis.values())) {
      const regularity = (analysis as any).regularity;
      if (regularity in regularityStats) {
        regularityStats[regularity]++;
      }
    }
    
    // Analyze symptoms
    const symptomCounts: Record<string, number> = {};
    const moodCounts: Record<string, number> = {};
    
    allEntries.forEach(entry => {
      if (entry.symptoms && Array.isArray(entry.symptoms)) {
        entry.symptoms.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
      }
      
      if (entry.moods && Array.isArray(entry.moods)) {
        entry.moods.forEach(mood => {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
      }
    });
    
    // Analyze referrals
    const referralEntries = allEntries.filter(e => e.isReferred);
    const referralsByFacility: Record<string, number> = {};
    referralEntries.forEach(entry => {
      if (entry.referralFacility) {
        referralsByFacility[entry.referralFacility] = (referralsByFacility[entry.referralFacility] || 0) + 1;
      }
    });
    
    // Age-wise analysis
    const ageGroups: Record<string, number> = { '10-12': 0, '13-15': 0, '16-18': 0, '18+': 0 };
    const ageGroupIrregularities: Record<string, number> = { '10-12': 0, '13-15': 0, '16-18': 0, '18+': 0 };
    
    eligibleStudents.forEach(student => {
      if (!student.dateOfBirth) return;
      
      const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      const analysis = studentCycleAnalysis.get(student.id);
      
      let ageGroup = '18+';
      if (age <= 12) ageGroup = '10-12';
      else if (age <= 15) ageGroup = '13-15';
      else if (age <= 18) ageGroup = '16-18';
      
      ageGroups[ageGroup]++;
      if (analysis && (analysis as any).regularity === 'irregular') {
        ageGroupIrregularities[ageGroup]++;
      }
    });
    
    const studentsWithEntries = new Set(allEntries.map(e => e.studentId)).size;
    
    return {
      totalEligibleStudents: eligibleStudents.length,
      totalTrackedStudents: studentsWithEntries,
      monthlyTrend,
      cycleRegularity: regularityStats,
      lateMenstruationCases: lateMenstruationCases.slice(0, 50), // Limit for performance
      symptomAnalysis: {
        symptoms: Object.entries(symptomCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([symptom, count]) => ({ symptom, count: count as number, percentage: (((count as number) / allEntries.length) * 100).toFixed(1) })),
        moods: Object.entries(moodCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([mood, count]) => ({ mood, count: count as number, percentage: (((count as number) / allEntries.length) * 100).toFixed(1) }))
      },
      referralAnalysis: {
        total: referralEntries.length,
        byFacility: referralsByFacility
      },
      ageWiseAnalysis: {
        distribution: ageGroups,
        irregularities: ageGroupIrregularities,
        irregularityRates: Object.keys(ageGroups).reduce((acc: Record<string, string>, group) => {
          acc[group] = ageGroups[group] > 0 ? ((ageGroupIrregularities[group] / ageGroups[group]) * 100).toFixed(1) : '0.0';
          return acc;
        }, {})
      }
    };
    
  } catch (error) {
    console.error('Error calculating menstrual health analytics:', error);
    return {
      totalEligibleStudents: 0,
      totalTrackedStudents: 0,
      monthlyTrend: [],
      cycleRegularity: { regular: 0, irregular: 0, unknown: 0 },
      lateMenstruationCases: [],
      symptomAnalysis: { symptoms: [], moods: [] },
      referralAnalysis: { total: 0, byFacility: {} },
      ageWiseAnalysis: { distribution: {}, irregularities: {}, irregularityRates: {} }
    };
  }
}

  app.get("/api/po/dashboard", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { month, year, schoolType } = req.query;
      const selectedMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();
      const selectedSchoolType = schoolType as string | undefined;

      console.log('========== PO DASHBOARD REQUEST START ==========');
      console.log('Request params:', { selectedMonth, selectedYear, selectedSchoolType, userId: req.user!.id });

      // Validate input parameters
      if (selectedMonth < 1 || selectedMonth > 12) {
        return res.status(400).json({ message: "Invalid month parameter. Must be between 1 and 12." });
      }
      
      if (selectedYear < 2020 || selectedYear > new Date().getFullYear() + 1) {
        return res.status(400).json({ message: "Invalid year parameter. Must be between 2020 and current year + 1." });
      }

      if (selectedSchoolType && !['Government', 'Aided', 'All'].includes(selectedSchoolType)) {
        return res.status(400).json({ message: "Invalid school type. Must be 'Government', 'Aided', or 'All'." });
      }

      // Get PO's district to filter schools
      const user = await storage.getUser(req.user!.id);
      const poDistrict: string | undefined = user?.district ?? undefined;

      console.log('PO user district:', poDistrict);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all schools and apply filters with better error handling
      let schools: any[] = [];
      try {
        if (req.user?.role === "Admin") {
          const result = await storage.getSchools(1, 1000);
          schools = result.schools || [];
        } else if (poDistrict) {
          // For PO, filter by district first
          const allSchools = await storage.getSchools(1, 1000);
          schools = (allSchools.schools || []).filter(s => s.district === poDistrict);
        } else {
          console.warn('PO user has no district assigned, returning empty data');
          schools = [];
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        return res.status(500).json({ message: "Failed to fetch schools data" });
      }

      console.log(`Found ${schools.length} schools for district: ${poDistrict}`);

      // Apply school type filter
      if (selectedSchoolType && selectedSchoolType !== "All") {
        schools = schools.filter(s => s.schoolType === selectedSchoolType);
        console.log(`After school type filter (${selectedSchoolType}): ${schools.length} schools`);
      }

      if (schools.length === 0) {
        console.warn('No schools found for the given criteria');
        return res.json({
          districtKPIs: {
            totalSchools: 0,
            totalStudentsScreened: 0,
            totalHealthCards: 0,
            totalCheckups: 0,
            totalReferrals: 0,
            healthCardCompletionRate: 0,
            checkupCoverageRate: 0,
            referralRate: 0,
            avgBMIDistrict: 0,
            schoolsCompletedScreeningPercent: 0,
            studentsReferredPercent: 0,
            totalPendingReferrals: 0,
            highRiskCasesToday: 0,
            prevalenceRates: {
              underweightPercent: 0,
              obesityPercent: 0,
              severeAnemiaPercent: 0,
              goitrePercent: 0,
              tbSuspicionPercent: 0,
              leprosySuspicionPercent: 0,
            },
            schoolTypeBreakdown: {
              government: { schoolCount: 0, totalStudents: 0, healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0 },
              aided: { schoolCount: 0, totalStudents: 0, healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0 },
              overall: { schoolCount: 0, totalStudents: 0, healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0 },
            }
          },
          referralHeatmap: { schools: [], maxReferrals: 0 },
          anthropometryAnalytics: { stats: { bmiDistribution: {}, underweightPercent: 0, normalPercent: 0, obesePercent: 0 }, bmiTrendOverTime: [], schoolNutritionRanking: [], genderSplit: { male: {}, female: {} } },
          deficienciesInsights: {},
          deficienciesHeatmap: { schools: [] },
          diseasesInsights: {},
          leprosyAnalytics: { totalSuspectedCases: 0, referralStatus: { completed: 0, total: 0 }, facilityLoad: [], subTypeDistribution: {}, showRedAlert: false },
          tbAnalytics: { totalSuspectedCases: 0, contactHistoryPercent: 0, referralStatus: { completed: 0, total: 0 }, dotsCenterLoad: [], symptomsBreakdown: { counts: {}, labels: {} }, showRedAlert: false },
          developmentalDelays: { speechDelayPercent: 0, motorDelayPercent: 0, cognitiveDelayPercent: 0, socialDelayPercent: 0 },
          adolescentHealth: { totalAdolescents: 0, adolescentCardCount: 0, screenedPercent: 0 },
          menstrualHealthAnalytics: { totalEligibleStudents: 0, totalTrackedStudents: 0, monthlyTrend: [], cycleRegularity: { regular: 0, irregular: 0, unknown: 0 }, lateMenstruationCases: [], symptomAnalysis: { symptoms: [], moods: [] }, referralAnalysis: { total: 0, byFacility: {} }, ageWiseAnalysis: { distribution: {}, irregularities: {}, irregularityRates: {} } },
          referralManagement: { totalReferralsGenerated: 0, referralCompletionPercent: 0, pendingReferrals: 0, overdueReferrals: [], facilityWiseLoad: [], mostReferredSchools: [], mostReferredIssues: [] },
          complianceAnalytics: { dataCompletenessPercent: 0, invalidBMI: 0, incompleteCriticalCases: 0, healthCardCompliance: 0, checkupCompliance: 0, reportingCompliance: 0, overallCompliance: 0, auditLogs: { invalidBMI: 0, incompleteC7C8: 0 } },
          alerts: { leprosyAlert: false, tbAlert: false, severeAnemiaAlert: false },
          exportCapabilities: { availableFormats: ["pdf", "excel", "json"], lastExportDate: null, exportHistory: [] },
          metadata: { generatedAt: new Date().toISOString(), dataFreshness: "real-time", coverage: "0 schools, 0 students", lastUpdated: new Date().toISOString() },
          metrics: {},
          schools: []
        });
      }

      // Separate schools by type for aggregated metrics
      const governmentSchools = schools.filter(s => s.schoolType === "Government");
      const aidedSchools = schools.filter(s => s.schoolType === "Aided");

      // Get dashboard metrics with error handling
      let metrics = {};
      try {
        metrics = await storage.getDashboardMetrics("PO", req.user!.id, undefined, undefined, poDistrict);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        metrics = {};
      }

      // Calculate aggregated metrics by school type with improved error handling
      const calculateSchoolTypeMetrics = async (schoolList: any[], schoolTypeName: string) => {
        let totalStudents = 0;
        let totalHealthCards = 0;
        let totalCheckups = 0;
        let totalReferrals = 0;

        const schoolsWithMetrics = await Promise.allSettled(
          schoolList.map(async (school) => {
            try {
              const [studentsResult, cardsResult, checkupsResult] = await Promise.allSettled([
                storage.getStudents({ schoolId: school.id, limit: 1000 }),
                storage.getAnnualHealthCards({ schoolId: school.id, status: "Approved", year: selectedYear, limit: 1000 }),
                storage.getMonthlyCheckups({ schoolId: school.id, month: selectedMonth, year: selectedYear })
              ]);

              const students = studentsResult.status === 'fulfilled' ? studentsResult.value.students || [] : [];
              const cards = cardsResult.status === 'fulfilled' ? cardsResult.value.cards || [] : [];
              const checkups = checkupsResult.status === 'fulfilled' ? checkupsResult.value.checkups || [] : [];

              totalStudents += students.length;
              totalHealthCards += cards.length;
              totalCheckups += checkups.length;

              // Get referrals for this school with error handling
              let schoolReferrals = 0;
              try {
                const { referrals } = await storage.getReferrals({ schoolId: school.id, limit: 1000 });
                schoolReferrals = referrals ? referrals.length : 0;
                totalReferrals += schoolReferrals;
              } catch (error) {
                console.warn(`Referrals not available for school ${school.id}:`, error);
                schoolReferrals = 0;
              }

              return {
                ...school,
                studentCount: students.length,
                healthCardCount: cards.length,
                checkupCount: checkups.length,
                referralCount: schoolReferrals,
                healthCardCompletion: students.length > 0 ? Math.round((cards.length / students.length) * 100) : 0,
                checkupCoverage: students.length > 0 ? Math.round((checkups.length / students.length) * 100) : 0,
              };
            } catch (error) {
              console.error(`Error processing school ${school.id}:`, error);
              return {
                ...school,
                studentCount: 0,
                healthCardCount: 0,
                checkupCount: 0,
                referralCount: 0,
                healthCardCompletion: 0,
                checkupCoverage: 0,
              };
            }
          })
        );

        const successfulSchools = schoolsWithMetrics
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<any>).value);

        return {
          schoolType: schoolTypeName,
          schoolCount: schoolList.length,
          totalStudents,
          totalHealthCards,
          totalCheckups,
          totalReferrals,
          healthCardCompletion: totalStudents > 0 ? Math.round((totalHealthCards / totalStudents) * 100) : 0,
          checkupCoverage: totalStudents > 0 ? Math.round((totalCheckups / totalStudents) * 100) : 0,
          referralRate: totalStudents > 0 ? Math.round((totalReferrals / totalStudents) * 100) : 0,
          schools: successfulSchools,
        };
      };

      // Calculate metrics for each school type with error handling
      const [governmentMetricsResult, aidedMetricsResult, overallMetricsResult] = await Promise.allSettled([
        calculateSchoolTypeMetrics(governmentSchools, "Government"),
        calculateSchoolTypeMetrics(aidedSchools, "Aided"),
        calculateSchoolTypeMetrics(schools, "Overall")
      ]);

      const governmentMetrics = governmentMetricsResult.status === 'fulfilled' ? governmentMetricsResult.value : {
        schoolType: "Government", schoolCount: 0, totalStudents: 0, totalHealthCards: 0, totalCheckups: 0, totalReferrals: 0,
        healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0, schools: []
      };

      const aidedMetrics = aidedMetricsResult.status === 'fulfilled' ? aidedMetricsResult.value : {
        schoolType: "Aided", schoolCount: 0, totalStudents: 0, totalHealthCards: 0, totalCheckups: 0, totalReferrals: 0,
        healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0, schools: []
      };

      const overallMetrics = overallMetricsResult.status === 'fulfilled' ? overallMetricsResult.value : {
        schoolType: "Overall", schoolCount: 0, totalStudents: 0, totalHealthCards: 0, totalCheckups: 0, totalReferrals: 0,
        healthCardCompletion: 0, checkupCoverage: 0, referralRate: 0, schools: []
      };

      // Calculate basic district KPIs from real data
      let totalStudents = overallMetrics.totalStudents;
      let totalHealthCards = overallMetrics.totalHealthCards;
      let totalCheckups = overallMetrics.totalCheckups;
      let totalReferrals = overallMetrics.totalReferrals;

      // Get all health cards for prevalence calculations for the selected year only with improved error handling
      console.log('Fetching health cards for', schools.length, 'schools');
      const allCardsPromises = schools.map(async (school) => {
        console.log('Fetching cards for school:', school.id, school.name);
        try {
          const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear, limit: 1000 });
          const validCards = cards || [];
          console.log('Retrieved', validCards.length, 'cards for school', school.id);
          return validCards;
        } catch (error) {
          console.error('Error fetching cards for school', school.id, ':', error);
          return [];
        }
      });
      
      const allCardsResults = await Promise.allSettled(allCardsPromises);
      const allCardsArrays = allCardsResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any[]>).value);
      const flatCards = allCardsArrays.flat();

      // Debug log: number of cards returned for the selected year
      console.log(`PO Dashboard: selectedYear=${selectedYear}, totalCardsForYear=${flatCards.length}, schools=${schools.length}`);
      
      if (flatCards.length > 0) {
        // Log sample card to verify data structure
        const sampleCard = flatCards[0];
        console.log('Sample card data:', {
          id: sampleCard.id,
          studentId: sampleCard.studentId,
          schoolId: sampleCard.schoolId,
          bmi: sampleCard.bmi,
          heightCm: sampleCard.heightCm,
          weightKg: sampleCard.weightKg,
          c7_suspected: sampleCard.c7_suspected,
          c8_suspected: sampleCard.c8_suspected,
          d1_seeing_difficulty: sampleCard.d1_seeing_difficulty,
          d5_hearing_difficulty: sampleCard.d5_hearing_difficulty,
          d7_learning_difficulty: sampleCard.d7_learning_difficulty,
          d2_walking_delay: sampleCard.d2_walking_delay,
          d9_behavioral_concerns: sampleCard.d9_behavioral_concerns,
          e1_life_events_difficulty: sampleCard.e1_life_events_difficulty,
          e2_peer_pressure_substance: sampleCard.e2_peer_pressure_substance,
          e3_persistent_sadness: sampleCard.e3_persistent_sadness,
          b3_severe_anemia: sampleCard.b3_severe_anemia,
          b6_goitre: sampleCard.b6_goitre,
        });
        
        // Check how many cards have any disease/adolescent fields set
        const cardsWithAnyDisease = flatCards.filter((c: any) => 
          c.c1_convulsive || c.c2_otitis_media || c.c3_dental || c.c4_skin_conditions || 
          c.c5_asthma || c.c6_rheumatic_heart || c.c7_suspected || c.c8_suspected
        ).length;
        
        const cardsWithAnyAdolescent = flatCards.filter((c: any) => 
          c.e1_life_events_difficulty || c.e2_peer_pressure_substance || c.e3_persistent_sadness ||
          c.e5_pain_urination || c.e6_foul_discharge
        ).length;
        
        const cardsWithAnyDeficiency = flatCards.filter((c: any) => 
          c.b3_severe_anemia || c.b4_vitamin_a_deficiency || c.b5_vitamin_d_deficiency || 
          c.b6_goitre || c.b8_vitb_deficiency
        ).length;
        
        console.log(`Cards with ANY disease field set: ${cardsWithAnyDisease}/${flatCards.length}`);
        console.log(`Cards with ANY adolescent field set: ${cardsWithAnyAdolescent}/${flatCards.length}`);
        console.log(`Cards with ANY deficiency field set: ${cardsWithAnyDeficiency}/${flatCards.length}`);
      } else {
        console.log('⚠️ NO HEALTH CARDS FOUND FOR SELECTED YEAR/MONTH - This may indicate:');
        console.log('  1. No health cards have been created for this year');
        console.log('  2. Health cards exist but are not approved');
        console.log('  3. Database connection issues');
        console.log('  4. Incorrect year filter');
      }

      // Calculate prevalence rates from actual health card data
      let underweight = 0, normal = 0, obese = 0, severeAnemia = 0, goitre = 0, tbSuspected = 0, leprosySuspected = 0;
      let totalBMI = 0, bmiCount = 0;

      flatCards.forEach((card: any) => {
        // BMI calculations - handle both number and string types
        const bmiValue = typeof card.bmi === 'number' ? card.bmi : (typeof card.bmi === 'string' ? parseFloat(card.bmi) : null);
        if (bmiValue && !isNaN(bmiValue)) {
          totalBMI += bmiValue;
          bmiCount++;
          if (bmiValue < 18.5) underweight++;
          else if (bmiValue >= 18.5 && bmiValue < 25) normal++;
          else if (bmiValue >= 25) obese++;
        }

        // Check for deficiencies from various fields
        if (card.deficiencies && Array.isArray(card.deficiencies)) {
          card.deficiencies.forEach((def: string) => {
            const lowerDef = def.toLowerCase();
            if (lowerDef.includes('severe anemia') || lowerDef.includes('anemia')) severeAnemia++;
            if (lowerDef.includes('goitre')) goitre++;
            if (lowerDef.includes('tb') || lowerDef.includes('tuberculosis')) tbSuspected++;
            if (lowerDef.includes('leprosy')) leprosySuspected++;
          });
        }

        // Check specific deficiency flags
        if (card.b3_severe_anemia) severeAnemia++;
        if (card.b6_goitre) goitre++;
        if (card.c7_suspected) leprosySuspected++;
        if (card.c8_suspected) tbSuspected++;
      });

      const schoolsWithMetrics = await Promise.all(
        schools.map(async (school) => {
          const { students } = await storage.getStudents({ schoolId: school.id, limit: 1000 });
          const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, status: "Approved", year: selectedYear, limit: 1000 });
          const { checkups } = await storage.getMonthlyCheckups({ schoolId: school.id, month: selectedMonth, year: selectedYear });

          totalStudents += students.length;
          totalHealthCards += cards.length;
          totalCheckups += checkups.length;

          // Get referrals for this school in the selected month/year
          let schoolReferrals = 0;
          let referralStatusCounts: Record<string, number> = {};
          let referralCategoryCounts: Record<string, number> = {};
          try {
            const { referrals } = await storage.getReferrals({ schoolId: school.id, limit: 1000 });
            const monthReferrals = referrals.filter(r => {
              const referralDate = new Date(r.referralDate);
              return referralDate.getMonth() + 1 === selectedMonth && referralDate.getFullYear() === selectedYear;
            });
            schoolReferrals = monthReferrals.length;

            // Build counts by status and by category (referralType)
            monthReferrals.forEach(r => {
              const st = (r.status || 'Unknown');
              referralStatusCounts[st] = (referralStatusCounts[st] || 0) + 1;
              const cat = (r.referralType || 'all').toString().toLowerCase();
              referralCategoryCounts[cat] = (referralCategoryCounts[cat] || 0) + 1;
            });
          } catch (error: any) {
            console.warn(`Referrals table not available for school ${school.id}:`, error);
          }

          totalReferrals += schoolReferrals;

          return {
            ...school,
            totalStudents: students.length,
            healthCardCompletion: students.length > 0 ? Math.round((cards.length / students.length) * 100) : 0,
            checkupCoverage: students.length > 0 ? Math.round((checkups.length / students.length) * 100) : 0,
            referredCount: schoolReferrals,
            referralStatusCounts,
            referralCategoryCounts,
          };
        })
      );

      const totalCards = flatCards.length;

      // Basic district KPIs
      const districtKPIs = {
        totalSchools: schools.length,
        totalStudentsScreened: totalStudents,
        totalHealthCards: totalHealthCards,
        totalCheckups: totalCheckups,
        totalReferrals: totalReferrals,
        healthCardCompletionRate: totalStudents > 0 ? Math.round((totalHealthCards / totalStudents) * 100) : 0,
        checkupCoverageRate: totalStudents > 0 ? Math.round((totalCheckups / totalStudents) * 100) : 0,
        referralRate: totalCheckups > 0 ? Math.round((totalReferrals / totalCheckups) * 100) : 0,
        avgBMIDistrict: bmiCount > 0 ? parseFloat((totalBMI / bmiCount).toFixed(1)) : 0,
        schoolsCompletedScreeningPercent: totalStudents > 0 ? Math.round((totalHealthCards / totalStudents) * 100) : 0,
        studentsReferredPercent: totalStudents > 0 ? Math.round((totalReferrals / totalStudents) * 100) : 0,
        totalPendingReferrals: totalReferrals, // Placeholder - need to calculate pending vs completed
        highRiskCasesToday: severeAnemia + leprosySuspected + tbSuspected, // High-risk cases
        prevalenceRates: {
          underweightPercent: totalCards > 0 ? Math.round((underweight / totalCards) * 100) : 0,
          obesityPercent: totalCards > 0 ? Math.round((obese / totalCards) * 100) : 0,
          severeAnemiaPercent: totalCards > 0 ? Math.round((severeAnemia / totalCards) * 100) : 0,
          goitrePercent: totalCards > 0 ? Math.round((goitre / totalCards) * 100) : 0,
          tbSuspicionPercent: totalCards > 0 ? Math.round((tbSuspected / totalCards) * 100) : 0,
          leprosySuspicionPercent: totalCards > 0 ? Math.round((leprosySuspected / totalCards) * 100) : 0,
        },
        // Add school type breakdown
        schoolTypeBreakdown: {
          government: governmentMetrics,
          aided: aidedMetrics,
          overall: overallMetrics,
        }
      };

      // Basic referral heatmap with breakdowns by status and category
      const referralHeatmap = {
        schools: schoolsWithMetrics.map(school => ({
          schoolId: school.id,
          schoolName: school.name,
          referralCount: school.referredCount,
          studentCount: school.totalStudents,
          // add counts so frontend can filter by status/category without additional requests
          referralStatusCounts: school.referralStatusCounts || {},
          referralCategoryCounts: school.referralCategoryCounts || {},
        })),
        maxReferrals: Math.max(...schoolsWithMetrics.map(s => s.referredCount), 0),
      };

      // Get menstrual health analytics
      const menstrualAnalytics = await getMenstrualHealthAnalytics(schools, selectedMonth, selectedYear);

      // Calculate real anthropometry analytics
      const anthropometryAnalytics = {
        stats: {
          bmiDistribution: {
            "Severe Underweight (< 16.0)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi < 16.0;
            }).length,
            "Moderate Underweight (16.0-16.9)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi >= 16.0 && bmi < 17.0;
            }).length,
            "Mild Underweight (17.0-18.4)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi >= 17.0 && bmi < 18.5;
            }).length,
            "Normal (18.5-24.9)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi >= 18.5 && bmi < 25.0;
            }).length,
            "Overweight (25.0-29.9)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi >= 25.0 && bmi < 30.0;
            }).length,
            "Obese (≥ 30.0)": flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
              return bmi && bmi >= 30.0;
            }).length,
          },
          underweightPercent: totalCards > 0 ? Math.round((underweight / totalCards) * 100) : 0,
          normalPercent: totalCards > 0 ? Math.round((normal / totalCards) * 100) : 0,
          obesePercent: totalCards > 0 ? Math.round((obese / totalCards) * 100) : 0,
        },
        bmiTrendOverTime: await Promise.all(
          ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(async (monthName, index) => {
            const monthNum = index + 1;
            const monthCards = flatCards.filter(card => {
              if (!card.createdAt) return false;
              const cardDate = new Date(card.createdAt);
              return cardDate.getMonth() + 1 === monthNum && cardDate.getFullYear() === selectedYear;
            });

            let underweight = 0, normal = 0, overweight = 0;
            monthCards.forEach(card => {
              const bmiValue = typeof card.bmi === 'number' ? card.bmi : (typeof card.bmi === 'string' ? parseFloat(card.bmi) : null);
              if (bmiValue && !isNaN(bmiValue)) {
                if (bmiValue < 18.5) underweight++;
                else if (bmiValue >= 18.5 && bmiValue < 25) normal++;
                else if (bmiValue >= 25) overweight++;
              }
            });

            return {
              month: monthName,
              underweight,
              normal,
              overweight
            };
          })
        ),
        schoolNutritionRanking: await Promise.all(
          schoolsWithMetrics.map(async (school) => {
            const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear, limit: 1000 });
            let underweightCount = 0, obeseCount = 0;

            cards.forEach(card => {
              const bmiValue = typeof card.bmi === 'number' ? card.bmi : (typeof card.bmi === 'string' ? parseFloat(card.bmi) : null);
              if (bmiValue && !isNaN(bmiValue)) {
                if (bmiValue < 18.5) underweightCount++;
                else if (bmiValue >= 30) obeseCount++; // Using WHO obesity threshold
              }
            });

            const totalAssessed = cards.length;
            const riskScore = totalAssessed > 0 ? Math.round(((underweightCount + obeseCount) / totalAssessed) * 100) : 0;
            const riskLevel = riskScore > 25 ? "High" : riskScore > 15 ? "Medium" : "Low";

            return {
              schoolId: school.id,
              schoolName: school.name,
              underweightCount,
              obeseCount,
              riskScore,
              riskLevel
            };
          })
        ),
        genderSplit: (() => {
          const maleCards = flatCards.filter(card => card.gender === 'M');
          const femaleCards = flatCards.filter(card => card.gender === 'F');

          const calculateGenderStats = (cards: any[]) => {
            let underweight = 0, normal = 0, obese = 0;
            cards.forEach(card => {
              const bmiValue = typeof card.bmi === 'number' ? card.bmi : (typeof card.bmi === 'string' ? parseFloat(card.bmi) : null);
              if (bmiValue && !isNaN(bmiValue)) {
                if (bmiValue < 18.5) underweight++;
                else if (bmiValue >= 18.5 && bmiValue < 25) normal++;
                else if (bmiValue >= 25) obese++;
              }
            });
            const total = cards.length;
            return {
              underweightPercent: total > 0 ? Math.round((underweight / total) * 100) : 0,
              normalPercent: total > 0 ? Math.round((normal / total) * 100) : 0,
              obesePercent: total > 0 ? Math.round((obese / total) * 100) : 0,
            };
          };

          return {
            male: calculateGenderStats(maleCards),
            female: calculateGenderStats(femaleCards)
          };
        })()
      };

      // Calculate real deficiencies insights (count unique students affected per deficiency)
      const deficiencyStudentSets: any = {
        vitaminA: new Set<string>(),
        vitaminD: new Set<string>(),
        iron: new Set<string>(),
        iodine: new Set<string>(),
        zinc: new Set<string>(),
      };

      flatCards.forEach(card => {
        const sid = card.studentId || card.id || null;
        if (!sid) return;

        // Deficiencies can be stored as an array or as specific boolean flags
        if (card.deficiencies && Array.isArray(card.deficiencies)) {
          card.deficiencies.forEach((def: string) => {
            const lowerDef = def.toLowerCase();
            if (lowerDef.includes('vitamin a')) deficiencyStudentSets.vitaminA.add(sid);
            else if (lowerDef.includes('vitamin d')) deficiencyStudentSets.vitaminD.add(sid);
            else if (lowerDef.includes('iron') || lowerDef.includes('anemia')) deficiencyStudentSets.iron.add(sid);
            else if (lowerDef.includes('iodine') || lowerDef.includes('goitre')) deficiencyStudentSets.iodine.add(sid);
            else if (lowerDef.includes('zinc')) deficiencyStudentSets.zinc.add(sid);
          });
        }

        // Boolean flags (schema) - be defensive with field names
        if (card.b4_vitamin_a_deficiency) deficiencyStudentSets.vitaminA.add(sid);
        if (card.b5_vitamin_d_deficiency) deficiencyStudentSets.vitaminD.add(sid);
        if (card.b3_severe_anemia) deficiencyStudentSets.iron.add(sid);
        if (card.b6_goitre) deficiencyStudentSets.iodine.add(sid);
        if (card.b8_vitb_deficiency) deficiencyStudentSets.zinc.add(sid);
      });

      // Provide deficiencies insights in a UI-friendly shape: { totalCases, pendingReferrals }
      const deficienciesInsights: any = {
        vitaminA: { totalCases: deficiencyStudentSets.vitaminA.size, pendingReferrals: 0 },
        vitaminD: { totalCases: deficiencyStudentSets.vitaminD.size, pendingReferrals: 0 },
        iron: { totalCases: deficiencyStudentSets.iron.size, pendingReferrals: 0 },
        iodine: { totalCases: deficiencyStudentSets.iodine.size, pendingReferrals: 0 },
        zinc: { totalCases: deficiencyStudentSets.zinc.size, pendingReferrals: 0 },
        // also expose percent values for backward compatibility
        vitaminAPercent: totalStudents > 0 ? Math.round((deficiencyStudentSets.vitaminA.size / totalStudents) * 100) : 0,
        vitaminDPercent: totalStudents > 0 ? Math.round((deficiencyStudentSets.vitaminD.size / totalStudents) * 100) : 0,
        ironPercent: totalStudents > 0 ? Math.round((deficiencyStudentSets.iron.size / totalStudents) * 100) : 0,
        iodinePercent: totalStudents > 0 ? Math.round((deficiencyStudentSets.iodine.size / totalStudents) * 100) : 0,
        zincPercent: totalStudents > 0 ? Math.round((deficiencyStudentSets.zinc.size / totalStudents) * 100) : 0,
      };

      // Calculate real deficiencies heatmap as percent of students with at least one deficiency
      const deficienciesHeatmap = {
        schools: await Promise.all(
          schoolsWithMetrics.map(async (school) => {
            const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear, limit: 1000 });
            const studentsWithDeficiency = new Set<string>();
            cards.forEach(card => {
              if (card.deficiencies && Array.isArray(card.deficiencies) && (card.deficiencies.length > 0)) {
                if (card.studentId) studentsWithDeficiency.add(card.studentId);
              }
            });
            const severity = school.totalStudents > 0 ? Math.round((studentsWithDeficiency.size / school.totalStudents) * 100) : 0;
            return {
              schoolId: school.id,
              schoolName: school.name,
              severity,
            };
          })
        ),
      };

      // Calculate real diseases insights
      console.log('Calculating diseases insights from', flatCards.length, 'health cards');
      // Helper: treat null/undefined as false for boolean fields
      const isTruthy = (val: any) => val === true || val === 1 || val === '1' || val === 'true';
      
      // DEBUG: Check what values the isTruthy function is seeing
      if (flatCards.length > 0) {
        console.log('🔍 DEBUG - isTruthy test on first card:');
        const firstCard = flatCards[0];
        console.log('  c5_asthma:', firstCard.c5_asthma, '-> isTruthy:', isTruthy(firstCard.c5_asthma));
        console.log('  c7_suspected:', firstCard.c7_suspected, '-> isTruthy:', isTruthy(firstCard.c7_suspected));
        console.log('  c8_suspected:', firstCard.c8_suspected, '-> isTruthy:', isTruthy(firstCard.c8_suspected));
        console.log('  e1_life_events_difficulty:', firstCard.e1_life_events_difficulty, '-> isTruthy:', isTruthy(firstCard.e1_life_events_difficulty));
      }
      
      const respiratoryCases = flatCards.filter(c => isTruthy(c.c5_asthma));
      const skinCases = flatCards.filter(c => isTruthy(c.c4_skin_conditions));
      const leprosyCasesForDiseases = flatCards.filter(c => isTruthy(c.c7_suspected));
      const tbCasesForDiseases = flatCards.filter(c => isTruthy(c.c8_suspected));
      const dentalCases = flatCards.filter(c => isTruthy(c.c3_dental));
      const heartCases = flatCards.filter(c => isTruthy(c.c6_rheumatic_heart));
      const hearingCases = flatCards.filter(c => isTruthy(c.c2_otitis_media));
const convulsiveCases = flatCards.filter(c => isTruthy(c.c1_convulsive));
      
      console.log('Disease case counts:', {
        respiratory: respiratoryCases.length,
        skin: skinCases.length,
        leprosy: leprosyCasesForDiseases.length,
        tb: tbCasesForDiseases.length,
        dental: dentalCases.length,
        heart: heartCases.length,
        hearing: hearingCases.length,
        convulsive: convulsiveCases.length,
      });

      // OBSELETE: some older callers referenced `diseasesInsights.vision` — keep compatibility below when referencing summary objects

      // DETAILED DEBUG: Check all cards for disease fields
      if (flatCards.length > 0) {
        console.log('🔍 DETAILED DEBUG - Checking first 5 cards for disease fields:');
        flatCards.slice(0, 5).forEach((card: any, idx: number) => {
          console.log(`Card ${idx}:`, {
            id: card.id,
            studentId: card.studentId,
            c1_convulsive: card.c1_convulsive,
            c2_otitis_media: card.c2_otitis_media,
            c3_dental: card.c3_dental,
            c4_skin_conditions: card.c4_skin_conditions,
            c5_asthma: card.c5_asthma,
            c6_rheumatic_heart: card.c6_rheumatic_heart,
            c7_suspected: card.c7_suspected,
            c8_suspected: card.c8_suspected,
          });
        });
      }

      // Sample disease data logging
      if (leprosyCasesForDiseases.length > 0) {
        console.log('Sample leprosy case:', {
          id: leprosyCasesForDiseases[0].id,
          c7_suspected: leprosyCasesForDiseases[0].c7_suspected,
          c7_referral_facility: leprosyCasesForDiseases[0].c7_referral_facility,
          c7_referral_date: leprosyCasesForDiseases[0].c7_referral_date,
        });
      }
      if (tbCasesForDiseases.length > 0) {
        console.log('Sample TB case:', {
          id: tbCasesForDiseases[0].id,
          c8_suspected: tbCasesForDiseases[0].c8_suspected,
          c8_cough_gt14_days: tbCasesForDiseases[0].c8_cough_gt14_days,
          c8_persistent_fever: tbCasesForDiseases[0].c8_persistent_fever,
          c8_referral_facility: tbCasesForDiseases[0].c8_referral_facility,
        });
      }

      const diseasesInsights = {
        respiratory: {
          totalCases: respiratoryCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((respiratoryCases.length / totalCards) * 100) : 0,
          cases: respiratoryCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c5_breathlessness) ? 'Breathlessness' : null,
              isTruthy(c.c5_wheezing) ? 'Wheezing' : null,
            ].filter(Boolean),
            severity: 'Moderate',
            notes: c.notes || '',
          })),
        },
        gastrointestinal: {
          totalCases: 0,
          referralCompletion: 0,
          percent: 0,
          cases: [],
        },
        skin: {
          totalCases: skinCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((skinCases.length / totalCards) * 100) : 0,
          cases: skinCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c4_itching) ? 'Itching' : null,
              isTruthy(c.c4_scaly_lesions) ? 'Scaly Lesions' : null,
              isTruthy(c.c4_round_lesions) ? 'Round Lesions' : null,
            ].filter(Boolean),
            severity: 'Moderate',
            notes: c.notes || '',
          })),
        },
        leprosy: {
          totalCases: leprosyCasesForDiseases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((leprosyCasesForDiseases.length / totalCards) * 100) : 0,
          cases: leprosyCasesForDiseases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: Object.entries(c.c7_skin_characteristics || {}).filter(([k, v]) => v).map(([k, v]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
            severity: 'High',
            notes: c.notes || '',
          })),
        },
        tb: {
          totalCases: tbCasesForDiseases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((tbCasesForDiseases.length / totalCards) * 100) : 0,
          cases: tbCasesForDiseases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c8_cough_gt14_days) ? 'Persistent Cough (>14 days)' : null,
              isTruthy(c.c8_persistent_fever) ? 'Persistent Fever' : null,
              isTruthy(c.c8_weight_loss_gt5_percent) ? 'Weight Loss (>5%)' : null,
              isTruthy(c.c8_reduced_daily_activity) ? 'Reduced Activity' : null,
            ].filter(Boolean),
            severity: 'High',
            notes: c.notes || '',
          })),
        },
        dental: {
          totalCases: dentalCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((dentalCases.length / totalCards) * 100) : 0,
          cases: dentalCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c3_white_discoloration) ? 'White Discoloration' : null,
              isTruthy(c.c3_brown_discoloration) ? 'Brown Discoloration' : null,
              isTruthy(c.c3_gum_swelling) ? 'Gum Swelling' : null,
              isTruthy(c.c3_plaque) ? 'Plaque' : null,
            ].filter(Boolean),
            severity: 'Low',
            notes: c.notes || '',
          })),
        },
        heart: {
          totalCases: heartCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((heartCases.length / totalCards) * 100) : 0,
          cases: heartCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c6_murmur) ? 'Murmur' : null,
            ].filter(Boolean),
            severity: 'High',
            notes: c.notes || '',
          })),
        },
        hearing: {
          totalCases: hearingCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((hearingCases.length / totalCards) * 100) : 0,
          cases: hearingCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c2_assess_hearing) ? 'Hearing Assessment Needed' : null,
              isTruthy(c.c2_otitis_media) ? 'Otitis Media' : null,
            ].filter(Boolean),
            severity: 'Moderate',
            notes: c.notes || '',
          })),
        },
        convulsive: {
          totalCases: convulsiveCases.length,
          referralCompletion: 0,
          percent: totalCards > 0 ? Math.round((convulsiveCases.length / totalCards) * 100) : 0,
          cases: convulsiveCases.slice(0, 20).map(c => ({
            studentId: c.studentId,
            symptoms: [
              isTruthy(c.c1_convulsive) ? 'Convulsive' : null,
            ].filter(Boolean),
            severity: 'High',
            notes: c.notes || '',
          })),
        },
      };

      // Backwards-compatibility: some callers expect a 'vision' key (legacy names); alias it to the new 'convulsive' key
      try {
        (diseasesInsights as any).vision = diseasesInsights.convulsive;
      } catch (e) {
        // no-op if assignment fails for any reason
      }

      console.log('Diseases insights calculated:', {
        respiratory: diseasesInsights.respiratory.totalCases,
        skin: diseasesInsights.skin.totalCases,
        leprosy: diseasesInsights.leprosy.totalCases,
        tb: diseasesInsights.tb.totalCases,
        dental: diseasesInsights.dental.totalCases,
        heart: diseasesInsights.heart.totalCases,
        hearing: diseasesInsights.hearing.totalCases,
        convulsive: diseasesInsights.convulsive.totalCases,
      });

      // Calculate real leprosy analytics
      const leprosyCases = flatCards.filter(c => isTruthy(c.c7_suspected));
      console.log('Leprosy cases found:', leprosyCases.length, 'out of', flatCards.length);
      const leprosyAnalytics = {
        totalSuspectedCases: leprosyCases.length,
        confirmedCases: 0, // Not tracked in current schema
        treatmentCompleted: 0, // Not tracked in current schema
        referralStatus: { completed: leprosyCases.filter(c => c.c7_referral_date || c.c7_referral_facility).length, total: leprosyCases.length },
        facilityLoad: leprosyCases.filter(c => c.c7_referral_facility).map(c => c.c7_referral_facility).filter((v, i, a) => a.indexOf(v) === i && v) as string[],
        subTypeDistribution: (function(){
          const counts = {
            Patchy: leprosyCases.filter(c => c.c7_lesion_type && (c.c7_lesion_type as any).patchy).length,
            Plaque: leprosyCases.filter(c => c.c7_lesion_type && (c.c7_lesion_type as any).plaque).length,
            Nodular: leprosyCases.filter(c => c.c7_lesion_type && (c.c7_lesion_type as any).nodular).length,
            Diffuse: leprosyCases.filter(c => c.c7_lesion_type && (c.c7_lesion_type as any).diffuse_infiltration).length,
          } as any;
          // also provide lowercase keys for compatibility with existing tests/UI
          return Object.assign({}, counts, {
            patchy: counts.Patchy,
            plaque: counts.Plaque,
            nodular: counts.Nodular,
            diffuse: counts.Diffuse,
          });
        })(),
        showRedAlert: leprosyCases.length > 0,
      };

      // Calculate real TB analytics
      const tbCases = flatCards.filter(c => isTruthy(c.c8_suspected));
      console.log('TB cases found:', tbCases.length, 'out of', flatCards.length);
      const tbAnalytics = {
        totalSuspectedCases: tbCases.length,
        confirmedCases: 0, // Not tracked in current schema
        treatmentCompleted: 0, // Not tracked in current schema
        contactHistoryPercent: totalCards > 0 ? Math.round((tbCases.filter(c => isTruthy(c.c8_close_contact_known_tb)).length / totalCards) * 100) : 0,
        referralStatus: { completed: tbCases.filter(c => c.c8_referral_date || c.c8_referral_facility).length, total: tbCases.length },
        dotsCenterLoad: tbCases.filter(c => c.c8_referral_facility).map(c => c.c8_referral_facility).filter((v, i, a) => a.indexOf(v) === i && v) as string[],
        symptomsBreakdown: {
          counts: {
            persistent_cough: tbCases.filter(c => isTruthy(c.c8_cough_gt14_days)).length,
            fever: tbCases.filter(c => isTruthy(c.c8_persistent_fever)).length,
            unexplained_weight_loss: tbCases.filter(c => isTruthy(c.c8_weight_loss_gt5_percent)).length,
            night_sweats: 0, // Not directly tracked in schema
            fatigue: tbCases.filter(c => isTruthy(c.c8_reduced_daily_activity)).length,
          },
          // legacy labels for UI compatibility
          labels: {
            "Persistent Cough (>14 days)": tbCases.filter(c => isTruthy(c.c8_cough_gt14_days)).length,
            "Persistent Fever": tbCases.filter(c => isTruthy(c.c8_persistent_fever)).length,
            "Weight Loss (>5%)": tbCases.filter(c => isTruthy(c.c8_weight_loss_gt5_percent)).length,
            "Reduced Daily Activity": tbCases.filter(c => isTruthy(c.c8_reduced_daily_activity)).length,
            "Close Contact with TB": tbCases.filter(c => isTruthy(c.c8_close_contact_known_tb)).length,
          }
        },

        showRedAlert: tbCases.length > 0,
      };

      // Calculate real developmental delays
      const developmentalDelays = {
        speechDelayPercent: totalCards > 0 ? Math.round((flatCards.filter(c => isTruthy(c.d6_speech_difficulty)).length / totalCards) * 100) : 0,
        motorDelayPercent: totalCards > 0 ? Math.round((flatCards.filter(c => isTruthy(c.d2_walking_delay)).length / totalCards) * 100) : 0,
        cognitiveDelayPercent: totalCards > 0 ? Math.round((flatCards.filter(c => isTruthy(c.d7_learning_difficulty)).length / totalCards) * 100) : 0,
        socialDelayPercent: totalCards > 0 ? Math.round((flatCards.filter(c => isTruthy(c.d9_behavioral_concerns)).length / totalCards) * 100) : 0,
      };

      // Calculate real adolescent health (age 10+)
      console.log('Calculating adolescent health data from', flatCards.length, 'cards');
      
      const adolescents = flatCards.filter((c: any) => {
        // Try ageYears first
        if (c.ageYears && c.ageYears >= 10) return true;
        // Try dateOfBirth second
        if ((c as any).dateOfBirth) {
          const birthYear = new Date((c as any).dateOfBirth).getFullYear();
          const age = new Date().getFullYear() - birthYear;
          return age >= 10;
        }
        // Try calculating from classSection (class 10+ = age 14+)
        if (c.classSection) {
          const classNum = parseInt(c.classSection);
          if (classNum >= 10) return true;
        }
        return false;
      });
      console.log('Adolescents found (age 10+):', adolescents.length, 'out of', flatCards.length);
      
      if (adolescents.length === 0) {
        console.log('DEBUG: Sample cards to check age data:');
        flatCards.slice(0, 3).forEach((c: any) => {
          console.log({
            id: c.id,
            ageYears: c.ageYears,
            dateOfBirth: c.dateOfBirth,
            classSection: c.classSection,
          });
        });
      }
      
      console.log('Adolescent concerns breakdown:', {
        vision: adolescents.filter(c => isTruthy(c.d1_seeing_difficulty)).length,
        hearing: adolescents.filter(c => isTruthy(c.d5_hearing_difficulty)).length,
        learning: adolescents.filter(c => isTruthy(c.d7_learning_difficulty)).length,
        motor: adolescents.filter(c => isTruthy(c.d2_walking_delay)).length,
        behavioral: adolescents.filter(c => isTruthy(c.d9_behavioral_concerns)).length,
      });

      const adolescentHealth = {
        totalAdolescents: adolescents.length,
        adolescentCardCount: adolescents.length,
        screenedPercent: totalCards > 0 ? Math.round((adolescents.length / totalCards) * 100) : 0,
        
        // Developmental delay concerns
        visionConcerns: adolescents.filter(c => isTruthy(c.d1_seeing_difficulty)).length,
        visionConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d1_seeing_difficulty)).length / adolescents.length) * 100) : 0,
        
        hearingConcerns: adolescents.filter(c => isTruthy(c.d5_hearing_difficulty)).length,
        hearingConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d5_hearing_difficulty)).length / adolescents.length) * 100) : 0,
        
        learningConcerns: adolescents.filter(c => isTruthy(c.d7_learning_difficulty)).length,
        learningConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d7_learning_difficulty)).length / adolescents.length) * 100) : 0,
        
        motorConcerns: adolescents.filter(c => isTruthy(c.d2_walking_delay)).length,
        motorConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d2_walking_delay)).length / adolescents.length) * 100) : 0,
        
        behavioralConcerns: adolescents.filter(c => isTruthy(c.d9_behavioral_concerns)).length,
        behavioralConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d9_behavioral_concerns)).length / adolescents.length) * 100) : 0,
        
        speechConcerns: adolescents.filter(c => isTruthy(c.d6_speech_difficulty)).length,
        speechConcernsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.d6_speech_difficulty)).length / adolescents.length) * 100) : 0,
        
        // Physical health
        anemiaPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.b3_severe_anemia)).length / adolescents.length) * 100) : 0,
        obesityPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => {
          const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
          return bmi && bmi >= 25;
        }).length / adolescents.length) * 100) : 0,
        underweightPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => {
          const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
          return bmi && bmi < 18.5;
        }).length / adolescents.length) * 100) : 0,
        
        // Mental health and well-being (Section E)
        emotionalDistressPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e1_life_events_difficulty)).length / adolescents.length) * 100) : 0,
        emotionalDistressConcerns: adolescents.filter(c => isTruthy(c.e1_life_events_difficulty)).length,
        
        peerPressurePercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e2_peer_pressure_substance)).length / adolescents.length) * 100) : 0,
        peerPressureConcerns: adolescents.filter(c => isTruthy(c.e2_peer_pressure_substance)).length,
        
        depressionSymptomsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e3_persistent_sadness)).length / adolescents.length) * 100) : 0,
        depressionSymptomsConcerns: adolescents.filter(c => isTruthy(c.e3_persistent_sadness)).length,
        
        // Reproductive health (non-menstrual)
        reproductiveHealthIssuesPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e5_pain_urination) || isTruthy(c.e6_foul_discharge)).length / adolescents.length) * 100) : 0,
        reproductiveHealthConcerns: adolescents.filter(c => isTruthy(c.e5_pain_urination) || isTruthy(c.e6_foul_discharge)).length,
        utiSymptomsPercent: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e5_pain_urination) || isTruthy(c.e6_foul_discharge)).length / adolescents.length) * 100) : 0,
        utiSymptomsConcerns: adolescents.filter(c => isTruthy(c.e5_pain_urination) || isTruthy(c.e6_foul_discharge)).length,
        
        painUrinationCount: adolescents.filter(c => isTruthy(c.e5_pain_urination)).length,
        foulDischargeCount: adolescents.filter(c => isTruthy(c.e6_foul_discharge)).length,
        
        // Mental health issues
        mentalHealthConcerns: adolescents.length > 0 ? Math.round((adolescents.filter(c => isTruthy(c.e1_life_events_difficulty) || isTruthy(c.e3_persistent_sadness)).length / adolescents.length) * 100) : 0,
        
        // Comprehensive case samples
        samples: adolescents.slice(0, 10).map(c => ({
          studentId: c.studentId,
          ageYears: c.ageYears ?? null,
          gender: c.gender || null,
          visionConcern: isTruthy(c.d1_seeing_difficulty),
          hearingConcern: isTruthy(c.d5_hearing_difficulty),
          learningConcern: isTruthy(c.d7_learning_difficulty),
          motorConcern: isTruthy(c.d2_walking_delay),
          behavioralConcern: isTruthy(c.d9_behavioral_concerns),
          e1_life_events_difficulty: isTruthy(c.e1_life_events_difficulty),
          e2_peer_pressure_substance: isTruthy(c.e2_peer_pressure_substance),
          e3_persistent_sadness: isTruthy(c.e3_persistent_sadness),
          e5_pain_urination: isTruthy(c.e5_pain_urination),
          e6_foul_discharge: isTruthy(c.e6_foul_discharge),
          bmi: c.bmi || null,
          anemia: isTruthy(c.b3_severe_anemia),
        }))
      };
      console.log('Adolescent health metrics:', adolescentHealth);

      // Calculate real referral management using the referrals table (fallback to health-card derived referrals if table empty)
      // IMPORTANT: Fetch referrals ONLY for schools in the PO's district
      console.log('Fetching referrals for', schools.length, 'schools in district:', poDistrict);
      const allReferrals = await Promise.all(
        schools.map(async (school) => {
          try {
            const { referrals } = await storage.getReferrals({ schoolId: school.id, limit: 1000 });
            return referrals;
          } catch (error) {
            console.warn(`Referrals table not available for school ${school.id}:`, error);
            return [];
          }
        })
      );
      let flatReferrals = allReferrals.flat();
      console.log('Total referrals found for PO district:', flatReferrals.length);

      // If there are no explicit referrals in DB, derive referrals from health-cards as a best-effort fallback
      if (!flatReferrals.length) {
        console.log('No referrals found in referrals table; deriving referrals from health cards as fallback');
        console.log('Available health cards for derivation:', flatCards.length);
        const derived = flatCards.map((c: any) => {
          // Detect referral-related flags on the card
          const issues: string[] = [];
          if (c.referral_adolescent_yes || c.adolescent_any) issues.push('Adolescent');
          if (c.referral_disease_yes || c.disease_any) issues.push('Disease');
          if (c.referral_leprosy_yes || c.c7_suspected) issues.push('Leprosy');
          if (c.referral_tb_yes || c.c8_suspected) issues.push('TB');
          if (c.referral_deficiency_yes) issues.push('Deficiency');

          if (!c.referral_recommended && issues.length === 0) return null;

          const referralDate = c.referral_adolescent_facility_date || c.referral_disease_facility_date || c.referral_leprosy_facility_date || c.referral_tb_facility_date || c.date_of_visit || c.dateOfEntry || c.createdAt || new Date();

          return {
            id: `derived-${c.id}`,
            studentId: c.studentId,
            schoolId: c.schoolId,
            referralDate,
            status: 'Pending',
            issue: issues.join(', ') || 'Referral Recommended',
            referralType: issues[0] || 'General',
            facility: c.referral_adolescent_facility || c.referral_disease_facility || c.referral_leprosy_facility || c.referral_tb_facility || null,
            createdAt: c.createdAt || new Date(),
          };
        }).filter(Boolean);

        flatReferrals = derived as any[];
        console.log('Derived referrals from health cards:', flatReferrals.length);
      }

      // For referral management, use ALL district referrals (not month-filtered)
      // This ensures PO sees the complete picture of their district's referral activities
      const allDistrictReferrals = flatReferrals;
      
      // Also create month-filtered version for drill-down analysis (optional)
      const monthReferrals = flatReferrals.filter(r => {
        const referralDate = new Date(r.referralDate);
        // Handle missing/null dates by including them
        if (!referralDate || isNaN(referralDate.getTime())) return true;
        return referralDate.getMonth() + 1 === selectedMonth && referralDate.getFullYear() === selectedYear;
      });
      
      console.log(`Total district referrals: ${allDistrictReferrals.length}`);
      console.log(`Referrals for selected month/year (${selectedMonth}/${selectedYear}):`, monthReferrals.length);
      console.log('Sample referrals:', flatReferrals.slice(0, 3).map(r => ({ 
        id: r.id, 
        referralDate: r.referralDate, 
        issue: r.issue, 
        status: r.status 
      })));

      // Build a referral map by student to enable disease->referral linkage (used to compute completion rates)
      const referralMapByStudent = new Map<string, any[]>();
      flatReferrals.forEach(r => {
        if (!r.studentId) return;
        const list = referralMapByStudent.get(r.studentId) || [];
        list.push(r);
        referralMapByStudent.set(r.studentId, list);
      });

      // Compute pending referrals per deficiency (match by issue text keywords)
      try {
        const deficiencyKeywords: Record<string, string[]> = {
          vitaminA: ['vitamin a'],
          vitaminD: ['vitamin d'],
          iron: ['anemia', 'iron'],
          iodine: ['goitre', 'iodine'],
          zinc: ['zinc'],
        };

        Object.entries(deficiencyKeywords).forEach(([defKey, keywords]) => {
          let pendingCount = 0;
          const ids = (deficiencyStudentSets as any)[defKey];
          if (!ids) return;
          ids.forEach((sid: string) => {
            const refs = referralMapByStudent.get(sid) || [];
            if (refs.some((r: any) => r.status === 'Pending' && r.issue && keywords.some(k => r.issue.toLowerCase().includes(k)))) {
              pendingCount++;
            }
          });
          if (deficienciesInsights[defKey]) deficienciesInsights[defKey].pendingReferrals = pendingCount;
        });
      } catch (err) {
        console.warn('Failed to compute deficiency pending referrals:', (err as any)?.message || err);
      }

      // Helper: normalize issue strings to concise labels for PO dashboard display
      const simplifyIssue = (issue: any) => {
        if (!issue) return 'Referral Recommended';
        const s = (issue || '').toString().toLowerCase();
        if (s.includes('leprosy') || s.includes('c7')) return 'Leprosy suspected';
        if (s.includes('tb') || s.includes('tuberculosis') || s.includes('c8')) return 'Tuberculosis suspected';
        if ((s.includes('severe') && s.includes('anemia')) || s.includes('b3_severe_anemia') || (s.includes('anemia') && !s.includes('mild'))) return 'Severe anemia detected';
        if (s.includes('anemia')) return 'Anemia detected';
        if (s.includes('goitre') || s.includes('b6_goitre')) return 'Goitre detected';
        if (s.includes('vitamin a') || s.includes('vitamin_a')) return 'Vitamin A deficiency';
        if (s.includes('vitamin d') || s.includes('vitamin_d')) return 'Vitamin D deficiency';
        if (s.includes('obesity')) return 'Obesity detected';
        if (s.includes('dental')) return 'Dental issue';
        if (s.includes('skin')) return 'Skin condition';
        if (s.includes('hearing')) return 'Hearing impairment';
        if (s.includes('vision') || s.includes('seeing')) return 'Vision impairment';
        if (s.includes('adolescent') || s.includes('e1') || s.includes('e3')) return 'Adolescent health concern';
        if (s.includes('deficiency')) return 'Deficiency detected';
        if (s.includes('disease')) return 'Disease';
        // Fallback: trim long symptom lists to first 60 chars to avoid very long strings
        const trimmed = issue.toString().split(/\n|;/)[0].trim();
        return trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed;
      };

      const referralManagement = {
        totalReferralsGenerated: allDistrictReferrals.length,
        referralCompletionPercent: allDistrictReferrals.length > 0 ? Math.round((allDistrictReferrals.filter(r => r.status === "Completed").length / allDistrictReferrals.length) * 100) : 0,
        pendingReferralsList: await Promise.all(
          allDistrictReferrals.filter(r => r.status === "Pending").slice(0, 10).map(async (referral) => {
            const student = await storage.getStudent(referral.studentId);
            const school = schools.find(s => s.id === referral.schoolId);

            return {
              studentId: student?.id || referral.studentId,
              studentName: student?.fullName || "Unknown Student",
              schoolName: school?.name || "Unknown School",
              issue: simplifyIssue(referral.issue),
              category: referral.referralType,
              facility: referral.facility || "PHC Center",
              daysPending: Math.floor((new Date().getTime() - new Date(referral.referralDate).getTime()) / (1000 * 60 * 60 * 24)),
            };
          })
        ),
        pendingReferrals: allDistrictReferrals.filter(r => r.status === "Pending").length,
        overdueReferrals: await Promise.all(
          allDistrictReferrals.filter(r => {
            const daysSinceReferral = Math.floor((new Date().getTime() - new Date(r.referralDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceReferral > 30 && r.status === "Pending";
          }).slice(0, 5).map(async (referral) => {
            const student = await storage.getStudent(referral.studentId);
            const school = schools.find(s => s.id === referral.schoolId);

            return {
              studentId: student?.id || referral.studentId,
              studentName: student?.fullName || "Unknown Student",
              schoolName: school?.name || "Unknown School",
              issue: simplifyIssue(referral.issue),
              daysOverdue: Math.floor((new Date().getTime() - new Date(referral.referralDate).getTime()) / (1000 * 60 * 60 * 24)) - 30,
            };
          })
        ),
        facilityWiseLoad: (() => {
          const facilityMap = new Map<string, { pending: number; completed: number }>();

          allDistrictReferrals.forEach(referral => {
            const facility = referral.facility || "PHC Center";
            if (!facilityMap.has(facility)) {
              facilityMap.set(facility, { pending: 0, completed: 0 });
            }
            if (referral.status === "Pending") {
              facilityMap.get(facility)!.pending++;
            } else if (referral.status === "Completed") {
              facilityMap.get(facility)!.completed++;
            }
          });

          return Array.from(facilityMap.entries()).map(([facility, counts]) => ({
            facility,
            pending: counts.pending,
            completed: counts.completed,
          }));
        })(),
        mostReferredSchools: (() => {
          const schoolReferralCount = new Map<string, { schoolName: string; count: number }>();

          allDistrictReferrals.forEach(referral => {
            const school = schools.find(s => s.id === referral.schoolId);
            if (school) {
              const existing = schoolReferralCount.get(school.id) || { schoolName: school.name, count: 0 };
              schoolReferralCount.set(school.id, { ...existing, count: existing.count + 1 });
            }
          });

          return Array.from(schoolReferralCount.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(item => ({
              schoolId: Array.from(schoolReferralCount.keys())[Array.from(schoolReferralCount.values()).indexOf(item)],
              schoolName: item.schoolName,
              referralCount: item.count,
            }));
        })(),
        mostReferredIssues: (() => {
          const issueCount = new Map<string, number>();

          allDistrictReferrals.forEach(referral => {
            const existing = issueCount.get(referral.issue) || 0;
            issueCount.set(referral.issue, existing + 1);
          });

          return Array.from(issueCount.entries())
            .map(([issue, count]) => ({ issue, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        })(),
      };

      // Use referrals data and health-card fields to compute disease referral completions (prefer health-card data)
      try {
        // Collect completed referrals from the referrals table by student id
        const completedFromReferralsLeprosy = new Set<string>();
        const completedFromReferralsTB = new Set<string>();
        flatReferrals.forEach(r => {
          if (!r || !r.studentId) return;
          const issue = (r.issue || '').toString().toLowerCase();
          if (r.status === 'Completed' && issue.includes('leprosy')) completedFromReferralsLeprosy.add(r.studentId);
          if (r.status === 'Completed' && (issue.includes('tb') || issue.includes('tuberculosis'))) completedFromReferralsTB.add(r.studentId);
        });

        // Collect completed referrals from the health cards (fields or nested objects)
        const completedFromCardsLeprosy = new Set<string>(leprosyCases.filter(c => {
          const sid = c.studentId || c.id || null;
          if (!sid) return false;
          return !!((c as any).referral_leprosy_facility_date || ((c as any).c7 && ((c as any).c7 as any).referral_facility) || ((c as any).c7 && ((c as any).c7 as any).referral_date) || (c as any).referral_leprosy_yes);
        }).map(c => c.studentId).filter(Boolean));

        const completedFromCardsTB = new Set<string>(tbCases.filter(c => {
          const sid = c.studentId || c.id || null;
          if (!sid) return false;
          return !!((c as any).referral_tb_facility_date || ((c as any).c8 && ((c as any).c8 as any).referral_facility) || ((c as any).c8 && ((c as any).c8 as any).referral_date) || (c as any).c8_referral_date);
        }).map(c => c.studentId).filter(Boolean));

        // Union the sets to get final completed counts (prefer health-card evidence, but include referrals table as fallback)
        const leprosyCompletedSet = new Set<string>([...Array.from(completedFromReferralsLeprosy), ...Array.from(completedFromCardsLeprosy)]);
        const tbCompletedSet = new Set<string>([...Array.from(completedFromReferralsTB), ...Array.from(completedFromCardsTB)]);

        const leprosyReferralCompleted = leprosyCompletedSet.size;
        const tbReferralCompleted = tbCompletedSet.size;

        // Update diseasesInsights and analytics accordingly
        if (diseasesInsights && diseasesInsights.leprosy) {
          diseasesInsights.leprosy.referralCompletion = leprosyReferralCompleted;
        }
        if (diseasesInsights && diseasesInsights.tb) {
          diseasesInsights.tb.referralCompletion = tbReferralCompleted;
        }

        if (typeof leprosyAnalytics === 'object') {
          leprosyAnalytics.referralStatus = { completed: leprosyReferralCompleted, total: leprosyCases.length };
        }
        if (typeof tbAnalytics === 'object') {
          tbAnalytics.referralStatus = { completed: tbReferralCompleted, total: tbCases.length };
        }
      } catch (err) {
        console.warn('Failed to compute disease referral completions:', (err as any)?.message || err);
      }

      // Calculate real compliance analytics
      const complianceAnalytics = {
        dataCompletenessPercent: totalCards > 0 ? Math.round((flatCards.filter(c => c.bmi && c.heightCm && c.weightKg).length / totalCards) * 100) : 0,
        invalidBMI: flatCards.filter(c => {
          const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
          return bmi && (bmi < 10 || bmi > 50);
        }).length,
        incompleteCriticalCases: flatCards.filter(c => (isTruthy(c.c7_suspected) || isTruthy(c.c8_suspected)) && !c.referral_recommended).length,
        healthCardCompliance: districtKPIs.healthCardCompletionRate,
        checkupCompliance: districtKPIs.checkupCoverageRate,
        reportingCompliance: districtKPIs.healthCardCompletionRate, // Use actual health card completion rate
        overallCompliance: Math.round((districtKPIs.healthCardCompletionRate + districtKPIs.checkupCoverageRate) / 2),
        auditLogs: {
          invalidBMI: flatCards.filter(c => {
            const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi) : null);
            return bmi && (bmi < 10 || bmi > 50);
          }).length,
          incompleteC7C8: flatCards.filter(c => (isTruthy(c.c7_suspected) || isTruthy(c.c8_suspected)) && !c.referral_recommended).length,
        }
      };

      // Calculate real alerts
      const alerts = {
        leprosyAlert: leprosyCases.length > 0,
        tbAlert: tbCases.length > 0,
        severeAnemiaAlert: severeAnemia > 0,
      };

      // Export capabilities
      const exportCapabilities = {
        availableFormats: ["pdf", "excel", "json"],
        lastExportDate: null,
        exportHistory: [],
      };

      // Metadata
      const metadata = {
        generatedAt: new Date().toISOString(),
        dataFreshness: "real-time",
        coverage: `${schools.length} schools, ${totalStudents} students`,
        lastUpdated: new Date().toISOString(),
      };

      // Before returning the response, enforce role-based payload rules
      // For Program Officers (PO), we intentionally do NOT return the full pendingReferralsList
      // to keep the PO payload concise (only aggregated counts are returned). Admins still receive the list.
      if (req.user && req.user.role === 'PO') {
        try {
          // Remove detailed list for PO only
          if ((referralManagement as any).pendingReferralsList) delete (referralManagement as any).pendingReferralsList;
        } catch (e) {
          // ignore errors
        }
      }

      // Final verification before response
      console.log('========== FINAL DATA SUMMARY BEFORE RESPONSE ==========');
      console.log('Total Cards Fetched:', flatCards.length);
      console.log('Disease Insights Summary:', {
        respiratory: { totalCases: diseasesInsights.respiratory.totalCases, percent: diseasesInsights.respiratory.percent },
        skin: { totalCases: diseasesInsights.skin.totalCases, percent: diseasesInsights.skin.percent },
        leprosy: { totalCases: diseasesInsights.leprosy.totalCases, percent: diseasesInsights.leprosy.percent },
        tb: { totalCases: diseasesInsights.tb.totalCases, percent: diseasesInsights.tb.percent },
        dental: { totalCases: diseasesInsights.dental.totalCases, percent: diseasesInsights.dental.percent },
        heart: { totalCases: diseasesInsights.heart.totalCases, percent: diseasesInsights.heart.percent },
        hearing: { totalCases: diseasesInsights.hearing.totalCases, percent: diseasesInsights.hearing.percent },
        convulsive: { totalCases: diseasesInsights.convulsive.totalCases, percent: diseasesInsights.convulsive.percent },
      });
      console.log('Leprosy Analytics:', {
        totalSuspectedCases: leprosyAnalytics?.totalSuspectedCases || 0,
        referralCompleted: leprosyAnalytics?.referralStatus?.completed || 0,
        referralTotal: leprosyAnalytics?.referralStatus?.total || 0,
      });
      console.log('TB Analytics:', {
        totalSuspectedCases: tbAnalytics?.totalSuspectedCases || 0,
        contactHistory: tbAnalytics?.contactHistoryPercent || 0,
        referralCompleted: tbAnalytics?.referralStatus?.completed || 0,
        referralTotal: tbAnalytics?.referralStatus?.total || 0,
      });
      console.log('Developmental Delays:', developmentalDelays);
      console.log('Adolescent Health:', {
        totalAdolescents: adolescentHealth.totalAdolescents,
        screenedPercent: adolescentHealth.screenedPercent,
        mentalHealthConcerns: adolescentHealth.mentalHealthConcerns,
        utiSymptomsConcerns: adolescentHealth.utiSymptomsConcerns,
      });
      console.log('========== RESPONSE READY TO SEND ==========');

      res.json({
        districtKPIs,
        referralHeatmap,
        anthropometryAnalytics,
        deficienciesInsights,
        deficienciesHeatmap,
        diseasesInsights,
        leprosyAnalytics,
        tbAnalytics,
        developmentalDelays,
        adolescentHealth,
        menstrualHealthAnalytics: menstrualAnalytics,
        referralManagement,
        complianceAnalytics,
        alerts,
        exportCapabilities,
        metadata,
        metrics,
        schools: schoolsWithMetrics,
      });
    } catch (error: any) {
      const errorMessage = (error && (error.message || String(error))) || "Failed to fetch dashboard data";
      console.error("PO dashboard error:", errorMessage);
      res.status(500).json({ message: errorMessage });
    }
  });

// Helper functions for unified report generation
async function generateMenstrualHealthReport(students: any[], schools: any[], month?: string, year?: string) {
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();
  const selectedMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  
  // Filter for eligible female students
  const eligibleStudents = students.filter(student => {
    if (student.gender !== 'F' || !student.dateOfBirth) return false;
    const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return age >= 10;
  });
  
  // Get period tracker data
  const periodDataPromises = eligibleStudents.map(async (student) => {
    try {
      const { entries } = await storage.getPeriodTrackerEntries({
        studentId: student.id,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        limit: 1000
      });
      return { student, entries };
    } catch (error) {
      console.error('Error fetching period data for student', student.id, ':', error);
      return { student, entries: [] };
    }
  });
  
  const periodData = await Promise.all(periodDataPromises);
  
  // Analyze data
  const summary = {
    totalEligibleStudents: eligibleStudents.length,
    studentsWithData: periodData.filter(d => d.entries.length > 0).length,
    totalEntries: periodData.reduce((sum, d) => sum + d.entries.length, 0),
    averageEntriesPerStudent: 0,
    commonSymptoms: {},
    referralRate: 0
  };
  
  if (summary.studentsWithData > 0) {
    summary.averageEntriesPerStudent = Math.round(summary.totalEntries / summary.studentsWithData);
  }
  
  // Analyze symptoms
  const symptomCounts: Record<string, number> = {};
  let totalReferrals = 0;
  
  periodData.forEach(({ entries }) => {
    entries.forEach(entry => {
      if (entry.symptoms && Array.isArray(entry.symptoms)) {
        entry.symptoms.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
      }
      if (entry.isReferred) totalReferrals++;
    });
  });
  
  summary.commonSymptoms = Object.entries(symptomCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .reduce((acc: Record<string, number>, [symptom, count]) => {
      acc[symptom] = count as number;
      return acc;
    }, {});
    
  summary.referralRate = summary.totalEntries > 0 ? Math.round((totalReferrals / summary.totalEntries) * 100) : 0;
  
  // Detailed student data
  const detailedData = periodData.map(({ student, entries }) => {
    const latestEntry = entries.length > 0 ? entries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0] : null;
    
    return {
      studentId: student.id,
      studentName: student.fullName,
      age: Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)),
      school: student.schoolName,
      classSection: student.classSection,
      totalEntries: entries.length,
      lastEntryDate: latestEntry?.entryDate || null,
      hasReferrals: entries.some(e => e.isReferred),
      menstruationStarted: !!student.menstruationStartedAt
    };
  });
  
  return {
    reportType: 'menstrual-health',
    generatedAt: new Date().toISOString(),
    period: { month: selectedMonth, year: selectedYear },
    summary,
    detailedData,
    schools: schools.map(s => ({ id: s.id, name: s.name }))
  };
}

async function generateHealthOverviewReport(students: any[], schools: any[], month?: string, year?: string) {
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();
  
  // Get health cards for all students
  const healthDataPromises = students.map(async (student) => {
    try {
      const { cards } = await storage.getAnnualHealthCards({ 
        studentId: student.id, 
        year: selectedYear,
        limit: 10 
      });
      return { student, healthCard: cards[0] || null };
    } catch (error) {
      console.error('Error fetching health data for student', student.id, ':', error);
      return { student, healthCard: null };
    }
  });
  
  const healthData = await Promise.all(healthDataPromises);
  
  // Calculate summary statistics
  const summary = {
    totalStudents: students.length,
    studentsWithHealthCards: healthData.filter(d => d.healthCard).length,
    averageBMI: 0,
    nutritionStatus: { underweight: 0, normal: 0, overweight: 0, obese: 0 },
    commonDeficiencies: {},
    referralRate: 0
  };
  
  let totalBMI = 0;
  let bmiCount = 0;
  const deficiencyCounts: Record<string, number> = {};
  let totalReferrals = 0;
  
  healthData.forEach(({ healthCard }) => {
    if (!healthCard) return;
    
    // BMI analysis
    const bmi = typeof healthCard.bmi === 'number' ? healthCard.bmi : 
                (typeof healthCard.bmi === 'string' ? parseFloat(healthCard.bmi) : null);
    
    if (bmi && !isNaN(bmi)) {
      totalBMI += bmi;
      bmiCount++;
      
      if (bmi < 18.5) summary.nutritionStatus.underweight++;
      else if (bmi < 25) summary.nutritionStatus.normal++;
      else if (bmi < 30) summary.nutritionStatus.overweight++;
      else summary.nutritionStatus.obese++;
    }
    
    // Deficiency analysis
    if (healthCard.deficiencies && Array.isArray(healthCard.deficiencies)) {
      healthCard.deficiencies.forEach(def => {
        deficiencyCounts[def] = (deficiencyCounts[def] || 0) + 1;
      });
    }
    
    // Count referrals (simplified)
    if (healthCard.referral_deficiency_yes || healthCard.referral_disease_yes || 
        healthCard.referral_developmental_yes || healthCard.referral_adolescent_yes) {
      totalReferrals++;
    }
  });
  
  if (bmiCount > 0) {
    summary.averageBMI = Math.round((totalBMI / bmiCount) * 10) / 10;
  }
  
  summary.commonDeficiencies = Object.entries(deficiencyCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .reduce((acc: Record<string, number>, [def, count]) => {
      acc[def] = count as number;
      return acc;
    }, {});
    
  summary.referralRate = summary.studentsWithHealthCards > 0 ? 
    Math.round((totalReferrals / summary.studentsWithHealthCards) * 100) : 0;
  
  // Detailed student data
  const detailedData = healthData.map(({ student, healthCard }) => ({
    studentId: student.id,
    studentName: student.fullName,
    age: student.dateOfBirth ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null,
    gender: student.gender,
    school: student.schoolName,
    classSection: student.classSection,
    hasHealthCard: !!healthCard,
    bmi: healthCard?.bmi || null,
    deficiencies: healthCard?.deficiencies || [],
    hasReferrals: !!(healthCard?.referral_deficiency_yes || 
                     healthCard?.referral_disease_yes || healthCard?.referral_developmental_yes || 
                     healthCard?.referral_adolescent_yes)
  }));
  
  return {
    reportType: 'health-overview',
    generatedAt: new Date().toISOString(),
    period: { year: selectedYear },
    summary,
    detailedData,
    schools: schools.map(s => ({ id: s.id, name: s.name }))
  };
}

async function generateReferralsReport(students: any[], schools: any[], month?: string, year?: string) {
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();
  const selectedMonth = month ? parseInt(month) : null;
  
  // Get referrals for all schools
  const referralDataPromises = schools.map(async (school) => {
    try {
      const { referrals } = await storage.getReferrals({ schoolId: school.id, limit: 1000 });
      
      // Filter by date if specified
      const filteredReferrals = referrals.filter(referral => {
        const referralDate = new Date(referral.referralDate);
        const matchesYear = referralDate.getFullYear() === selectedYear;
        const matchesMonth = !selectedMonth || (referralDate.getMonth() + 1 === selectedMonth);
        return matchesYear && matchesMonth;
      });
      
      return { school, referrals: filteredReferrals };
    } catch (error) {
      console.error('Error fetching referrals for school', school.id, ':', error);
      return { school, referrals: [] };
    }
  });
  
  const referralData = await Promise.all(referralDataPromises);
  const allReferrals = referralData.flatMap(d => d.referrals.map(r => ({ ...r, schoolName: d.school.name })));
  
  // Calculate summary
  const summary = {
    totalReferrals: allReferrals.length,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    byFacility: {} as Record<string, number>,
    completionRate: 0
  };
  
  allReferrals.forEach(referral => {
    // By status
    const status = referral.status || 'Unknown';
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    
    // By type
    const type = referral.referralType || 'Unknown';
    summary.byType[type] = (summary.byType[type] || 0) + 1;
    
    // By facility
    const facility = referral.facility || 'Unknown';
    summary.byFacility[facility] = (summary.byFacility[facility] || 0) + 1;
  });
  
  const completedReferrals = allReferrals.filter(r => r.status === 'Completed').length;
  summary.completionRate = summary.totalReferrals > 0 ? 
    Math.round((completedReferrals / summary.totalReferrals) * 100) : 0;
  
  return {
    reportType: 'referrals',
    generatedAt: new Date().toISOString(),
    period: { month: selectedMonth, year: selectedYear },
    summary,
    detailedData: allReferrals,
    schools: schools.map(s => ({ id: s.id, name: s.name }))
  };
}

async function generateStudentDemographicsReport(students: any[], schools: any[]) {
  // Calculate demographics
  const summary = {
    totalStudents: students.length,
    byGender: { M: 0, F: 0, O: 0 } as Record<string, number>,
    byAgeGroup: { '5-10': 0, '11-15': 0, '16-18': 0, '18+': 0 } as Record<string, number>,
    bySchool: {} as Record<string, number>,
    averageAge: 0
  };
  
  let totalAge = 0;
  let ageCount = 0;
  
  students.forEach(student => {
    // Gender distribution
    if (student.gender in summary.byGender) {
      summary.byGender[student.gender]++;
    }
    
    // Age distribution
    if (student.dateOfBirth) {
      const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      totalAge += age;
      ageCount++;
      
      if (age <= 10) summary.byAgeGroup['5-10']++;
      else if (age <= 15) summary.byAgeGroup['11-15']++;
      else if (age <= 18) summary.byAgeGroup['16-18']++;
      else summary.byAgeGroup['18+']++;
    }
    
    // School distribution
    const school = student.schoolName || 'Unknown';
    summary.bySchool[school] = (summary.bySchool[school] || 0) + 1;
  });
  
  if (ageCount > 0) {
    summary.averageAge = Math.round((totalAge / ageCount) * 10) / 10;
  }
  
  return {
    reportType: 'student-demographics',
    generatedAt: new Date().toISOString(),
    summary,
    detailedData: students.map(student => ({
      studentId: student.id,
      studentName: student.fullName,
      age: student.dateOfBirth ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null,
      gender: student.gender,
      school: student.schoolName,
      classSection: student.classSection,
      enrollmentDate: student.enrollmentDate,
      isActive: student.isActive
    })),
    schools: schools.map(s => ({ id: s.id, name: s.name }))
  };
}

async function generateExcelReport(workbook: ExcelJS.Workbook, reportData: any, reportType: string, userRole: string) {
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Report Type', reportType]);
  summarySheet.addRow(['Generated At', reportData.generatedAt]);
  summarySheet.addRow(['User Role', userRole]);
  summarySheet.addRow(['Period', reportData.period ? JSON.stringify(reportData.period) : 'All Time']);
  summarySheet.addRow([]);
  
  // Add summary data
  if (reportData.summary) {
    summarySheet.addRow(['Summary Statistics']);
    Object.entries(reportData.summary).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        summarySheet.addRow([key, JSON.stringify(value)]);
      } else {
        summarySheet.addRow([key, value]);
      }
    });
  }
  
  // Detailed data sheet
  if (reportData.detailedData && reportData.detailedData.length > 0) {
    const dataSheet = workbook.addWorksheet('Detailed Data');
    const firstRow = reportData.detailedData[0];
    const headers = Object.keys(firstRow);
    
    dataSheet.addRow(headers);
    
    reportData.detailedData.forEach((row: any) => {
      const values = headers.map(header => {
        const value = row[header];
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value;
      });
      dataSheet.addRow(values);
    });
    
    // Style the header row
    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  }
  
  // Schools sheet
  if (reportData.schools && reportData.schools.length > 0) {
    const schoolsSheet = workbook.addWorksheet('Schools');
    schoolsSheet.addRow(['School ID', 'School Name']);
    reportData.schools.forEach((school: any) => {
      schoolsSheet.addRow([school.id, school.name]);
    });
  }
}

async function generatePDFReport(reportData: any, reportType: string, userRole: string): Promise<Buffer> {
  const doc = new (PDFDocument as any)();
  const chunks: Buffer[] = [];
  
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Header
    doc.fontSize(20).text(`${reportType.toUpperCase().replace('-', ' ')} REPORT`, { align: 'center' });
    doc.fontSize(12).text(`Generated for: ${userRole}`, { align: 'center' });
    doc.text(`Generated at: ${new Date(reportData.generatedAt).toLocaleString()}`, { align: 'center' });
    
    if (reportData.period) {
      doc.text(`Period: ${JSON.stringify(reportData.period)}`, { align: 'center' });
    }
    
    doc.moveDown(2);
    
    // Summary section
    if (reportData.summary) {
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown();
      
      Object.entries(reportData.summary).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          doc.fontSize(12).text(`${key}: ${JSON.stringify(value)}`);
        } else {
          doc.fontSize(12).text(`${key}: ${value}`);
        }
      });
      
      doc.moveDown(2);
    }
    
    // Schools section
    if (reportData.schools && reportData.schools.length > 0) {
      doc.fontSize(16).text('Schools Included', { underline: true });
      doc.moveDown();
      
      reportData.schools.forEach((school: any) => {
        doc.fontSize(12).text(`• ${school.name} (ID: ${school.id})`);
      });
      
      doc.moveDown(2);
    }
    
    // Note about detailed data
    if (reportData.detailedData && reportData.detailedData.length > 0) {
      doc.fontSize(14).text(`Detailed Data: ${reportData.detailedData.length} records`);
      doc.fontSize(10).text('(For detailed data, please use Excel export format)');
    }
    
    doc.end();
  });
}

  // Unified Report Generation API for all roles
  app.get("/api/reports/unified", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { type, format = 'excel', month, year, schoolId, classSection } = req.query;
      const userRole = req.user!.role;
      const userId = req.user!.id;
      
      console.log('Unified report request:', { type, format, userRole, month, year, schoolId, classSection });
      
      // Validate report type
      const validTypes = ['menstrual-health', 'health-overview', 'referrals', 'student-demographics'];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({ message: 'Invalid report type' });
      }
      
      // Get user context for role-based filtering
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let schools: any[] = [];
      let students: any[] = [];
      
      // Role-based data access
      switch (userRole) {
        case 'PO':
        case 'Admin':
          if (userRole === 'PO' && user.district) {
            const allSchools = await storage.getSchools(1, 1000);
            schools = allSchools.schools.filter(s => sameDistrict(s.district, user.district || ''));
          } else if (userRole === 'Admin') {
            const allSchools = await storage.getSchools(1, 1000);
            schools = allSchools.schools;
          }
          break;
          
        case 'Headmaster':
        case 'Lady Superintendent':
        case 'MedicalTeam':
        case 'MealSuperintendent':
        case 'HostelWarden':
          if (user.schoolId) {
            const school = await storage.getSchool(user.schoolId);
            if (school) schools = [school];
          }
          break;
          
        case 'ClassTeacher':
          if (user.schoolId) {
            const school = await storage.getSchool(user.schoolId);
            if (school) schools = [school];
          }
          break;
          
        default:
          return res.status(403).json({ message: 'Unauthorized role for reports' });
      }
      
      if (schools.length === 0) {
        return res.status(400).json({ message: 'No schools accessible for this user' });
      }
      
      // Get students based on role and filters
      const allStudentsPromises = schools.map(async (school) => {
        const params: any = { schoolId: school.id, limit: 1000 };
        
        // Apply role-specific filters
        if (userRole === 'Lady Superintendent') {
          params.gender = 'F';
        }
        
        if (userRole === 'ClassTeacher' && user.classSection) {
          params.classSection = user.classSection;
        }
        
        if (classSection) {
          params.classSection = classSection;
        }
        
        const { students: schoolStudents } = await storage.getStudents(params);
        return schoolStudents.map(s => ({ ...s, schoolName: school.name }));
      });
      
      const allStudentsArrays = await Promise.all(allStudentsPromises);
      students = allStudentsArrays.flat();
      
      // Generate report based on type
      let reportData: any = {};
      
      switch (type) {
        case 'menstrual-health':
          reportData = await generateMenstrualHealthReport(students, schools, month as string, year as string);
          break;
          
        case 'health-overview':
          reportData = await generateHealthOverviewReport(students, schools, month as string, year as string);
          break;
          
        case 'referrals':
          reportData = await generateReferralsReport(students, schools, month as string, year as string);
          break;
          
        case 'student-demographics':
          reportData = await generateStudentDemographicsReport(students, schools);
          break;
          
        default:
          return res.status(400).json({ message: 'Report type not implemented' });
      }
      
      // Format and return report
      if (format === 'json') {
        return res.json(reportData);
      }
      
      // Generate file-based reports
      const filename = `${type}-report-${userRole.toLowerCase()}-${Date.now()}`;
      
      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        await generateExcelReport(workbook, reportData, type as string, userRole);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
        
      } else if (format === 'pdf') {
        const pdfBuffer = await generatePDFReport(reportData, type as string, userRole);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        
        res.send(pdfBuffer);
        
      } else {
        return res.status(400).json({ message: 'Invalid format. Use json, excel, or pdf' });
      }
      
    } catch (error: any) {
      console.error('Unified report generation error:', error);
      res.status(500).json({ message: error?.message || 'Failed to generate report' });
    }
  });

  // In-app Report Sharing API
  app.post("/api/reports/share", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reportId, reportType, reportData, sharedWith, message, expiresAt } = req.body;
      const sharedBy = req.user!.id;
      
      // Validate shared users exist and have appropriate roles
      const sharedUsers = await Promise.all(
        sharedWith.map(async (userId: string) => {
          const user = await storage.getUser(userId);
          if (!user) throw new Error(`User ${userId} not found`);
          return user;
        })
      );
      
      // Get the full user details to access fullName
      const currentUser = await storage.getUser(req.user!.id);
      const senderName = currentUser?.fullName || req.user!.username || 'User';

      // Create shared report record
      const sharedReport = {
        id: `shared_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        reportId: reportId || `report_${Date.now()}`,
        reportType,
        reportData: JSON.stringify(reportData),
        sharedBy,
        sharedWith: JSON.stringify(sharedWith),
        message: message || '',
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        createdAt: new Date(),
        isActive: true
      };
      
      // Store in database (using notifications table for now, could create dedicated table)
      await db.insert(notifications).values({
        senderId: sharedBy,
        senderRole: req.user!.role as any,
        receiverRole: 'Admin' as any, // Will be filtered by actual receivers
        type: 'system' as any,
        title: `Shared Report: ${reportType}`,
        message: `${senderName} shared a ${reportType} report with you. ${message}`,
        metadata: sharedReport,
        isImportant: true
      } as any);
      
      // Send notifications to shared users
      for (const user of sharedUsers) {
        await db.insert(notifications).values({
          senderId: sharedBy,
          senderRole: req.user!.role as any,
          receiverRole: user.role as any,
          receiverSchoolId: user.schoolId,
          type: 'system' as any,
          title: `New Shared Report: ${reportType}`,
          message: `${senderName} shared a ${reportType} report with you. ${message}`,
          metadata: {
            reportId: sharedReport.id,
            reportType,
            sharedBy: senderName,
            sharedAt: new Date().toISOString()
          },
          isImportant: true
        } as any);
      }
      
      res.json({ 
        success: true, 
        sharedReportId: sharedReport.id,
        message: `Report shared with ${sharedUsers.length} user(s)` 
      });
      
    } catch (error: any) {
      console.error('Report sharing error:', error);
      res.status(500).json({ message: error?.message || 'Failed to share report' });
    }
  });

  // Get shared reports for current user (Phase-1: Role-based access only)
  app.get("/api/reports/shared", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Get reports based ONLY on user's role (ignore shared_reports table for Phase-1)
      const roleBasedReports = await reportsStorage.getReportsForRole(userRole, userId);
      
      // Format response for frontend
      const formattedReports = roleBasedReports.map(report => ({
        id: report.id,
        reportId: report.reportId, // Actual report ID for viewing/downloading
        reportType: report.reportCategory,
        reportFormat: report.reportType,
        sharedBy: 'System', // Phase-1: All reports are "system" reports
        sharedAt: report.createdAt?.toISOString() || new Date().toISOString(),
        title: `${report.reportCategory} Report`,
        message: 'Role-based access enabled (Phase-1)',
        isRead: false,
        createdAt: report.createdAt,
        fileName: report.fileName,
        fileSize: report.fileSize,
        expiresAt: report.expiresAt
      }));
      
      res.json({ reports: formattedReports });
      
    } catch (error: any) {
      console.error('Get role-based reports error:', error);
      res.status(500).json({ message: error?.message || 'Failed to get reports' });
    }
  });

  // View shared report (opens in new tab)
  app.get("/api/reports/view/:reportId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reportId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Check if user has access to this report
      const hasAccess = await reportsStorage.hasAccessToReport(reportId, userRole, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this report' });
      }
      
      // Get the report file
      const reportFile = await reportsStorage.getReportFile(reportId);
      if (!reportFile) {
        return res.status(404).json({ message: 'Report file not found' });
      }
      
      // Get report metadata
      const report = await reportsStorage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Set appropriate headers for inline viewing
      const contentType = report.reportType === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${report.fileName}"`);
      res.setHeader('Content-Length', reportFile.length);
      
      // Stream the file
      res.send(reportFile);
      
    } catch (error: any) {
      console.error('View report error:', error);
      res.status(500).json({ message: error?.message || 'Failed to view report' });
    }
  });

  // Download shared report
  app.get("/api/reports/download/:reportId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reportId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Check if user has access to this report
      const hasAccess = await reportsStorage.hasAccessToReport(reportId, userRole, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this report' });
      }
      
      // Get the report file
      const reportFile = await reportsStorage.getReportFile(reportId);
      if (!reportFile) {
        return res.status(404).json({ message: 'Report file not found' });
      }
      
      // Get report metadata
      const report = await reportsStorage.getReport(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Set appropriate headers for download
      const contentType = report.reportType === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
      res.setHeader('Content-Length', reportFile.length);
      
      // Stream the file
      res.send(reportFile);
      
    } catch (error: any) {
      console.error('Download report error:', error);
      res.status(500).json({ message: error?.message || 'Failed to download report' });
    }
  });

  // Serve test HTML file (for development only)
  app.get("/test-reports", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test_reports.html'));
  });

  // Test endpoint to create sample reports for demo (Phase-1)
  app.post("/api/reports/test", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Create multiple sample reports for different categories
      const reportCategories = ['monthly-checkup', 'annual-health', 'meal-tracking'];
      const createdReports = [];
      
      for (const category of reportCategories) {
        const sampleReportData = {
          reportId: `${category}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          reportType: Math.random() > 0.5 ? 'PDF' as const : 'EXCEL' as const,
          reportCategory: category,
          roleAllowed: userRole as any,
          filePath: '',
          fileName: '',
          generatedBy: userId,
          generatedFor: req.user!.schoolId || 'demo-school',
          metadata: { 
            testData: true, 
            generatedAt: new Date().toISOString(),
            userRole,
            userId,
            category
          },
        };
        
        const sampleFileBuffer = Buffer.from(`Sample ${category} report for ${userRole} generated at ${new Date().toISOString()}\n\nThis is a demo report file with sample content.`);
        
        const storedReport = await reportsStorage.storeReport(sampleReportData, sampleFileBuffer);
        createdReports.push(storedReport);
      }
      
      res.json({
        success: true,
        message: `Created ${createdReports.length} test reports for role: ${userRole}`,
        reports: createdReports.map(r => ({
          reportId: r.reportId,
          fileName: r.fileName,
          category: r.reportCategory,
          type: r.reportType
        }))
      });
      
    } catch (error: any) {
      console.error('Test report creation error:', error);
      res.status(500).json({ message: error?.message || 'Failed to create test reports' });
    }
  });

  // Share a report with other users
  app.post("/api/reports/share", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reportType, reportData, sharedWith, message, expiresAt } = req.body;
      const sharedBy = req.user!.id;
      
      // Validate shared users exist and have appropriate roles
      const sharedUsers = await Promise.all(
        sharedWith.map(async (userId: string) => {
          const user = await storage.getUser(userId);
          if (!user) throw new Error(`User ${userId} not found`);
          return user;
        })
      );
      
      // Generate a report first (this is a simplified version - in production you'd generate the actual report)
      const reportBuffer = Buffer.from(`Mock ${reportType} report data: ${JSON.stringify(reportData)}`);
      
      // Store the report
      const storedReport = await reportsStorage.storeReport({
        reportId: `report_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        reportType: 'PDF', // Default to PDF for now
        reportCategory: reportType,
        roleAllowed: req.user!.role as any,
        filePath: '', // Will be set by storeReport
        fileName: '', // Will be set by storeReport
        generatedBy: sharedBy,
        generatedFor: reportData.schoolId || reportData.studentId || null,
        metadata: reportData,
      }, reportBuffer);
      
      // Share the report
      const sharedReport = await reportsStorage.shareReport({
        reportId: storedReport.id,
        sharedBy,
        sharedWith,
        message: message || '',
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      });
      
      res.json({ 
        success: true, 
        sharedReportId: sharedReport.id,
        reportId: storedReport.reportId,
        message: `Report shared with ${sharedUsers.length} user(s)` 
      });
      
    } catch (error: any) {
      console.error('Report sharing error:', error);
      res.status(500).json({ message: error?.message || 'Failed to share report' });
    }
  });

  // Access shared report data (for the old endpoint compatibility)
  app.get("/api/reports/shared/:reportId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reportId } = req.params;
      const userId = req.user!.id;
      
      // Get the shared report
      const sharedReport = await reportsStorage.getSharedReport(reportId, userId);
      if (!sharedReport) {
        return res.status(404).json({ message: 'Shared report not found or access denied' });
      }
      
      // Return report metadata
      res.json({
        reportId: sharedReport.report.reportId,
        reportType: sharedReport.report.reportCategory,
        reportFormat: sharedReport.report.reportType,
        sharedBy: 'User', // We'd need to join with users table to get the name
        sharedAt: sharedReport.createdAt?.toISOString() || new Date().toISOString(),
        message: sharedReport.message,
        fileName: sharedReport.report.fileName,
        fileSize: sharedReport.report.fileSize,
        viewUrl: `/api/reports/view/${sharedReport.report.reportId}`,
        downloadUrl: `/api/reports/download/${sharedReport.report.reportId}`,
      });
      
    } catch (error: any) {
      console.error('Access shared report error:', error);
      res.status(500).json({ message: error?.message || 'Failed to access shared report' });
    }
  });

  app.get("/api/po/schools/:id", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const school = await storage.getSchool(id);

      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      let user = null;
      // Verify PO can only access schools in their region
      if (req.user?.role === "PO") {
        user = await storage.getUser(req.user.id);
        if (user?.district && !sameDistrict(school.district, user.district)) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      // Get comprehensive school data using centralized metrics
      const metrics = await storage.getDashboardMetrics("PO", req.user!.id, id, undefined, user?.district ?? undefined);

      // Fix: user variable scope issue - declare it before the if block

      const { students } = await storage.getStudents({ schoolId: id, limit: 1000 });

      const studentsWithStatus = await Promise.all(
        students.map(async (student) => {
          const { cards: studentCards } = await storage.getAnnualHealthCards({ studentId: student.id });
          const { checkups: studentCheckups } = await storage.getMonthlyCheckups({
            studentId: student.id,
            limit: 1
          });

          // Get referral information for this student (with error handling)
          let referralCount = 0;
          let pendingReferrals = 0;
          try {
            const { referrals } = await storage.getReferrals({
              studentId: student.id,
              limit: 5
            });
            referralCount = referrals.length;
            pendingReferrals = referrals.filter(r => r.status === "Pending").length;
          } catch (error: any) {
            // If referrals table doesn't exist yet, use 0
            console.warn("Referrals table not available for student referrals:", error?.message || String(error));
          }

          const latestCard = studentCards && studentCards.length > 0 ? studentCards[0] : null;

          return {
            ...student,
            healthCardStatus: latestCard?.status || "Pending",
            lastCheckup: studentCheckups[0] || null,
            lastCheckupDate: studentCheckups[0]?.checkupDate ?? null,
            latestHealthCard: latestCard || null,
            weight: latestCard?.weightKg ?? null,
            height: latestCard?.heightCm ?? null,
            bmi: latestCard?.bmi ?? null,
            bloodPressure: latestCard?.bloodPressure ?? null,
            sbp: latestCard?.sbp ?? null,
            dbp: latestCard?.dbp ?? null,
            visionRight: latestCard?.visionRight ?? null,
            visionLeft: latestCard?.visionLeft ?? null,
            vision: latestCard?.visionRight || latestCard?.visionLeft || null,
            c7_suspected: latestCard?.c7_suspected ?? false,
            c8_suspected: latestCard?.c8_suspected ?? false,
            deficiencies: latestCard?.deficiencies ?? [],
            defectsAtBirth: latestCard?.defectsAtBirth ?? [],
            referralCount,
            pendingReferrals,
          };
        })
      );

      // Get detailed referral breakdown
      let referralStats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        byType: {
          defect: 0,
          deficiency: 0,
          disease: 0,
          developmental: 0,
          adolescent: 0,
        }
      };

      try {
        const { referrals: allReferrals } = await storage.getReferrals({
          schoolId: id,
          limit: 1000
        });

        referralStats = {
          total: allReferrals.length,
          pending: allReferrals.filter(r => r.status === "Pending").length,
          approved: allReferrals.filter(r => r.status === "Approved").length,
          rejected: allReferrals.filter(r => r.status === "Rejected").length,
          byType: {
            defect: allReferrals.filter(r => r.referralType === "defect").length,
            deficiency: allReferrals.filter(r => r.referralType === "deficiency").length,
            disease: allReferrals.filter(r => r.referralType === "disease").length,
            developmental: allReferrals.filter(r => r.referralType === "developmental").length,
            adolescent: allReferrals.filter(r => r.referralType === "adolescent").length,
          }
        };
      } catch (error) {
        // If referrals table not available, use default stats
        console.warn("Referrals table not available, using default stats");
      }

      res.json({
        school,
        students: studentsWithStatus,
        metrics,
        referralStats
      });
    } catch (error: any) {
      console.error("PO school detail error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch school details" });
    }
  });

  app.get("/api/headmaster/dashboard", authenticateToken, authorizeRoles("Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      const metrics = await storage.getDashboardMetrics("Headmaster", req.user!.id, schoolId);

      const { cards: pendingCards } = await storage.getAnnualHealthCards({ schoolId, status: "Pending", limit: 10 });
      const { checkups: recentCheckups } = await storage.getMonthlyCheckups({ schoolId, limit: 10 });

      const pendingWithNames = await Promise.all(
        pendingCards.map(async (card) => {
          const student = await storage.getStudent(card.studentId);
          return {
            ...card,
            studentName: student?.fullName || card.nameOfChild,
            submittedDate: card.dateOfEntry ? new Date(card.dateOfEntry).toLocaleDateString() : "Recently",
          };
        })
      );

      const checkupsWithNames = await Promise.all(
        recentCheckups.map(async (checkup) => {
          const student = await storage.getStudent(checkup.studentId);
          return {
            ...checkup,
            studentName: student?.fullName || "Unknown",
            classSection: student?.classSection,
          };
        })
      );

      // Get monthly checkups by class
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const { checkups: allCheckups } = await storage.getMonthlyCheckups({ schoolId, month: currentMonth, year: currentYear });
      const { students: allStudents } = await storage.getStudents({ schoolId, limit: 1000 });

      // Group checkups by class
      const checkupsByClass: Record<string, { completed: number; pending: number }> = {};
      const classList = ["1-A", "2-A", "3-A", "4-A", "5-A", "1-B", "2-B", "3-B", "4-B", "5-B"];
      classList.forEach(cls => {
        const studentsInClass = allStudents.filter((s: any) => s.classSection === cls);
        const checkupsInClass = allCheckups.filter((c: any) => {
          const student = allStudents.find((s: any) => s.id === c.studentId);
          return student?.classSection === cls;
        });
        checkupsByClass[cls] = {
          completed: checkupsInClass.length,
          pending: Math.max(0, studentsInClass.length - checkupsInClass.length),
        };
      });

      // Get meal tracking for this week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);

      // Fetch meals for each day of the week
      const mealTrackingByDay: Record<string, { breakfast: number; lunch: number; dinner: number }> = {};
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const dayName = daysOfWeek[i];

        // Fetch meals for this specific date
        const dayMeals = await storage.getMealLogs({ schoolId, date: dateStr });

        mealTrackingByDay[dayName] = {
          breakfast: dayMeals.filter((m: any) => m.mealType === "breakfast").length,
          lunch: dayMeals.filter((m: any) => m.mealType === "lunch").length,
          dinner: dayMeals.filter((m: any) => m.mealType === "dinner").length,
        };
      }

      // Get referral data for the school (fallback to health-card-derived referrals if referrals table empty)
      let referralData = {
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        referralsByClass: [] as any[],
        recentReferrals: [] as any[],
      };

      try {
        let { referrals: allReferrals } = await storage.getReferrals({ schoolId, limit: 1000 });

        // If no explicit referrals exist, derive from health cards as a fallback
        if (!allReferrals || allReferrals.length === 0) {
          console.log('No referrals in DB for school, deriving referral counts from health-cards');
          const { cards: allCardsForSchool } = await storage.getAnnualHealthCards({ schoolId, year: currentYear, limit: 1000 });
          allReferrals = (allCardsForSchool.filter((c: any) => c).map((c: any) => {
            const issues: string[] = [];
            if (c.referral_adolescent_yes || c.adolescent_any) issues.push('Adolescent');
            if (c.referral_disease_yes || c.disease_any) issues.push('Disease');
            if (c.referral_leprosy_yes || c.c7_suspected) issues.push('Leprosy');
            if (c.referral_tb_yes || c.c8_suspected) issues.push('TB');
            if (!c.referral_recommended && issues.length === 0) return null;

            return {
              id: `derived-${c.id}`,
              studentId: c.studentId,
              schoolId: c.schoolId,
              referralDate: c.referral_adolescent_facility_date || c.referral_disease_facility_date || c.referral_leprosy_facility_date || c.referral_tb_facility_date || c.date_of_visit || c.dateOfEntry || c.createdAt || new Date(),
              status: 'Pending',
              issue: issues.join(', ') || 'Referral Recommended',
              facility: c.referral_adolescent_facility || c.referral_disease_facility || c.referral_leprosy_facility || c.referral_tb_facility || null,
              createdAt: c.createdAt || new Date(),
            };
          }).filter(Boolean) as any);
        }

        // Calculate referral metrics
        referralData.totalReferrals = allReferrals.length;
        referralData.pendingReferrals = allReferrals.filter(r => r.status === "Pending").length;
        referralData.completedReferrals = allReferrals.filter(r => r.status === "Completed").length;

        // Group referrals by class
        const referralsByClassMap = new Map<string, { total: number; pending: number; completed: number }>();
        for (const referral of allReferrals) {
          const student = await storage.getStudent(referral.studentId);
          const classSection = student?.classSection || "Unknown";

          if (!referralsByClassMap.has(classSection)) {
            referralsByClassMap.set(classSection, { total: 0, pending: 0, completed: 0 });
          }

          const classData = referralsByClassMap.get(classSection)!;
          classData.total++;
          if (referral.status === "Pending") classData.pending++;
          else if (referral.status === "Completed") classData.completed++;
        }

        referralData.referralsByClass = Array.from(referralsByClassMap.entries()).map(([classSection, data]) => ({
          classSection,
          ...data,
        }));

        // Get recent referrals (last 10)
        const recentReferrals = allReferrals
          .sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime())
          .slice(0, 10);

        referralData.recentReferrals = await Promise.all(
          recentReferrals.map(async (referral) => {
            const student = await storage.getStudent(referral.studentId);
            return {
              id: referral.id,
              studentName: student?.fullName || "Unknown",
              classSection: student?.classSection || "Unknown",
              issue: referral.issue,
              facility: referral.facility,
              status: referral.status,
              referralDate: referral.referralDate,
            };
          })
        );
      } catch (error: any) {
        console.warn("Referrals table not available for headmaster dashboard:", error?.message || String(error));
      }

      // Fetch referrals for class analytics
      let allReferrals: any[] = [];
      try {
        const { referrals } = await storage.getReferrals({ schoolId, limit: 1000 });
        allReferrals = referrals;
      } catch (error: any) {
        console.warn("Referrals table not available for class analytics:", error?.message || String(error));
      }

       // Get class analytics data
      const classAnalytics = [];
      try {
        const { students: allStudents } = await storage.getStudents({ schoolId, limit: 1000 });
        const { cards: allCards } = await storage.getAnnualHealthCards({ schoolId, year: currentYear, limit: 1000 });

        // Group students and cards by class
        const classMap = new Map<string, { students: any[], cards: any[] }>();

        for (const student of allStudents) {
          const classSection = student.classSection || "Unknown";
          if (!classMap.has(classSection)) {
            classMap.set(classSection, { students: [], cards: [] });
          }
          classMap.get(classSection)!.students.push(student);
        }

        for (const card of allCards) {
          const student = allStudents.find(s => s.id === card.studentId);
          const classSection = student?.classSection || "Unknown";
          if (!classMap.has(classSection)) {
            classMap.set(classSection, { students: [], cards: [] });
          }
          classMap.get(classSection)!.cards.push(card);
        }

        // Calculate analytics for each class
        for (const classSection of Array.from(classMap.keys())) {
          const data = classMap.get(classSection)!;
          const { students, cards } = data;

          // BMI categories
          const bmiStats = {
            underweight: 0,
            normal: 0,
            overweight: 0,
            obese: 0,
          };

          // Blood pressure categories
          const bpStats = {
            normal: 0,
            prehypertension: 0,
            stage1: 0,
            stage2: 0,
          };

          // Deficiencies and diseases
          let deficienciesCount = 0;
          let diseasesCount = 0;
          let c7Cases = 0;
          let c8Cases = 0;
          let developmentalDelays = 0;
          let adolescentConcerns = 0;
          let pendingReferrals = 0;
          let completedReferrals = 0;

          for (const card of cards) {
            // BMI calculation
            const bmi = card.bmi ? (typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string)) : null;
            if (bmi) {
              if (bmi < 18.5) bmiStats.underweight++;
              else if (bmi < 25) bmiStats.normal++;
              else if (bmi < 30) bmiStats.overweight++;
              else bmiStats.obese++;
            }

            // Blood pressure calculation
            let sbp = card.sbp || null;
            let dbp = card.dbp || null;

            if ((!sbp || !dbp) && card.bloodPressure) {
              const bpMatch = card.bloodPressure.match(/^(\d+)\/(\d+)$/);
              if (bpMatch) {
                sbp = parseInt(bpMatch[1]);
                dbp = parseInt(bpMatch[2]);
              }
            }

            if (sbp && dbp && !isNaN(sbp) && !isNaN(dbp)) {
              if (sbp < 120 && dbp < 80) bpStats.normal++;
              else if ((sbp >= 120 && sbp < 140) || (dbp >= 80 && dbp < 90)) bpStats.prehypertension++;
              else if ((sbp >= 140 && sbp < 160) || (dbp >= 90 && dbp < 100)) bpStats.stage1++;
              else if (sbp >= 160 || dbp >= 100) bpStats.stage2++;
            }

            // Count deficiencies and diseases
            if (card.b3_severe_anemia || card.b4_vitamin_a_deficiency || card.b5_vitamin_d_deficiency ||
                card.b6_goitre || card.b7_obesity || card.b8_vitb_deficiency) {
              deficienciesCount++;
            }

            if (card.c1_convulsive || card.c2_otitis_media || card.c3_dental || card.c4_skin_conditions ||
                card.c5_asthma || card.c6_rheumatic_heart || card.c7_suspected || card.c8_suspected) {
              diseasesCount++;
            }

            if (card.c7_suspected) c7Cases++;
            if (card.c8_suspected) c8Cases++;

            if (card.d1_seeing_difficulty || card.d2_walking_delay || card.d3_reading_writing ||
                card.d4_muscle_stiffness || card.d5_hearing_difficulty || card.d6_speech_difficulty ||
                card.d7_learning_difficulty || card.d8_inattention_hyperactivity || card.d9_behavioral_concerns) {
              developmentalDelays++;
            }

            if (card.e1_life_events_difficulty || card.e2_peer_pressure_substance || card.e3_persistent_sadness ||
                card.e5_pain_urination || card.e6_foul_discharge) {
              adolescentConcerns++;
            }
          }

          // Get referral counts for this class
          const classReferrals = allReferrals.filter(r => {
            const student = allStudents.find(s => s.id === r.studentId);
            return student?.classSection === classSection;
          });

          pendingReferrals = classReferrals.filter(r => r.status === "Pending").length;
          completedReferrals = classReferrals.filter(r => r.status === "Completed").length;

          // Calculate averages
          const validCards = cards.filter(c => c.heightCm && c.weightKg && c.bmi);
          const avgHeight = validCards.length > 0 ? validCards.reduce((sum, c) => sum + parseFloat(c.heightCm || '0'), 0) / validCards.length : 0;
          const avgWeight = validCards.length > 0 ? validCards.reduce((sum, c) => sum + parseFloat(c.weightKg || '0'), 0) / validCards.length : 0;
          const avgBMI = validCards.length > 0 ? validCards.reduce((sum, c) => {
            const bmi = typeof c.bmi === 'number' ? c.bmi : parseFloat(c.bmi as string);
            return sum + (isNaN(bmi) ? 0 : bmi);
          }, 0) / validCards.length : 0;

          classAnalytics.push({
            classSection,
            totalStudents: students.length,
            avgHeight: parseFloat(avgHeight.toFixed(1)),
            avgWeight: parseFloat(avgWeight.toFixed(1)),
            avgBMI: parseFloat(avgBMI.toFixed(1)),
            bmiUnderweight: bmiStats.underweight,
            bmiNormal: bmiStats.normal,
            bmiOverweight: bmiStats.overweight,
            bmiObese: bmiStats.obese,
            bpNormal: bpStats.normal,
            bpPrehypertension: bpStats.prehypertension,
            bpStage1: bpStats.stage1,
            bpStage2: bpStats.stage2,
            deficienciesCount,
            diseasesCount,
            c7Cases,
            c8Cases,
            developmentalDelays,
            adolescentConcerns,
            pendingReferrals,
            completedReferrals,
          });
        }
      } catch (error: any) {
        console.warn("Error calculating class analytics:", error?.message || String(error));
      }

      res.json({
        metrics,
        pendingCards: pendingWithNames,
        recentCheckups: checkupsWithNames,
        checkupsByClass,
        mealTrackingThisWeek: mealTrackingByDay,
        referralData,
        classAnalytics,
      });
    } catch (error: any) {
      console.error("Headmaster dashboard error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  // Duplicate endpoint removed - use the primary /api/po/dashboard at line 5299

  app.get("/api/headmaster/dashboard", authenticateToken, authorizeRoles("Headmaster", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.role === "Admin" ? undefined : req.user?.schoolId;
      const selectedMonth = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const selectedYear = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      const metrics = await storage.getDashboardMetrics("Headmaster", req.user!.id, schoolId);

      // Get pending health cards
      const { cards: pendingCards } = await storage.getAnnualHealthCards({
        schoolId,
        status: "Pending",
        limit: 10
      });

      const pendingCardsWithDetails = await Promise.all(
        pendingCards.map(async (card) => {
          const student = await storage.getStudent(card.studentId);
          return {
            id: card.id,
            studentName: student?.fullName || card.nameOfChild,
            classSection: student?.classSection || card.classSection,
            submittedDate: card.createdAt ? new Date(card.createdAt).toLocaleDateString() : "Unknown",
          };
        })
      );

      // Get recent checkups
      const { checkups: recentCheckups } = await storage.getMonthlyCheckups({
        schoolId,
        month: selectedMonth,
        year: selectedYear,
        limit: 10
      });

      const checkupsWithDetails = await Promise.all(
        recentCheckups.map(async (checkup) => {
          const student = await storage.getStudent(checkup.studentId);
          return {
            id: checkup.id,
            studentName: student?.fullName || "Unknown",
            classSection: student?.classSection || "N/A",
            checkupDate: checkup.checkupDate,
            bmi: checkup.bmi,
            treatmentType: checkup.treatmentType,
            present: checkup.present,
          };
        })
      );

      // Get today's meals
      const today = new Date().toISOString().split("T")[0];
      const meals = await storage.getMealLogs({ schoolId, date: today });

      // Get class analytics
      const { students: allStudents } = await storage.getStudents({ schoolId, limit: 1000 });
      const classGroups = allStudents.reduce((acc, student) => {
        const cls = student.classSection;
        if (!acc[cls]) acc[cls] = [];
        acc[cls].push(student);
        return acc;
      }, {} as Record<string, typeof allStudents>);

      const classAnalytics = await Promise.all(
        Object.entries(classGroups).map(async ([classSection, students]) => {
          const studentIds = students.map(s => s.id);
          const { cards } = await storage.getAnnualHealthCards({
            schoolId,
            year: selectedYear,
            limit: 1000
          });

          const classCards = cards.filter(card => studentIds.includes(card.studentId));

          const avgHeight = classCards.length > 0
            ? classCards.reduce((sum, card) => sum + (parseFloat(card.heightCm || '0') || 0), 0) / classCards.length
            : 0;
          const avgWeight = classCards.length > 0
            ? classCards.reduce((sum, card) => sum + (parseFloat(card.weightKg || '0') || 0), 0) / classCards.length
            : 0;
          const avgBMI = classCards.length > 0
            ? classCards.reduce((sum, card) => {
                const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string || '0');
                return sum + (isNaN(bmi) ? 0 : bmi);
              }, 0) / classCards.length
            : 0;

          const bmiUnderweight = classCards.filter(card => {
            const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string || '0');
            return bmi && bmi < 18.5;
          }).length;

          const bmiNormal = classCards.filter(card => {
            const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string || '0');
            return bmi && bmi >= 18.5 && bmi < 25;
          }).length;

          const bmiOverweight = classCards.filter(card => {
            const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string || '0');
            return bmi && bmi >= 25;
          }).length;

          const bmiObese = classCards.filter(card => {
            const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string || '0');
            return bmi && bmi >= 30;
          }).length;

          const c7Cases = classCards.filter(card => card.c7_suspected).length;
          const c8Cases = classCards.filter(card => card.c8_suspected).length;

          // Get referrals for this class
          let pendingReferrals = 0;
          let completedReferrals = 0;
          try {
            const { referrals } = await storage.getReferrals({ schoolId, limit: 1000 });
            const classReferrals = referrals.filter(r => studentIds.includes(r.studentId));
            pendingReferrals = classReferrals.filter(r => r.status === "Pending").length;
            completedReferrals = classReferrals.filter(r => r.status === "Completed").length;
          } catch (error) {
            // Referrals table might not exist
          }

          return {
            classSection,
            totalStudents: students.length,
            avgHeight: parseFloat(avgHeight.toFixed(1)),
            avgWeight: parseFloat(avgWeight.toFixed(1)),
            avgBMI: parseFloat(avgBMI.toFixed(1)),
            bmiUnderweight,
            bmiNormal,
            bmiOverweight,
            bmiObese,
            c7Cases,
            c8Cases,
            pendingReferrals,
            completedReferrals,
          };
        })
      );

      // Get referral data
      let referralData = {
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        referralsByClass: [] as any[],
        recentReferrals: [] as any[],
      };

      try {
        const { referrals } = await storage.getReferrals({ limit: 100 });
        referralData.totalReferrals = referrals.length;
        referralData.pendingReferrals = referrals.filter(r => r.status === "Pending").length;
        referralData.completedReferrals = referrals.filter(r => r.status === "Completed").length;

        // Group by class
        const classReferrals = referrals.reduce((acc, referral) => {
          const student = allStudents.find(s => s.id === referral.studentId);
          const cls = student?.classSection || "Unknown";
          if (!acc[cls]) acc[cls] = { classSection: cls, total: 0, pending: 0, completed: 0 };
          acc[cls].total++;
          if (referral.status === "Pending") acc[cls].pending++;
          if (referral.status === "Approved") acc[cls].completed++;
          return acc;
        }, {} as Record<string, any>);

        referralData.referralsByClass = Object.values(classReferrals) as any[];

        // Recent referrals
        referralData.recentReferrals = await Promise.all(
          referrals.slice(0, 10).map(async (referral) => {
            const student = allStudents.find(s => s.id === referral.studentId);
            return {
              id: referral.id,
              studentName: student?.fullName || "Unknown",
              classSection: student?.classSection || "N/A",
              issue: referral.issue,
              facility: referral.facility,
              status: referral.status,
              referralDate: referral.referralDate,
            };
          })
        );
      } catch (error) {
        // Referrals table might not exist
      }

      // Get checkups by class
      const checkupsByClass: Record<string, { completed: number; pending: number }> = {};
      for (const cls of Object.keys(classGroups)) {
        const studentIds = classGroups[cls].map(s => s.id);
        const { checkups } = await storage.getMonthlyCheckups({
          schoolId,
          month: selectedMonth,
          year: selectedYear,
          limit: 1000
        });
        const classCheckups = checkups.filter(c => studentIds.includes(c.studentId));
        checkupsByClass[cls] = {
          completed: classCheckups.filter(c => c.present).length,
          pending: classGroups[cls].length - classCheckups.filter(c => c.present).length,
        };
      }

      // Get meal tracking for this week
      const mealTrackingThisWeek: Record<string, { breakfast: number; lunch: number; dinner: number }> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = await storage.getMealLogs({ schoolId, date: dateStr });
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        mealTrackingThisWeek[dayName] = {
          breakfast: dayMeals.filter(m => m.mealType === "breakfast").length,
          lunch: dayMeals.filter(m => m.mealType === "lunch").length,
          dinner: dayMeals.filter(m => m.mealType === "dinner").length,
        };
      }

      res.json({
        metrics,
        pendingCards: pendingCardsWithDetails,
        recentCheckups: checkupsWithDetails,
        recentMeals: meals,
        classAnalytics,
        referralData,
        checkupsByClass,
        mealTrackingThisWeek,
      });
    } catch (error: any) {
      console.error("Headmaster dashboard error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/teacher/dashboard", authenticateToken, authorizeRoles("ClassTeacher", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.role === "Admin" ? undefined : req.user?.schoolId;
      
      // Get month and year from query parameters
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      // Get teacher's assigned class
      const teacher = await storage.getUser(req.user!.id);
      const classSection = teacher?.classSection;

      // For Admin, show all students; for ClassTeacher, filter by school and class
      const metrics = await storage.getDashboardMetrics("ClassTeacher", req.user!.id, schoolId, classSection ?? undefined);
      const { students } = await storage.getStudents({
        schoolId: schoolId || undefined,
        classSection: classSection || undefined,
        limit: 20
      });

      const studentsWithStatus = await Promise.all(
        students.map(async (student) => {
          const { cards } = await storage.getAnnualHealthCards({ studentId: student.id, year });
          const { checkups } = await storage.getMonthlyCheckups({ studentId: student.id, month, year, limit: 1 });
          const latestCard = cards && cards.length > 0 ? cards[0] : null;

          // Flatten commonly-used health card fields into the student object so UIs and exports
          // can rely on consistent fields without additional lookups. Keep original card as latestHealthCard
          // for consumers that need the full object.
          return {
            ...student,
            healthCardStatus: latestCard?.status || "Pending",
            lastCheckup: checkups[0]?.checkupDate || null,
            latestHealthCard: latestCard || null,
            // Convenience flattened fields (useful for exports and table views)
            weight: latestCard?.weightKg ?? null,
            height: latestCard?.heightCm ?? null,
            bmi: latestCard?.bmi ?? null,
            bloodPressure: latestCard?.bloodPressure ?? null,
            sbp: latestCard?.sbp ?? null,
            dbp: latestCard?.dbp ?? null,
            visionRight: latestCard?.visionRight ?? null,
            visionLeft: latestCard?.visionLeft ?? null,
            c7_suspected: latestCard?.c7_suspected ?? false,
            c8_suspected: latestCard?.c8_suspected ?? false,
            deficiencies: latestCard?.deficiencies ?? [],
            defectsAtBirth: latestCard?.defectsAtBirth ?? [],
          };
        })
      );

      const upcomingCheckups = studentsWithStatus.filter(s => !s.lastCheckup);

      // Add meal participation metrics for ClassTeacher view (filtered by month/year)
      const monthStart = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

      let totalMeals = 0;
      let expectedMeals = 0;
      try {
        const meals = await storage.getMealLogs({ schoolId: schoolId || undefined, startDate: monthStart, endDate: monthEnd });
        totalMeals = meals.length;
        const daysInMonth = new Date(year, month, 0).getDate();
        expectedMeals = students.length > 0 ? students.length * daysInMonth : 0; // assume 1 meal per student per day for expected
      } catch (err) {
        console.warn('Failed to compute meal participation for teacher dashboard:', (err as any)?.message || err);
      }

      const mealParticipation = { totalMeals, expectedMeals };

      res.json({ metrics, students: studentsWithStatus, upcomingCheckups, mealParticipation });
    } catch (error: any) {
      console.error("Teacher dashboard error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/medical/dashboard", authenticateToken, authorizeRoles("MedicalTeam", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.query.schoolId as string || req.user?.schoolId;
      const metrics = await storage.getDashboardMetrics("MedicalTeam", req.user!.id, schoolId);
      const { schools } = await storage.getSchools(1, 100);
      const { checkups: recentCheckups } = await storage.getMonthlyCheckups({ schoolId, limit: 10 });

      const checkupsWithDetails = await Promise.all(
        recentCheckups.map(async (checkup) => {
          const student = await storage.getStudent(checkup.studentId);
          const school = await storage.getSchool(checkup.schoolId);
          return {
            ...checkup,
            studentName: student?.fullName || "Unknown",
            schoolName: school?.name || "Unknown",
          };
        })
      );

      const referredStudents = checkupsWithDetails.filter(c => c.treatmentType === "Referred");

      // Get real hostel attendance data for today
      const today = new Date().toISOString().split("T")[0];
      const todayAttendance = await storage.getHostelAttendance({ date: today, schoolId });

      const presentToday = todayAttendance.filter(a => a.status === "Present" || (a.checkInTime && !a.checkOutTime && !a.isVacation)).length;
      const onVacation = todayAttendance.filter(a => a.isVacation || a.status === "On Vacation").length;

      // Get monthly presence percentage
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const monthlyStats = await storage.getHostelMonthlyStats({ schoolId, month: currentMonth, year: currentYear });
      const totalStudents = monthlyStats.summary.totalStudents || 0;
      const avgPresentDays = monthlyStats.summary.presentDays || 0;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const monthlyPresence = totalStudents > 0 && daysInMonth > 0
        ? Math.round((avgPresentDays / daysInMonth) * 100)
        : 0;

      const hostelStats = {
        presentToday,
        onVacation,
        monthlyPresence,
      };

      res.json({ metrics, schools, recentCheckups: checkupsWithDetails, referredStudents, hostelStats });
    } catch (error: any) {
      console.error("Medical dashboard error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/warden/dashboard", authenticateToken, authorizeRoles("HostelWarden", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId && req.user?.role !== "Admin") {
        return res.status(400).json({ message: "Warden must be assigned to a school" });
      }

      const today = new Date().toISOString().split("T")[0];

      const { students: allStudents } = await storage.getStudents({ schoolId, limit: 1000 });
      const totalHostelStudents = allStudents.length;

      const todayAttendance = await storage.getHostelAttendance({ schoolId, date: today });

      const studentsWithCheckIn = new Set(todayAttendance.filter(a => a.checkInTime && !a.isVacation).map(a => a.studentId));
      const studentsOnVacation = new Set(todayAttendance.filter(a => a.isVacation).map(a => a.studentId));

      const presentToday = studentsWithCheckIn.size;
      const onLeave = studentsOnVacation.size;
      const absentToday = totalHostelStudents - presentToday - onLeave;

      const lateCheckIns = todayAttendance.filter(a => {
        if (!a.checkInTime) return false;
        const checkInHour = new Date(a.checkInTime).getHours();
        return checkInHour >= 9;
      }).length;

      const pendingReturns = todayAttendance.filter(a => {
        if (!a.isVacation || !a.vacationEndDate) return false;
        const endDate = new Date(a.vacationEndDate);
        const todayDate = new Date(today);
        return endDate <= todayDate;
      }).length;

      const metrics = {
        totalHostelStudents,
        presentToday,
        absentToday: Math.max(0, absentToday),
        onLeave,
        pendingReturns,
        lateCheckIns,
      };

      const studentsOnLeaveList = await Promise.all(
        Array.from(studentsOnVacation).slice(0, 10).map(async (studentId) => {
          const student = await storage.getStudent(studentId);
          const vacation = todayAttendance.find(a => a.studentId === studentId && a.isVacation);
          return {
            id: studentId,
            fullName: student?.fullName || "Unknown",
            classSection: student?.classSection || "N/A",
            roomNumber: null,
            reason: vacation?.vacationReason || "Vacation",
            returnDate: vacation?.vacationEndDate || "TBD",
          };
        })
      );

      const recentActivity = todayAttendance
        .filter(a => a.checkInTime || a.checkOutTime)
        .slice(0, 10)
        .map(async (a) => {
          const student = await storage.getStudent(a.studentId);
          const time = a.checkOutTime || a.checkInTime;
          return {
            type: a.checkOutTime ? "check_out" : "check_in",
            studentName: student?.fullName || "Unknown",
            description: a.checkOutTime ? "Checked out" : "Checked in",
            time: time ? new Date(time).toLocaleTimeString() : "",
          };
        });
      const resolvedActivity = await Promise.all(recentActivity);

      const attendanceByClass: Record<string, { present: number; absent: number }> = {};
      const classSections = Array.from(new Set(allStudents.map(s => s.classSection)));

      for (const cls of classSections) {
        const studentsInClass = allStudents.filter(s => s.classSection === cls);
        const presentInClass = studentsInClass.filter(s => studentsWithCheckIn.has(s.id)).length;
        attendanceByClass[cls] = {
          present: presentInClass,
          absent: studentsInClass.length - presentInClass,
        };
      }

      res.json({
        metrics,
        studentsOnLeave: studentsOnLeaveList,
        recentActivity: resolvedActivity,
        attendanceByClass,
      });
    } catch (error: any) {
      console.error("Warden dashboard error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/warden/students", authenticateToken, authorizeRoles("HostelWarden", "Admin"), async (req: AuthRequest, res) => {
    try {
      const schoolId = req.user?.schoolId;
      const page = parseInt(req.query.page as string) || 1;
      const classSection = req.query.classSection as string;
      const search = req.query.search as string;

      const { students, total } = await storage.getStudents({
        schoolId,
        classSection,
        search,
        page,
        limit: 20,
      });

      const today = new Date().toISOString().split("T")[0];
      const todayAttendance = await storage.getHostelAttendance({ schoolId, date: today });

      const studentsWithStatus = students.map(student => {
        const attendance = todayAttendance.find(a => a.studentId === student.id);
        let status = "Not Checked In";
        if (attendance?.isVacation) status = "On Vacation";
        else if (attendance?.checkOutTime) status = "Checked Out";
        else if (attendance?.checkInTime) status = "Present";

        return {
          ...student,
          hostelStatus: status,
          checkInTime: attendance?.checkInTime,
          checkOutTime: attendance?.checkOutTime,
        };
      });

      res.json({
        students: studentsWithStatus,
        totalPages: Math.ceil(total / 20),
        totalItems: total,
      });
    } catch (error: any) {
      console.error("Warden students error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch students" });
    }
  });

  app.get("/api/lady-superintendent/dashboard", authenticateToken, authorizeRoles("Lady Superintendent", "Admin"), async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Lady Superintendent can only access their assigned school
      const schoolId = user.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ message: "Lady Superintendent must be assigned to a school" });
      }

      // Get all female students from LS's school only
      const femaleStudents = await db
        .select({
          id: students.id,
          schoolId: students.schoolId,
          fullName: students.fullName,
          classSection: students.classSection,
          gender: students.gender,
        })
        .from(students)
        .where(and(
          eq(students.gender, "F"),
          eq(students.schoolId, schoolId)
        ));

      res.json({
        metrics: {
          totalFemaleStudents: femaleStudents.length,
        },
        students: femaleStudents.slice(0, 10), // Recent students for display
      });
    } catch (error) {
      console.error("Lady Superintendent dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/admin/dashboard", authenticateToken, authorizeRoles("Admin"), async (req: AuthRequest, res) => {
    try {
      const metricsRaw = await storage.getDashboardMetrics("Admin", req.user!.id);
      // Deep sanitize metrics to prevent non-serializable values (fixes toISOString errors)
      // NOTE: property getters can throw; access properties inside try/catch and skip faulty getters
      const deepSanitize = (value: any, path = ''): any => {
        if (value === null || value === undefined) return value;
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'bigint') return Number(value);
        if (Array.isArray(value)) return value.map((v, i) => deepSanitize(v, `${path}[${i}]`));
        if (typeof value === 'object') {
          const out: any = {};
          const keys = Object.keys(value as any);
          for (const k of keys) {
            // If there is a non-function toISOString property defined on this object, skip it
            if (k === 'toISOString') {
              try {
                if (typeof (value as any)[k] !== 'function') continue;
              } catch (e: any) {
                console.warn(`Skipping property ${path ? path + '.' : ''}${k} due to getter error:`, String(e));
                continue;
              }
            }

            let v;
            try {
                v = (value as any)[k];
            } catch (e: any) {
                console.warn(`Skipping property ${path ? path + '.' : ''}${k} due to getter error:`, String(e));
                continue;
            }

            try {
                out[k] = deepSanitize(v, path ? `${path}.${k}` : k);
            } catch (e: any) {
                // Fallback if nested sanitization throws for some reason
                out[k] = String(v);
            }
          }
          return out;
        }
        return value;
      };

      const metrics = deepSanitize(metricsRaw || {});
      console.log('Admin dashboard: metrics keys after sanitize:', Object.keys(metrics));

      const { users: recentUsersRaw, total: totalUsers } = await storage.getUsers(1, 10);
      const recentUsers = Array.isArray(recentUsersRaw) ? recentUsersRaw.map((u: any) => ({ ...u, createdAt: u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : (u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt))) : null, updatedAt: u.updatedAt ? (typeof u.updatedAt === 'string' ? u.updatedAt : (u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt))) : null })) : [];
      console.log('Admin dashboard: recentUsers count:', recentUsers.length);

      // Update metrics with real totalUsers
      metrics.totalUsers = totalUsers;

      // Calculate active users (users active in last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const { users: allUsersRaw } = await storage.getUsers(1, 1000);
      const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw.map((u: any) => ({ ...u, updatedAt: u.updatedAt ? (typeof u.updatedAt === 'string' ? u.updatedAt : (u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt))) : null, createdAt: u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : (u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt))) : null })) : [];
      console.log('Admin dashboard: allUsers sample types:', allUsers.slice(0,3).map((u: any) => ({ id: u.id, updatedAt: typeof u.updatedAt })));

      const activeUsers = allUsers.filter(u => {
        if (!u.updatedAt) return false;
        const dt = Date.parse(u.updatedAt as string);
        if (isNaN(dt)) return false;
        return dt >= sevenDaysAgo;
      }).length;
      metrics.activeUsers = activeUsers;

      const usersWithSchool = await Promise.all(
        recentUsers.map(async (user) => {
          let schoolName = null;
          if (user.schoolId) {
            const school = await storage.getSchool(user.schoolId);
            schoolName = school?.name;
          }
          const { password: _, ...userWithoutPassword } = user;
          return { ...userWithoutPassword, schoolName };
        })
      );

      // Calculate users by role dynamically
      const roles = ["Admin", "ClassTeacher", "Headmaster", "MedicalTeam", "HostelWarden", "PO", "Lady Superintendent", "MealSuperintendent"];
      const usersByRole = roles.map(role => ({
        role,
        count: allUsers.filter(u => u.role === role).length
      }));

      // Calculate real system activity (last 7 days)
      const systemActivity = [];
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        // Count users created/updated on this day
        const dayUsers = allUsers.filter(u => {
          const userDate = new Date(u.updatedAt || u.createdAt || new Date());
          return userDate >= dayStart && userDate <= dayEnd;
        }).length;

        // Use deterministic counts derived from user activity (no random values)
        systemActivity.push({
          day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
          logins: dayUsers,
          actions: dayUsers * 3, // simple heuristic: ~3 actions per active user
        });
      }

      // Prepare payload and test JSON serialization to surface what value causes toISOString errors
      const payload = { metrics, recentUsers: usersWithSchool, usersByRole, systemActivity, monthlyTrends: metrics.monthlyTrends || [], userActivityLogs: [] };

      // Pre-check: detect any object that has a 'toISOString' property that is not a function
      // Traversal uses safe property access to avoid getter errors crashing the whole handler
      const detectBadToISOString = (val: any, path = ''): string[] => {
        const results: string[] = [];
        const visit = (v: any, p: string) => {
          if (v && typeof v === 'object') {
            try {
              if (Object.prototype.hasOwnProperty.call(v, 'toISOString') && typeof v.toISOString !== 'function') {
                results.push(p || '(root)');
              }
            } catch (e: any) {
              console.warn(`Skipping toISOString check at ${p || '(root)'} due to getter error:`, String(e));
              return; // cannot safely inspect this object
            }

            if (Array.isArray(v)) {
              for (let i = 0; i < v.length; i++) {
                let child;
                try { child = v[i]; } catch (e) { console.warn(`Skipping array element ${p}[${i}] due to getter error:`, String(e)); continue; }
                visit(child, `${p}[${i}]`);
              }
            } else {
              const keys = Object.keys(v);
              for (const k of keys) {
                let val2;
                try { val2 = (v as any)[k]; } catch (e) { console.warn(`Skipping property ${p ? `${p}.${k}` : k} due to getter error:`, String(e)); continue; }
                visit(val2, p ? `${p}.${k}` : k);
              }
            }
          }
        };
        visit(val, path);
        return results;
      };

      const badPaths = detectBadToISOString(payload);
      if (badPaths.length > 0) {
        console.error('Detected non-function toISOString properties at paths:', badPaths);
        // Log small samples for each path
        for (const p of badPaths) {
          try {
            const sampleValue = p.split(/\.|\[|\]/).filter(Boolean).reduce((acc: any, key: string) => acc && acc[key], payload as any);
            console.error(`Sample at ${p}:`, sampleValue);
          } catch (e) {
            console.error('Failed to sample for path', p, String(e));
          }
        }
      }

      // Sanitizer: convert Dates -> ISO strings, BigInt -> Number, and recursively handle objects. Access properties safely.
      const sanitize = (value: any, path = ''): any => {
        if (value === null || value === undefined) return value;
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'bigint') return Number(value);
        if (Array.isArray(value)) return value.map((v, i) => sanitize(v, `${path}[${i}]`));
        if (typeof value === 'object') {
          // Handle Postgres numeric/decimal objects that may not be directly serializable
          if (value && typeof value.toString === 'function' && (value.constructor?.name === 'Decimal' || value.constructor?.name === 'BigNumber')) {
            try { return Number(value.toString()); } catch { return String(value.toString()); }
          }
          const out: any = Array.isArray(value) ? [] : {};
          const keys = Object.keys(value as any);
          for (const k of keys) {
            let v;
            try { v = (value as any)[k]; } catch (e) {
              console.warn(`Skipping property ${path ? path + '.' : ''}${k} due to getter error:`, String(e));
              continue;
            }
            try { out[k] = sanitize(v, path ? `${path}.${k}` : k); } catch (e) { out[k] = String(v); }
          }
          return out;
        }
        return value;
      };

      try {
        // Quick stringify test to catch serialization errors early and help with debugging
        JSON.stringify(payload);
      } catch (serErr: any) {
        console.error("Admin dashboard serialization error:", serErr?.message || String(serErr));
        // Find which field fails
        const findProblem = (val: any, path = ''): string | null => {
          try {
            JSON.stringify(val);
            return null;
          } catch (err: any) {
            // If it's an array, try elements
            if (Array.isArray(val)) {
              for (let i = 0; i < val.length; i++) {
                const p = findProblem(val[i], `${path}[${i}]`);
                if (p) return p;
              }
            } else if (val && typeof val === 'object') {
              for (const [k, v] of Object.entries(val)) {
                const p = findProblem(v, path ? `${path}.${k}` : k);
                if (p) return p;
              }
            } else {
              // Primitive non-serializable? return path
              return path || '(root)';
            }
            return path || '(root)';
          }
        };

        for (const [key, value] of Object.entries(payload)) {
          try {
            JSON.stringify(value);
          } catch (e: any) {
            console.error(`Top-level key serialization failed: ${key}`, { type: typeof value, constructor: value?.constructor?.name });
            const problemPath = findProblem(value, key);
            console.error(`Problem located at path: ${problemPath}`);
            // Try to capture a safe sample
            try {
              const sample = Array.isArray(value) ? value.slice(0,5) : (typeof value === 'object' && value !== null) ? Object.fromEntries(Object.entries(value).slice(0,5)) : value;
              console.error('Value sample causing problem:', sample);
            } catch (sampleErr) {
              console.error('Failed to sample value for logging', String(sampleErr));
            }
          }
        }

        // As a fallback, sanitize and send what we can
        const sanitizedFallback = sanitize(payload);
        return res.json(sanitizedFallback);
      }

      // Safe send: sanitize payload to ensure no runtime serialization errors
      const sanitized = sanitize(payload);
      res.json(sanitized);
    } catch (error: any) {
      // Log full error and stack trace to diagnose remaining serialization / getter issues
      console.error("Admin dashboard error:", error?.stack || error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch dashboard data" });
    }
  });

  // Report Generation Endpoints
  app.get("/api/reports/:type", authenticateToken, denyAdmin, async (req: AuthRequest, res) => {
    try {
      const { type } = req.params;
      const { schoolId, studentId, month, year, format = "pdf" } = req.query;

      // Normalize and validate class filter (accept multiple param names for backwards compatibility)
      const requestedClass = (req.query.classSection || req.query.classId || req.query.class) as string | undefined;
      let classSectionParam = requestedClass && String(requestedClass) !== "all" ? String(requestedClass) : undefined;
      let schoolIdParam = (schoolId && String(schoolId) !== "all") ? String(schoolId) : undefined;
      let studentIdParam = (studentId && String(studentId) !== "all") ? String(studentId) : undefined;

      // Enforce role-based scoping
      // - ClassTeacher: forced to their class only
      // - Headmaster: forced to their school only
      // - PO: allowed to request aggregated / multiple schools
      if (req.user) {
        if (req.user.role === "ClassTeacher") {
          if (!req.user.classSection) {
            return res.status(400).json({ message: "ClassTeacher account missing classSection. Cannot determine class scope." });
          }
          // Force class filter to teacher's class and ensure school is set when available
          classSectionParam = req.user.classSection;
          schoolIdParam = req.user.schoolId || schoolIdParam;
        } else if (req.user.role === "Headmaster") {
          // Headmaster exports should be scoped to their school
          schoolIdParam = req.user.schoolId || schoolIdParam;
          // Ignore class filters from headmasters to maintain consistent school-level exports
          if (classSectionParam) {
            console.warn(`Headmaster ${req.user.username} requested class filter ${classSectionParam}; ignoring and using school-level export`);
            classSectionParam = undefined;
          }
        }
      }

      // Fallback logic: if no explicit filter provided, default to school scope when available.
      // For PO role, allow global aggregated exports (no filter) when desired.
      if (!classSectionParam && !schoolIdParam && req.user && req.user.role !== "PO") {
        if (req.user.schoolId) {
          schoolIdParam = req.user.schoolId;
        } else {
          // Require an explicit school or class filter to avoid accidentally returning large datasets
          return res.status(400).json({ message: "Please specify a schoolId or classSection to limit the export." });
        }
      }

      // Normalized filters we will apply to storage queries
      const normalizedFilters = {
        schoolId: schoolIdParam,
        classSection: classSectionParam,
        studentId: studentIdParam,
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
      };

      // Validate report type
      const validTypes = ["annual-health", "monthly-checkup", "meal-tracking", "hostel-attendance", "po-consolidated"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid report type" });
      }

      // Validate format
      const validFormats = ["pdf", "csv", "excel"];
      if (!validFormats.includes(format as string)) {
        return res.status(400).json({ message: "Invalid format. Supported formats: pdf, csv, excel" });
      }

      const reportYear = year ? parseInt(year as string) : new Date().getFullYear();
      const reportMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const currentMonth = reportMonth;
      const currentYear = reportYear;

      const filename = `report-${type}-${reportYear}-${reportMonth}`;

      // Helper to fetch all monthly checkups across pages
      const fetchAllMonthlyCheckups = async (params: any) => {
        const pageLimit = 1000;
        let page = 1;
        let all: any[] = [];
        while (true) {
          const res = await storage.getMonthlyCheckups({ ...params, page, limit: pageLimit });
          const items = res.checkups || [];
          all = all.concat(items);
          if (all.length >= (res.total || 0) || items.length < pageLimit) break;
          page++;
        }
        console.log(`fetchAllMonthlyCheckups: fetched ${all.length} records`);
        return all;
      };

      // Helper to fetch all annual health cards across pages
      const fetchAllAnnualCards = async (params: any) => {
        const pageLimit = 1000;
        let page = 1;
        let all: any[] = [];
        while (true) {
          const res = await storage.getAnnualHealthCards({ ...params, page, limit: pageLimit });
          const items = res.cards || [];
          all = all.concat(items);
          if (all.length >= (res.total || 0) || items.length < pageLimit) break;
          page++;
        }
        console.log(`fetchAllAnnualCards: fetched ${all.length} records`);
        return all;
      };

      // Handle different formats
      if (format === "csv") {
        // Generate CSV data
        let csvData: any[] = [];

        if (type === "monthly-checkup") {
          const filterParams: any = { month: currentMonth, year: currentYear };
          if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;
          if (normalizedFilters.classSection) filterParams.classSection = normalizedFilters.classSection;
          if (normalizedFilters.studentId) filterParams.studentId = normalizedFilters.studentId;

          const checkupsAll = await fetchAllMonthlyCheckups(filterParams);
          csvData = checkupsAll.map((checkup: any) => ({
            StudentName: "Unknown", // Will be populated below
            ClassSection: "N/A",
            CheckupDate: checkup.checkupDate,
            Height: checkup.heightCm,
            Weight: checkup.weightKg,
            BMI: checkup.bmi,
            Present: checkup.present,
            Symptoms: checkup.symptoms?.join("; ") || "",
            SuggestedMedicines: checkup.suggestedMedicines?.join("; ") || "",
            TreatmentType: checkup.treatmentType,
            ReferredTo: checkup.referredTo,
            Notes: checkup.notes
          }));

          // Populate student names
          for (let i = 0; i < csvData.length; i++) {
            const student = await storage.getStudent(checkupsAll[i].studentId);
            csvData[i].StudentName = student?.fullName || "Unknown";
            csvData[i].ClassSection = student?.classSection || "N/A";
          }
        } else if (type === "annual-health") {
          const filterParams: any = { year: currentYear };
          if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;
          if (normalizedFilters.classSection) filterParams.classSection = normalizedFilters.classSection;
          if (normalizedFilters.studentId) filterParams.studentId = normalizedFilters.studentId;

          const cardsAll = await fetchAllAnnualCards(filterParams);
          const cards = cardsAll || [];

          // Fetch latest monthly checkup for each student referenced in the annual cards
          const studentIds = Array.from(new Set(cards.map((c: any) => c.studentId).filter(Boolean)));
          const latestCheckupsByStudent: Record<string, any> = {};
          for (const sid of studentIds) {
            try {
              const { checkups } = await storage.getMonthlyCheckups({ studentId: sid, limit: 1 });
              latestCheckupsByStudent[sid] = (checkups && checkups.length > 0) ? checkups[0] : null;
            } catch (err) {
              latestCheckupsByStudent[sid] = null;
            }
          }

          csvData = cards.map((card: any) => {
            const latest = latestCheckupsByStudent[card.studentId];

            // Use camelCase names produced by the DB layer (drizzle) — avoid snake_case property access to satisfy types
            const visionRight = card.visionRight ?? null;
            const visionLeft = card.visionLeft ?? null;

            // AHE (adolescent health) summary - prefer structured JSON if present otherwise synthesize from summary flags
            let ahe: any = card.adolescentHealthSummary ?? null;
            if (!ahe) {
              const parts: string[] = [];
              if (card.summaryAdolescentMenstrualIssues || card.summary_adolescent_menstrual_issues) parts.push("menstrual_issues");
              if (card.summaryAdolescentSubstanceUse || card.summary_adolescent_substance_use) parts.push("substance_use");
              if (card.summaryAdolescentDepressed || card.summary_adolescent_depressed) parts.push("depressed");
              if (card.summaryAdolescentBurningUrination || card.summary_adolescent_burning_urination) parts.push("burning_urination");
              if (card.summaryAdolescentDischarge || card.summary_adolescent_discharge) parts.push("discharge");
              if (card.summaryAdolescentOther || card.summary_adolescent_other) parts.push(String(card.summaryAdolescentOther ?? card.summary_adolescent_other ?? ""));
              ahe = parts.length > 0 ? parts.join("; ") : null;
            }

            return {
              StudentName: card.nameOfChild ?? "",
              ClassSection: card.classSection ?? "",
              Gender: card.gender ?? "",
              UniqueId: card.uniqueId ?? "",
              AadhaarNo: card.aadhaarNo ?? "",
              PranNo: card.pranNo ?? "",
              FatherGuardianName: card.fatherGuardianName ?? "",
              FatherContact: card.fatherContact ?? "",
              WeightKg: card.weightKg ?? "",
              HeightCm: card.heightCm ?? "",
              BMI: card.bmi ?? "",
              SBP: card.sbp ?? "",
              DBP: card.dbp ?? "",
              VisionRight: visionRight ?? "",
              VisionLeft: visionLeft ?? "",
              AHE: typeof ahe === 'object' ? JSON.stringify(ahe) : (ahe ?? ""),
              LastCheckupDate: latest?.checkupDate ?? "",
              LastCheckupBMI: latest?.bmi ?? "",
              DefectsAtBirth: (card.defectsAtBirth)?.join?.("; ") ?? "",
              Deficiencies: (card.deficiencies)?.join?.("; ") ?? "",
              Notes: card.notes ?? "",
              Status: card.status ?? ""
            };
          });
        }
        // Add other report types...

        console.log(`CSV export for ${type}: ${csvData.length} rows`);
        const csvContent = generateCSV(csvData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send(csvContent);
        return;

      } else if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`${type.replace("-", " ").toUpperCase()} REPORT`);

        // Add title
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'SwasthyaTrack Report';
        titleCell.font = { size: 20, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        worksheet.mergeCells('A2:G2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = `Generated: ${new Date().toLocaleDateString()}`;
        subtitleCell.alignment = { horizontal: 'center' };

        let currentRow = 4;

        if (type === "monthly-checkup") {
          // Add section header
          worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = 'Monthly Health Checkup Summary';
          worksheet.getCell(`A${currentRow}`).font = { size: 16, bold: true };
          currentRow += 2;

          const filterParams: any = { month: currentMonth, year: currentYear };
          if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;
          if (normalizedFilters.classSection) filterParams.classSection = normalizedFilters.classSection;
          if (normalizedFilters.studentId) filterParams.studentId = normalizedFilters.studentId;

          const checkupsAll = await fetchAllMonthlyCheckups(filterParams);

          // Add summary
          worksheet.getCell(`A${currentRow}`).value = 'Summary:';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;
          worksheet.getCell(`A${currentRow}`).value = `Total Checkups: ${checkupsAll.length}`;
          currentRow++;

          const referredCount = checkupsAll.filter((c: any) => c.treatmentType === "Referred").length;
          const primaryCount = checkupsAll.filter((c: any) => c.treatmentType === "Primary").length;
          const presentCount = checkupsAll.filter((c: any) => c.present).length;
          const absentCount = checkupsAll.filter((c: any) => !c.present).length;

          worksheet.getCell(`A${currentRow}`).value = `Referred: ${referredCount}`;
          currentRow++;
          worksheet.getCell(`A${currentRow}`).value = `Primary Treatment: ${primaryCount}`;
          currentRow++;
          worksheet.getCell(`A${currentRow}`).value = `Present: ${presentCount}, Absent: ${absentCount}`;
          currentRow += 2;

          // Add chart for treatment types
          const chartData = [
            { name: 'Referred', value: referredCount },
            { name: 'Primary', value: primaryCount }
          ];

          if (referredCount > 0 || primaryCount > 0) {
            let chartImage: Buffer | null = null;
            try {
              chartImage = await generateChartImage({
                type: 'pie',
                data: {
                  labels: chartData.map(d => d.name),
                  datasets: [{
                    data: chartData.map(d => d.value),
                    backgroundColor: ['#FF6384', '#36A2EB']
                  }]
                },
                options: {
                  responsive: false,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Treatment Types Distribution'
                    }
                  }
                }
              });
            } catch (chartErr) {
              console.error('Failed to generate chart image for Excel:', (chartErr as any)?.message || chartErr);
            }

            if (chartImage) {
              const imageId = workbook.addImage({
                buffer: chartImage as any,
                extension: 'png',
              });

              worksheet.addImage(imageId, {
                tl: { col: 0, row: currentRow },
                ext: { width: 400, height: 300 }
              });
              currentRow += 20;
            }
          }

          // Add data table
          const headers = ['Student Name', 'Class', 'Date', 'Height', 'Weight', 'BMI', 'Present', 'Treatment'];
          headers.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
          });
          currentRow++;

          for (const checkup of checkupsAll) {
            const student = await storage.getStudent(checkup.studentId);
            const studentName = student?.fullName || "Unknown";
            const data = [
              studentName,
              student?.classSection || "N/A",
              checkup.checkupDate,
              checkup.heightCm,
              checkup.weightKg,
              checkup.bmi,
              checkup.present ? 'Yes' : 'No',
              checkup.treatmentType
            ];
            data.forEach((value, index) => {
              worksheet.getCell(currentRow, index + 1).value = value;
            });
            currentRow++;
          }
        } else if (type === "annual-health") {
          // Annual Health cards export
          const filterParams: any = { year: currentYear };
          if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;
          if (normalizedFilters.classSection) filterParams.classSection = normalizedFilters.classSection;
          if (normalizedFilters.studentId) filterParams.studentId = normalizedFilters.studentId;

          const cardsAll = await fetchAllAnnualCards(filterParams);

          // Add section header
          worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
          worksheet.getCell(`A${currentRow}`).value = 'Annual Health Card Report';
          worksheet.getCell(`A${currentRow}`).font = { size: 16, bold: true };
          currentRow += 2;

          worksheet.getCell(`A${currentRow}`).value = `Total Health Cards: ${cardsAll.length}`;
          currentRow += 2;

          // Table headers
          const headers = ['Student Name', 'Class', 'Gender', 'UniqueId', 'WeightKg', 'HeightCm', 'BMI', 'SBP', 'DBP', 'Status', 'Notes'];
          headers.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
          });
          currentRow++;

          for (const card of cardsAll) {
            const data = [
              card.nameOfChild,
              card.classSection,
              card.gender,
              card.uniqueId,
              card.weightKg,
              card.heightCm,
              card.bmi,
              card.sbp,
              card.dbp,
              card.status,
              card.notes
            ];
            data.forEach((value, index) => {
              worksheet.getCell(currentRow, index + 1).value = value;
            });
            currentRow++;
          }
        }

        console.log(`Excel export for ${type} generated`);
        // Send Excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
        return;

      } else {
        // PDF format (default)
        try {
          // Set headers BEFORE creating the document and piping
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);

          const pageSize = (req.query.pageSize as string) || PDF_DEFAULT_OPTIONS.size;
          // Enforce portrait orientation to comply with report requirements
          const layout = 'portrait';
          const doc = new (PDFDocument as any)({ size: pageSize, layout, margins: PDF_DEFAULT_OPTIONS.margins });
          // Use consistent default font for the whole document
          try { doc.font('Helvetica'); } catch (e) { /* ignore if font not available */ }

          // Set metadata (avoid undefined values and set explicit dates)
          const safeType = type || 'Report';
          const creationDate = new Date();
          doc.info = {
            Title: `SwasthyaTrack Report - ${safeType}`,
            Author: 'SwasthyaTrack',
            Subject: `${safeType}`,
            CreationDate: creationDate,
            ModDate: creationDate,
          };
          // Sanitize doc.info to remove any undefined values and ensure date fields are Date objects
          try {
            for (const k of Object.keys(doc.info)) {
              if ((doc.info as any)[k] === undefined) delete (doc.info as any)[k];
              if ((k === 'CreationDate' || k === 'ModDate') && !( (doc.info as any)[k] instanceof Date)) {
                (doc.info as any)[k] = new Date((doc.info as any)[k]);
              }
            }
          } catch (err) {
            console.warn('Failed to sanitize doc.info:', (err as any)?.message || err);
          }

          // Save the generation date to the document for consistent headers on new pages
          (doc as any)._generatedDate = creationDate;
          // Log PDF generation start for debugging export layout issues
          console.log('Starting PDF generation', { type, filename, pageSize, layout, createdAt: creationDate.toLocaleString() });

          // Error handler on doc to catch piping errors (before piping)
          doc.on('error', (err: any) => {
            console.error('PDF document error:', err?.message || String(err));
            if (!res.headersSent) {
              // Safe to send JSON error when headers not sent
              try { res.status(500).json({ message: 'Failed to generate PDF' }); } catch (e) { /* ignore */ }
            } else {
              // If headers already sent, destroy the response to prevent partial/truncated PDF
              try { res.destroy(err); } catch (e) { /* ignore */ }
            }
          });

          // Pipe after all setup is complete
          doc.pipe(res);
          // Log and handle response errors when streaming PDF
          res.on('error', (err: any) => {
            console.error('Response error while streaming PDF:', err?.message || String(err));
            try { res.destroy(err); } catch (e) { /* ignore */ }
          });

          // Ensure header/footer for the first page and subsequent pages
          drawHeaderFooter(doc, `SwasthyaTrack Report - ${type}`, creationDate);
          doc.on('pageAdded', () => {
            console.log('pageAdded event: new page number', doc.page.number);
            drawHeaderFooter(doc, `SwasthyaTrack Report - ${type}`, creationDate);
          });
          // Ensure content starts below the header on the first page (avoid leaving the first page blank)
          try { doc.y = Math.max(doc.y, doc.page.margins.top + 12); } catch (e) { /* ignore */ }
          console.log('PDF initial page:', { page: doc.page.number, y: doc.y });

          // Page title and summary (kept together on the same page)
          const titleText = "SwasthyaTrack Report";
          const generatedDate = creationDate;
          const summaryText = `Summary: This ${type || 'report'} provides key health metrics, visualizations, and detailed analysis for the selected period. For a quick snapshot, see the Key Health Metrics section.`;

          const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const titleHeight = doc.heightOfString(titleText, { width: printableWidth });
          const dateHeight = doc.heightOfString(`Generated: ${generatedDate.toLocaleDateString()}`, { width: printableWidth });
          const summaryHeight = doc.heightOfString(summaryText, { width: printableWidth });
          const blockHeight = titleHeight + dateHeight + summaryHeight + 28;

          // Ensure the whole block fits together on one page
          ensureBlockFits(doc, blockHeight);

          // Use absolute positions to avoid leaving first page blank; center via width
          const topY = doc.page.margins.top + 12;
          doc.fontSize(18).font("Helvetica-Bold").text(titleText, doc.page.margins.left, topY, { align: "center", width: printableWidth });
          doc.fontSize(12).font("Helvetica").text(`Generated: ${generatedDate.toLocaleDateString()}`, doc.page.margins.left, topY + titleHeight + 4, { align: "center", width: printableWidth });
          doc.fontSize(12).font("Helvetica-Bold").text("Summary", doc.page.margins.left, topY + titleHeight + dateHeight + 8, { align: "left", width: printableWidth });
          doc.fontSize(11).font("Helvetica").text(summaryText, doc.page.margins.left, topY + titleHeight + dateHeight + 8 + 16, { align: "left", width: printableWidth });

          // Move doc.y to the end of the block so subsequent content flows correctly
          try { doc.y = topY + blockHeight + 6; } catch (e) { /* ignore */ }

          if (type === "monthly-checkup") {
            try {
              doc.fontSize(16).font("Helvetica-Bold").text("Monthly Health Checkup Summary");
              doc.fontSize(12).font("Helvetica").text(`Month: ${currentMonth}/${currentYear}`);
              doc.moveDown();
  
              const filterParams: any = { month: currentMonth, year: currentYear };
              if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;
              if (studentId && studentId !== "all") filterParams.studentId = studentId;
  
              const checkups = await storage.getMonthlyCheckups(filterParams);
              doc.fontSize(12).text(`Total Checkups: ${checkups.checkups.length}`);
  
              const referredCount = checkups.checkups.filter((c: any) => c.treatmentType === "Referred").length;
              const primaryCount = checkups.checkups.filter((c: any) => c.treatmentType === "Primary").length;
              const presentCount = checkups.checkups.filter((c: any) => c.present).length;
              const absentCount = checkups.checkups.filter((c: any) => !c.present).length;
  
              doc.text(`Referred: ${referredCount}`);
              doc.text(`Primary Treatment: ${primaryCount}`);
              doc.text(`Present: ${presentCount}, Absent: ${absentCount}`);
              doc.moveDown();
  
              // Add treatment distribution chart to PDF
              if (referredCount > 0 || primaryCount > 0) {
                await addChartToDoc(doc, {
                  type: 'pie',
                  data: {
                    labels: ['Referred', 'Primary'],
                    datasets: [{ data: [referredCount, primaryCount], backgroundColor: ['#FF6384', '#36A2EB'] }]
                  },
                  options: {
                    responsive: false,
                    plugins: { title: { display: true, text: 'Treatment Types Distribution' } }
                  }
                }, 400, 300);
              }
  
              doc.fontSize(12).font("Helvetica-Bold").text("Checkup Details:");
              doc.font("Helvetica");
              for (const checkup of checkups.checkups.slice(0, 20)) {
                const student = await storage.getStudent(checkup.studentId);
                const studentName = student?.fullName || "Unknown";
                ensureSpace(doc, 30);
                doc.fontSize(12).text(`- ${studentName} (${student?.classSection || "N/A"}): ${checkup.treatmentType}, Presence: ${checkup.present ? "Present" : "Absent"}`);
                if (checkup.symptoms && checkup.symptoms.length > 0) {
                  doc.fontSize(12).text(`  Symptoms: ${checkup.symptoms.join(", ")}`, { indent: 10, width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
                }
                if (checkup.suggestedMedicines) {
                  doc.fontSize(12).text(`  Medicines: ${checkup.suggestedMedicines}`, { indent: 10, width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
                }
              }
            } catch (tErr) { console.error("PDF generation error (monthly-checkup):", String(tErr)); throw tErr; }
          } else if (type === "meal-tracking") {
            try {
              doc.fontSize(16).font("Helvetica-Bold").text("Meal Tracking Summary");
              doc.fontSize(12).font("Helvetica").text(`Month: ${currentMonth}/${currentYear}`);
              doc.moveDown();
  
              const filterParams: any = {};
              // Use normalized filter (treat "all" as undefined) so server-side logic is consistent
              if (normalizedFilters.schoolId) filterParams.schoolId = normalizedFilters.schoolId;

              const meals = await storage.getMealLogs(filterParams);
              const monthMeals = meals.filter((m: any) => {
                const mealDate = new Date(m.date);
                return mealDate.getMonth() + 1 === currentMonth && mealDate.getFullYear() === currentYear;
              });

              // Normalize mealType to lowercase for robust counting (stored enum is lowercase)
              const breakfasts = monthMeals.filter((m: any) => String(m.mealType || '').toLowerCase() === "breakfast").length;
              const lunches = monthMeals.filter((m: any) => String(m.mealType || '').toLowerCase() === "lunch").length;
              const dinners = monthMeals.filter((m: any) => String(m.mealType || '').toLowerCase() === "dinner").length;
              const uniqueDays = new Set(monthMeals.map((m: any) => m.date));
              const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
              const compliance = uniqueDays.size > 0 ? Math.round((uniqueDays.size / totalDaysInMonth) * 100) : 0;
  
              doc.fontSize(12).text(`Total Meal Logs: ${monthMeals.length}`);
              doc.text(`Breakfasts: ${breakfasts}`);
              doc.text(`Lunches: ${lunches}`);
              doc.text(`Dinners: ${dinners}`);
              doc.text(`Days Logged: ${uniqueDays.size} / ${totalDaysInMonth} (${compliance}% compliance)`);
              doc.moveDown();
  
              doc.fontSize(12).font("Helvetica-Bold").text("Recent Meals:");
              doc.font("Helvetica");
              for (const meal of monthMeals.slice(0, 20)) {
                const student = meal.studentId ? await storage.getStudent(meal.studentId as string) : null;
                const studentName = student?.fullName || "Unknown";
                const mealDate = meal.date ? new Date(meal.date).toLocaleDateString() : "Unknown Date";
                doc.fontSize(12).text(`- ${mealDate} ${meal.mealType}: ${studentName}`);
                if (meal.menuItems && meal.menuItems.length > 0) {
                  doc.fontSize(12).text(`  Items: ${meal.menuItems.join(", ")}`, { indent: 10, width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
                }
                if (meal.imageUrl) {
                  doc.fontSize(12).text(`  Image: ${meal.imageUrl}`, { indent: 10 });
                }
                if (meal.latitude && meal.longitude) {
                  doc.fontSize(12).text(`  Location: ${meal.latitude}, ${meal.longitude}`, { indent: 10 });
                }
              }
            } catch (tErr) { console.error("PDF generation error (meal-tracking):", String(tErr)); throw tErr; }
          } else if (type === "annual-health") {
          doc.fontSize(16).font("Helvetica-Bold").text("Annual Health Card Report");
          doc.fontSize(12).font("Helvetica").text(`Year: ${currentYear}`);
          doc.moveDown();

          const filterParams: any = { year: currentYear };
          if (schoolId && schoolId !== "all") filterParams.schoolId = schoolId;
          if (studentId && studentId !== "all") filterParams.studentId = studentId;

          const cardsResult = await storage.getAnnualHealthCards(filterParams);
          const cards = cardsResult.cards || [];
          const approvedCards = cards.filter((c: any) => c.status === "Approved");
          const rejectedCards = cards.filter((c: any) => c.status === "Rejected");
          const pendingCards = cards.filter((c: any) => c.status === "Pending");

          doc.fontSize(12).text(`Total Health Cards: ${cards.length}`);
          doc.text(`Approved: ${approvedCards.length}`);
          doc.text(`Pending: ${pendingCards.length}`);
          doc.text(`Rejected: ${rejectedCards.length}`);
          doc.moveDown();

          doc.fontSize(12).font("Helvetica-Bold").text("Card Details:");
          doc.font("Helvetica");
          for (const card of cards.slice(0, 20)) {
            try {
              const student = await storage.getStudent(card.studentId);
              const studentName = student?.fullName || "Unknown";
              ensureSpace(doc, 40);
              doc.fontSize(12).text(`- ${studentName} (${card.classSection || "N/A"}): Status: ${card.status}, BMI: ${card.bmi ? parseFloat(card.bmi).toFixed(2) : "N/A"}, Weight: ${card.weightKg || "N/A"}kg, Height: ${card.heightCm || "N/A"}cm`);
              if (card.notes) {
                doc.fontSize(12).text(`  Notes: ${card.notes.substring(0, 200)}`, { indent: 10, width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
              }
            } catch (innerErr: any) {
              // Log the problematic card and error stack to aid debugging without losing the entire report
              console.error('Error rendering annual health card for PDF:', innerErr?.stack || innerErr?.message || String(innerErr));
              try {
                console.error('Problematic card sample:', safeSample({ id: card?.id, studentId: card?.studentId, status: card?.status, keys: Object.keys(card || {}) }));
              } catch (e) {
                console.error('Failed to sample card for logging', String(e));
              }
              // Continue with next card to keep report generation resilient
              continue;
            }
          }
        } else if (type === "hostel-attendance") {
          doc.fontSize(16).font("Helvetica-Bold").text("Hostel Attendance Report");
          doc.fontSize(11).font("Helvetica").text(`Month: ${currentMonth}/${currentYear}`);
          doc.moveDown();

          const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
          const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

          const allAttendance: any[] = [];
          const dates = [];
          for (let d = new Date(monthStart); d <= new Date(monthEnd); d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split("T")[0]);
          }

          for (const date of dates) {
            // Use normalized filter so clients passing 'all' or omitting schoolId will get aggregated data
            const attendance = await storage.getHostelAttendance({ date, schoolId: normalizedFilters.schoolId as string | undefined });
            allAttendance.push(...attendance);
          }

          const uniqueStudents = new Set(allAttendance.map(a => a.studentId));
          doc.fontSize(12).text(`Total Attendance Records: ${allAttendance.length}`);
          doc.text(`Unique Students: ${uniqueStudents.size}`);

          const presentCount = allAttendance.filter(a => a.checkInTime && !a.isVacation).length;
          const absentCount = allAttendance.filter(a => !a.checkInTime && !a.isVacation).length;
          const onVacationCount = allAttendance.filter(a => a.isVacation).length;

          doc.text(`Present: ${presentCount}`);
          doc.text(`Absent: ${absentCount}`);
          doc.text(`On Vacation: ${onVacationCount}`);
          doc.moveDown();

          doc.fontSize(12).font("Helvetica-Bold").text("Recent Attendance:");
          doc.font("Helvetica");
          for (const record of allAttendance.slice(0, 20)) {
            const student = await storage.getStudent(record.studentId);
            const studentName = student?.fullName || "Unknown";
            const status = record.isVacation ? "On Vacation" : (record.checkInTime ? "Present" : "Absent");
            const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : "";
            doc.fontSize(11).text(`- ${studentName}: ${record.date} - ${status}${checkInTime ? ` (Check-in: ${checkInTime})` : ""}`);
            if (record.checkInImageUrl) {
              doc.fontSize(10).text(`  Check-in Image: ${record.checkInImageUrl}`, { indent: 10 });
            }
            if (record.checkOutImageUrl) {
              doc.fontSize(10).text(`  Check-out Image: ${record.checkOutImageUrl}`, { indent: 10 });
            }
          }
        } else if (type === "po-consolidated") {
          doc.fontSize(16).font("Helvetica-Bold").text("PO Consolidated Report");
          doc.fontSize(11).font("Helvetica").text(`Month: ${currentMonth}/${currentYear}`);
          doc.moveDown();
  
          const schoolsResult = await storage.getSchools(1, 1000);
          let schools = schoolsResult.schools || [];

          // If request is from a PO, scope the consolidated report to the PO's district
          if (req.user?.role === "PO") {
            try {
              const currentUser = await storage.getUser(req.user.id);
              const poDistrict = currentUser?.district;
              if (poDistrict) schools = schools.filter(s => sameDistrict(s.district, poDistrict));
            } catch (err) {
              console.warn('Failed to narrow schools to PO district for consolidated report:', (err as any)?.message || err);
            }
          }

          doc.fontSize(10).text(`Total Schools: ${schools.length}`);

          const schoolIds = new Set(schools.map(s => s.id));

          const studentsResult = await storage.getStudents({ limit: 10000 });
          const allStudents = (studentsResult.students || []).filter(s => schoolIds.size ? schoolIds.has(s.schoolId) : true);
          doc.text(`Total Students: ${allStudents.length}`);

          const allCheckupsResult = await storage.getMonthlyCheckups({ month: currentMonth, year: currentYear, limit: 10000 });
          const allCheckups = (allCheckupsResult.checkups || []).filter((c: any) => schoolIds.size ? schoolIds.has(c.schoolId) : true);
          doc.text(`Monthly Checkups: ${allCheckups.length}`);

          const allCardsResult = await storage.getAnnualHealthCards({ year: currentYear, limit: 10000 });
          const allCards = (allCardsResult.cards || []).filter((c: any) => schoolIds.size ? schoolIds.has(c.schoolId) : true);
          doc.text(`Health Cards (${currentYear}): ${allCards.length}`);
          doc.text(`Approved Cards: ${allCards.filter((c: any) => c.status === "Approved").length}`);
          doc.moveDown();
          doc.fontSize(10).font("Helvetica-Bold").text("Schools Summary:");
          doc.font("Helvetica");
          for (const school of schools.slice(0, 20)) {
            const schoolStudents = await storage.getStudents({ schoolId: school.id, limit: 1000 });
            doc.fontSize(11).text(`- ${school.name} (${school.district}, ${school.block}): ${schoolStudents.students.length} students`);
          }
        } else if (type === "students") {
          doc.fontSize(16).font("Helvetica-Bold").text("Students Report");
          doc.fontSize(11).font("Helvetica").text(`Generated: ${new Date().toLocaleDateString()}`);
          doc.moveDown();
  
          const studentsResult = await storage.getStudents({ limit: 1000 });
          const students = studentsResult.students || [];
          doc.fontSize(12).text(`Total Students: ${students.length}`);
  
          doc.moveDown();
          doc.fontSize(12).font("Helvetica-Bold").text("Student Details:");
          doc.font("Helvetica");
          for (const student of students.slice(0, 50)) {
            doc.fontSize(11).text(`- ${student.fullName} (${student.classSection}): ${student.uniqueId}, Gender: ${student.gender}`);
          }
        } else if (type === "school-students") {
          doc.fontSize(16).font("Helvetica-Bold").text("School Students Report");
          doc.fontSize(11).font("Helvetica").text(`School ID: ${schoolId}`);
          doc.moveDown();
  
          const studentsResult = await storage.getStudents({ schoolId: schoolId as string, limit: 1000 });
          const students = studentsResult.students || [];
          doc.fontSize(12).text(`Total Students: ${students.length}`);
  
          doc.moveDown();
          doc.fontSize(12).font("Helvetica-Bold").text("Student Details:");
          doc.font("Helvetica");
          for (const student of students.slice(0, 50)) {
            doc.fontSize(11).text(`- ${student.fullName} (${student.classSection}): ${student.uniqueId}, Gender: ${student.gender}`);
          }
        } else {
          doc.fontSize(12).text("Report type not found");
        }

        doc.end();
      } catch (error: any) {
        console.error("Report generation error:", error?.message || String(error));
        console.error(error?.stack || "no stack available");
        // Only send response if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ message: error?.message || "Failed to generate report" });
        } else {
          // Headers already sent, destroy response to prevent sending truncated PDF
          try { res.destroy(error); } catch (e) { /* ignore */ }
        }
      }
      }
    } catch (error: any) {
      console.error("Report generation error:", error?.message || String(error));
      console.error(error?.stack || "no stack available");
      if (!res.headersSent) {
        res.status(500).json({ message: error?.message || "Failed to generate report" });
      }
    }
  });

  // Image download endpoint
  app.get("/api/images/download", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { type, date, schoolId } = req.query;
      const images: string[] = [];

      if (type === "hostel") {
        // Get all hostel attendance images
        const dateFilter = date as string || new Date().toISOString().split("T")[0];
        const attendance = await storage.getHostelAttendance({
          date: dateFilter,
          schoolId: schoolId as string
        });

        attendance.forEach((record: any) => {
          if (record.checkInImageUrl) images.push(record.checkInImageUrl);
          if (record.checkOutImageUrl) images.push(record.checkOutImageUrl);
        });
      } else if (type === "meals") {
        // Get all meal log images
        const dateFilter = date as string || new Date().toISOString().split("T")[0];
        const meals = await storage.getMealLogs({
          schoolId: schoolId as string
        });

        const filteredMeals = meals.filter((m: any) => {
          if (date) {
            return m.date === dateFilter;
          }
          return true;
        });

        filteredMeals.forEach((meal: any) => {
          if (meal.imageUrl) images.push(meal.imageUrl);
        });
      }

      // Filter to valid image paths (local uploads and external/public URLs)
      const validImages = images.filter(
        (img) => img && (img.startsWith("/uploads/") || img.startsWith("http:") || img.startsWith("https:"))
      );

      res.json({ images: validImages, count: validImages.length });
    } catch (error: any) {
      console.error("Image download error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch images" });
    }
  });

  // Alerts endpoint
  app.get("/api/alerts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Get month and year from query parameters
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Get students for this teacher/class
      const { students } = await storage.getStudents({
        schoolId: user.schoolId || undefined,
        classSection: user.role === "ClassTeacher" ? user.classSection : undefined,
        limit: 1000
      });

      const alerts = {
        critical: [] as any[],
        high: [] as any[],
        medium: [] as any[],
        low: [] as any[]
      };

      // Get health cards for risk assessment (filtered by year)
      for (const student of students) {
        const { cards } = await storage.getAnnualHealthCards({
          studentId: student.id,
          year,
          limit: 1
        });

        if (cards.length > 0) {
          const card = cards[0];

          // BMI-based alerts
          const bmi = card.bmi ? (typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string)) : null;
          if (bmi && !isNaN(bmi)) {
            if (bmi < 16) {
              alerts.critical.push({
                id: `severe-underweight-${student.id}`,
                studentId: student.id,
                studentName: student.fullName,
                classSection: student.classSection,
                priority: "critical",
                reason: `Severe Underweight (BMI: ${bmi.toFixed(1)})`,
                category: "nutrition",
                recommendedAction: "Immediate nutritional intervention required"
              });
            } else if (bmi < 18.5) {
              alerts.high.push({
                id: `underweight-${student.id}`,
                studentId: student.id,
                studentName: student.fullName,
                classSection: student.classSection,
                priority: "high",
                reason: `Underweight (BMI: ${bmi.toFixed(1)})`,
                category: "nutrition",
                recommendedAction: "Nutritional assessment recommended"
              });
            } else if (bmi >= 30) {
              alerts.high.push({
                id: `obese-${student.id}`,
                studentId: student.id,
                studentName: student.fullName,
                classSection: student.classSection,
                priority: "high",
                reason: `Obese (BMI: ${bmi.toFixed(1)})`,
                category: "nutrition",
                recommendedAction: "Weight management program recommended"
              });
            }
          }

          // Disease alerts
          if (card.c7_suspected) {
            alerts.critical.push({
              id: `leprosy-${student.id}`,
              studentId: student.id,
              studentName: student.fullName,
              classSection: student.classSection,
              priority: "critical",
              reason: "Leprosy suspected",
              category: "disease",
              recommendedAction: "Immediate medical referral required"
            });
          }

          if (card.c8_suspected) {
            alerts.critical.push({
              id: `tb-${student.id}`,
              studentId: student.id,
              studentName: student.fullName,
              classSection: student.classSection,
              priority: "critical",
              reason: "Tuberculosis suspected",
              category: "disease",
              recommendedAction: "Immediate medical referral required"
            });
          }

          // Deficiency alerts
          if (card.b3_severe_anemia) {
            alerts.high.push({
              id: `severe-anemia-${student.id}`,
              studentId: student.id,
              studentName: student.fullName,
              classSection: student.classSection,
              priority: "high",
              reason: "Severe anemia detected",
              category: "deficiency",
              recommendedAction: "Iron supplementation and medical follow-up"
            });
          }

          if (card.b6_goitre) {
            alerts.medium.push({
              id: `goitre-${student.id}`,
              studentId: student.id,
              studentName: student.fullName,
              classSection: student.classSection,
              priority: "medium",
              reason: "Goitre detected",
              category: "deficiency",
              recommendedAction: "Iodine supplementation recommended"
            });
          }

          // Adolescent health alerts (age 10+)
          const age = card.ageYears || 0;
          if (age >= 10) {
            if (card.e1_life_events_difficulty || card.e3_persistent_sadness) {
              alerts.medium.push({
                id: `mental-health-${student.id}`,
                studentId: student.id,
                studentName: student.fullName,
                classSection: student.classSection,
                priority: "medium",
                reason: "Mental health concerns identified",
                category: "adolescent",
                recommendedAction: "Counseling services recommended"
              });
            }
          }
        } else {
          // No health card alert
          alerts.medium.push({
            id: `no-health-card-${student.id}`,
            studentId: student.id,
            studentName: student.fullName,
            classSection: student.classSection,
            priority: "medium",
            reason: "No health card submitted",
            category: "assessment",
            recommendedAction: "Health assessment required"
          });
        }
      }

      const summary = {
        totalCritical: alerts.critical.length,
        totalHigh: alerts.high.length,
        totalMedium: alerts.medium.length,
        totalLow: alerts.low.length,
        totalAlerts: alerts.critical.length + alerts.high.length + alerts.medium.length + alerts.low.length,
        byCategory: {
          nutrition: alerts.critical.filter(a => a.category === "nutrition").length + alerts.high.filter(a => a.category === "nutrition").length,
          disease: alerts.critical.filter(a => a.category === "disease").length,
          deficiency: alerts.high.filter(a => a.category === "deficiency").length + alerts.medium.filter(a => a.category === "deficiency").length,
          adolescent: alerts.medium.filter(a => a.category === "adolescent").length,
          assessment: alerts.medium.filter(a => a.category === "assessment").length
        }
      };

      res.json({
        alerts,
        summary
      });
    } catch (error: any) {
      console.error("Get alerts error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch alerts" });
    }
  });

  // Vaccination tracking endpoint
  app.get("/api/vaccination-tracking", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Get month and year from query parameters
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Get students for this teacher/class
      const { students } = await storage.getStudents({
        schoolId: user.schoolId || undefined,
        classSection: user.role === "ClassTeacher" ? user.classSection : undefined,
        limit: 1000
      });

      // Get vaccination data from health cards (filtered by year)
      const vaccinationData = [];
      for (const student of students) {
        const { cards } = await storage.getAnnualHealthCards({
          studentId: student.id,
          year,
          limit: 1
        });

        if (cards.length > 0) {
          const card = cards[0];
          vaccinationData.push({
            studentId: student.id,
            studentName: student.fullName,
            classSection: student.classSection,
            lastUpdated: card.updatedAt || card.createdAt
          });
        } else {
          vaccinationData.push({
            studentId: student.id,
            studentName: student.fullName,
            classSection: student.classSection,
            lastUpdated: null
          });
        }
      }

      // Calculate summary
      const summary = {
        totalStudents: students.length,
      };

      res.json({
        vaccinationData,
        summary
      });
    } catch (error: any) {
      console.error("Get vaccination tracking error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch vaccination tracking" });
    }
  });

  // Growth trends endpoint
  app.get("/api/growth-trends", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Get month and year from query parameters
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Get students for this teacher/class
      const { students } = await storage.getStudents({
        schoolId: user.schoolId || undefined,
        classSection: user.role === "ClassTeacher" ? user.classSection : undefined,
        limit: 1000
      });

      // Generate growth trends for the selected year, focusing on the selected month
      const growthTrends = [];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Generate data for the selected month and a few months around it for context
      const monthsToShow = [month - 2, month - 1, month, month + 1, month + 2].filter(m => m >= 1 && m <= 12);

      for (const targetMonth of monthsToShow) {
        // Get health cards for this month/year
        const monthCards = [];
        for (const student of students) {
          const { cards } = await storage.getAnnualHealthCards({
            studentId: student.id,
            year,
            limit: 10
          });

          // Find cards from this month or earlier
          const relevantCards = cards.filter(card => {
            if (!card.createdAt) return false;
            const cardDate = new Date(card.createdAt);
            return cardDate.getFullYear() === year && cardDate.getMonth() + 1 <= targetMonth;
          });

          if (relevantCards.length > 0) {
            // Use the most recent card for this period
            const latestCard = relevantCards.sort((a, b) =>
              new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
            )[0];
            monthCards.push(latestCard);
          }
        }

        // Calculate averages
        const validCards = monthCards.filter(card =>
          card.heightCm != null && card.weightKg != null && card.bmi != null
        );

        const avgHeight = validCards.length > 0
          ? validCards.reduce((sum, card) => sum + parseFloat(card.heightCm || '0'), 0) / validCards.length
          : 0;

        const avgWeight = validCards.length > 0
          ? validCards.reduce((sum, card) => sum + parseFloat(card.weightKg || '0'), 0) / validCards.length
          : 0;

        const avgBMI = validCards.length > 0
          ? validCards.reduce((sum, card) => {
              const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
              return sum + (isNaN(bmi) ? 0 : bmi);
            }, 0) / validCards.length
          : 0;

        growthTrends.push({
          month: months[targetMonth - 1],
          year,
          avgHeight: parseFloat(avgHeight.toFixed(1)),
          avgWeight: parseFloat(avgWeight.toFixed(1)),
          avgBMI: parseFloat(avgBMI.toFixed(1)),
          studentCount: validCards.length
        });
      }

      // Calculate health risk metrics for the selected year
      const latestCards = [];
      for (const student of students) {
        const { cards } = await storage.getAnnualHealthCards({
          studentId: student.id,
          year,
          limit: 1
        });
        if (cards.length > 0) {
          latestCards.push(cards[0]);
        }
      }

      const healthRiskMetrics = {
        underweight: latestCards.filter(card => {
          const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
          return bmi && bmi < 18.5;
        }).length,
        normal: latestCards.filter(card => {
          const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
          return bmi && bmi >= 18.5 && bmi < 25;
        }).length,
        overweight: latestCards.filter(card => {
          const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
          return bmi && bmi >= 25 && bmi < 30;
        }).length,
        obese: latestCards.filter(card => {
          const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
          return bmi && bmi >= 30;
        }).length,
      };

      const summary = {
        totalStudents: students.length,
        assessedStudents: latestCards.length,
        assessmentRate: students.length > 0 ? Math.round((latestCards.length / students.length) * 100) : 0,
        avgBMI: latestCards.length > 0
          ? parseFloat((latestCards.reduce((sum, card) => {
              const bmi = typeof card.bmi === 'number' ? card.bmi : parseFloat(card.bmi as string);
              return sum + (isNaN(bmi) ? 0 : bmi);
            }, 0) / latestCards.length).toFixed(1))
          : 0
      };

      res.json({
        growthTrends,
        healthRiskMetrics,
        ageGroupRisks: {}, // Placeholder for future implementation
        summary
      });
    } catch (error: any) {
      console.error("Get growth trends error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch growth trends" });
    }
  });

  // Teacher class health summary endpoint
  app.get("/api/teacher/class-health-summary", authenticateToken, authorizeRoles("ClassTeacher", "Admin"), async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { month, year, ageGroup, healthCategory, class_id } = req.query;

      const selectedMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();

      // Get students for this teacher/class
      const { students } = await storage.getStudents({
        schoolId: user.schoolId || undefined,
        classSection: user.role === "ClassTeacher" ? user.classSection : undefined,
        limit: 1000
      });

      // Get health cards for the specified period
      const healthCards = [];
      for (const student of students) {
        const { cards } = await storage.getAnnualHealthCards({
          studentId: student.id,
          year: selectedYear,
          limit: 10
        });
        if (cards.length > 0) {
          healthCards.push({ student, card: cards[0] });
        }
      }

      // Calculate blood pressure categories
      const bloodPressure = {
        normal: 0,
        prehypertension: 0,
        stage1: 0,
        stage2: 0
      };

      healthCards.forEach(({ card }) => {
        let sbp = card.sbp || null;
        let dbp = card.dbp || null;

        // If sbp/dbp not available, try to parse from bloodPressure string
        if ((!sbp || !dbp) && card.bloodPressure) {
          const bpMatch = card.bloodPressure.match(/^(\d+)\/(\d+)$/);
          if (bpMatch) {
            sbp = parseInt(bpMatch[1]);
            dbp = parseInt(bpMatch[2]);
          }
        }

        if (sbp && dbp && !isNaN(sbp) && !isNaN(dbp)) {
          if (sbp < 120 && dbp < 80) {
            bloodPressure.normal++;
          } else if ((sbp >= 120 && sbp < 140) || (dbp >= 80 && dbp < 90)) {
            bloodPressure.prehypertension++;
          } else if ((sbp >= 140 && sbp < 160) || (dbp >= 90 && dbp < 100)) {
            bloodPressure.stage1++;
          } else if (sbp >= 160 || dbp >= 100) {
            bloodPressure.stage2++;
          }
        }
      });

      res.json({
        bloodPressure,
        totalStudents: students.length,
        assessedStudents: healthCards.length,
        assessmentRate: students.length > 0 ? Math.round((healthCards.length / students.length) * 100) : 0
      });
    } catch (error: any) {
      console.error("Get class health summary error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch class health summary" });
    }
  });

  // Teacher referral tracking endpoint
  app.get("/api/teacher/referral-tracking", authenticateToken, authorizeRoles("ClassTeacher", "Admin"), async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { month, year, ageGroup, healthCategory, class_id } = req.query;

      const selectedMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();

      // Get students for this teacher/class
      const { students } = await storage.getStudents({
        schoolId: user.schoolId || undefined,
        classSection: user.role === "ClassTeacher" ? user.classSection : undefined,
        limit: 1000
      });

      // Get referrals for this period
      interface ReferralItem {
        id: string;
        studentId: string;
        studentName: string;
        classSection: string;
        type: string;
        facility: string | null;
        issue: string;
        status: string;
        date: string;
        followUpRequired: boolean;
      }
      const referrals: ReferralItem[] = [];
      try {
        for (const student of students) {
          const { referrals: studentReferrals } = await storage.getReferrals({
            studentId: student.id,
            limit: 100
          });

          // Filter by month/year
          const filteredReferrals = studentReferrals.filter(r => {
            const referralDate = new Date(r.referralDate);
            return referralDate.getMonth() + 1 === selectedMonth && referralDate.getFullYear() === selectedYear;
          });

          filteredReferrals.forEach(referral => {
            referrals.push({
              id: referral.id,
              studentId: student.id,
              studentName: student.fullName,
              classSection: student.classSection,
              type: referral.referralType,
              facility: referral.facility,
              issue: referral.issue,
              status: referral.status,
              date: referral.referralDate,
              followUpRequired: false
            });
          });
        }
      } catch (error) {
        // Referrals table might not exist yet
        console.warn("Referrals table not available for referral tracking");
      }


      // Calculate summary
      const summary = {
        total: referrals.length,
        pending: referrals.filter(r => r.status === "Pending").length,
        completed: referrals.filter(r => r.status === "Completed").length,
        overdue: referrals.filter(r => {
          if (r.status !== "Pending") return false;
          const daysSinceReferral = Math.floor((new Date().getTime() - new Date(r.date).getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceReferral > 30;
        }).length
      };

      res.json({
        referrals,
        summary
      });
    } catch (error: any) {
      console.error("Get referral tracking error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch referral tracking" });
    }
  });

  // Notifications unread count endpoint
  app.get("/api/notifications/unread-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      let count = 0;

      // Pending health card approvals for Headmaster
      if (user.role === "Headmaster" || user.role === "Admin") {
        const pendingCards = await storage.getAnnualHealthCards({
          status: "Pending",
          schoolId: user.role === "Admin" ? undefined : user.schoolId,
          limit: 1000
        });
        count += pendingCards.cards.length;
      }

      // Class Teacher notifications - students without health cards
      if (user.role === "ClassTeacher") {
        const { students } = await storage.getStudents({
          schoolId: user.schoolId ?? undefined,
          classSection: user.classSection,
          limit: 1000
        });
        for (const student of students) {
          const cards = await storage.getAnnualHealthCards({
            studentId: student.id,
            year: new Date().getFullYear(),
            limit: 1
          });
          if (cards.cards.length === 0) {
            count++;
          }
        }
      }

      // Include stored notifications unread count from notifications table
      try {
        const storedUnread = await storage.getUnreadNotificationCount(user.id, user.role as any, user.schoolId ?? undefined, user.classSection ?? undefined);
        count += Number(storedUnread || 0);
      } catch (err: any) {
        console.warn("Failed to fetch stored unread notification count:", err?.message || String(err));
      }

      res.json({ count });
    } catch (error: any) {
      console.error("Get notifications unread count error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch unread count" });
    }
  });

  // Notifications by role endpoint - returns stored notifications filtered by role/school/class
  app.get("/api/notifications/by-role", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { isRead, type, page, limit } = req.query as any;
      const parsedIsRead = isRead === undefined ? undefined : (String(isRead) === "true");
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const params: any = {
        role: user.role,
        page: pageNum,
        limit: limitNum,
      };

      // For school-scoped roles, include schoolId/classSection
      if (user.schoolId) params.schoolId = user.schoolId;
      if (user.role === "ClassTeacher" && user.classSection) params.classSection = user.classSection;

      if (parsedIsRead !== undefined) params.isRead = parsedIsRead;
      if (type) params.type = String(type);

      const result = await storage.getNotifications(params);
      return res.json({ notifications: result.notifications, total: result.total });
    } catch (error: any) {
      console.error("Get notifications by-role error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch notifications by role" });
    }
  });

  // Create notification endpoint
  app.post("/api/notifications/create", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { receiverRole, receiverSchoolId, receiverClassSection, type, title, message, isImportant } = req.body;

      if (!receiverRole || !title || !message) {
        return res.status(400).json({ message: "Receiver role, title, and message are required" });
      }

      // Validate that the user can send to the specified role
      const user = req.user!;
      let canSend = false;
      if (user.role === "Admin") {
        canSend = true;
      } else if (user.role === "PO" && ["Headmaster", "MedicalTeam"].includes(receiverRole)) {
        canSend = true;
      } else if (user.role === "Headmaster" && receiverRole === "ClassTeacher") {
        canSend = true;
      }

      if (!canSend) {
        return res.status(403).json({ message: "You don't have permission to send notifications to this role" });
      }

      const notification = await storage.createNotification({
        senderId: user.id,
        senderRole: user.role as any,
        receiverRole,
        receiverSchoolId: receiverSchoolId || null,
        receiverClassSection: receiverClassSection || null,
        type: type || "manual",
        title,
        message,
        isImportant: isImportant || false,
      });

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Create notification error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to create notification" });
    }
  });

  // Mark single notification as read
  app.patch("/api/notifications/mark-read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { notificationId } = req.body || {};
      if (!notificationId) return res.status(400).json({ message: "notificationId is required" });

      // Fetch notification to verify ownership
      const [notif] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
      if (!notif) return res.status(404).json({ message: "Notification not found" });

      if (notif.receiverRole !== user.role) return res.status(403).json({ message: "Forbidden" });
      if (notif.receiverSchoolId && notif.receiverSchoolId !== user.schoolId && user.role !== "Admin") return res.status(403).json({ message: "Forbidden" });
      if (notif.receiverClassSection && notif.receiverClassSection !== user.classSection) return res.status(403).json({ message: "Forbidden" });

      const updated = await storage.markNotificationAsRead(notificationId, user.id);
      if (!updated) return res.status(500).json({ message: "Failed to mark notification as read" });

      return res.json({ notification: updated });
    } catch (error: any) {
      console.error("Mark notification as read error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for this role/scope
  app.patch("/api/notifications/mark-all-read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const updatedCount = await storage.markAllNotificationsAsRead(user.id, user.role as any, user.schoolId, user.classSection);
      return res.json({ updated: updatedCount });
    } catch (error: any) {
      console.error("Mark all notifications as read error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to mark all notifications as read" });
    }
  });

  // Notifications endpoint
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const notifications: any[] = [];

      // Pending health card approvals for Headmaster
      if (user.role === "Headmaster" || user.role === "Admin") {
        const pendingCards = await storage.getAnnualHealthCards({
          status: "Pending",
          schoolId: user.role === "Admin" ? undefined : user.schoolId,
          limit: 10
        });
        pendingCards.cards.forEach((card: any) => {
          notifications.push({
            id: `card-${card.id}`,
            type: "health_card_pending",
            title: "Health Card Pending Approval",
            message: `Health card for student ${card.nameOfChild || "Unknown"} is pending approval`,
            timestamp: card.createdAt,
            link: `/approvals`,
          });
        });
      }

      // Class Teacher notifications - students without health cards
      if (user.role === "ClassTeacher") {
        const { students } = await storage.getStudents({
          schoolId: user.schoolId ?? undefined,
          classSection: user.classSection,
          limit: 100
        });
        for (const student of students) {
          const cards = await storage.getAnnualHealthCards({
            studentId: student.id,
            year: new Date().getFullYear(),
            limit: 1
          });
          if (cards.cards.length === 0) {
            notifications.push({
              id: `no-card-${student.id}`,
              type: "missing_health_card",
              title: "Missing Health Card",
              message: `Health card not created for ${student.fullName}`,
              timestamp: student.createdAt,
              link: `/health-cards`,
            });
          }
        }
      }

      // Sort by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ notifications: notifications.slice(0, 20) });
    } catch (error: any) {
      console.error("Get notifications error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch notifications" });
    }
  });

  // Drill-down endpoint for PO dashboard metrics
  app.get("/api/po/drilldown", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { metric, schoolId, year, month } = req.query;

      if (!metric || !schoolId) {
        return res.status(400).json({ message: "Metric and schoolId are required" });
      }

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;

      // Verify PO can access this school
      let user = null;
      if (req.user?.role === "PO") {
        user = await storage.getUser(req.user.id);
        const school = await storage.getSchool(schoolId as string);
        if (user?.district && school?.district && !sameDistrict(school.district, user.district)) {
          return res.status(403).json({ message: "You can only access schools in your district" });
        }
      }

      const students = await storage.getDrilldownStudents({
        metric: metric as string,
        schoolIds: [schoolId as string],
        year: yearNum,
        month: monthNum,
        schoolId: schoolId as string,
      });

      res.json({ students, metric, schoolId, year: yearNum, month: monthNum });
    } catch (error: any) {
      console.error("PO drilldown error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch drilldown data" });
    }
  });

  // PO Dashboard Export Endpoints
  app.get("/api/po/export/:type", authenticateToken, authorizeRoles("PO", "Admin"), async (req: AuthRequest, res) => {
    try {
      const { type } = req.params;
      const { month, year, format = "excel" } = req.query;

      const selectedMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();

      // Get PO's district
      const user = await storage.getUser(req.user!.id);
      const poDistrict: string | undefined = user?.district ?? undefined;

      // Get schools for PO's district
      let schools: any[] = [];
      if (req.user?.role === "Admin") {
        const result = await storage.getSchools(1, 1000);
        schools = result.schools;
      } else if (poDistrict) {
        const allSchools = await storage.getSchools(1, 1000);
        schools = allSchools.schools.filter(s => sameDistrict(s.district, poDistrict));
      }

      // Get data based on export type
      let exportData: any[] = [];
      let filename = `po-export-${type}-${selectedYear}-${selectedMonth}`;

      switch (type) {
        case "monthly-health":
          // Monthly health report
          exportData = await Promise.all(
            schools.map(async (school) => {
              const { students } = await storage.getStudents({ schoolId: school.id, limit: 1000 });
              const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, status: "Approved" });
              const { checkups } = await storage.getMonthlyCheckups({ schoolId: school.id, month: selectedMonth, year: selectedYear });

              return {
                schoolName: school.name,
                district: school.district,
                block: school.block,
                totalStudents: students.length,
                healthCardsCompleted: cards.length,
                monthlyCheckups: checkups.length,
                referralsGenerated: checkups.filter(c => c.treatmentType === "Referred").length,
                completionRate: students.length > 0 ? Math.round((cards.length / students.length) * 100) : 0,
              };
            })
          );
          break;

        case "school-referral-summary":
          // School-wise referral summary
          exportData = await Promise.all(
            schools.map(async (school) => {
              const { checkups } = await storage.getMonthlyCheckups({ schoolId: school.id, month: selectedMonth, year: selectedYear });
              const referrals = checkups.filter(c => c.treatmentType === "Referred");

              return {
                schoolName: school.name,
                district: school.district,
                block: school.block,
                totalReferrals: referrals.length,
                pendingReferrals: referrals.length, // Simplified
                completedReferrals: 0, // Simplified
                topIssues: (() => {
                  const issues = [];
                  if (referrals.some(r => r.symptoms?.includes("anemia") || r.symptoms?.includes("Anemia"))) issues.push("Severe Anemia");
                  if (referrals.some(r => r.symptoms?.includes("goitre") || r.symptoms?.includes("Goitre"))) issues.push("Goitre");
                  if (referrals.some(r => r.symptoms?.includes("tb") || r.symptoms?.includes("TB"))) issues.push("TB");
                  if (referrals.some(r => r.symptoms?.includes("leprosy") || r.symptoms?.includes("Leprosy"))) issues.push("Leprosy");
                  return issues.length > 0 ? issues : ["General Health Issues"];
                })(),
              };
            })
          );
          break;

        case "nutritional-status":
          // Nutritional status summary
          const allCards = await Promise.all(
            schools.map(async (school) => {
              const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear });
              return cards;
            })
          );
          const flatCards = allCards.flat();

          exportData = [{
            totalStudentsAssessed: flatCards.length,
            underweightCount: flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi as string) : null);
              return bmi && bmi < 18.5;
            }).length,
            normalWeightCount: flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi as string) : null);
              return bmi && bmi >= 18.5 && bmi < 25;
            }).length,
            overweightCount: flatCards.filter(c => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi as string) : null);
              return bmi && bmi >= 25;
            }).length,
            severeAnemiaCount: flatCards.filter(c => c.b3_severe_anemia).length,
            goitreCount: flatCards.filter(c => c.b6_goitre).length,
            averageBMI: flatCards.length > 0 ? flatCards.reduce((sum, c) => {
              const bmi = typeof c.bmi === 'number' ? c.bmi : (typeof c.bmi === 'string' ? parseFloat(c.bmi as string) : null);
              return sum + (bmi || 0);
            }, 0) / flatCards.length : 0,
          }];
          break;

        case "deficiencies-report":
          // Deficiencies report
          const deficienciesData = await Promise.all(
            schools.map(async (school) => {
              const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear });
              return {
                schoolName: school.name,
                vitaminADeficiency: cards.filter(c => c.b4_vitamin_a_deficiency).length,
                vitaminDDeficiency: cards.filter(c => c.b5_vitamin_d_deficiency).length,
                ironDeficiency: cards.filter(c => c.b3_severe_anemia).length,
                iodineDeficiency: cards.filter(c => c.b6_goitre).length,
                zincDeficiency: cards.filter(c => c.b8_vitb_deficiency).length,
              };
            })
          );
          exportData = deficienciesData;
          break;

        case "tb-leprosy-report":
          // TB/Leprosy red-flag report
          const criticalCases = await Promise.all(
            schools.map(async (school) => {
              const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear });
              return {
                schoolName: school.name,
                tbSuspected: cards.filter(c => c.c8_suspected).length,
                leprosySuspected: cards.filter(c => c.c7_suspected).length,
                totalCriticalCases: cards.filter(c => c.c7_suspected || c.c8_suspected).length,
              };
            })
          );
          exportData = criticalCases.filter(c => c.totalCriticalCases > 0);
          break;

        case "adolescent-health":
          // Adolescent health red-flag
          const adolescentData = await Promise.all(
            schools.map(async (school) => {
              const { cards } = await storage.getAnnualHealthCards({ schoolId: school.id, year: selectedYear });
              const adolescents = cards.filter(c => (c.ageYears || 0) >= 10);

              return {
                schoolName: school.name,
                totalAdolescents: adolescents.length,
                mentalHealthIssues: adolescents.filter(c => c.e1_life_events_difficulty || c.e3_persistent_sadness).length,
                substanceIssues: adolescents.filter(c => c.e2_peer_pressure_substance).length,
                reproductiveHealthIssues: adolescents.filter(c => c.e5_pain_urination || c.e6_foul_discharge).length,
              };
            })
          );
          exportData = adolescentData.filter(a => a.mentalHealthIssues > 0 || a.substanceIssues > 0 || a.reproductiveHealthIssues > 0);
          break;

        default:
          return res.status(400).json({ message: "Invalid export type" });
      }

      // Generate CSV content
      if (format === "csv" || format === "excel") {
        const csvContent = generateCSV(exportData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send(csvContent);
      } else {
        // JSON format
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
        res.json(exportData);
      }

    } catch (error: any) {
      console.error("PO export error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to generate export" });
    }
  });

  // ============================================================================
  // PERIOD TRACKER ROUTES
  // ============================================================================

  // Get period tracker entries for a student
  app.get("/api/period-tracker/:studentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, page, limit } = req.query;

      // Verify student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Lady Superintendent and Admin can access Period Tracker
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId) {
          return res.status(403).json({ message: "Lady Superintendent not assigned to a school" });
        }
        if (student.schoolId !== req.user.schoolId) {
          return res.status(403).json({ message: "Access denied: Student not in your school" });
        }
      } else if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Period Tracker is only accessible to Lady Superintendent" });
      }

      const result = await storage.getPeriodTrackerEntries({
        studentId,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Get period tracker entries error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to fetch period tracker entries" });
    }
  });

  // Create or update a period tracker entry (upsert)
  app.post("/api/period-tracker", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const entryData = req.body;

      // Validate input
      const { studentId, schoolId, entryDate, moods, bodyTemperatureCelsius, painIntensity, flowCategory, symptoms, notes, isReferred, referredDate, referralFacility } = entryData;

      if (!studentId || !schoolId || !entryDate) {
        return res.status(400).json({ message: "studentId, schoolId, and entryDate are required" });
      }

      // Validate referral fields
      if (isReferred) {
        if (!referredDate) {
          return res.status(400).json({ message: "Referred date is required when student is referred" });
        }
        if (!referralFacility) {
          return res.status(400).json({ message: "Referral facility is required when student is referred" });
        }
      }

      // Verify student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Lady Superintendent and Admin can create entries
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId) {
          return res.status(403).json({ message: "Lady Superintendent not assigned to a school" });
        }
        if (student.schoolId !== req.user.schoolId || schoolId !== req.user.schoolId) {
          return res.status(403).json({ message: "Access denied: Student not in your school" });
        }
      } else if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Period Tracker is only accessible to Lady Superintendent" });
      }

      // Validate data types
      if (painIntensity !== undefined && painIntensity !== null && (painIntensity < 0 || painIntensity > 10)) {
        return res.status(400).json({ message: "Pain intensity must be between 0 and 10" });
      }

      if (bodyTemperatureCelsius !== undefined && bodyTemperatureCelsius !== null && (bodyTemperatureCelsius < 35 || bodyTemperatureCelsius > 42)) {
        return res.status(400).json({ message: "Body temperature must be between 35°C and 42°C" });
      }

      if (flowCategory && !["none", "spotting", "light", "medium", "heavy"].includes(flowCategory)) {
        return res.status(400).json({ message: "Invalid flow category" });
      }

      // Create or update entry (upsert)
      console.log(`[API] Calling upsert for student ${studentId} on date ${entryDate}`);
      const entry = await storage.upsertPeriodTrackerEntry({
        studentId,
        schoolId,
        entryDate: new Date(entryDate),
        moods: moods || [],
        bodyTemperatureCelsius,
        painIntensity,
        flowCategory,
        symptoms: symptoms || [],
        notes,
        isReferred: !!isReferred,
        referredDate: isReferred && referredDate ? referredDate : null,
        referralFacility: isReferred ? referralFacility : null,
        recordedBy: req.user?.id,
      });
      console.log(`[API] Upsert successful, returning entry ${entry.id}`);

      res.status(200).json(entry);
    } catch (error: any) {
      console.error("Create/update period tracker entry error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to create/update period tracker entry" });
    }
  });

  // Update a period tracker entry
  app.put("/api/period-tracker/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get existing entry
      const existingEntry = await storage.getPeriodTrackerEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Period tracker entry not found" });
      }

      // Verify student exists
      const student = await storage.getStudent(existingEntry.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Lady Superintendent and Admin can update entries
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || student.schoolId !== req.user.schoolId) {
          return res.status(403).json({ message: "Access denied: Student not in your school" });
        }
      } else if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Period Tracker is only accessible to Lady Superintendent" });
      }

      // Validate data if provided
      if (updateData.painIntensity !== undefined && updateData.painIntensity !== null && 
          (updateData.painIntensity < 0 || updateData.painIntensity > 10)) {
        return res.status(400).json({ message: "Pain intensity must be between 0 and 10" });
      }

      if (updateData.bodyTemperatureCelsius !== undefined && updateData.bodyTemperatureCelsius !== null && 
          (updateData.bodyTemperatureCelsius < 35 || updateData.bodyTemperatureCelsius > 42)) {
        return res.status(400).json({ message: "Body temperature must be between 35°C and 42°C" });
      }

      if (updateData.flowCategory && !["none", "spotting", "light", "medium", "heavy"].includes(updateData.flowCategory)) {
        return res.status(400).json({ message: "Invalid flow category" });
      }

      // Validate referral fields
      if (updateData.isReferred) {
        if (!updateData.referredDate) {
          return res.status(400).json({ message: "Referred date is required when student is referred" });
        }
        if (!updateData.referralFacility) {
          return res.status(400).json({ message: "Referral facility is required when student is referred" });
        }
      }

      // Don't allow changing studentId or schoolId
      delete updateData.studentId;
      delete updateData.schoolId;

      // Handle referral date conversion
      if (updateData.referredDate && typeof updateData.referredDate === 'string') {
        // Keep as string since schema expects string dates
      }

      const updatedEntry = await storage.updatePeriodTrackerEntry(id, updateData);
      res.json(updatedEntry);
    } catch (error: any) {
      console.error("Update period tracker entry error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to update period tracker entry" });
    }
  });

  // Delete a period tracker entry
  app.delete("/api/period-tracker/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      // Get existing entry
      const existingEntry = await storage.getPeriodTrackerEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Period tracker entry not found" });
      }

      // Verify student exists
      const student = await storage.getStudent(existingEntry.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Admin can delete entries
      if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Only Admin can delete entries" });
      }

      await storage.deletePeriodTrackerEntry(id);
      res.json({ message: "Period tracker entry deleted successfully" });
    } catch (error: any) {
      console.error("Delete period tracker entry error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to delete period tracker entry" });
    }
  });

  // Analyze mood trends for a student
  app.get("/api/period-tracker/:studentId/mood-trends", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentId } = req.params;
      const { days } = req.query;

      // Verify student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Lady Superintendent and Admin can access mood trends
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || student.schoolId !== req.user.schoolId) {
          return res.status(403).json({ message: "Access denied: Student not in your school" });
        }
      } else if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Period Tracker is only accessible to Lady Superintendent" });
      }

      const daysToAnalyze = days ? parseInt(days as string) : 30;
      const analysis = await storage.analyzeMoodTrends(studentId, daysToAnalyze);

      res.json(analysis);
    } catch (error: any) {
      console.error("Analyze mood trends error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to analyze mood trends" });
    }
  });

  // Predict next menstrual cycle for a student
  app.get("/api/period-tracker/:studentId/cycle-prediction", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentId } = req.params;

      // Verify student exists
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Authorization: Only Lady Superintendent and Admin can access cycle predictions
      if (req.user?.role === "Lady Superintendent") {
        if (!req.user.schoolId || student.schoolId !== req.user.schoolId) {
          return res.status(403).json({ message: "Access denied: Student not in your school" });
        }
      } else if (req.user?.role !== "Admin") {
        return res.status(403).json({ message: "Access denied: Period Tracker is only accessible to Lady Superintendent" });
      }

      const prediction = await storage.predictNextCycle(studentId);

      res.json(prediction);
    } catch (error: any) {
      console.error("Predict cycle error:", error?.message || String(error));
      res.status(500).json({ message: error?.message || "Failed to predict cycle" });
    }
  });

  // Public Platform Statistics Endpoint (no authentication required)
  app.get("/api/platform-stats", async (req: Request, res: Response) => {
    try {
      // Get current date boundaries for today's stats
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Execute all database queries in parallel for better performance
      const [
        usersResult,
        studentsResult,
        schoolsResult,
        activeUsersResult,
        healthCardsResult,
        totalVisitorsResult,
        todayVisitorsResult,
        totalPageViewsResult,
        loginAttemptsResult,
        successfulLoginsResult,
        todayLoginAttemptsResult,
        todaySuccessfulLoginsResult
      ] = await Promise.all([
        // Total users count (active users only)
        db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.isActive, true)),
        
        // Total students count (active students only)
        db.select({ count: sql<number>`count(*)` })
          .from(students)
          .where(eq(students.isActive, true)),
        
        // Total schools count (active schools only)
        db.select({ count: sql<number>`count(*)` })
          .from(schools)
          .where(eq(schools.isActive, true)),
        
        // Today's active users (users updated today)
        db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.updatedAt} >= ${todayStart} AND ${users.updatedAt} < ${todayEnd} AND ${users.isActive} = true`),
        
        // Health cards count for current year
        db.select({ count: sql<number>`count(*)` })
          .from(annualHealthCards)
          .where(eq(annualHealthCards.year, new Date().getFullYear())),
        
        // Total unique visitors (all time) - if usageTracking table exists
        db.select({ count: sql<number>`count(distinct ${usageTracking.sessionId})` })
          .from(usageTracking)
          .catch(() => ({ count: 0 })),
        
        // Today's unique visitors - if usageTracking table exists
        db.select({ count: sql<number>`count(distinct ${usageTracking.sessionId})` })
          .from(usageTracking)
          .where(sql`${usageTracking.firstVisit} >= ${todayStart} AND ${usageTracking.firstVisit} < ${todayEnd}`)
          .catch(() => ({ count: 0 })),
        
        // Total page views - if usageTracking table exists
        db.select({ sum: sql<number>`coalesce(sum(${usageTracking.pageViews}), 0)` })
          .from(usageTracking)
          .catch(() => ({ sum: 0 })),
        
        // Total login attempts (all time) - if usageTracking table exists
        db.select({ sum: sql<number>`coalesce(sum(${usageTracking.loginAttempts}), 0)` })
          .from(usageTracking)
          .catch(() => ({ sum: 0 })),
        
        // Total successful logins (all time) - if usageTracking table exists
        db.select({ sum: sql<number>`coalesce(sum(${usageTracking.successfulLogins}), 0)` })
          .from(usageTracking)
          .catch(() => ({ sum: 0 })),
        
        // Today's login attempts - if usageTracking table exists
        db.select({ sum: sql<number>`coalesce(sum(${usageTracking.loginAttempts}), 0)` })
          .from(usageTracking)
          .where(sql`${usageTracking.lastActivity} >= ${todayStart} AND ${usageTracking.lastActivity} < ${todayEnd}`)
          .catch(() => ({ sum: 0 })),
        
        // Today's successful logins - if usageTracking table exists
        db.select({ sum: sql<number>`coalesce(sum(${usageTracking.successfulLogins}), 0)` })
          .from(usageTracking)
          .where(sql`${usageTracking.lastActivity} >= ${todayStart} AND ${usageTracking.lastActivity} < ${todayEnd}`)
          .catch(() => ({ sum: 0 }))
      ]);

      // Extract counts from query results with proper error handling
      const totalUsers = Array.isArray(usersResult) ? (usersResult[0]?.count || 0) : 0;
      const totalStudents = Array.isArray(studentsResult) ? (studentsResult[0]?.count || 0) : 0;
      const totalSchools = Array.isArray(schoolsResult) ? (schoolsResult[0]?.count || 0) : 0;
      const todaysActiveUsers = Array.isArray(activeUsersResult) ? (activeUsersResult[0]?.count || 0) : 0;
      const totalHealthCards = Array.isArray(healthCardsResult) ? (healthCardsResult[0]?.count || 0) : 0;
      const totalVisitors = Array.isArray(totalVisitorsResult) ? (totalVisitorsResult[0]?.count || 0) : 0;
      const todayVisitors = Array.isArray(todayVisitorsResult) ? (todayVisitorsResult[0]?.count || 0) : 0;
      const totalPageViews = Array.isArray(totalPageViewsResult) ? (totalPageViewsResult[0]?.sum || 0) : 0;
      const totalLoginAttempts = Array.isArray(loginAttemptsResult) ? (loginAttemptsResult[0]?.sum || 0) : 0;
      const totalSuccessfulLogins = Array.isArray(successfulLoginsResult) ? (successfulLoginsResult[0]?.sum || 0) : 0;
      const todayLoginAttempts = Array.isArray(todayLoginAttemptsResult) ? (todayLoginAttemptsResult[0]?.sum || 0) : 0;
      const todaySuccessfulLogins = Array.isArray(todaySuccessfulLoginsResult) ? (todaySuccessfulLoginsResult[0]?.sum || 0) : 0;

      // Calculate success rate
      const loginSuccessRate = totalLoginAttempts > 0 
        ? Math.round((totalSuccessfulLogins / totalLoginAttempts) * 100) 
        : 0;

      const todayLoginSuccessRate = todayLoginAttempts > 0 
        ? Math.round((todaySuccessfulLogins / todayLoginAttempts) * 100) 
        : 0;

      const stats = {
        // Core platform stats
        totalUsers: Number(totalUsers),
        totalStudents: Number(totalStudents),
        totalSchools: Number(totalSchools),
        todaysActiveUsers: Number(todaysActiveUsers),
        totalHealthCards: Number(totalHealthCards),
        
        // Visitor stats
        totalVisitors: Number(totalVisitors),
        todayVisitors: Number(todayVisitors),
        totalPageViews: Number(totalPageViews),
        
        // Login stats (bonus requirement)
        totalLoginAttempts: Number(totalLoginAttempts),
        totalSuccessfulLogins: Number(totalSuccessfulLogins),
        todayLoginAttempts: Number(todayLoginAttempts),
        todaySuccessfulLogins: Number(todaySuccessfulLogins),
        loginSuccessRate,
        todayLoginSuccessRate,
        
        // Metadata
        lastUpdated: new Date().toISOString(),
        serverTime: new Date().toISOString()
      };

      // Set cache control headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(stats);
    } catch (error: any) {
      console.error("Platform stats error:", error?.message || String(error));
      res.status(500).json({ 
        message: "Failed to fetch platform statistics",
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });


  return _httpServer;
}



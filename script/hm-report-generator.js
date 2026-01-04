import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const USERNAME = process.env.HM_USERNAME || 'headmaster';
const PASSWORD = process.env.HM_PASSWORD || 'password123';

async function login() {
  const res = await global.fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error('Login failed: ' + res.statusText);
  return res.json();
}

async function fetchDashboard(token, month, year) {
  const url = `${BASE}/api/headmaster/dashboard?month=${month}&year=${year}`;
  const res = await global.fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch dashboard: ' + res.statusText);
  return res.json();
}

async function generatePDF(htmlWorkerPath, reportData, outName, reportType) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`file:${htmlWorkerPath}`);
  // Wait for worker to be ready
  await page.waitForFunction('window.workerReady === true');
  // Generate base64 PDF
  const base64 = await page.evaluate(async (data, type) => {
    // window.generateReport must be exposed by the worker
    return await window.generateReport(data, type);
  }, reportData, reportType);

  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(outName, buffer);
  await browser.close();
}

(async () => {
  try {
    console.log('Logging in as', USERNAME);
    const { accessToken, user } = await login();
    console.log('Logged in as', user?.username, 'role', user?.role);

    const month = String(new Date().getMonth() + 1);
    const year = String(new Date().getFullYear());

    console.log('Fetching headmaster dashboard data...');
    const dashboard = await fetchDashboard(accessToken, month, year);

    const htmlWorkerPath = path.resolve('c:/Users/Dell/Downloads/SwasthyaTrackzipalmostworking (2)/SwasthyaTrackzipalmostworking/SwasthyaTrackzip/SwasthyaTrack/script/pdf-worker.html');

    // Prepare outputs directory
    const outDir = path.resolve('c:/Users/Dell/Downloads/SwasthyaTrackzipalmostworking (2)/SwasthyaTrackzipalmostworking/SwasthyaTrackzip/SwasthyaTrack/exports/hm');
    fs.mkdirSync(outDir, { recursive: true });

    // Generate class-wise report
    if (dashboard.classAnalytics && dashboard.classAnalytics.length > 0) {
      console.log('Generating class-wise report PDF...');
      const rows = dashboard.classAnalytics.map((cls) => ({
        classSection: cls.classSection,
        totalStudents: cls.totalStudents,
        avgHeight: cls.avgHeight,
        avgWeight: cls.avgWeight,
        avgBMI: cls.avgBMI,
        underweight: cls.bmiUnderweight,
        normal: cls.bmiNormal,
        overweight: cls.bmiOverweight,
        obese: cls.bmiObese,
      }));
      await generatePDF(htmlWorkerPath, { title: 'Class-wise Report', rows, columns: ['Class', 'Total Students', 'Avg Height (cm)', 'Avg Weight (kg)', 'Avg BMI', 'Underweight Count', 'Normal BMI Count', 'Overweight Count', 'Obese Count'] }, path.join(outDir, `class-wise-report-${year}-${month}.pdf`), 'columns');
      console.log('Saved class-wise report');
    }

    // Referral tracking
    if (dashboard.referralData) {
      console.log('Generating referral tracking PDF...');
      const rows = (dashboard.referralData.referralsByClass || []).map(r => ({
        classSection: r.classSection,
        total: r.total,
        pending: r.pending,
        completed: r.completed,
        completionRate: r.total > 0 ? `${Math.round((r.completed / r.total) * 100)}%` : '0%'
      }));
      await generatePDF(htmlWorkerPath, { title: 'Referral Tracking', rows, columns: ['Class', 'Total Referrals', 'Pending', 'Completed', 'Completion Rate'] }, path.join(outDir, `referral-tracking-${year}-${month}.pdf`), 'columns');
      console.log('Saved referral tracking');
    }

    // School summary
    console.log('Generating school summary PDF...');
    const metrics = dashboard.metrics || {};
    const summaryRows = [
      { Metric: 'Total Students', Value: metrics.totalStudents || 0 },
      { Metric: 'Pending Approvals', Value: metrics.pendingApprovals || 0 },
      { Metric: 'Approved Cards', Value: metrics.approvedCards || 0 },
      { Metric: 'Rejected Cards', Value: metrics.rejectedCards || 0 },
      { Metric: 'Monthly Checkups', Value: metrics.monthlyCheckups || 0 },
      { Metric: 'Meal Compliance', Value: metrics.mealCompliance || 0 },
    ];
    await generatePDF(htmlWorkerPath, { title: 'School Summary', rows: summaryRows, columns: ['Metric', 'Value'] }, path.join(outDir, `school-summary-${year}-${month}.pdf`), 'keyvalue');
    console.log('Saved school summary');

    console.log('All Headmaster PDFs generated in ./exports/hm');
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
})();

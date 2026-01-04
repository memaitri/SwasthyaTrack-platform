// Lazy-load heavy libs (jsPDF, jspdf-autotable, Chart.js) and reuse a single offscreen canvas to reduce allocations
let sharedCanvas: HTMLCanvasElement | null = null;
function getSharedCanvas(width = 800, height = 600) {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
  }
  sharedCanvas.width = width;
  sharedCanvas.height = height;
  const ctx = sharedCanvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas 2D context");
  return { canvas: sharedCanvas, ctx };
}

/**
 * Render a Chart.js config into an offscreen canvas and return a PNG data URL.
 * Keeps things synchronous by waiting briefly after chart creation to allow render.
 */
export async function chartConfigToDataUrl(config: any, width = 800, height = 600) {
  const { canvas, ctx } = getSharedCanvas(width, height);

  // Lazy-load Chart.js only when needed
  const ChartModule = (await import("chart.js/auto")) as any;
  const ChartCtor = ChartModule?.default ?? ChartModule?.Chart ?? (window as any).Chart;

  // Create the chart; Chart.js will render into the shared canvas
  // @ts-ignore
  const chart = new ChartCtor(ctx as any, config);

  // Wait for next frame to allow Chart to finish layout
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const dataUrl = canvas.toDataURL("image/png", 1.0);

  // Cleanup chart instance
  try {
    chart.destroy();
  } catch (err) {
    // ignore
  }

  return dataUrl;
}

/**
 * Helper to convert a student/summary array to autoTable rows
 */
function studentSummaryRows(student: any) {
  return [
    ["Name", student.fullName || "N/A"],
    ["Class/Section", student.classSection || "N/A"],
    ["Student ID", student.id || "N/A"],
    ["Date of Birth", student.dob ? new Date(student.dob).toLocaleDateString() : "N/A"],
  ];
}

/**
 * Generate a clean, ordered PDF for monthly-checkup or annual-health reports including charts.
 * This runs entirely client-side and embeds chart images rendered with Chart.js to match frontend visuals.
 */
export async function generatePdfReport(opts: {
  type: string;
  schoolId?: string;
  studentId?: string;
  month?: string | number;
  year?: string | number;
  schoolName?: string;
}) {
  const { type, schoolId, studentId, month, year, schoolName } = opts;
  const reportDate = new Date();
  const filename = `${type}-${year || reportDate.getFullYear()}-${month || reportDate.getMonth() + 1}.pdf`;

  // Lazy-load jsPDF and jspdf-autotable to avoid inflating initial bundle size
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header: School name, Title, Date
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  if (schoolName) doc.text(String(schoolName), pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(14);
  doc.text(type === "monthly-checkup" ? "Monthly Health Checkup Report" : "Annual Health Report", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${reportDate.toLocaleDateString()}`, pageWidth - 20, 20, { align: "right" });

  let y = 36;

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      // ignore
    }
    return headers;
  };

  // Fetch data needed depending on report type
  if (type === "monthly-checkup") {
    // Fetch the checkups (server already offers JSON on /api/monthly-checkups)
    const params: any = { month: String(month || new Date().getMonth() + 1), year: String(year || new Date().getFullYear()) };
    if (schoolId && schoolId !== "all") params.schoolId = schoolId;
    if (studentId && studentId !== "all") params.studentId = studentId;

    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/monthly-checkups?${qs}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch monthly checkups for report");
    const { checkups = [] } = await res.json();

    // Student summary table (if single student) or aggregated summary
    if (studentId && studentId !== "all") {
      const studentRes = await fetch(`/api/students/${studentId}`, { headers: getAuthHeaders() });
      const student = studentRes.ok ? await studentRes.json() : { fullName: "Unknown" };

      doc.setFontSize(12);
      doc.text("Student summary", 14, y);
      y += 6;

      autoTable(doc as any, {
        startY: y,
        theme: "grid",
        head: [["Field", "Value"]],
        body: studentSummaryRows(student),
        styles: { cellPadding: 2, fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Health metrics
      const latest = checkups.length > 0 ? checkups[0] : null;
      doc.setFontSize(12);
      doc.text("Health metrics", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Height: ${latest?.heightCm ?? "N/A"} cm`, 14, y);
      y += 6;
      doc.text(`Weight: ${latest?.weightKg ?? "N/A"} kg`, 14, y);
      y += 6;
      doc.text(`BMI: ${latest?.bmi ?? "N/A"}`, 14, y);
      y += 10;

      // Nutrition status - compute from BMI categories (simple mapping)
      const categories = { Underweight: 0, Normal: 0, Overweight: 0, Obese: 0 };
      for (const c of checkups) {
        const bmi = Number(c.bmi);
        if (!isFinite(bmi)) continue;
        if (bmi < 18.5) categories.Underweight++;
        else if (bmi < 25) categories.Normal++;
        else if (bmi < 30) categories.Overweight++;
        else categories.Obese++;
      }

      // Charts: BMI distribution (pie) and Nutrition status (pie — same for single student)
      const bmiConfig = {
        type: "pie",
        data: {
          labels: Object.keys(categories),
          datasets: [
            {
              data: Object.values(categories),
              backgroundColor: ["#f97316", "#10b981", "#60a5fa", "#ef4444"],
            },
          ],
        },
        options: { plugins: { legend: { display: true, position: "bottom" } } },
      };

      const bmiImage = await chartConfigToDataUrl(bmiConfig, 600, 400);
      doc.addImage(bmiImage, "PNG", 14, y, 90, 60);
      doc.addImage(bmiImage, "PNG", 110, y, 90, 60); // small duplication: one as BMI distribution and one for Nutrition for single-student
      y += 70;

      // Final remarks
      doc.setFontSize(12);
      doc.text("Final remarks / summary", 14, y);
      y += 6;
      doc.setFontSize(10);
      const remarks = `Total records used for charts: ${checkups.length}. Latest checkup date: ${latest?.checkupDate ?? "N/A"}`;
      doc.text(remarks, 14, y, { maxWidth: pageWidth - 28 });

    } else {
      // Aggregated report for all students / a school
      doc.setFontSize(12);
      doc.text("Summary", 14, y);
      y += 6;

      const totalCheckups = checkups.length;
      const avgHeight = (checkups.reduce((s: number, c: any) => s + (c.heightCm || 0), 0) / Math.max(1, totalCheckups)).toFixed(1);
      const avgWeight = (checkups.reduce((s: number, c: any) => s + (c.weightKg || 0), 0) / Math.max(1, totalCheckups)).toFixed(1);
      const avgBmi = (checkups.reduce((s: number, c: any) => s + (Number(c.bmi) || 0), 0) / Math.max(1, totalCheckups)).toFixed(1);

      autoTable(doc as any, {
        startY: y,
        theme: "grid",
        head: [["Metric", "Value"]],
        body: [
          ["Total checkups", String(totalCheckups)],
          ["Average height (cm)", String(avgHeight)],
          ["Average weight (kg)", String(avgWeight)],
          ["Average BMI", String(avgBmi)],
        ],
        styles: { cellPadding: 2, fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Compute BMI distribution and nutrition status
      const categories: any = { Underweight: 0, Normal: 0, Overweight: 0, Obese: 0 };
      for (const c of checkups) {
        const bmi = Number(c.bmi);
        if (!isFinite(bmi)) continue;
        if (bmi < 18.5) categories.Underweight++;
        else if (bmi < 25) categories.Normal++;
        else if (bmi < 30) categories.Overweight++;
        else categories.Obese++;
      }

      const bmiConfig = {
        type: "pie",
        data: {
          labels: Object.keys(categories),
          datasets: [
            {
              data: Object.values(categories),
              backgroundColor: ["#f97316", "#10b981", "#60a5fa", "#ef4444"],
            },
          ],
        },
        options: { plugins: { legend: { display: true, position: "bottom" } } },
      };

      const nutritionConfig = {
        type: "pie",
        data: {
          labels: ["Normal", "At risk"],
          datasets: [
            {
              data: [categories.Normal, categories.Underweight + categories.Overweight + categories.Obese],
              backgroundColor: ["#10b981", "#f97316"],
            },
          ],
        },
        options: { plugins: { legend: { display: true, position: "bottom" } } },
      };

      const bmiImage = await chartConfigToDataUrl(bmiConfig, 700, 500);
      const nutImage = await chartConfigToDataUrl(nutritionConfig, 700, 500);

      doc.addImage(bmiImage, "PNG", 14, y, 90, 60);
      doc.addImage(nutImage, "PNG", 110, y, 90, 60);
      y += 70;

      doc.setFontSize(12);
      doc.text("Final remarks / summary", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Total checkups included: ${checkups.length}. Generated by SwasthyaTrack.`, 14, y, { maxWidth: pageWidth - 28 });
    }
  } else if (type === "annual-health") {
    // For annual health: prefer per-student report when studentId is given. Otherwise fetch annual cards and create a small summary.
    if (!studentId || studentId === "all") {
      // Fallback to server PDF if no student specified to avoid complexity
      throw new Error("Client-side annual health PDF requires selecting a student. Please select a student or use server PDF generation.");
    }

    const cardRes = await fetch(`/api/annual-cards?studentId=${studentId}&limit=1`, { headers: getAuthHeaders() });
    if (!cardRes.ok) throw new Error("Failed to fetch annual health card");
    const cards = await cardRes.json();
    const card = cards?.cards?.[0] || null;
    if (!card) throw new Error("No annual health card found for the selected student");

    // Student summary
    doc.setFontSize(12);
    doc.text("Student summary", 14, y);
    y += 6;
    autoTable(doc as any, {
      startY: y,
      theme: "grid",
      head: [["Field", "Value"]],
      body: studentSummaryRows(card),
      styles: { cellPadding: 2, fontSize: 10 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Health metrics
    doc.setFontSize(12);
    doc.text("Health metrics", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Height: ${card.heightCm ?? "N/A"} cm`, 14, y);
    y += 6;
    doc.text(`Weight: ${card.weightKg ?? "N/A"} kg`, 14, y);
    y += 6;
    doc.text(`BMI: ${card.bmi ?? "N/A"}`, 14, y);
    y += 10;

    // Nutrition status: use card.status or derived
    doc.setFontSize(12);
    doc.text("Nutrition status", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(card.nutritionStatus || card.bmi_category || "N/A", 14, y);
    y += 10;

    // For charts do BMI distribution across recent monthly checkups for that student
    const monthParams = new URLSearchParams({ studentId, limit: "1000" }).toString();
    const res = await fetch(`/api/monthly-checkups?${monthParams}`, { headers: getAuthHeaders() });
    const { checkups = [] } = res.ok ? await res.json() : { checkups: [] };

    const categories: any = { Underweight: 0, Normal: 0, Overweight: 0, Obese: 0 };
    for (const c of checkups) {
      const bmi = Number(c.bmi);
      if (!isFinite(bmi)) continue;
      if (bmi < 18.5) categories.Underweight++;
      else if (bmi < 25) categories.Normal++;
      else if (bmi < 30) categories.Overweight++;
      else categories.Obese++;
    }

    const bmiConfig = { type: "pie", data: { labels: Object.keys(categories), datasets: [{ data: Object.values(categories), backgroundColor: ["#f97316", "#10b981", "#60a5fa", "#ef4444"] }] }, options: { plugins: { legend: { display: true, position: "bottom" } } } };
    const nutritionConfig = { type: "pie", data: { labels: ["Normal", "At risk"], datasets: [{ data: [categories.Normal, categories.Underweight + categories.Overweight + categories.Obese], backgroundColor: ["#10b981", "#f97316"] }] }, options: { plugins: { legend: { display: true, position: "bottom" } } } };

    const bmiImage = await chartConfigToDataUrl(bmiConfig, 700, 500);
    const nutImage = await chartConfigToDataUrl(nutritionConfig, 700, 500);

    doc.addImage(bmiImage, "PNG", 14, y, 90, 60);
    doc.addImage(nutImage, "PNG", 110, y, 90, 60);
    y += 70;

    doc.setFontSize(12);
    doc.text("Final remarks / summary", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Records used for charts: ${checkups.length}.`, 14, y, { maxWidth: pageWidth - 28 });
  } else {
    throw new Error("Unsupported report type for client-side PDF generation");
  }

  // Return blob so caller can trigger download as needed
  const pdfBlob = doc.output("blob");
  return { blob: pdfBlob, filename };
}

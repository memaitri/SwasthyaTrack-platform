import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { LineChart } from "@/components/charts/LineChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { generateYearOptions } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatGenderDisplay } from "@/lib/genderUtils";
import {
  Users,
  FileHeart,
  Stethoscope,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Shield,
  Download,
  FileText,
  BarChart3,
  Target,
  Activity,
  Heart,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/csvExport";
import { exportToPDF, exportToExcel } from "@/lib/exportService";
import { useAuthenticatedFetch } from "@/lib/auth";

export default function HeadmasterDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("overview");
  const [exportFormat, setExportFormat] = useState("csv");
  const authenticatedFetch = useAuthenticatedFetch();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/headmaster/dashboard", selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      const res = await apiRequest("GET", `/api/headmaster/dashboard?${params}`);
      return res.json();
    },
  });

  const metrics = dashboardData?.metrics || {
    totalStudents: 0,
    pendingApprovals: 0,
    approvedCards: 0,
    rejectedCards: 0,
    monthlyCheckups: 0,
    mealCompliance: 0,
  };

  const pendingCards = dashboardData?.pendingCards || [];
  const recentCheckups = dashboardData?.recentCheckups || [];
  const recentMeals = dashboardData?.recentMeals || [];
  const classAggregates: any[] = dashboardData?.classAnalytics || [];
  // Derive school-level metrics from returned data so the UI shows accurate values
  const referralData = dashboardData?.referralData || {
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    referralsByClass: [],
    recentReferrals: [],
  };

  const schoolMetrics: any = {
    totalReferrals: referralData.totalReferrals || classAggregates.reduce((s, c) => s + (c.pendingReferrals || 0) + (c.completedReferrals || 0), 0),
    pendingReferrals: referralData.pendingReferrals || classAggregates.reduce((s, c) => s + (c.pendingReferrals || 0), 0),
    completedReferrals: referralData.completedReferrals || classAggregates.reduce((s, c) => s + (c.completedReferrals || 0), 0),
    c7Cases: classAggregates.reduce((s, c) => s + (c.c7Cases || 0), 0),
    c8Cases: classAggregates.reduce((s, c) => s + (c.c8Cases || 0), 0),
  };

  // Client-side pretty exports for Headmaster reports
  const downloadBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExportHealthSummary = async () => {
    try {
      const rows = (classAggregates || []).map((cls: any) => ({
        Class: cls.classSection,
        'Total Students': cls.totalStudents,
        'Avg Height (cm)': cls.avgHeight,
        'Avg Weight (kg)': cls.avgWeight,
        'Avg BMI': cls.avgBMI,
        'Underweight': cls.bmiUnderweight,
        'Normal': cls.bmiNormal,
        'Overweight': cls.bmiOverweight,
        'Obese': cls.bmiObese,
      }));
      const columns = [
        { key: 'Class', header: 'Class' },
        { key: 'Total Students', header: 'Total Students' },
        { key: 'Avg Height (cm)', header: 'Avg Height (cm)' },
        { key: 'Avg Weight (kg)', header: 'Avg Weight (kg)' },
        { key: 'Avg BMI', header: 'Avg BMI' },
        { key: 'Underweight', header: 'Underweight' },
        { key: 'Normal', header: 'Normal' },
        { key: 'Overweight', header: 'Overweight' },
        { key: 'Obese', header: 'Obese' },
      ];
      await exportToPDF(rows as any, { columns }, 'Headmaster');
    } catch (err) {
      console.error('Health Summary export failed', err);
      alert('Failed to generate Health Summary PDF');
    }
  };

  const handleExportGrowthTrends = async () => {
    try {
      const { generatePdfReport } = await import('@/lib/pdfReports');
      const { blob, filename } = await generatePdfReport({ type: 'monthly-checkup', month: selectedMonth, year: selectedYear });
      downloadBlob(blob as Blob, filename || `growth-trends-${selectedYear}-${selectedMonth}.pdf`);
    } catch (err) {
      console.error('Growth Trends export failed', err);
      alert('Failed to generate Growth Trends PDF');
    }
  };

  const handleExportVaccinationReport = async () => {
    try {
      // Use available dashboard referral/vaccination aggregates if present
      const rows = (dashboardData?.vaccinationSummary || []).map((r: any) => ({
        School: r.schoolName || dashboardData?.schoolName || '—',
        Student: r.studentName || '—',
        Vaccine: r.vaccine || '—',
        Status: r.status || '—',
      }));
      if (rows.length === 0 && dashboardData?.vaccinationSummary === undefined) {
        // Fallback: request server JSON for vaccination summary if endpoint exists
        const res = await authenticatedFetch('/api/reports/po-consolidated?format=json');
        if (res.ok) {
          const json = await res.json();
          const vac = json.vaccination || json.vaccinationSummary || [];
          const cols = [{ key: 'Student', header: 'Student' }, { key: 'Vaccine', header: 'Vaccine' }, { key: 'Status', header: 'Status' }];
          await exportToPDF(vac as any, { columns: cols }, 'Headmaster');
          return;
        }
      }
      const cols = [{ key: 'Student', header: 'Student' }, { key: 'Vaccine', header: 'Vaccine' }, { key: 'Status', header: 'Status' }];
      await exportToPDF(rows as any, { columns: cols }, 'Headmaster');
    } catch (err) {
      console.error('Vaccination export failed', err);
      alert('Failed to generate Vaccination PDF');
    }
  };

  const handleExportAlertsSummary = async () => {
    try {
      const rows = (dashboardData?.alerts || []).map((a: any) => ({
        ID: a.id,
        Student: a.studentName || '—',
        Type: a.type || '—',
        Message: a.message || '—',
        Date: a.date || '—',
      }));
      const cols = [{ key: 'ID', header: 'ID' }, { key: 'Student', header: 'Student' }, { key: 'Type', header: 'Type' }, { key: 'Message', header: 'Message' }, { key: 'Date', header: 'Date' }];
      await exportToPDF(rows as any, { columns: cols }, 'Headmaster');
    } catch (err) {
      console.error('Alerts export failed', err);
      alert('Failed to generate Alerts PDF');
    }
  };

  const handleExportStudentRoster = async () => {
    try {
      let studentsList: any[] = [];
      if (dashboardData?.students && dashboardData.students.length) studentsList = dashboardData.students;
      else {
        const res = await authenticatedFetch('/api/students');
        if (res.ok) studentsList = await res.json();
      }
      const rows = (studentsList || []).map((s: any) => ({
        'Student ID': s.id,
        Name: s.fullName || s.name || s.studentName || '—',
        Age: s.age || '—',
        Gender: formatGenderDisplay(s.gender) || '—',
        'Class/Section': s.classSection || s.class || '—',
      }));
      const cols = [{ key: 'Student ID', header: 'Student ID' }, { key: 'Name', header: 'Name' }, { key: 'Age', header: 'Age' }, { key: 'Gender', header: 'Gender' }, { key: 'Class/Section', header: 'Class/Section' }];
      await exportToPDF(rows as any, { columns: cols }, 'Headmaster');
    } catch (err) {
      console.error('Student roster export failed', err);
      alert('Failed to generate Student Roster PDF');
    }
  };

  const handleExportDashboardMetrics = async () => {
    try {
      const rows = [
        { Metric: 'Total Students', Value: metrics.totalStudents || 0 },
        { Metric: 'Pending Approvals', Value: metrics.pendingApprovals || 0 },
        { Metric: 'Approved Cards', Value: metrics.approvedCards || 0 },
        { Metric: 'Rejected Cards', Value: metrics.rejectedCards || 0 },
        { Metric: 'Monthly Checkups', Value: metrics.monthlyCheckups || 0 },
        { Metric: 'Meal Compliance', Value: metrics.mealCompliance || 0 },
      ];
      const cols = [{ key: 'Metric', header: 'Metric' }, { key: 'Value', header: 'Value' }];
      await exportToPDF(rows as any, { columns: cols }, 'Headmaster');
    } catch (err) {
      console.error('Dashboard metrics export failed', err);
      alert('Failed to generate Dashboard Metrics PDF');
    }
  };

  // Export functions
  const exportClassWiseReport = async () => {
    if (!classAggregates.length) return;

    if (exportFormat === "csv") {
      const exportData = classAggregates.map((cls: any) => ({
        "Class": cls.classSection,
        "Total Students": cls.totalStudents,
        "Avg Height (cm)": cls.avgHeight,
        "Avg Weight (kg)": cls.avgWeight,
        "Avg BMI": cls.avgBMI,
        "Underweight Count": cls.bmiUnderweight,
        "Normal BMI Count": cls.bmiNormal,
        "Overweight Count": cls.bmiOverweight,
        "Obese Count": cls.bmiObese,
        "Normal BP": cls.bpNormal,
        "Prehypertension": cls.bpPrehypertension,
        "Stage 1 HTN": cls.bpStage1,
        "Stage 2 HTN": cls.bpStage2,
        "Deficiencies Count": cls.deficienciesCount,
        "Diseases Count": cls.diseasesCount,
        "C7 Cases": cls.c7Cases,
        "C8 Cases": cls.c8Cases,
        "Developmental Delays": cls.developmentalDelays,
        "Adolescent Concerns": cls.adolescentConcerns,
        "Pending Referrals": cls.pendingReferrals,
        "Completed Referrals": cls.completedReferrals,
      }));

      const columns = [
        { key: "Class", header: "Class" },
        { key: "Total Students", header: "Total Students" },
        { key: "Avg Height (cm)", header: "Avg Height (cm)" },
        { key: "Avg Weight (kg)", header: "Avg Weight (kg)" },
        { key: "Avg BMI", header: "Avg BMI" },
        { key: "Underweight Count", header: "Underweight Count" },
        { key: "Normal BMI Count", header: "Normal BMI Count" },
        { key: "Overweight Count", header: "Overweight Count" },
        { key: "Obese Count", header: "Obese Count" },
        { key: "Normal BP", header: "Normal BP" },
        { key: "Prehypertension", header: "Prehypertension" },
        { key: "Stage 1 HTN", header: "Stage 1 HTN" },
        { key: "Stage 2 HTN", header: "Stage 2 HTN" },
        { key: "Deficiencies Count", header: "Deficiencies Count" },
        { key: "Diseases Count", header: "Diseases Count" },
        { key: "C7 Cases", header: "C7 Cases" },
        { key: "C8 Cases", header: "C8 Cases" },
        { key: "Developmental Delays", header: "Developmental Delays" },
        { key: "Adolescent Concerns", header: "Adolescent Concerns" },
        { key: "Pending Referrals", header: "Pending Referrals" },
        { key: "Completed Referrals", header: "Completed Referrals" },
      ];

      exportToCSV(exportData, columns, `class-wise-report-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Use client exporter for PDF/Excel reproducing the pretty layout
      const rows = classAggregates.map((cls: any) => ({
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
      const columns = [
        { key: 'classSection', header: 'Class' },
        { key: 'totalStudents', header: 'Total Students' },
        { key: 'avgHeight', header: 'Avg Height (cm)' },
        { key: 'avgWeight', header: 'Avg Weight (kg)' },
        { key: 'avgBMI', header: 'Avg BMI' },
        { key: 'underweight', header: 'Underweight Count' },
        { key: 'normal', header: 'Normal BMI Count' },
        { key: 'overweight', header: 'Overweight Count' },
        { key: 'obese', header: 'Obese Count' },
      ];

      try {
        if (exportFormat === 'pdf') {
          await exportToPDF(rows as any, { includeNutrition: false, includeMedical: false, columns }, 'Headmaster');
        } else if (exportFormat === 'xlsx') {
          await exportToExcel(rows as any, { includeNutrition: false, includeMedical: false, columns }, 'Headmaster');
        }
      } catch (err) {
        console.error('Export failed', err);
      }
    }
  };

  const handleClassAggregatesExport = (type?: "csv" | "pdf" | "xlsx") => {
    if (!classAggregates || classAggregates.length === 0) return;
    try {
      if (type === 'pdf') {
        exportToPDF(classAggregates as any, { includeNutrition: false, includeMedical: false }, 'Headmaster');
      } else if (type === 'xlsx') {
        exportToExcel(classAggregates as any, { includeNutrition: false, includeMedical: false }, 'Headmaster');
      } else {
        const exportData = classAggregates.map((cls: any) => ({
          Class: cls.classSection,
          "Total Students": cls.totalStudents,
          "Avg Height (cm)": cls.avgHeight,
          "Avg Weight (kg)": cls.avgWeight,
          "Avg BMI": cls.avgBMI,
        }));
        const columns = [
          { key: 'Class', header: 'Class' },
          { key: 'Total Students', header: 'Total Students' },
          { key: 'Avg Height (cm)', header: 'Avg Height (cm)' },
          { key: 'Avg Weight (kg)', header: 'Avg Weight (kg)' },
          { key: 'Avg BMI', header: 'Avg BMI' },
        ];
        exportToCSV(exportData, columns, `class-wise-report-${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const exportReferralTracking = async () => {
    if (exportFormat === "csv") {
      const exportData = referralData.referralsByClass.map((cls: any) => ({
        "Class": cls.classSection,
        "Total Referrals": cls.total,
        "Pending": cls.pending,
        "Completed": cls.completed,
        "Completion Rate": `${cls.total > 0 ? Math.round((cls.completed / cls.total) * 100) : 0}%`,
      }));

      const columns = [
        { key: "Class", header: "Class" },
        { key: "Total Referrals", header: "Total Referrals" },
        { key: "Pending", header: "Pending" },
        { key: "Completed", header: "Completed" },
        { key: "Completion Rate", header: "Completion Rate" },
      ];

      exportToCSV(exportData, columns, `referral-tracking-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Use client-side exporter to produce styled PDF/Excel from available dashboard data
      const rows = referralData.referralsByClass || [];
      const columns = [
        { key: 'classSection', header: 'Class' },
        { key: 'total', header: 'Total Referrals' },
        { key: 'pending', header: 'Pending' },
        { key: 'completed', header: 'Completed' },
        { key: 'completionRate', header: 'Completion Rate' },
      ];
      // enrich rows with completionRate string
      const prepared = rows.map((r: any) => ({
        ...r,
        completionRate: r.total > 0 ? `${Math.round((r.completed / r.total) * 100)}%` : '0%'
      }));
      try {
        if (exportFormat === 'pdf') {
          await exportToPDF(prepared as any, { includeNutrition: false, includeMedical: false, columns }, 'Headmaster');
        } else if (exportFormat === 'xlsx') {
          await exportToExcel(prepared as any, { includeNutrition: false, includeMedical: false, columns }, 'Headmaster');
        }
      } catch (err) {
        console.error('Export failed', err);
        throw err;
      }
    }
  };

  const exportSchoolSummary = async () => {
    if (exportFormat === "csv") {
      const summaryData = [{
        "Metric": "Total Students",
        "Value": metrics.totalStudents || 0,
      }, {
        "Metric": "Classes",
        "Value": Object.keys(dashboardData?.checkupsByClass || {}).length,
      }, {
        "Metric": "Students Requiring Referrals",
        "Value": referralData.totalReferrals || 0,
      }, {
        "Metric": "Pending Referrals",
        "Value": referralData.pendingReferrals || 0,
      }, {
        "Metric": "Completed Referrals",
        "Value": referralData.completedReferrals || 0,
      }, {
        "Metric": "Referral Completion Rate",
        "Value": `${referralData.totalReferrals > 0 ? Math.round(((referralData.completedReferrals || 0) / referralData.totalReferrals) * 100) : 0}%`,
      }];

      const columns = [
        { key: "Metric", header: "Metric" },
        { key: "Value", header: "Value" },
      ];

      exportToCSV(summaryData, columns, `school-summary-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Use client exporter for PDF/Excel
      const rows = [{
        Metric: 'Total Students', Value: metrics.totalStudents || 0,
      }, {
        Metric: 'Classes', Value: Object.keys(dashboardData?.checkupsByClass || {}).length,
      }, {
        Metric: 'Students Requiring Referrals', Value: referralData.totalReferrals || 0,
      }, {
        Metric: 'Pending Referrals', Value: referralData.pendingReferrals || 0,
      }, {
        Metric: 'Completed Referrals', Value: referralData.completedReferrals || 0,
      }, {
        Metric: 'Referral Completion Rate', Value: `${referralData.totalReferrals > 0 ? Math.round(((referralData.completedReferrals || 0) / referralData.totalReferrals) * 100) : 0}%`,
      }];
      const columns = [
        { key: 'Metric', header: 'Metric' },
        { key: 'Value', header: 'Value' },
      ];

      try {
        if (exportFormat === 'pdf') {
          await exportToPDF(rows as any, { columns, includeNutrition: false, includeMedical: false }, 'Headmaster');
        } else if (exportFormat === 'xlsx') {
          await exportToExcel(rows as any, { columns, includeNutrition: false, includeMedical: false }, 'Headmaster');
        }
      } catch (err) {
        console.error('Export failed', err);
      }
    }
  };

  return (
    <AppLayout title="School Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">School Health Intelligence</h2>
            <p className="text-muted-foreground">Comprehensive school-wide health monitoring and reporting</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateYearOptions().map(year => (
                  <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">Class Analytics</TabsTrigger>
            <TabsTrigger value="referrals">Referral Tracking</TabsTrigger>
            <TabsTrigger value="reports">Reports & Exports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Students"
              value={metrics.totalStudents}
              icon={Users}
              variant="default"
            />
            <MetricCard
              title="Pending Approvals"
              value={metrics.pendingApprovals}
              subtitle="Health cards awaiting review"
              icon={Clock}
              variant="warning"
            />
            <MetricCard
              title="Approved Cards"
              value={metrics.approvedCards}
              icon={CheckCircle2}
              variant="success"
            />
            <MetricCard
              title="Meal Compliance"
              value={`${metrics.mealCompliance}%`}
              subtitle="This month"
              icon={UtensilsCrossed}
              variant="info"
            />
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-lg font-semibold">Pending Health Card Approvals</CardTitle>
              <Link href="/approvals">
                <Button variant="ghost" size="sm" data-testid="link-view-all-approvals">
                  View All
                  <span className="chevron-wrapper ml-1">
                    <ChevronRight className="h-4 w-4" />
                    <span className="reveal-content">Open approvals</span>
                  </span>
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingCards.slice(0, 5).map((card: any) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border hover-elevate"
                      data-testid={`card-pending-${card.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {card.studentName?.slice(0, 2).toUpperCase() || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{card.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            Class {card.classSection} • Submitted {card.submittedDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="Pending" size="sm" />
                        <Link href={`/health-cards/${card.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-${card.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ChartContainer title="Health Card Status" isLoading={isLoading}>
            <PieChart
              labels={["Approved", "Pending", "Rejected"]}
              data={[metrics.approvedCards || 0, metrics.pendingApprovals || 0, metrics.rejectedCards || 0]}
              backgroundColor={[
                "hsla(142, 76%, 36%, 0.8)",
                "hsla(43, 74%, 49%, 0.8)",
                "hsla(0, 84%, 42%, 0.8)",
              ]}
              doughnut
            />
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <ChartContainer title="Monthly Checkup by Class" isLoading={isLoading}>
             <BarChart
               labels={Object.keys(dashboardData?.checkupsByClass || {}).map(cls => `Class ${cls}`)}
               datasets={[
                 {
                   label: "Completed",
                   data: Object.values(dashboardData?.checkupsByClass || {}).map((c: any) => c.completed || 0),
                   backgroundColor: "hsl(142, 76%, 36%)",
                 },
                 {
                   label: "Pending",
                   data: Object.values(dashboardData?.checkupsByClass || {}).map((c: any) => c.pending || 0),
                   backgroundColor: "hsl(43, 74%, 49%)",
                 },
               ]}
             />
           </ChartContainer>

           <ChartContainer title="Meal Tracking This Week" isLoading={isLoading}>
             <BarChart
               labels={Object.keys(dashboardData?.mealTrackingThisWeek || {})}
               datasets={[
                 {
                   label: "Breakfast",
                   data: Object.values(dashboardData?.mealTrackingThisWeek || {}).map((m: any) => m.breakfast || 0),
                   backgroundColor: "hsl(173, 58%, 39%)",
                 },
                 {
                   label: "Lunch",
                   data: Object.values(dashboardData?.mealTrackingThisWeek || {}).map((m: any) => m.lunch || 0),
                   backgroundColor: "hsl(197, 37%, 24%)",
                 },
                 {
                   label: "Dinner",
                   data: Object.values(dashboardData?.mealTrackingThisWeek || {}).map((m: any) => m.dinner || 0),
                   backgroundColor: "hsl(43, 74%, 49%)",
                 },
               ]}
             />
           </ChartContainer>
         </div>

        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <UtensilsCrossed className="h-5 w-5" />
               Today's Meals
             </CardTitle>
           </CardHeader>
           <CardContent>
             {recentMeals.length === 0 ? (
               <p className="text-sm text-muted-foreground">No meals logged for today yet.</p>
             ) : (
               <div className="space-y-3">
                 {recentMeals.map((meal: any) => (
                   <div key={meal.id} className="rounded-lg border p-3">
                     <div className="flex items-center justify-between gap-2">
                       <div>
                         <p className="font-medium capitalize">{meal.mealType}</p>
                         {meal.classSection && (
                           <p className="text-xs text-muted-foreground">Class {meal.classSection}</p>
                         )}
                       </div>
                       <Badge variant="secondary">{new Date(meal.date).toLocaleDateString()}</Badge>
                     </div>
                     <p className="text-sm text-muted-foreground mt-2">
                       {(Array.isArray(meal.menuItems) ? meal.menuItems : []).join(", ") || "Menu details unavailable"}
                     </p>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <FileText className="h-5 w-5" />
               Quick Reports & Downloads
             </CardTitle>
             <p className="text-sm text-muted-foreground">Generate and download school-level reports</p>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportHealthSummary()}
               >
                 <FileHeart className="h-6 w-6" />
                 <span>Health Summary</span>
               </Button>
               <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportGrowthTrends()}
               >
                 <TrendingUp className="h-6 w-6" />
                 <span>Growth Trends</span>
               </Button>
               <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportVaccinationReport()}
               >
                 <Shield className="h-6 w-6" />
                 <span>Vaccination Report</span>
               </Button>
               <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportAlertsSummary()}
               >
                 <AlertCircle className="h-6 w-6" />
                 <span>Alerts Summary</span>
               </Button>
               <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportStudentRoster()}
               >
                 <Users className="h-6 w-6" />
                 <span>Student Roster</span>
               </Button>
               <Button
                 variant="outline"
                 className="h-20 flex flex-col gap-2"
                 onClick={() => handleExportDashboardMetrics()}
               >
                 <Download className="h-6 w-6" />
                 <span>Dashboard Metrics</span>
               </Button>
             </div>
           </CardContent>
         </Card>

            <DataTable
              title="Recent Monthly Checkups"
              columns={[
                {
                  key: "studentName",
                  header: "Student",
                  render: (item: any) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.studentName?.slice(0, 2).toUpperCase() || "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.studentName}</span>
                    </div>
                  ),
                },
                { key: "classSection", header: "Class" },
                { key: "checkupDate", header: "Date" },
                { key: "bmi", header: "BMI", className: "text-center" },
                {
                  key: "treatmentType",
                  header: "Treatment",
                  render: (item: any) => <StatusBadge status={item.treatmentType} size="sm" />,
                },
                {
                  key: "present",
                  header: "Status",
                  render: (item: any) => (
                    <StatusBadge status={item.present ? "Present" : "Absent"} size="sm" />
                  ),
                },
              ]}
              data={recentCheckups}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              emptyMessage="No checkups recorded yet"
            />
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Classes"
                value={classAggregates.length}
                icon={Users}
                variant="default"
              />
              <MetricCard
                title="Students Requiring Referrals"
                value={schoolMetrics.totalReferrals || 0}
                icon={AlertCircle}
                variant="danger"
              />
              <MetricCard
                title="C7/C8 Cases"
                value={(schoolMetrics.c7Cases || 0) + (schoolMetrics.c8Cases || 0)}
                icon={Heart}
                variant="warning"
              />
              <MetricCard
                title="Referral Completion Rate"
                value={`${schoolMetrics.totalReferrals > 0 ? Math.round(((schoolMetrics.completedReferrals || 0) / schoolMetrics.totalReferrals) * 100) : 0}%`}
                icon={CheckCircle2}
                variant="success"
              />
            </div>

            <DataTable
              title="Class-wise Health Aggregates"
              columns={[
                { key: "classSection", header: "Class" },
                { key: "totalStudents", header: "Students" },
                {
                  key: "avgHeight",
                  header: "Avg Height (cm)",
                  render: (item: any) => `${item.avgHeight?.toFixed(1) || "N/A"}`
                },
                {
                  key: "avgWeight",
                  header: "Avg Weight (kg)",
                  render: (item: any) => `${item.avgWeight?.toFixed(1) || "N/A"}`
                },
                {
                  key: "avgBMI",
                  header: "Avg BMI",
                  render: (item: any) => `${item.avgBMI?.toFixed(1) || "N/A"}`
                },
                {
                  key: "bmiUnderweight",
                  header: "Underweight",
                  render: (item: any) => (
                    <Badge variant={item.bmiUnderweight > 0 ? "destructive" : "secondary"}>
                      {item.bmiUnderweight || 0}
                    </Badge>
                  )
                },
                {
                  key: "bmiOverweight",
                  header: "Overweight",
                  render: (item: any) => (
                    <Badge variant={item.bmiOverweight > 0 ? "destructive" : "secondary"}>
                      {item.bmiOverweight || 0}
                    </Badge>
                  )
                },
                {
                  key: "c7Cases",
                  header: "C7 Cases",
                  render: (item: any) => (
                    <Badge variant={item.c7Cases > 0 ? "destructive" : "outline"}>
                      {item.c7Cases || 0}
                    </Badge>
                  )
                },
                {
                  key: "c8Cases",
                  header: "C8 Cases",
                  render: (item: any) => (
                    <Badge variant={item.c8Cases > 0 ? "destructive" : "outline"}>
                      {item.c8Cases || 0}
                    </Badge>
                  )
                },
                {
                  key: "pendingReferrals",
                  header: "Pending Referrals",
                  render: (item: any) => (
                    <Badge variant={item.pendingReferrals > 0 ? "destructive" : "secondary"}>
                      {item.pendingReferrals || 0}
                    </Badge>
                  )
                },
              ]}
              data={classAggregates}
              getRowKey={(item: any) => item.classSection}
              isLoading={isLoading}
              exportable
              onExport={handleClassAggregatesExport}
              emptyMessage="No class data available"
            />
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {referralData.pendingReferrals || 0}
                </div>
                <div className="text-sm text-red-600 dark:text-red-500">Pending Referrals</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {referralData.completedReferrals || 0}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-500">Completed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {referralData.totalReferrals || 0}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">Total Referrals</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {referralData.totalReferrals > 0 ? Math.round(((referralData.completedReferrals || 0) / referralData.totalReferrals) * 100) : 0}%
                </div>
                <div className="text-sm text-green-600 dark:text-green-500">Completion Rate</div>
              </div>
            </div>

            <DataTable
              title="Referral Tracking by Class"
              columns={[
                { key: "classSection", header: "Class" },
                { key: "total", header: "Total Referrals" },
                { key: "pending", header: "Pending" },
                { key: "completed", header: "Completed" },
                {
                  key: "completionRate",
                  header: "Completion Rate",
                  render: (item: any) => `${item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0}%`
                },
              ]}
              data={referralData.referralsByClass || []}
              getRowKey={(item: any) => item.classSection}
              isLoading={isLoading}
              emptyMessage="No referral data available"
            />

            <DataTable
              title="Recent Referrals"
              columns={[
                {
                  key: "studentName",
                  header: "Student",
                  render: (item: any) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.studentName?.slice(0, 2).toUpperCase() || "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{item.studentName}</span>
                    </div>
                  ),
                },
                { key: "classSection", header: "Class" },
                { key: "issue", header: "Issue" },
                { key: "facility", header: "Facility" },
                {
                  key: "status",
                  header: "Status",
                  render: (item: any) => <StatusBadge status={item.status} size="sm" />,
                },
                { key: "referralDate", header: "Date" },
              ]}
              data={referralData.recentReferrals || []}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              emptyMessage="No recent referrals"
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  School Reports & Exports
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generate and download comprehensive school-level reports</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF (with charts)</SelectItem>
                      <SelectItem value="excel">Excel (with charts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={exportClassWiseReport}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Class-wise Report</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Aggregated class data" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={exportReferralTracking}
                  >
                    <AlertCircle className="h-6 w-6" />
                    <span className="text-sm">Referral Tracking</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Referral status by class" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={exportSchoolSummary}
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">School Summary</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Overall school metrics" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handleExportHealthSummary()}
                  >
                    <FileHeart className="h-6 w-6" />
                    <span className="text-sm">Health Summary PDF</span>
                    <span className="text-xs text-muted-foreground">Comprehensive health report</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handleExportGrowthTrends()}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-sm">Growth Trends</span>
                    <span className="text-xs text-muted-foreground">Height/weight charts</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handleExportDashboardMetrics()}
                  >
                    <Download className="h-6 w-6" />
                    <span className="text-sm">Dashboard Metrics</span>
                    <span className="text-xs text-muted-foreground">All key metrics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

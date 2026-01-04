import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  UtensilsCrossed,
  FileHeart,
  Stethoscope,
  Plus,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  FileText,
  Download,
  Filter,
  Calendar,
  Activity,
  Heart,
  Target,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import { exportToCSV } from "@/lib/csvExport";
import { exportToPDF, exportToExcel } from "@/lib/exportService";
import { useAuth } from "@/lib/auth"; // Corrected the import path for useAuth
import { useToast } from "@/hooks/use-toast";

type TeacherDashboardData = {
  metrics: any;
  students: any[];
  upcomingCheckups: any[];
  growthTrends: any[];
  vaccinationAlerts: any[];
  enhancedAlerts: any[];
  mealParticipation: {
    totalMeals: number;
    expectedMeals: number;
  };
  attendanceSummary: {
    presentDays: number;
    uniqueStudents: number;
  };
};

type GrowthTrendsResponse = {
  growthTrends: Array<{
    month: string;
    year: number;
    avgHeight: number;
    avgWeight: number;
    avgBMI: number;
    studentCount: number;
  }>;
  healthRiskMetrics: any;
  ageGroupRisks: any;
  summary: any;
};

type AlertsData = {
  alerts?: {
    critical: any[];
    high: any[];
    medium?: any[];
    low?: any[];
  };
  summary?: {
    totalCritical: number;
    totalHigh: number;
    totalMedium?: number;
    totalLow?: number;
    totalAlerts: number;
    byCategory: any;
  };
};

type ClassHealthSummary = {
  bloodPressure?: {
    normal: number;
    prehypertension: number;
    stage1: number;
    stage2: number;
  };
};

export default function ClassTeacherDashboard() {
  const { user } = useAuth(); // Access the current user from the authentication context
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("all");
  const [selectedHealthCategory, setSelectedHealthCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCategory, setFilterCategory] = useState("all");
  const [exportFormat, setExportFormat] = useState("csv");

  const { data: dashboardData, isLoading } = useQuery<TeacherDashboardData>({
    queryKey: ["/api/teacher/dashboard", { class_id: user?.classSection }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/teacher/dashboard?class_id=${user?.classSection}`);
      return await res.json();
    },
    enabled: !!user,
  });

  const { data: growthTrendsData } = useQuery<GrowthTrendsResponse>({
    queryKey: ["/api/growth-trends"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: vaccinationData } = useQuery({
    queryKey: ["/api/vaccination-tracking"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: alertsData } = useQuery<AlertsData>({
    queryKey: ["/api/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: classHealthSummary } = useQuery<ClassHealthSummary>({
    queryKey: ["/api/teacher/class-health-summary", selectedMonth, selectedYear, selectedAgeGroup, selectedHealthCategory, { class_id: user?.classSection ?? undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      params.append("ageGroup", selectedAgeGroup);
      params.append("healthCategory", selectedHealthCategory);
      if (user?.classSection) {
        params.append("class_id", user.classSection);
      }
      const res = await apiRequest("GET", `/api/teacher/class-health-summary?${params}`);
      return await res.json();
    },
    enabled: !!user,
  });

  const { data: referralData } = useQuery({
    queryKey: ["/api/teacher/referral-tracking", selectedMonth, selectedYear, selectedAgeGroup, selectedHealthCategory, { class_id: user?.classSection ?? undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      params.append("ageGroup", selectedAgeGroup);
      params.append("healthCategory", selectedHealthCategory);
      if (user?.classSection) {
        params.append("class_id", user.classSection);
      }
      const res = await apiRequest("GET", `/api/teacher/referral-tracking?${params}`);
      return await res.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingReferralId, setUpdatingReferralId] = useState<string | null>(null);

  const allowedStatuses = ["Pending", "In Progress", "Completed", "Overdue", "Rejected"] as const;

  const updateReferralMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; completionDate?: string | null; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/referrals/${payload.id}`, {
        status: payload.status,
        completionDate: payload.completionDate,
        notes: payload.notes,
      });
      return res.json();
    },
    onMutate: async (variables) => {
      setUpdatingReferralId(variables.id);
      const key = ["/api/teacher/referral-tracking", selectedMonth, selectedYear, selectedAgeGroup, selectedHealthCategory, { class_id: user?.classSection ?? undefined }];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          referrals: old.referrals.map((r: any) => (r.id === variables.id ? { ...r, status: variables.status } : r)),
        };
      });
      return { previous };
    },
    onError: (err: any, variables, context: any) => {
      const message = err?.message || "Failed to update referral";
      toast({ title: "Error", description: message, variant: "destructive" });
      const key = ["/api/teacher/referral-tracking", selectedMonth, selectedYear, selectedAgeGroup, selectedHealthCategory, { class_id: user?.classSection ?? undefined }];
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (data: any) => {
      toast({ title: "Success", description: "Referral status updated" });
      // Invalidate related dashboards so updates propagate across roles
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/teacher/referral-tracking" });
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/po/dashboard" });
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/headmaster/dashboard" });
    },
    onSettled: () => {
      setUpdatingReferralId(null);
    },
  });

  const metrics = dashboardData?.metrics || {
    totalStudents: 0,
    pendingHealthCards: 0,
    monthlyCheckupsDue: 0,
    completedCheckups: 0,
  };
  const pendingHealthCards = metrics.pendingHealthCards ?? metrics.pendingApprovals ?? 0;

  const students = dashboardData?.students || [];
  const upcomingCheckups = dashboardData?.upcomingCheckups || [];
  const growthTrends = dashboardData?.growthTrends || [];
  const vaccinationAlerts = dashboardData?.vaccinationAlerts || [];
  const enhancedAlerts = dashboardData?.enhancedAlerts || [];
  const mealParticipation = dashboardData?.mealParticipation || { totalMeals: 0, expectedMeals: 0 };
  const attendanceSummary = dashboardData?.attendanceSummary || { presentDays: 0, uniqueStudents: 0 };

  // Export functions
  const exportStudentHealthCards = async () => {
    if (!students.length) return;

    if (exportFormat === "csv") {
      const exportData = students.map(student => {
        const healthCard = student.healthCardStatus !== "Missing" ? { weightKg: student.weight, heightCm: student.height, bmi: student.bmi } : null;
        return {
          "Student Name": student.fullName,
          "Unique ID": student.uniqueId,
          "Class": student.classSection,
          "Gender": student.gender,
          "Age": student.age || "N/A",
          "Health Card Status": student.healthCardStatus,
          "Weight (kg)": healthCard?.weightKg || "N/A",
          "Height (cm)": healthCard?.heightCm || "N/A",
          "BMI": healthCard?.bmi || "N/A",
          "Blood Pressure": student.bloodPressure || "N/A",
          "Vision": student.vision || "N/A",
          "Last Checkup": student.lastCheckupDate || "N/A",
        };
      });

      exportToCSV(exportData, [
        { key: "Student Name", header: "Student Name" },
        { key: "Unique ID", header: "Unique ID" },
        { key: "Class", header: "Class" },
        { key: "Gender", header: "Gender" },
        { key: "Age", header: "Age" },
        { key: "Health Card Status", header: "Health Card Status" },
        { key: "Weight (kg)", header: "Weight (kg)" },
        { key: "Height (cm)", header: "Height (cm)" },
        { key: "BMI", header: "BMI" },
        { key: "Blood Pressure", header: "Blood Pressure" },
        { key: "Vision", header: "Vision" },
        { key: "Last Checkup", header: "Last Checkup" },
      ], `class-health-cards-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Prefer client-side pretty export for PDF/Excel when possible
      try {
        if (exportFormat === 'pdf') {
          await exportToPDF(students as any, { includeNutrition: true, includeMedical: true }, user?.fullName || user?.email || '');
          return;
        } else if (exportFormat === 'xlsx') {
          await exportToExcel(students as any, { includeNutrition: true, includeMedical: true }, user?.fullName || user?.email || '');
          return;
        }
      } catch (err) {
        console.warn('Client-side class health cards export failed, falling back to server blob', err);
      }

      // Fallback: server-rendered annual-health
      const params = new URLSearchParams();
      params.append("format", exportFormat);
      params.append("year", selectedYear);

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/reports/annual-health?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
        throw new Error(errorData.message || "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
      a.download = `class-health-cards-${selectedYear}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const handleExport = (type?: "csv" | "pdf" | "xlsx") => {
    if (!students || students.length === 0) return;
    try {
      if (type === "pdf") {
        exportToPDF(students as any, { includeNutrition: true, includeMedical: true }, user?.fullName || user?.email || '');
      } else if (type === "xlsx") {
        exportToExcel(students as any, { includeNutrition: true, includeMedical: true }, user?.fullName || user?.email || '');
      } else {
        // default CSV
        const exportData = students.map((student: any) => ({
          "Student Name": student.fullName,
          "Unique ID": student.uniqueId,
          "Class": student.classSection,
          "Gender": student.gender,
          "Age": student.age || "N/A",
          "Health Card Status": student.healthCardStatus,
        }));
        exportToCSV(exportData, [
          { key: "Student Name", header: "Student Name" },
          { key: "Unique ID", header: "Unique ID" },
          { key: "Class", header: "Class" },
          { key: "Gender", header: "Gender" },
          { key: "Age", header: "Age" },
          { key: "Health Card Status", header: "Health Card Status" },
        ], `class-students-${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // Try client-side pretty export then fallback to existing server flows
  const handleClassQuickExport = async (type?: string) => {
    try {
      if (!type) return;
      // For annual health / class summary prefer client exporter when possible
      if (type === 'annual-health' || type === 'class-summary') {
        try {
          // attempt to use server JSON if available
          const token = localStorage.getItem('accessToken');
          const res = await fetch(`/api/reports/${type}?month=${selectedMonth}&year=${selectedYear}&format=json`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.rows) && json.rows.length > 0) {
              const columns = Object.keys(json.rows[0]).map(k => ({ key: k, header: k }));
              await exportToPDF(json.rows as any, { columns }, 'ClassTeacher');
              return;
            }
          }
        } catch (err) {
          console.warn('Client-side class export attempt failed, falling back to server blob', err);
        }
      }

      // Fallback: call existing handlers which perform server blob fetches
      if (type === 'student-health-cards') await exportStudentHealthCards();
      else if (type === 'class-summary') await exportClassSummary();
      else if (type === 'referral-report') await exportReferralReport();
    } catch (err) {
      console.error('Class quick export failed', err);
    }
  };

  const exportClassSummary = async () => {
    if (exportFormat === "csv") {
      const summaryData = [{
        "Metric": "Total Students",
        "Value": metrics.totalStudents,
      }, {
        "Metric": "Health Cards Completed",
        "Value": students.filter(s => s.healthCardStatus === "Approved").length,
      }, {
        "Metric": "Pending Health Cards",
        "Value": pendingHealthCards,
      }, {
        "Metric": "Checkups Due",
        "Value": metrics.monthlyCheckupsDue,
      }, {
        "Metric": "Completed Checkups",
        "Value": metrics.completedCheckups,
      }, {
        "Metric": "Meal Compliance",
        "Value": `${mealParticipation.expectedMeals > 0 ? Math.round((mealParticipation.totalMeals / mealParticipation.expectedMeals) * 100) : 0}%`,
      }, {
        "Metric": "Attendance Rate",
        "Value": `${attendanceSummary.uniqueStudents > 0 ? Math.round((attendanceSummary.presentDays / (attendanceSummary.uniqueStudents * 30)) * 100) : 0}%`,
      }];

      exportToCSV(summaryData, [
        { key: "Metric", header: "Metric" },
        { key: "Value", header: "Value" },
      ], `class-summary-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Prefer client-side pretty PDF/Excel when possible
      try {
        if (exportFormat === 'pdf') {
          const summaryData = [{ Metric: 'Total Students', Value: metrics.totalStudents },
            { Metric: 'Health Cards Completed', Value: students.filter(s => s.healthCardStatus === 'Approved').length },
            { Metric: 'Pending Health Cards', Value: pendingHealthCards },
            { Metric: 'Checkups Due', Value: metrics.monthlyCheckupsDue },
            { Metric: 'Completed Checkups', Value: metrics.completedCheckups },
            { Metric: 'Meal Compliance', Value: `${mealParticipation.expectedMeals > 0 ? Math.round((mealParticipation.totalMeals / mealParticipation.expectedMeals) * 100) : 0}%` },
            { Metric: 'Attendance Rate', Value: `${attendanceSummary.uniqueStudents > 0 ? Math.round((attendanceSummary.presentDays / (attendanceSummary.uniqueStudents * 30)) * 100) : 0}%` }];

          await exportToPDF(summaryData as any, { columns: [{ key: 'Metric', header: 'Metric' }, { key: 'Value', header: 'Value' }] }, user?.fullName || user?.email || '');
          return;
        } else if (exportFormat === 'xlsx') {
          const summaryData = [{ Metric: 'Total Students', Value: metrics.totalStudents },
            { Metric: 'Health Cards Completed', Value: students.filter(s => s.healthCardStatus === 'Approved').length },
            { Metric: 'Pending Health Cards', Value: pendingHealthCards },
            { Metric: 'Checkups Due', Value: metrics.monthlyCheckupsDue },
            { Metric: 'Completed Checkups', Value: metrics.completedCheckups },
            { Metric: 'Meal Compliance', Value: `${mealParticipation.expectedMeals > 0 ? Math.round((mealParticipation.totalMeals / mealParticipation.expectedMeals) * 100) : 0}%` },
            { Metric: 'Attendance Rate', Value: `${attendanceSummary.uniqueStudents > 0 ? Math.round((attendanceSummary.presentDays / (attendanceSummary.uniqueStudents * 30)) * 100) : 0}%` }];

          await exportToExcel(summaryData as any, { columns: [{ key: 'Metric', header: 'Metric' }, { key: 'Value', header: 'Value' }] }, user?.fullName || user?.email || '');
          return;
        }
      } catch (err) {
        console.warn('Client-side class summary export failed, falling back to server blob', err);
      }

      // Fallback: use server-rendered report
      const params = new URLSearchParams();
      params.append("format", exportFormat);
      params.append("month", selectedMonth);
      params.append("year", selectedYear);

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/reports/monthly-checkup?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
        throw new Error(errorData.message || "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
      a.download = `class-summary-${selectedYear}-${selectedMonth}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const exportReferralReport = async () => {
    if (!referralData?.referrals) return;

    if (exportFormat === "csv") {
      const exportData = referralData.referrals.map((referral: any) => ({
        "Student Name": referral.studentName,
        "Class": referral.classSection,
        "Referral Type": referral.type,
        "Facility": referral.facility,
        "Date": referral.date,
        "Status": referral.status || "Pending",
        "Follow-up Required": referral.followUpRequired ? "Yes" : "No",
      }));

      exportToCSV(exportData, [
        { key: "Student Name", header: "Student Name" },
        { key: "Class", header: "Class" },
        { key: "Referral Type", header: "Referral Type" },
        { key: "Facility", header: "Facility" },
        { key: "Date", header: "Date" },
        { key: "Status", header: "Status" },
        { key: "Follow-up Required", header: "Follow-up Required" },
      ], `referral-report-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // Prefer client-side pretty exporters
      try {
        const exportData = referralData.referrals.map((referral: any) => ({
          "Student Name": referral.studentName,
          "Class": referral.classSection,
          "Referral Type": referral.type,
          "Facility": referral.facility,
          "Date": referral.date,
          "Status": referral.status || "Pending",
          "Follow-up Required": referral.followUpRequired ? "Yes" : "No",
        }));

        if (exportFormat === 'pdf') {
          await exportToPDF(exportData as any, {
            columns: [
              { key: "Student Name", header: "Student Name" },
              { key: "Class", header: "Class" },
              { key: "Referral Type", header: "Referral Type" },
              { key: "Facility", header: "Facility" },
              { key: "Date", header: "Date" },
              { key: "Status", header: "Status" },
              { key: "Follow-up Required", header: "Follow-up Required" },
            ],
          }, user?.fullName || user?.email || '');
          return;
        } else if (exportFormat === 'xlsx') {
          await exportToExcel(exportData as any, {
            columns: [
              { key: "Student Name", header: "Student Name" },
              { key: "Class", header: "Class" },
              { key: "Referral Type", header: "Referral Type" },
              { key: "Facility", header: "Facility" },
              { key: "Date", header: "Date" },
              { key: "Status", header: "Status" },
              { key: "Follow-up Required", header: "Follow-up Required" },
            ],
          }, user?.fullName || user?.email || '');
          return;
        }
      } catch (err) {
        console.warn('Client-side referral export failed, falling back to server blob', err);
      }

      // Fallback to server blob
      const params = new URLSearchParams();
      params.append("format", exportFormat);
      params.append("month", selectedMonth);
      params.append("year", selectedYear);

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/reports/monthly-checkup?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
        throw new Error(errorData.message || "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
      a.download = `referral-report-${selectedYear}-${selectedMonth}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <AppLayout title="Class Teacher Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Class Dashboard</h2>
            <p className="text-muted-foreground">Comprehensive health tracking and reporting for your students</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="6-8">6-8 years</SelectItem>
                <SelectItem value="9-11">9-11 years</SelectItem>
                <SelectItem value="12-14">12-14 years</SelectItem>
                <SelectItem value="15-18">15-18 years</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedHealthCategory} onValueChange={setSelectedHealthCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Health Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="underweight">Underweight</SelectItem>
                <SelectItem value="overweight">Overweight</SelectItem>
                <SelectItem value="normal">Normal BMI</SelectItem>
                <SelectItem value="deficiencies">Deficiencies</SelectItem>
                <SelectItem value="diseases">Diseases</SelectItem>
                <SelectItem value="referrals">Referrals</SelectItem>
                <SelectItem value="adolescent">Adolescent Health</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/students/new">
              <Button data-testid="button-add-student">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health Tracking</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
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
                title="Pending Health Cards"
                value={pendingHealthCards}
                subtitle="Awaiting approval"
                icon={Clock}
                variant="warning"
              />
              <MetricCard
                title="Checkups Due"
                value={metrics.monthlyCheckupsDue}
                subtitle="This month"
                icon={AlertCircle}
                variant="danger"
              />
              <MetricCard
                title="Completed Checkups"
                value={metrics.completedCheckups}
                subtitle="This month"
                icon={CheckCircle2}
                variant="success"
              />
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DataTable
              title="My Students"
              columns={[
                {
                  key: "fullName",
                  header: "Student",
                  render: (item: any) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.fullName?.slice(0, 2).toUpperCase() || "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.uniqueId}</p>
                      </div>
                    </div>
                  ),
                },
                { key: "gender", header: "Gender", className: "text-center" },
                {
                  key: "healthCardStatus",
                  header: "Health Card",
                  render: (item: any) => (
                    <StatusBadge status={item.healthCardStatus || "Pending"} size="sm" />
                  ),
                },
                  { key: "weight",
                    header: "Weight (kg)",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.weight ?? "N/A"}</span>,
                  },
                  { key: "height",
                    header: "Height (cm)",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.height ?? "N/A"}</span>,
                  },
                  { key: "bmi",
                    header: "BMI",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.bmi ?? "N/A"}</span>,
                  },
                  { key: "bloodPressure",
                    header: "BP",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.bloodPressure ?? "N/A"}</span>,
                  },
                {
                  key: "lastCheckup",
                  header: "Last Checkup",
                  render: (item: any) => (
                    <span className="text-sm text-muted-foreground">
                      {item.lastCheckup || "Not yet"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (item: any) => (
                    <div className="flex items-center gap-1">
                      <Link href={`/students/${item.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-${item.id}`}>
                          View
                        </Button>
                      </Link>
                      <Link href={`/checkups/new?studentId=${item.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-checkup-${item.id}`}>
                          <Stethoscope className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ),
                },
              ]}
              data={students}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              exportable
              onExport={handleExport}
              searchable
              searchPlaceholder="Search students..."
              emptyMessage="No students in your class"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/students/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-add-student">
                  <UserPlus className="h-4 w-4" />
                  Add New Student
                </Button>
              </Link>
              <Link href="/checkups/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-add-checkup">
                  <Stethoscope className="h-4 w-4" />
                  Record Monthly Checkup
                </Button>
              </Link>
              <Link href="/health-cards" className="block">
                <Button variant="outline" className="w-full justify-start gap-3" data-testid="quick-health-cards">
                  <FileHeart className="h-4 w-4" />
                  View Health Cards
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Students Due for Checkup</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : upcomingCheckups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p>All students have been checked this month</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingCheckups.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`due-checkup-${student.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {student.fullName?.slice(0, 2).toUpperCase() || "ST"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">Class {student.classSection}</p>
                      </div>
                    </div>
                    <Link href={`/checkups/new?studentId=${student.id}`}>
                      <Button size="sm" data-testid={`button-record-${student.id}`}>
                        Record
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {growthTrendsData?.growthTrends && growthTrendsData.growthTrends.length > 0 && (
           <ChartContainer title="Class Growth Trends (Height, Weight, BMI)" isLoading={!growthTrendsData}>
             <LineChart
               labels={growthTrendsData.growthTrends.map((t: any) => t.month)}
               datasets={[
                 {
                   label: "Avg Height (cm)",
                   data: growthTrendsData.growthTrends.map((t: any) => t.avgHeight),
                   borderColor: "hsl(142, 76%, 36%)",
                   backgroundColor: "hsla(142, 76%, 36%, 0.1)",
                 },
                 {
                   label: "Avg Weight (kg)",
                   data: growthTrendsData.growthTrends.map((t: any) => t.avgWeight),
                   borderColor: "hsl(280, 65%, 60%)",
                   backgroundColor: "hsla(280, 65%, 60%, 0.1)",
                 },
                 {
                   label: "Avg BMI",
                   data: growthTrendsData.growthTrends.map((t: any) => t.avgBMI),
                   borderColor: "hsl(45, 93%, 47%)",
                   backgroundColor: "hsla(45, 93%, 47%, 0.1)",
                 },
               ]}
             />
           </ChartContainer>
         )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Health Alerts & Notifications
            </CardTitle>
            <p className="text-sm text-muted-foreground">Students requiring attention</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertsData?.alerts?.critical?.slice(0, 3).map((alert: any) => (
                <div key={`critical-${alert.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div>
                    <p className="font-semibold text-foreground">{alert.studentName}</p>
                    <p className="text-sm text-muted-foreground">Class {alert.classSection} • {alert.reason}</p>
                  </div>
                  <Badge variant="destructive">{alert.priority}</Badge>
                </div>
              ))}
              {alertsData?.alerts?.high?.slice(0, 3).map((alert: any) => (
                <div key={`high-${alert.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div>
                    <p className="font-semibold text-foreground">{alert.studentName}</p>
                    <p className="text-sm text-muted-foreground">Class {alert.classSection} • {alert.reason}</p>
                  </div>
                  <Badge variant="secondary">{alert.priority}</Badge>
                </div>
              ))}
              {((alertsData?.alerts?.critical?.length || 0) === 0 && (alertsData?.alerts?.high?.length || 0) === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No health alerts at this time</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="BMI Distribution" isLoading={isLoading}>
                <PieChart
                  labels={["Underweight (<18.5)", "Normal (18.5-25)", "Overweight (25-30)", "Obese (>30)"]}
                  data={[
                    growthTrendsData?.healthRiskMetrics?.underweight || 0,
                    growthTrendsData?.healthRiskMetrics?.normal || 0,
                    growthTrendsData?.healthRiskMetrics?.overweight || 0,
                    growthTrendsData?.healthRiskMetrics?.obese || 0,
                  ]}
                  backgroundColor={[
                    "hsl(0, 84%, 60%)",
                    "hsl(142, 76%, 36%)",
                    "hsl(45, 93%, 47%)",
                    "hsl(280, 65%, 60%)",
                  ]}
                  doughnut
                />
              </ChartContainer>

              <ChartContainer title="Blood Pressure Categories" isLoading={isLoading}>
                <BarChart
                  labels={["Normal", "Prehypertension", "Stage 1", "Stage 2"]}
                  datasets={[
                    {
                      label: "Students",
                      data: [
                        classHealthSummary?.bloodPressure?.normal || 0,
                        classHealthSummary?.bloodPressure?.prehypertension || 0,
                        classHealthSummary?.bloodPressure?.stage1 || 0,
                        classHealthSummary?.bloodPressure?.stage2 || 0,
                      ],
                      backgroundColor: "hsl(142, 76%, 36%)",
                    },
                  ]}
                />
              </ChartContainer>
            </div>

            {growthTrendsData?.growthTrends && growthTrendsData.growthTrends.length > 0 && (
              <ChartContainer title="Class Growth Trends (Height, Weight, BMI)" isLoading={!growthTrendsData}>
                <LineChart
                  labels={growthTrendsData.growthTrends.map((t: any) => t.month)}
                  datasets={[
                    {
                      label: "Avg Height (cm)",
                      data: growthTrendsData.growthTrends.map((t: any) => t.avgHeight),
                      borderColor: "hsl(142, 76%, 36%)",
                      backgroundColor: "hsla(142, 76%, 36%, 0.1)",
                    },
                    {
                      label: "Avg Weight (kg)",
                      data: growthTrendsData.growthTrends.map((t: any) => t.avgWeight),
                      borderColor: "hsl(280, 65%, 60%)",
                      backgroundColor: "hsla(280, 65%, 60%, 0.1)",
                    },
                    {
                      label: "Avg BMI",
                      data: growthTrendsData.growthTrends.map((t: any) => t.avgBMI),
                      borderColor: "hsl(45, 93%, 47%)",
                      backgroundColor: "hsla(45, 93%, 47%, 0.1)",
                    },
                  ]}
                />
              </ChartContainer>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Referral Tracking & Follow-up
                </CardTitle>
                <p className="text-sm text-muted-foreground">Monitor student referrals and follow-up status</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {referralData?.summary?.pending || 0}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-500">Pending Referrals</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {referralData?.summary?.inProgress || 0}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-500">In Progress</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {referralData?.summary?.completed || 0}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-500">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {referralData?.summary?.overdue || 0}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-500">Overdue</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {referralData?.referrals?.slice(0, 5).map((referral: any) => (
                      <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold">{referral.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {referral.type} • {referral.facility} • {referral.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={referral.status || "Pending"}
                            onValueChange={(val) => {
                              if (!val || val === referral.status) return;
                              const completionDate = val === "Completed" ? new Date().toISOString().split('T')[0] : undefined;
                              updateReferralMutation.mutate({ id: referral.id, status: val, completionDate });
                            }}
                            disabled={updatingReferralId === referral.id}
                          >
                            <SelectTrigger className="w-40" data-testid={`referral-status-${referral.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedStatuses.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {referral.followUpRequired && (
                            <Badge variant="outline">Follow-up Needed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Class Reports & Exports
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generate and download comprehensive class-level reports</p>
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
                    onClick={() => handleClassQuickExport('student-health-cards')}
                  >
                    <FileHeart className="h-6 w-6" />
                    <span className="text-sm">Student Health Cards</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Individual student data" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handleClassQuickExport('class-summary')}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-sm">Class Summary Report</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Aggregated metrics" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handleClassQuickExport('referral-report')}
                  >
                    <AlertCircle className="h-6 w-6" />
                    <span className="text-sm">Referral Report</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Referral tracking" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={async () => {
                      const params = new URLSearchParams();
                      params.append("format", exportFormat);
                      params.append("year", selectedYear);

                      const token = localStorage.getItem("accessToken");
                      const response = await fetch(`/api/reports/annual-health?${params.toString()}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
                        alert(errorData.message || "Failed to generate report");
                        return;
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
                      a.download = `annual-health-report-${selectedYear}.${extension}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Calendar className="h-6 w-6" />
                    <span className="text-sm">Annual Health Report</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Annual health data" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={async () => {
                        const params = new URLSearchParams();
                        params.append("format", exportFormat);
                        params.append("month", selectedMonth);
                        params.append("year", selectedYear);

                        if (exportFormat === 'pdf') {
                          try {
                            const { generatePdfReport } = await import('@/lib/pdfReports');
                            const result = await generatePdfReport({ type: 'monthly-checkup', month: selectedMonth, year: selectedYear } as any);
                            const url = window.URL.createObjectURL(result.blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = result.filename || `monthly-checkups-${selectedYear}-${selectedMonth}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            return;
                          } catch (err) {
                            console.warn('Client PDF generation failed, falling back to server blob', err);
                          }
                        }

                        // Fallback to server-generated report (Excel or if PDF failed)
                        const token = localStorage.getItem("accessToken");
                        const response = await fetch(`/api/reports/monthly-checkup?${params.toString()}`, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        });

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
                          alert(errorData.message || "Failed to generate report");
                          return;
                        }

                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
                        a.download = `monthly-checkups-${selectedYear}-${selectedMonth}.${extension}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Stethoscope className="h-6 w-6" />
                    <span className="text-sm">Monthly Checkups</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Monthly health data" : "With charts & formatting"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={async () => {
                      const params = new URLSearchParams();
                      params.append("format", exportFormat);
                      params.append("month", selectedMonth);
                      params.append("year", selectedYear);

                      const token = localStorage.getItem("accessToken");
                      // Prefer client-side PDF generation for meal-tracking
                      if (exportFormat === 'pdf') {
                        try {
                          const { generatePdfReport } = await import('@/lib/pdfReports');
                          const result = await generatePdfReport({ type: 'meal-tracking', month: selectedMonth, year: selectedYear } as any);
                          const url = window.URL.createObjectURL(result.blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = result.filename || `meal-tracking-${selectedYear}-${selectedMonth}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          return;
                        } catch (err) {
                          console.warn('Client PDF generation failed for meal-tracking, falling back to server blob', err);
                        }
                      }

                      // Fallback: server-generated report (Excel or if PDF failed)
                      const response = await fetch(`/api/reports/meal-tracking?${params.toString()}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
                        alert(errorData.message || "Failed to generate report");
                        return;
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
                      a.download = `meal-tracking-${selectedYear}-${selectedMonth}.${extension}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <UtensilsCrossed className="h-6 w-6" />
                    <span className="text-sm">Meal Tracking Report</span>
                    <span className="text-xs text-muted-foreground">{exportFormat === "csv" ? "Nutrition compliance" : "With charts & formatting"}</span>
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

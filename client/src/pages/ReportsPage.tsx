import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Download,
  FileHeart,
  Stethoscope,
  UtensilsCrossed,
  Home,
  School,
  Calendar,
  Loader2,
  ExternalLink,
} from "lucide-react";

const reportTypes = [
  {
    id: "annual-health",
    title: "Annual Health Card Report",
    description: "Individual student health card with complete assessment data",
    icon: FileHeart,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    roles: ["PO", "Headmaster", "ClassTeacher", "MedicalTeam"],
  },
  {
    id: "monthly-checkup",
    title: "Monthly Checkup Summary",
    description: "Summary of monthly health checkups for school or student",
    icon: Stethoscope,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    roles: ["PO", "Headmaster", "ClassTeacher", "MedicalTeam"],
  },
  {
    id: "meal-tracking",
    title: "Meal Tracking Summary",
    description: "Monthly meal compliance and nutrition report",
    icon: UtensilsCrossed,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    roles: ["PO", "Headmaster", "ClassTeacher"],
  },
  {
    id: "hostel-attendance",
    title: "Hostel Attendance Report",
    description: "Student presence and vacation tracking",
    icon: Home,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    roles: ["PO", "Headmaster", "MedicalTeam"],
  },
  {
    id: "po-consolidated",
    title: "PO Consolidated Report",
    description: "District-level aggregated metrics across all schools",
    icon: School,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    roles: ["PO"],
  },
  {
    id: "po-consolidated",
    title: "PO Consolidated Report",
    description: "District-level aggregated metrics across all schools",
    icon: School,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    roles: ["PO", "Admin"],
  },
];

export default function ReportsPage() {
  const { user, hasRole } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect Admin users away from Reports UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: schoolsData = { schools: [] } } = useQuery<{ schools: any[], totalPages: number, totalItems: number }>({
    queryKey: ["/api/schools", user?.id],
  });

  const { data: studentsData = { students: [] } } = useQuery<{ students: any[], totalPages: number, totalItems: number }>({
    queryKey: ["/api/students"],
  });

  const schools = schoolsData?.schools || [];
  const students = studentsData?.students || [];

  const availableReports = reportTypes.filter((report) =>
    report.roles.some((role) => hasRole(role as any))
  );

  const handleGenerateReport = async (overrides?: {
    report?: string;
    school?: string;
    student?: string;
    month?: string;
    year?: string;
    format?: string;
  }) => {
    const resolvedReport = overrides?.report ?? selectedReport;
    const resolvedFormat = overrides?.format ?? selectedFormat;
    const resolvedSchool = overrides?.school ?? selectedSchool;
    const resolvedStudent = overrides?.student ?? selectedStudent;
    const resolvedMonth = overrides?.month ?? selectedMonth;
    const resolvedYear = overrides?.year ?? selectedYear;

    if (!resolvedReport) {
      alert("Please select a report type");
      return;
    }

    setIsGenerating(true);
    try {
      // If PDF requested, try client-side generator (ensures charts from frontend appear)
      if (resolvedFormat === "pdf") {
        try {
          const { generatePdfReport } = await import("@/lib/pdfReports");

          const result = await generatePdfReport({
            type: resolvedReport,
            schoolId: resolvedSchool,
            studentId: resolvedStudent,
            month: resolvedMonth,
            year: resolvedYear,
            schoolName: (schools.find((s: any) => s.id === resolvedSchool) || {}).name,
          } as any);

          // Download blob
          const url = window.URL.createObjectURL(result.blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          setIsGenerating(false);
          return;
        } catch (clientErr: any) {
          console.warn("Client-side PDF generation failed, falling back to server PDF.", clientErr?.message || clientErr);
          // continue to server-side fallback
        }
      }

      // Fallback: ask server for the report (used for CSV/Excel or if client PDF fails)
      const params = new URLSearchParams();
      if (resolvedSchool && resolvedSchool !== "all") params.append("schoolId", resolvedSchool);
      if (resolvedStudent && resolvedStudent !== "all") params.append("studentId", resolvedStudent);
      if (resolvedMonth) params.append("month", resolvedMonth);
      if (resolvedYear) params.append("year", resolvedYear);
      params.append("format", resolvedFormat);

      // Use fetch directly for blob response
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/reports/${resolvedReport}?${params.toString()}`, {
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
      const extension = resolvedFormat === "excel" ? "xlsx" : resolvedFormat;
      a.download = `${resolvedReport}-${resolvedYear || new Date().getFullYear()}-${resolvedMonth || new Date().getMonth() + 1}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Report generation failed:", error);
      alert(error?.message || "Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports Center</h2>
          <p className="text-muted-foreground">Generate and download various health monitoring reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableReports.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.id;
            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedReport(report.id)}
                data-testid={`report-${report.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${report.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedReport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configure Report
              </CardTitle>
              <CardDescription>
                Set the parameters for your report generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {hasRole("PO", "Admin") && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">School</label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                      <SelectTrigger data-testid="filter-school">
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Schools</SelectItem>
                        {schools.map((school: any) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selectedReport === "annual-health" || selectedReport === "monthly-checkup") && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Student (Optional)</label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger data-testid="filter-student">
                        <SelectValue placeholder="All students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {students.map((student: any) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger data-testid="filter-month">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger data-testid="filter-year">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger data-testid="filter-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF (with charts)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (with charts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Report will be generated as a {selectedFormat.toUpperCase()} document {selectedFormat !== "csv" ? "with charts and enhanced formatting" : ""}
                </p>
                <Button
                  onClick={() => handleGenerateReport()}
                  disabled={isGenerating}
                  data-testid="button-generate-report"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Available Reports for Download</CardTitle>
            <CardDescription>Real-time reports based on your current data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const recentReports = [];
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                
                // Generate dynamic reports based on actual data
                if (hasRole("Headmaster", "ClassTeacher", "MedicalTeam", "Admin")) {
                  recentReports.push({
                    name: `Monthly Health Summary - ${months[currentMonth - 1]} ${currentYear}`,
                    date: new Date().toLocaleDateString(),
                    type: "monthly-checkup",
                    count: students.length,
                  });
                }
                
                if (hasRole("PO", "Admin")) {
                  recentReports.push({
                    name: `PO Consolidated - ${months[currentMonth - 1]} ${currentYear}`,
                    date: new Date().toLocaleDateString(),
                    type: "po-consolidated",
                    count: schools.length,
                  });
                }
                
                if (hasRole("Headmaster", "ClassTeacher", "Admin")) {
                  recentReports.push({
                    name: `Meal Tracking - ${months[currentMonth - 1]} ${currentYear}`,
                    date: new Date().toLocaleDateString(),
                    type: "meal-tracking",
                    count: students.length,
                  });
                }
                
                if (recentReports.length === 0) {
                  return <p className="text-sm text-muted-foreground">No reports available for your role</p>;
                }

                return recentReports.map((report, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`report-item-${report.type}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.date} • {report.count} records</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // Immediately generate this specific report using current filters
                        await handleGenerateReport({ report: report.type, format: 'pdf' });
                      }}
                      data-testid={`button-download-report-${report.type}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

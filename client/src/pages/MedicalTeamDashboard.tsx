import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Stethoscope,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Home,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

type MedicalDashboardResponse = {
  metrics: {
    totalCheckups: number;
    studentsChecked: number;
    referredCases: number;
    primaryTreatment: number;
  };
  schools: any[];
  recentCheckups: any[];
  referredStudents: any[];
  hostelStats: {
    presentToday: number;
    onVacation: number;
    monthlyPresence: number;
  };
};

export default function MedicalTeamDashboard() {
  const [selectedSchool, setSelectedSchool] = useState("all");

  const { data: dashboardData, isLoading } = useQuery<MedicalDashboardResponse>({
    // Include school filter directly in the URL so the backend can use it
    queryKey: [
      selectedSchool === "all"
        ? "/api/medical/dashboard"
        : `/api/medical/dashboard?schoolId=${selectedSchool}`,
    ],
  });

  const metrics = dashboardData?.metrics || {
    totalCheckups: 0,
    studentsChecked: 0,
    referredCases: 0,
    primaryTreatment: 0,
  };

  const schools = dashboardData?.schools || [];
  const recentCheckups = dashboardData?.recentCheckups || [];
  const referredStudents = dashboardData?.referredStudents || [];
  const hostelStats = dashboardData?.hostelStats || {
    presentToday: 0,
    onVacation: 0,
    monthlyPresence: 0,
  };

  return (
    <AppLayout title="Medical Team Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Health Monitoring</h2>
            <p className="text-muted-foreground">Track and record student health checkups</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48" data-testid="filter-school">
                <SelectValue placeholder="Select School" />
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
            <Link href="/checkups/new">
              <Button data-testid="button-new-checkup">
                <Plus className="h-4 w-4 mr-2" />
                New Checkup
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Checkups"
            value={metrics.totalCheckups}
            subtitle="This month"
            icon={Stethoscope}
            variant="default"
          />
          <MetricCard
            title="Students Checked"
            value={metrics.studentsChecked}
            icon={Users}
            variant="success"
          />
          <MetricCard
            title="Referred Cases"
            value={metrics.referredCases}
            icon={AlertCircle}
            variant="danger"
          />
          <MetricCard
            title="Primary Treatment"
            value={metrics.primaryTreatment}
            icon={CheckCircle2}
            variant="info"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Checkups by School" isLoading={isLoading}>
            <BarChart
              labels={schools.map((s: any) => s.name || "Unknown")}
              datasets={[
                {
                  label: "Checkups Completed",
                  data: schools.map((s: any) => s.checkupCount || 0),
                  backgroundColor: "hsl(142, 76%, 36%)",
                },
              ]}
            />
          </ChartContainer>

          <ChartContainer title="Treatment Distribution" isLoading={isLoading}>
            <PieChart
              labels={["Primary Treatment", "Referred to Facility"]}
              data={[metrics.primaryTreatment, metrics.referredCases]}
              backgroundColor={[
                "hsla(142, 76%, 36%, 0.8)",
                "hsla(0, 84%, 42%, 0.8)",
              ]}
              doughnut
            />
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DataTable
              title="Recent Checkups"
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
                      <div>
                        <p className="font-medium">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground">{item.schoolName}</p>
                      </div>
                    </div>
                  ),
                },
                { key: "checkupDate", header: "Date" },
                {
                  key: "bmi",
                  header: "BMI",
                  render: (item: any) => {
                    const bmiValue = item.bmi != null ? Number(item.bmi) : null;
                    if (bmiValue == null || Number.isNaN(bmiValue)) {
                      return <span className="text-sm text-muted-foreground">-</span>;
                    }
                    const color =
                      bmiValue < 18.5
                        ? "text-amber-600"
                        : bmiValue > 25
                        ? "text-rose-600"
                        : "text-emerald-600";
                    return (
                      <span className={`font-medium ${color}`}>
                        {bmiValue.toFixed(1)}
                      </span>
                    );
                  },
                },
                {
                  key: "treatmentType",
                  header: "Treatment",
                  render: (item: any) => <StatusBadge status={item.treatmentType} size="sm" />,
                },
                {
                  key: "symptoms",
                  header: "Symptoms",
                  render: (item: any) => (
                    <span className="text-sm text-muted-foreground">
                      {item.symptoms?.length > 0 ? item.symptoms.slice(0, 2).join(", ") : "None"}
                    </span>
                  ),
                },
              ]}
              data={recentCheckups}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              emptyMessage="No checkups recorded yet"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                Referred Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : referredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No referred cases</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referredStudents.map((student: any) => (
                    <div
                      key={student.id}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/20"
                      data-testid={`referred-${student.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground">{student.studentName}</p>
                        <StatusBadge status="Referred" size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Referred to: {student.referredTo || "Not specified"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {student.checkupDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Hostel Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <Home className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{hostelStats.presentToday}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-500">Present Today</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{hostelStats.onVacation}</p>
                    <p className="text-sm text-amber-600 dark:text-amber-500">On Vacation</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{hostelStats.monthlyPresence}%</p>
                    <p className="text-sm text-blue-600 dark:text-blue-500">Monthly Presence</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Users,
  FileHeart,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Stethoscope,
  School,
  Eye,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const years = [
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

export default function DataQualityDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedSchool, setSelectedSchool] = useState("");

  const { user } = useAuth();

  const { data: schoolsData } = useQuery({
    queryKey: ["/api/schools", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/schools");
      return res.json();
    },
  });

  const { data: qualityData, isLoading } = useQuery({
    queryKey: ["/api/data-quality", selectedMonth, selectedYear, selectedSchool],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      if (selectedSchool) {
        params.append("schoolId", selectedSchool);
      }
      const res = await apiRequest("GET", `/api/data-quality?${params}`);
      return res.json();
    },
  });

  const metrics = qualityData?.metrics || {
    totalProfiles: 0,
    missingHealthCards: 0,
    incompleteHealthCards: 0,
    missingVaccinationRecords: 0,
    missingDOB: 0,
    dataEntryCompliance: 0,
  };

  const schoolQualityData = qualityData?.schoolQualityData || [];
  const dataCompletenessTrends = qualityData?.dataCompletenessTrends || [];

  return (
    <AppLayout title="Data Quality & Registry Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Data Quality & Registry Completeness</h2>
            <p className="text-muted-foreground">Monitor data completeness and registry quality metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Schools</SelectItem>
                {schoolsData?.schools?.map((school: any) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Total Student Profiles"
            value={metrics.totalProfiles}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Missing Health Cards"
            value={metrics.missingHealthCards}
            subtitle="Students without cards"
            icon={FileHeart}
            variant="danger"
          />
          <MetricCard
            title="Incomplete Health Cards"
            value={metrics.incompleteHealthCards}
            subtitle="Missing mandatory fields"
            icon={AlertCircle}
            variant="warning"
          />
          <MetricCard
            title="Missing Vaccination Data"
            value={metrics.missingVaccinationRecords}
            subtitle="Incomplete immunization records"
            icon={Stethoscope}
            variant="warning"
          />
          <MetricCard
            title="Missing Date of Birth"
            value={metrics.missingDOB}
            subtitle="DOB not recorded"
            icon={Calendar}
            variant="warning"
          />
          <MetricCard
            title="Data Entry Compliance"
            value={`${metrics.dataEntryCompliance}%`}
            subtitle="Schools updating regularly"
            icon={TrendingUp}
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Data Completeness by School" isLoading={isLoading}>
            <BarChart
              labels={schoolQualityData.map((s: any) => s.name || "Unknown")}
              datasets={[
                {
                  label: "Complete Profiles %",
                  data: schoolQualityData.map((s: any) => s.completenessPercentage || 0),
                  backgroundColor: "hsl(142, 76%, 36%)",
                },
              ]}
            />
          </ChartContainer>

          <ChartContainer title="Data Quality Distribution" isLoading={isLoading}>
            <PieChart
              labels={["Complete", "Missing Health Cards", "Incomplete Data", "Missing DOB"]}
              data={[
                metrics.totalProfiles - metrics.missingHealthCards - metrics.incompleteHealthCards - metrics.missingDOB,
                metrics.missingHealthCards,
                metrics.incompleteHealthCards,
                metrics.missingDOB,
              ]}
              backgroundColor={[
                "hsla(142, 76%, 36%, 0.8)",
                "hsla(0, 84%, 42%, 0.8)",
                "hsla(43, 74%, 49%, 0.8)",
                "hsla(280, 65%, 60%, 0.8)",
              ]}
              doughnut
            />
          </ChartContainer>
        </div>

        <DataTable
          title="School-wise Data Quality Metrics"
          columns={[
            { key: "name", header: "School Name" },
            { key: "district", header: "District" },
            { key: "totalStudents", header: "Total Students", className: "text-center" },
            {
              key: "healthCardCompletion",
              header: "Health Cards",
              render: (item: any) => (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.healthCardCompletion}%` }}
                    />
                  </div>
                  <span className="text-sm">{item.healthCardCompletion}%</span>
                </div>
              ),
            },
            {
              key: "dataCompleteness",
              header: "Data Completeness",
              render: (item: any) => (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-chart-2 rounded-full"
                      style={{ width: `${item.dataCompleteness}%` }}
                    />
                  </div>
                  <span className="text-sm">{item.dataCompleteness}%</span>
                </div>
              ),
            },
            {
              key: "missingRecords",
              header: "Missing Records",
              className: "text-center",
              render: (item: any) => (
                <span className="font-medium text-rose-600 dark:text-rose-400">{item.missingRecords}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: any) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`/schools/${item.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
          data={schoolQualityData}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          emptyMessage="No school data available"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Quality Insights & Recommendations
            </CardTitle>
            <p className="text-sm text-muted-foreground">Automated insights based on current data quality metrics</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.missingHealthCards > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">Missing Health Cards</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {metrics.missingHealthCards} students are missing annual health cards. Consider prioritizing health card completion for these students.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metrics.dataEntryCompliance < 80 && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">Data Entry Compliance</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Only {metrics.dataEntryCompliance}% of schools are updating data regularly. Consider training programs or reminders for low-compliance schools.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metrics.incompleteHealthCards > 0 && (
                <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <div className="flex items-start gap-3">
                    <FileHeart className="h-5 w-5 text-rose-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-rose-800 dark:text-rose-200">Incomplete Health Records</h4>
                      <p className="text-sm text-rose-700 dark:text-rose-300">
                        {metrics.incompleteHealthCards} health cards have missing mandatory fields (height, weight, BMI). Ensure complete data entry during checkups.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {metrics.dataEntryCompliance >= 90 && metrics.missingHealthCards === 0 && (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Excellent Data Quality</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Your data quality metrics are excellent! Keep up the good work with regular monitoring and updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
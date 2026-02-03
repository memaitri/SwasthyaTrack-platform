import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { LineChart } from "@/components/charts/LineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { exportToPDF } from "@/lib/exportService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SharedReports } from "@/components/reports/SharedReports";
import { InlineFilterControls } from "@/components/filters/FilterControls";
import { usePOFilters } from "@/hooks/useFilters";
import {
  School,
  Users,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Clock,
  Download,
  FileText,
  Heart,
  Shield,
  Target,
  MapPin,
  Activity,
  BarChart as BarChartIcon,
  AlertTriangle,
  Zap,
  Flame,
  Thermometer,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Type definitions for data structures
interface FacilityLoad {
  facility: string;
  pending: number;
  completed: number;
}

interface ReferredIssue {
  issue: string;
  count: number;
}

interface BMITrend {
  month: string;
  underweight: number;
  normal: number;
  overweight: number;
}

// Comprehensive interface for PO Dashboard data
interface PODashboardData {
  districtKPIs?: {
    totalSchools?: number;
    totalStudentsScreened?: number;
    [key: string]: any;
  };
  referralHeatmap?: Record<string, any>;
  anthropometryAnalytics?: Record<string, any>;
  deficienciesInsights?: Record<string, any>;
  deficienciesHeatmap?: Record<string, any>;
  diseasesInsights?: Record<string, any>;
  leprosyAnalytics?: Record<string, any>;
  tbAnalytics?: Record<string, any>;
  adolescentHealth?: {
    adolescentCardCount?: number;
    totalAdolescents?: number;
    [key: string]: any;
  };
  referralManagement?: Record<string, any>;
  complianceAnalytics?: Record<string, any>;
  alerts?: Record<string, any>;
  menstrualHealthAnalytics?: {
    totalEligibleStudents?: number;
    totalTrackedStudents?: number;
    lateMenstruationCases?: Array<{
      delayDays?: number;
      [key: string]: any;
    }>;
    referralAnalysis?: {
      total?: number;
      byFacility?: Record<string, number>;
      [key: string]: any;
    };
    monthlyTrend?: Array<{
      month: string;
      count: number;
      [key: string]: any;
    }>;
    cycleRegularity?: {
      regular?: number;
      irregular?: number;
      unknown?: number;
      [key: string]: any;
    };
    ageWiseAnalysis?: {
      irregularityRates?: Record<string, string | number>;
      [key: string]: any;
    };
    symptomAnalysis?: {
      symptoms?: Array<{
        [key: string]: any;
      }>;
      moods?: Array<{
        [key: string]: any;
      }>;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

export default function PODashboard() {
   const [activeTab, setActiveTab] = useState("overview");
   const [heatmapStatus, setHeatmapStatus] = useState<string | 'all'>('all');
   const [heatmapCategory, setHeatmapCategory] = useState<string | 'all'>('all');

   // Use the new filtering system
   const {
     filters,
     updateFilter,
     resetFilters,
     buildParams,
     filterOptions,
     queryKey,
     activeFilterCount,
     filterSummary,
   } = usePOFilters();

   // Export function for PO dashboard
   const handleExport = async (type: string, format: string = "excel") => {
     try {
       const params = buildParams();
       params.append("format", format);

       const response = await apiRequest("GET", `/api/po/export/${type}?${params}`);
       const blob = await response.blob();

       // Create download link
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement("a");
       a.href = url;
       a.download = `${type}-report-${filters.year}-${filters.month}.${format === "excel" ? "csv" : format}`;
       document.body.appendChild(a);
       a.click();
       window.URL.revokeObjectURL(url);
       document.body.removeChild(a);
     } catch (error) {
       console.error("Export failed:", error);
       // You could add a toast notification here
     }
   };

  // Try client-side pretty PDF generation first (for charts/visuals), fallback to server export
  const handlePOQuickExport = async (type: string) => {
    try {
      // For monthly-health prefer client-side charted PDF
      if (type === 'monthly-health') {
        try {
          const { generatePdfReport } = await import('@/lib/pdfReports');
          const { blob, filename } = await generatePdfReport({ type: 'monthly-checkup', month: filters.month, year: filters.year });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || `${type}-${filters.year}-${filters.month}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          return;
        } catch (err) {
          console.warn('Client-side monthly-health export failed, falling back to server export', err);
        }
      }

      // For other types try to fetch JSON and use exportService for pretty tabular PDFs when feasible
      try {
        const token = localStorage.getItem('accessToken');
        const params = buildParams();
        params.append('format', 'json');
        const res = await fetch(`/api/po/export/${type}?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          // If server returned rows array, use client PDF exporter
          if (Array.isArray(json.rows) && json.rows.length > 0) {
            const columns = Object.keys(json.rows[0]).map((k) => ({ key: k, header: k }));
            const rows = json.rows;
            exportToPDF(rows as any, { columns }, 'PO');
            return;
          }
        }
      } catch (err) {
        console.warn('Attempt to use server JSON for client export failed, will fallback to server blob export', err);
      }

      // Final fallback: use existing server blob export (default format excel)
      await handleExport(type, 'excel');
    } catch (error) {
      console.error('PO quick export failed:', error);
    }
  };

  // Unified report generation handler
  const handleUnifiedReport = async (reportType: string, format: string = "excel") => {
    try {
      const params = buildParams();
      params.append("type", reportType);
      params.append("format", format);

      const response = await apiRequest("GET", `/api/reports/unified?${params}`);
      
      if (format === 'json') {
        const data = await response.json();
        console.log('Report data:', data);
        // Could show in a modal or download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${filters.year}-${filters.month}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${filters.year}-${filters.month}.${format === "excel" ? "xlsx" : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Unified report generation failed:", error);
      // You could add a toast notification here
    }
  };

  const { data: dashboardData, isLoading, error, refetch } = useQuery<PODashboardData>({
    queryKey,
    queryFn: async () => {
      try {
        const params = buildParams();
        const res = await apiRequest("GET", `/api/po/dashboard?${params}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Validate that we received the expected data structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }
        
        // Log successful data fetch for debugging
        console.log('PO Dashboard data fetched successfully:', {
          districtKPIs: !!data.districtKPIs,
          totalSchools: data.districtKPIs?.totalSchools || 0,
          totalStudents: data.districtKPIs?.totalStudentsScreened || 0,
          diseasesInsights: !!data.diseasesInsights,
          adolescentHealth: !!data.adolescentHealth,
          menstrualHealthAnalytics: !!data.menstrualHealthAnalytics,
        });
        
        return data;
      } catch (error) {
        console.error('Error fetching PO dashboard data:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Defensive: if diseases/adolescent data missing, attempt a refetch and log for debugging
  // This helps in transient cases and surfaces missing-data issues in logs
  useEffect(() => {
    if (!isLoading && dashboardData && !error) {
      const hasDiseases = dashboardData.diseasesInsights && Object.keys(dashboardData.diseasesInsights || {}).length > 0;
      const hasAdolescent = dashboardData.adolescentHealth && ((dashboardData.adolescentHealth.adolescentCardCount || 0) > 0 || (dashboardData.adolescentHealth.totalAdolescents || 0) > 0);
      const hasDistrictKPIs = dashboardData.districtKPIs && (dashboardData.districtKPIs.totalStudentsScreened || 0) > 0;
      
      if (!hasDiseases || !hasAdolescent || !hasDistrictKPIs) {
        console.warn("PODashboard: Some data sections appear empty; this may indicate:", { 
          hasDiseases, 
          hasAdolescent, 
          hasDistrictKPIs,
          totalSchools: dashboardData.districtKPIs?.totalSchools || 0,
          totalStudents: dashboardData.districtKPIs?.totalStudentsScreened || 0,
          keys: Object.keys(dashboardData || {}) 
        });
        
        // Only refetch once to avoid infinite loops
        if (!sessionStorage.getItem('po-dashboard-refetch-attempted')) {
          sessionStorage.setItem('po-dashboard-refetch-attempted', 'true');
          console.log("Attempting one-time refetch to recover missing data...");
          refetch().catch((err) => {
            console.warn("PODashboard: refetch failed:", err);
          });
        }
      } else {
        // Clear the refetch flag on successful data load
        sessionStorage.removeItem('po-dashboard-refetch-attempted');
      }
    }
  }, [isLoading, dashboardData, error, refetch]);

  // Handle error state
  if (error) {
    return (
      <AppLayout title="PO Dashboard - District Health Intelligence">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-lg font-semibold">
              Failed to load dashboard data
            </div>
            <div className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <AppLayout title="PO Dashboard - District Health Intelligence">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">District Health Intelligence - Summary View</h2>
              <p className="text-muted-foreground">Program Officer Dashboard - SwasthyaTrack (Loading...)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Extract comprehensive data from the new backend response
  const districtKPIs = dashboardData?.districtKPIs || {};
  const referralHeatmap = dashboardData?.referralHeatmap || {};
  const anthropometryAnalytics = dashboardData?.anthropometryAnalytics || {};
  const deficienciesInsights = dashboardData?.deficienciesInsights || {};
  const deficienciesHeatmap = dashboardData?.deficienciesHeatmap || {};
  const diseasesInsights = dashboardData?.diseasesInsights || {};
  const leprosyAnalytics = dashboardData?.leprosyAnalytics || {};
  const tbAnalytics = dashboardData?.tbAnalytics || {};
  const adolescentHealth = dashboardData?.adolescentHealth || {};
  const referralManagement = dashboardData?.referralManagement || {};
  const complianceAnalytics = dashboardData?.complianceAnalytics || {};
  const alerts = dashboardData?.alerts || {};

  // Legacy computed values for backward compatibility (remove these gradually)
  const totalStudentsScreened = districtKPIs.totalStudentsScreened || 0;
  const percentSchoolsCompleted = districtKPIs.schoolsCompletedScreeningPercent || 0;
  const schoolsWithCompletedScreening = Math.round((districtKPIs.schoolsCompletedScreeningPercent || 0) / 100 * (districtKPIs.totalSchools || 1));
  const percentStudentsReferred = districtKPIs.studentsReferredPercent || 0;
  const totalPendingReferrals = districtKPIs.totalPendingReferrals || 0;
  const highRiskCasesToday = districtKPIs.highRiskCasesToday || 0;
  const avgBMI = parseFloat(districtKPIs.avgBMIDistrict || "0");
  const underweightPercent = districtKPIs.prevalenceRates?.underweightPercent || 0;
  const obesityPercent = districtKPIs.prevalenceRates?.obesityPercent || 0;
  const severeAnemiaPercent = districtKPIs.prevalenceRates?.severeAnemiaPercent || 0;
  const goitrePercent = districtKPIs.prevalenceRates?.goitrePercent || 0;
  const tbSuspectedPercent = districtKPIs.prevalenceRates?.tbSuspicionPercent || 0;
  const leprosySuspectedPercent = districtKPIs.prevalenceRates?.leprosySuspicionPercent || 0;

  return (
    <AppLayout title="PO Dashboard - District Health Intelligence">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">District Health Intelligence - Summary View</h2>
            <p className="text-muted-foreground">Program Officer Dashboard - SwasthyaTrack (Read-Only)</p>
            {filterSummary && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Filtered: {filterSummary}
              </p>
            )}
          </div>
          <InlineFilterControls
            filters={filters}
            filterOptions={filterOptions}
            onFilterChange={updateFilter}
            onReset={resetFilters}
            isLoading={isLoading}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="diseases">Diseases</TabsTrigger>
            <TabsTrigger value="adolescent">Adolescent</TabsTrigger>
            <TabsTrigger value="menstrual">Menstrual Health</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="shared">Shared Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* 🚨 Critical Alerts Banner */}
            {(alerts?.leprosyAlert || alerts?.tbAlert || alerts?.severeAnemiaAlert) && (
              <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Flame className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="text-lg font-bold text-red-700 dark:text-red-400">🔥 RED ALERT - Critical Cases Detected</h3>
                      <p className="text-red-600 dark:text-red-300">
                        {alerts.leprosyAlert && `Leprosy: ${leprosyAnalytics.totalSuspectedCases || 0} cases • `}
                        {alerts.tbAlert && `TB: ${tbAnalytics.totalSuspectedCases || 0} cases • `}
                        {alerts.severeAnemiaAlert && `Severe Anemia: ${districtKPIs.prevalenceRates?.severeAnemiaPercent || 0}% • `}
                        High-risk cases detected - Immediate action required
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ⚡ KPIs - District Health Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard
                title="Students Screened"
                value={totalStudentsScreened.toLocaleString()}
                icon={Users}
                variant="default"
                subtitle="Total screenings"
              />
              <MetricCard
                title="% Schools Completed"
                value={`${percentSchoolsCompleted}%`}
                icon={School}
                variant="success"
                subtitle={`${schoolsWithCompletedScreening}/${districtKPIs.totalSchools || 1} schools`}
              />
              <MetricCard
                title="% Students Referred"
                value={`${percentStudentsReferred}%`}
                icon={AlertTriangle}
                variant="warning"
                subtitle={`${Math.round(percentStudentsReferred / 100 * totalStudentsScreened)} referrals`}
              />
              <MetricCard
                title="Pending Referrals"
                value={totalPendingReferrals}
                icon={AlertCircle}
                variant="danger"
                subtitle="Awaiting action"
              />
              <MetricCard
                title="High-Risk Cases Today"
                value={highRiskCasesToday}
                icon={Zap}
                variant="danger"
                subtitle="C7+C8+Anemia+SAM"
              />
              <MetricCard
                title="Avg District BMI"
                value={avgBMI.toFixed(1)}
                icon={Target}
                variant="info"
                subtitle="Population average"
              />
            </div>

            {/* 📊 Prevalence Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Prevalence Rates Dashboard
                </CardTitle>
                <p className="text-sm text-muted-foreground">Key health indicators across the district</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{underweightPercent}%</div>
                    <div className="text-sm text-red-600 dark:text-red-500">Underweight</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{obesityPercent}%</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-500">Obesity</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{severeAnemiaPercent}%</div>
                    <div className="text-sm text-red-600 dark:text-red-500">Severe Anemia</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{goitrePercent}%</div>
                    <div className="text-sm text-purple-600 dark:text-purple-500">Goitre</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{tbSuspectedPercent}%</div>
                    <div className="text-sm text-blue-600 dark:text-blue-500">TB Suspected</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{leprosySuspectedPercent}%</div>
                    <div className="text-sm text-green-600 dark:text-green-500">Leprosy Suspected</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🏫 School Type Breakdown - Summary Only */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  School Type Breakdown - Aggregated Summary
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comparative analysis between Government and Aided schools (No individual school data access)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Government Schools Summary */}
                  <div className="p-6 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
                      Government Schools Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Schools:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.schoolCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Students:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.totalStudents || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Health Card Completion:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.healthCardCompletion || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Checkup Coverage:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.checkupCoverage || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Referral Rate:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.referralRate || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Aided Schools Summary */}
                  <div className="p-6 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">
                      Aided Schools Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Schools:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.schoolCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Students:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.totalStudents || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Health Card Completion:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.healthCardCompletion || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Checkup Coverage:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.checkupCoverage || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Referral Rate:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.referralRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative Chart */}
                <div className="mt-6">
                  <ChartContainer title="Government vs Aided Schools - Key Metrics Comparison" isLoading={isLoading}>
                    <BarChart
                      labels={["Health Card Completion %", "Checkup Coverage %", "Referral Rate %"]}
                      datasets={[
                        {
                          label: "Government Schools",
                          data: [
                            districtKPIs.schoolTypeBreakdown?.government?.healthCardCompletion || 0,
                            districtKPIs.schoolTypeBreakdown?.government?.checkupCoverage || 0,
                            districtKPIs.schoolTypeBreakdown?.government?.referralRate || 0
                          ],
                          backgroundColor: "hsl(210, 70%, 50%)",
                        },
                        {
                          label: "Aided Schools",
                          data: [
                            districtKPIs.schoolTypeBreakdown?.aided?.healthCardCompletion || 0,
                            districtKPIs.schoolTypeBreakdown?.aided?.checkupCoverage || 0,
                            districtKPIs.schoolTypeBreakdown?.aided?.referralRate || 0
                          ],
                          backgroundColor: "hsl(142, 76%, 36%)",
                        }
                      ]}
                    />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* 👉 Referral Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Referral Heatmap & Geographic Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">Schools generating most referrals - Outbreaks & clusters detected early</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple map representation */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 min-h-[300px] relative">
                    <div className="text-center text-sm text-muted-foreground mb-4">District Map - Referral Intensity</div>
                    <div className="grid grid-cols-4 gap-2 h-full">
                      {(() => {
                        const visible = (referralHeatmap.schools || []).filter((school: any) => {
                          if (heatmapStatus && heatmapStatus !== 'all') {
                            const map = school.referralStatusCounts || {};
                            if (!map[heatmapStatus] || map[heatmapStatus] === 0) return false;
                          }
                          if (heatmapCategory && heatmapCategory !== 'all') {
                            const cmap = school.referralCategoryCounts || {};
                            if (!cmap[heatmapCategory] || cmap[heatmapCategory] === 0) return false;
                          }
                          return true;
                        });

                        if (!visible.length) {
                          return <div className="col-span-4 text-sm text-muted-foreground">No schools match the selected filters.</div>;
                        }

                        return visible.slice(0, 12).map((school: any, index: number) => {
                          let count = school.referralCount ?? 0;
                          if (heatmapStatus && heatmapStatus !== 'all') count = school.referralStatusCounts?.[heatmapStatus] ?? 0;
                          else if (heatmapCategory && heatmapCategory !== 'all') count = school.referralCategoryCounts?.[heatmapCategory] ?? 0;

                          return (
                            <div key={index} className="relative">
                              <div
                                className={`w-full h-16 rounded cursor-pointer transition-all hover:scale-105 ${
                                  count > 10 ? 'bg-red-500' :
                                  count > 5 ? 'bg-orange-500' :
                                  count > 1 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                title={`${school.schoolName}: ${count} referrals`}
                              />
                              <div className="text-xs text-center mt-1 truncate">{school.schoolName}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>0-1 referrals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span>2-5 referrals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span>6-10 referrals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>10+ referrals</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter controls */}
                  <div className="flex gap-4">
                    <Select value={heatmapStatus} onValueChange={(v: string) => setHeatmapStatus(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Referrals</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={heatmapCategory} onValueChange={(v: string) => setHeatmapCategory(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="defect">Defect</SelectItem>
                        <SelectItem value="deficiency">Deficiency</SelectItem>
                        <SelectItem value="disease">Disease</SelectItem>
                        <SelectItem value="developmental">Developmental</SelectItem>
                        <SelectItem value="adolescent">Adolescent</SelectItem>
                        <SelectItem value="tb">TB</SelectItem>
                        <SelectItem value="leprosy">Leprosy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Debug: quick visibility counts to help diagnose filter issues */}
                  {referralHeatmap?.schools && (
                    (() => {
                      const allSchools = referralHeatmap.schools || [];
                      const matching = allSchools.filter((school: any) => {
                        if (heatmapStatus && heatmapStatus !== 'all') {
                          const map = school.referralStatusCounts || {};
                          if (!map[heatmapStatus] || map[heatmapStatus] === 0) return false;
                        }
                        if (heatmapCategory && heatmapCategory !== 'all') {
                          const cmap = school.referralCategoryCounts || {};
                          if (!cmap[heatmapCategory] || cmap[heatmapCategory] === 0) return false;
                        }
                        return true;
                      });

                      // Aggregate total matching referrals across matching schools for selected category/status
                      const aggregateCount = matching.reduce((acc: number, s: any) => {
                        if (heatmapStatus && heatmapStatus !== 'all') return acc + (s.referralStatusCounts?.[heatmapStatus] || 0);
                        if (heatmapCategory && heatmapCategory !== 'all') return acc + (s.referralCategoryCounts?.[heatmapCategory] || 0);
                        return acc + (s.referralCount || 0);
                      }, 0);

                      return (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <div>Matching schools: <strong>{matching.length}</strong> / <strong>{allSchools.length}</strong></div>
                          { (heatmapCategory && heatmapCategory !== 'all') && (
                            <div>{heatmapCategory} referrals across matches: <strong>{aggregateCount}</strong></div>
                          )}
                          { (heatmapStatus && heatmapStatus !== 'all') && (
                            <div>{heatmapStatus} referrals across matches: <strong>{aggregateCount}</strong></div>
                          )}
                          { (!heatmapCategory || heatmapCategory === 'all') && (!heatmapStatus || heatmapStatus === 'all') && (
                            <div>Total referrals in district: <strong>{districtKPIs.totalReferrals || 0}</strong></div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            {/* Summary Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Summary View Only</h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      PO access is limited to aggregated referral statistics. Individual school data is not accessible.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Management Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Referrals Generated"
                value={referralManagement.totalReferralsGenerated || 0}
                icon={AlertTriangle}
                variant="warning"
              />
              <MetricCard
                title="Referral Completion Rate"
                value={`${referralManagement.referralCompletionPercent || 0}%`}
                icon={CheckCircle2}
                variant="success"
              />
              <MetricCard
                title="Pending Referrals"
                value={referralManagement.pendingReferrals || 0}
                icon={Clock}
                variant="danger"
              />
              <MetricCard
                title="Overdue Referrals"
                value={referralManagement.overdueReferrals?.length || 0}
                icon={AlertCircle}
                variant="danger"
              />
            </div>

            {/* Facility Load - Summary Only */}
            <ChartContainer title="Facility-wise Referral Load (Aggregated)" isLoading={isLoading}>
              <BarChart
                labels={referralManagement.facilityWiseLoad?.map((f: FacilityLoad) => f.facility) || []}
                datasets={[{
                  label: "Pending",
                  data: referralManagement.facilityWiseLoad?.map((f: FacilityLoad) => f.pending) || [],
                  backgroundColor: "hsl(0, 84%, 60%)",
                }, {
                  label: "Completed",
                  data: referralManagement.facilityWiseLoad?.map((f: FacilityLoad) => f.completed) || [],
                  backgroundColor: "hsl(142, 76%, 36%)",
                }]}
              />
            </ChartContainer>

            {/* Most Referred Issues - Summary Only */}
            <ChartContainer title="Most Referred Health Issues (District Summary)" isLoading={isLoading}>
              {(() => {
              // Create concise external labels to avoid very long, detailed text in the chart area
              const conciseLabel = (s?: string) => {
                if (!s) return "";
                const rules: Array<[RegExp, string]> = [
                  [/tubercul/i, "TB suspected"],
                  [/leprosy/i, "Leprosy suspected"],
                  [/severe anemia/i, "Severe anemia"],
                  [/anemia/i, "Anemia"],
                  [/goitr/i, "Goitre"],
                  [/cough/i, "Persistent cough"],
                  [/deformit/i, "Deformities"],
                  [/contractur/i, "Contractures"],
                  [/vision|eye|eyes/i, "Eye issues"],
                ];
                for (const [re, out] of rules) if (re.test(s)) return out;
                // fallback: brief truncated label
                return s.length > 28 ? s.slice(0, 25).trimEnd() + "..." : s;
              };

              const externalLabels = referralManagement.mostReferredIssues?.map((i: ReferredIssue) => conciseLabel(i.issue)) || [];

              return (
                <BarChart
                  horizontal={true}
                  renderLabelsOutside={true}
                  externalLabels={externalLabels}
                  labels={referralManagement.mostReferredIssues?.map((i: ReferredIssue) => i.issue) || []}
                  datasets={[{
                    label: "Referral Count",
                    data: referralManagement.mostReferredIssues?.map((i: ReferredIssue) => i.count) || [],
                    backgroundColor: "hsl(45, 93%, 47%)",
                  }]}
                />
              );
            })()}
            </ChartContainer>

            {/* School Type Referral Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Referral Patterns by School Type</CardTitle>
                <p className="text-sm text-muted-foreground">Comparative referral statistics (No individual school access)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-3">Government Schools</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Referrals:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.totalReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Referral Rate:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.government?.referralRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-green-700 dark:text-green-400 mb-3">Aided Schools</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Referrals:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.totalReferrals || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Referral Rate:</span>
                        <span className="font-medium">{districtKPIs.schoolTypeBreakdown?.aided?.referralRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-6">
            {/* Summary Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Nutrition Summary View</h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      Aggregated nutrition data across the district. Individual school nutrition data is not accessible.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anthropometry Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="BMI Distribution Across District" isLoading={isLoading}>
                <PieChart
                  labels={anthropometryAnalytics.stats?.bmiDistribution ?
                    Object.keys(anthropometryAnalytics.stats.bmiDistribution) : []}
                  data={anthropometryAnalytics.stats?.bmiDistribution ?
                    Object.values(anthropometryAnalytics.stats.bmiDistribution) : []}
                  backgroundColor={[
                    "hsl(0, 84%, 60%)",   // Severe Underweight - red
                    "hsl(15, 84%, 60%)",  // Moderate Underweight
                    "hsl(30, 84%, 60%)",  // Mild Underweight
                    "hsl(142, 76%, 36%)", // Normal - green
                    "hsl(45, 93%, 47%)",  // Overweight - yellow
                    "hsl(280, 65%, 60%)", // Obese - purple
                  ]}
                />
              </ChartContainer>

              <ChartContainer title="BMI Categories by Percentage" isLoading={isLoading}>
                <BarChart
                  labels={["Underweight %", "Normal %", "Obese %"]}
                  datasets={[{
                    label: "Percentage",
                    data: [
                      anthropometryAnalytics.stats?.underweightPercent || 0,
                      anthropometryAnalytics.stats?.normalPercent || 0,
                      anthropometryAnalytics.stats?.obesePercent || 0
                    ],
                    backgroundColor: "hsl(210, 70%, 50%)",
                  }]}
                />
              </ChartContainer>
            </div>

            {/* BMI Trend Over Time */}
            <ChartContainer title="BMI Trend Over Time (Last 12 Months)" isLoading={isLoading}>
              <LineChart
                labels={anthropometryAnalytics.bmiTrendOverTime?.map((t: BMITrend) => t.month) || []}
                datasets={[
                  {
                    label: "Underweight",
                    data: anthropometryAnalytics.bmiTrendOverTime?.map((t: BMITrend) => t.underweight) || [],
                    borderColor: "hsl(0, 84%, 60%)",
                    backgroundColor: "hsl(0, 84%, 60%, 0.1)",
                  },
                  {
                    label: "Normal",
                    data: anthropometryAnalytics.bmiTrendOverTime?.map((t: BMITrend) => t.normal) || [],
                    borderColor: "hsl(142, 76%, 36%)",
                    backgroundColor: "hsl(142, 76%, 36%, 0.1)",
                  },
                  {
                    label: "Overweight/Obese",
                    data: anthropometryAnalytics.bmiTrendOverTime?.map((t: BMITrend) => t.overweight) || [],
                    borderColor: "hsl(45, 93%, 47%)",
                    backgroundColor: "hsl(45, 93%, 47%, 0.1)",
                  }
                ]}
              />
            </ChartContainer>

            {/* Nutrition Risk Summary by School Type */}
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Risk Summary by School Type</CardTitle>
                <p className="text-sm text-muted-foreground">Aggregated nutrition risk analysis (No individual school data)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-3">Government Schools</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Avg Underweight %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.male?.underweightPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Normal %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.male?.normalPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Obese %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.male?.obesePercent || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <h4 className="font-medium text-green-700 dark:text-green-400 mb-3">Aided Schools</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Avg Underweight %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.female?.underweightPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Normal %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.female?.normalPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Obese %:</span>
                        <span className="font-medium">{anthropometryAnalytics.genderSplit?.female?.obesePercent || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gender Split Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Gender-wise Nutrition Patterns</CardTitle>
                <p className="text-sm text-muted-foreground">BMI distribution by gender (District-wide summary)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Male Students</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Underweight:</span>
                        <span>{anthropometryAnalytics.genderSplit?.male?.underweightPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Normal:</span>
                        <span>{anthropometryAnalytics.genderSplit?.male?.normalPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Obese:</span>
                        <span>{anthropometryAnalytics.genderSplit?.male?.obesePercent || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Female Students</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Underweight:</span>
                        <span>{anthropometryAnalytics.genderSplit?.female?.underweightPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Normal:</span>
                        <span>{anthropometryAnalytics.genderSplit?.female?.normalPercent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Obese:</span>
                        <span>{anthropometryAnalytics.genderSplit?.female?.obesePercent || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diseases" className="space-y-6">
            {/* Summary Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Disease Summary View</h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      Aggregated disease statistics across the district. Individual case details are not accessible.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Deficiencies Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Section B - Deficiencies Insights</CardTitle>
                <p className="text-sm text-muted-foreground">Critical deficiencies requiring immediate attention</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(deficienciesInsights).map(([key, deficiency]: [string, any]) => (
                    deficiency.totalCases > 0 && (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            deficiency.totalCases > 50 ? "destructive" :
                            deficiency.totalCases > 20 ? "default" : "secondary"
                          }>
                            {key.toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                            <div className="text-sm text-muted-foreground">{deficiency.totalCases} cases</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Pending referrals</div>
                          <div className="font-medium">{deficiency.pendingReferrals}</div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deficiencies Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Deficiencies Severity Heatmap</CardTitle>
                <p className="text-sm text-muted-foreground">Schools with highest deficiency rates</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(deficienciesHeatmap) ? deficienciesHeatmap : deficienciesHeatmap.schools || []).slice(0, 10).map((school: any) => (
                    <div key={school.schoolId} className="flex items-center justify-between p-3 border rounded">
                      <div className="font-medium">{school.schoolName}</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${
                          school.severity > 20 ? 'bg-red-500' :
                          school.severity > 10 ? 'bg-orange-500' :
                          school.severity > 5 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span className="text-sm">{school.severity}% severity</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Diseases Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Section C - Diseases Insights</CardTitle>
                <p className="text-sm text-muted-foreground">Chronic recurring health issues</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(diseasesInsights).map(([key, disease]: [string, any]) => (
                    disease.totalCases > 0 && (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{key.toUpperCase()}</Badge>
                          <div>
                            <div className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                            <div className="text-sm text-muted-foreground">{disease.totalCases} cases</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Referral completion</div>
                          <div className="font-medium">{disease.referralCompletion} completed</div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* C7 Leprosy Analytics */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Flame className="h-5 w-5" />
                  C7 - Childhood Leprosy Analytics (CRITICAL)
                </CardTitle>
                <p className="text-sm text-muted-foreground">Highly monitored condition - {leprosyAnalytics.showRedAlert ? 'RED ALERT ACTIVE' : 'No cases detected'}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{leprosyAnalytics.totalSuspectedCases}</div>
                    <div className="text-sm text-red-600 dark:text-red-500">Total Suspected Cases</div>
                  </div>
                  <div className="text-center p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{leprosyAnalytics.referralStatus?.completed || 0}/{leprosyAnalytics.totalSuspectedCases}</div>
                    <div className="text-sm text-orange-600 dark:text-orange-500">Referral Completion</div>
                  </div>
                  <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{leprosyAnalytics.facilityLoad?.length || 0}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-500">Facilities Involved</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Sub-type Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(leprosyAnalytics.subTypeDistribution || {}).map(([type, count]: [string, any]) => (
                      <div key={type} className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-lg font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground">{type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* C8 TB Analytics */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Flame className="h-5 w-5" />
                  C8 - Childhood Tuberculosis Analytics (ULTRA CRITICAL)
                </CardTitle>
                <p className="text-sm text-muted-foreground">Requires instant escalations - {tbAnalytics.showRedAlert ? 'RED ALERT ACTIVE' : 'No cases detected'}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{tbAnalytics.totalSuspectedCases}</div>
                    <div className="text-sm text-red-600 dark:text-red-500">TB Suspected Cases</div>
                  </div>
                  <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{tbAnalytics.contactHistoryPercent}%</div>
                    <div className="text-sm text-blue-600 dark:text-blue-500">Contact History</div>
                  </div>
                  <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{tbAnalytics.referralStatus?.completed || 0}/{tbAnalytics.totalSuspectedCases}</div>
                    <div className="text-sm text-green-600 dark:text-green-500">Referral Completion</div>
                  </div>
                  <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{tbAnalytics.dotsCenterLoad?.length || 0}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-500">DOTS Centers</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Symptoms Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tbAnalytics.symptomsBreakdown?.counts || tbAnalytics.symptomsBreakdown || {}).map(([symptom, count]: [string, any]) => (
                      count > 0 && <Badge key={symptom} variant="outline">{symptom} ({count})</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            </TabsContent>

          <TabsContent value="adolescent" className="space-y-6">
            {/* Summary Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Adolescent Health Summary</h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      Aggregated adolescent health data. Individual student information is not accessible.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Adolescent Health Monitoring */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Emotional Distress"
                value={`${adolescentHealth.emotionalDistressPercent || 0}%`}
                icon={Heart}
                variant="warning"
                subtitle="Students affected"
              />
              <MetricCard
                title="Peer Pressure Issues"
                value={`${adolescentHealth.peerPressurePercent || 0}%`}
                icon={Users}
                variant="default"
                subtitle="Substance pressure"
              />
              <MetricCard
                title="Depression Symptoms"
                value={`${adolescentHealth.depressionSymptomsPercent || 0}%`}
                icon={AlertTriangle}
                variant="danger"
                subtitle="Requires attention"
              />
              <MetricCard
                title="Menstrual Health Issues"
                value={`${adolescentHealth.menstrualHealthIssuesPercent || 0}%`}
                icon={Shield}
                variant="info"
                subtitle="Reproductive health"
              />
            </div>

            {/* Adolescent Health Concerns */}
            <Card>
              <CardHeader>
                <CardTitle>Section E - Adolescent Health Concerns</CardTitle>
                <p className="text-sm text-muted-foreground">Mental & reproductive health tracking (10-18 years)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Mental Health Indicators</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Emotional Distress/Difficulty</span>
                        <Badge variant="secondary">{adolescentHealth.emotionalDistressPercent}%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Peer Pressure/Substance Issues</span>
                        <Badge variant="secondary">{adolescentHealth.peerPressurePercent}%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Persistent Sadness/Depression</span>
                        <Badge variant="destructive">{adolescentHealth.depressionSymptomsPercent}%</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Reproductive Health Indicators</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Menstruation Started</span>
                        <Badge variant="default">{adolescentHealth.menstrualHealthIssuesPercent}%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Pain on Urination</span>
                        <Badge variant="secondary">{adolescentHealth.utiSymptomsPercent}%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Foul Smell Discharge</span>
                        <Badge variant="secondary">{adolescentHealth.utiSymptomsPercent}%</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Severe Menstrual Pain</span>
                        <Badge variant="destructive">{adolescentHealth.menstrualHealthIssuesPercent}%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Developmental Delays - Section D */}
            <Card>
              <CardHeader>
                <CardTitle>Section D - Developmental Delays</CardTitle>
                <p className="text-sm text-muted-foreground">Vision, hearing, learning, motor, and behavioral concerns</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{adolescentHealth.visionConcerns || 0}</div>
                    <div className="text-sm text-muted-foreground">Vision concerns</div>
                    <div className="text-xs text-muted-foreground">reported cases</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{adolescentHealth.hearingConcerns || 0}</div>
                    <div className="text-sm text-muted-foreground">Hearing concerns</div>
                    <div className="text-xs text-muted-foreground">reported cases</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{adolescentHealth.learningConcerns || 0}</div>
                    <div className="text-sm text-muted-foreground">Learning concerns</div>
                    <div className="text-xs text-muted-foreground">reported cases</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{adolescentHealth.motorConcerns || 0}</div>
                    <div className="text-sm text-muted-foreground">Motor concerns</div>
                    <div className="text-xs text-muted-foreground">reported cases</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{adolescentHealth.behavioralConcerns || 0}</div>
                    <div className="text-sm text-muted-foreground">Behavioral concerns</div>
                    <div className="text-xs text-muted-foreground">reported cases</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menstrual" className="space-y-6">
            {/* Summary Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Menstrual Health Summary</h3>
                    <p className="text-blue-600 dark:text-blue-300">
                      Aggregated menstrual health analytics. Individual student data is not accessible.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Menstrual Health Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Eligible Students"
                value={dashboardData?.menstrualHealthAnalytics?.totalEligibleStudents || 0}
                icon={Users}
                variant="default"
                subtitle="Female, age 10+"
              />
              <MetricCard
                title="Actively Tracked"
                value={dashboardData?.menstrualHealthAnalytics?.totalTrackedStudents || 0}
                icon={Activity}
                variant="success"
                subtitle="With period data"
              />
              <MetricCard
                title="Late Menstruation"
                value={dashboardData?.menstrualHealthAnalytics?.lateMenstruationCases?.length || 0}
                icon={AlertCircle}
                variant="warning"
                subtitle="Needs attention"
              />
              <MetricCard
                title="Referrals"
                value={dashboardData?.menstrualHealthAnalytics?.referralAnalysis?.total || 0}
                icon={Stethoscope}
                variant="info"
                subtitle="Menstrual health"
              />
            </div>

            {/* Monthly Menstruation Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Menstruation Tracking Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.menstrualHealthAnalytics?.monthlyTrend && (
                  <ChartContainer title="Monthly Menstruation Tracking Trend">
                    <LineChart
                      labels={dashboardData.menstrualHealthAnalytics.monthlyTrend.map((item: any) => item.month)}
                      datasets={[{
                        label: "Students Tracked Per Month",
                        data: dashboardData.menstrualHealthAnalytics.monthlyTrend.map((item: any) => item.count),
                        borderColor: "#8b5cf6",
                        backgroundColor: "#8b5cf6",
                      }]}
                    />
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cycle Regularity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5" />
                    Cycle Regularity Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.menstrualHealthAnalytics?.cycleRegularity && (
                    <ChartContainer title="Cycle Regularity Distribution">
                      <PieChart
                        labels={['Regular', 'Irregular', 'Unknown']}
                        data={[
                          dashboardData.menstrualHealthAnalytics.cycleRegularity.regular || 0,
                          dashboardData.menstrualHealthAnalytics.cycleRegularity.irregular || 0,
                          dashboardData.menstrualHealthAnalytics.cycleRegularity.unknown || 0
                        ]}
                        backgroundColor={['#10b981', '#f59e0b', '#6b7280']}
                      />
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Age-wise Irregularity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Age-wise Irregularity Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.menstrualHealthAnalytics?.ageWiseAnalysis && (
                    <ChartContainer title="Age-wise Irregularity Rates">
                      <BarChart
                        labels={Object.keys(dashboardData.menstrualHealthAnalytics.ageWiseAnalysis.irregularityRates || {})}
                        datasets={[{
                          label: "Irregularity Rate (%)",
                          data: Object.values(dashboardData.menstrualHealthAnalytics.ageWiseAnalysis.irregularityRates || {}).map(rate => parseFloat(rate as string)),
                          backgroundColor: "#ef4444",
                        }]}
                      />
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Common Symptoms Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Common Symptoms & Moods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Most Common Symptoms</h4>
                    {dashboardData?.menstrualHealthAnalytics?.symptomAnalysis?.symptoms?.slice(0, 5).map((symptom: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <span className="capitalize">{symptom.symptom.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{symptom.count} reports</span>
                          <Badge variant="secondary">{symptom.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Most Common Moods</h4>
                    {dashboardData?.menstrualHealthAnalytics?.symptomAnalysis?.moods?.slice(0, 5).map((mood: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <span className="capitalize">{mood.mood}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{mood.count} reports</span>
                          <Badge variant="secondary">{mood.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Late Menstruation Cases - Summary Only */}
            {dashboardData?.menstrualHealthAnalytics?.lateMenstruationCases && dashboardData.menstrualHealthAnalytics.lateMenstruationCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Late Menstruation Cases Summary
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Aggregated statistics only - Individual student details not accessible
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                        {dashboardData.menstrualHealthAnalytics.lateMenstruationCases.length}
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-500">Total Cases</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {dashboardData.menstrualHealthAnalytics.lateMenstruationCases.filter((c: any) => c.delayDays > 7).length}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-500">High Risk (&gt;7 days)</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {Math.round(dashboardData.menstrualHealthAnalytics.lateMenstruationCases.reduce((sum: number, c: any) => sum + (c.delayDays || 0), 0) / dashboardData.menstrualHealthAnalytics.lateMenstruationCases.length)}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-500">Avg Delay (days)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referral Facilities Analysis */}
            {dashboardData?.menstrualHealthAnalytics?.referralAnalysis?.byFacility && Object.keys(dashboardData.menstrualHealthAnalytics.referralAnalysis.byFacility).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Menstrual Health Referrals by Facility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer title="Referrals by Healthcare Facility">
                    <BarChart
                      labels={Object.keys(dashboardData.menstrualHealthAnalytics.referralAnalysis.byFacility).map(facility => 
                        facility.length > 20 ? facility.substring(0, 20) + '...' : facility
                      )}
                      datasets={[{
                        label: "Referrals by Healthcare Facility",
                        data: Object.values(dashboardData.menstrualHealthAnalytics.referralAnalysis.byFacility) as number[],
                        backgroundColor: "#3b82f6",
                      }]}
                    />
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Unified Report Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Unified Report Generation
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generate comprehensive reports with menstrual health analytics</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2" 
                    onClick={() => handleUnifiedReport("menstrual-health", "excel")}
                  >
                    <Heart className="h-6 w-6 text-pink-500" />
                    <span className="text-sm">Menstrual Health Report</span>
                    <span className="text-xs text-muted-foreground">Analytics & trends</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2" 
                    onClick={() => handleUnifiedReport("health-overview", "excel")}
                  >
                    <Stethoscope className="h-6 w-6 text-blue-500" />
                    <span className="text-sm">Health Overview</span>
                    <span className="text-xs text-muted-foreground">Complete health status</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2" 
                    onClick={() => handleUnifiedReport("referrals", "excel")}
                  >
                    <ExternalLink className="h-6 w-6 text-orange-500" />
                    <span className="text-sm">Referrals Report</span>
                    <span className="text-xs text-muted-foreground">All referral types</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2" 
                    onClick={() => handleUnifiedReport("student-demographics", "excel")}
                  >
                    <Users className="h-6 w-6 text-green-500" />
                    <span className="text-sm">Student Demographics</span>
                    <span className="text-xs text-muted-foreground">Population analysis</span>
                  </Button>
                </div>

                <div className="mt-6 flex gap-4">
                  <Select defaultValue="excel">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="flex items-center gap-2" onClick={() => handleUnifiedReport("menstrual-health", "excel")}>
                    <Download className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legacy Exportable Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Legacy Reports (District, State & National Level)
                </CardTitle>
                <p className="text-sm text-muted-foreground">Traditional PO export functionality</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("monthly-health")}>
                    <Calendar className="h-6 w-6" />
                    <span className="text-sm">Monthly Health Report</span>
                    <span className="text-xs text-muted-foreground">District KPIs</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("school-referral-summary")}>
                    <School className="h-6 w-6" />
                    <span className="text-sm">School-wise Referral Summary</span>
                    <span className="text-xs text-muted-foreground">Anonymized data</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("nutritional-status")}>
                    <Heart className="h-6 w-6" />
                    <span className="text-sm">Nutritional Status Summary</span>
                    <span className="text-xs text-muted-foreground">BMI analytics</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("deficiencies-report")}>
                    <AlertCircle className="h-6 w-6" />
                    <span className="text-sm">Deficiencies Report</span>
                    <span className="text-xs text-muted-foreground">Section B analytics</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("tb-leprosy-report")}>
                    <Flame className="h-6 w-6" />
                    <span className="text-sm">TB/Leprosy Red-flag Report</span>
                    <span className="text-xs text-muted-foreground">Critical cases</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handlePOQuickExport("adolescent-health")}>
                    <Shield className="h-6 w-6" />
                    <span className="text-sm">Adolescent Health Red-flag</span>
                    <span className="text-xs text-muted-foreground">Section E concerns</span>
                  </Button>
                </div>

                <div className="mt-6 flex gap-4">
                  <Select defaultValue="pdf">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="flex items-center gap-2" onClick={() => handlePOQuickExport("monthly-health")}>
                    <Download className="h-4 w-4" />
                    Export Selected Reports
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Compliance & Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Monitoring Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">Data quality and system performance metrics</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{complianceAnalytics.dataCompletenessPercent || 0}%</div>
                    <div className="text-sm text-green-600 dark:text-green-500">Data Completeness</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{complianceAnalytics.auditLogs?.invalidBMI || 0}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-500">Invalid BMI Records</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{complianceAnalytics.auditLogs?.incompleteC7C8 || 0}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-500">Incomplete Critical Cases</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shared" className="space-y-6">
            <SharedReports />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}


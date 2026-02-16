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
import { generateYearOptions } from "@/lib/dateUtils";
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
  DialogTrigger} from "@/components/ui/dialog";
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
  Filter,
  Calendar,
  Activity,
  Heart,
  Target,
  BarChart3} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth"; // Corrected the import path for useAuth
import { useToast } from "@/hooks/use-toast";
import { formatGenderDisplay, formatGenderWithIcon } from "@/lib/genderUtils";

type TeacherDashboardData = {
  metrics: any;
  students: any[];
  upcomingCheckups: any[];
  growthTrends: any[];
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
  const { data: dashboardData, isLoading } = useQuery<TeacherDashboardData>({
    queryKey: ["/api/teacher/dashboard", selectedMonth, selectedYear, { class_id: user?.classSection }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      if (user?.classSection) {
        params.append("class_id", user.classSection);
      }
      const res = await apiRequest("GET", `/api/teacher/dashboard?${params}`);
      return await res.json();
    },
    enabled: !!user});

  const { data: growthTrendsData } = useQuery<GrowthTrendsResponse>({
    queryKey: ["/api/growth-trends", selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      const res = await apiRequest("GET", `/api/growth-trends?${params}`);
      return await res.json();
    }});

  const { data: alertsData } = useQuery<AlertsData>({
    queryKey: ["/api/alerts", selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      params.append("year", selectedYear);
      const res = await apiRequest("GET", `/api/alerts?${params}`);
      return await res.json();
    }});

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
    enabled: !!user});

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
    enabled: !!user});

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingReferralId, setUpdatingReferralId] = useState<string | null>(null);

  const allowedStatuses = ["Pending", "In Progress", "Completed", "Overdue", "Rejected"] as const;

  const updateReferralMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; completionDate?: string | null; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/referrals/${payload.id}`, {
        status: payload.status,
        completionDate: payload.completionDate,
        notes: payload.notes});
      return res.json();
    },
    onMutate: async (variables) => {
      setUpdatingReferralId(variables.id);
      const key = ["/api/teacher/referral-tracking", selectedMonth, selectedYear, selectedAgeGroup, selectedHealthCategory, { class_id: user?.classSection ?? undefined }];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      
      // Optimistically update the data with recalculated summary
      queryClient.setQueryData(key, (old: any) => {
        if (!old) return old;
        
        // Update the referral status
        const updatedReferrals = old.referrals.map((r: any) => 
          r.id === variables.id ? { ...r, status: variables.status } : r
        );
        
        // Recalculate summary counts
        const now = new Date();
        const newSummary = {
          total: updatedReferrals.length,
          pending: updatedReferrals.filter((r: any) => r.status === "Pending").length,
          inProgress: updatedReferrals.filter((r: any) => r.status === "In Progress").length,
          completed: updatedReferrals.filter((r: any) => r.status === "Completed").length,
          overdue: updatedReferrals.filter((r: any) => {
            if (r.status !== "Pending" && r.status !== "In Progress" && r.status !== "Overdue") return false;
            const referralDate = new Date(r.date);
            const daysSinceReferral = Math.floor((now.getTime() - referralDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceReferral > 30 || r.status === "Overdue";
          }).length
        };
        
        return {
          ...old,
          referrals: updatedReferrals,
          summary: newSummary,
          pendingCount: newSummary.pending,
          inProgressCount: newSummary.inProgress,
          completedCount: newSummary.completed
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
    }});

  const metrics = dashboardData?.metrics || {
    totalStudents: 0,
    pendingHealthCards: 0,
    monthlyCheckupsDue: 0,
    completedCheckups: 0};
  const pendingHealthCards = metrics.pendingHealthCards ?? metrics.pendingApprovals ?? 0;

  const students = dashboardData?.students || [];
  const upcomingCheckups = dashboardData?.upcomingCheckups || [];
  const growthTrends = dashboardData?.growthTrends || [];
  const enhancedAlerts = dashboardData?.enhancedAlerts || [];
  const mealParticipation = dashboardData?.mealParticipation || { totalMeals: 0, expectedMeals: 0 };
  const attendanceSummary = dashboardData?.attendanceSummary || { presentDays: 0, uniqueStudents: 0 };



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
                {generateYearOptions().map(year => (
                  <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health Tracking</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
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

            {/* Referral Tracking Widget */}
            {referralData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Pending Referrals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralData.pendingCount || 0}</div>
                    <p className="text-xs text-muted-foreground mt-2">Awaiting follow-up</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      In Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralData.inProgressCount || 0}</div>
                    <p className="text-xs text-muted-foreground mt-2">Being processed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralData.completedCount || 0}</div>
                    <p className="text-xs text-muted-foreground mt-2">Resolved this month</p>
                  </CardContent>
                </Card>
              </div>
            )}

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
                  )},
                { 
                  key: "gender", 
                  header: "Gender", 
                  className: "text-center",
                  render: (item: any) => {
                    const genderInfo = formatGenderWithIcon(item.gender);
                    return (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{genderInfo.icon}</span>
                        <span className={`text-sm font-medium ${genderInfo.colorClass}`}>
                          {genderInfo.label}
                        </span>
                      </div>
                    );
                  }
                },
                {
                  key: "healthCardStatus",
                  header: "Health Card",
                  render: (item: any) => (
                    <StatusBadge status={item.healthCardStatus || "Pending"} size="sm" />
                  )},
                  { key: "weight",
                    header: "Weight (kg)",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.weight ?? "N/A"}</span>},
                  { key: "height",
                    header: "Height (cm)",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.height ?? "N/A"}</span>},
                  { key: "bmi",
                    header: "BMI",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.bmi ?? "N/A"}</span>},
                  { key: "bloodPressure",
                    header: "BP",
                    className: "text-center",
                    render: (item: any) => <span className="text-sm">{item.bloodPressure ?? "N/A"}</span>},
                {
                  key: "lastCheckup",
                  header: "Last Checkup",
                  render: (item: any) => (
                    <span className="text-sm text-muted-foreground">
                      {item.lastCheckup || "Not yet"}
                    </span>
                  )},
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
                  )}]}
              data={students}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
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
                   backgroundColor: "hsla(142, 76%, 36%, 0.1)"},
                 {
                   label: "Avg Weight (kg)",
                   data: growthTrendsData.growthTrends.map((t: any) => t.avgWeight),
                   borderColor: "hsl(280, 65%, 60%)",
                   backgroundColor: "hsla(280, 65%, 60%, 0.1)"},
                 {
                   label: "Avg BMI",
                   data: growthTrendsData.growthTrends.map((t: any) => t.avgBMI),
                   borderColor: "hsl(45, 93%, 47%)",
                   backgroundColor: "hsla(45, 93%, 47%, 0.1)"}]}
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
                    growthTrendsData?.healthRiskMetrics?.obese || 0]}
                  backgroundColor={[
                    "hsl(0, 84%, 60%)",
                    "hsl(142, 76%, 36%)",
                    "hsl(45, 93%, 47%)",
                    "hsl(280, 65%, 60%)"]}
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
                        classHealthSummary?.bloodPressure?.stage2 || 0],
                      backgroundColor: "hsl(142, 76%, 36%)"}]}
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
                      backgroundColor: "hsla(142, 76%, 36%, 0.1)"},
                    {
                      label: "Avg Weight (kg)",
                      data: growthTrendsData.growthTrends.map((t: any) => t.avgWeight),
                      borderColor: "hsl(280, 65%, 60%)",
                      backgroundColor: "hsla(280, 65%, 60%, 0.1)"},
                    {
                      label: "Avg BMI",
                      data: growthTrendsData.growthTrends.map((t: any) => t.avgBMI),
                      borderColor: "hsl(45, 93%, 47%)",
                      backgroundColor: "hsla(45, 93%, 47%, 0.1)"}]}
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
                    {!referralData?.referrals || referralData.referrals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                        <p>No referrals found for the selected period</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-2">
                          Showing all {referralData.referrals.length} referral{referralData.referrals.length !== 1 ? 's' : ''}
                        </div>
                        {referralData.referrals.map((referral: any) => (
                          <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{referral.studentName}</p>
                                <Badge variant="outline" className="text-xs">
                                  {referral.source === 'health_card' ? 'Health Card' : 
                                   referral.source === 'monthly_checkup' ? 'Monthly Checkup' : 
                                   'Period Tracker'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {referral.type} • {referral.facility} • {new Date(referral.date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{referral.issue}</p>
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
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

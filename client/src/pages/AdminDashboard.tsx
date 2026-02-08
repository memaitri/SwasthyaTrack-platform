import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import {
  Users,
  School,
  Shield,
  Activity,
  UserPlus,
  Settings,
  TrendingUp,
  Database,
  Heart,
  Stethoscope,
  FileText,
  CheckCircle,
  AlertTriangle,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  MapPin,
  Award} from "lucide-react";
import { Link } from "wouter";

interface SystemActivityItem {
  day: string;
  logins: number;
  actions: number;
}

const roleBadgeColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Headmaster: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ClassTeacher: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  MedicalTeam: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"};

export default function AdminDashboard() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");

  const { user } = useAuth();

  const { data: schoolsData } = useQuery({
    queryKey: ["/api/schools", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/schools");
      return res.json();
    }});

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard", selectedSchoolId],
    queryFn: async () => {
      const url = selectedSchoolId !== "all" ? `/api/admin/dashboard?schoolId=${selectedSchoolId}` : "/api/admin/dashboard";
      const res = await apiRequest("GET", url);
      return res.json();
    }});

  const metrics = dashboardData?.metrics || {
    totalUsers: 0,
    totalSchools: 0,
    totalStudents: 0,
    activeUsers: 0,
    totalHealthCards: 0,
    approvedHealthCards: 0,
    pendingHealthCards: 0,
    healthCardCoverage: 0,
    healthScreeningRate: 0,
    dataCompleteness: 0,
    systemUptime: 0};

  const recentUsers = dashboardData?.recentUsers || [];
  const usersByRole = dashboardData?.usersByRole || [];
  const systemActivity = dashboardData?.systemActivity || [];
  const userActivityLogs = dashboardData?.userActivityLogs || [];

  // Enhanced metrics for ABDM-style dashboard
  const enhancedMetrics = {
    healthCardCompletion: metrics.totalHealthCards > 0 ? Math.round((metrics.approvedHealthCards / metrics.totalHealthCards) * 100) : 0,
    healthCardRate: metrics.healthCardCoverage ?? 0,
    screeningRate: metrics.healthScreeningRate ?? 0,
    dataQuality: metrics.dataCompleteness ?? 0,
    activeUsersToday: systemActivity.reduce((sum: number, day: SystemActivityItem) => sum + day.logins, 0),
    totalActionsToday: systemActivity.reduce((sum: number, day: SystemActivityItem) => sum + day.actions, 0)};

  // Geographic distribution data - dynamically generated from schoolsData
  const geographicData = schoolsData?.schools?.reduce((acc: any[], school: any) => {
    const district = school.district || "Unknown District";
    const existing = acc.find(d => d.region === district);
    if (existing) {
      existing.schools += 1;
      existing.students += school.totalStudents || 0;
      existing.coverage = Math.max(existing.coverage, school.healthCardCompletion || 0);
    } else {
      acc.push({
        region: district,
        schools: 1,
        students: school.totalStudents || 0,
        coverage: school.healthCardCompletion || 0});
    }
    return acc;
  }, []) || [];

  // Monthly trends data - should come from API
  const monthlyTrends = dashboardData?.monthlyTrends ?? [];



  return (
    <AppLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">System Administration</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/test/enhanced">
              <Button variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Test Components
              </Button>
            </Link>
            <Link href="/admin/enhanced">
              <Button variant="default">
                <TrendingUp className="h-4 w-4 mr-2" />
                Enhanced Dashboard
              </Button>
            </Link>
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schoolsData?.schools?.map((school: any) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/schools/pending">
              <Button variant="ghost">
                <CheckCircle className="h-4 w-4 mr-2" />
                Pending Schools
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Performance Indicators - trimmed per request (only system & totals) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Total Schools"
            value={metrics.totalSchools}
            icon={School}
            variant="info"
            subtitle="Registered schools"
          />
          <MetricCard
            title="Total Students"
            value={metrics.totalStudents}
            icon={Users}
            variant="default"
            subtitle="Enrolled students"
          />
          <MetricCard
            title="Active Users Today"
            value={enhancedMetrics.activeUsersToday}
            icon={Activity}
            variant="warning"
            subtitle="User logins"
          />
          <MetricCard
            title="System Uptime"
            value={`${metrics.systemUptime}%`}
            icon={CheckCircle}
            variant="success"
            subtitle="Platform availability"
          />
        </div>

        {/* Main Analytics Charts - ABDM Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartContainer title="User Distribution by Role" isLoading={isLoading}>
              <PieChart
                labels={usersByRole.map((r: any) => r.role)}
                data={usersByRole.map((r: any) => r.count)}
                backgroundColor={[
                  "hsl(280, 65%, 60%)",
                  "hsl(210, 70%, 50%)",
                  "hsl(142, 76%, 36%)",
                  "hsl(43, 74%, 49%)",
                  "hsl(350, 70%, 50%)",
                  "hsl(120, 60%, 50%)"]}
                doughnut
              />
            </ChartContainer>
          </div>
        </div>

        {/* Geographic Distribution and System Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* District-wise Coverage removed per request */}

          <ChartContainer title="Daily System Activity" isLoading={isLoading}>
            <LineChart
              labels={systemActivity.map((a: any) => a.day)}
              datasets={[
                {
                  label: "User Logins",
                  data: systemActivity.map((a: any) => a.logins),
                  borderColor: "hsl(210, 70%, 50%)",
                  backgroundColor: "hsla(210, 70%, 50%, 0.1)",
                  fill: true},
                {
                  label: "System Actions",
                  data: systemActivity.map((a: any) => a.actions),
                  borderColor: "hsl(45, 93%, 47%)",
                  backgroundColor: "hsla(45, 93%, 47%, 0.1)",
                  fill: true}]}
            />
          </ChartContainer>
        </div>

        {/* Geographic Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              District Performance Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">Health service coverage across districts</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {geographicData.map((district: any, index: number) => (
                <div key={district.region} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{district.region}</span>
                      <span className="text-sm text-muted-foreground">{district.coverage}%</span>
                    </div>
                    <Progress value={district.coverage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{district.schools} schools</span>
                      <span>{district.students} students</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DataTable
              title="Recent Users"
              columns={[
                {
                  key: "fullName",
                  header: "User",
                  render: (item: any) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {item.fullName?.slice(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </div>
                    </div>
                  )},
                { key: "username", header: "Username" },
                {
                  key: "role",
                  header: "Role",
                  render: (item: any) => (
                    <Badge
                      variant="outline"
                      className={`${roleBadgeColors[item.role] || ""} no-default-hover-elevate no-default-active-elevate`}
                    >
                      {item.role}
                    </Badge>
                  )},
                {
                  key: "isActive",
                  header: "Status",
                  render: (item: any) => (
                    <StatusBadge status={item.isActive ? "Active" : "Inactive"} size="sm" />
                  )},
                {
                  key: "createdAt",
                  header: "Created",
                  render: (item: any) => (
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  )}]}
              data={recentUsers}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              emptyMessage="No users found"
            />
          </div>

          <Card>
              {/* Quick Actions removed per request */}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentUsers.slice(0, 5).map((user: any) => {
                    const timeAgo = new Date(user.createdAt || user.updatedAt);
                    const hoursAgo = Math.floor((Date.now() - timeAgo.getTime()) / (1000 * 60 * 60));
                    const timeText = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`;

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">User {user.isActive ? "active" : "created"}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.fullName} ({user.role}){user.schoolName ? ` • ${user.schoolName}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeText}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">User Activity Logs</CardTitle>
            <p className="text-sm text-muted-foreground">Recent user actions and account activities</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {userActivityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p>No recent user activities</p>
                  </div>
                ) : (
                  userActivityLogs.slice(0, 10).map((log: any, index: number) => {
                    const timeAgo = new Date(log.timestamp);
                    const hoursAgo = Math.floor((Date.now() - timeAgo.getTime()) / (1000 * 60 * 60));
                    const timeText = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`;

                    return (
                      <div
                        key={`${log.userId}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            log.action === "Account Created" ? "bg-emerald-100 text-emerald-600" :
                            log.action === "Profile Update" ? "bg-blue-100 text-blue-600" :
                            "bg-purple-100 text-purple-600"
                          }`}>
                            {log.action === "Account Created" ? (
                              <UserPlus className="h-4 w-4" />
                            ) : log.action === "Profile Update" ? (
                              <Settings className="h-4 w-4" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{log.username} ({log.role})</p>
                            <p className="text-xs text-muted-foreground">
                              {log.action}{log.schoolName ? ` • ${log.schoolName}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeText}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { EnhancedMetricCard } from "@/components/dashboard/EnhancedMetricCard";
import { EnhancedChartContainer } from "@/components/charts/EnhancedChartContainer";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { InteractiveLineChart } from "@/components/charts/InteractiveLineChart";
import { InteractivePieChart } from "@/components/charts/InteractivePieChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DrillDownProvider, useDrillDown } from "@/components/dashboard/DrillDownProvider";
import { BreadcrumbNavigation } from "@/components/dashboard/BreadcrumbNavigation";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Award,
  Filter,
  Maximize2} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

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

function EnhancedAdminDashboardContent() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    timeRange: "30d",
    userRole: "all",
    schoolType: "all",
    status: "all"
  });
  const [isAnimated, setIsAnimated] = useState(false);

  const { user } = useAuth();
  const { drillDown, currentLevel } = useDrillDown();

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: schoolsData } = useQuery({
    queryKey: ["/api/schools", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/schools");
      return res.json();
    }});

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard", selectedSchoolId, filterValues],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSchoolId !== "all") params.append("schoolId", selectedSchoolId);
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      
      const url = `/api/admin/dashboard${params.toString() ? `?${params}` : ""}`;
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

  // Enhanced metrics with trends
  const enhancedMetrics = {
    healthCardCompletion: metrics.totalHealthCards > 0 ? Math.round((metrics.approvedHealthCards / metrics.totalHealthCards) * 100) : 0,
    healthCardRate: metrics.healthCardCoverage ?? 0,
    screeningRate: metrics.healthScreeningRate ?? 0,
    dataQuality: metrics.dataCompleteness ?? 0,
    activeUsersToday: systemActivity.reduce((sum: number, day: SystemActivityItem) => sum + day.logins, 0),
    totalActionsToday: systemActivity.reduce((sum: number, day: SystemActivityItem) => sum + day.actions, 0)};

  // Geographic distribution data
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

  // Filter configuration
  const filterOptions = [
    {
      id: 'timeRange',
      label: 'Time Range',
      type: 'select' as const,
      options: [
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 3 months' },
        { value: '1y', label: 'Last year' }]
    },
    {
      id: 'userRole',
      label: 'User Role',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Roles' },
        { value: 'Admin', label: 'Admin' },
        { value: 'PO', label: 'Program Officer' },
        { value: 'Headmaster', label: 'Headmaster' },
        { value: 'ClassTeacher', label: 'Class Teacher' },
        { value: 'MedicalTeam', label: 'Medical Team' }]
    },
    {
      id: 'schoolType',
      label: 'School Type',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Schools' },
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'higher_secondary', label: 'Higher Secondary' }]
    }
  ];

  // Drill-down handlers
  const handleMetricDrillDown = (metricType: string, value: number) => {
    drillDown({
      id: `metric-${metricType}`,
      title: `${metricType} Details`,
      data: { type: metricType, value, filters: filterValues }
    });
  };

  const handleChartDrillDown = (chartType: string, dataIndex: number, label: string) => {
    drillDown({
      id: `chart-${chartType}-${dataIndex}`,
      title: `${label} Analysis`,
      data: { type: chartType, index: dataIndex, label, filters: filterValues }
    });
  };



  return (
    <AppLayout title="Enhanced Admin Dashboard">
      <div className={cn(
        "space-y-6 transition-all duration-500",
        isAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Header with Breadcrumbs */}
        <div className="flex flex-col gap-4">
          <BreadcrumbNavigation />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                System Administration
              </h2>
              <p className="text-muted-foreground mt-1">
                Enterprise-grade health monitoring and analytics platform
              </p>
            </div>
            
            <div className="flex items-center gap-2">
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
              
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filterOptions}
          values={filterValues}
          onChange={setFilterValues}
          showApplyButton={false}
          defaultCollapsed={true}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <EnhancedMetricCard
                title="Total Schools"
                value={metrics.totalSchools}
                icon={School}
                variant="info"
                subtitle="Registered institutions"
                trend={{ value: 12, isPositive: true, period: "vs last month" }}
                onClick={() => handleMetricDrillDown("schools", metrics.totalSchools)}
                animationDelay={0}
                showSparkline={true}
                sparklineData={[45, 52, 48, 61, 58, 65, 72]}
              />
              
              <EnhancedMetricCard
                title="Total Students"
                value={metrics.totalStudents}
                icon={Users}
                variant="default"
                subtitle="Enrolled students"
                trend={{ value: 8, isPositive: true, period: "vs last month" }}
                onClick={() => handleMetricDrillDown("students", metrics.totalStudents)}
                animationDelay={100}
                showSparkline={true}
                sparklineData={[1200, 1350, 1280, 1420, 1380, 1450, 1520]}
              />
              
              <EnhancedMetricCard
                title="Active Users Today"
                value={enhancedMetrics.activeUsersToday}
                icon={Activity}
                variant="success"
                subtitle="User sessions"
                trend={{ value: 15, isPositive: true, period: "vs yesterday" }}
                onClick={() => handleMetricDrillDown("active-users", enhancedMetrics.activeUsersToday)}
                animationDelay={200}
                showSparkline={true}
                sparklineData={[85, 92, 78, 105, 98, 112, 125]}
              />
              
              <EnhancedMetricCard
                title="System Uptime"
                value={`${metrics.systemUptime}%`}
                icon={CheckCircle}
                variant="success"
                subtitle="Platform availability"
                trend={{ value: 0.2, isPositive: true, period: "vs last week" }}
                onClick={() => handleMetricDrillDown("uptime", metrics.systemUptime)}
                animationDelay={300}
              />
            </div>

            {/* Main Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EnhancedChartContainer 
                  title="User Distribution by Role" 
                  isLoading={isLoading}
                  chartType="pie"
                  animationDelay={400}
                  onDrillDown={() => handleChartDrillDown("user-roles", 0, "User Roles")}
                  
                  showInsights={true}
                  insights={[
                    "Class Teachers represent 45% of all users",
                    "Admin users have increased by 12% this month",
                    "Medical team adoption is growing steadily"
                  ]}
                >
                  <InteractivePieChart
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
                    enableDrillDown={true}
                    onSegmentClick={(index, value, label) => 
                      handleChartDrillDown("user-role", index, label)
                    }
                    centerText={usersByRole.reduce((sum: number, r: any) => sum + r.count, 0).toString()}
                    centerSubtext="Total Users"
                  />
                </EnhancedChartContainer>
              </div>

              <EnhancedChartContainer 
                title="System Activity Trends" 
                isLoading={isLoading}
                chartType="line"
                animationDelay={500}
                subtitle="Daily user engagement metrics"
                trend={{ value: 18, isPositive: true, period: "vs last week" }}
              >
                <InteractiveLineChart
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
                  onPointClick={(dataIndex, datasetIndex, value, label) =>
                    handleChartDrillDown("activity", dataIndex, label)
                  }
                  showTrendline={true}
                  enableCrosshair={true}
                />
              </EnhancedChartContainer>
            </div>

            {/* Geographic Performance Overview */}
            <EnhancedChartContainer 
              title="District Performance Overview" 
              isLoading={isLoading}
              chartType="bar"
              animationDelay={600}
              subtitle="Health service coverage across districts"
              
            >
              <InteractiveBarChart
                labels={geographicData.map((d: any) => d.region)}
                datasets={[
                  {
                    label: "Coverage %",
                    data: geographicData.map((d: any) => d.coverage),
                    backgroundColor: geographicData.map((d: any) => 
                      d.coverage > 80 ? "hsl(142, 76%, 36%)" :
                      d.coverage > 60 ? "hsl(45, 93%, 47%)" :
                      "hsl(0, 84%, 60%)"
                    ),
                    borderColor: "hsl(var(--border))"}
                ]}
                onBarClick={(dataIndex, datasetIndex, value, label) =>
                  handleChartDrillDown("district", dataIndex, label)
                }
                enableDrillDown={true}
                showDataLabels={true}
                horizontal={true}
              />
            </EnhancedChartContainer>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Advanced Analytics Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedChartContainer 
                title="Health Card Completion Trends"
                isLoading={isLoading}
                chartType="line"
                showInsights={true}
                insights={[
                  "Completion rate improved by 23% this quarter",
                  "Peak completion occurs during school health camps",
                  "Digital submissions increased by 67%"
                ]}
              >
                <InteractiveLineChart
                  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                  datasets={[
                    {
                      label: "Completion Rate %",
                      data: [65, 72, 68, 78, 85, 92],
                      borderColor: "hsl(142, 76%, 36%)",
                      backgroundColor: "hsla(142, 76%, 36%, 0.1)",
                      fill: true}
                  ]}
                  showTrendline={true}
                />
              </EnhancedChartContainer>

              <EnhancedChartContainer 
                title="User Engagement Metrics"
                isLoading={isLoading}
                chartType="bar"
              >
                <InteractiveBarChart
                  labels={["Daily Active", "Weekly Active", "Monthly Active"]}
                  datasets={[
                    {
                      label: "Users",
                      data: [1250, 3400, 8900],
                      backgroundColor: [
                        "hsl(142, 76%, 36%)",
                        "hsl(210, 70%, 50%)",
                        "hsl(280, 65%, 60%)"
                      ]}
                  ]}
                  enableDrillDown={true}
                />
              </EnhancedChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Management Content */}
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
              searchable
              searchPlaceholder="Search users..."
              emptyMessage="No users found"
            />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            {/* System Health Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EnhancedMetricCard
                title="Database Performance"
                value="98.5%"
                icon={Database}
                variant="success"
                subtitle="Query response time"
                trend={{ value: 2.1, isPositive: true }}
              />
              
              <EnhancedMetricCard
                title="API Response Time"
                value="145ms"
                icon={Activity}
                variant="info"
                subtitle="Average latency"
                trend={{ value: -8.3, isPositive: true }}
              />
              
              <EnhancedMetricCard
                title="Error Rate"
                value="0.02%"
                icon={AlertTriangle}
                variant="success"
                subtitle="System errors"
                trend={{ value: -15.2, isPositive: true }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function EnhancedAdminDashboard() {
  return (
    <DrillDownProvider initialLevel={{
      id: 'admin-overview',
      title: 'Admin Dashboard',
      data: {}
    }}>
      <EnhancedAdminDashboardContent />
    </DrillDownProvider>
  );
}
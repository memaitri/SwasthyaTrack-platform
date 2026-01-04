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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Home,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function HostelWardenDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/warden/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/warden/dashboard");
      return res.json();
    },
  });

  const metrics = dashboardData?.metrics || {
    totalHostelStudents: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    pendingReturns: 0,
    lateCheckIns: 0,
  };

  const recentActivity = dashboardData?.recentActivity || [];
  const studentsOnLeave = dashboardData?.studentsOnLeave || [];
  const attendanceByClass = dashboardData?.attendanceByClass || {};

  return (
    <AppLayout title="Hostel Warden Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Hostel Overview</h2>
            <p className="text-muted-foreground">Manage hostel students</p>
          </div>
          <div className="flex gap-2">
            {/* Attendance, Check-in/out and Vacation links hidden for Hostel Warden view */}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Total Hostel Students"
            value={metrics.totalHostelStudents}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Present Today"
            value={metrics.presentToday}
            icon={UserCheck}
            variant="success"
          />
          <MetricCard
            title="Absent Today"
            value={metrics.absentToday}
            icon={UserX}
            variant="danger"
          />
          <MetricCard
            title="On Leave"
            value={metrics.onLeave}
            subtitle="Approved vacation"
            icon={Calendar}
            variant="info"
          />
          <MetricCard
            title="Pending Returns"
            value={metrics.pendingReturns}
            subtitle="Due back today"
            icon={Clock}
            variant="warning"
          />
          <MetricCard
            title="Late Check-ins"
            value={metrics.lateCheckIns}
            subtitle="Today"
            icon={AlertTriangle}
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-lg font-semibold">Students on Leave/Vacation</CardTitle>
              {/* Vacation listing hidden for Hostel Warden view */}
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
              ) : studentsOnLeave.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No students currently on leave</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentsOnLeave.slice(0, 5).map((student: any) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {student.fullName?.slice(0, 2).toUpperCase() || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{student.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Class {student.classSection} • Room {student.roomNumber || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{student.reason || "Vacation"}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Returns: {student.returnDate || "TBD"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ChartContainer title="Today's Attendance" isLoading={isLoading}>
            <PieChart
              labels={["Present", "Absent", "On Leave"]}
              data={[
                metrics.presentToday || 0,
                metrics.absentToday || 0,
                metrics.onLeave || 0,
              ]}
              backgroundColor={[
                "hsla(142, 76%, 36%, 0.8)",
                "hsla(0, 84%, 42%, 0.8)",
                "hsla(43, 74%, 49%, 0.8)",
              ]}
              doughnut
            />
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Attendance by Class" isLoading={isLoading}>
            <BarChart
              labels={Object.keys(attendanceByClass).map((cls) => `Class ${cls}`)}
              datasets={[
                {
                  label: "Present",
                  data: Object.values(attendanceByClass).map((c: any) => c.present || 0),
                  backgroundColor: "hsl(142, 76%, 36%)",
                },
                {
                  label: "Absent",
                  data: Object.values(attendanceByClass).map((c: any) => c.absent || 0),
                  backgroundColor: "hsl(0, 84%, 42%)",
                },
              ]}
            />
          </ChartContainer>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-40 bg-muted rounded" />
                        <div className="h-2 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 6).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        activity.type === "check_in" 
                          ? "bg-emerald-100 text-emerald-600" 
                          : activity.type === "check_out"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {activity.type === "check_in" ? (
                          <LogIn className="h-4 w-4" />
                        ) : activity.type === "check_out" ? (
                          <LogOut className="h-4 w-4" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.studentName}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg font-semibold">Quick Student Search</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/hostel/students">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Users className="h-6 w-6" />
                  <span>All Students</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

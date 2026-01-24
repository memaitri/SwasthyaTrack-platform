import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedFetch } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharedReports } from "@/components/reports/SharedReports";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  Share2,
} from "lucide-react";
import { Link } from "wouter";


export default function LadySuperintendentDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Unified report generation handler
  const handleUnifiedReport = async (reportType: string, format: string = "excel") => {
    try {
      const params = new URLSearchParams();
      params.append("type", reportType);
      params.append("format", format);

      const response = await apiRequest("GET", `/api/reports/unified?${params}`);
      
      if (format === 'json') {
        const data = await response.json();
        console.log('Report data:', data);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report.${format === "excel" ? "xlsx" : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Unified report generation failed:", error);
    }
  };

  // Fetch female students
  const authedFetch = useAuthenticatedFetch();
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await authedFetch('/api/students?gender=F');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch students' }));
        throw new Error(err.message || 'Failed to fetch students');
      }
      return res.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const isLoading = studentsLoading;

  // Calculate metrics from the fetched data
  const femaleStudents = studentsData?.students || [];

  const metrics = {
    totalFemaleStudents: femaleStudents.length,
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lady Superintendent Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor female student welfare and menstrual health
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="shared">Shared Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Female Students"
                value={metrics.totalFemaleStudents}
                icon={Users}
                trend={{ value: 5, isPositive: true }}
              />
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* Student Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Management & Reports</CardTitle>
                <div className="flex gap-2">
                  <Link href="/period-tracker">
                    <Button size="sm" variant="outline">View All Students</Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleUnifiedReport("menstrual-health", "excel")}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {femaleStudents.slice(0, 50).map((stu: any) => (
                    <div key={stu.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{stu.fullName?.charAt(0) || "S"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{stu.fullName}</div>
                          <div className="text-sm text-muted-foreground">Class {stu.classSection}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/period-tracker?studentId=${stu.id}`}>
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
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
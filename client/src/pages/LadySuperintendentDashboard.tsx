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
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Home,
  Plus,
  TrendingUp,
  Heart,
  Shield,
} from "lucide-react";
import { Link } from "wouter";

export default function LadySuperintendentDashboard() {
  const [selectedSchool, setSelectedSchool] = useState("all");

  // Fetch female students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: [
      "students",
      selectedSchool === "all" ? {} : { schoolId: selectedSchool }
    ],
    queryFn: () => fetch(`/api/students${selectedSchool === "all" ? "" : `?schoolId=${selectedSchool}`}`).then(res => res.json()),
  });

  // Fetch health cards
  const { data: healthCardsData, isLoading: healthCardsLoading } = useQuery({
    queryKey: [
      "annual-cards",
      selectedSchool === "all" ? {} : { schoolId: selectedSchool }
    ],
    queryFn: () => fetch(`/api/annual-cards${selectedSchool === "all" ? "" : `?schoolId=${selectedSchool}`}`).then(res => res.json()),
  });

  // Fetch schools
  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: () => fetch("/api/schools").then(res => res.json()),
  });

  const isLoading = studentsLoading || healthCardsLoading || schoolsLoading;

  // Calculate metrics from the fetched data
  const femaleStudents = studentsData?.students || [];
  const healthCards = healthCardsData?.annualCards || [];
  const schools = schoolsData?.schools || [];

  const metrics = {
    totalFemaleStudents: femaleStudents.length,
    adolescentHealthRecords: healthCards.length,
    menstrualHealthTracked: healthCards.filter((card: any) => card.menstrual_last_period_date).length,
    referredCases: healthCards.filter((card: any) => card.status === "referred").length,
  };

  const menstrualStats = {
    regularCycles: healthCards.filter((card: any) => card.menstrual_cycle_regular).length,
    irregularCycles: healthCards.filter((card: any) => !card.menstrual_cycle_regular).length,
    painReported: healthCards.filter((card: any) => card.menstrual_symptoms?.cramps || card.menstrual_symptoms?.back_pain).length,
    hygieneConcerns: healthCards.filter((card: any) => card.menstrual_hygiene_practices?.privacy_concerns || !card.menstrual_hygiene_practices?.adequate_facilities).length,
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
              Monitor female student health and adolescent care
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools?.map((school: any) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Female Students"
            value={metrics.totalFemaleStudents}
            icon={Users}
            trend={{ value: 5, isPositive: true }}
          />
          <MetricCard
            title="Adolescent Health Records"
            value={metrics.adolescentHealthRecords}
            icon={Heart}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Menstrual Health Tracked"
            value={metrics.menstrualHealthTracked}
            icon={Shield}
            trend={{ value: 8, isPositive: true }}
          />
          <MetricCard
            title="Referred Cases"
            value={metrics.referredCases}
            icon={AlertCircle}
            trend={{ value: -2, isPositive: false }}
          />
        </div>

        {/* Menstrual Health Statistics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Menstrual Cycle Regularity</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer title="Menstrual Cycle Regularity">
                <PieChart
                  labels={["Regular Cycles", "Irregular Cycles"]}
                  data={[menstrualStats.regularCycles, menstrualStats.irregularCycles]}
                  backgroundColor={["#10b981", "#f59e0b"]}
                />
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Concerns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pain Reported</span>
                  <span className="text-sm text-muted-foreground">{menstrualStats.painReported}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Hygiene Concerns</span>
                  <span className="text-sm text-muted-foreground">{menstrualStats.hygieneConcerns}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Adolescent Checkups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Adolescent Health Checkups</CardTitle>
            <Button asChild>
              <Link href="/health-cards">
                <Plus className="h-4 w-4 mr-2" />
                View All Records
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "student",
                  header: "Student",
                  render: (row: any) => (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {row.nameOfChild?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{row.nameOfChild}</div>
                        <div className="text-sm text-muted-foreground">
                          Class {row.classSection}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "school",
                  header: "School",
                  render: (row: any) => row.schoolName,
                },
                {
                  key: "menstrualStatus",
                  header: "Menstrual Health",
                  render: (row: any) => (
                    <StatusBadge
                      status={row.menstrual_cycle_regular ? "Approved" : "Pending"}
                      text={row.menstrual_cycle_regular ? "Regular" : "Irregular"}
                    />
                  ),
                },
                {
                  key: "lastCheckup",
                  header: "Last Checkup",
                  render: (row: any) => new Date(row.date_of_visit).toLocaleDateString(),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row: any) => (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/health-cards/${row.id}`}>View Details</Link>
                    </Button>
                  ),
                },
              ]}
              data={healthCards.slice(0, 10)} // Show recent 10 records
              getRowKey={(item) => item.id}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
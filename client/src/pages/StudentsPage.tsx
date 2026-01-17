import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { formatGenderDisplay, formatGenderWithIcon, getGenderBadgeVariant } from "@/lib/genderUtils";
import { UserPlus, Filter, Eye, FileHeart, Stethoscope, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/csvExport";
import { exportToPDF, exportToExcel } from "@/lib/exportService";
import type { Student } from "@shared/schema";

export default function StudentsPage() {
  const { user, hasRole } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect Admin users away from this page — Admins are not allowed to access the Students UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [exportFormat, setExportFormat] = useState("csv");

  // Class Teachers should not use classFilter - backend already filters by their assigned class
  const { data, isLoading } = useQuery({
    queryKey: ["/api/students", search, classFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      if (search) params.append("search", search);
      // Only apply class filter if user is not a Class Teacher
      if (!hasRole("ClassTeacher") && classFilter !== "all") {
        params.append("classSection", classFilter);
      }
      
      const res = await apiRequest("GET", `/api/students?${params.toString()}`);
      return res.json();
    },
  });

  const students = data?.students || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  const canAddStudent = hasRole("ClassTeacher", "Admin");

  // Mutation for marking menstruation
  const markMenstruationMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const res = await apiRequest("POST", `/api/students/${studentId}/mark-menstruation`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Menstruation marked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark menstruation",
        variant: "destructive",
      });
    },
  });

  return (
    <AppLayout title="Students">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Registry</h2>
            <p className="text-muted-foreground">
              {hasRole("ClassTeacher") ? "Manage your class students" : "View all registered students"}
            </p>
          </div>
          {canAddStudent && (
            <Link href="/students/new">
              <Button data-testid="button-add-student">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-students"
            />
          </div>
          {/* Hide class filter for Class Teachers - they only see their assigned class */}
          {!hasRole("ClassTeacher") && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40" data-testid="filter-class">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="1-A">Class 1-A</SelectItem>
                <SelectItem value="1-B">Class 1-B</SelectItem>
                <SelectItem value="2-A">Class 2-A</SelectItem>
                <SelectItem value="2-B">Class 2-B</SelectItem>
                <SelectItem value="3-A">Class 3-A</SelectItem>
                <SelectItem value="3-B">Class 3-B</SelectItem>
                <SelectItem value="4-A">Class 4-A</SelectItem>
                <SelectItem value="4-B">Class 4-B</SelectItem>
                <SelectItem value="5-A">Class 5-A</SelectItem>
                <SelectItem value="5-B">Class 5-B</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF (with charts)</SelectItem>
              <SelectItem value="excel">Excel (with charts)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={[
            {
              key: "fullName",
              header: "Student",
              render: (item: any) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {item.fullName?.slice(0, 2).toUpperCase() || "ST"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.fullName}</p>
                    <p className="text-xs text-muted-foreground">{item.uniqueId}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "gender",
              header: "Gender",
              className: "text-center",
              render: (item: any) => {
                const genderInfo = formatGenderWithIcon(item.gender);
                return (
                  <Badge 
                    variant={getGenderBadgeVariant(item.gender)} 
                    className="no-default-hover-elevate no-default-active-elevate"
                  >
                    <span className="mr-1">{genderInfo.icon}</span>
                    {genderInfo.label}
                  </Badge>
                );
              },
            },
            { key: "classSection", header: "Class" },
            { key: "fatherGuardianName", header: "Guardian" },
            {
              key: "healthCardStatus",
              header: "Health Card",
              render: (item: any) => (
                <StatusBadge status={item.healthCardStatus || "Pending"} size="sm" />
              ),
            },
            {
              key: "isActive",
              header: "Status",
              render: (item: any) => (
                <StatusBadge status={item.isActive ? "Active" : "Inactive"} size="sm" />
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: any) => (
                <div className="flex items-center gap-1">
                  <Link href={`/students/${item.id}`}>
                    <Button variant="ghost" size="icon" data-testid={`button-view-${item.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/health-cards/view/${item.id}`}>
                    <Button variant="ghost" size="icon" data-testid={`button-health-${item.id}`}>
                      <FileHeart className="h-4 w-4" />
                    </Button>
                  </Link>
                  {hasRole("ClassTeacher", "MedicalTeam") && (
                    <Link href={`/checkups/new?studentId=${item.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-checkup-${item.id}`}>
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {/* Mark Menstruation Button - Only for Class Teachers, Female Students >= 10 years old */}
                  {hasRole("ClassTeacher") && item.gender === "F" && !item.menstruationStartedAt && (() => {
                    const age = item.dateOfBirth ? Math.floor((Date.now() - new Date(item.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
                    return age >= 10;
                  })() && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markMenstruationMutation.mutate(item.id)}
                      disabled={markMenstruationMutation.isPending}
                      title="Mark first menstrual cycle"
                      data-testid={`button-mark-menstruation-${item.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Cycle
                    </Button>
                  )}
                  {/* Show marked status */}
                  {item.menstruationStartedAt && (
                    <Badge variant="secondary" className="text-xs">
                      Cycle Marked
                    </Badge>
                  )}
                </div>
              ),
            },
          ]}
          data={students}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          exportable
          onExport={async (type) => {
            const fmt = type || exportFormat;
            if (fmt === "csv") {
              const studentsWithFormattedGender = students.map((student: any) => ({
                ...student,
                gender: formatGenderDisplay(student.gender)
              }));
              exportToCSV(
                studentsWithFormattedGender,
                [
                  { key: "fullName", header: "Full Name" },
                  { key: "uniqueId", header: "Unique ID" },
                  { key: "classSection", header: "Class" },
                  { key: "gender", header: "Gender" },
                  { key: "dateOfBirth", header: "Date of Birth" },
                ],
                "students"
              );
            } else if (fmt === "pdf") {
              exportToPDF(students as any, { includeNutrition: false, includeMedical: false }, user?.fullName || user?.email || '');
            } else if (fmt === "xlsx") {
              exportToExcel(students as any, { includeNutrition: false, includeMedical: false }, user?.fullName || user?.email || '');
            }
          }}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: setPage,
          }}
          emptyMessage="No students found"
        />
      </div>
    </AppLayout>
  );
}

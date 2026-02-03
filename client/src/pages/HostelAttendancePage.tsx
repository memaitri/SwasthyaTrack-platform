import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateMonthOptions } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/dashboard/DataTable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogIn, LogOut, Calendar, Clock, Users, Umbrella, CheckCircle2, TrendingUp, Building2, X, Upload, Image as ImageIcon, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function HostelAttendancePage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect Admin users away from Hostel Attendance UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [isVacationOpen, setIsVacationOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [checkInStudent, setCheckInStudent] = useState<any>(null);
  const [checkInReason, setCheckInReason] = useState("");
  const [checkOutReason, setCheckOutReason] = useState("");
  const [checkOutStudent, setCheckOutStudent] = useState<any>(null);
  const [checkOutAttendanceId, setCheckOutAttendanceId] = useState<string | null>(null);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  // Fetch schools for PO dashboard
  const { data: schoolsData } = useQuery({
    queryKey: ["/api/schools", user?.id],
    enabled: hasRole("PO"),
  }) as { data?: any };

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["/api/hostel/attendance", selectedDate, selectedSchool],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("date", selectedDate);
      if (selectedSchool && selectedSchool !== "all") params.append("schoolId", selectedSchool);
      const res = await apiRequest("GET", `/api/hostel/attendance?${params}`);
      return res.json();
    },
  }) as { data?: any; isLoading: boolean };

  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["/api/hostel/monthly-report", month, year, selectedSchool],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", month.toString());
      params.append("year", year.toString());
      if (selectedSchool && selectedSchool !== "all") params.append("schoolId", selectedSchool);
      const res = await apiRequest("GET", `/api/hostel/monthly-report?${params}`);
      return res.json();
    },
    enabled: viewMode === "monthly",
  }) as { data?: any; isLoading: boolean };

  const students = attendanceData?.students || [];
  const summary = attendanceData?.summary || { present: 0, checkedOut: 0, vacation: 0, total: 0 };

  const [checkInImage, setCheckInImage] = useState<File | null>(null);
  const [checkInImagePreview, setCheckInImagePreview] = useState<string | null>(null);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/upload/checkin-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      return data.imageUrl;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (studentId: string) => {
      let imageUrl = null;
      if (checkInImage) {
        imageUrl = await uploadImageMutation.mutateAsync(checkInImage);
      }
      return apiRequest("POST", "/api/hostel/checkin", { 
        studentId, 
        date: selectedDate,
        checkInTime: new Date().toISOString(),
        checkInImageUrl: imageUrl,
        checkInReason: checkInReason || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Check-in recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/hostel/attendance"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setIsCheckInOpen(false);
      setCheckInStudent(null);
      setCheckInImage(null);
      setCheckInImagePreview(null);
      setCheckInReason("");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to check in";
      toast({
        title: "Check-in failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: { studentId: string; attendanceId?: string; checkOutReason?: string }) => {
      return apiRequest("POST", "/api/hostel/checkout", { 
        studentId: data.studentId, 
        date: selectedDate,
        checkOutTime: new Date().toISOString(),
        attendanceId: data.attendanceId,
        checkOutReason: data.checkOutReason || checkOutReason || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Check-out recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/hostel/attendance"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setIsCheckOutOpen(false);
      setCheckOutStudent(null);
      setCheckOutAttendanceId(null);
      setCheckOutReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Check-out failed",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
    },
  });

  const vacationMutation = useMutation({
    mutationFn: async () => {
      const studentId = selectedStudent?.id || selectedStudent?.studentId;
      if (!studentId) {
        throw new Error("Student ID not found");
      }
      if (!vacationStart || !vacationEnd) {
        throw new Error("Please select both start and end dates");
      }
      return apiRequest("POST", "/api/hostel/vacation", {
        studentId,
        vacationStartDate: vacationStart,
        vacationEndDate: vacationEnd,
        vacationReason: vacationReason || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Vacation marked" });
      queryClient.invalidateQueries({ queryKey: ["/api/hostel/attendance"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setIsVacationOpen(false);
      setSelectedStudent(null);
      setVacationStart("");
      setVacationEnd("");
      setVacationReason("");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to mark vacation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const schools = schoolsData?.schools || [];
  const role = user?.role;

  return (
    <AppLayout title="Hostel Attendance & Tracking">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === "PO" ? "District Hostel Overview" : 
               role === "Headmaster" ? "School Hostel Attendance" : 
               role === "Lady Superintendent" ? "Female Students Hostel Attendance" :
               role === "MealSuperintendent" ? "Male Students Hostel Attendance" :
               "Hostel Attendance & Tracking"}
            </h2>
            <p className="text-muted-foreground">
              {role === "Lady Superintendent" ? "Track check-in/out times and vacations for female students" :
               role === "MealSuperintendent" ? "Track check-in/out times and vacations for male students" :
               "Track check-in/out times, vacations, and monthly presence"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  params.append("type", "hostel");
                  params.append("date", selectedDate);
                  if (selectedSchool && selectedSchool !== "all") params.append("schoolId", selectedSchool);
                  
                  const res = await apiRequest("GET", `/api/images/download?${params}`);
                  const data = await res.json();
                  
                  if (data.images && data.images.length > 0) {
                    // Download all images as ZIP
                    for (const imageUrl of data.images) {
                      const link = document.createElement("a");
                      link.href = imageUrl;
                      link.download = imageUrl.split("/").pop() || "image.jpg";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                    toast({
                      title: "Images downloaded",
                      description: `Downloaded ${data.count} image(s)`,
                    });
                  } else {
                    toast({
                      title: "No images",
                      description: "No images found for the selected date",
                      variant: "destructive",
                    });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to download images",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Images
            </Button>
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-40" data-testid="select-view-mode">
                <SelectValue placeholder="View mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily View</SelectItem>
                <SelectItem value="monthly">Monthly Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* PO School Selector */}
        {hasRole("PO") && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-40" data-testid="select-school">
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools (Aggregated)</SelectItem>
                {schools.map((school: any) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {viewMode === "daily" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40" data-testid="button-date-picker">
                  <Calendar className="h-4 w-4 mr-2" />
                  {selectedDate ? format(new Date(selectedDate), "MMM dd, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-3 border rounded"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {viewMode === "monthly" && (
          <div className="flex items-center gap-2">
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-32" data-testid="select-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-32" data-testid="select-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {viewMode === "daily" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{summary.present}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <LogOut className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{summary.checkedOut}</p>
                      <p className="text-sm text-muted-foreground">Checked Out</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Umbrella className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{summary.vacation}</p>
                      <p className="text-sm text-muted-foreground">On Vacation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Student Daily Attendance"
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
                        <p className="text-xs text-muted-foreground">Class {item.classSection}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (item: any) => {
                    if (item.isVacation) {
                      return <Badge variant="outline" className="bg-amber-100 text-amber-700 no-default-hover-elevate no-default-active-elevate">On Vacation</Badge>;
                    }
                    const allAttendance = item.allAttendance || [];
                    const hasCheckOut = allAttendance.some((a: any) => a.checkOutTime);
                    const hasCheckIn = allAttendance.some((a: any) => a.checkInTime);
                    if (hasCheckOut) {
                      return <Badge variant="outline" className="bg-blue-100 text-blue-700 no-default-hover-elevate no-default-active-elevate">Checked Out</Badge>;
                    }
                    if (hasCheckIn) {
                      return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 no-default-hover-elevate no-default-active-elevate">Present</Badge>;
                    }
                    return <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate no-default-active-elevate">Not Marked</Badge>;
                  },
                },
                {
                  key: "vacationDuration",
                  header: "Vacation Duration",
                  render: (item: any) => {
                    // Check if student is on vacation for the selected date
                    const selectedDateObj = new Date(selectedDate);
                    const vacationRecords = item.allAttendance?.filter((a: any) => a.isVacation && a.vacationStartDate && a.vacationEndDate) || [];
                    
                    // Find if selected date falls within any vacation period
                    const activeVacation = vacationRecords.find((vac: any) => {
                      const startDate = new Date(vac.vacationStartDate);
                      const endDate = new Date(vac.vacationEndDate);
                      return selectedDateObj >= startDate && selectedDateObj <= endDate;
                    });
                    
                    if (activeVacation) {
                      const start = new Date(activeVacation.vacationStartDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      const end = new Date(activeVacation.vacationEndDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      const days = Math.ceil((new Date(activeVacation.vacationEndDate).getTime() - new Date(activeVacation.vacationStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <div data-testid={`text-vacation-duration-${item.id}`}>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 no-default-hover-elevate no-default-active-elevate">
                            On Vacation
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{start} to {end} ({days} days)</p>
                        </div>
                      );
                    }
                    
                    // Also check if item itself is vacation (for backward compatibility)
                    if (item.isVacation && item.vacationStartDate && item.vacationEndDate) {
                      const start = new Date(item.vacationStartDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      const end = new Date(item.vacationEndDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      const days = Math.ceil((new Date(item.vacationEndDate).getTime() - new Date(item.vacationStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <div data-testid={`text-vacation-duration-${item.id}`}>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 no-default-hover-elevate no-default-active-elevate">
                            On Vacation
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{start} to {end} ({days} days)</p>
                        </div>
                      );
                    }
                    
                    return <span className="text-sm text-muted-foreground" data-testid={`text-notmarked-${item.id}`}>-</span>;
                  },
                },
                {
                  key: "checkInTime",
                  header: "Check In",
                  render: (item: any) => {
                    const allCheckIns = item.allAttendance?.filter((a: any) => a.checkInTime) || [];
                    if (allCheckIns.length === 0) {
                      return <span className="text-sm text-muted-foreground" data-testid={`text-notmarked-${item.id}`}>-</span>;
                    }
                    return (
                      <div className="flex flex-col gap-1">
                        {allCheckIns.map((att: any, idx: number) => (
                          <div key={att.id || idx} className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm" data-testid={`text-checkin-${item.id}-${idx}`}>
                              {new Date(att.checkInTime).toLocaleTimeString("en-IN", { 
                                hour: "2-digit", 
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                            {att.checkInImageUrl && (
                              <a
                                href={att.checkInImageUrl.startsWith('http') ? att.checkInImageUrl : att.checkInImageUrl.startsWith('/') ? att.checkInImageUrl : `/${att.checkInImageUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center"
                                title="View check-in image"
                              >
                                <ImageIcon className="h-3 w-3 text-blue-500 hover:text-blue-700 cursor-pointer" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  },
                },
                {
                  key: "checkOutTime",
                  header: "Check Out",
                  render: (item: any) => {
                    const allCheckOuts = item.allAttendance?.filter((a: any) => a.checkOutTime) || [];
                    if (allCheckOuts.length === 0) {
                      return <span className="text-sm text-muted-foreground" data-testid={`text-notcheckedout-${item.id}`}>-</span>;
                    }
                    return (
                      <div className="flex flex-col gap-1">
                        {allCheckOuts.map((att: any, idx: number) => (
                          <div key={att.id || idx} className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm" data-testid={`text-checkout-${item.id}-${idx}`}>
                              {new Date(att.checkOutTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  },
                },
                {
                  key: "actions",
                  header: "",
                  render: (item: any) => (
                    <div className="flex items-center gap-2">
                      {(hasRole("ClassTeacher") || hasRole("Headmaster") || hasRole("Admin") || hasRole("HostelWarden") || hasRole("Lady Superintendent") || hasRole("MealSuperintendent")) && !item.isVacation && (
                        <>
                          {/* Allow multiple check-ins - always show check-in button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // IMPORTANT: item.id is the attendance record ID, not student ID!
                              // The student ID is in item.studentId or in the attendance records
                              const studentId = item.studentId || item.allAttendance?.[0]?.studentId;
                              if (!studentId) {
                                toast({
                                  title: "Error",
                                  description: "Student ID not found. Please refresh and try again.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const studentObj = {
                                id: studentId, // This is the actual student ID
                                studentId: studentId,
                                fullName: item.fullName,
                                classSection: item.classSection,
                              };
                              setCheckInStudent(studentObj);
                              setIsCheckInOpen(true);
                            }}
                            data-testid={`button-checkin-${item.id}`}
                          >
                            <LogIn className="h-4 w-4 mr-1" />
                            Check In
                          </Button>
                          {/* Show check-out for records that have check-in but no checkout */}
                          {item.allAttendance?.some((a: any) => a.checkInTime && !a.checkOutTime) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Find the most recent check-in without checkout
                                const latestCheckIn = item.allAttendance
                                  ?.filter((a: any) => a.checkInTime && !a.checkOutTime)
                                  .sort((a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0];
                                if (latestCheckIn) {
                                  // IMPORTANT: item.id is the attendance record ID, not student ID!
                                  // The student ID is in item.studentId or latestCheckIn.studentId
                                  const studentId = item.studentId || latestCheckIn.studentId;
                                  if (!studentId) {
                                    toast({
                                      title: "Error",
                                      description: "Student ID not found. Please refresh and try again.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  // Ensure we have the correct student object
                                  const studentObj = {
                                    id: studentId, // This is the actual student ID
                                    studentId: studentId,
                                    fullName: item.fullName,
                                    classSection: item.classSection,
                                  };
                                  setCheckOutStudent(studentObj);
                                  setCheckOutAttendanceId(latestCheckIn.id);
                                  setIsCheckOutOpen(true);
                                }
                              }}
                              disabled={checkOutMutation.isPending}
                              data-testid={`button-checkout-${item.id}`}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Check Out
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // IMPORTANT: item.id is the attendance record ID, not student ID!
                              // The student ID is in item.studentId or in the attendance records
                              const studentId = item.studentId || item.allAttendance?.[0]?.studentId;
                              if (!studentId) {
                                toast({
                                  title: "Error",
                                  description: "Student ID not found. Please refresh and try again.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              const studentObj = {
                                id: studentId, // This is the actual student ID
                                studentId: studentId,
                                fullName: item.fullName,
                                classSection: item.classSection,
                              };
                              setSelectedStudent(studentObj);
                              setIsVacationOpen(true);
                            }}
                            data-testid={`button-vacation-${item.id}`}
                          >
                            <Umbrella className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              data={students}
              getRowKey={(item: any) => item.id}
              isLoading={isLoading}
              searchable
              searchPlaceholder="Search students..."
              emptyMessage="No attendance records for this date"
            />
          </>
        ) : (
          <>
            {monthlyData?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{monthlyData.summary.presentDays}</p>
                        <p className="text-sm text-muted-foreground">Presence Days (Avg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{monthlyData.summary.stayDays}</p>
                        <p className="text-sm text-muted-foreground">Days in Hostel (Avg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Umbrella className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{monthlyData.summary.vacationDays}</p>
                        <p className="text-sm text-muted-foreground">Vacation Days (Avg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{monthlyData.summary.totalStudents}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <DataTable
              title={`Monthly Attendance Summary - ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long" })} ${year}`}
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
                        <p className="text-xs text-muted-foreground">Class {item.classSection}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "presentDays",
                  header: "Present Days",
                  render: (item: any) => (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 no-default-hover-elevate no-default-active-elevate">
                      {item.presentDays || 0}
                    </Badge>
                  ),
                },
                {
                  key: "stayDays",
                  header: "Stayed in Hostel",
                  render: (item: any) => (
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 no-default-hover-elevate no-default-active-elevate">
                      {item.stayDays || 0}
                    </Badge>
                  ),
                },
                {
                  key: "vacationDays",
                  header: "Vacation Days",
                  render: (item: any) => (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 no-default-hover-elevate no-default-active-elevate">
                      {item.vacationDays || 0}
                    </Badge>
                  ),
                },
                {
                  key: "presencePercentage",
                  header: "Presence %",
                  render: (item: any) => {
                    const pct = item.presencePercentage || 0;
                    const color = pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600";
                    return <span className={`font-semibold ${color}`}>{pct}%</span>;
                  },
                },
              ]}
              data={monthlyData?.students || []}
              getRowKey={(item: any) => item.id}
              isLoading={isLoadingMonthly}
              searchable
              searchPlaceholder="Search students..."
              emptyMessage="No attendance data for this month"
            />
          </>
        )}
      </div>

      <Dialog open={isVacationOpen} onOpenChange={setIsVacationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Vacation</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedStudent.fullName?.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedStudent.fullName}</p>
                  <p className="text-sm text-muted-foreground">Class {selectedStudent.classSection}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1" data-testid="button-vacation-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        {vacationStart ? format(new Date(vacationStart), "MMM dd") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <input
                        type="date"
                        value={vacationStart}
                        onChange={(e) => setVacationStart(e.target.value)}
                        className="p-3 border rounded"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1" data-testid="button-vacation-end">
                        <Calendar className="h-4 w-4 mr-2" />
                        {vacationEnd ? format(new Date(vacationEnd), "MMM dd") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <input
                        type="date"
                        value={vacationEnd}
                        onChange={(e) => setVacationEnd(e.target.value)}
                        className="p-3 border rounded"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Enter reason for vacation"
                  value={vacationReason}
                  onChange={(e) => setVacationReason(e.target.value)}
                  className="mt-1"
                  data-testid="input-vacation-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVacationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => vacationMutation.mutate()}
              disabled={!vacationStart || !vacationEnd || vacationMutation.isPending}
              data-testid="button-confirm-vacation"
            >
              {vacationMutation.isPending ? "Saving..." : "Mark Vacation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Student</DialogTitle>
          </DialogHeader>
          {checkInStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {checkInStudent.fullName?.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{checkInStudent.fullName}</p>
                  <p className="text-sm text-muted-foreground">Class {checkInStudent.classSection}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Upload Student Image *</label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCheckInImage(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCheckInImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer"
                    data-testid="input-checkin-image"
                  />
                  {checkInImagePreview && (
                    <div className="relative">
                      <img
                        src={checkInImagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setCheckInImage(null);
                          setCheckInImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reason for Check-in</label>
                <Textarea
                  placeholder="Enter reason for check-in (optional)"
                  value={checkInReason}
                  onChange={(e) => setCheckInReason(e.target.value)}
                  rows={3}
                  data-testid="input-checkin-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCheckInOpen(false);
              setCheckInStudent(null);
              setCheckInImage(null);
              setCheckInImagePreview(null);
              setCheckInReason("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!checkInImage) {
                  toast({
                    title: "Image required",
                    description: "Please upload a student image for check-in",
                    variant: "destructive",
                  });
                  return;
                }
                // Get student ID - the checkInStudent object should have id set correctly
                const studentId = checkInStudent?.id;
                if (!studentId) {
                  toast({
                    title: "Error",
                    description: "Student ID not found. Please try again.",
                    variant: "destructive",
                  });
                  return;
                }
                checkInMutation.mutate(studentId);
              }}
              disabled={checkInMutation.isPending || uploadImageMutation.isPending || !checkInStudent || !checkInImage}
              data-testid="button-confirm-checkin"
            >
              {checkInMutation.isPending || uploadImageMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Check In
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Student</DialogTitle>
          </DialogHeader>
          {checkOutStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {checkOutStudent.fullName?.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{checkOutStudent.fullName}</p>
                  <p className="text-sm text-muted-foreground">Class {checkOutStudent.classSection}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reason for Check-out</label>
                <Textarea
                  placeholder="Enter reason for check-out (optional)"
                  value={checkOutReason}
                  onChange={(e) => setCheckOutReason(e.target.value)}
                  rows={3}
                  data-testid="input-checkout-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCheckOutOpen(false);
              setCheckOutStudent(null);
              setCheckOutAttendanceId(null);
              setCheckOutReason("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Get student ID - the checkOutStudent object should have id set correctly
                const studentId = checkOutStudent?.id || checkOutStudent?.studentId;
                if (!studentId) {
                  toast({
                    title: "Error",
                    description: "Student ID not found. Please try again.",
                    variant: "destructive",
                  });
                  return;
                }
                if (!checkOutAttendanceId) {
                  toast({
                    title: "Error",
                    description: "Attendance record not found. Please try again.",
                    variant: "destructive",
                  });
                  return;
                }
                checkOutMutation.mutate({ 
                  studentId, 
                  attendanceId: checkOutAttendanceId,
                  checkOutReason 
                });
              }}
              disabled={checkOutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkOutMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Check Out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

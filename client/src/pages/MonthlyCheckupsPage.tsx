import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getBMIColor, getBMIBgColor, getBMIClassificationLabel } from "@/lib/bmiColors";
import { REFERRAL_FACILITY_OPTIONS } from "@/lib/referralFacilities";
import { generateYearOptions, generateMonthOptions, getCurrentYear, getCurrentMonth, getMonthName } from "@/lib/dateUtils";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Link } from "wouter";
import {
  Stethoscope,
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  Calculator,
  Calendar,
  Users,
  FileText,
  Search,
  Filter,
  Thermometer,
  Heart,
  Ruler,
  Weight,
  Eye,
  AlertTriangle,
} from "lucide-react";

const checkupFormSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  checkupDate: z.string().min(1, "Date is required"),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  present: z.boolean().default(true),
  symptoms: z.string().optional(),
  suggestedMedicines: z.string().optional(),
  treatmentType: z.enum(["Primary", "Referred"]).default("Primary"),
  referredTo: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for event-driven checkups with referral dropdown and month/year fields
const eventCheckupFormSchema = z.object({
  status: z.enum(["Not started", "In progress", "Completed"]),
  present: z.boolean().default(true),
  checkupMonth: z.number().min(1).max(12),
  checkupYear: z.number().min(2020).max(2050),
  heightCm: z.number().min(30).max(250).optional(),
  weightKg: z.number().min(1).max(200).optional(),
  temperatureC: z.number().min(35).max(42).optional(),
  bpSystolic: z.number().min(60).max(250).optional(),
  bpDiastolic: z.number().min(40).max(150).optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  medicationsGiven: z.string().optional(),
  referredTo: z.string().optional(),
  referralStatus: z.enum(["Pending", "In Progress", "Completed", "Overdue", "Rejected"]).optional(),
  referralNotes: z.string().optional(),
  referralDate: z.coerce.date().optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

type CheckupFormData = z.infer<typeof checkupFormSchema>;
type EventCheckupForm = z.infer<typeof eventCheckupFormSchema>;

function CheckupList() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(String(getCurrentMonth()));
  const [yearFilter, setYearFilter] = useState(String(getCurrentYear()));

  const { data, isLoading } = useQuery({
    queryKey: ["/api/monthly-checkups", monthFilter, yearFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("month", monthFilter);
      params.append("year", yearFilter);
      const res = await apiRequest("GET", `/api/monthly-checkups?${params}`);
      return res.json();
    },
  });

  const checkups = data?.checkups || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  // Check if user is ClassTeacher - if so, make this view read-only
  const isClassTeacher = user?.role === "ClassTeacher";

  // Generate dynamic year options
  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Traditional Monthly Checkups</h2>
          <p className="text-muted-foreground">
            {isClassTeacher 
              ? "View-only: Individual checkups recorded by medical teams" 
              : "Individual checkups recorded by class teachers"
            }
          </p>
        </div>
        <Link href="/checkups/new">
          <Button data-testid="button-new-checkup">
            <Plus className="h-4 w-4 mr-2" />
            New Checkup
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36" data-testid="filter-month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-28" data-testid="filter-year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
                {year.isCurrent && <span className="ml-1 text-xs text-primary">(Current)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "studentName",
            header: "Student",
            render: (item: any) => (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {item.studentName?.slice(0, 2).toUpperCase() || "ST"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{item.studentName}</span>
              </div>
            ),
          },
          { key: "checkupDate", header: "Date" },
          {
            key: "bmi",
            header: "BMI",
            render: (item: any) => {
              const bmi = item.bmi ? parseFloat(item.bmi) : null;
              return (
                <div className={`inline-block px-3 py-1 rounded-md ${getBMIBgColor(bmi)}`}>
                  <span className={`font-semibold ${getBMIColor(bmi)}`}>
                    {bmi ? `${bmi.toFixed(1)}` : "-"}
                  </span>
                  {bmi && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({getBMIClassificationLabel(bmi)})
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "present",
            header: "Attendance",
            render: (item: any) => (
              <StatusBadge status={item.present ? "Present" : "Absent"} size="sm" />
            ),
          },
          {
            key: "treatmentType",
            header: "Treatment",
            render: (item: any) => <StatusBadge status={item.treatmentType} size="sm" />,
          },
          {
            key: "symptoms",
            header: "Symptoms",
            render: (item: any) => (
              <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                {item.symptoms?.length > 0 ? item.symptoms.slice(0, 2).join(", ") : "None"}
              </span>
            ),
          },
        ]}
        data={checkups}
        getRowKey={(item: any) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalPages,
          totalItems,
          onPageChange: setPage,
        }}
        emptyMessage="No checkups recorded for this period"
      />
    </div>
  );
}

// New component for event-driven checkups
function EventCheckups() {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedCheckup, setSelectedCheckup] = useState<any>(null);
  const [isCheckupDialogOpen, setIsCheckupDialogOpen] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const { toast } = useToast();

  // Add error boundary
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: any) => {
      console.error('EventCheckups error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const checkupForm = useForm<EventCheckupForm>({
    resolver: zodResolver(eventCheckupFormSchema),
    defaultValues: {
      status: "Not started",
      present: true,
      checkupMonth: getCurrentMonth(),
      checkupYear: getCurrentYear(),
      followUpRequired: false,
      referredTo: "none",
    },
  });

  // Team creation form
  const teamForm = useForm({
    defaultValues: {
      name: "",
      members: [{ role: "Doctor", fullName: "", designation: "", phone: "" }],
    },
  });

  // Event creation form
  const eventForm = useForm({
    defaultValues: {
      name: "",
      eventDate: new Date().toISOString().split("T")[0],
      location: "",
      teamId: "",
      notes: "",
      month: getCurrentMonth(),
      year: getCurrentYear(),
    },
  });

  // Fetch medical teams
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ["/api/medical-teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/medical-teams");
      return res.json();
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch medical events
  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["/api/medical-events"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/medical-events");
      return res.json();
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch student checkups for selected event with month/year filtering
  const { data: checkupsData, isLoading: checkupsLoading } = useQuery({
    queryKey: ["/api/medical-events", selectedEvent?.id, "checkups", selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedEvent) return { checkups: [], total: 0 };
      const params = new URLSearchParams();
      params.append("month", selectedMonth.toString());
      params.append("year", selectedYear.toString());
      const res = await apiRequest("GET", `/api/medical-events/${selectedEvent.id}/checkups?${params}`);
      return res.json();
    },
    enabled: !!selectedEvent,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: any) => {
      const res = await apiRequest("POST", "/api/medical-teams", teamData);
      return res.json();
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-teams"] });
      setIsCreateTeamDialogOpen(false);
      teamForm.reset();
      toast({ title: "Success", description: "Medical team created successfully" });
      
      // Add members to the team
      const members = teamForm.getValues("members");
      members.forEach(async (member: any) => {
        if (member.fullName && member.designation && member.phone) {
          await apiRequest("POST", `/api/medical-teams/${team.id}/members`, member);
        }
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const res = await apiRequest("POST", "/api/medical-events", {
        ...eventData,
        month: selectedMonth,
        year: selectedYear,
      });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-events"] });
      setIsCreateEventDialogOpen(false);
      eventForm.reset();
      toast({ 
        title: "Success", 
        description: `Medical event created with ${result.createdCount} student checkups generated for ${getMonthName(selectedMonth)} ${selectedYear}` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update checkup mutation
  const updateCheckupMutation = useMutation({
    mutationFn: async ({ checkupId, data }: { checkupId: string; data: EventCheckupForm }) => {
      const res = await apiRequest("PUT", `/api/student-checkups/${checkupId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-events", selectedEvent?.id, "checkups"] });
      setIsCheckupDialogOpen(false);
      setSelectedCheckup(null);
      checkupForm.reset();
      toast({ title: "Success", description: "Checkup updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Early return conditions - AFTER all hooks are called
  if (hasError) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
        <p className="text-muted-foreground mb-4">There was an error loading the checkups page.</p>
        <Button onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    );
  }

  // Show error state if API calls fail
  if (teamsError || eventsError) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load data</h3>
        <p className="text-muted-foreground mb-4">
          {teamsError?.message || eventsError?.message || "Unable to fetch medical teams or events"}
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (teamsLoading || eventsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Medical Team Events</h2>
            <p className="text-muted-foreground">Create medical teams and schedule event-driven checkups for students</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading medical events...</h3>
            <p className="text-muted-foreground">Please wait while we fetch the data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teams = teamsData?.teams || [];
  const events = eventsData?.events || [];
  const checkups = checkupsData?.checkups || [];

  // Generate dynamic options
  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  const onUpdateCheckup = (data: EventCheckupForm) => {
    if (!selectedCheckup) return;
    
    // Transform "none" referral to undefined for backend
    const transformedData = {
      ...data,
      referredTo: data.referredTo === "none" ? undefined : data.referredTo
    };
    
    updateCheckupMutation.mutate({ checkupId: selectedCheckup.id, data: transformedData });
  };

  const handleEditCheckup = (checkup: any) => {
    console.log('🔍 handleEditCheckup called with:', checkup); // Debug log
    
    // Check if checkup is completed and user is ClassTeacher - show as read-only
    const isCompleted = checkup.status === "Completed";
    const isClassTeacher = user?.role === "ClassTeacher";
    
    // Validate checkup data
    if (!checkup || !checkup.id) {
      console.error('❌ Invalid checkup data:', checkup);
      toast({
        title: "Error",
        description: "Invalid checkup data. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Setting selectedCheckup and opening dialog'); // Debug log
    
    // Always set the selected checkup and open dialog
    setSelectedCheckup(checkup);
    checkupForm.reset({
      status: checkup.status as any,
      present: checkup.present ?? true,
      checkupMonth: checkup.checkupMonth || getCurrentMonth(),
      checkupYear: checkup.checkupYear || getCurrentYear(),
      heightCm: checkup.heightCm || undefined,
      weightKg: checkup.weightKg || undefined,
      temperatureC: checkup.temperatureC || undefined,
      bpSystolic: checkup.bpSystolic || undefined,
      bpDiastolic: checkup.bpDiastolic || undefined,
      symptoms: checkup.symptoms || "",
      diagnosis: checkup.diagnosis || "",
      medicationsGiven: checkup.medicationsGiven || "",
      referredTo: checkup.referredTo || "none",
      referralStatus: checkup.referralStatus as any,
      referralNotes: checkup.referralNotes || "",
      referralDate: checkup.referralDate ? new Date(checkup.referralDate) : undefined,
      followUpRequired: checkup.followUpRequired,
      followUpDate: checkup.followUpDate ? new Date(checkup.followUpDate) : undefined,
      notes: checkup.notes || "",
    });
    setIsCheckupDialogOpen(true);
    
    console.log('✅ Dialog should be open now'); // Debug log
    
    // Show read-only notification for completed checkups
    if (isCompleted && isClassTeacher) {
      toast({
        title: "View Only Mode",
        description: `This checkup for ${getMonthName(checkup.checkupMonth)} ${checkup.checkupYear} has been completed and is now read-only.`,
      });
    }
  };

  // Filter checkups based on search and status
  const filteredCheckups = checkups.filter((checkup: any) => {
    const matchesSearch = !searchTerm || 
      checkup.student?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkup.student?.classSection.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || checkup.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In progress":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Team Events</h2>
          <p className="text-muted-foreground">Create medical teams and schedule event-driven checkups for students</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateTeamDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Create Team
          </Button>
          <Button
            onClick={() => setIsCreateEventDialogOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Medical Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div>Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No medical events found. Medical teams need to create events first.
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((event: any) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvent?.id === event.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{event.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.eventDate)} {event.location && `• ${event.location}`}
                      </p>
                    </div>
                    <Badge variant={new Date(event.eventDate) >= new Date() ? "default" : "secondary"}>
                      {new Date(event.eventDate) >= new Date() ? "Upcoming" : "Past"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Checkups for Selected Event */}
      {selectedEvent && (
        <>
          {/* Month/Year Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Month & Year for Checkups
              </CardTitle>
              <CardDescription>
                Choose the month and year for which you want to view or create student checkups.
                Each student can have only one checkup per event per month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                          {year.isCurrent && <span className="ml-1 text-xs text-primary">(Current)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Badge variant="outline" className="px-3 py-2">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Not started">Not Started</SelectItem>
                    <SelectItem value="In progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Checkups List */}
          <div className="grid gap-4">
            {checkupsLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Loading checkups...</h3>
                  <p className="text-muted-foreground">Please wait while we fetch the student checkup data.</p>
                </CardContent>
              </Card>
            ) : filteredCheckups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No checkups found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria."
                      : selectedEvent 
                        ? `No student checkups have been generated for ${selectedEvent.name} in ${getMonthName(selectedMonth)} ${selectedYear}.`
                        : "Please select a medical event to view checkups."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCheckups.map((checkup: any) => (
                <Card key={checkup.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{checkup.student?.fullName}</h3>
                          </div>
                          <Badge className={getStatusColor(checkup.status)}>
                            {checkup.status}
                          </Badge>
                          {checkup.status === "Completed" && user?.role === "ClassTeacher" && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Eye className="h-3 w-3 mr-1" />
                              View Only - {getMonthName(checkup.checkupMonth)} {checkup.checkupYear}
                            </Badge>
                          )}
                          <Badge variant={checkup.present !== false ? "default" : "destructive"}>
                            {checkup.present !== false ? "Present" : "Absent"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getMonthName(checkup.checkupMonth || selectedMonth)} {checkup.checkupYear || selectedYear}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Class: {checkup.student?.classSection}</span>
                          <span>Gender: {checkup.student?.gender}</span>
                          {checkup.student?.dateOfBirth && (
                            <span>Age: {calculateAge(checkup.student.dateOfBirth)} years</span>
                          )}
                        </div>
                        {checkup.heightCm && checkup.weightKg && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Ruler className="h-4 w-4 text-muted-foreground" />
                              {checkup.heightCm} cm
                            </div>
                            <div className="flex items-center gap-1">
                              <Weight className="h-4 w-4 text-muted-foreground" />
                              {checkup.weightKg} kg
                            </div>
                            {checkup.bmi && (
                              <Badge 
                                className={`${getBMIBgColor(checkup.bmi)} ${getBMIColor(checkup.bmi)}`}
                              >
                                BMI: {checkup.bmi}
                              </Badge>
                            )}
                          </div>
                        )}
                        {checkup.temperatureC && (
                          <div className="flex items-center gap-1 text-sm">
                            <Thermometer className="h-4 w-4 text-muted-foreground" />
                            Temperature: {checkup.temperatureC}°C
                          </div>
                        )}
                        {(checkup.bpSystolic && checkup.bpDiastolic) && (
                          <div className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            BP: {checkup.bpSystolic}/{checkup.bpDiastolic} mmHg
                          </div>
                        )}
                        {checkup.diagnosis && (
                          <p className="text-sm">
                            <strong>Diagnosis:</strong> {checkup.diagnosis}
                          </p>
                        )}
                        {checkup.referredTo && checkup.referredTo !== "none" && (
                          <div className="space-y-1">
                            <p className="text-sm text-orange-600">
                              <strong>Referred to:</strong> {checkup.referredTo}
                            </p>
                            {checkup.referralStatus && (
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    checkup.referralStatus === "Completed" ? "default" :
                                    checkup.referralStatus === "In Progress" ? "secondary" :
                                    checkup.referralStatus === "Overdue" ? "destructive" :
                                    "outline"
                                  }
                                  className="text-xs"
                                >
                                  {checkup.referralStatus}
                                </Badge>
                                {checkup.referralDate && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(checkup.referralDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleEditCheckup(checkup)}
                        variant={checkup.status === "Completed" && user?.role === "ClassTeacher" ? "outline" : "default"}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {checkup.status === "Completed" && user?.role === "ClassTeacher" 
                          ? "View Details" 
                          : checkup.status === "Not started" 
                            ? "Start Checkup" 
                            : "Edit Checkup"
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Checkup Form Dialog */}
      <Dialog open={isCheckupDialogOpen} onOpenChange={setIsCheckupDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Student Checkup - {selectedCheckup?.student?.fullName || 'Loading...'}
              {selectedCheckup?.status === "Completed" && user?.role === "ClassTeacher" && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Eye className="h-3 w-3 mr-1" />
                  View Only – Submitted for {getMonthName(selectedCheckup.checkupMonth)} {selectedCheckup.checkupYear}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Debug Info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 bg-gray-100 text-xs rounded mb-4">
              <strong>Debug:</strong> selectedCheckup={selectedCheckup ? 'exists' : 'null'}, 
              isPending={updateCheckupMutation.isPending ? 'true' : 'false'},
              dialogOpen={isCheckupDialogOpen ? 'true' : 'false'}
            </div>
          )}
          
          {/* Loading State */}
          {updateCheckupMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Saving checkup...</span>
            </div>
          )}
          
          {/* Error State */}
          {updateCheckupMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {updateCheckupMutation.error?.message || "Failed to save checkup. Please try again."}
              </p>
            </div>
          )}
          
          {/* No Data State */}
          {!selectedCheckup && !updateCheckupMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Checkup Found</h3>
              <p className="text-gray-600">
                No checkup data found for the selected month. Please try again or contact support.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setIsCheckupDialogOpen(false);
                  setSelectedCheckup(null);
                }}
              >
                Close
              </Button>
            </div>
          )}
          
          {/* Form Content */}
          {selectedCheckup && !updateCheckupMutation.isPending && (
            <Form {...checkupForm}>
              <form onSubmit={checkupForm.handleSubmit(onUpdateCheckup)} className="space-y-6">
              {/* Read-only mode indicator */}
              {(() => {
                const isReadOnly = selectedCheckup?.status === "Completed" && user?.role === "ClassTeacher";
                
                return (
                  <>
                    {isReadOnly && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 text-blue-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Read-Only Mode</span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          This checkup for {getMonthName(selectedCheckup.checkupMonth)} {selectedCheckup.checkupYear} has been completed and is now read-only. Only Medical Teams can modify completed checkups.
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <FormField
                      control={checkupForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={isReadOnly}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Not started">Not Started</SelectItem>
                              <SelectItem value="In progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Month and Year */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={checkupForm.control}
                        name="checkupMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checkup Month</FormLabel>
                            <Select 
                              value={field.value?.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={isReadOnly}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {monthOptions.map((month) => (
                                  <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checkupForm.control}
                        name="checkupYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checkup Year</FormLabel>
                            <Select 
                              value={field.value?.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={isReadOnly}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOptions.map((year) => (
                                  <SelectItem key={year.value} value={year.value}>
                                    {year.label}
                                    {year.isCurrent && <span className="ml-1 text-xs text-primary">(Current)</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Student Present */}
                    <FormField
                      control={checkupForm.control}
                      name="present"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Student Present</FormLabel>
                            <FormDescription>
                              Uncheck if the student was absent during checkup
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Measurements */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={checkupForm.control}
                        name="heightCm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="150"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checkupForm.control}
                        name="weightKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="45"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Vitals */}
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={checkupForm.control}
                        name="temperatureC"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="37.0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checkupForm.control}
                        name="bpSystolic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>BP Systolic</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="120"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={checkupForm.control}
                        name="bpDiastolic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>BP Diastolic</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="80"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Clinical Information */}
                    <FormField
                      control={checkupForm.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Symptoms</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe any symptoms observed..." 
                              {...field} 
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={checkupForm.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnosis</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Clinical diagnosis..." 
                              {...field} 
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={checkupForm.control}
                      name="medicationsGiven"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medications Given</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List medications provided..." 
                              {...field} 
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Referral Section */}
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-sm">Referral Information</h4>
                      
                      <FormField
                        control={checkupForm.control}
                        name="referredTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Referred To (Optional)</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || "none"}
                              disabled={isReadOnly}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select referral facility" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Referral</SelectItem>
                                {REFERRAL_FACILITY_OPTIONS.map((facility) => (
                                  <SelectItem key={facility} value={facility}>
                                    {facility}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {checkupForm.watch("referredTo") && checkupForm.watch("referredTo") !== "none" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={checkupForm.control}
                              name="referralStatus"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referral Status</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || "Pending"}
                                    disabled={isReadOnly}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Pending">Pending</SelectItem>
                                      <SelectItem value="In Progress">In Progress</SelectItem>
                                      <SelectItem value="Completed">Completed</SelectItem>
                                      <SelectItem value="Overdue">Overdue</SelectItem>
                                      <SelectItem value="Rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={checkupForm.control}
                              name="referralDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referral Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                      disabled={isReadOnly}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={checkupForm.control}
                            name="referralNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Referral Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Additional notes about the referral..." 
                                    {...field} 
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>

                    {/* Follow-up */}
                    <div className="space-y-4">
                      <FormField
                        control={checkupForm.control}
                        name="followUpRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Follow-up Required</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {checkupForm.watch("followUpRequired") && (
                        <FormField
                          control={checkupForm.control}
                          name="followUpDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Follow-up Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={checkupForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional observations or notes..." 
                              {...field} 
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCheckupDialogOpen(false);
                          setSelectedCheckup(null);
                          checkupForm.reset();
                        }}
                      >
                        {isReadOnly ? "Close" : "Cancel"}
                      </Button>
                      {!isReadOnly && (
                        <Button type="submit" disabled={updateCheckupMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {updateCheckupMutation.isPending ? "Saving..." : "Save Checkup"}
                        </Button>
                      )}
                    </div>
                  </>
                );
              })()}
            </form>
          </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Medical Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={teamForm.handleSubmit((data) => createTeamMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Team Name *</label>
              <Input
                {...teamForm.register("name", { required: true })}
                placeholder="e.g., Monthly Health Team - January 2026"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Team Members</label>
              <div className="space-y-3 mt-2">
                {teamForm.watch("members").map((_, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3 p-3 border rounded">
                    <div>
                      <label className="text-xs text-muted-foreground">Role *</label>
                      <Select
                        value={teamForm.watch(`members.${index}.role`)}
                        onValueChange={(value) => teamForm.setValue(`members.${index}.role`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Doctor">Doctor</SelectItem>
                          <SelectItem value="Nurse">Nurse</SelectItem>
                          <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                          <SelectItem value="Technician">Technician</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name *</label>
                      <Input
                        {...teamForm.register(`members.${index}.fullName`, { required: true })}
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Designation *</label>
                      <Input
                        {...teamForm.register(`members.${index}.designation`, { required: true })}
                        placeholder="Senior Medical Officer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone *</label>
                      <Input
                        {...teamForm.register(`members.${index}.phone`, { required: true })}
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentMembers = teamForm.getValues("members");
                    teamForm.setValue("members", [
                      ...currentMembers,
                      { role: "Doctor", fullName: "", designation: "", phone: "" }
                    ]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateTeamDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTeamMutation.isPending}>
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Medical Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={eventForm.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Event Name *</label>
              <Input
                {...eventForm.register("name", { required: true })}
                placeholder="Monthly Checkup - January 2026"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Checkup Month *</label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => {
                    setSelectedMonth(parseInt(value));
                    eventForm.setValue("month", parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Checkup Year *</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => {
                    setSelectedYear(parseInt(value));
                    eventForm.setValue("year", parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                        {year.isCurrent && <span className="ml-1 text-xs text-primary">(Current)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Event Date *</label>
              <Input
                type="date"
                {...eventForm.register("eventDate", { required: true })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Medical Team *</label>
              <Select
                value={eventForm.watch("teamId")}
                onValueChange={(value) => eventForm.setValue("teamId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medical team" />
                </SelectTrigger>
                <SelectContent>
                  {teamsData?.teams?.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                {...eventForm.register("location")}
                placeholder="School Health Room"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                {...eventForm.register("notes")}
                placeholder="Special instructions for this checkup event..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateEventDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckupForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStudentId = searchParams.get("studentId");

  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      return res.json();
    },
  });

  const students = studentsData?.students || [];

  // Show loading state while students are being fetched
  if (studentsLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/checkups">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Record Monthly Checkup</h2>
            <p className="text-muted-foreground">Enter health checkup details for a student</p>
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading form data...</h3>
            <p className="text-muted-foreground">Please wait while we fetch the student list.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if students query fails
  if (studentsError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/checkups">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Record Monthly Checkup</h2>
            <p className="text-muted-foreground">Enter health checkup details for a student</p>
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load form data</h3>
            <p className="text-muted-foreground mb-4">
              {studentsError?.message || "Unable to fetch student list. Please try again."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no students state
  if (students.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/checkups">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Record Monthly Checkup</h2>
            <p className="text-muted-foreground">Enter health checkup details for a student</p>
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No students found</h3>
            <p className="text-muted-foreground mb-4">
              No students are available in your assigned class. Please contact your administrator to add students.
            </p>
            <Link href="/checkups">
              <Button variant="outline">
                Go Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const form = useForm<CheckupFormData>({
    resolver: zodResolver(checkupFormSchema),
    defaultValues: {
      studentId: preselectedStudentId || "",
      checkupDate: new Date().toISOString().split("T")[0],
      heightCm: "",
      weightKg: "",
      present: true,
      symptoms: "",
      suggestedMedicines: "",
      treatmentType: "Primary",
      referredTo: "",
      notes: "",
    },
  });

  const watchWeight = form.watch("weightKg");
  const watchHeight = form.watch("heightCm");
  const watchTreatmentType = form.watch("treatmentType");

  const calculatedBMI = (() => {
    const weight = parseFloat(watchWeight || "0");
    const height = parseFloat(watchHeight || "0");
    if (weight > 0 && height > 0) {
      const heightM = height / 100;
      return (weight / (heightM * heightM)).toFixed(1);
    }
    return null;
  })();

  const createMutation = useMutation({
    mutationFn: async (data: CheckupFormData) => {
      const payload = {
        ...data,
        heightCm: data.heightCm ? parseFloat(data.heightCm) : null,
        weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
        symptoms: data.symptoms ? data.symptoms.split(",").map(s => s.trim()) : [],
        suggestedMedicines: data.suggestedMedicines ? data.suggestedMedicines.split(",").map(s => s.trim()) : [],
      };
      return apiRequest("POST", "/api/monthly-checkups", payload);
    },
    onSuccess: () => {
      toast({
        title: "Checkup recorded",
        description: "Monthly checkup has been saved successfully.",
      });
      // Invalidate all related queries across all views with partial matching
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-checkups"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setLocation("/checkups");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record checkup",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckupFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/checkups">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Record Monthly Checkup</h2>
          <p className="text-muted-foreground">Enter health checkup details for a student</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Checkup Details
          </CardTitle>
          <CardDescription>
            All measurements will be recorded for the selected student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-student">
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student: any) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.fullName} - Class {student.classSection}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checkup Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-checkupDate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="present"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-present"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Student Present</FormLabel>
                      <FormDescription>
                        Uncheck if the student was absent during checkup
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Measurements</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g., 25.5" {...field} data-testid="input-weightKg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heightCm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g., 120.5" {...field} data-testid="input-heightCm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>BMI (Auto-calculated)</FormLabel>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span className={`font-medium ${
                        !calculatedBMI ? "text-muted-foreground" :
                        parseFloat(calculatedBMI) < 18.5 ? "text-amber-600" : 
                        parseFloat(calculatedBMI) > 25 ? "text-rose-600" : 
                        "text-emerald-600"
                      }`}>
                        {calculatedBMI || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Health Assessment</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symptoms</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter symptoms (comma separated)"
                            {...field}
                            data-testid="input-symptoms"
                          />
                        </FormControl>
                        <FormDescription>
                          e.g., Fever, Cold, Headache
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="suggestedMedicines"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suggested Medicines</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter medicines (comma separated)"
                            {...field}
                            data-testid="input-suggestedMedicines"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Treatment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="treatmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treatment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-treatmentType">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Primary">Primary Treatment</SelectItem>
                            <SelectItem value="Referred">Referred to Facility</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchTreatmentType === "Referred" && (
                    <FormField
                      control={form.control}
                      name="referredTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referred To</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter facility/hospital name" {...field} data-testid="input-referredTo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional observations"
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Link href="/checkups">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Checkup
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MonthlyCheckupsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading while user is being fetched
  if (!user) {
    return (
      <AppLayout title="Monthly Checkups">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      </AppLayout>
    );
  }

  // Redirect Admin users away from this page — Admins are not allowed to access Monthly Checkups UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;

  const [location] = useLocation();
  const isNewCheckup = location.includes("/new");

  // For ClassTeacher, show only Medical Team Events
  if (user?.role === "ClassTeacher") {
    if (isNewCheckup) {
      return (
        <AppLayout title="New Checkup">
          <CheckupForm />
        </AppLayout>
      );
    }

    return (
      <AppLayout title="Monthly Checkups">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Monthly Checkups</h1>
              <p className="text-muted-foreground">Create medical teams and manage event-driven student health checkups</p>
            </div>
          </div>

          <EventCheckups />
        </div>
      </AppLayout>
    );
  }

  // For other roles, show both tabs
  if (isNewCheckup) {
    return (
      <AppLayout title="New Checkup">
        <CheckupForm />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Monthly Checkups">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monthly Checkups</h1>
            <p className="text-muted-foreground">Manage both traditional and event-driven student health checkups</p>
          </div>
        </div>

        <Tabs defaultValue="traditional" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="traditional" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Traditional Checkups
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Medical Team Events
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="traditional" className="space-y-6">
            <CheckupList />
          </TabsContent>
          
          <TabsContent value="events" className="space-y-6">
            <EventCheckups />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { REFERRAL_FACILITY_OPTIONS } from "@/lib/referralFacilities";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getBMIColor, getBMIBgColor } from "@/lib/bmiColors";
import {
  ArrowLeft,
  User,
  Calendar,
  Ruler,
  Weight,
  Thermometer,
  Heart,
  Stethoscope,
  FileText,
  Save,
  Search,
  Filter,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";

const studentCheckupSchema = z.object({
  status: z.enum(["Not started", "In progress", "Completed"]),
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

type StudentCheckupForm = z.infer<typeof studentCheckupSchema>;

interface Student {
  id: string;
  fullName: string;
  classSection: string;
  gender: string;
  dateOfBirth: string;
}

interface StudentCheckup {
  id: string;
  studentId: string;
  eventId: string;
  teamId: string;
  status: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  temperatureC?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  symptoms?: string;
  diagnosis?: string;
  medicationsGiven?: string;
  referredTo?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  notes?: string;
  student?: Student;
}

interface MedicalEvent {
  id: string;
  name: string;
  eventDate: string;
  location?: string;
}

export default function StudentCheckupsPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [selectedCheckup, setSelectedCheckup] = useState<StudentCheckup | null>(null);
  const [isCheckupDialogOpen, setIsCheckupDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const checkupForm = useForm<StudentCheckupForm>({
    resolver: zodResolver(studentCheckupSchema),
    defaultValues: {
      status: "Not started",
      followUpRequired: false,
    },
  });

  // Fetch event details
  const { data: eventData } = useQuery({
    queryKey: ["/api/medical-events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/medical-events/${eventId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
    enabled: !!eventId,
  });

  // Fetch student checkups for this event
  const { data: checkupsData, isLoading: checkupsLoading } = useQuery({
    queryKey: ["/api/medical-events", eventId, "checkups"],
    queryFn: async () => {
      const res = await fetch(`/api/medical-events/${eventId}/checkups`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch checkups");
      return res.json();
    },
    enabled: !!eventId,
  });

  // Update checkup mutation
  const updateCheckupMutation = useMutation({
    mutationFn: async ({ checkupId, data }: { checkupId: string; data: StudentCheckupForm }) => {
      const res = await fetch(`/api/student-checkups/${checkupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update checkup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-events", eventId, "checkups"] });
      setIsCheckupDialogOpen(false);
      setSelectedCheckup(null);
      checkupForm.reset();
      toast({ title: "Success", description: "Checkup updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onUpdateCheckup = (data: StudentCheckupForm) => {
    if (!selectedCheckup) return;
    updateCheckupMutation.mutate({ checkupId: selectedCheckup.id, data });
  };

  const handleEditCheckup = (checkup: StudentCheckup) => {
    // Check if checkup is completed and user is ClassTeacher - show as read-only
    const isCompleted = checkup.status === "Completed";
    const isClassTeacher = user?.role === "ClassTeacher";
    
    if (isCompleted && isClassTeacher) {
      toast({
        title: "Read-Only Checkup",
        description: "This checkup has been completed and is now read-only. Only Medical Teams can modify completed checkups.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCheckup(checkup);
    checkupForm.reset({
      status: checkup.status as any,
      heightCm: checkup.heightCm || undefined,
      weightKg: checkup.weightKg || undefined,
      temperatureC: checkup.temperatureC || undefined,
      bpSystolic: checkup.bpSystolic || undefined,
      bpDiastolic: checkup.bpDiastolic || undefined,
      symptoms: checkup.symptoms || "",
      diagnosis: checkup.diagnosis || "",
      medicationsGiven: checkup.medicationsGiven || "",
      referredTo: checkup.referredTo || "",
      referralStatus: (checkup as any).referralStatus as any,
      referralNotes: (checkup as any).referralNotes || "",
      referralDate: (checkup as any).referralDate ? new Date((checkup as any).referralDate) : undefined,
      followUpRequired: checkup.followUpRequired,
      followUpDate: checkup.followUpDate ? new Date(checkup.followUpDate) : undefined,
      notes: checkup.notes || "",
    });
    setIsCheckupDialogOpen(true);
  };

  const event: MedicalEvent = eventData;
  const checkups: StudentCheckup[] = checkupsData?.checkups || [];

  // Filter checkups based on search and status
  const filteredCheckups = checkups.filter((checkup) => {
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

  if (!eventId) {
    return <div>Event ID not found</div>;
  }

  return (
    <AppLayout title="Student Checkups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/medical-events">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {event?.name || "Student Checkups"}
            </h2>
            <p className="text-muted-foreground">
              {event && `${formatDate(event.eventDate)} ${event.location ? `• ${event.location}` : ""}`}
            </p>
          </div>
        </div>

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
            <div className="text-center py-8">Loading checkups...</div>
          ) : filteredCheckups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No checkups found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "No student checkups have been generated for this event yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCheckups.map((checkup) => (
              <Card key={checkup.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium">{checkup.student?.fullName}</h3>
                        </div>
                        <Badge className={getStatusColor(checkup.status)}>
                          {checkup.status}
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
                      {checkup.referredTo && (
                        <p className="text-sm text-orange-600">
                          <strong>Referred to:</strong> {checkup.referredTo}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEditCheckup(checkup)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {checkup.status === "Not started" ? "Start Checkup" : "Edit Checkup"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Checkup Form Dialog */}
        <Dialog open={isCheckupDialogOpen} onOpenChange={setIsCheckupDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Student Checkup - {selectedCheckup?.student?.fullName}
              </DialogTitle>
            </DialogHeader>
            <Form {...checkupForm}>
              <form onSubmit={checkupForm.handleSubmit(onUpdateCheckup)} className="space-y-6">
                {/* Status */}
                <FormField
                  control={checkupForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Textarea placeholder="Describe any symptoms observed..." {...field} />
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
                        <Textarea placeholder="Clinical diagnosis..." {...field} />
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
                        <Textarea placeholder="List medications provided..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={checkupForm.control}
                  name="referredTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred To (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., District Hospital, Specialist Clinic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <Textarea placeholder="Any additional observations or notes..." {...field} />
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
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateCheckupMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateCheckupMutation.isPending ? "Saving..." : "Save Checkup"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
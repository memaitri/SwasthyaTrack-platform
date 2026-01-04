import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getBMIColor, getBMIBgColor, getBMIClassificationLabel } from "@/lib/bmiColors";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/csvExport";
import { generatePdfReport } from "@/lib/pdfReports";
import { Link } from "wouter";
import {
  Stethoscope,
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  Calculator,
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

type CheckupForm = z.infer<typeof checkupFormSchema>;

function CheckupList() {
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [exportFormat, setExportFormat] = useState("csv");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/monthly-checkups", monthFilter, yearFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("month", monthFilter);
      params.append("year", yearFilter);
      const res = await fetch(`/api/monthly-checkups?${params}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch checkups");
      return res.json();
    },
  });

  const checkups = data?.checkups || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Monthly Checkups</h2>
          <p className="text-muted-foreground">Record and view student health checkups</p>
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
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => (
              <SelectItem key={i} value={String(i + 1)}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-28" data-testid="filter-year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
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
        exportable
        onExport={async () => {
          if (exportFormat === "csv") {
            exportToCSV(
              checkups,
              [
                { key: "studentName", header: "Student Name" },
                { key: "classSection", header: "Class" },
                { key: "checkupDate", header: "Date" },
                { key: "bmi", header: "BMI" },
                { key: "treatmentType", header: "Treatment Type" },
              ],
              "monthly_checkups"
            );
          } else {
            // For PDF prefer client-side pretty generator (includes charts)
            if (exportFormat === 'pdf') {
              try {
                const { blob, filename } = await generatePdfReport({ type: 'monthly-checkup', month: monthFilter, year: yearFilter });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || `monthly-checkups-${yearFilter}-${monthFilter}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                return;
              } catch (err) {
                console.warn('Client PDF generation failed, falling back to server blob', err);
              }
            }

            // Fallback: use server-rendered report for Excel or if PDF generation failed
            const params = new URLSearchParams();
            params.append("format", exportFormat);
            params.append("month", monthFilter);
            params.append("year", yearFilter);

            const token = localStorage.getItem("accessToken");
            const response = await fetch(`/api/reports/monthly-checkup?${params.toString()}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: "Failed to generate report" }));
              alert(errorData.message || "Failed to generate report");
              return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const extension = exportFormat === "excel" ? "xlsx" : exportFormat;
            a.download = `monthly-checkups-${yearFilter}-${monthFilter}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
        }}
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

function CheckupForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStudentId = searchParams.get("studentId");

  const { data: studentsData } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await fetch(`/api/students`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
  });

  const students = studentsData?.students || [];

  const form = useForm<CheckupForm>({
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
    mutationFn: async (data: CheckupForm) => {
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

  const onSubmit = (data: CheckupForm) => {
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

  // Redirect Admin users away from this page — Admins are not allowed to access Monthly Checkups UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;

  const [location] = useLocation();
  const isNewCheckup = location.includes("/new");

  return (
    <AppLayout title={isNewCheckup ? "New Checkup" : "Monthly Checkups"}>
      {isNewCheckup ? <CheckupForm /> : <CheckupList />}
    </AppLayout>
  );
}

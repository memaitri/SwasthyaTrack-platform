import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HealthCardFormSections } from "@/components/health-card/HealthCardFormSections";
import { calculateAge, getMenstrualTrackingValidationMessage } from "@/lib/menstrualHealthUtils";
import { calculateYearsInSchool, formatYearsInSchool } from "@/lib/schoolUtils";
import { Loader2, Save, ArrowLeft, User, FileHeart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

const studentFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  uniqueId: z.string().optional(),
  pranNo: z.string().min(6, "PRAN is required"),
  aadhaarNo: z.string().min(12, "Aadhaar number must be 12 digits"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  schoolAdmissionDate: z.string().min(1, "School Admission Date is required"),
  gender: z.enum(["M", "F", "O"]),
  classSection: z.string().min(1, "Class is required"),
  fatherGuardianName: z.string().optional(),
  fatherContact: z.string().optional(),
  motherName: z.string().optional(),
  motherContact: z.string().optional(),
  address: z.string().optional(),
});

const healthCardFormSchema = z.object({
  /* Anthropometric Measurements */
  weightKg: z.string().optional(),
  heightCm: z.string().optional(),
  bmi: z.string().optional(),
  bmi_category: z.string().optional(),
  sbp: z.string().optional(),
  dbp: z.string().optional(),
  bloodPressure: z.string().optional(),
  bpClassification: z.string().optional(),
  visionRight: z.string().optional(),
  visionLeft: z.string().optional(),
  visualAcuitySnellen: z.string().optional(),
  visualAcuityNotes: z.string().optional(),

  /* Section A: Defects at Birth */
  a1_visible_defect: z.boolean().default(false),
  a1_visible_defect_notes: z.string().optional(),
  a1_referral_facility: z.string().optional(),
  a1_referral_date: z.string().optional(),
  summary_defects_neural_tube: z.boolean().default(false),
  summary_defects_down_syndrome: z.boolean().default(false),
  summary_defects_cleft: z.boolean().default(false),
  summary_defects_talipes: z.boolean().default(false),
  summary_defects_hip_dysplasia: z.boolean().default(false),
  summary_defects_congenital_deafness: z.boolean().default(false),
  summary_defects_other: z.string().optional(),

  /* Section B: Deficiencies */
  b1_severe_thinning: z.boolean().default(false),
  b1_counsel_moderate: z.boolean().default(false),
  b1_referral_facility: z.string().optional(),
  b1_referral_date: z.string().optional(),
  b2_bilateral_oedema: z.boolean().default(false),
  b2_referral_facility: z.string().optional(),
  b2_referral_date: z.string().optional(),
  b3_severe_anemia: z.boolean().default(false),
  b3_referral_facility: z.string().optional(),
  b3_referral_date: z.string().optional(),
  b4_vitamin_a_deficiency: z.boolean().default(false),
  b4_night_blindness: z.boolean().default(false),
  b4_bitots_spots: z.boolean().default(false),
  b4_referral_facility: z.string().optional(),
  b4_referral_date: z.string().optional(),
  b5_vitamin_d_deficiency: z.boolean().default(false),
  b5_wrist_widening: z.boolean().default(false),
  b5_bowing_legs: z.boolean().default(false),
  b5_referral_facility: z.string().optional(),
  b5_referral_date: z.string().optional(),
  b6_goitre: z.boolean().default(false),
  b6_referral_facility: z.string().optional(),
  b6_referral_date: z.string().optional(),
  b7_obesity: z.boolean().default(false),
  b7_referral_facility: z.string().optional(),
  b7_referral_date: z.string().optional(),
  b8_vitb_deficiency: z.boolean().default(false),
  b8_angular_stomatitis: z.boolean().default(false),
  b8_raw_tongue: z.boolean().default(false),
  b8_corneal_vascularization: z.boolean().default(false),
  b8_referral_facility: z.string().optional(),
  b8_referral_date: z.string().optional(),
  summary_deficiency_anemia: z.boolean().default(false),
  summary_deficiency_vitamin_a: z.boolean().default(false),
  summary_deficiency_vitamin_d: z.boolean().default(false),
  summary_deficiency_sam_stunting: z.boolean().default(false),
  summary_deficiency_goitre: z.boolean().default(false),
  summary_deficiency_vitamin_b: z.boolean().default(false),
  summary_deficiency_other: z.string().optional(),

  /* Section C: Diseases */
  c1_convulsive: z.boolean().default(false),
  c1_referral_facility: z.string().optional(),
  c1_referral_date: z.string().optional(),
  c2_otitis_media: z.boolean().default(false),
  c2_assess_hearing: z.boolean().default(false),
  c2_referral_facility: z.string().optional(),
  c2_referral_date: z.string().optional(),
  c3_dental: z.boolean().default(false),
  c3_white_discoloration: z.boolean().default(false),
  c3_brown_discoloration: z.boolean().default(false),
  c3_gum_swelling: z.boolean().default(false),
  c3_plaque: z.boolean().default(false),
  c3_referral_facility: z.string().optional(),
  c3_referral_date: z.string().optional(),
  c4_skin_conditions: z.boolean().default(false),
  c4_itching: z.boolean().default(false),
  c4_scaly_lesions: z.boolean().default(false),
  c4_round_lesions: z.boolean().default(false),
  c4_referral_facility: z.string().optional(),
  c4_referral_date: z.string().optional(),
  c5_asthma: z.boolean().default(false),
  c5_breathlessness: z.boolean().default(false),
  c5_wheezing: z.boolean().default(false),
  c5_referral_facility: z.string().optional(),
  c5_referral_date: z.string().optional(),
  c6_rheumatic_heart: z.boolean().default(false),
  c6_murmur: z.boolean().default(false),
  c6_referral_facility: z.string().optional(),
  c6_referral_date: z.string().optional(),
  c7_suspected: z.boolean().default(false),
  c7_referral_facility: z.string().optional(),
  c7_referral_date: z.string().optional(),
  c8_suspected: z.boolean().default(false),
  c8_referral_facility: z.string().optional(),
  c8_referral_date: z.string().optional(),
  c9_suspected: z.boolean().default(false),
  c9_referral_facility: z.string().optional(),
  c9_referral_date: z.string().optional(),

  /* Section D: Developmental Delays */
  d1_seeing_difficulty: z.boolean().default(false),
  d1_referral_facility: z.string().optional(),
  d1_referral_date: z.string().optional(),
  d2_walking_delay: z.boolean().default(false),
  d2_referral_facility: z.string().optional(),
  d2_referral_date: z.string().optional(),
  d3_reading_writing: z.boolean().default(false),
  d3_referral_facility: z.string().optional(),
  d3_referral_date: z.string().optional(),
  d4_muscle_stiffness: z.boolean().default(false),
  d4_referral_facility: z.string().optional(),
  d4_referral_date: z.string().optional(),
  d5_hearing_difficulty: z.boolean().default(false),
  d5_referral_facility: z.string().optional(),
  d5_referral_date: z.string().optional(),
  d6_speech_difficulty: z.boolean().default(false),
  d6_referral_facility: z.string().optional(),
  d6_referral_date: z.string().optional(),
  d7_learning_difficulty: z.boolean().default(false),
  d7_referral_facility: z.string().optional(),
  d7_referral_date: z.string().optional(),
  d8_inattention_hyperactivity: z.boolean().default(false),
  d8_referral_facility: z.string().optional(),
  d8_referral_date: z.string().optional(),
  d9_behavioral_concerns: z.boolean().default(false),
  d9_referral_facility: z.string().optional(),
  d9_referral_date: z.string().optional(),

  /* Section E: Adolescent Health */
  e1_iron_folic_acid: z.boolean().default(false),
  e1_referral_facility: z.string().optional(),
  e1_referral_date: z.string().optional(),
  e2_deworming: z.boolean().default(false),
  e2_referral_facility: z.string().optional(),
  e2_referral_date: z.string().optional(),
  e3_counseling_adolescent: z.boolean().default(false),
  e3_referral_facility: z.string().optional(),
  e3_referral_date: z.string().optional(),
  e4_menstruation_started: z.boolean().default(false),
  e4_referral_facility: z.string().optional(),
  e4_referral_date: z.string().optional(),
  e5_pain_urination: z.boolean().default(false),
  e5_referral_facility: z.string().optional(),
  e5_referral_date: z.string().optional(),
  e6_foul_discharge: z.boolean().default(false),
  e6_referral_facility: z.string().optional(),
  e6_referral_date: z.string().optional(),
  e7_severe_menstrual_pain: z.boolean().default(false),
  e7_referral_facility: z.string().optional(),
  e7_referral_date: z.string().optional(),

  /* Menstrual Health Tracking */
  menstrual_cycle_regular: z.boolean().default(false),
  menstrual_cycle_length_days: z.string().optional(),
  menstrual_period_duration_days: z.string().optional(),
  menstrual_last_period_date: z.string().optional(),
  menstrual_irregularities: z.object({
    missed_periods: z.boolean().optional(),
    heavy_bleeding: z.boolean().optional(),
    prolonged_periods: z.boolean().optional(),
    frequent_periods: z.boolean().optional(),
    spotting: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  menstrual_symptoms: z.object({
    cramps: z.boolean().optional(),
    headaches: z.boolean().optional(),
    mood_changes: z.boolean().optional(),
    bloating: z.boolean().optional(),
    breast_tenderness: z.boolean().optional(),
    fatigue: z.boolean().optional(),
    nausea: z.boolean().optional(),
    back_pain: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  menstrual_hygiene_practices: z.object({
    sanitary_pads: z.boolean().optional(),
    cloth: z.boolean().optional(),
    menstrual_cup: z.boolean().optional(),
    tampons: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),

  /* Summary and Referrals */
  referralRecommended: z.boolean().default(false),
  referralReason: z.string().optional(),
  referralFacility: z.string().optional(),
  referralDate: z.string().optional(),
  referralUrgency: z.enum(["Low", "Medium", "High"]).optional(),
});

type StudentForm = z.infer<typeof studentFormSchema>;
type HealthCardForm = z.infer<typeof healthCardFormSchema>;

export default function StudentFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("student");
  const isNew = !id || id === "new";

  // For ClassTeacher, only show their assigned class
  const isClassTeacher = user?.role === "ClassTeacher";
  const assignedClass = user?.classSection;

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: "",
      uniqueId: "",
      pranNo: "",
      aadhaarNo: "",
      dateOfBirth: "",
      schoolAdmissionDate: "",
      gender: "M",
      classSection: isClassTeacher && assignedClass ? assignedClass : "",
      fatherGuardianName: "",
      fatherContact: "",
      motherName: "",
      motherContact: "",
      address: "",
    },
  });

  const healthCardForm = useForm<HealthCardForm>({
    resolver: zodResolver(healthCardFormSchema),
    defaultValues: {
      /* Anthropometry */
      weightKg: "",
      heightCm: "",
      bmi: "",
      bmi_category: "",
      sbp: "",
      dbp: "",
      bloodPressure: "",
      bpClassification: "",
      visionRight: "",
      visionLeft: "",
      visualAcuitySnellen: "",
      visualAcuityNotes: "",

      /* Section A */
      a1_visible_defect: false,
      a1_visible_defect_notes: "",
      a1_referral_facility: "",
      a1_referral_date: "",
      summary_defects_neural_tube: false,
      summary_defects_down_syndrome: false,
      summary_defects_cleft: false,
      summary_defects_talipes: false,
      summary_defects_hip_dysplasia: false,
      summary_defects_congenital_deafness: false,
      summary_defects_other: "",

      /* Section B */
      b1_severe_thinning: false,
      b1_counsel_moderate: false,
      b1_referral_facility: "",
      b1_referral_date: "",
      b2_bilateral_oedema: false,
      b2_referral_facility: "",
      b2_referral_date: "",
      b3_severe_anemia: false,
      b3_referral_facility: "",
      b3_referral_date: "",
      b4_vitamin_a_deficiency: false,
      b4_night_blindness: false,
      b4_bitots_spots: false,
      b4_referral_facility: "",
      b4_referral_date: "",
      b5_vitamin_d_deficiency: false,
      b5_wrist_widening: false,
      b5_bowing_legs: false,
      b5_referral_facility: "",
      b5_referral_date: "",
      b6_goitre: false,
      b6_referral_facility: "",
      b6_referral_date: "",
      b7_obesity: false,
      b7_referral_facility: "",
      b7_referral_date: "",
      b8_vitb_deficiency: false,
      b8_angular_stomatitis: false,
      b8_raw_tongue: false,
      b8_corneal_vascularization: false,
      b8_referral_facility: "",
      b8_referral_date: "",
      summary_deficiency_anemia: false,
      summary_deficiency_vitamin_a: false,
      summary_deficiency_vitamin_d: false,
      summary_deficiency_sam_stunting: false,
      summary_deficiency_goitre: false,
      summary_deficiency_vitamin_b: false,
      summary_deficiency_other: "",

      /* Section C */
      c1_convulsive: false,
      c1_referral_facility: "",
      c1_referral_date: "",
      c2_otitis_media: false,
      c2_assess_hearing: false,
      c2_referral_facility: "",
      c2_referral_date: "",
      c3_dental: false,
      c3_white_discoloration: false,
      c3_brown_discoloration: false,
      c3_gum_swelling: false,
      c3_plaque: false,
      c3_referral_facility: "",
      c3_referral_date: "",
      c4_skin_conditions: false,
      c4_itching: false,
      c4_scaly_lesions: false,
      c4_round_lesions: false,
      c4_referral_facility: "",
      c4_referral_date: "",
      c5_asthma: false,
      c5_breathlessness: false,
      c5_wheezing: false,
      c5_referral_facility: "",
      c5_referral_date: "",
      c6_rheumatic_heart: false,
      c6_murmur: false,
      c6_referral_facility: "",
      c6_referral_date: "",
      c7_suspected: false,
      c7_referral_facility: "",
      c7_referral_date: "",
      c8_suspected: false,
      c8_referral_facility: "",
      c8_referral_date: "",
      c9_suspected: false,
      c9_referral_facility: "",
      c9_referral_date: "",

      /* Section D */
      d1_seeing_difficulty: false,
      d1_referral_facility: "",
      d1_referral_date: "",
      d2_walking_delay: false,
      d2_referral_facility: "",
      d2_referral_date: "",
      d3_reading_writing: false,
      d3_referral_facility: "",
      d3_referral_date: "",
      d4_muscle_stiffness: false,
      d4_referral_facility: "",
      d4_referral_date: "",
      d5_hearing_difficulty: false,
      d5_referral_facility: "",
      d5_referral_date: "",
      d6_speech_difficulty: false,
      d6_referral_facility: "",
      d6_referral_date: "",
      d7_learning_difficulty: false,
      d7_referral_facility: "",
      d7_referral_date: "",
      d8_inattention_hyperactivity: false,
      d8_referral_facility: "",
      d8_referral_date: "",
      d9_behavioral_concerns: false,
      d9_referral_facility: "",
      d9_referral_date: "",

      /* Section E */
      e1_iron_folic_acid: false,
      e1_referral_facility: "",
      e1_referral_date: "",
      e2_deworming: false,
      e2_referral_facility: "",
      e2_referral_date: "",
      e3_counseling_adolescent: false,
      e3_referral_facility: "",
      e3_referral_date: "",
      e4_menstruation_started: false,
      e4_referral_facility: "",
      e4_referral_date: "",
      e5_pain_urination: false,
      e5_referral_facility: "",
      e5_referral_date: "",
      e6_foul_discharge: false,
      e6_referral_facility: "",
      e6_referral_date: "",
      e7_severe_menstrual_pain: false,
      e7_referral_facility: "",
      e7_referral_date: "",

      /* Menstrual Health */
      menstrual_cycle_regular: false,
      menstrual_cycle_length_days: "",
      menstrual_period_duration_days: "",
      menstrual_last_period_date: "",

      /* Summary */
      referralRecommended: false,
      referralReason: "",
      referralFacility: "",
      referralDate: "",
    },
  });

  // Watch form fields for validation and calculations
  const studentGender = studentForm.watch("gender");
  const studentDOB = studentForm.watch("dateOfBirth");
  const studentFullName = studentForm.watch("fullName");
  const studentClassSection = studentForm.watch("classSection");
  
  const studentAge = studentDOB ? calculateAge(studentDOB) : 0;
  const isFemale = studentGender === "F";
  const showAdolescentSection = studentAge >= 10;

  // Check menstrual tracking eligibility
  const studentForValidation = {
    id: id || 'new',
    gender: studentGender,
    dateOfBirth: studentDOB,
    fullName: studentFullName || '',
    classSection: studentClassSection || '',
  };
  
  const menstrualValidationMessage = getMenstrualTrackingValidationMessage(studentForValidation);

  const { data: studentData, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["/api/students", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const res = await apiRequest("GET", `/api/students/${id}`);
      return res.json();
    },
    enabled: !isNew && !!id,
  });

  // Load student data when editing
  useEffect(() => {
    if (studentData && !isNew) {
      studentForm.reset({
        fullName: studentData.fullName || "",
        uniqueId: studentData.uniqueId || "",
        pranNo: studentData.pranNo || "",
        aadhaarNo: studentData.aadhaarNo || "",
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toISOString().split("T")[0] : "",
        schoolAdmissionDate: studentData.schoolAdmissionDate ? new Date(studentData.schoolAdmissionDate).toISOString().split("T")[0] : "",
        gender: studentData.gender || "M",
        classSection: studentData.classSection || (isClassTeacher ? (assignedClass || "") : ""),
        fatherGuardianName: studentData.fatherGuardianName || "",
        fatherContact: studentData.fatherContact || "",
        motherName: studentData.motherName || "",
        motherContact: studentData.motherContact || "",
        address: studentData.address || "",
      });
    }
  }, [studentData, isNew, studentForm, isClassTeacher, assignedClass]);

  const createMutation = useMutation({
    mutationFn: async (data: { student: StudentForm; healthCard: HealthCardForm }) => {
      return apiRequest("POST", "/api/students", data);
    },
    onSuccess: () => {
      toast({
        title: "Student created",
        description: "Student and health card have been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      setLocation("/students");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create student",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<StudentForm>) => {
      return apiRequest("PUT", `/api/students/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Student updated",
        description: "Student information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      setLocation("/students");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update student",
        variant: "destructive",
      });
    },
  });

  const onSubmit = () => {
    if (isNew) {
      const studentData = studentForm.getValues();
      const healthCardData = healthCardForm.getValues();
      createMutation.mutate({ student: studentData, healthCard: healthCardData });
    } else {
      const studentData = studentForm.getValues();
      updateMutation.mutate(studentData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading state while student data is being fetched
  if (isLoadingStudent) {
    return (
      <AppLayout title="Loading...">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading student information...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isNew ? "Add New Student" : "Edit Student"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isNew ? "Add New Student" : "Edit Student"}
            </h2>
            <p className="text-muted-foreground">
              {isNew ? "Screening Form - Complete annual health card assessment" : "Update student information"}
            </p>
            {isNew && (
              <p className="text-xs text-muted-foreground uppercase">TRACKING WELLNESS, EMPOWERING FUTURES</p>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student" className="gap-2" data-testid="tab-student">
              <User className="h-4 w-4" />
              Student Details
            </TabsTrigger>
            <TabsTrigger value="healthCard" className="gap-2" data-testid="tab-health-card">
              <FileHeart className="h-4 w-4" />
              Complete Health Card {isNew && <span className="text-xs">(Required)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>Enter the student's personal and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...studentForm}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={studentForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Male</SelectItem>
                              <SelectItem value="F">Female</SelectItem>
                              <SelectItem value="O">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="schoolAdmissionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Admission Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          {field.value && (
                            <p className="text-sm text-muted-foreground">
                              Years in school: {formatYearsInSchool(calculateYearsInSchool(field.value))}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="classSection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Section *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 5A, 6B" 
                              {...field} 
                              readOnly={isClassTeacher && !!assignedClass}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="pranNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PRAN Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter PRAN number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="aadhaarNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhaar Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Aadhaar number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="fatherGuardianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father/Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter father/guardian name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="fatherContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="motherName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter mother name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={studentForm.control}
                      name="motherContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={studentForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter complete address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("healthCard")}
                    >
                      Next: Health Info
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="healthCard" className="mt-6 space-y-6">
            <Form {...healthCardForm}>
              <HealthCardFormSections
                form={healthCardForm}
                studentGender={studentGender}
                studentAge={studentAge}
                userRole={user?.role}
              />

              {/* Menstrual Tracking Validation Message */}
              {menstrualValidationMessage && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-4 h-4 rounded-full bg-orange-200 flex items-center justify-center">
                        <span className="text-xs">!</span>
                      </div>
                      <p className="text-sm font-medium">Menstrual Health Tracking Restriction</p>
                    </div>
                    <p className="text-sm text-orange-600 mt-1 ml-6">
                      {menstrualValidationMessage}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("student")}
                >
                  Back to Student Details
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isNew ? "Create Student" : "Update Student"}
                </Button>
              </div>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
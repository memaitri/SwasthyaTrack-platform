import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getBMIClassification, getBMIColor } from "@/lib/bmiColors";
import { HealthCardFormSections } from "@/components/health-card/HealthCardFormSections";
import { Loader2, Save, ArrowLeft, User, FileHeart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

const studentFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  uniqueId: z.string().min(1, "Unique ID is required"),
  aadhaarNo: z.string().optional(),
  mctsNo: z.string().optional(),
  dateOfBirth: z.string().optional(),
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

  /* A. Defects at Birth */
  a1_visible_defect: z.boolean().default(false),
  a1_visible_defect_notes: z.string().optional(),
  a1_referral_facility: z.string().optional(),
  summary_defects_neural_tube: z.boolean().default(false),
  summary_defects_down_syndrome: z.boolean().default(false),
  summary_defects_cleft: z.boolean().default(false),
  summary_defects_talipes: z.boolean().default(false),
  summary_defects_hip_dysplasia: z.boolean().default(false),
  summary_defects_congenital_deafness: z.boolean().default(false),
  summary_defects_other: z.string().optional(),

  /* B. Deficiencies */
  b1_severe_thinning: z.boolean().default(false),
  b1_counsel_moderate: z.boolean().default(false),
  b1_referral_facility: z.string().optional(),
  b2_bilateral_oedema: z.boolean().default(false),
  b2_referral_facility: z.string().optional(),
  b3_severe_anemia: z.boolean().default(false),
  b3_referral_facility: z.string().optional(),
  b4_vitamin_a_deficiency: z.boolean().default(false),
  b4_night_blindness: z.boolean().default(false),
  b4_bitots_spots: z.boolean().default(false),
  b4_referral_facility: z.string().optional(),
  b5_vitamin_d_deficiency: z.boolean().default(false),
  b5_wrist_widening: z.boolean().default(false),
  b5_bowing_legs: z.boolean().default(false),
  b5_referral_facility: z.string().optional(),
  b6_goitre: z.boolean().default(false),
  b6_referral_facility: z.string().optional(),
  b7_obesity: z.boolean().default(false),
  b7_referral_facility: z.string().optional(),
  b8_vitb_deficiency: z.boolean().default(false),
  b8_angular_stomatitis: z.boolean().default(false),
  b8_raw_tongue: z.boolean().default(false),
  b8_corneal_vascularization: z.boolean().default(false),
  b8_referral_facility: z.string().optional(),
  summary_deficiency_anemia: z.boolean().default(false),
  summary_deficiency_vitamin_a: z.boolean().default(false),
  summary_deficiency_vitamin_d: z.boolean().default(false),
  summary_deficiency_sam_stunting: z.boolean().default(false),
  summary_deficiency_goitre: z.boolean().default(false),
  summary_deficiency_vitamin_b: z.boolean().default(false),
  summary_deficiency_other: z.string().optional(),

  /* C. Diseases */
  c1_convulsive: z.boolean().default(false),
  c1_referral_facility: z.string().optional(),
  c2_otitis_media: z.boolean().default(false),
  c2_assess_hearing: z.boolean().default(false),
  c2_referral_facility: z.string().optional(),
  c3_dental: z.boolean().default(false),
  c3_white_discoloration: z.boolean().default(false),
  c3_brown_discoloration: z.boolean().default(false),
  c3_gum_swelling: z.boolean().default(false),
  c3_plaque: z.boolean().default(false),
  c3_referral_facility: z.string().optional(),
  c4_skin_conditions: z.boolean().default(false),
  c4_itching: z.boolean().default(false),
  c4_scaly_lesions: z.boolean().default(false),
  c4_round_lesions: z.boolean().default(false),
  c4_referral_facility: z.string().optional(),
  c5_asthma: z.boolean().default(false),
  c5_breathlessness: z.boolean().default(false),
  c5_wheezing: z.boolean().default(false),
  c5_referral_facility: z.string().optional(),
  c6_rheumatic_heart: z.boolean().default(false),
  c6_murmur: z.boolean().default(false),
  c6_referral_facility: z.string().optional(),
  c7_suspected: z.boolean().default(false),
  c7_clinical_features: z.record(z.boolean()).optional(),
  c7_types: z.record(z.boolean()).optional(),
  c7_nerve_involvement: z.record(z.union([z.boolean(), z.string()])).optional(),
  c7_functional_impact: z.record(z.string()).optional(),
  c7_referral_facility: z.string().optional(),
  c8_suspected: z.boolean().default(false),
  c8_symptoms: z.record(z.union([z.boolean(), z.string()])).optional(),
  c8_relevant_history: z.record(z.boolean()).optional(),
  c8_extra_pulmonary: z.record(z.union([z.boolean(), z.string()])).optional(),
  c8_referral_facility: z.string().optional(),
  summary_disease_skin_conditions: z.boolean().default(false),
  summary_disease_vision_impairment: z.boolean().default(false),
  summary_disease_hearing_impairment: z.boolean().default(false),
  summary_disease_dental: z.boolean().default(false),
  summary_disease_reactive_airway: z.boolean().default(false),
  summary_disease_heart: z.boolean().default(false),
  summary_disease_convulsive: z.boolean().default(false),
  summary_disease_neuro_motor: z.boolean().default(false),
  summary_disease_cognitive_delay: z.boolean().default(false),
  summary_disease_motor_delay: z.boolean().default(false),
  summary_disease_speech_delay: z.boolean().default(false),
  summary_disease_behavioral_disorder: z.boolean().default(false),
  summary_disease_tuberculosis: z.boolean().default(false),
  summary_disease_leprosy: z.boolean().default(false),
  summary_disease_other: z.string().optional(),

  /* D. Developmental Delay & Disability */
  d1_seeing_difficulty: z.boolean().default(false),
  d1_referral_facility: z.string().optional(),
  d2_walking_delay: z.boolean().default(false),
  d2_referral_facility: z.string().optional(),
  d3_reading_writing: z.boolean().default(false),
  d3_referral_facility: z.string().optional(),
  d4_muscle_stiffness: z.boolean().default(false),
  d4_referral_facility: z.string().optional(),
  d5_hearing_difficulty: z.boolean().default(false),
  d5_referral_facility: z.string().optional(),
  d6_speech_difficulty: z.boolean().default(false),
  d6_referral_facility: z.string().optional(),
  d7_learning_difficulty: z.boolean().default(false),
  d7_referral_facility: z.string().optional(),
  d8_inattention_hyperactivity: z.boolean().default(false),
  d8_referral_facility: z.string().optional(),
  d9_behavioral_concerns: z.boolean().default(false),
  d9_referral_facility: z.string().optional(),

  /* E. Adolescent-Specific Questionnaire (10-18 Years) */
  e1_life_events_difficulty: z.boolean().default(false),
  e1_referral_suggested: z.boolean().default(false),
  e1_referral_facility: z.string().optional(),
  e1_referral_date: z.string().optional(),
  e2_peer_pressure_substance: z.boolean().default(false),
  e2_referral_suggested: z.boolean().default(false),
  e2_referral_facility: z.string().optional(),
  e2_referral_date: z.string().optional(),
  e3_persistent_sadness: z.boolean().default(false),
  e3_referral_suggested: z.boolean().default(false),
  e3_referral_facility: z.string().optional(),
  e3_referral_date: z.string().optional(),
  e4_menstruation_started: z.boolean().default(false),
  e4_referral_suggested: z.boolean().default(false),
  e4_referral_facility: z.string().optional(),
  e4_referral_date: z.string().optional(),
  e5_pain_urination: z.boolean().default(false),
  e5_referral_suggested: z.boolean().default(false),
  e5_referral_facility: z.string().optional(),
  e5_referral_date: z.string().optional(),
  e6_foul_discharge: z.boolean().default(false),
  e6_referral_suggested: z.boolean().default(false),
  e6_referral_facility: z.string().optional(),
  e6_referral_date: z.string().optional(),
  e7_severe_menstrual_pain: z.boolean().default(false),
  e7_referral_suggested: z.boolean().default(false),
  e7_referral_facility: z.string().optional(),
  e7_referral_date: z.string().optional(),
  summary_adolescent_menstrual_issues: z.boolean().default(false),
  summary_adolescent_substance_use: z.boolean().default(false),
  summary_adolescent_depressed: z.boolean().default(false),
  summary_adolescent_burning_urination: z.boolean().default(false),
  summary_adolescent_discharge: z.boolean().default(false),
  summary_adolescent_other: z.string().optional(),

  /* Menstrual Cycle Tracking */
  menstrual_cycle_regular: z.boolean().optional(),
  menstrual_cycle_length_days: z.number().optional(),
  menstrual_period_duration_days: z.number().optional(),
  menstrual_last_period_date: z.string().optional(),
  menstrual_irregularities: z.object({
    missed_periods: z.boolean().optional(),
    heavy_bleeding: z.boolean().optional(),
    spotting: z.boolean().optional(),
    prolonged_bleeding: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  menstrual_symptoms: z.object({
    cramps: z.boolean().optional(),
    headache: z.boolean().optional(),
    nausea: z.boolean().optional(),
    fatigue: z.boolean().optional(),
    mood_changes: z.boolean().optional(),
    back_pain: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  menstrual_hygiene_practices: z.object({
    sanitary_pads: z.boolean().optional(),
    tampons: z.boolean().optional(),
    menstrual_cup: z.boolean().optional(),
    cloth: z.boolean().optional(),
    adequate_facilities: z.boolean().optional(),
    privacy_concerns: z.boolean().optional(),
  }).optional(),
  menstrual_educational_resources_accessed: z.boolean().optional(),

  /* Referral Summary */
  referral_defect_at_birth_yes: z.boolean().default(false),
  referral_defect_at_birth_no: z.boolean().default(false),
  referral_deficiency_yes: z.boolean().default(false),
  referral_deficiency_no: z.boolean().default(false),
  referral_disease_yes: z.boolean().default(false),
  referral_disease_no: z.boolean().default(false),
  referral_leprosy_yes: z.boolean().default(false),
  referral_leprosy_no: z.boolean().default(false),
  referral_tb_yes: z.boolean().default(false),
  referral_tb_no: z.boolean().default(false),
  referral_developmental_yes: z.boolean().default(false),
  referral_developmental_no: z.boolean().default(false),
  referral_adolescent_yes: z.boolean().default(false),
  referral_adolescent_no: z.boolean().default(false),

  /* Doctor & Teacher Signatures */
  doctor_mht_name: z.string().optional(),
  date_of_visit: z.string().optional(),
  data_entry_register: z.boolean().default(false),
});

type StudentForm = z.infer<typeof studentFormSchema>;
type HealthCardForm = z.infer<typeof healthCardFormSchema>;

// Rest of the component code will be added here...

export default function StudentFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("student");
  const isNew = !id || id === "new";
  const [calculatedBmi, setCalculatedBmi] = useState<number | null>(null);

  // For ClassTeacher, only show their assigned class
  const isClassTeacher = user?.role === "ClassTeacher";
  const assignedClass = user?.classSection;

  // Calculate student age and gender for conditional display
  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: "",
      uniqueId: "",
      aadhaarNo: "",
      mctsNo: "",
      dateOfBirth: "",
      gender: "M",
      classSection: "",
      fatherGuardianName: "",
      fatherContact: "",
      motherName: "",
      motherContact: "",
      address: "",
    },
  });
  const studentGender = studentForm.watch("gender");
  const studentDOB = studentForm.watch("dateOfBirth");
  const studentAge = studentDOB ? Math.floor((new Date().getTime() - new Date(studentDOB).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
  const isFemale = studentGender === "F";
  const showAdolescentSection = studentAge >= 10;

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
        aadhaarNo: studentData.aadhaarNo || "",
        mctsNo: studentData.mctsNo || "",
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toISOString().split("T")[0] : "",
        gender: studentData.gender || "M",
        classSection: studentData.classSection || (isClassTeacher ? (assignedClass || "") : ""),
        fatherGuardianName: studentData.fatherGuardianName || "",
        fatherContact: studentData.fatherContact || "",
        motherName: studentData.motherName || "",
        motherContact: studentData.motherContact || "",
        address: studentData.address || "",
      });
    } else if (isNew && isClassTeacher && assignedClass) {
      // For new students, pre-fill class for ClassTeacher
      studentForm.setValue("classSection", assignedClass);
    }
  }, [studentData, isNew, studentForm, isClassTeacher, assignedClass]);

  const healthCardForm = useForm<HealthCardForm>({
    resolver: zodResolver(healthCardFormSchema),
    defaultValues: {
      /* Anthropometry */
      weightKg: "",
      heightCm: "",
      sbp: "",
      dbp: "",
      bpClassification: "",
      visionRight: "",
      visionLeft: "",
      visualAcuitySnellen: "",

      /* Section A */
      a1_visible_defect: false,

      /* Section B */
      b1_severe_thinning: false,
      b2_bilateral_oedema: false,
      b3_severe_anemia: false,
      b4_vitamin_a_deficiency: false,
      b5_vitamin_d_deficiency: false,
      b6_goitre: false,
      b7_obesity: false,
      b8_vitb_deficiency: false,

      /* Section C */
      c1_convulsive: false,
      c2_otitis_media: false,
      c3_dental: false,
      c4_skin_conditions: false,
      c5_asthma: false,
      c6_rheumatic_heart: false,
      c7_suspected: false,
      c8_suspected: false,

      /* Section D */
      d1_seeing_difficulty: false,
      d2_walking_delay: false,
      d3_reading_writing: false,
      d4_muscle_stiffness: false,
      d5_hearing_difficulty: false,
      d6_speech_difficulty: false,
      d7_learning_difficulty: false,
      d8_inattention_hyperactivity: false,
      d9_behavioral_concerns: false,

      /* Section E */
      e1_life_events_difficulty: false,
      e2_peer_pressure_substance: false,
      e3_persistent_sadness: false,
      e4_menstruation_started: false,
      e5_pain_urination: false,
      e6_foul_discharge: false,
      e7_severe_menstrual_pain: false,

      /* Referral Summary */
      referral_defect_at_birth_yes: false,
      referral_defect_at_birth_no: false,
      referral_deficiency_yes: false,
      referral_deficiency_no: false,
      referral_disease_yes: false,
      referral_disease_no: false,
      referral_leprosy_yes: false,
      referral_leprosy_no: false,
      referral_tb_yes: false,
      referral_tb_no: false,
      referral_developmental_yes: false,
      referral_developmental_no: false,
      referral_adolescent_yes: false,
      referral_adolescent_no: false,

      doctor_mht_name: "",
      date_of_visit: "",
      data_entry_register: false,
    },
  });

  const calculateBMI = () => {
    const weight = parseFloat(healthCardForm.watch("weightKg") || "0");
    const height = parseFloat(healthCardForm.watch("heightCm") || "0");
    if (weight && height) {
      const bmi = weight / ((height / 100) ** 2);
      setCalculatedBmi(parseFloat(bmi.toFixed(1)));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: { student: StudentForm; healthCard: HealthCardForm }) => {
      return apiRequest("POST", "/api/students", data);
    },
    onSuccess: () => {
      toast({
        title: "Student created",
        description: "Student and health card have been submitted for approval.",
      });
      // Invalidate all related queries across all views with partial matching
      queryClient.invalidateQueries({ queryKey: ["/api/students"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"], exact: false });
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
    mutationFn: async (data: StudentForm) => {
      return apiRequest("PUT", `/api/students/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Student updated",
        description: "Student information has been updated.",
      });
      // Invalidate all related queries with partial matching
      queryClient.invalidateQueries({ queryKey: ["/api/students"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"], exact: false });
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

      // Convert empty strings to null for optional fields
      const cleanedStudent = {
        ...studentData,
        dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth : undefined,
        aadhaarNo: studentData.aadhaarNo || undefined,
        mctsNo: studentData.mctsNo || undefined,
        fatherGuardianName: studentData.fatherGuardianName || undefined,
        fatherContact: studentData.fatherContact || undefined,
        motherName: studentData.motherName || undefined,
        motherContact: studentData.motherContact || undefined,
        address: studentData.address || undefined,
      };

      const cleanedHealthCard = {
        ...healthCardData,
        weightKg: healthCardData.weightKg || undefined,
        heightCm: healthCardData.heightCm || undefined,
        bmi: healthCardData.bmi || undefined,
        bmi_category: healthCardData.bmi_category || undefined,
        bloodPressure: healthCardData.bloodPressure || undefined,
        bpClassification: healthCardData.bpClassification || undefined,
        visionRight: healthCardData.visionRight || undefined,
        visionLeft: healthCardData.visionLeft || undefined,
        a1_visible_defect_notes: healthCardData.a1_visible_defect_notes || undefined,
        a1_referral_facility: healthCardData.a1_referral_facility || undefined,
        // Add all other fields as needed
      };

      createMutation.mutate({ student: cleanedStudent, healthCard: cleanedHealthCard });
    } else {
      const studentData = studentForm.getValues();
      const cleanedStudent = {
        ...studentData,
        dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth : undefined,
        aadhaarNo: studentData.aadhaarNo || undefined,
        mctsNo: studentData.mctsNo || undefined,
        fatherGuardianName: studentData.fatherGuardianName || undefined,
        fatherContact: studentData.fatherContact || undefined,
        motherName: studentData.motherName || undefined,
        motherContact: studentData.motherContact || undefined,
        address: studentData.address || undefined,
      };
      updateMutation.mutate(cleanedStudent);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
              Health Card {isNew && <span className="text-xs">(Required)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>Enter the student's personal and contact details</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...studentForm}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} data-testid="input-fullName" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={studentForm.control}
                        name="uniqueId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unique ID (10 Digit) *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter unique ID" {...field} data-testid="input-uniqueId" />
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
                            <FormLabel>Aadhaar Number</FormLabel>
                            <FormControl>
                              <Input placeholder="16 digit Aadhaar" {...field} data-testid="input-aadhaarNo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={studentForm.control}
                        name="mctsNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MCTS Number (16 Digit)</FormLabel>
                            <FormControl>
                              <Input placeholder="16 digit MCTS" {...field} data-testid="input-mctsNo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={studentForm.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-dateOfBirth" />
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
                                <SelectTrigger data-testid="select-gender">
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
                      {/* For Class Teachers, auto-fill class and hide dropdown */}
                      {isClassTeacher && assignedClass ? (
                        <FormField
                          control={studentForm.control}
                          name="classSection"
                          render={({ field }) => {
                            // Ensure field value is set to assigned class
                            if (field.value !== assignedClass) {
                              field.onChange(assignedClass);
                            }
                            return (
                              <FormItem>
                                <FormLabel>Class & Section *</FormLabel>
                                <Input
                                  value={assignedClass}
                                  disabled
                                  readOnly
                                  className="bg-muted"
                                  data-testid="input-classSection-readonly"
                                />
                              </FormItem>
                            );
                          }}
                        />
                      ) : (
                        <FormField
                          control={studentForm.control}
                          name="classSection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Class & Section *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-classSection">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[...Array(10)].map((_, i) => (
                                    <SelectItem key={`${i + 1}-A`} value={`${i + 1}-A`}>
                                      Class {i + 1}-A
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-4">Guardian Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={studentForm.control}
                          name="fatherGuardianName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father/Guardian Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter name" {...field} data-testid="input-fatherGuardianName" />
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
                              <FormLabel>Contact Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} data-testid="input-fatherContact" />
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
                                <Input placeholder="Enter name" {...field} data-testid="input-motherName" />
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
                                <Input placeholder="Enter phone number" {...field} data-testid="input-motherContact" />
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
                          <FormItem className="mt-4">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter full address" {...field} data-testid="input-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {isNew ? (
                        <Button
                          type="button"
                          onClick={() => setActiveTab("healthCard")}
                          data-testid="button-next"
                        >
                          Next: Health Card
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => onSubmit()}
                          disabled={isSubmitting}
                          data-testid="button-save-student"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      )}
                    </div>
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

              <div className="flex justify-between gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("student")}
                  data-testid="button-back-to-student"
                >
                  Back to Student Details
                </Button>
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isNew ? "Submit for Approval" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

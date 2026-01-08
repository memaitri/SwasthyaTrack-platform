import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileHeart, Loader2, Eye, EyeOff, School, Plus } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(["PO", "Headmaster", "ClassTeacher", "MedicalTeam", "HostelWarden", "MealSuperintendent", "Lady Superintendent"]),
  schoolId: z.string().optional(),
  classSection: z.string().optional(), // For ClassTeacher
  district: z.string().optional(), // For PO
  region: z.string().optional(), // For PO
  block: z.string().optional(), // For PO
})
  // Password confirmation
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  // Require school for roles that must be attached to a school in the app
  .refine((data) => {
    if (["ClassTeacher", "Headmaster", "MedicalTeam", "HostelWarden", "MealSuperintendent", "Lady Superintendent"].includes(data.role)) {
      return !!data.schoolId;
    }
    return true;
  }, {
    message: "School is required for this role",
    path: ["schoolId"],
  })
  // Require classSection for ClassTeacher
  .refine((data) => {
    if (data.role === "ClassTeacher") {
      return !!data.classSection;
    }
    return true;
  }, {
    message: "Assigned class & section is required for Class Teacher",
    path: ["classSection"],
  })
  // Require region/district/block for PO (to match backend rules)
  .refine((data) => {
    if (data.role === "PO") {
      return !!data.region && !!data.district && !!data.block;
    }
    return true;
  }, {
    message: "Region, district, and block are required for PO",
    path: ["region"],
  });

const schoolFormSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  code: z.string().optional(),
  region: z.string().min(2, "Region is required"),
  district: z.string().min(2, "District is required"),
  block: z.string().min(2, "Block is required"),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<string>("ClassTeacher");
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [isCreatingSchool, setIsCreatingSchool] = useState(false);

  const { data: schoolsData, refetch: refetchSchools } = useQuery({
    queryKey: ["/api/schools", selectedRegion],
    queryFn: async () => {
      const url = selectedRegion && role === "PO" 
        ? `/api/schools?region=${encodeURIComponent(selectedRegion)}`
        : "/api/schools";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
    enabled: role === "PO" || role === "ClassTeacher" || role === "Headmaster" || role === "MedicalTeam" || role === "HostelWarden" || role === "MealSuperintendent" || role === "Lady Superintendent",
  });

  const schools = schoolsData?.schools || [];
  
  // Get unique regions for PO
  const regions = Array.from(new Set(schools.map((s: any) => s.region).filter(Boolean))) as string[];
  
  // Filter schools by region for PO
  const availableSchools = role === "PO" && selectedRegion
    ? schools.filter((s: any) => s.region === selectedRegion)
    : schools;

  const schoolForm = useForm<z.infer<typeof schoolFormSchema>>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      code: "",
      region: "",
      district: "",
      block: "",
      address: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "ClassTeacher",
      schoolId: "",
      classSection: "",
      region: "",
      district: "",
      block: "",
    },
  });

  const onCreateSchool = async (schoolData: z.infer<typeof schoolFormSchema>) => {
    setIsCreatingSchool(true);
    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create school");
      }
      const newSchool = await response.json();
      if (newSchool && newSchool.approvalStatus === "Pending") {
        toast({
          title: "School request submitted",
          description: "Your school has been submitted and is pending admin approval.",
        });
      } else {
        toast({
          title: "School created",
          description: "School has been created successfully.",
        });
      }

      setShowSchoolForm(false);
      schoolForm.reset();
      await refetchSchools();

      // Do NOT auto-select the newly created school unless it is already approved
      if (newSchool && newSchool.approvalStatus === "Approved" && (role === "ClassTeacher" || role === "Headmaster" || role === "MedicalTeam" || role === "MealSuperintendent" || role === "Lady Superintendent")) {
        form.setValue("schoolId", newSchool.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create school",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSchool(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const result = await register(registerData);
      if (result && (result.pending || (result.status && result.status === 202))) {
        toast({
          title: "Registration submitted",
          description: "Your account is pending approval by your school's Headmaster. You'll be notified once approved.",
        });
        setLocation("/");
        return;
      }

      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/10">

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="mx-auto">
              <Brand variant="large" />
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          {...field}
                          data-testid="input-fullname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Choose a username"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Role</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setRole(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="PO">Project Officer (PO)</SelectItem>
                            <SelectItem value="Headmaster">Headmaster</SelectItem>
                            <SelectItem value="ClassTeacher">Class Teacher</SelectItem>
                            <SelectItem value="MedicalTeam">Medical Team</SelectItem>
                            <SelectItem value="HostelWarden">Hostel Warden</SelectItem>
                            <SelectItem value="MealSuperintendent">Meal Superintendent</SelectItem>
                            <SelectItem value="Lady Superintendent">Lady Superintendent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {['ClassTeacher','MedicalTeam','HostelWarden','MealSuperintendent','Lady Superintendent'].includes(role) && (
                        <p className="text-xs text-muted-foreground mt-2">Accounts for this role require Headmaster approval and will be activated only after approval.</p>
                      )}
                    </FormItem>
                  )}
                />
                {role === "PO" && (
                  <>
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region *</FormLabel>
                          <Select 
                            value={field.value || ""} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedRegion(value);
                              form.setValue("schoolId", undefined);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-region">
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions.map((region: string) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2 mt-1">
                            {selectedRegion && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  form.setValue("region", "");
                                  setSelectedRegion("");
                                  form.setValue("schoolId", "");
                                }}
                                className="text-xs h-6"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedRegion && (
                      <>
                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>District *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter district" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="block"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Block *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter block" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="schoolId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Schools (Optional)</FormLabel>
                              <Select value={field.value || undefined} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-schoolId">
                                    <SelectValue placeholder="Select schools in your region" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableSchools.map((school: any) => (
                                    <SelectItem key={school.id} value={school.id}>
                                      {school.name} - {school.district}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => field.onChange(undefined)}
                                  className="text-xs h-6 mt-1"
                                >
                                  Clear selection
                                </Button>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="text-sm text-muted-foreground">
                          PO will manage all schools in region: <strong>{selectedRegion}</strong>
                        </div>
                      </>
                    )}
                  </>
                )}
                {(role === "ClassTeacher" || role === "Headmaster" || role === "MedicalTeam" || role === "HostelWarden" || role === "MealSuperintendent" || role === "Lady Superintendent") && (
                  <>
                    <div className="flex items-center justify-between">
                      <FormLabel>School *</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSchoolForm(true)}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Request School Addition
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name="schoolId"
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-schoolId">
                                <SelectValue placeholder="Select your school" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schools.map((school: any) => (
                                <SelectItem key={school.id} value={school.id}>
                                  {school.name} - {school.district}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => field.onChange(undefined)}
                              className="text-xs h-6 mt-1"
                            >
                              Clear selection
                            </Button>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {role === "ClassTeacher" && (
                      <FormField
                        control={form.control}
                        name="classSection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assigned Class & Section *</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
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
                  </>
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            {...field}
                            data-testid="input-confirm-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  className="text-primary hover:underline p-0"
                  onClick={() => setLocation("/login")}
                  data-testid="button-go-to-login"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* School Registration Dialog */}
      <Dialog open={showSchoolForm} onOpenChange={setShowSchoolForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request School Addition</DialogTitle>
          </DialogHeader>
          <Form {...schoolForm}>
            <form onSubmit={schoolForm.handleSubmit(onCreateSchool)} className="space-y-4">
              <FormField
                control={schoolForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter school name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={schoolForm.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={schoolForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SCH001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={schoolForm.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District *</FormLabel>
                      <FormControl>
                        <Input placeholder="District name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={schoolForm.control}
                name="block"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block *</FormLabel>
                    <FormControl>
                      <Input placeholder="Block name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={schoolForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={schoolForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={schoolForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowSchoolForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingSchool} className="flex-1">
                  {isCreatingSchool ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create School"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <footer className="py-4 text-center text-sm text-muted-foreground uppercase">
        TRACKING WELLNESS, EMPOWERING FUTURES
      </footer>
    </div>
  );
}

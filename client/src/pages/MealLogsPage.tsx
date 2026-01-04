import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  UtensilsCrossed,
  Camera,
  MapPin,
  Calendar,
  Upload,
  Image,
  CheckCircle2,
  X,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";

const mealFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  menuItems: z.string().min(1, "Menu items are required"),
  notes: z.string().optional(),
  classSection: z.string().optional(),
});

type MealForm = z.infer<typeof mealFormSchema>;

const mealTypeLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const mealTypeIcons = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

const defaultClassSections = ["1-A", "2-A", "3-A", "4-A", "5-A", "1-B", "2-B", "3-B", "4-B", "5-B"];

export default function MealLogsPage() {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const userRole = user?.role;
  const [, setLocation] = useLocation();

  // Redirect Admin users away from Meal Logs UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;
  const userClassSection = user?.classSection || "";
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const canFilterSchool = hasRole("Admin", "PO");
  const defaultSchoolFilter = canFilterSchool ? "all" : user?.schoolId || "self";
  const [selectedSchool, setSelectedSchool] = useState(defaultSchoolFilter);
  const canManageMeals = hasRole("ClassTeacher", "Headmaster", "Admin", "PO");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const classOptions = useMemo(() => {
    if (user?.role === "ClassTeacher" && user?.classSection) {
      return [user.classSection];
    }
    return defaultClassSections;
  }, [user]);

  const canSelectClass = userRole !== "ClassTeacher";
  useEffect(() => {
    if (!canFilterSchool && user?.schoolId) {
      setSelectedSchool(user.schoolId);
    }
  }, [canFilterSchool, user?.schoolId]);

  const schoolsQuery = useQuery({
    queryKey: ["/api/schools", user?.id],
    enabled: canFilterSchool,
  }) as { data?: any };
  const schools = schoolsQuery.data?.schools || [];

  useEffect(() => {
    if (
      canFilterSchool &&
      selectedSchool !== "all" &&
      schools.length > 0 &&
      !schools.find((school: any) => school.id === selectedSchool)
    ) {
      setSelectedSchool("all");
    }
  }, [canFilterSchool, selectedSchool, schools]);

  const { data: mealsData, isLoading } = useQuery({
    queryKey: ["/api/meals", selectedDate, selectedSchool],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("date", selectedDate);
      if (canFilterSchool && selectedSchool && selectedSchool !== "all") {
        params.append("schoolId", selectedSchool);
      }
      const res = await fetch(`/api/meals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch meals");
      return res.json();
    },
  });

  const { data: complianceData } = useQuery({
    queryKey: ["/api/meals/compliance", selectedSchool],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (canFilterSchool && selectedSchool && selectedSchool !== "all") {
        params.append("schoolId", selectedSchool);
      }
      const query = params.toString();
      const endpoint = query ? `/api/meals/compliance?${query}` : "/api/meals/compliance";
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch compliance");
      return res.json();
    },
  });

  const meals = mealsData?.meals || [];

  const form = useForm<MealForm>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      date: selectedDate,
      mealType: "breakfast",
      menuItems: "",
      notes: "",
      classSection: userClassSection || "",
    },
  });

  const editForm = useForm<MealForm>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      date: selectedDate,
      mealType: "breakfast",
      menuItems: "",
      notes: "",
      classSection: "",
    },
  });

  const invalidateMealQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/meals"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/meals/compliance"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
  };

  useEffect(() => {
    form.setValue("date", selectedDate);
  }, [selectedDate, form]);

  useEffect(() => {
    if (userClassSection) {
      form.setValue("classSection", userClassSection);
    }
  }, [userClassSection, form]);

  const createMutation = useMutation({
    mutationFn: async (data: MealForm) => {
      const payload = {
        ...data,
        menuItems: data.menuItems.split(",").map(item => item.trim()),
        latitude: geoLocation?.lat,
        longitude: geoLocation?.lng,
        imageUrl: uploadedImageUrl,
        classSection: data.classSection || userClassSection || undefined,
      };
      return apiRequest("POST", "/api/meals", payload);
    },
    onSuccess: () => {
      toast({
        title: "Meal logged",
        description: "Meal has been recorded successfully.",
      });
      invalidateMealQueries();
      form.reset({
        date: selectedDate,
        mealType: "breakfast",
        menuItems: "",
        notes: "",
        classSection: userClassSection || "",
      });
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setUploadedImageUrl(null);
      setGeoLocation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log meal",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MealForm) => {
      if (!editingMeal) throw new Error("No meal selected");
      const payload = {
        ...data,
        menuItems: data.menuItems.split(",").map((item) => item.trim()).filter(Boolean),
      };
      return apiRequest("PUT", `/api/meals/${editingMeal.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Meal updated",
        description: "Meal entry has been updated successfully.",
      });
      invalidateMealQueries();
      setIsEditDialogOpen(false);
      setEditingMeal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mealId: string) => {
      return apiRequest("DELETE", `/api/meals/${mealId}`);
    },
    onSuccess: () => {
      toast({
        title: "Meal deleted",
        description: "The meal entry has been removed.",
      });
      invalidateMealQueries();
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: formData,
      });
      if (!res.ok) {
        const errorText = (await res.text()) || "Failed to upload image";
        throw new Error(errorText);
      }
      const data = await res.json();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setUploadedImageUrl(data.imageUrl);
      setImagePreview(URL.createObjectURL(file));
      toast({
        title: "Image uploaded",
        description: "Photo attached successfully.",
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setUploadedImageUrl(null);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast({
            title: "Location captured",
            description: "Your current location has been recorded.",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location unavailable",
            description: error.message || "Could not get your location. Location is optional - you can continue without it.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser does not support geolocation. Location is optional.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: MealForm) => {
    createMutation.mutate(data);
  };

  const getMealForType = (type: string) => {
    return meals.find((m: any) => m.mealType === type);
  };

  const startEditMeal = (meal: any) => {
    setEditingMeal(meal);
    editForm.reset({
      date: meal.date,
      mealType: meal.mealType,
      menuItems: Array.isArray(meal.menuItems) ? meal.menuItems.join(", ") : "",
      notes: meal.notes || "",
      classSection: meal.classSection || "",
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = (data: MealForm) => {
    updateMutation.mutate(data);
  };

  return (
    <AppLayout title="Meal Tracking">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Meal Tracking</h2>
            <p className="text-muted-foreground">Log and monitor daily meal service</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  params.append("type", "meals");
                  params.append("date", selectedDate);
                  
                  const res = await apiRequest("GET", `/api/images/download?${params}`);
                  const data = await res.json();
                  
                  if (data.images && data.images.length > 0) {
                    // Download all images
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
            {canFilterSchool && (
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-48" data-testid="select-school-filter">
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((school: any) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              data-testid="input-date"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Today's Meals</CardTitle>
                <CardDescription>
                  View and track meal service for {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(["breakfast", "lunch", "dinner"] as const).map((type) => {
                      const meal = getMealForType(type);
                      return (
                        <div
                          key={type}
                          className={`p-4 rounded-lg border ${
                            meal 
                              ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" 
                              : "bg-muted/50 border-muted"
                          }`}
                          data-testid={`meal-${type}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{mealTypeIcons[type]}</span>
                              <h3 className="font-semibold text-foreground">{mealTypeLabels[type]}</h3>
                            </div>
                            {meal ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 no-default-hover-elevate no-default-active-elevate">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Logged
                                </Badge>
                                {canManageMeals && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => startEditMeal(meal)}
                                      data-testid={`button-edit-meal-${type}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => setDeleteTarget(meal)}
                                      data-testid={`button-delete-meal-${type}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate no-default-active-elevate">
                                Not logged
                              </Badge>
                            )}
                          </div>
                          {meal ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(Array.isArray(meal.menuItems) ? meal.menuItems : []).map((item: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                              {meal.imageUrl && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <a 
                                    href={meal.imageUrl.startsWith('http') ? meal.imageUrl : meal.imageUrl.startsWith('/') ? meal.imageUrl : `/${meal.imageUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                                  >
                                    <Image className="h-4 w-4" />
                                    <span>View Photo</span>
                                  </a>
                                  {meal.latitude && meal.longitude && (
                                    <>
                                      <MapPin className="h-4 w-4 ml-2" />
                                      <span>Location tagged</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Meal not yet logged for today
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Log New Meal
              </CardTitle>
              <CardDescription>
                Record meal details with photo and location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="classSection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class *</FormLabel>
                        {canSelectClass ? (
                          <>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-classSection">
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classOptions.map((cls) => (
                                  <SelectItem key={cls} value={cls}>
                                    {cls}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Select the class served for this meal</FormDescription>
                          </>
                        ) : (
                          <Input value={field.value || userClassSection} disabled />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mealType">
                              <SelectValue placeholder="Select meal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="menuItems"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menu Items *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter items (comma separated)"
                            {...field}
                            data-testid="input-menuItems"
                          />
                        </FormControl>
                        <FormDescription>
                          e.g., Rice, Dal, Vegetable Curry
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Photo</FormLabel>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Meal preview"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={handleRemoveImage}
                            disabled={createMutation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label
                          className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg ${
                            isUploadingImage ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/50 transition-colors"
                          }`}
                        >
                          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            {isUploadingImage ? "Uploading..." : "Click to upload photo"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            data-testid="input-image"
                            disabled={isUploadingImage}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <FormLabel>Location</FormLabel>
                    <div className="mt-2">
                      {geoLocation ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm">
                              {geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setGeoLocation(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={getCurrentLocation}
                          data-testid="button-get-location"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Get Current Location
                        </Button>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes"
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || isUploadingImage}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? (
                      "Saving..."
                    ) : isUploadingImage ? (
                      "Uploading image..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Log Meal
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-foreground">{complianceData?.overallCompliance || 0}%</p>
                <p className="text-sm text-muted-foreground">Overall Compliance</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-emerald-600">{complianceData?.daysLogged || 0}</p>
                <p className="text-sm text-muted-foreground">Days Logged</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-amber-600">{complianceData?.daysMissed || 0}</p>
                <p className="text-sm text-muted-foreground">Days Missed</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-blue-600">{complianceData?.totalMeals || 0}</p>
                <p className="text-sm text-muted-foreground">Total Meals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Meal Entry</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="classSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class *</FormLabel>
                    {canSelectClass ? (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classOptions.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={field.value || userClassSection} disabled />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select meal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="menuItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Items *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter items (comma separated)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open) setDeleteTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove the meal log and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { School, Plus, Edit, Users, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";

interface SchoolData {
  schools: any[];
  totalPages: number;
  totalItems: number;
}

const schoolFormSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  code: z.string().optional(), // School code not compulsory
  schoolType: z.enum(["Government", "Aided"], {
    required_error: "School Type is required",
  }),
  region: z.string().min(2, "Region is required"),
  district: z.string().min(2, "District is required"),
  block: z.string().min(2, "Block is required"),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type SchoolForm = z.infer<typeof schoolFormSchema>;

export default function SchoolsPage() {
  const { toast } = useToast();
  const { hasRole, user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect Admin users away from Schools UI (Admins retain approvals via /approvals)
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;

  const [isOpen, setIsOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<SchoolData>({
    queryKey: ["/api/schools", page, user?.id],
  });

  const schools = data?.schools || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;

  const form = useForm<SchoolForm>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      code: "",
      schoolType: "Government",
      region: "",
      district: "",
      block: "",
      address: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SchoolForm) => {
      return apiRequest("POST", "/api/schools", data);
    },
    onSuccess: () => {
      toast({
        title: "School created",
        description: "New school has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.id] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create school",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SchoolForm) => {
      return apiRequest("PUT", `/api/schools/${editingSchool.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "School updated",
        description: "School has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.id] });
      setIsOpen(false);
      setEditingSchool(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update school",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (school: any) => {
    setEditingSchool(school);
    form.reset({
      name: school.name,
      code: school.code || "",
      schoolType: school.schoolType || "Government",
      region: school.region || "",
      district: school.district,
      block: school.block,
      address: school.address || "",
      contactPhone: school.contactPhone || "",
      contactEmail: school.contactEmail || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (data: SchoolForm) => {
    if (editingSchool) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canManage = hasRole("Admin", "PO");

  return (
    <AppLayout title="Schools">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Schools</h2>
            <p className="text-muted-foreground">Manage school registrations</p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditingSchool(null);
                form.reset();
                setIsOpen(true);
              }}
              data-testid="button-add-school"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <School className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Schools</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {schools.reduce((acc: number, s: any) => acc + (s.totalStudents || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <School className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {schools.filter((s: any) => s.isActive).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Schools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={[
            {
              key: "name",
              header: "School",
              render: (item: any) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Code: {item.code}</p>
                  </div>
                </div>
              ),
            },
            { key: "district", header: "District" },
            { key: "block", header: "Block" },
            {
              key: "totalStudents",
              header: "Students",
              className: "text-center",
              render: (item: any) => (
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                  {item.totalStudents || 0}
                </Badge>
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
                </div>
              ),
            },
          ]}
          data={schools}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          searchable
          searchPlaceholder="Search schools..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: setPage,
          }}
          emptyMessage="No schools found"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter school name" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-school-type">
                          <SelectValue placeholder="Select school type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Aided">Aided</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SCH001" {...field} data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District *</FormLabel>
                      <FormControl>
                        <Input placeholder="District name" {...field} data-testid="input-district" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="block"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block *</FormLabel>
                    <FormControl>
                      <Input placeholder="Block name" {...field} data-testid="input-block" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact number" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingSchool ? (
                    "Update School"
                  ) : (
                    "Create School"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

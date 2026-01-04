import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Edit, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface UsersData {
  users: any[];
  totalPages: number;
  totalItems: number;
}

interface SchoolsData {
  schools: any[];
}

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["PO", "Headmaster", "ClassTeacher", "MedicalTeam", "Admin"]),
  schoolId: z.string().optional(),
  district: z.string().optional(),
  block: z.string().optional(),
});

type UserForm = z.infer<typeof userFormSchema>;

const roleBadgeColors: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Headmaster: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ClassTeacher: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  MedicalTeam: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function UsersPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect Admin users away from Users UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;
  const { data, isLoading } = useQuery<UsersData>({
    queryKey: ["/api/users", page],
  });

  const { data: schoolsData } = useQuery<SchoolsData>({
    queryKey: ["/api/schools", user?.id],
  });

  const users = data?.users || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.totalItems || 0;
  const schools = schoolsData?.schools || [];

  const form = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
      role: "ClassTeacher",
      schoolId: "",
      district: "",
      block: "",
    },
  });

  const watchRole = form.watch("role");

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return apiRequest("PUT", `/api/users/${editingUser.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsOpen(false);
      setEditingUser(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId || "",
      district: user.district || "",
      block: user.block || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (data: UserForm) => {
    if (editingUser) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="User Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-muted-foreground">Create and manage system users</p>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              form.reset();
              setIsOpen(true);
            }}
            data-testid="button-add-user"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <DataTable
          columns={[
            {
              key: "fullName",
              header: "User",
              render: (item: any) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {item.fullName?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.fullName}</p>
                    <p className="text-xs text-muted-foreground">{item.email}</p>
                  </div>
                </div>
              ),
            },
            { key: "username", header: "Username" },
            {
              key: "role",
              header: "Role",
              render: (item: any) => (
                <Badge
                  variant="outline"
                  className={`${roleBadgeColors[item.role] || ""} no-default-hover-elevate no-default-active-elevate`}
                >
                  {item.role}
                </Badge>
              ),
            },
            {
              key: "schoolId",
              header: "School",
              render: (item: any) => (
                <span className="text-sm text-muted-foreground">
                  {item.schoolName || "-"}
                </span>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(item)}
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item.id)}
                    data-testid={`button-delete-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={users}
          getRowKey={(item: any) => item.id}
          isLoading={isLoading}
          searchable
          searchPlaceholder="Search users..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: setPage,
          }}
          emptyMessage="No users found"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} data-testid="input-username" />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!editingUser && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="PO">Project Officer (PO)</SelectItem>
                        <SelectItem value="Headmaster">Headmaster</SelectItem>
                        <SelectItem value="ClassTeacher">Class Teacher</SelectItem>
                        <SelectItem value="MedicalTeam">Medical Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(watchRole === "Headmaster" || watchRole === "ClassTeacher" || watchRole === "MedicalTeam") && (
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-school">
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schools.map((school: any) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchRole === "PO" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Input placeholder="District name" {...field} data-testid="input-district" />
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
                        <FormLabel>Block</FormLabel>
                        <FormControl>
                          <Input placeholder="Block name" {...field} data-testid="input-block" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

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
                  ) : editingUser ? (
                    "Update User"
                  ) : (
                    "Create User"
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

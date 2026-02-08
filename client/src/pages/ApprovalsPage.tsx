import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  User,
  Heart,
  Activity,
  Loader2,
  MapPin,
  School,
  Ban,
  Unlock,
  ShieldAlert,
} from "lucide-react";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Enhanced state for PO approvals
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [isUserViewOpen, setIsUserViewOpen] = useState(false);
  const [isSchoolViewOpen, setIsSchoolViewOpen] = useState(false);
  const [isUserRejectOpen, setIsUserRejectOpen] = useState(false);
  const [isSchoolRejectOpen, setIsSchoolRejectOpen] = useState(false);
  const [userRejectionReason, setUserRejectionReason] = useState("");
  const [schoolRejectionReason, setSchoolRejectionReason] = useState("");
  
  // Block/Unblock state
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // POs should only see school and user approvals, not health cards
  const showHealthCardApprovals = user?.role !== "PO";

  // Pending health cards (only for non-PO roles)
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/annual-cards", "Pending"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", "Pending");
      const res = await apiRequest("GET", `/api/annual-cards?${params}`);
      return res.json();
    },
    enabled: showHealthCardApprovals, // Only fetch for non-PO roles
  });

  const pendingCards = showHealthCardApprovals ? (data?.cards || []) : [];

  // Pending user accounts for this headmaster/PO (new)
  const { data: userPendingData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/approvals/pending"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/approvals/pending");
        return res.json();
      } catch (e) {
        return { pending: [] };
      }
    },
    enabled: user?.role === "Headmaster" || user?.role === "PO" || user?.role === "Admin",
  });

  const pendingUsers = userPendingData?.pending || [];

  // Admin and PO: pending school requests
  const { data: pendingSchoolsData, isLoading: isLoadingPendingSchools } = useQuery({
    queryKey: ["/api/schools/pending"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/schools/pending");
        return res.json();
      } catch (e) {
        return { pending: [] };
      }
    },
    enabled: user?.role === "Admin" || user?.role === "PO",
  });

  const pendingSchools = pendingSchoolsData?.pending || [];

  // Approved staff for blocking/unblocking (PO and Admin only)
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/users/staff"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users/staff");
        return res.json();
      } catch (e) {
        return { staff: [] };
      }
    },
    enabled: user?.role === "PO" || user?.role === "Admin",
  });

  const approvedStaff = staffData?.staff || [];

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return apiRequest("POST", `/api/users/${userId}/block`, { reason });
    },
    onSuccess: () => {
      toast({ title: "User blocked", description: "The user account has been blocked and they have been logged out." });
      queryClient.invalidateQueries({ queryKey: ["/api/users/staff"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
      setIsBlockOpen(false);
      setSelectedStaff(null);
      setBlockReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to block user", variant: "destructive" });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/users/${userId}/unblock`, {});
    },
    onSuccess: () => {
      toast({ title: "User unblocked", description: "The user account has been unblocked and they can now log in." });
      queryClient.invalidateQueries({ queryKey: ["/api/users/staff"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to unblock user", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (cardId: string) => {
      return apiRequest("PUT", `/api/annual-cards/${cardId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Health card approved",
        description: "The health card has been approved.",
      });
      // Invalidate related queries so all views update immediately
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/students"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setIsViewOpen(false);
      setSelectedCard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve health card",
        variant: "destructive",
      });
    },
  });

  // Mutations for user approval
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/approvals/${userId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "User approved", description: "The user account has been approved." });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve user", variant: "destructive" });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return apiRequest("POST", `/api/approvals/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({ title: "User rejected", description: "The user account has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
      setIsUserRejectOpen(false);
      setIsUserViewOpen(false);
      setSelectedUser(null);
      setUserRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject user", variant: "destructive" });
    },
  });

  // Mutations for school approval
  const approveSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return apiRequest("POST", `/api/schools/${schoolId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "School approved", description: "The school has been approved and is now active." });
      queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/schools"], exact: false });
      setIsSchoolViewOpen(false);
      setSelectedSchool(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve school", variant: "destructive" });
    },
  });

  const rejectSchoolMutation = useMutation({
    mutationFn: async ({ schoolId, reason }: { schoolId: string; reason?: string }) => {
      return apiRequest("POST", `/api/schools/${schoolId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({ title: "School rejected", description: "The school request has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/schools"], exact: false });
      setIsSchoolRejectOpen(false);
      setIsSchoolViewOpen(false);
      setSelectedSchool(null);
      setSchoolRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject school", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ cardId, reason }: { cardId: string; reason: string }) => {
      return apiRequest("PUT", `/api/annual-cards/${cardId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Health card rejected",
        description: "The health card has been rejected.",
      });
      // Invalidate all related queries across all views with partial matching
      queryClient.invalidateQueries({ queryKey: ["/api/annual-cards"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/students"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/headmaster/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/po/dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"], exact: false });
      setIsRejectOpen(false);
      setIsViewOpen(false);
      setSelectedCard(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject health card",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (selectedCard) {
      approveMutation.mutate(selectedCard.id);
    }
  };

  const handleReject = () => {
    if (selectedCard && rejectionReason.trim()) {
      rejectMutation.mutate({ cardId: selectedCard.id, reason: rejectionReason });
    }
  };

  const schoolInfo = user?.schoolName ? `${user.schoolName}${user.district ? ` • ${user.district}` : ''}` : '';

  return (
    <AppLayout title="Pending Approvals">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              {user?.role === "PO" ? "School & Headmaster Approvals" : user?.role === "Admin" ? "Admin Approval Center" : "Health Card Approvals"}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{user?.fullName}</span>
              </div>
              {schoolInfo && (
                <div className="flex items-center gap-1">
                  <School className="h-4 w-4" />
                  <span>{schoolInfo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {user?.role === "PO" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h2 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">PO Management Dashboard</h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As a Program Officer, you can approve Headmaster registrations, school requests, and manage staff accounts within your district.
            </p>
          </div>
        )}

        {user?.role === "PO" || user?.role === "Admin" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
              <TabsTrigger value="staff">Manage Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6 mt-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {user?.role === "PO" ? "Pending Headmaster Registrations" : "Pending Account Registrations"}
                </h2>
                <p className="text-muted-foreground">
                  {user?.role === "PO" 
                    ? "Review new Headmaster account registration requests in your district"
                    : "Review new account registration requests"
                  }
                </p>

                {isLoadingUsers ? (
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <Card className="mt-4">
                    <CardContent className="py-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending user registrations</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {pendingUsers.map((u: any) => (
                      <Card key={u.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {u.fullName?.slice(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-foreground">{u.fullName}</h4>
                                <p className="text-sm text-muted-foreground">{u.role}</p>
                              </div>
                            </div>
                            <StatusBadge status="Pending" size="sm" />
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="text-sm text-muted-foreground">
                              <strong>Email:</strong> {u.email}
                            </div>
                            {u.district && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>District: {u.district}</span>
                              </div>
                            )}
                            {u.schoolId && (
                              <div className="text-sm text-muted-foreground">
                                <strong>School ID:</strong> {u.schoolId}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                Requested: {u.requestedAt ? new Date(u.requestedAt).toLocaleString() : new Date(u.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsUserViewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => approveUserMutation.mutate(u.id)} 
                              disabled={approveUserMutation.isPending}
                            >
                              {approveUserMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="schools" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold">
                  {user?.role === "PO" ? "Pending School Requests (Your District)" : "Pending School Requests"}
                </h3>
                <p className="text-muted-foreground">
                  {user?.role === "PO" 
                    ? "Review and approve or reject school addition requests in your district"
                    : "Review and approve or reject school addition requests"
                  }
                </p>
                {isLoadingPendingSchools ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : pendingSchools.length === 0 ? (
                  <Card className="mt-4">
                    <CardContent className="py-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending school requests</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {pendingSchools.map((school: any) => (
                      <Card key={school.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <School className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">{school.name}</h4>
                                <p className="text-sm text-muted-foreground">{school.schoolType} School</p>
                              </div>
                            </div>
                            <StatusBadge status="Pending" size="sm" />
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{school.district} • {school.block}</span>
                            </div>
                            {school.address && (
                              <div className="text-sm text-muted-foreground">
                                {school.address}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                Requested {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : "Recently"}
                              </span>
                            </div>
                            {(school.contactEmail || school.contactPhone) && (
                              <div className="text-sm text-muted-foreground">
                                Contact: {school.contactEmail || '—'} / {school.contactPhone || '—'}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setSelectedSchool(school);
                                setIsSchoolViewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => approveSchoolMutation.mutate(school.id)}
                              disabled={approveSchoolMutation.isPending}
                            >
                              {approveSchoolMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="staff" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold">Staff Account Management</h3>
                <p className="text-muted-foreground">
                  Block or unblock staff accounts. Blocked users are immediately logged out and cannot log in.
                </p>
                {isLoadingStaff ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : approvedStaff.length === 0 ? (
                  <Card className="mt-4">
                    <CardContent className="py-6 text-center">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No staff accounts found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {approvedStaff.map((staff: any) => (
                      <Card key={staff.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={staff.isBlocked ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}>
                                  {staff.fullName?.slice(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-foreground">{staff.fullName}</h4>
                                <p className="text-sm text-muted-foreground">{staff.role}</p>
                              </div>
                            </div>
                            {staff.isBlocked ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Ban className="h-3 w-3" />
                                Blocked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="text-sm text-muted-foreground">
                              <strong>Email:</strong> {staff.email}
                            </div>
                            {staff.district && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>District: {staff.district}</span>
                              </div>
                            )}
                            {staff.isBlocked && staff.blockReason && (
                              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                                <div className="flex items-start gap-2">
                                  <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-red-800 dark:text-red-200">Block Reason:</p>
                                    <p className="text-red-700 dark:text-red-300">{staff.blockReason}</p>
                                    {staff.blockedAt && (
                                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Blocked: {new Date(staff.blockedAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {staff.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => unblockUserMutation.mutate(staff.id)}
                                disabled={unblockUserMutation.isPending}
                              >
                                {unblockUserMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Unlock className="h-4 w-4 mr-1" />
                                )}
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedStaff(staff);
                                  setIsBlockOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Block Account
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {showHealthCardApprovals && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pending Health Card Submissions</h2>
                <p className="text-muted-foreground">
                  Review and approve or reject pending health card submissions
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {showHealthCardApprovals && (
                  <>
                    {pendingCards.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
                          <h3 className="text-xl font-semibold text-foreground mb-2">All Caught Up!</h3>
                          <p className="text-muted-foreground text-center">
                            No pending health cards require your approval at this time.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingCards.map((card: any) => (
                          <Card key={card.id} className="hover-elevate" data-testid={`card-${card.id}`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {card.nameOfChild?.slice(0, 2).toUpperCase() || "ST"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-foreground">{card.nameOfChild}</p>
                                    <p className="text-sm text-muted-foreground">Class {card.classSection}</p>
                                  </div>
                                </div>
                                <StatusBadge status="Pending" size="sm" />
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Activity className="h-4 w-4 text-muted-foreground" />
                                  <span>BMI: {card.bmi ? parseFloat(card.bmi).toFixed(1) : "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Heart className="h-4 w-4 text-muted-foreground" />
                                  <span>BP: {card.sbp}/{card.dbp || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    Submitted {card.dateOfEntry ? new Date(card.dateOfEntry).toLocaleDateString() : "Recently"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedCard(card);
                                    setIsViewOpen(true);
                                  }}
                                  data-testid={`button-view-${card.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedCard(card);
                                    approveMutation.mutate(card.id);
                                  }}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${card.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Health Card Dialogs - Only for non-PO roles */}
      {showHealthCardApprovals && (
        <>
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Health Card Review</DialogTitle>
                <DialogDescription>
                  Review the health card details before approval
                </DialogDescription>
              </DialogHeader>

              {selectedCard && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {selectedCard.nameOfChild?.slice(0, 2).toUpperCase() || "ST"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedCard.nameOfChild}</h3>
                      <p className="text-muted-foreground">
                        Class {selectedCard.classSection} • {selectedCard.gender === "M" ? "Male" : selectedCard.gender === "F" ? "Female" : "Other"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Age: {selectedCard.ageYears ?? "N/A"} years {selectedCard.ageMonths ?? "N/A"} months
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Anthropometrics</h4>
                      <div className="space-y-1">
                        <p><span className="font-medium">Weight:</span> {selectedCard.weightKg} kg</p>
                        <p><span className="font-medium">Height:</span> {selectedCard.heightCm} cm</p>
                        <p><span className="font-medium">BMI:</span> {selectedCard.bmi ? parseFloat(selectedCard.bmi).toFixed(1) : "N/A"}</p>
                        <p><span className="font-medium">Blood Pressure:</span> {selectedCard.sbp}/{selectedCard.dbp}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Vision</h4>
                      <div className="space-y-1">
                        <p><span className="font-medium">Right Eye:</span> {selectedCard.visionRight || "N/A"}</p>
                        <p><span className="font-medium">Left Eye:</span> {selectedCard.visionLeft || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {selectedCard.deficiencies && selectedCard.deficiencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Deficiencies</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(selectedCard.deficiencies) ? selectedCard.deficiencies : []).map((d: string, i: number) => (
                          <Badge key={i} variant="outline">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCard.referralRecommended && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Referral Recommended</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Facility: {selectedCard.referralFacility || "Not specified"}
                      </p>
                    </div>
                  )}

                  {selectedCard.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                      <p className="text-sm">{selectedCard.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  onClick={() => setIsRejectOpen(true)}
                  data-testid="button-reject-modal"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-modal"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Health Card</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejection. This will be shared with the class teacher.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-rejection-reason"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* User Detail View Dialog */}
      <Dialog open={isUserViewOpen} onOpenChange={setIsUserViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Registration Review</DialogTitle>
            <DialogDescription>
              Review the user registration details before approval
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedUser.fullName?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-muted-foreground">{selectedUser.role}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {selectedUser.requestedAt ? new Date(selectedUser.requestedAt).toLocaleString() : new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h4>
                  <div className="space-y-1">
                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                    <p><span className="font-medium">Username:</span> {selectedUser.username}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Assignment Details</h4>
                  <div className="space-y-1">
                    {selectedUser.district && (
                      <p><span className="font-medium">District:</span> {selectedUser.district}</p>
                    )}
                    {selectedUser.schoolId && (
                      <p><span className="font-medium">School ID:</span> {selectedUser.schoolId}</p>
                    )}
                    {selectedUser.classSection && (
                      <p><span className="font-medium">Class Section:</span> {selectedUser.classSection}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Review Required</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Please verify that this {selectedUser.role} registration is legitimate and the details are correct before approving.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => {
                setIsUserViewOpen(false);
                setIsUserRejectOpen(true);
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  approveUserMutation.mutate(selectedUser.id);
                }
              }}
              disabled={approveUserMutation.isPending}
            >
              {approveUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Rejection Dialog */}
      <Dialog open={isUserRejectOpen} onOpenChange={setIsUserRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={userRejectionReason}
            onChange={(e) => setUserRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedUser) {
                  rejectUserMutation.mutate({ 
                    userId: selectedUser.id, 
                    reason: userRejectionReason.trim() || `Rejected by ${user?.role?.toLowerCase()}` 
                  });
                }
              }}
              disabled={rejectUserMutation.isPending}
            >
              {rejectUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Detail View Dialog */}
      <Dialog open={isSchoolViewOpen} onOpenChange={setIsSchoolViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>School Registration Review</DialogTitle>
            <DialogDescription>
              Review the school registration details before approval
            </DialogDescription>
          </DialogHeader>

          {selectedSchool && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <School className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedSchool.name}</h3>
                  <p className="text-muted-foreground">{selectedSchool.schoolType} School</p>
                  <p className="text-sm text-muted-foreground">
                    Requested: {selectedSchool.createdAt ? new Date(selectedSchool.createdAt).toLocaleString() : "Recently"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Location Details</h4>
                  <div className="space-y-1">
                    <p><span className="font-medium">District:</span> {selectedSchool.district}</p>
                    <p><span className="font-medium">Block:</span> {selectedSchool.block}</p>
                    {selectedSchool.region && (
                      <p><span className="font-medium">Region:</span> {selectedSchool.region}</p>
                    )}
                    {selectedSchool.address && (
                      <p><span className="font-medium">Address:</span> {selectedSchool.address}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h4>
                  <div className="space-y-1">
                    <p><span className="font-medium">Email:</span> {selectedSchool.contactEmail || "Not provided"}</p>
                    <p><span className="font-medium">Phone:</span> {selectedSchool.contactPhone || "Not provided"}</p>
                    {selectedSchool.requestedByEmail && (
                      <p><span className="font-medium">Requested by:</span> {selectedSchool.requestedByEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedSchool.code && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">School Code</h4>
                  <p className="font-mono text-sm bg-muted p-2 rounded">{selectedSchool.code}</p>
                </div>
              )}

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Review Required</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Please verify that this school registration is legitimate and all details are correct before approving.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => {
                setIsSchoolViewOpen(false);
                setIsSchoolRejectOpen(true);
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (selectedSchool) {
                  approveSchoolMutation.mutate(selectedSchool.id);
                }
              }}
              disabled={approveSchoolMutation.isPending}
            >
              {approveSchoolMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Rejection Dialog */}
      <Dialog open={isSchoolRejectOpen} onOpenChange={setIsSchoolRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject School Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={schoolRejectionReason}
            onChange={(e) => setSchoolRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSchoolRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSchool) {
                  rejectSchoolMutation.mutate({ 
                    schoolId: selectedSchool.id, 
                    reason: schoolRejectionReason.trim() || `Rejected by ${user?.role?.toLowerCase()}` 
                  });
                }
              }}
              disabled={rejectSchoolMutation.isPending}
            >
              {rejectSchoolMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User Account</DialogTitle>
            <DialogDescription>
              This user will be immediately logged out and prevented from logging in. Please provide a reason for blocking.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedStaff.fullName?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedStaff.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedStaff.role} • {selectedStaff.email}</p>
                </div>
              </div>
            </div>
          )}
          <Textarea
            placeholder="Enter reason for blocking this account..."
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedStaff) {
                  blockUserMutation.mutate({ 
                    userId: selectedStaff.id, 
                    reason: blockReason.trim() || "Blocked by administrator" 
                  });
                }
              }}
              disabled={blockUserMutation.isPending}
            >
              {blockUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Block Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

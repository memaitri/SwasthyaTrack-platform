import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
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
} from "lucide-react";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Pending health cards (existing behavior)
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/annual-cards", "Pending"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", "Pending");
      const res = await apiRequest("GET", `/api/annual-cards?${params}`);
      return res.json();
    },
  });

  const pendingCards = data?.cards || [];

  // Pending user accounts for this headmaster (new)
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
    enabled: true,
  });

  const pendingUsers = userPendingData?.pending || [];

  // Admin: pending school requests
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
    enabled: user?.role === "Admin",
  });

  const pendingSchools = pendingSchoolsData?.pending || [];

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
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject user", variant: "destructive" });
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
              Health Card Approvals
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

        {user?.role !== "Admin" && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pending Submissions</h2>
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
            {user?.role === "Admin" && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Pending School Requests</h3>
                <p className="text-muted-foreground">Review and approve or reject school addition requests</p>
                {isLoadingPendingSchools ? (
                  <div className="mt-4">Loading...</div>
                ) : pendingSchools.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded mt-4">
                    <p className="text-emerald-700">No pending school requests</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {pendingSchools.map((s: any) => (
                      <div key={s.id} className="p-4 border rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-sm text-muted-foreground">{s.district} • {s.block}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={async () => {
                              try {
                                await apiRequest("POST", `/api/schools/${s.id}/approve`, {});
                                queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
                                queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.id], exact: true });
                                toast({ title: "School approved", description: "The school has been approved." });
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message || "Failed to approve school", variant: "destructive" });
                              }
                            }}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={async () => {
                              try {
                                await apiRequest("POST", `/api/schools/${s.id}/reject`, {});
                                queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
                                toast({ title: "School rejected", description: "The school has been rejected." });
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message || "Failed to reject school", variant: "destructive" });
                              }
                            }}>
                              Reject
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{s.address}</div>
                        <div className="mt-2 text-sm">Contact: {s.contactEmail || '—'} / {s.contactPhone || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Pending Account Registrations</h2>
              <p className="text-muted-foreground">Review new account registration requests for your school</p>

              {isLoadingUsers ? (
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <Card className="mt-4">
                  <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground">No pending user registrations</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {pendingUsers.map((u: any) => (
                    <Card key={u.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{u.fullName} <span className="text-sm text-muted-foreground">({u.role})</span></p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          <p className="text-xs text-muted-foreground">Requested: {u.requestedAt ? new Date(u.requestedAt).toLocaleString() : new Date(u.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveUserMutation.mutate(u.id)} disabled={approveUserMutation.isPending}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectUserMutation.mutate({ userId: u.id, reason: "Rejected by headmaster" })} disabled={rejectUserMutation.isPending}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Continue showing health card approvals below */}
            {pendingCards.length === 0 ? (
              user?.role === "Admin" ? null : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground text-center">
                      No pending health cards require your approval at this time.
                    </p>
                  </CardContent>
                </Card>
              )
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
      </div>

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
    </AppLayout>
  );
}

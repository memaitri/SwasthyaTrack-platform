import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, XCircle, School } from "lucide-react";

export default function PendingSchoolsPage() {
  const { toast } = useToast();
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/schools/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/schools/pending");
      return res.json();
    },
  });

  const pending = data?.pending || [];

  const { user } = useAuth();

  const approveMutation = useMutation({
    mutationFn: async (schoolId: string) => apiRequest("POST", `/api/schools/${schoolId}/approve`, {}),
    onSuccess: () => {
      toast({ title: "School approved", description: "The school has been approved and is now active." });
      queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.id], exact: true });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve school", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => apiRequest("POST", `/api/schools/${id}/reject`, { reason }),
    onSuccess: () => {
      toast({ title: "School rejected", description: "The school request has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/schools/pending"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.id], exact: true });
      setIsRejectOpen(false);
      setSelectedSchool(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject school", variant: "destructive" });
    },
  });

  return (
    <AppLayout title="Pending School Requests">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <School className="h-8 w-8 text-sky-600" />
              Pending School Requests
            </h1>
            <p className="text-muted-foreground mt-1">Review requested schools and approve or reject them</p>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div>Loading...</div>
          ) : pending.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded">
              <p className="text-emerald-700">No pending school requests</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map((s: any) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-sm text-muted-foreground">{s.district} • {s.block}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate(s.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setSelectedSchool(s); setIsRejectOpen(true); }}>
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">{s.address}</div>
                    <div className="mt-2 text-sm">Contact: {s.contactEmail || '—'} / {s.contactPhone || '—'}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {isRejectOpen && selectedSchool && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold">Reject {selectedSchool.name}</h3>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason((e.target as HTMLTextAreaElement).value)} placeholder="Reason for rejection (optional)" />
              <div className="flex items-center gap-2 mt-4 justify-end">
                <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: selectedSchool.id, reason: rejectionReason })}>Reject</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

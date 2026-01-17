import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  FileText,
  Clock,
  User,
  Eye,
  Send,
  Download
} from "lucide-react";

interface SharedReport {
  id: string;
  reportType: string;
  sharedBy: string;
  sharedAt: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ShareReportDialogProps {
  reportType: string;
  reportTitle: string;
  reportData: any;
  onShare: (shareData: any) => void;
}

function ShareReportDialog({ reportType, reportTitle, reportData, onShare }: ShareReportDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [expiresIn, setExpiresIn] = useState("7"); // days
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Get list of users to share with (filter by appropriate roles)
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?limit=100");
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
    enabled: isOpen
  });

  const handleShare = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user to share with",
        variant: "destructive"
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

    onShare({
      reportType,
      reportData,
      sharedWith: selectedUsers,
      message,
      expiresAt: expiresAt.toISOString()
    });

    setIsOpen(false);
    setSelectedUsers([]);
    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          {reportTitle}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share {reportTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Share with users:</label>
            {usersLoading && (
              <div className="text-sm text-muted-foreground">Loading users...</div>
            )}
            {usersError && (
              <div className="text-sm text-red-500">Error loading users. Please try again.</div>
            )}
            {!usersLoading && !usersError && (
              <Select onValueChange={(userId) => {
                if (!selectedUsers.includes(userId)) {
                  setSelectedUsers([...selectedUsers, userId]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select users..." />
                </SelectTrigger>
                <SelectContent>
                  {users?.users?.length > 0 ? (
                    users.users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName || user.username} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No users available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            
            {selectedUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUsers.map((userId) => {
                  const user = users?.users?.find((u: any) => u.id === userId);
                  return (
                    <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                      {user?.fullName || user?.username || 'Unknown User'}
                      <button
                        onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                        className="ml-1 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Message (optional):</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for the recipients..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Expires in:</label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleShare} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Share Report
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SharedReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get shared reports for current user
  const { data: sharedReports, isLoading } = useQuery({
    queryKey: ["/api/reports/shared"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reports/shared");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Share report mutation
  const shareReportMutation = useMutation({
    mutationFn: async (shareData: any) => {
      const res = await apiRequest("POST", "/api/reports/share", shareData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report shared successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/shared"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to share report",
        variant: "destructive"
      });
    }
  });

  // Access shared report mutation
  const accessReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("GET", `/api/reports/shared/${reportId}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Accessed",
        description: `Opened ${data.reportType} report from ${data.sharedBy}`,
      });
      // In production, open the report in a modal or new tab
      console.log("Report data:", data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to access report",
        variant: "destructive"
      });
    }
  });

  const handleShareReport = (shareData: any) => {
    shareReportMutation.mutate(shareData);
  };

  const handleAccessReport = (reportId: string) => {
    accessReportMutation.mutate(reportId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reports = sharedReports?.reports || [];

  return (
    <div className="space-y-6">
      {/* Share New Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ShareReportDialog
              reportType="menstrual-health"
              reportTitle="Menstrual Health Report"
              reportData={{ type: "menstrual-health", generated: new Date().toISOString() }}
              onShare={handleShareReport}
            />
            <ShareReportDialog
              reportType="health-overview"
              reportTitle="Health Overview Report"
              reportData={{ type: "health-overview", generated: new Date().toISOString() }}
              onShare={handleShareReport}
            />
            <ShareReportDialog
              reportType="referrals"
              reportTitle="Referral Management Report"
              reportData={{ type: "referrals", generated: new Date().toISOString() }}
              onShare={handleShareReport}
            />
            <ShareReportDialog
              reportType="demographics"
              reportTitle="Student Demographics Report"
              reportData={{ type: "demographics", generated: new Date().toISOString() }}
              onShare={handleShareReport}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shared Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports Shared With You ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports have been shared with you yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: SharedReport) => (
                <div
                  key={report.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    report.isRead ? 'bg-background' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <h4 className="font-semibold">{report.title}</h4>
                        {!report.isRead && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {report.sharedBy}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(report.sharedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {report.message && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccessReport(report.id)}
                        disabled={accessReportMutation.isPending}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // In production, trigger download of the shared report
                          toast({
                            title: "Download Started",
                            description: "Report download will begin shortly",
                          });
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SharedReports;
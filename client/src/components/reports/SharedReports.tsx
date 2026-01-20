import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Clock,
  User,
  Eye,
  Download
} from "lucide-react";

interface SharedReport {
  id: string;
  reportId?: string; // Actual report ID for viewing/downloading
  reportType: string;
  reportFormat?: string;
  sharedBy: string;
  sharedAt: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: string;
}

export function SharedReports() {
  const { toast } = useToast();

  // Get role-based reports for current user (Phase-1: No user-to-user sharing)
  const { data: sharedReports, isLoading } = useQuery({
    queryKey: ["/api/reports/shared"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reports/shared");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleViewReport = (reportId: string) => {
    // Open report in new tab for viewing
    const viewUrl = `/api/reports/view/${reportId}`;
    window.open(viewUrl, '_blank');
  };

  const handleDownloadReport = (reportId: string, fileName: string) => {
    // Trigger download
    const downloadUrl = `/api/reports/download/${reportId}`;
    window.location.href = downloadUrl;
    
    toast({
      title: "Download Started",
      description: "Report download has begun",
    });
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
      {/* Phase-1 Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Reports (Phase-1)
          </CardTitle>
          <CardDescription>
            Role-based access enabled. Reports are available based on your user role.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports available for your role yet.</p>
              <p className="text-sm mt-2">Reports will appear here when generated.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: SharedReport) => (
                <div
                  key={report.id}
                  className="p-4 border rounded-lg bg-background"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <h4 className="font-semibold">{report.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {report.reportFormat || 'PDF'}
                        </Badge>
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
                        {report.fileSize && (
                          <div className="text-xs">
                            {Math.round(report.fileSize / 1024)} KB
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {report.message}
                      </p>
                    </div>
                    
                    {/* Always show View & Download buttons for Phase-1 */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewReport(report.reportId || report.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport(report.reportId || report.id, report.fileName || `${report.reportType}-report.pdf`)}
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
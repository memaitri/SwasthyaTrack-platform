import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  isEligibleForMenstrualTracking, 
  isMenstruationAlreadyMarked, 
  formatMenstruationStatus,
  canMarkMenstruationStarted 
} from "@/lib/menstrualHealthUtils";
import { formatGenderDisplay } from "@/lib/genderUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  gender: 'M' | 'F' | 'O';
  dateOfBirth?: string;
  classSection: string;
  menstruationStartedAt?: string;
  menstruationMarkedBy?: string;
}

interface MenstrualTrackingStatusProps {
  student: Student;
  userRole: string;
  compact?: boolean;
}

export function MenstrualTrackingStatus({ 
  student, 
  userRole, 
  compact = false 
}: MenstrualTrackingStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEligible = isEligibleForMenstrualTracking(student);
  const isMarked = isMenstruationAlreadyMarked(student);
  const canMark = canMarkMenstruationStarted(userRole);
  const status = formatMenstruationStatus(student);

  const markMenstruationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/students/${student.id}/mark-menstruation`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Menstruation Marked",
        description: "Student is now eligible for menstrual health tracking by Lady Superintendent.",
      });
      
      // Invalidate all related queries for automatic propagation
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lady-superintendent/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark menstruation",
        variant: "destructive",
      });
    },
  });

  if (!isEligible) {
    if (compact) {
      return (
        <Badge variant="secondary" className="text-xs">
          N/A
        </Badge>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isMarked ? (
          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Marked
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Not Marked
          </Badge>
        )}
        {canMark && !isMarked && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markMenstruationMutation.mutate()}
            disabled={markMenstruationMutation.isPending}
            className="h-6 px-2 text-xs"
          >
            Mark
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-pink-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pink-600" />
          Menstrual Health Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          {isMarked ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {status}
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              {status}
            </Badge>
          )}
        </div>

        {isMarked && student.menstruationStartedAt && (
          <div className="text-xs text-gray-500">
            Marked on: {new Date(student.menstruationStartedAt).toLocaleDateString()}
          </div>
        )}

        {!isMarked && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              This female student (age 10+) is eligible for menstrual health tracking.
            </p>
            {canMark ? (
              <Button
                size="sm"
                onClick={() => markMenstruationMutation.mutate()}
                disabled={markMenstruationMutation.isPending}
                className="w-full"
              >
                {markMenstruationMutation.isPending ? (
                  "Marking..."
                ) : (
                  "Mark Menstruation Started"
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                Only Class Teachers can mark menstruation as started
              </div>
            )}
          </div>
        )}

        {isMarked && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            ✓ Student is now visible in Lady Superintendent dashboard for menstrual health tracking
          </div>
        )}
      </CardContent>
    </Card>
  );
}
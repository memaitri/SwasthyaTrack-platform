import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Activity, 
  Utensils, 
  Calendar, 
  Stethoscope,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CriticalReason {
  category: 'health' | 'nutrition' | 'attendance' | 'medical';
  severity: 'high' | 'medium' | 'low';
  description: string;
  value?: string | number;
  threshold?: string | number;
}

interface CriticalStudent {
  studentId: string;
  studentName: string;
  schoolId: string;
  schoolName: string;
  classSection: string;
  gender: string;
  age?: number;
  isCritical: boolean;
  reasons: CriticalReason[];
  lastUpdated: string;
  priorityScore: number;
}

interface CriticalStudentsListProps {
  schoolType?: string;
  minPriorityScore?: number;
  limit?: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'health':
      return <Activity className="h-4 w-4" />;
    case 'nutrition':
      return <Utensils className="h-4 w-4" />;
    case 'attendance':
      return <Calendar className="h-4 w-4" />;
    case 'medical':
      return <Stethoscope className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getPriorityColor = (score: number) => {
  if (score >= 70) return 'text-red-600 dark:text-red-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-yellow-600 dark:text-yellow-400';
};

export function CriticalStudentsList({ 
  schoolType = 'All', 
  minPriorityScore = 0,
  limit = 50 
}: CriticalStudentsListProps) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['critical-students', schoolType, minPriorityScore, limit],
    queryFn: async () => {
      console.log('[CriticalStudentsList] Fetching critical students...', { schoolType, minPriorityScore, limit });
      
      const params = new URLSearchParams({
        schoolType,
        minPriorityScore: minPriorityScore.toString(),
        limit: limit.toString(),
      });
      
      console.log('[CriticalStudentsList] API URL:', `/api/po/critical-students?${params}`);
      
      const res = await apiRequest("GET", `/api/po/critical-students?${params}`);
      
      console.log('[CriticalStudentsList] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CriticalStudentsList] API Error:', res.status, errorText);
        throw new Error(`Failed to fetch critical students: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[CriticalStudentsList] Data received:', data);
      console.log('[CriticalStudentsList] Critical students count:', data?.criticalStudents?.length || 0);
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const toggleStudent = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Critical Students
          </CardTitle>
          <CardDescription>Loading critical students data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('[CriticalStudentsList] Error state:', error);
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Critical Students
          </CardTitle>
          <CardDescription className="text-red-500">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Please check:</p>
            <ul className="list-disc ml-5 mt-2">
              <li>You are logged in as a PO user</li>
              <li>Your district is assigned correctly</li>
              <li>The server is running</li>
            </ul>
            <p className="mt-3">Open browser console (F12) for more details.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('[CriticalStudentsList] Render - data:', data);
  const criticalStudents: CriticalStudent[] = data?.criticalStudents || [];
  console.log('[CriticalStudentsList] Render - criticalStudents:', criticalStudents.length);

  if (criticalStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-green-500" />
            Critical Students
          </CardTitle>
          <CardDescription>No critical students identified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium text-green-600 dark:text-green-400">
              ✓ All students are within healthy parameters
            </p>
            <p className="text-sm mt-2">
              No students currently require immediate attention based on health, nutrition, or attendance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Critical Students
              <Badge variant="destructive" className="ml-2">
                {criticalStudents.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Students requiring immediate attention based on health, nutrition, and attendance metrics
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {criticalStudents.map((student) => {
            const isExpanded = expandedStudents.has(student.studentId);
            
            return (
              <Collapsible
                key={student.studentId}
                open={isExpanded}
                onOpenChange={() => toggleStudent(student.studentId)}
              >
                <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-start justify-between cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-base">{student.studentName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : 'Other'}
                            {student.age && `, ${student.age}y`}
                          </Badge>
                          <Badge 
                            variant={student.priorityScore >= 70 ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            Priority: {student.priorityScore}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">School:</span> {student.schoolName}
                          </p>
                          <p>
                            <span className="font-medium">Class:</span> {student.classSection}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {student.reasons.slice(0, 3).map((reason, idx) => (
                              <Badge 
                                key={idx} 
                                variant={getSeverityColor(reason.severity)}
                                className="text-xs"
                              >
                                {getCategoryIcon(reason.category)}
                                <span className="ml-1">{reason.description}</span>
                              </Badge>
                            ))}
                            {student.reasons.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{student.reasons.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="ml-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <h5 className="font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Detailed Reasons for Critical Status
                      </h5>
                      
                      <div className="space-y-2">
                        {student.reasons.map((reason, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-md"
                          >
                            <div className="mt-0.5">
                              {getCategoryIcon(reason.category)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm capitalize">
                                  {reason.category}
                                </span>
                                <Badge 
                                  variant={getSeverityColor(reason.severity)}
                                  className="text-xs"
                                >
                                  {reason.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {reason.description}
                              </p>
                              {(reason.value !== undefined || reason.threshold !== undefined) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {reason.value !== undefined && (
                                    <span>Current: <strong>{reason.value}</strong></span>
                                  )}
                                  {reason.threshold !== undefined && (
                                    <span className="ml-2">
                                      Threshold: <strong>{reason.threshold}</strong>
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                        <span>
                          Last Updated: {new Date(student.lastUpdated).toLocaleString()}
                        </span>
                        <Button variant="ghost" size="sm" className="h-auto p-0 hover:underline">
                          View Full Profile
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
        
        {data?.metadata && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <p>
              Showing {criticalStudents.length} critical student{criticalStudents.length !== 1 ? 's' : ''} 
              {data.metadata.schoolType !== 'All' && ` from ${data.metadata.schoolType} schools`}
              {data.metadata.minPriorityScore > 0 && ` with priority score ≥ ${data.metadata.minPriorityScore}`}
            </p>
            <p className="mt-1">
              Generated at: {new Date(data.metadata.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

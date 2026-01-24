import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ArrowDown, Clock, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface AcademicAction {
  id: string;
  actionType: 'Promote' | 'Demote' | 'Detain';
  oldStatus: string;
  newStatus: string;
  oldClassSection: string;
  newClassSection: string;
  reason: string;
  academicYear: number;
  performedByRole: string;
  performedAt: string;
}

interface AcademicActionHistoryProps {
  studentId: string;
  studentName: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function AcademicActionHistory({ studentId, studentName }: AcademicActionHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-academic-actions', studentId],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}/academic-actions`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch academic action history');
      }

      return response.json();
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Promote':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'Demote':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'Detain':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Promote':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Demote':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Detain':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Active: 'default',
      Promoted: 'secondary',
      Demoted: 'destructive',
      Detained: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Academic Action History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Academic Action History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Failed to load academic action history
          </p>
        </CardContent>
      </Card>
    );
  }

  const actions = data?.actions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Academic Action History
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete history of academic actions for {studentName}
        </p>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No academic actions recorded for this student
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action: AcademicAction, index: number) => (
              <div key={action.id}>
                <div className={`p-4 rounded-lg border ${getActionColor(action.actionType)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getActionIcon(action.actionType)}
                      <span className="font-medium">{action.actionType}</span>
                      <Badge variant="outline" className="text-xs">
                        {action.academicYear}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(action.performedAt), 'MMM dd, yyyy')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Class Change</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{action.oldClassSection}</span>
                        <ArrowUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{action.newClassSection}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status Change</p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(action.oldStatus)}
                        <ArrowUp className="h-3 w-3 text-muted-foreground" />
                        {getStatusBadge(action.newStatus)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Reason</p>
                    <p className="text-sm">{action.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Performed by {action.performedByRole}</span>
                  </div>
                </div>
                {index < actions.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
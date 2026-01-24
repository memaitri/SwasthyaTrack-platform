import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Student {
  id: string;
  fullName: string;
  classSection: string;
  academicStatus: 'Active' | 'Promoted' | 'Demoted' | 'Detained';
  academicYear?: number;
}

interface StudentAcademicActionsProps {
  student: Student;
  userRole: string;
  userClassSection?: string;
  userSchoolId?: string;
}

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

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function StudentAcademicActions({ student, userRole, userClassSection, userSchoolId }: StudentAcademicActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'Promote' | 'Demote' | 'Detain' | ''>('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const queryClient = useQueryClient();

  // Check if user can perform actions
  const canPerformActions = () => {
    if (userRole === 'Admin') return true;
    if (userRole === 'Headmaster') return true;
    if (userRole === 'ClassTeacher') {
      return userClassSection === student.classSection;
    }
    return false;
  };

  // Validate academic action
  const validateAction = async (actionType: string) => {
    if (!actionType) return;
    
    setIsValidating(true);
    setValidationError('');

    try {
      const response = await fetch(`/api/students/${student.id}/validate-academic-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ actionType }),
      });

      const result = await response.json();
      
      if (!result.valid) {
        setValidationError(result.message);
      }
    } catch (error) {
      setValidationError('Failed to validate action');
    } finally {
      setIsValidating(false);
    }
  };

  // Perform academic action mutation
  const performActionMutation = useMutation({
    mutationFn: async ({ actionType, reason }: { actionType: string; reason: string }) => {
      const response = await fetch(`/api/students/${student.id}/academic-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ actionType, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to perform academic action');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', student.id] });
      setIsDialogOpen(false);
      setSelectedAction('');
      setReason('');
      setValidationError('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleActionChange = (action: 'Promote' | 'Demote' | 'Detain') => {
    setSelectedAction(action);
    validateAction(action);
  };

  const handleSubmit = () => {
    if (!selectedAction || !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please select an action and provide a reason',
        variant: 'destructive',
      });
      return;
    }

    if (reason.trim().length < 10) {
      toast({
        title: 'Error',
        description: 'Reason must be at least 10 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (validationError) {
      toast({
        title: 'Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    performActionMutation.mutate({ actionType: selectedAction, reason: reason.trim() });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Active: 'default',
      Promoted: 'secondary',
      Demoted: 'destructive',
      Detained: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

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

  if (!canPerformActions()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Academic Status
            {getStatusBadge(student.academicStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current Class: <span className="font-medium">{student.classSection}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Academic Year: <span className="font-medium">{student.academicYear || new Date().getFullYear()}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Academic Actions
            {getStatusBadge(student.academicStatus)}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Perform Action
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Academic Action for {student.fullName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(student.academicStatus)}
                    <span className="text-sm text-muted-foreground">
                      Class: {student.classSection}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action">Action Type</Label>
                  <Select value={selectedAction} onValueChange={handleActionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Promote">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          Promote
                        </div>
                      </SelectItem>
                      <SelectItem value="Demote">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4 text-red-600" />
                          Demote
                        </div>
                      </SelectItem>
                      <SelectItem value="Detain">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Detain
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Required)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide a detailed reason for this academic action (minimum 10 characters)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {reason.length}/10 characters minimum
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !selectedAction || 
                      !reason.trim() || 
                      reason.trim().length < 10 || 
                      !!validationError || 
                      isValidating ||
                      performActionMutation.isPending
                    }
                    className="flex-1"
                  >
                    {performActionMutation.isPending ? 'Processing...' : `Confirm ${selectedAction}`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedAction('');
                      setReason('');
                      setValidationError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Current Class: <span className="font-medium">{student.classSection}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Academic Year: <span className="font-medium">{student.academicYear || new Date().getFullYear()}</span>
          </p>
          {student.academicStatus !== 'Active' && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">
                Action performed this academic year
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
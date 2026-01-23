import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Calendar, Phone, GraduationCap } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { StudentAcademicActions } from '@/components/academic-actions/StudentAcademicActions';
import { AcademicActionHistory } from '@/components/academic-actions/AcademicActionHistory';
import { AcademicStatusBadge, getAcademicStatusDescription } from '@/components/academic-actions/AcademicStatusBadge';
import { formatGenderWithIcon, getGenderBadgeVariant } from '@/lib/genderUtils';
import { format } from 'date-fns';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function StudentAcademicActionsPage() {
  const { user } = useAuth();
  const [, params] = useRoute('/students/:id/academic-actions');
  const studentId = params?.id;

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student details');
      }

      return response.json();
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <AppLayout title="Academic Actions">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (error || !student) {
    return (
      <AppLayout title="Academic Actions">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Student Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The student you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/students">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const genderInfo = formatGenderWithIcon(student.gender);
  const age = student.dateOfBirth 
    ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <AppLayout title={`Academic Actions - ${student.fullName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Academic Actions</h1>
            <p className="text-muted-foreground">
              Manage academic status for {student.fullName}
            </p>
          </div>
        </div>

        {/* Student Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {student.fullName?.slice(0, 2).toUpperCase() || "ST"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{student.fullName}</h2>
                <p className="text-sm text-muted-foreground">{student.uniqueId}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  Class & Status
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{student.classSection}</p>
                  <AcademicStatusBadge 
                    status={student.academicStatus || 'Active'} 
                    showIcon={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {getAcademicStatusDescription(student.academicStatus || 'Active')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Personal Info
                </div>
                <div className="space-y-1">
                  <Badge variant={getGenderBadgeVariant(student.gender)}>
                    <span className="mr-1">{genderInfo.icon}</span>
                    {genderInfo.label}
                  </Badge>
                  {age && (
                    <p className="text-sm">{age} years old</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Academic Year
                </div>
                <p className="font-medium">
                  {student.academicYear || new Date().getFullYear()}
                </p>
                {student.enrollmentDate && (
                  <p className="text-xs text-muted-foreground">
                    Enrolled: {format(new Date(student.enrollmentDate), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Guardian Contact
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{student.fatherGuardianName}</p>
                  {student.fatherContact && (
                    <p className="text-xs text-muted-foreground">{student.fatherContact}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Academic Actions */}
          <StudentAcademicActions
            student={student}
            userRole={user?.role || ''}
            userClassSection={user?.classSection || undefined}
            userSchoolId={user?.schoolId || undefined}
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Status</span>
                  <AcademicStatusBadge status={student.academicStatus || 'Active'} />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Class</span>
                  <span className="font-medium">{student.classSection}</span>
                </div>
                {student.previousClassSection && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Previous Class</span>
                      <span className="font-medium">{student.previousClassSection}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Academic Year</span>
                  <span className="font-medium">{student.academicYear || new Date().getFullYear()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Student Status</span>
                  <Badge variant={student.isActive ? 'default' : 'secondary'}>
                    {student.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Action History */}
        <AcademicActionHistory 
          studentId={student.id} 
          studentName={student.fullName}
        />
      </div>
    </AppLayout>
  );
}
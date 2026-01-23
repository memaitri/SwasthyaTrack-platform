import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Clock, CheckCircle } from 'lucide-react';

interface AcademicStatusBadgeProps {
  status: 'Active' | 'Promoted' | 'Demoted' | 'Detained';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AcademicStatusBadge({ status, showIcon = false, size = 'md' }: AcademicStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Active':
        return {
          variant: 'default' as const,
          icon: <CheckCircle className="h-3 w-3" />,
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'Promoted':
        return {
          variant: 'secondary' as const,
          icon: <ArrowUp className="h-3 w-3" />,
          className: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'Demoted':
        return {
          variant: 'destructive' as const,
          icon: <ArrowDown className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      case 'Detained':
        return {
          variant: 'outline' as const,
          icon: <Clock className="h-3 w-3" />,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      default:
        return {
          variant: 'default' as const,
          icon: <CheckCircle className="h-3 w-3" />,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${sizeClasses[size]} ${showIcon ? 'flex items-center gap-1' : ''}`}
    >
      {showIcon && config.icon}
      {status}
    </Badge>
  );
}

// Helper function to get status description
export function getAcademicStatusDescription(status: string): string {
  switch (status) {
    case 'Active':
      return 'Student is currently active in their assigned class';
    case 'Promoted':
      return 'Student has been promoted to the next class level';
    case 'Demoted':
      return 'Student has been demoted to a lower class level';
    case 'Detained':
      return 'Student has been detained in their current class';
    default:
      return 'Unknown academic status';
  }
}

// Helper function to get next possible actions
export function getAvailableActions(status: string): Array<'Promote' | 'Demote' | 'Detain'> {
  // All actions are available regardless of current status
  // Business logic validation happens on the backend
  return ['Promote', 'Demote', 'Detain'];
}
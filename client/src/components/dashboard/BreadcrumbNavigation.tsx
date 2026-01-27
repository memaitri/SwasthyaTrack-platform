import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDrillDown } from './DrillDownProvider';
import { cn } from '@/lib/utils';

interface BreadcrumbNavigationProps {
  className?: string;
}

export function BreadcrumbNavigation({ className }: BreadcrumbNavigationProps) {
  const { levels, drillUp, reset } = useDrillDown();

  if (levels.length <= 1) {
    return null;
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Button>
      
      {levels.map((level, index) => (
        <div key={level.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => drillUp(level.id)}
            className={cn(
              "h-8 px-2 font-medium",
              index === levels.length - 1
                ? "text-foreground cursor-default"
                : "text-muted-foreground hover:text-foreground"
            )}
            disabled={index === levels.length - 1}
          >
            {level.title}
          </Button>
        </div>
      ))}
    </nav>
  );
}
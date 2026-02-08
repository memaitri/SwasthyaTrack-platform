import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MousePointer2 } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  onClick?: () => void;
  clickable?: boolean;
}

const variantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  info: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = "default", onClick, clickable = false }: MetricCardProps) {
  const isClickable = clickable || !!onClick;
  
  return (
    <Card 
      className={cn(
        "hover-elevate transition-all",
        isClickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {isClickable && (
                <MousePointer2 className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
            <p className="text-3xl font-bold text-foreground truncate">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-sm mt-2 flex items-center gap-1",
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
                <span className="text-muted-foreground">vs last month</span>
              </p>
            )}
            {isClickable && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Click to view details →
              </p>
            )}
          </div>
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

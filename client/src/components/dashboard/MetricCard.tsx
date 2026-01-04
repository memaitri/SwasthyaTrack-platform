import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const variantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  info: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: MetricCardProps) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
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
          </div>
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

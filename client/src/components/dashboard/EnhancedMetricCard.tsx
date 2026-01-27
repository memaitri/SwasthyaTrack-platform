import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  onClick?: () => void;
  isLoading?: boolean;
  animationDelay?: number;
  showSparkline?: boolean;
  sparklineData?: number[];
}

const variantStyles = {
  default: {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
    icon: "bg-primary/10 text-primary shadow-lg shadow-primary/20",
    border: "border-slate-200 dark:border-slate-700",
    glow: "shadow-primary/10"
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-lg shadow-emerald/20",
    border: "border-emerald-200 dark:border-emerald-700",
    glow: "shadow-emerald-500/10"
  },
  warning: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 shadow-lg shadow-amber/20",
    border: "border-amber-200 dark:border-amber-700",
    glow: "shadow-amber-500/10"
  },
  danger: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20",
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-lg shadow-rose/20",
    border: "border-rose-200 dark:border-rose-700",
    glow: "shadow-rose-500/10"
  },
  info: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-lg shadow-blue/20",
    border: "border-blue-200 dark:border-blue-700",
    glow: "shadow-blue-500/10"
  },
};

export function EnhancedMetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  onClick,
  isLoading = false,
  animationDelay = 0,
  showSparkline = false,
  sparklineData = []
}: EnhancedMetricCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const styles = variantStyles[variant];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-500 ease-out cursor-pointer",
        styles.bg,
        styles.border,
        "hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20",
        "hover:-translate-y-1 hover:scale-[1.02]",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: `${animationDelay}ms`
      }}
    >
      {/* Animated background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300",
        variant === "success" && "from-emerald-400/10 to-emerald-600/10",
        variant === "warning" && "from-amber-400/10 to-amber-600/10",
        variant === "danger" && "from-rose-400/10 to-rose-600/10",
        variant === "info" && "from-blue-400/10 to-blue-600/10",
        variant === "default" && "from-primary/10 to-primary/20",
        isHovered && "opacity-100"
      )} />

      {/* Sparkline background */}
      {showSparkline && sparklineData.length > 0 && (
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              points={sparklineData.map((value, index) => 
                `${(index / (sparklineData.length - 1)) * 100},${40 - (value / Math.max(...sparklineData)) * 30}`
              ).join(' ')}
            />
          </svg>
        </div>
      )}

      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground/80 tracking-wide uppercase">
              {title}
            </p>
            
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
                {subtitle && <div className="h-4 w-16 bg-muted/30 rounded animate-pulse" />}
              </div>
            ) : (
              <>
                <p className={cn(
                  "text-3xl font-bold text-foreground transition-all duration-300",
                  isHovered && "scale-105"
                )}>
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                
                {subtitle && (
                  <p className="text-sm text-muted-foreground/70">{subtitle}</p>
                )}
                
                {trend && (
                  <div className={cn(
                    "flex items-center gap-2 text-sm transition-all duration-300",
                    trend.isPositive 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-rose-600 dark:text-rose-400",
                    isHovered && "scale-105"
                  )}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {trend.isPositive ? "+" : ""}{trend.value}%
                    </span>
                    <span className="text-muted-foreground/60">
                      {trend.period || "vs last month"}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
            styles.icon,
            isHovered && "scale-110 rotate-3"
          )}>
            <Icon className="h-7 w-7" />
          </div>
        </div>

        {/* Hover glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none",
          styles.glow,
          isHovered && "opacity-100"
        )} />
      </CardContent>
    </Card>
  );
}
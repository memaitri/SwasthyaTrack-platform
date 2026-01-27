import { type ReactNode, useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Download, 
  Maximize2, 
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChartFilter {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface EnhancedChartContainerProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  filters?: ChartFilter[];
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  onExport?: (format: 'png' | 'pdf' | 'csv') => void;
  onDrillDown?: () => void;
  onFullscreen?: () => void;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  animationDelay?: number;
  showInsights?: boolean;
  insights?: string[];
}

const chartTypeIcons = {
  bar: BarChart3,
  line: Activity,
  pie: PieChart,
  area: TrendingUp,
};

export function EnhancedChartContainer({ 
  title, 
  children, 
  isLoading, 
  filters,
  subtitle,
  trend,
  onExport,
  onDrillDown,
  onFullscreen,
  chartType = 'bar',
  animationDelay = 0,
  showInsights = false,
  insights = []
}: EnhancedChartContainerProps) {
  const [loaded, setLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const ChartIcon = chartTypeIcons[chartType];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setLoaded(true), 100);
      return () => clearTimeout(timer);
    }
    setLoaded(false);
  }, [isLoading]);

  return (
    <Card 
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden transition-all duration-500 ease-out",
        "hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20",
        "hover:-translate-y-1",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: `${animationDelay}ms`
      }}
    >
      {/* Animated gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300",
        isHovered && "opacity-100"
      )} />

      <CardHeader className="relative flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-all duration-300",
              isHovered && "scale-110 bg-primary/20"
            )}>
              <ChartIcon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
            {trend && (
              <Badge 
                variant="outline" 
                className={cn(
                  "ml-auto transition-all duration-300",
                  trend.isPositive 
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
                  isHovered && "scale-105"
                )}
              >
                <TrendingUp className={cn(
                  "mr-1 h-3 w-3",
                  !trend.isPositive && "rotate-180"
                )} />
                {trend.isPositive ? "+" : ""}{trend.value}%
              </Badge>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground/70">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {filters && filters.length > 0 && (
            <div className="flex items-center gap-2">
              {filters.map((filter) => (
                <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger className={cn(
                    "w-32 transition-all duration-200",
                    "hover:border-primary/50 focus:border-primary"
                  )}>
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "opacity-0 transition-all duration-200",
                  "group-hover:opacity-100 hover:bg-primary/10"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onDrillDown && (
                <DropdownMenuItem onClick={onDrillDown}>
                  <Filter className="mr-2 h-4 w-4" />
                  Drill Down
                </DropdownMenuItem>
              )}
              {onFullscreen && (
                <DropdownMenuItem onClick={onFullscreen}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Fullscreen
                </DropdownMenuItem>
              )}
              {onExport && (
                <>
                  <DropdownMenuItem onClick={() => onExport('png')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('csv')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-[300px] w-full rounded-lg bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 animate-pulse" />
            {showInsights && (
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted/30 rounded animate-pulse" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "transition-all duration-500 ease-out",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}>
            <div className="relative">
              {children}
              
              {/* Interactive overlay for drill-down */}
              {onDrillDown && (
                <div 
                  className={cn(
                    "absolute inset-0 bg-primary/5 opacity-0 transition-opacity duration-200 cursor-pointer rounded-lg",
                    "hover:opacity-100 flex items-center justify-center"
                  )}
                  onClick={onDrillDown}
                >
                  <div className="bg-white/90 dark:bg-black/90 px-4 py-2 rounded-lg shadow-lg">
                    <p className="text-sm font-medium">Click to drill down</p>
                  </div>
                </div>
              )}
            </div>

            {/* Insights panel */}
            {showInsights && insights.length > 0 && (
              <div className={cn(
                "mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 transition-all duration-300",
                isHovered && "bg-muted/50"
              )}>
                <h4 className="text-sm font-medium mb-2 text-foreground/80">Key Insights</h4>
                <ul className="space-y-1">
                  {insights.map((insight, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
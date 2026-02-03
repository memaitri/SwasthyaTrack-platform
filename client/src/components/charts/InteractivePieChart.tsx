import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartEvent, ActiveElement } from "chart.js";
import { Pie, Doughnut } from "react-chartjs-2";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

interface InteractivePieChartProps {
  labels?: string[];
  data?: number[];
  backgroundColor?: string[];
  borderColor?: string[];
  doughnut?: boolean;
  onSegmentClick?: (dataIndex: number, value: number, label: string, percentage: number) => void;
  onSegmentHover?: (dataIndex: number, value: number, label: string, percentage: number) => void;
  enableDrillDown?: boolean;
  showPercentages?: boolean;
  animationDuration?: number;
  centerText?: string;
  centerSubtext?: string;
}

export function InteractivePieChart({ 
  labels, 
  data, 
  backgroundColor, 
  borderColor, 
  doughnut = false,
  onSegmentClick,
  onSegmentHover,
  enableDrillDown = false,
  showPercentages = true,
  animationDuration = 1000,
  centerText,
  centerSubtext
}: InteractivePieChartProps) {
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [clickedElement, setClickedElement] = useState<number | null>(null);
  const chartRef = useRef<any>(null);

  // Provide default values to prevent runtime errors
  const safeLabels = labels || [];
  const safeData = data || [];
  const safeBackgroundColor = backgroundColor || [];

  // Show empty state if no data is provided
  if (safeLabels.length === 0 || safeData.length === 0 || safeBackgroundColor.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-muted/30 border-t-primary animate-spin" />
          <p className="text-sm font-medium">Loading chart data...</p>
          <p className="text-xs">Interactive features will be available once data loads</p>
        </div>
      </div>
    );
  }

  const total = safeData.reduce((sum, value) => sum + value, 0);

  const handleClick = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && onSegmentClick) {
      const element = elements[0];
      const dataIndex = element.index;
      const value = safeData[dataIndex];
      const label = safeLabels[dataIndex];
      const percentage = (value / total) * 100;
      
      setClickedElement(dataIndex);
      onSegmentClick(dataIndex, value, label, percentage);
      
      // Reset clicked state after animation
      setTimeout(() => setClickedElement(null), 300);
    }
  }, [onSegmentClick, safeData, safeLabels, total]);

  const handleHover = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0) {
      const element = elements[0];
      const dataIndex = element.index;
      const value = safeData[dataIndex];
      const label = safeLabels[dataIndex];
      const percentage = (value / total) * 100;
      
      setHoveredElement(dataIndex);
      onSegmentHover?.(dataIndex, value, label, percentage);
    } else {
      setHoveredElement(null);
    }
  }, [onSegmentHover, safeData, safeLabels, total]);

  // Enhanced colors with interactive states
  const enhancedBackgroundColor = safeBackgroundColor.map((color, index) => {
    if (hoveredElement === index) {
      return color.replace('0.8', '1');
    }
    if (clickedElement === index) {
      return color.replace('0.8', '0.9');
    }
    return color;
  });

  const enhancedBorderColor = borderColor || safeBackgroundColor.map(color => color.replace('0.8', '1'));

  const chartData = {
    labels: safeLabels,
    datasets: [
      {
        data: safeData,
        backgroundColor: enhancedBackgroundColor,
        borderColor: enhancedBorderColor,
        borderWidth: hoveredElement !== null ? 3 : 2,
        hoverBorderWidth: 4,
        hoverOffset: 8,
        offset: safeData.map((_, index) => hoveredElement === index ? 10 : 0),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    animation: {
      duration: animationDuration,
      easing: 'easeOutQuart' as const,
      animateRotate: true,
      animateScale: true,
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 500,
          },
          color: "hsl(var(--foreground))",
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, index: number) => {
                const value = data.datasets[0].data[index];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: showPercentages ? `${label} (${percentage}%)` : label,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: 2,
                  pointStyle: 'circle',
                  index: index,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "hsl(var(--popover))",
        titleColor: "hsl(var(--popover-foreground))",
        bodyColor: "hsl(var(--popover-foreground))",
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        boxPadding: 6,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
          weight: 500,
        },
        callbacks: {
          label: (context: any) => {
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          },
          afterLabel: (context: any) => {
            if (enableDrillDown) {
              return 'Click to drill down';
            }
            return '';
          },
        },
      },
    },
    onClick: handleClick,
    onHover: handleHover,
  };

  const ChartComponent = doughnut ? Doughnut : Pie;

  return (
    <div className="relative">
      <div 
        className={cn(
          "h-[300px] w-full flex items-center justify-center transition-all duration-300",
          enableDrillDown && "cursor-pointer"
        )}
      >
        <div className="relative w-full h-full">
          <ChartComponent 
            ref={chartRef}
            data={chartData} 
            options={options}
          />
          
          {/* Center text for doughnut charts */}
          {doughnut && (centerText || centerSubtext) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {centerText && (
                  <div className="text-2xl font-bold text-foreground">
                    {centerText}
                  </div>
                )}
                {centerSubtext && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {centerSubtext}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Drill-down indicator */}
      {enableDrillDown && (
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Click on any segment to drill down for detailed insights
          </p>
        </div>
      )}

      {/* Data summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-lg font-bold text-foreground">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-lg font-bold text-foreground">{safeLabels.length}</div>
          <div className="text-xs text-muted-foreground">Categories</div>
        </div>
      </div>
    </div>
  );
}
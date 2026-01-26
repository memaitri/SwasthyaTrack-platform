import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartEvent,
  ActiveElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface InteractiveLineChartProps {
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
  onPointClick?: (dataIndex: number, datasetIndex: number, value: number, label: string) => void;
  onPointHover?: (dataIndex: number, datasetIndex: number, value: number, label: string) => void;
  enableZoom?: boolean;
  showDataPoints?: boolean;
  animationDuration?: number;
  enableCrosshair?: boolean;
  showTrendline?: boolean;
}

export function InteractiveLineChart({ 
  labels, 
  datasets,
  onPointClick,
  onPointHover,
  enableZoom = false,
  showDataPoints = true,
  animationDuration = 1000,
  enableCrosshair = false,
  showTrendline = false
}: InteractiveLineChartProps) {
  const [hoveredElement, setHoveredElement] = useState<{index: number, datasetIndex: number} | null>(null);
  const [clickedElement, setClickedElement] = useState<{index: number, datasetIndex: number} | null>(null);
  const chartRef = useRef<ChartJS<"line">>(null);

  // Provide default values to prevent runtime errors
  const safeLabels = labels || [];
  const safeDatasets = datasets || [];

  // Show empty state if no data is provided
  if (safeLabels.length === 0 || safeDatasets.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-lg bg-muted/30 flex items-center justify-center">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          </div>
          <p className="text-sm font-medium">Loading trend data...</p>
          <p className="text-xs">Interactive features will be available once data loads</p>
        </div>
      </div>
    );
  }

  const handleClick = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && onPointClick) {
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;
      const value = safeDatasets[datasetIndex].data[dataIndex];
      const label = safeLabels[dataIndex];
      
      setClickedElement({ index: dataIndex, datasetIndex });
      onPointClick(dataIndex, datasetIndex, value, label);
      
      // Reset clicked state after animation
      setTimeout(() => setClickedElement(null), 200);
    }
  }, [onPointClick, safeDatasets, safeLabels]);

  const handleHover = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0) {
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;
      const value = safeDatasets[datasetIndex].data[dataIndex];
      const label = safeLabels[dataIndex];
      
      setHoveredElement({ index: dataIndex, datasetIndex });
      onPointHover?.(dataIndex, datasetIndex, value, label);
    } else {
      setHoveredElement(null);
    }
  }, [onPointHover, safeDatasets, safeLabels]);

  // Enhanced datasets with interactive states
  const enhancedDatasets = safeDatasets.map((dataset, datasetIndex) => ({
    ...dataset,
    tension: dataset.tension ?? 0.4,
    pointRadius: showDataPoints ? (dataset.pointRadius ?? 4) : 0,
    pointHoverRadius: dataset.pointHoverRadius ?? 8,
    borderWidth: 3,
    pointBackgroundColor: dataset.borderColor,
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointHoverBackgroundColor: dataset.borderColor,
    pointHoverBorderColor: '#ffffff',
    pointHoverBorderWidth: 3,
    fill: dataset.fill ?? false,
    backgroundColor: dataset.backgroundColor || dataset.borderColor.replace('1)', '0.1)'),
  }));

  // Add trendline if enabled
  if (showTrendline && safeDatasets.length > 0) {
    const firstDataset = safeDatasets[0];
    const n = firstDataset.data.length;
    const sumX = safeLabels.reduce((sum, _, i) => sum + i, 0);
    const sumY = firstDataset.data.reduce((sum, val) => sum + val, 0);
    const sumXY = firstDataset.data.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = safeLabels.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const trendlineData = safeLabels.map((_, i) => slope * i + intercept);
    
    enhancedDatasets.push({
      label: 'Trend',
      data: trendlineData,
      borderColor: 'hsl(var(--muted-foreground))',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
    });
  }

  const data = {
    labels: safeLabels,
    datasets: enhancedDatasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: {
      duration: animationDuration,
      easing: 'easeOutQuart' as const,
      delay: (context: any) => {
        return context.type === 'data' && context.mode === 'default' 
          ? context.dataIndex * 100 
          : 0;
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "hsl(var(--border) / 0.2)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          color: "hsl(var(--muted-foreground))",
          maxRotation: 45,
          padding: 8,
        },
      },
      y: {
        grid: {
          color: "hsl(var(--border) / 0.3)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          color: "hsl(var(--muted-foreground))",
          padding: 8,
          callback: (value: any) => {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: '500',
          },
          color: "hsl(var(--foreground))",
          filter: (legendItem: any) => {
            // Hide trendline from legend if it's auto-generated
            return legendItem.text !== 'Trend' || !showTrendline;
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
          weight: '600',
        },
        bodyFont: {
          size: 13,
          weight: '500',
        },
        callbacks: {
          title: (tooltipItems: any[]) => {
            if (!tooltipItems || !tooltipItems.length) return "";
            return safeLabels[tooltipItems[0].dataIndex] || tooltipItems[0].label;
          },
          label: (context: any) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          },
          afterBody: (tooltipItems: any[]) => {
            if (tooltipItems.length > 1) {
              const total = tooltipItems.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
              return [`Total: ${total.toLocaleString()}`];
            }
            return [];
          },
        },
      },
      ...(enableCrosshair && {
        crosshair: {
          line: {
            color: 'hsl(var(--primary))',
            width: 1,
            dashPattern: [5, 5],
          },
          sync: {
            enabled: true,
          },
          zoom: {
            enabled: enableZoom,
          },
        },
      }),
    },
    onClick: handleClick,
    onHover: handleHover,
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    },
  };

  return (
    <div className="w-full">
      <div className="h-[350px] w-full">
        <Line 
          ref={chartRef}
          data={data} 
          options={options}
        />
      </div>
      
      {/* Interactive features info */}
      {(onPointClick || enableZoom) && (
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
          {onPointClick && (
            <span>💡 Click on data points for details</span>
          )}
          {enableZoom && (
            <span>🔍 Scroll to zoom, drag to pan</span>
          )}
        </div>
      )}

      {/* Data insights */}
      {safeDatasets.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold text-foreground">
              {Math.max(...safeDatasets[0].data).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Peak</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold text-foreground">
              {Math.min(...safeDatasets[0].data).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Low</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-lg font-bold text-foreground">
              {Math.round(safeDatasets[0].data.reduce((a, b) => a + b, 0) / safeDatasets[0].data.length).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
        </div>
      )}
    </div>
  );
}
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartEvent,
  ActiveElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface InteractiveBarChartProps {
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
    hoverBackgroundColor?: string | string[];
    hoverBorderColor?: string;
  }[];
  horizontal?: boolean;
  onBarClick?: (dataIndex: number, datasetIndex: number, value: number, label: string) => void;
  onBarHover?: (dataIndex: number, datasetIndex: number, value: number, label: string) => void;
  renderLabelsOutside?: boolean;
  externalLabels?: string[];
  showDataLabels?: boolean;
  enableDrillDown?: boolean;
  animationDuration?: number;
  stacked?: boolean;
}

export function InteractiveBarChart({ 
  labels, 
  datasets, 
  horizontal = false,
  onBarClick,
  onBarHover,
  renderLabelsOutside = false,
  externalLabels,
  showDataLabels = false,
  enableDrillDown = false,
  animationDuration = 1000,
  stacked = false
}: InteractiveBarChartProps) {
  const [hoveredElement, setHoveredElement] = useState<{index: number, datasetIndex: number} | null>(null);
  const [clickedElement, setClickedElement] = useState<{index: number, datasetIndex: number} | null>(null);
  const chartRef = useRef<ChartJS<"bar">>(null);

  // Provide default values to prevent runtime errors
  const safeLabels = labels || [];
  const safeDatasets = datasets || [];

  // Show empty state if no data is provided
  if (safeLabels.length === 0 || safeDatasets.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-lg bg-muted/30 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium">Loading chart data...</p>
          <p className="text-xs">Interactive features will be available once data loads</p>
        </div>
      </div>
    );
  }

  const handleClick = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && onBarClick) {
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;
      const value = safeDatasets[datasetIndex].data[dataIndex];
      const label = safeLabels[dataIndex];
      
      setClickedElement({ index: dataIndex, datasetIndex });
      onBarClick(dataIndex, datasetIndex, value, label);
      
      // Reset clicked state after animation
      setTimeout(() => setClickedElement(null), 200);
    }
  }, [onBarClick, safeDatasets, safeLabels]);

  const handleHover = useCallback((event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0) {
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;
      const value = safeDatasets[datasetIndex].data[dataIndex];
      const label = safeLabels[dataIndex];
      
      setHoveredElement({ index: dataIndex, datasetIndex });
      onBarHover?.(dataIndex, datasetIndex, value, label);
    } else {
      setHoveredElement(null);
    }
  }, [onBarHover, safeDatasets, safeLabels]);

  // Enhanced datasets with interactive colors
  const enhancedDatasets = safeDatasets.map((dataset, datasetIndex) => ({
    ...dataset,
    backgroundColor: Array.isArray(dataset.backgroundColor) 
      ? dataset.backgroundColor.map((color, index) => {
          if (hoveredElement?.index === index && hoveredElement?.datasetIndex === datasetIndex) {
            return dataset.hoverBackgroundColor?.[index] || color.replace('0.8', '1');
          }
          if (clickedElement?.index === index && clickedElement?.datasetIndex === datasetIndex) {
            return dataset.hoverBackgroundColor?.[index] || color.replace('0.8', '0.9');
          }
          return color;
        })
      : dataset.backgroundColor,
    borderColor: dataset.borderColor || dataset.backgroundColor,
    borderWidth: dataset.borderWidth ?? 2,
    borderRadius: 6,
    borderSkipped: false,
    hoverBorderWidth: 3,
    hoverBorderColor: dataset.hoverBorderColor || dataset.borderColor,
  }));

  const data = {
    labels: safeLabels,
    datasets: enhancedDatasets,
  };

  // Automatically switch to horizontal layout when labels are very long or there are many categories
  const useHorizontal = horizontal || safeLabels.length > 8 || safeLabels.some((l) => l.length > 24);

  const options = {
    indexAxis: useHorizontal ? ("y" as const) : ("x" as const),
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
          ? context.dataIndex * 50 
          : 0;
      },
    },
    scales: {
      ...(stacked && {
        x: { stacked: true },
        y: { stacked: true }
      }),
      [useHorizontal ? 'x' : 'y']: {
        beginAtZero: true,
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
        },
      },
      [useHorizontal ? 'y' : 'x']: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: '600',
          },
          color: "hsl(var(--foreground))",
          maxRotation: useHorizontal ? 0 : 45,
          padding: useHorizontal ? 8 : 12,
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
            const item = tooltipItems[0];
            return safeLabels[item.dataIndex] || item.label;
          },
          label: (context: any) => {
            const value = context.parsed[useHorizontal ? 'x' : 'y'];
            const percentage = datasets && datasets[0] 
              ? ((value / datasets[0].data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
              : '0';
            return `${context.dataset.label}: ${value.toLocaleString()} (${percentage}%)`;
          },
          afterLabel: (context: any) => {
            if (enableDrillDown) {
              return 'Click to drill down';
            }
            return '';
          },
        },
      },
      ...(showDataLabels && {
        datalabels: {
          display: true,
          color: "hsl(var(--foreground))",
          font: {
            weight: '600',
            size: 11,
          },
          formatter: (value: number) => value.toLocaleString(),
        },
      }),
    },
    onClick: handleClick,
    onHover: handleHover,
    layout: {
      padding: {
        top: showDataLabels ? 20 : 10,
        right: 10,
        bottom: useHorizontal ? 20 : 40,
        left: useHorizontal ? 60 : 10,
      },
    },
  };

  const containerHeight = useHorizontal 
    ? Math.max(300, safeLabels.length * 50 + 100) 
    : 400;

  return (
    <div 
      className={cn(
        "w-full transition-all duration-300",
        enableDrillDown && "cursor-pointer"
      )} 
      style={{ height: containerHeight }}
    >
      <Bar 
        ref={chartRef}
        data={data} 
        options={options}
      />
      
      {/* Drill-down indicator */}
      {enableDrillDown && (
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Click on any bar to drill down for detailed insights
          </p>
        </div>
      )}
    </div>
  );
}
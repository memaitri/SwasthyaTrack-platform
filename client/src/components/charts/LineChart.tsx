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
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
  }[];
}

export function LineChart({ labels, datasets }: LineChartProps) {
  // Provide default values to prevent runtime errors
  const safeLabels = labels || [];
  const safeDatasets = datasets || [];

  // Show empty state if no data is provided
  if (safeLabels.length === 0 || safeDatasets.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No data available</p>
          <p className="text-xs mt-1">Chart will appear when data is loaded</p>
        </div>
      </div>
    );
  }

  const data = {
    labels: safeLabels,
    datasets: safeDatasets.map((ds) => ({
      ...ds,
      tension: ds.tension ?? 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        // Explicit colors to ensure readable contrast across themes
        backgroundColor: "#0F172A",
        titleColor: "#FFFFFF",
        bodyColor: "#E5E7EB",
        borderColor: "#334155",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "hsl(var(--border) / 0.5)",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px] w-full">
      <Line data={data} options={options} />
    </div>
  );
}

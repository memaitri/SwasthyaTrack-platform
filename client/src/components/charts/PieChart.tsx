import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  labels: string[];
  data: number[];
  backgroundColor: string[];
  borderColor?: string[];
  doughnut?: boolean;
}

export function PieChart({ labels, data, backgroundColor, borderColor, doughnut = false }: PieChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderColor: borderColor || backgroundColor.map((c) => c.replace("0.8", "1")),
        borderWidth: 2,
      },
    ],
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
        backgroundColor: "#0F172A", // dark slate background
        titleColor: "#FFFFFF", // white primary text
        bodyColor: "#E5E7EB", // light secondary text
        borderColor: "#334155",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
  };

  const ChartComponent = doughnut ? Doughnut : Pie;

  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}

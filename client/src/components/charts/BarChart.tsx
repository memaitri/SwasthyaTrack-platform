import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
  horizontal?: boolean;
  /** When true, render labels as an HTML column to the left of the chart (guarantees full visibility) */
  renderLabelsOutside?: boolean;
  /** Optional short labels to render outside the chart (keeps full labels available for tooltips) */
  externalLabels?: string[];
}

export function BarChart({ labels, datasets, horizontal = false, renderLabelsOutside = false, externalLabels }: BarChartProps) {
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
      borderWidth: ds.borderWidth ?? 1,
      borderRadius: 4,
    })),
  };

  // Utility: split long labels into multiple lines (wrap without truncation)
  const formatLabel = (label: string, maxLineLength = 24): string[] => {
    if (!label) return [""];
    const normalized = label.toString();
    if (normalized.length <= maxLineLength) return [normalized];

    // Try to break into words and build lines <= maxLineLength
    const words = normalized.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length <= maxLineLength) {
        current = (current + " " + word).trim();
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    // Allow unlimited lines so the full label is retained (no truncation)
    return lines.filter(Boolean);
  };

  // Create a joined string version for robust newline-based rendering across Chart.js versions
  const formatLabelString = (label: string) => {
    const parts = formatLabel(label);
    return Array.isArray(parts) ? parts.join("\n") : String(parts ?? "");
  };

  // Automatically switch to horizontal layout when labels are very long or there are many categories
  const useHorizontal = horizontal || safeLabels.length > 6 || safeLabels.some((l) => l.length > 28);

  // Measure the pixel width of the longest label (use canvas measureText) to set minimal left padding
  const measureTextWidth = (text: string) => {
    if (typeof document === "undefined") {
      // Fallback for SSR/testing
      return text.length * 7.5;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return text.length * 7.5;
    // Match the tick font (approximate) for accurate measurement
    ctx.font = "600 12px Inter, ui-sans-serif, system-ui";

    return Math.ceil(ctx.measureText(text).width);
  };

  // If the caller requests, render labels outside (HTML) and hide axis labels
  const showExternalLabels = useHorizontal && renderLabelsOutside;

  // Determine which set of labels we will render externally (if enabled)
  const displayLabels = showExternalLabels && externalLabels && externalLabels.length ? externalLabels : safeLabels;

  const maxLabelWidthPx = (displayLabels || safeLabels).reduce((max, l) => {
    const parts = formatLabel(String(l));
    // measure widest wrapped line
    const widest = Math.max(...parts.map((p: string) => measureTextWidth(String(p))));
    return Math.max(max, widest);
  }, 0);

  // Minimal left padding to fit labels plus margin; clamp to a moderate cap so the plot area is not squeezed
  const leftPadding = useHorizontal ? Math.min(320, Math.max(40, maxLabelWidthPx + 16)) : 8;

  const options = {
    indexAxis: useHorizontal ? ("y" as const) : ("x" as const),
    responsive: true,
    maintainAspectRatio: false,
    // add extra padding to avoid label clipping; leave room for rotated/multi-line labels
    layout: {
      padding: {
        top: 8,
        right: 8,
        // leave more bottom padding for vertical charts, and compute left padding for horizontal charts
        bottom: useHorizontal ? 24 : 160,
        left: showExternalLabels ? 8 : leftPadding,
      },
    },
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
        callbacks: {
          // Show the full original label in the tooltip title using dataIndex
          title: (tooltipItems: any[]) => {
            if (!tooltipItems || !tooltipItems.length) return "";
            const ti = tooltipItems[0];
            const idx = ti.dataIndex ?? ti.data?.index ?? ti.index ?? 0;
            return safeLabels[idx] ?? ti.label ?? ti.dataset?.label ?? "";
          },
          label: (tooltipItem: any) => {
            const value = tooltipItem.formattedValue ?? tooltipItem.parsed?.y ?? tooltipItem.parsed?.x ?? "";
            return String(value);
          },
        },
      },
    },
    scales: useHorizontal
      ? {
          // Horizontal: categories on Y axis so labels can be full and readable
          x: {
            grid: {
              color: "hsl(var(--border) / 0.5)",
            },
            ticks: {
              font: {
                size: 12,
              },
              beginAtZero: true,
              stepSize: 1,
              precision: 0,
              // Ensure labels are integers (0,1,2...)
              callback: (value: any) => {
                const num = Number(value);
                return Number.isInteger(num) ? String(num) : "";
              },
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: false,
              // Zero padding so labels can sit flush to the left; align labels to start for left alignment
              padding: 0,
              display: !showExternalLabels,
              color: "hsl(var(--foreground))",
              font: {
                size: 12,
                weight: 600,
              },
              align: "start" as const,
              // render full or wrapped labels on the Y axis (only when not using external labels)
              callback: !showExternalLabels
                ? ( (tickValue: any, index: number) => {
                    const raw = safeLabels[index] ?? tickValue ?? "";
                    return formatLabelString(String(raw));
                  })
                : undefined,
            },
          },
        }
      : {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              // rotate labels to reduce overlap for vertical charts
              maxRotation: 90,
              minRotation: 45,
              autoSkip: false,
              padding: 8,
              color: "hsl(var(--foreground))",
              font: {
                size: 12,
                weight: 600,
              },
              // Return a string with newlines for multi-line rendering
              callback: (tickValue: any, index: number, ticks: any) => {
                const raw = safeLabels[index] ?? tickValue ?? "";
                return formatLabelString(String(raw));
              },
            },
          },
          y: {
            grid: {
              color: "hsl(var(--border) / 0.5)",
            },
            ticks: {
              font: {
                size: 12,
              },
            },
          },
        },
  };

  const leftColumnWidth = Math.min(520, Math.max(80, maxLabelWidthPx + 24));
  const containerHeight = useHorizontal ? Math.max(260, safeLabels.length * 36 + 80) : Math.max(480, Math.min(720, safeLabels.length * 28));

  if (showExternalLabels) {
    const toRender = externalLabels && externalLabels.length ? externalLabels : safeLabels;
    const fontSize = 10; // very small labels per request
    // compute an individual row height so each label lines up with its bar
    const contentAreaHeight = Math.max(160, containerHeight - 16); // conservative padding for top/bottom
    const rowHeight = Math.max(20, Math.floor(contentAreaHeight / Math.max(1, toRender.length)));

    return (
      <div className="w-full" style={{ display: "flex", height: containerHeight }}>
        <div style={{ width: leftColumnWidth, paddingRight: 8, display: "flex", flexDirection: "column", paddingTop: 8, paddingBottom: 8 }}>
          {toRender.map((l, i) => (
            <div key={i} style={{ height: rowHeight, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              <div style={{ textAlign: "right", lineHeight: 1.1, whiteSpace: "normal", fontSize, fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>
                {formatLabel(String(l)).map((part, idx) => (
                  <div key={idx}>{part}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <Bar data={data} options={options} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: containerHeight }} className="w-full">
      <Bar data={data} options={options} />
    </div>
  );
}

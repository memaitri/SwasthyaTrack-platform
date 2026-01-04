import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "Pending" | "Approved" | "Rejected" | "Active" | "Inactive" | "Present" | "Absent" | "Primary" | "Referred";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "default";
}

const statusConfig = {
  Pending: {
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  Approved: {
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  Rejected: {
    icon: XCircle,
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  },
  Active: {
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  Inactive: {
    icon: XCircle,
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800",
  },
  Present: {
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  Absent: {
    icon: XCircle,
    className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  },
  Primary: {
    icon: CheckCircle2,
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  Referred: {
    icon: AlertCircle,
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
};

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.Pending; // Default to Pending if status not found
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium no-default-hover-elevate no-default-active-elevate",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{status}</span>
    </Badge>
  );
}

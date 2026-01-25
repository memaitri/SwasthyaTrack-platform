import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  lastUpdated?: string;
}

export function StatsCard({ title, value, icon: Icon, lastUpdated }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(value);

  // Simple value update without aggressive animation
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-md border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow duration-200"
    >
      {/* Icon and Value in same row for compact design */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-gray-50 rounded-md">
          <Icon className="h-4 w-4 text-gray-500" />
        </div>
        <div className="text-lg font-semibold text-gray-800">
          {displayValue.toLocaleString()}
        </div>
      </div>

      {/* Title */}
      <div className="mb-1">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div>
          <p className="text-xs text-gray-400">
            Updated: {lastUpdated}
          </p>
        </div>
      )}
    </motion.div>
  );
}
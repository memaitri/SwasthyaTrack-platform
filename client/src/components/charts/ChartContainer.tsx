import { type ReactNode, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  filters?: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }[];
}

export function ChartContainer({ title, children, isLoading, filters }: ChartContainerProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setLoaded(true), 30);
      return () => clearTimeout(t);
    }
    setLoaded(false);
  }, [isLoading]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {filters && filters.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className="w-32" data-testid={`filter-${filter.label.toLowerCase()}`}>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-[200px] w-full chart-skeleton rounded-md" />
          </div>
        ) : (
          <div className={`chart-fade-in ${loaded ? "is-loaded" : ""}`}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Reusable filter controls component
 * Provides consistent filtering UI across the application
 */

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterX, Filter, Settings } from "lucide-react";
import { type FilterState, type FilterOptions } from "@/hooks/useFilters";

interface FilterControlsProps {
  filters: FilterState;
  filterOptions: FilterOptions;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  isLoading?: boolean;
  showAdvanced?: boolean;
  activeFilterCount?: number;
  filterSummary?: string;
  className?: string;
}

export function FilterControls({
  filters,
  filterOptions,
  onFilterChange,
  onReset,
  isLoading = false,
  showAdvanced = false,
  activeFilterCount = 0,
  filterSummary,
  className = "",
}: FilterControlsProps) {
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className="h-8 px-2"
            >
              <FilterX className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        {filterSummary && (
          <p className="text-xs text-muted-foreground">{filterSummary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* School Type Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              School Type
            </label>
            <Select
              value={filters.schoolType}
              onValueChange={(value) => onFilterChange("schoolType", value as any)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9" data-testid="filter-school-type">
                <SelectValue placeholder="School Type" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.schoolTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Month
            </label>
            <Select
              value={filters.month}
              onValueChange={(value) => onFilterChange("month", value)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9" data-testid="filter-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Year
            </label>
            <Select
              value={filters.year}
              onValueChange={(value) => onFilterChange("year", value)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9" data-testid="filter-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Toggle */}
          {showAdvanced && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={isLoading}
              >
                <Settings className="h-3 w-3 mr-1" />
                Advanced
              </Button>
            </div>
          )}
        </div>

        {/* Advanced Filters (if enabled) */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
            {/* District Filter */}
            {filterOptions.districts && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  District
                </label>
                <Select
                  value={filters.district || "all"}
                  onValueChange={(value) => onFilterChange("district", value === "all" ? undefined : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {filterOptions.districts.map((district) => (
                      <SelectItem key={district.value} value={district.value}>
                        {district.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Block Filter */}
            {filterOptions.blocks && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Block
                </label>
                <Select
                  value={filters.block || "all"}
                  onValueChange={(value) => onFilterChange("block", value === "all" ? undefined : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Blocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blocks</SelectItem>
                    {filterOptions.blocks.map((block) => (
                      <SelectItem key={block.value} value={block.value}>
                        {block.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified inline filter controls for compact layouts
export function InlineFilterControls({
  filters,
  filterOptions,
  onFilterChange,
  onReset,
  isLoading = false,
  activeFilterCount = 0,
  className = "",
}: Omit<FilterControlsProps, "showAdvanced" | "filterSummary">) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* School Type */}
      <Select
        value={filters.schoolType}
        onValueChange={(value) => onFilterChange("schoolType", value as any)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-40" data-testid="filter-school-type">
          <SelectValue placeholder="School Type" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.schoolTypes.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month */}
      <Select
        value={filters.month}
        onValueChange={(value) => onFilterChange("month", value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-36" data-testid="filter-month">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.months.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year */}
      <Select
        value={filters.year}
        onValueChange={(value) => onFilterChange("year", value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-28" data-testid="filter-year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.years.map((year) => (
            <SelectItem key={year.value} value={year.value}>
              {year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset Button */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isLoading}
          className="px-2"
        >
          <FilterX className="h-4 w-4" />
        </Button>
      )}

      {/* Active Filter Badge */}
      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="ml-1">
          {activeFilterCount}
        </Badge>
      )}
    </div>
  );
}

// Filter preset buttons
export function FilterPresets({
  onApplyPreset,
  isLoading = false,
}: {
  onApplyPreset: (preset: FilterState) => void;
  isLoading?: boolean;
}) {
  const presets = [
    {
      name: "Current Month",
      filters: {
        schoolType: "all" as const,
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
      },
    },
    {
      name: "Government Schools",
      filters: {
        schoolType: "Government" as const,
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
      },
    },
    {
      name: "Aided Schools",
      filters: {
        schoolType: "Aided" as const,
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.name}
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(preset.filters)}
          disabled={isLoading}
          className="h-8"
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
/**
 * Reusable filter hook for consistent filtering across components
 * Provides state management and utilities for filtering data
 */

import { useState, useMemo, useCallback } from "react";
import { schoolTypeEnum, type SchoolType } from "@shared/schema";

export interface FilterState {
  schoolType: SchoolType | "all";
  month: string;
  year: string;
  district?: string;
  block?: string;
}

export interface FilterOptions {
  schoolTypes: Array<{ value: SchoolType | "all"; label: string }>;
  months: Array<{ value: string; label: string }>;
  years: Array<{ value: string; label: string }>;
  districts?: Array<{ value: string; label: string }>;
  blocks?: Array<{ value: string; label: string }>;
}

const DEFAULT_FILTER_STATE: FilterState = {
  schoolType: "all",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
};

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const YEARS = [
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

const SCHOOL_TYPES = [
  { value: "all" as const, label: "All Schools" },
  ...schoolTypeEnum.map(type => ({
    value: type,
    label: `${type} Schools`
  }))
];

export function useFilters(initialState?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTER_STATE,
    ...initialState,
  });

  // Update individual filter values
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset filters to default
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  // Build URL search params from current filters
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filters.schoolType !== "all") {
      params.append("schoolType", filters.schoolType);
    }
    
    params.append("month", filters.month);
    params.append("year", filters.year);
    
    if (filters.district) {
      params.append("district", filters.district);
    }
    
    if (filters.block) {
      params.append("block", filters.block);
    }
    
    return params;
  }, [filters]);

  // Get filter options
  const filterOptions: FilterOptions = useMemo(() => ({
    schoolTypes: SCHOOL_TYPES,
    months: MONTHS,
    years: YEARS,
  }), []);

  // Validate current filter state
  const isValid = useMemo(() => {
    const monthNum = parseInt(filters.month);
    const yearNum = parseInt(filters.year);
    
    return (
      monthNum >= 1 && monthNum <= 12 &&
      yearNum >= 2020 && yearNum <= 2030 &&
      (filters.schoolType === "all" || schoolTypeEnum.includes(filters.schoolType as SchoolType))
    );
  }, [filters]);

  // Check if filters have been modified from defaults
  const hasActiveFilters = useMemo(() => {
    return (
      filters.schoolType !== DEFAULT_FILTER_STATE.schoolType ||
      filters.month !== DEFAULT_FILTER_STATE.month ||
      filters.year !== DEFAULT_FILTER_STATE.year ||
      Boolean(filters.district) ||
      Boolean(filters.block)
    );
  }, [filters]);

  // Get active filter count (for UI badges)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    
    if (filters.schoolType !== "all") count++;
    if (filters.month !== DEFAULT_FILTER_STATE.month) count++;
    if (filters.year !== DEFAULT_FILTER_STATE.year) count++;
    if (filters.district) count++;
    if (filters.block) count++;
    
    return count;
  }, [filters]);

  // Get filter summary for display
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    
    if (filters.schoolType !== "all") {
      parts.push(`${filters.schoolType} Schools`);
    }
    
    const monthLabel = MONTHS.find(m => m.value === filters.month)?.label;
    if (monthLabel) {
      parts.push(`${monthLabel} ${filters.year}`);
    }
    
    if (filters.district) {
      parts.push(`District: ${filters.district}`);
    }
    
    if (filters.block) {
      parts.push(`Block: ${filters.block}`);
    }
    
    return parts.length > 0 ? parts.join(" • ") : "All Data";
  }, [filters]);

  return {
    // State
    filters,
    
    // Actions
    updateFilter,
    resetFilters,
    setFilters,
    
    // Utilities
    buildParams,
    filterOptions,
    
    // Status
    isValid,
    hasActiveFilters,
    activeFilterCount,
    filterSummary,
  };
}

// Specialized hook for PO dashboard with school type focus
export function usePOFilters() {
  const baseFilters = useFilters();
  
  // PO-specific filter validation
  const isPOValid = useMemo(() => {
    return baseFilters.isValid && (
      baseFilters.filters.schoolType === "all" ||
      baseFilters.filters.schoolType === "Government" ||
      baseFilters.filters.schoolType === "Aided"
    );
  }, [baseFilters.isValid, baseFilters.filters.schoolType]);
  
  // PO-specific query key for React Query
  const queryKey = useMemo(() => [
    "/api/po/dashboard",
    baseFilters.filters.month,
    baseFilters.filters.year,
    baseFilters.filters.schoolType,
  ], [baseFilters.filters.month, baseFilters.filters.year, baseFilters.filters.schoolType]);
  
  return {
    ...baseFilters,
    isValid: isPOValid,
    queryKey,
  };
}

// Hook for managing filter presets
export function useFilterPresets() {
  const [presets, setPresets] = useState<Record<string, FilterState>>({
    "current-month": {
      schoolType: "all",
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
    "government-only": {
      schoolType: "Government",
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
    "aided-only": {
      schoolType: "Aided",
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    },
  });
  
  const savePreset = useCallback((name: string, filters: FilterState) => {
    setPresets(prev => ({
      ...prev,
      [name]: filters,
    }));
  }, []);
  
  const deletePreset = useCallback((name: string) => {
    setPresets(prev => {
      const { [name]: deleted, ...rest } = prev;
      return rest;
    });
  }, []);
  
  return {
    presets,
    savePreset,
    deletePreset,
  };
}
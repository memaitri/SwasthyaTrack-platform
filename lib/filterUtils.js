"use strict";
/**
 * Clean and reusable filtering utilities for SwasthyaTrack
 * Provides consistent filtering logic across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterBySchoolType = filterBySchoolType;
exports.filterByDistrict = filterByDistrict;
exports.filterByTimePeriod = filterByTimePeriod;
exports.applyFilters = applyFilters;
exports.getFilterOptions = getFilterOptions;
exports.buildFilterParams = buildFilterParams;
exports.validateFilterConfig = validateFilterConfig;
exports.groupBySchoolType = groupBySchoolType;
exports.calculateSchoolTypeStats = calculateSchoolTypeStats;
const schema_1 = require("@shared/schema");
/**
 * School Type Filter - Primary filter for PO View
 * Filters schools by type: Government, Aided, or all
 */
function filterBySchoolType(items, schoolType = "all") {
    if (schoolType === "all") {
        return items;
    }
    // Validate school type against enum
    if (!schema_1.schoolTypeEnum.includes(schoolType)) {
        console.warn(`Invalid school type: ${schoolType}. Using 'all' instead.`);
        return items;
    }
    return items.filter(item => item.schoolType === schoolType);
}
/**
 * District Filter - For PO access control
 * Filters schools by district with case-insensitive matching
 */
function filterByDistrict(items, district) {
    if (!district) {
        return items;
    }
    const normalizedDistrict = district.trim().toLowerCase();
    return items.filter(item => item.district?.trim().toLowerCase() === normalizedDistrict);
}
/**
 * Time Period Filter - For monthly/yearly data
 * Filters data by month and year
 */
function filterByTimePeriod(items, month, year) {
    return items.filter(item => {
        let matches = true;
        if (month !== undefined) {
            const itemMonth = item.month || (item.createdAt ? new Date(item.createdAt).getMonth() + 1 : undefined);
            matches = matches && itemMonth === month;
        }
        if (year !== undefined) {
            const itemYear = item.year || (item.createdAt ? new Date(item.createdAt).getFullYear() : undefined);
            matches = matches && itemYear === year;
        }
        return matches;
    });
}
/**
 * Combined Filter - Apply multiple filters at once
 * Main filtering function for complex queries
 */
function applyFilters(items, config) {
    let filtered = items;
    // Apply school type filter
    if (config.schoolType) {
        filtered = filterBySchoolType(filtered, config.schoolType);
    }
    // Apply district filter
    if (config.district) {
        filtered = filterByDistrict(filtered, config.district);
    }
    // Apply time period filter
    if (config.month !== undefined || config.year !== undefined) {
        filtered = filterByTimePeriod(filtered, config.month, config.year);
    }
    return filtered;
}
/**
 * Get available filter options from data
 * Useful for populating filter dropdowns
 */
function getFilterOptions(items) {
    // School type options (always include "all")
    const schoolTypes = [
        { value: "all", label: "All Schools" },
        ...schema_1.schoolTypeEnum.map(type => ({
            value: type,
            label: `${type} Schools`
        }))
    ];
    // District options from available data
    const uniqueDistricts = [...new Set(items
            .map(item => item.district)
            .filter((district) => Boolean(district)))].sort();
    const districts = uniqueDistricts.map(district => ({
        value: district,
        label: district
    }));
    return { schoolTypes, districts };
}
/**
 * Build query parameters for API calls
 * Converts filter config to URL search params
 */
function buildFilterParams(config) {
    const params = new URLSearchParams();
    if (config.schoolType && config.schoolType !== "all") {
        params.append("schoolType", config.schoolType);
    }
    if (config.district) {
        params.append("district", config.district);
    }
    if (config.block) {
        params.append("block", config.block);
    }
    if (config.month !== undefined) {
        params.append("month", config.month.toString());
    }
    if (config.year !== undefined) {
        params.append("year", config.year.toString());
    }
    return params;
}
/**
 * Validate filter configuration
 * Ensures filter values are valid
 */
function validateFilterConfig(config) {
    const errors = [];
    // Validate school type
    if (config.schoolType && config.schoolType !== "all" && !schema_1.schoolTypeEnum.includes(config.schoolType)) {
        errors.push(`Invalid school type: ${config.schoolType}`);
    }
    // Validate month
    if (config.month !== undefined && (config.month < 1 || config.month > 12)) {
        errors.push(`Invalid month: ${config.month}. Must be between 1 and 12.`);
    }
    // Validate year
    if (config.year !== undefined && (config.year < 2020 || config.year > 2030)) {
        errors.push(`Invalid year: ${config.year}. Must be between 2020 and 2030.`);
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
/**
 * School type comparison utilities
 * For analytics and reporting
 */
function groupBySchoolType(items) {
    const groups = {
        all: items,
        Government: [],
        Aided: []
    };
    items.forEach(item => {
        if (item.schoolType === "Government") {
            groups.Government.push(item);
        }
        else if (item.schoolType === "Aided") {
            groups.Aided.push(item);
        }
    });
    return groups;
}
/**
 * Calculate school type statistics
 * For dashboard metrics
 */
function calculateSchoolTypeStats(items) {
    const total = items.length;
    const government = items.filter(item => item.schoolType === "Government");
    const aided = items.filter(item => item.schoolType === "Aided");
    return {
        total,
        government: {
            count: government.length,
            percentage: total > 0 ? Math.round((government.length / total) * 100) : 0
        },
        aided: {
            count: aided.length,
            percentage: total > 0 ? Math.round((aided.length / total) * 100) : 0
        }
    };
}

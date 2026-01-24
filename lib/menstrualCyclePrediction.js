/**
 * Menstrual Cycle Prediction Utilities
 *
 * Reusable logic for analyzing menstrual cycle patterns and predicting future cycles.
 * Handles irregular data, missing data, and provides medically-accepted defaults.
 */
// ============================================================================
// DEFAULT CONFIGURATION (WHO/ACOG Medical Guidelines)
// ============================================================================
const DEFAULT_CONFIG = {
    dateField: 'date',
    flowField: 'flowIntensity',
    minPeriodsRequired: 2,
    lookbackMonths: 6,
    periodStartFlowLevels: ['medium', 'heavy'],
    minDaysBetweenPeriods: 7,
    defaultCycleLength: 28, // WHO average
    defaultPeriodDuration: 5, // WHO average
    defaultLutealPhaseLength: 14, // Medical standard
    regularCycleThreshold: 3, // Days of std dev for "regular" classification
};
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Safely convert various date formats to Date object
 */
function toDate(value) {
    if (value instanceof Date)
        return value;
    return new Date(value);
}
/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}
/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStandardDeviation(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}
/**
 * Add days to a date
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
/**
 * Subtract months from a date
 */
function subtractMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
}
// ============================================================================
// CORE ANALYSIS FUNCTIONS
// ============================================================================
/**
 * Identify period start dates from cycle entries
 */
export function identifyPeriodStarts(entries, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const periodStarts = [];
    if (entries.length === 0)
        return periodStarts;
    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => {
        const dateA = toDate(a[cfg.dateField]);
        const dateB = toDate(b[cfg.dateField]);
        return dateA.getTime() - dateB.getTime();
    });
    // Identify period starts (days with significant flow)
    for (const entry of sortedEntries) {
        const flowLevel = entry[cfg.flowField];
        // Check if this entry indicates period start
        if (cfg.periodStartFlowLevels.includes(flowLevel)) {
            const entryDate = toDate(entry[cfg.dateField]);
            // Check if this is a new period (not within minDaysBetweenPeriods of last period)
            const isNewPeriod = periodStarts.length === 0 ||
                daysBetween(periodStarts[periodStarts.length - 1].date, entryDate) >= cfg.minDaysBetweenPeriods;
            if (isNewPeriod) {
                // Determine confidence based on flow level
                const confidence = flowLevel === 'heavy' ? 'high' :
                    flowLevel === 'medium' ? 'medium' : 'low';
                periodStarts.push({ date: entryDate, confidence });
            }
        }
    }
    return periodStarts;
}
/**
 * Calculate cycle statistics from period start dates
 */
export function calculateCycleStatistics(periodStarts, entries, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Calculate cycle lengths
    const cycleLengths = [];
    for (let i = 1; i < periodStarts.length; i++) {
        const length = daysBetween(periodStarts[i - 1].date, periodStarts[i].date);
        cycleLengths.push(length);
    }
    // Calculate average cycle length
    const averageCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length)
        : cfg.defaultCycleLength;
    // Calculate standard deviation
    const standardDeviation = calculateStandardDeviation(cycleLengths);
    // Determine if cycle is regular
    const isRegular = cycleLengths.length >= 2 && standardDeviation < cfg.regularCycleThreshold;
    // Calculate period durations
    const periodDurations = [];
    const sortedEntries = [...entries].sort((a, b) => {
        const dateA = toDate(a[cfg.dateField]);
        const dateB = toDate(b[cfg.dateField]);
        return dateA.getTime() - dateB.getTime();
    });
    for (const periodStart of periodStarts) {
        let duration = 0;
        let currentDate = periodStart.date;
        // Count consecutive days with flow
        for (const entry of sortedEntries) {
            const entryDate = toDate(entry[cfg.dateField]);
            const flowLevel = entry[cfg.flowField];
            if (entryDate >= currentDate &&
                flowLevel &&
                flowLevel !== 'none' &&
                daysBetween(currentDate, entryDate) <= 10) { // Max 10 days for a period
                duration = daysBetween(periodStart.date, entryDate) + 1;
            }
        }
        if (duration > 0) {
            periodDurations.push(duration);
        }
    }
    const averagePeriodDuration = periodDurations.length > 0
        ? Math.round(periodDurations.reduce((sum, dur) => sum + dur, 0) / periodDurations.length)
        : cfg.defaultPeriodDuration;
    return {
        recordedPeriods: periodStarts.length,
        cycleLengths,
        averageCycleLength,
        standardDeviation,
        isRegular,
        lastPeriodStart: periodStarts.length > 0 ? periodStarts[periodStarts.length - 1].date : null,
        periodDurations,
        averagePeriodDuration,
    };
}
/**
 * Predict next menstrual cycle
 */
export function predictNextCycle(statistics, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Check if we have enough data
    if (statistics.recordedPeriods < cfg.minPeriodsRequired || !statistics.lastPeriodStart) {
        return null;
    }
    // Calculate next period date
    const nextPeriodDate = addDays(statistics.lastPeriodStart, statistics.averageCycleLength);
    // Determine confidence level
    let confidence;
    if (statistics.recordedPeriods >= 6 && statistics.isRegular) {
        confidence = 'high';
    }
    else if (statistics.recordedPeriods >= 3 && statistics.standardDeviation < 5) {
        confidence = 'medium';
    }
    else {
        confidence = 'low';
    }
    // Determine cycle regularity
    const cycleRegularity = statistics.recordedPeriods < 2 ? 'unknown' :
        statistics.isRegular ? 'regular' : 'irregular';
    return {
        nextPeriodDate,
        confidence,
        averageCycleLength: statistics.averageCycleLength,
        cycleRegularity,
        standardDeviation: statistics.standardDeviation,
        dataSource: 'historical',
    };
}
/**
 * Predict next cycle using default values when insufficient data
 */
export function predictWithDefaults(lastKnownPeriod, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const baseDate = lastKnownPeriod || new Date();
    const nextPeriodDate = addDays(baseDate, cfg.defaultCycleLength);
    return {
        nextPeriodDate,
        confidence: 'low',
        averageCycleLength: cfg.defaultCycleLength,
        cycleRegularity: 'unknown',
        standardDeviation: 0,
        dataSource: 'default',
    };
}
/**
 * Calculate fertile window based on cycle prediction
 */
export function calculateFertileWindow(prediction, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Ovulation typically occurs 14 days before next period (luteal phase)
    const ovulationDate = addDays(prediction.nextPeriodDate, -cfg.defaultLutealPhaseLength);
    // Fertile window: 5 days before ovulation to 1 day after
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = addDays(ovulationDate, 1);
    // Confidence matches prediction confidence
    const confidence = prediction.confidence;
    return {
        ovulationDate,
        fertileWindowStart,
        fertileWindowEnd,
        confidence,
    };
}
// ============================================================================
// MAIN PREDICTION FUNCTION
// ============================================================================
/**
 * Comprehensive menstrual cycle prediction
 */
export function predictMenstrualCycle(entries, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const warnings = [];
    // Filter entries to lookback period
    const cutoffDate = subtractMonths(new Date(), cfg.lookbackMonths);
    const recentEntries = entries.filter(entry => {
        const entryDate = toDate(entry[cfg.dateField]);
        return entryDate >= cutoffDate;
    });
    if (recentEntries.length === 0) {
        warnings.push('No recent cycle data available');
    }
    // Identify period starts
    const periodStarts = identifyPeriodStarts(recentEntries, config);
    if (periodStarts.length === 0) {
        warnings.push('No period start dates could be identified from the data');
    }
    // Calculate statistics
    const statistics = calculateCycleStatistics(periodStarts, recentEntries, config);
    // Check if we have sufficient data
    if (statistics.recordedPeriods < cfg.minPeriodsRequired) {
        const message = `Insufficient data for prediction. Need at least ${cfg.minPeriodsRequired} recorded periods, found ${statistics.recordedPeriods}.`;
        warnings.push(message);
        // Use defaults
        const defaultPrediction = predictWithDefaults(statistics.lastPeriodStart, config);
        const fertileWindow = calculateFertileWindow(defaultPrediction, config);
        return {
            prediction: defaultPrediction,
            fertileWindow,
            statistics,
            warnings,
            message: `${message} Using medical defaults (${cfg.defaultCycleLength}-day cycle).`,
        };
    }
    // Generate prediction from historical data
    const prediction = predictNextCycle(statistics, config);
    if (!prediction) {
        warnings.push('Unable to generate prediction from historical data');
        const defaultPrediction = predictWithDefaults(statistics.lastPeriodStart, config);
        const fertileWindow = calculateFertileWindow(defaultPrediction, config);
        return {
            prediction: defaultPrediction,
            fertileWindow,
            statistics,
            warnings,
            message: 'Using medical defaults due to insufficient data quality.',
        };
    }
    // Calculate fertile window
    const fertileWindow = calculateFertileWindow(prediction, config);
    // Add warnings for irregular cycles
    if (!statistics.isRegular && statistics.recordedPeriods >= 2) {
        warnings.push(`Cycle appears irregular (std dev: ${statistics.standardDeviation.toFixed(1)} days). Predictions may be less accurate.`);
    }
    // Add warning for low confidence
    if (prediction.confidence === 'low') {
        warnings.push('Prediction confidence is low. More data needed for accurate predictions.');
    }
    return {
        prediction,
        fertileWindow,
        statistics,
        warnings,
    };
}
// ============================================================================
// HELPER FUNCTIONS FOR COMMON USE CASES
// ============================================================================
/**
 * Quick prediction with minimal configuration
 */
export function quickPredict(entries) {
    return predictMenstrualCycle(entries);
}
/**
 * Check if a cycle is considered regular
 */
export function isCycleRegular(entries, config = {}) {
    const periodStarts = identifyPeriodStarts(entries, config);
    const statistics = calculateCycleStatistics(periodStarts, entries, config);
    return statistics.isRegular;
}
/**
 * Get next expected period date (simple)
 */
export function getNextPeriodDate(entries, config = {}) {
    const result = predictMenstrualCycle(entries, config);
    return result.prediction?.nextPeriodDate || null;
}
/**
 * Get ovulation date (simple)
 */
export function getOvulationDate(entries, config = {}) {
    const result = predictMenstrualCycle(entries, config);
    return result.fertileWindow?.ovulationDate || null;
}

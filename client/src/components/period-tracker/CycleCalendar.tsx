import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Circle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface PeriodEntry {
  id: string;
  entryDate: string;
  flowCategory: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | null;
  painIntensity: number | null;
  moods: string[];
  symptoms: string[];
  isReferred?: boolean;
  referredDate?: string | null;
  referralFacility?: string | null;
}

interface CyclePrediction {
  prediction: {
    nextPeriodDate: string;
    confidence: 'high' | 'medium' | 'low';
    averageCycleLength: number;
    cycleRegularity: 'regular' | 'irregular' | 'unknown';
  } | null;
  fertileWindow: {
    start: string;
    end: string;
    ovulationDate: string;
  } | null;
  historicalData: {
    recordedPeriods: number;
    lastPeriodStart: string | null;
    averagePeriodDuration: number;
  };
}

interface CycleCalendarProps {
  entries: PeriodEntry[];
  prediction: CyclePrediction | undefined;
  studentName: string;
  studentId: string;
  onPeriodRangeSelect?: (startDate: string, endDate: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  // Use local timezone to avoid date shifting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr: string): Date {
  // Parse date string as local date to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getFlowColor(flowCategory: string | null): string {
  switch (flowCategory) {
    case 'heavy':
      return 'bg-red-600';
    case 'medium':
      return 'bg-red-500';
    case 'light':
      return 'bg-red-400';
    case 'spotting':
      return 'bg-red-300';
    case 'none':
      return 'bg-gray-200';
    default:
      return '';
  }
}

// ============================================================================
// CALENDAR DAY COMPONENT
// ============================================================================

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entry: PeriodEntry | undefined;
  isPredictedPeriod: boolean;
  isOvulation: boolean;
  isFertileWindow: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  onClick: () => void;
}

function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  entry,
  isPredictedPeriod,
  isOvulation,
  isFertileWindow,
  isRangeStart,
  isRangeEnd,
  isInRange,
  onClick,
}: CalendarDayProps) {
  const dayNumber = date.getDate();
  const hasFlow = entry && entry.flowCategory && entry.flowCategory !== 'none';
  const flowColor = entry ? getFlowColor(entry.flowCategory) : '';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-20 w-full border border-gray-200 p-2 text-left transition-colors hover:bg-gray-50",
        !isCurrentMonth && "bg-gray-50 text-gray-400",
        isToday && "ring-2 ring-primary ring-inset",
        (isRangeStart || isRangeEnd) && "ring-2 ring-green-500 ring-inset bg-green-50",
        isInRange && !isRangeStart && !isRangeEnd && "bg-green-50/50"
      )}
    >
      {/* Day Number */}
      <div className={cn(
        "text-sm font-medium",
        isToday && "text-primary font-bold",
        (isRangeStart || isRangeEnd) && "text-green-700 font-bold"
      )}>
        {dayNumber}
        {isRangeStart && <span className="ml-1 text-xs">S</span>}
        {isRangeEnd && <span className="ml-1 text-xs">E</span>}
      </div>
      
      {/* Visual Indicators */}
      <div className="mt-1 space-y-1">
        {/* Actual Flow */}
        {hasFlow && (
          <div className={cn("h-2 rounded-full", flowColor)} />
        )}
        
        {/* Predicted Period */}
        {isPredictedPeriod && !hasFlow && (
          <div className="h-2 rounded-full bg-red-200 border border-red-400 border-dashed" />
        )}
        
        {/* Ovulation */}
        {isOvulation && (
          <div className="flex items-center justify-center">
            <Circle className="h-3 w-3 text-blue-500 fill-blue-500" />
          </div>
        )}
        
        {/* Fertile Window */}
        {isFertileWindow && !isOvulation && (
          <div className="h-1 rounded-full bg-blue-200" />
        )}
        
        {/* Pain Indicator */}
        {entry && entry.painIntensity !== null && entry.painIntensity > 5 && (
          <div className="text-xs text-orange-600">
            ⚠
          </div>
        )}
        
        {/* Referral Indicator */}
        {entry && entry.isReferred && (
          <div className="text-xs text-red-600 font-bold">
            R
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

function CalendarLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Flow Intensity</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-600" />
              <span>Heavy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <span>Light</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-300" />
              <span>Spotting</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Predictions</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-red-200 border border-red-400 border-dashed" />
              <span>Predicted Period</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 text-blue-500 fill-blue-500" />
              <span>Ovulation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-blue-200" />
              <span>Fertile Window</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Selection</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-green-500 bg-green-50 rounded" />
              <span>Period Range (S=Start, E=End)</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Other</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary rounded" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⚠</span>
              <span>High Pain (6+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold">R</span>
              <span>Referral Made</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CYCLE SUMMARY COMPONENT
// ============================================================================

interface CycleSummaryProps {
  prediction: CyclePrediction | undefined;
  currentPeriodDays: number;
  daysSinceLastPeriod: number | null;
}

function CycleSummary({ prediction, currentPeriodDays, daysSinceLastPeriod }: CycleSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cycle Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prediction?.prediction ? (
          <>
            <div>
              <div className="text-xs text-muted-foreground">Next Period</div>
              <div className="text-lg font-semibold">
                {parseDate(prediction.prediction.nextPeriodDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence: {prediction.prediction.confidence}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Cycle Length</div>
                <div className="text-sm font-medium">
                  {prediction.prediction.averageCycleLength} days
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Regularity</div>
                <div className="text-sm font-medium capitalize">
                  {prediction.prediction.cycleRegularity}
                </div>
              </div>
            </div>
            
            {daysSinceLastPeriod !== null && (
              <div>
                <div className="text-xs text-muted-foreground">Days Since Last Period</div>
                <div className="text-sm font-medium">{daysSinceLastPeriod} days</div>
              </div>
            )}
            
            {currentPeriodDays > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Current Period</div>
                <div className="text-sm font-medium">Day {currentPeriodDays}</div>
              </div>
            )}
            
            <div>
              <div className="text-xs text-muted-foreground">Recorded Periods</div>
              <div className="text-sm font-medium">
                {prediction.historicalData.recordedPeriods}
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {prediction?.historicalData.recordedPeriods === 0 
              ? "No cycle data recorded yet"
              : "Insufficient data for prediction"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN CALENDAR COMPONENT
// ============================================================================

export function CycleCalendar({ entries, prediction, studentName, studentId, onPeriodRangeSelect }: CycleCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeStartDate, setRangeStartDate] = useState<string | null>(null);
  const [rangeEndDate, setRangeEndDate] = useState<string | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  
  // Create a map of entries by date for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, PeriodEntry>();
    entries.forEach(entry => {
      map.set(entry.entryDate, entry);
    });
    return map;
  }, [entries]);
  
  // Calculate predicted period dates - FIX: Use parseDate to avoid timezone issues
  const predictedPeriodDates = useMemo(() => {
    if (!prediction?.prediction?.nextPeriodDate) return new Set<string>();
    
    const dates = new Set<string>();
    const startDate = parseDate(prediction.prediction.nextPeriodDate);
    const duration = prediction.historicalData.averagePeriodDuration || 5;
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.add(formatDate(date));
    }
    
    return dates;
  }, [prediction]);
  
  // Calculate fertile window dates - FIX: Use parseDate to avoid timezone issues
  const fertileWindowDates = useMemo(() => {
    if (!prediction?.fertileWindow) return new Set<string>();
    
    const dates = new Set<string>();
    const start = parseDate(prediction.fertileWindow.start);
    const end = parseDate(prediction.fertileWindow.end);
    
    let current = new Date(start);
    while (current <= end) {
      dates.add(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [prediction]);
  
  // Ovulation date
  const ovulationDate = prediction?.fertileWindow?.ovulationDate;
  
  // Calculate current period days and days since last period - FIX: Use parseDate
  const { currentPeriodDays, daysSinceLastPeriod } = useMemo(() => {
    const todayStr = formatDate(today);
    let currentDays = 0;
    let daysSince: number | null = null;
    
    // Check if today is a period day
    const todayEntry = entriesByDate.get(todayStr);
    if (todayEntry && todayEntry.flowCategory && todayEntry.flowCategory !== 'none') {
      // Count consecutive days backwards
      let checkDate = new Date(today);
      while (true) {
        const dateStr = formatDate(checkDate);
        const entry = entriesByDate.get(dateStr);
        if (entry && entry.flowCategory && entry.flowCategory !== 'none') {
          currentDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    
    // Find last period start - FIX: Use parseDate
    if (prediction?.historicalData.lastPeriodStart) {
      const lastStart = parseDate(prediction.historicalData.lastPeriodStart);
      const diffTime = today.getTime() - lastStart.getTime();
      daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return { currentPeriodDays: currentDays, daysSinceLastPeriod: daysSince };
  }, [entries, entriesByDate, prediction, today]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Date[] = [];
    
    // Previous month days
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
      days.push(date);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push(date);
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      days.push(date);
    }
    
    return days;
  }, [currentYear, currentMonth]);
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };
  
  const handleDayClick = (dateStr: string) => {
    if (isSelectingRange) {
      // Range selection mode
      if (!rangeStartDate) {
        // First click - set start date
        setRangeStartDate(dateStr);
        setRangeEndDate(null);
      } else if (!rangeEndDate) {
        // Second click - set end date
        const start = parseDate(rangeStartDate);
        const end = parseDate(dateStr);
        
        if (end < start) {
          // If end is before start, swap them
          setRangeStartDate(dateStr);
          setRangeEndDate(rangeStartDate);
        } else {
          setRangeEndDate(dateStr);
        }
      } else {
        // Third click - reset and start new range
        setRangeStartDate(dateStr);
        setRangeEndDate(null);
      }
    } else {
      // Normal selection mode - just show details
      setSelectedDate(dateStr);
    }
  };
  
  const handleToggleRangeMode = () => {
    setIsSelectingRange(!isSelectingRange);
    setRangeStartDate(null);
    setRangeEndDate(null);
    setSelectedDate(null);
  };
  
  const handleConfirmRange = () => {
    if (rangeStartDate && rangeEndDate && onPeriodRangeSelect) {
      onPeriodRangeSelect(rangeStartDate, rangeEndDate);
      setIsSelectingRange(false);
      setRangeStartDate(null);
      setRangeEndDate(null);
    }
  };
  
  const handleCancelRange = () => {
    setIsSelectingRange(false);
    setRangeStartDate(null);
    setRangeEndDate(null);
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const selectedEntry = selectedDate ? entriesByDate.get(selectedDate) : null;
  
  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cycle Calendar</CardTitle>
              <CardDescription>{studentName}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={isSelectingRange ? "default" : "outline"} 
                size="sm" 
                onClick={handleToggleRangeMode}
              >
                {isSelectingRange ? "Cancel Range" : "Select Period Range"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center font-medium">
                {monthNames[currentMonth]} {currentYear}
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 border border-gray-200">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600 border-b border-gray-200"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const dateStr = formatDate(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = formatDate(date) === formatDate(today);
              const entry = entriesByDate.get(dateStr);
              const isPredictedPeriod = predictedPeriodDates.has(dateStr);
              const isOvulation = ovulationDate === dateStr;
              const isFertileWindow = fertileWindowDates.has(dateStr);
              
              // Range selection logic
              const isRangeStart = rangeStartDate === dateStr;
              const isRangeEnd = rangeEndDate === dateStr;
              let isInRange = false;
              
              if (rangeStartDate && rangeEndDate) {
                const start = parseDate(rangeStartDate);
                const end = parseDate(rangeEndDate);
                const current = parseDate(dateStr);
                isInRange = current >= start && current <= end;
              }
              
              return (
                <CalendarDay
                  key={index}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  entry={entry}
                  isPredictedPeriod={isPredictedPeriod}
                  isOvulation={isOvulation}
                  isFertileWindow={isFertileWindow}
                  isRangeStart={isRangeStart}
                  isRangeEnd={isRangeEnd}
                  isInRange={isInRange}
                  onClick={() => handleDayClick(dateStr)}
                />
              );
            })}
          </div>
          
          {/* Range Selection Instructions */}
          {isSelectingRange && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-900 mb-2">
                Select Period Range
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                {!rangeStartDate && <p>Click on a date to mark the start of the period</p>}
                {rangeStartDate && !rangeEndDate && (
                  <p>Start: {parseDate(rangeStartDate).toLocaleDateString()} - Now click on the end date</p>
                )}
                {rangeStartDate && rangeEndDate && (
                  <div className="space-y-2">
                    <p>
                      Range: {parseDate(rangeStartDate).toLocaleDateString()} to {parseDate(rangeEndDate).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleConfirmRange}>
                        Confirm Range
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelRange}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Selected Day Details */}
          {!isSelectingRange && selectedDate && selectedEntry && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium mb-2">
                {parseDate(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedEntry.flowCategory && (
                  <div>
                    <span className="text-muted-foreground">Flow:</span>{' '}
                    <span className="capitalize">{selectedEntry.flowCategory}</span>
                  </div>
                )}
                {selectedEntry.painIntensity !== null && (
                  <div>
                    <span className="text-muted-foreground">Pain:</span>{' '}
                    {selectedEntry.painIntensity}/10
                  </div>
                )}
                {selectedEntry.moods.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Moods:</span>{' '}
                    {selectedEntry.moods.join(', ')}
                  </div>
                )}
                {selectedEntry.symptoms.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Symptoms:</span>{' '}
                    {selectedEntry.symptoms.map(s => s.replace('_', ' ')).join(', ')}
                  </div>
                )}
                
                {/* Referral Information */}
                {selectedEntry.isReferred && (
                  <div className="col-span-2 border-t pt-3 mt-2">
                    <div className="font-medium text-red-600 mb-2 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                      Referral Information
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedEntry.referredDate && (
                        <div>
                          <span className="text-muted-foreground">Referred Date:</span>{' '}
                          {parseDate(selectedEntry.referredDate).toLocaleDateString()}
                        </div>
                      )}
                      {selectedEntry.referralFacility && (
                        <div>
                          <span className="text-muted-foreground">Facility:</span>{' '}
                          {selectedEntry.referralFacility}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Side Panels */}
      <div className="grid gap-4 md:grid-cols-2">
        <CycleSummary
          prediction={prediction}
          currentPeriodDays={currentPeriodDays}
          daysSinceLastPeriod={daysSinceLastPeriod}
        />
        <CalendarLegend />
      </div>
    </div>
  );
}

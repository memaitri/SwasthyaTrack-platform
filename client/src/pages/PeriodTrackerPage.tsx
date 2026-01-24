import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useAuthenticatedFetch } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp, Activity, AlertCircle, User, Loader2 } from "lucide-react";
import { CycleCalendar } from "@/components/period-tracker/CycleCalendar";
import { useLocation } from "wouter";
import { REFERRAL_FACILITY_OPTIONS } from "@/lib/referralFacilities";

// ============================================================================
// TYPES
// ============================================================================

interface Student {
  id: string;
  fullName: string;
  classSection: string;
  dateOfBirth: string;
  schoolId: string;
  menstruationStartedAt: string | null;
}

interface PeriodEntry {
  id: string;
  studentId: string;
  schoolId: string;
  entryDate: string;
  moods: string[];
  bodyTemperatureCelsius: string | null;
  painIntensity: number | null;
  flowCategory: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  notes: string | null;
  isReferred?: boolean;
  referredDate?: string | null;
  referralFacility?: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CyclePrediction {
  prediction: {
    nextPeriodDate: string;
    confidence: 'high' | 'medium' | 'low';
    averageCycleLength: number;
    cycleRegularity: 'regular' | 'irregular' | 'unknown';
    standardDeviation: string;
    dataSource: 'historical' | 'default';
  } | null;
  fertileWindow: {
    start: string;
    end: string;
    ovulationDate: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  historicalData: {
    recordedPeriods: number;
    cycleLengths: number[];
    lastPeriodStart: string | null;
    averagePeriodDuration: number;
    isRegular: boolean;
  };
  warnings: string[];
  message?: string;
}

interface MoodTrends {
  period: string;
  totalEntries: number;
  moodFrequency: Array<{ mood: string; count: number; percentage: string }>;
  symptomFrequency: Array<{ symptom: string; count: number; percentage: string }>;
  averagePainIntensity: string | null;
  averageTemperature: string | null;
  entries: PeriodEntry[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchEligibleStudents(authedFetch: ReturnType<typeof useAuthenticatedFetch>): Promise<Student[]> {
  const response = await authedFetch('/api/students?gender=F&menstruationStarted=true&minAge=10');
  
  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }
  
  const data = await response.json();
  return data.students || [];
}

async function fetchPeriodEntries(
  authedFetch: ReturnType<typeof useAuthenticatedFetch>,
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<{ entries: PeriodEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('limit', '100');
  
  const response = await authedFetch(`/api/period-tracker/${studentId}?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch period entries');
  }
  
  return response.json();
}

async function fetchCyclePrediction(
  authedFetch: ReturnType<typeof useAuthenticatedFetch>,
  studentId: string
): Promise<CyclePrediction> {
  const response = await authedFetch(`/api/period-tracker/${studentId}/cycle-prediction`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch cycle prediction');
  }
  
  return response.json();
}

async function fetchMoodTrends(
  authedFetch: ReturnType<typeof useAuthenticatedFetch>,
  studentId: string,
  days: number = 30
): Promise<MoodTrends> {
  const response = await authedFetch(`/api/period-tracker/${studentId}/mood-trends?days=${days}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch mood trends');
  }
  
  return response.json();
}

async function createPeriodEntry(
  authedFetch: ReturnType<typeof useAuthenticatedFetch>,
  entry: Partial<PeriodEntry>
): Promise<PeriodEntry> {
  const response = await authedFetch('/api/period-tracker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create entry');
  }
  
  return response.json();
}

async function updatePeriodEntry(
  authedFetch: ReturnType<typeof useAuthenticatedFetch>,
  id: string,
  entry: Partial<PeriodEntry>
): Promise<PeriodEntry> {
  const response = await authedFetch(`/api/period-tracker/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update entry');
  }
  
  return response.json();
}

// ============================================================================
// CHILD COMPONENTS
// ============================================================================

function StudentSelector({ 
  students, 
  selectedStudentId, 
  onSelectStudent,
  isLoading 
}: { 
  students: Student[]; 
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Select Student
        </CardTitle>
        <CardDescription>
          Choose a student to track their menstrual cycle
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="text-muted-foreground">
            No eligible students found. Students must be female, age 10+, with menstruation marked as started.
          </div>
        ) : (
          <Select value={selectedStudentId || undefined} onValueChange={onSelectStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.fullName} - {student.classSection}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarTrackerTab({ 
  studentId,
  studentName,
  entries, 
  prediction,
  isLoadingEntries,
  isLoadingPrediction,
  onRefresh,
  onPeriodRangeSelect
}: { 
  studentId: string;
  studentName: string;
  entries: PeriodEntry[];
  prediction: CyclePrediction | undefined;
  isLoadingEntries: boolean;
  isLoadingPrediction: boolean;
  onRefresh: () => void;
  onPeriodRangeSelect: (startDate: string, endDate: string) => void;
}) {
  if (isLoadingEntries || isLoadingPrediction) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading calendar data...
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar & Tracker</CardTitle>
          <CardDescription>
            View and track daily menstrual cycle data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              No entries recorded yet. Start tracking by adding symptoms.
            </div>
            <Button onClick={onRefresh} variant="outline">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <CycleCalendar
        entries={entries}
        prediction={prediction}
        studentName={studentName}
        studentId={studentId}
        onPeriodRangeSelect={onPeriodRangeSelect}
      />
      
      <div className="flex justify-center">
        <Button onClick={onRefresh} variant="outline">
          Refresh Data
        </Button>
      </div>
    </div>
  );
}

function SymptomsInputTab({ 
  studentId,
  onEntryCreated 
}: { 
  studentId: string;
  onEntryCreated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authedFetch = useAuthenticatedFetch();
  
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [flowCategory, setFlowCategory] = useState<string>('');
  const [painIntensity, setPainIntensity] = useState<number>(0);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [temperature, setTemperature] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isReferred, setIsReferred] = useState<boolean>(false);
  const [referredDate, setReferredDate] = useState<string>('');
  const [referralFacility, setReferralFacility] = useState<string>('');
  
  const createMutation = useMutation({
    mutationFn: (entry: Partial<PeriodEntry>) => createPeriodEntry(authedFetch, entry),
    onSuccess: () => {
      toast({
        title: "Entry saved",
        description: "Period tracker entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['period-entries', studentId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-prediction', studentId] });
      queryClient.invalidateQueries({ queryKey: ['mood-trends', studentId] });
      onEntryCreated();
      
      // Reset form
      setFlowCategory('');
      setPainIntensity(0);
      setSelectedMoods([]);
      setSelectedSymptoms([]);
      setTemperature('');
      setNotes('');
      setIsReferred(false);
      setReferredDate('');
      setReferralFacility('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = () => {
    if (!user?.schoolId) {
      toast({
        title: "Error",
        description: "School ID not found",
        variant: "destructive",
      });
      return;
    }
    
    // Validate referral fields
    if (isReferred) {
      if (!referredDate) {
        toast({
          title: "Error",
          description: "Referred date is required when student is referred",
          variant: "destructive",
        });
        return;
      }
      if (!referralFacility) {
        toast({
          title: "Error",
          description: "Referral facility is required when student is referred",
          variant: "destructive",
        });
        return;
      }
    }
    
    createMutation.mutate({
      studentId,
      schoolId: user.schoolId,
      entryDate,
      flowCategory: flowCategory as any || null,
      painIntensity: painIntensity || null,
      moods: selectedMoods,
      symptoms: selectedSymptoms,
      bodyTemperatureCelsius: temperature || null,
      notes: notes || null,
      isReferred,
      referredDate: isReferred && referredDate ? referredDate : null,
      referralFacility: isReferred && referralFacility ? referralFacility : null,
    });
  };
  
  const moodOptions = ['happy', 'sad', 'anxious', 'irritable', 'energetic', 'tired', 'calm', 'stressed', 'emotional', 'normal'];
  const symptomOptions = ['cramps', 'headache', 'nausea', 'bloating', 'breast_tenderness', 'back_pain', 'fatigue', 'dizziness', 'acne', 'food_cravings', 'insomnia', 'diarrhea', 'constipation'];
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Record Daily Symptoms</CardTitle>
          <CardDescription>
            Track flow, symptoms, mood, and other daily data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full border rounded p-2 mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Flow Category</label>
            <Select value={flowCategory} onValueChange={setFlowCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select flow level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="spotting">Spotting</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Pain Intensity (0-10)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={painIntensity}
              onChange={(e) => setPainIntensity(parseInt(e.target.value) || 0)}
              className="w-full border rounded p-2 mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Moods (select multiple)</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {moodOptions.map((mood) => (
                <label key={mood} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMoods.includes(mood)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMoods([...selectedMoods, mood]);
                      } else {
                        setSelectedMoods(selectedMoods.filter(m => m !== mood));
                      }
                    }}
                  />
                  <span className="text-sm capitalize">{mood.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Symptoms (select multiple)</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {symptomOptions.map((symptom) => (
                <label key={symptom} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(symptom)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSymptoms([...selectedSymptoms, symptom]);
                      } else {
                        setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
                      }
                    }}
                  />
                  <span className="text-sm capitalize">{symptom.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Body Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              min="35"
              max="42"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.5"
              className="w-full border rounded p-2 mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full border rounded p-2 mt-1"
              rows={3}
            />
          </div>
          
          {/* Referral Section */}
          <div className="border-t pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isReferred"
                  checked={isReferred}
                  onChange={(e) => setIsReferred(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isReferred" className="text-sm font-medium">
                  Is Referred
                </label>
              </div>
              
              {isReferred && (
                <div className="ml-6 space-y-4 border-l-2 border-blue-200 pl-4">
                  <div>
                    <label className="text-sm font-medium">Referred Date</label>
                    <input
                      type="date"
                      value={referredDate}
                      onChange={(e) => setReferredDate(e.target.value)}
                      className="w-full border rounded p-2 mt-1"
                      required={isReferred}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Facility</label>
                    <Select value={referralFacility} onValueChange={setReferralFacility}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select referral facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_FACILITY_OPTIONS.map((facility) => (
                          <SelectItem key={facility} value={facility}>
                            {facility}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Entry'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab({ 
  studentId,
  prediction,
  moodTrends,
  entries,
  isLoadingPrediction,
  isLoadingTrends 
}: { 
  studentId: string;
  prediction: CyclePrediction | undefined;
  moodTrends: MoodTrends | undefined;
  entries: PeriodEntry[];
  isLoadingPrediction: boolean;
  isLoadingTrends: boolean;
}) {
  // Calculate referral summary
  const referralSummary = useMemo(() => {
    const referralEntries = entries.filter(entry => entry.isReferred);
    const totalReferrals = referralEntries.length;
    
    if (totalReferrals === 0) {
      return { totalReferrals: 0, recentReferrals: [], facilityBreakdown: [] };
    }
    
    // Get recent referrals (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentReferrals = referralEntries
      .filter(entry => new Date(entry.entryDate) >= sixMonthsAgo)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 5);
    
    // Facility breakdown
    const facilityCount = new Map<string, number>();
    referralEntries.forEach(entry => {
      if (entry.referralFacility) {
        facilityCount.set(entry.referralFacility, (facilityCount.get(entry.referralFacility) || 0) + 1);
      }
    });
    
    const facilityBreakdown = Array.from(facilityCount.entries())
      .map(([facility, count]) => ({ facility, count }))
      .sort((a, b) => b.count - a.count);
    
    return { totalReferrals, recentReferrals, facilityBreakdown };
  }, [entries]);
  return (
    <div className="space-y-4">
      {/* Cycle Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cycle Prediction
          </CardTitle>
          <CardDescription>
            Predicted next period and fertile window
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPrediction ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading prediction...
            </div>
          ) : !prediction?.prediction ? (
            <div className="space-y-2">
              <div className="text-muted-foreground">{prediction?.message || 'No prediction available'}</div>
              {prediction?.warnings && prediction.warnings.length > 0 && (
                <div className="text-sm text-amber-600">
                  {prediction.warnings.map((warning, i) => (
                    <div key={i}>• {warning}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Next Period</div>
                  <div className="text-lg font-semibold">
                    {new Date(prediction.prediction.nextPeriodDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Confidence: {prediction.prediction.confidence}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Cycle Length</div>
                  <div className="text-lg font-semibold">
                    {prediction.prediction.averageCycleLength} days
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prediction.prediction.cycleRegularity}
                  </div>
                </div>
              </div>
              
              {prediction.fertileWindow && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Fertile Window</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Start</div>
                      <div>{new Date(prediction.fertileWindow.start).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ovulation</div>
                      <div>{new Date(prediction.fertileWindow.ovulationDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">End</div>
                      <div>{new Date(prediction.fertileWindow.end).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Historical Data</div>
                <div className="text-sm space-y-1">
                  <div>Recorded Periods: {prediction.historicalData.recordedPeriods}</div>
                  <div>Average Period Duration: {prediction.historicalData.averagePeriodDuration} days</div>
                  {prediction.historicalData.lastPeriodStart && (
                    <div>Last Period: {new Date(prediction.historicalData.lastPeriodStart).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              
              {prediction.warnings && prediction.warnings.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Warnings
                  </div>
                  <div className="text-sm text-amber-600 space-y-1">
                    {prediction.warnings.map((warning, i) => (
                      <div key={i}>• {warning}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Mood Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Mood & Symptom Trends
          </CardTitle>
          <CardDescription>
            Analysis of the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTrends ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading trends...
            </div>
          ) : !moodTrends ? (
            <div className="text-muted-foreground">No trend data available</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                  <div className="text-2xl font-semibold">{moodTrends.totalEntries}</div>
                </div>
                
                {moodTrends.averagePainIntensity && (
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Pain</div>
                    <div className="text-2xl font-semibold">{moodTrends.averagePainIntensity}/10</div>
                  </div>
                )}
              </div>
              
              {moodTrends.moodFrequency.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Most Common Moods</div>
                  <div className="space-y-1">
                    {moodTrends.moodFrequency.slice(0, 5).map((mood) => (
                      <div key={mood.mood} className="flex justify-between text-sm">
                        <span className="capitalize">{mood.mood}</span>
                        <span className="text-muted-foreground">{mood.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {moodTrends.symptomFrequency.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Most Common Symptoms</div>
                  <div className="space-y-1">
                    {moodTrends.symptomFrequency.slice(0, 5).map((symptom) => (
                      <div key={symptom.symptom} className="flex justify-between text-sm">
                        <span className="capitalize">{symptom.symptom.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{symptom.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Referral Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Referral Summary
          </CardTitle>
          <CardDescription>
            Medical referrals made for this student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralSummary.totalReferrals === 0 ? (
            <div className="text-muted-foreground">No referrals made yet</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Referrals</div>
                  <div className="text-2xl font-semibold text-red-600">{referralSummary.totalReferrals}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Recent (6 months)</div>
                  <div className="text-2xl font-semibold">{referralSummary.recentReferrals.length}</div>
                </div>
              </div>
              
              {referralSummary.facilityBreakdown.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Facilities Used</div>
                  <div className="space-y-1">
                    {referralSummary.facilityBreakdown.slice(0, 5).map((item) => (
                      <div key={item.facility} className="flex justify-between text-sm">
                        <span>{item.facility}</span>
                        <span className="text-muted-foreground">{item.count} referral{item.count > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {referralSummary.recentReferrals.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Recent Referrals</div>
                  <div className="space-y-2">
                    {referralSummary.recentReferrals.map((entry) => (
                      <div key={entry.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium">
                              {new Date(entry.entryDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.referralFacility}
                            </div>
                            {entry.symptoms.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Symptoms: {entry.symptoms.map(s => s.replace('_', ' ')).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            Referred
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PeriodTrackerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const authedFetch = useAuthenticatedFetch();
  const [location] = useLocation();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('calendar');
  
  // Check for studentId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentIdFromUrl = urlParams.get('studentId');
    if (studentIdFromUrl) {
      setSelectedStudentId(studentIdFromUrl);
    }
  }, [location]);
  
  // Fetch eligible students
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['eligible-students'],
    queryFn: () => fetchEligibleStudents(authedFetch),
  });
  
  // Fetch period entries for selected student
  const { data: entriesData, isLoading: isLoadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['period-entries', selectedStudentId],
    queryFn: () => fetchPeriodEntries(authedFetch, selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  
  // Fetch cycle prediction for selected student
  const { data: prediction, isLoading: isLoadingPrediction } = useQuery({
    queryKey: ['cycle-prediction', selectedStudentId],
    queryFn: () => fetchCyclePrediction(authedFetch, selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  
  // Fetch mood trends for selected student
  const { data: moodTrends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['mood-trends', selectedStudentId],
    queryFn: () => fetchMoodTrends(authedFetch, selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('calendar');
  };
  
  const handleEntryCreated = () => {
    refetchEntries();
    toast({
      title: "Success",
      description: "Entry saved. Switching to calendar view.",
    });
    setActiveTab('calendar');
  };
  
  const handlePeriodRangeSelect = async (startDate: string, endDate: string) => {
    if (!selectedStudentId || !user?.schoolId) {
      toast({
        title: "Error",
        description: "Student or school information missing",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create entries for each day in the range with minimal data
      const start = new Date(startDate);
      const end = new Date(endDate);
      const promises = [];
      
      let current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        
        // Create/update entry with just the flow category to mark it as a period day
        // This will use upsert, so existing entries won't be overwritten completely
        promises.push(
          createPeriodEntry(authedFetch, {
            studentId: selectedStudentId,
            schoolId: user.schoolId,
            entryDate: dateStr,
            flowCategory: 'medium', // Just mark as period day
            moods: [],
            symptoms: [],
            painIntensity: null,
            bodyTemperatureCelsius: null,
            notes: null,
          })
        );
        
        current.setDate(current.getDate() + 1);
      }
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `Period range marked from ${startDate} to ${endDate}. You can now add detailed symptoms for each day.`,
      });
      
      refetchEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record period range",
        variant: "destructive",
      });
    }
  };
  
  // Get selected student name
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedStudentName = selectedStudent?.fullName || 'Student';
  
  return (
    <AppLayout title="Period Tracker">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Period Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track and predict menstrual cycles for female students
          </p>
        </div>
        
        {/* Student Selector */}
        <StudentSelector
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={handleStudentSelect}
          isLoading={isLoadingStudents}
        />
        
        {/* Main Content - Only show if student is selected */}
        {selectedStudentId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="symptoms">
                <Activity className="h-4 w-4 mr-2" />
                Add Symptoms
              </TabsTrigger>
              <TabsTrigger value="insights">
                <TrendingUp className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar">
              <CalendarTrackerTab
                studentId={selectedStudentId}
                studentName={selectedStudentName}
                entries={entriesData?.entries || []}
                prediction={prediction}
                isLoadingEntries={isLoadingEntries}
                isLoadingPrediction={isLoadingPrediction}
                onRefresh={() => refetchEntries()}
                onPeriodRangeSelect={handlePeriodRangeSelect}
              />
            </TabsContent>
            
            <TabsContent value="symptoms">
              <SymptomsInputTab
                studentId={selectedStudentId}
                onEntryCreated={handleEntryCreated}
              />
            </TabsContent>
            
            <TabsContent value="insights">
              <InsightsTab
                studentId={selectedStudentId}
                prediction={prediction}
                moodTrends={moodTrends}
                entries={entriesData?.entries || []}
                isLoadingPrediction={isLoadingPrediction}
                isLoadingTrends={isLoadingTrends}
              />
            </TabsContent>
          </Tabs>
        )}
        
        {/* No Student Selected Message */}
        {!selectedStudentId && students.length > 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a student above to start tracking their menstrual cycle</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

// src/app/insights/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter, // Added Footer
    DialogClose, // Added Close
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; // Added Button
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea for tips
// Added Baby icon, HeartHandshake might be better if Baby isn't available
import { Droplet, CalendarDays, HeartPulse, Percent, Activity, LineChart, BarChart as BarChartIcon, Info, TrendingUp, TrendingDown, Minus as MinusIcon, BrainCircuit, Lightbulb, Loader2, Baby, HeartHandshake } from 'lucide-react';
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays, subDays, isWithinInterval, isValid, isAfter, isEqual, startOfDay, isBefore } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts'; // Added LabelList
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getMenstrualTips } from '@/ai/flows/menstrual-tips-flow'; // Import the new flow
import { useToast } from '@/hooks/use-toast'; // Import toast
import Link from 'next/link'; // Import Link


// Define cycle phases
type CyclePhase = 'Period' | 'Follicular' | 'Fertile Window' | 'Luteal' | 'Unknown';
const TIPS_STORAGE_KEY = 'healthTipsCache'; // Key for localStorage

// Helper function to determine cycle phase for a given date
const getCyclePhase = (
    date: Date,
    periodStartDates: Date[],
    avgCycleLength: number | null,
    avgPeriodLength: number | null
): CyclePhase => {
    if (!avgCycleLength || !avgPeriodLength || periodStartDates.length === 0 || !date || !isValid(date)) {
        return 'Unknown';
    }

    // Find the cycle this date belongs to
    let cycleStartDate: Date | null = null;
    let nextCycleStartDate: Date | null = null;

    // Find the period start date that *precedes or includes* the given date.
    for (let i = periodStartDates.length - 1; i >= 0; i--) {
        const currentStart = periodStartDates[i];
        if (!isValid(currentStart)) continue; // Skip invalid start dates

        const estimatedNextStart = addDays(currentStart, avgCycleLength);

        // If the date is on or after the current start AND before the next estimated start
        // Handle the very first cycle edge case (i === 0) where there's no 'next' known start
         if ((!isBefore(date, currentStart) && isBefore(date, estimatedNextStart)) ||
             (i === 0 && !isBefore(date, currentStart))) { // Ensure date isn't before the very first start

            cycleStartDate = currentStart;
            nextCycleStartDate = estimatedNextStart; // This is an *estimated* next start

            // Estimate the end date of the period for *this* cycle using average length
            const periodEndDate = addDays(cycleStartDate, avgPeriodLength - 1);

            // Period Phase Check: Date is within the period duration starting from cycleStartDate
            if (isWithinInterval(date, { start: cycleStartDate, end: periodEndDate })) {
                return 'Period';
            }
            // We found the relevant cycle, break the loop
            break;
        }
         // Special case: Check if date is exactly the last known start date
          else if (i === periodStartDates.length - 1 && isEqual(date, currentStart)) {
              cycleStartDate = currentStart;
              nextCycleStartDate = estimatedNextStart;
               const periodEndDate = addDays(cycleStartDate, avgPeriodLength - 1);
                if (isWithinInterval(date, { start: cycleStartDate, end: periodEndDate })) {
                    return 'Period';
                }
              break;
          }
    }

     // If we couldn't determine the cycle start (e.g., date is before first log)
     if (!cycleStartDate || !nextCycleStartDate) {
         return 'Unknown';
     }

     // Recalculate estimated period end date for phase calculations below
     const estimatedPeriodEndDate = addDays(cycleStartDate, avgPeriodLength - 1);

    // Estimate ovulation day (approx. 14 days before *estimated* next cycle starts)
    const ovulationDay = subDays(nextCycleStartDate, 14);

    // Fertile Window (approx. 5 days before + ovulation day + 1 day after)
    const fertileWindowStart = subDays(ovulationDay, 5);
    const fertileWindowEnd = addDays(ovulationDay, 1);
    if (isWithinInterval(date, { start: fertileWindowStart, end: fertileWindowEnd })) {
        return 'Fertile Window';
    }

    // Follicular Phase (After *estimated* period ends, before fertile window starts)
    const follicularStart = addDays(estimatedPeriodEndDate, 1); // Day after period ends
    const follicularEnd = subDays(fertileWindowStart, 1); // Day before fertile window

     if (!isBefore(follicularEnd, follicularStart)) {
         if (isWithinInterval(date, { start: follicularStart, end: follicularEnd })) {
             return 'Follicular';
         }
     } else if (isEqual(date, follicularStart)) { // Handle single-day phase
         return 'Follicular';
     }

    // Luteal Phase (After fertile window ends, before next period starts)
    const lutealStart = addDays(fertileWindowEnd, 1); // Day after fertile window
    const lutealEnd = subDays(nextCycleStartDate, 1); // Day before next period

     if (!isBefore(lutealEnd, lutealStart)) {
        if (isWithinInterval(date, { start: lutealStart, end: lutealEnd })) {
            return 'Luteal';
        }
    } else if (isEqual(date, lutealStart)) { // Handle single-day phase
        return 'Luteal';
    }

    return 'Unknown'; // Default if it doesn't fit neatly
};


// Helper function to calculate cycle insights from log data
const calculateCycleInsights = (logData: Record<string, LogData>): {
    avgCycleLength: number | null;
    minCycleLength: number | null; // Added Min
    maxCycleLength: number | null; // Added Max
    cycleLengthTrend: 'stable' | 'increasing' | 'decreasing' | null; // Added Trend
    avgPeriodLength: number | null;
    minPeriodLength: number | null; // Added Min
    maxPeriodLength: number | null; // Added Max
    predictedNextPeriod: string | null;
    cycleLengths: { cycleNumber: number; length: number }[]; // Structure for chart
    periodLengths: { periodNumber: number; length: number }[]; // Structure for chart
    totalSexualActivityDays: number;
    totalActivityCount: number;
    protectedActivityDays: number;
    unprotectedActivityDays: number;
    activityFrequency: number;
    protectionRate: number | null;
    pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'N/A'; // Changed 'Not enough data'
    fertileWindowString: string | null; // Allow null
    activityByPhase: { phase: CyclePhase; count: number }[]; // Structure for chart
    symptomsByPhase: { phase: CyclePhase; count: number }[]; // Structure for chart
    totalSymptomCount: number;
} => {
    const periodStartDates: Date[] = [];
    const periodLengthsData: number[] = []; // Raw period lengths
    const cycleLengthsData: number[] = []; // Raw cycle lengths
    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;
    let totalSymptomCount = 0;

    const activityByPhaseCounts: Record<CyclePhase, number> = {
        'Period': 0, 'Follicular': 0, 'Fertile Window': 0, 'Luteal': 0, 'Unknown': 0,
    };
    const symptomsByPhaseCounts: Record<CyclePhase, Record<string, number>> = {
        'Period': {}, 'Follicular': {}, 'Fertile Window': {}, 'Luteal': {}, 'Unknown': {},
    };


    // Sort dates to process chronologically
    const sortedDates = Object.keys(logData)
        .filter(dateString => {
            try {
                return isValid(parseISO(dateString));
            } catch {
                return false;
            }
        })
        .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

    // 1. Identify all period start dates
    sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry?.date) return; // Ensure entry and date exist

        const isPeriodDay = entry.periodFlow && entry.periodFlow !== 'none';
        const date = startOfDay(parseISO(entry.date));
        if (!isValid(date)) return; // Skip if date parsing failed

        const prevDay = subDays(date, 1);
        const prevDayString = format(prevDay, 'yyyy-MM-dd');
        const prevLog = logData[prevDayString];
        const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

        if (isPeriodStart) {
             periodStartDates.push(date);
             if (periodStartDates.length > 1) {
                 const previousStartDate = periodStartDates[periodStartDates.length - 2];
                 if (isValid(previousStartDate)) {
                    const cycleLength = differenceInDays(date, previousStartDate);
                    if (cycleLength > 10 && cycleLength < 100) {
                        cycleLengthsData.push(cycleLength);
                    }
                 }
             }
        }
    });

     // 2. Calculate Averages needed for phase calculation BEFORE phase assignment
     const avgCycleLength = cycleLengthsData.length > 0
        ? Math.round(cycleLengthsData.reduce((a, b) => a + b, 0) / cycleLengthsData.length)
        : null;

    // 3. Calculate period lengths
    periodStartDates.forEach((startDate) => {
        if (!isValid(startDate)) return; // Skip invalid start dates
        let endDate: Date | null = null;
        let lastFlowDate = startDate;
        const searchLimit = addDays(startDate, 20); // Limit search to avoid infinite loops on bad data
        let foundExplicitEnd = false;

        for (let d = 0; d < sortedDates.length; d++) {
            const currentDateString = sortedDates[d];
            const currentEntry = logData[currentDateString];
            if (!currentEntry?.date) continue; // Skip incomplete entries

            const currentDate = startOfDay(parseISO(currentEntry.date));
            if (!isValid(currentDate)) continue;

             // Skip dates before or exactly on the start date
            if (!isAfter(currentDate, startDate)) {
                // Handle edge case: if the *start date itself* is marked as the end
                if (isEqual(currentDate, startDate) && currentEntry.isPeriodEnd) {
                    endDate = currentDate;
                    foundExplicitEnd = true;
                    break;
                 }
                 continue;
            }

            // Stop searching if we've gone too far or found the next period start
            if (isAfter(currentDate, searchLimit)) break;
            const isNextPeriodStart = periodStartDates.some(nextStart => isEqual(currentDate, nextStart) && !isEqual(nextStart, startDate));
            if (isNextPeriodStart) break;

             // Check for explicit end marker
             if (currentEntry.isPeriodEnd) {
                endDate = currentDate;
                foundExplicitEnd = true;
                break;
             }

             // Track the last day flow was recorded if no explicit end found yet
             if (currentEntry.periodFlow && currentEntry.periodFlow !== 'none') {
                 lastFlowDate = currentDate;
             }
        }


        // Determine final end date:
        // 1. Use explicit end marker if found.
        // 2. Otherwise, use the last day flow was recorded.
        // 3. If no flow was recorded *after* the start day, and no end marker, assume 1-day period.
        const finalEndDate = foundExplicitEnd ? endDate : (isAfter(lastFlowDate, startDate) ? lastFlowDate : startDate);

        if (finalEndDate && isValid(finalEndDate)) {
             const length = differenceInDays(finalEndDate, startDate) + 1;
             if (length > 0 && length < 20) { // Basic validation
                 periodLengthsData.push(length);
             } else {
                 console.warn(`Calculated period length (${length}) outside expected range for start date ${format(startDate, 'yyyy-MM-dd')}. Skipping.`);
             }
        } else {
            console.warn(`Could not determine valid end date for period starting ${format(startDate, 'yyyy-MM-dd')}`);
        }
    });

    // Calculate average period length AFTER iterating through all periods
    const avgPeriodLength = periodLengthsData.length > 0
        ? Math.round(periodLengthsData.reduce((a, b) => a + b, 0) / periodLengthsData.length)
        : null;


     // 4. Process Activity and Symptoms, assigning them to phases
     sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry?.date) return;
        const date = startOfDay(parseISO(entry.date));
        if (!isValid(date)) return;

        const phase = getCyclePhase(date, periodStartDates, avgCycleLength, avgPeriodLength);

        // Sexual Activity
        const activityCount = entry.sexualActivityCount ?? 0;
        if (activityCount > 0) {
            totalSexualActivityDays++;
            totalActivityCount += activityCount;
            if (entry.protectionUsed === true) protectedActivityDays++;
            else if (entry.protectionUsed === false) unprotectedActivityDays++;
            activityByPhaseCounts[phase] += activityCount;
        }

        // Symptoms
         if (entry.symptoms && entry.symptoms.length > 0) {
             entry.symptoms.forEach(symptom => {
                 if (!symptomsByPhaseCounts[phase][symptom]) {
                     symptomsByPhaseCounts[phase][symptom] = 0;
                 }
                 symptomsByPhaseCounts[phase][symptom]++;
                 totalSymptomCount++;
             });
         }
     });

    // 5. Final Calculations & Formatting
    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    // Protection rate based on days with activity (more representative than total count)
    const protectionRate = totalSexualActivityDays > 0 ? (protectedActivityDays / totalSexualActivityDays) * 100 : null;

    // Min/Max Lengths
    const minCycleLength = cycleLengthsData.length > 0 ? Math.min(...cycleLengthsData) : null;
    const maxCycleLength = cycleLengthsData.length > 0 ? Math.max(...cycleLengthsData) : null;
    const minPeriodLength = periodLengthsData.length > 0 ? Math.min(...periodLengthsData) : null;
    const maxPeriodLength = periodLengthsData.length > 0 ? Math.max(...periodLengthsData) : null;

    // Cycle Length Trend (simple - requires at least 3 cycles)
    let cycleLengthTrend: 'stable' | 'increasing' | 'decreasing' | null = null;
    if (cycleLengthsData.length >= 3) {
        const firstHalfAvg = cycleLengthsData.slice(0, Math.floor(cycleLengthsData.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(cycleLengthsData.length / 2);
        const secondHalfAvg = cycleLengthsData.slice(Math.ceil(cycleLengthsData.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(cycleLengthsData.length / 2);
        if (Math.abs(firstHalfAvg - secondHalfAvg) < 1.5) { // Threshold for stability
            cycleLengthTrend = 'stable';
        } else if (secondHalfAvg > firstHalfAvg) {
            cycleLengthTrend = 'increasing';
        } else {
            cycleLengthTrend = 'decreasing';
        }
    }

    // Predict next period
    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength && isValid(periodStartDates[periodStartDates.length - 1])) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1);
        predictedNextPeriod = `${format(nextStartDate, 'MMM do')} - ${format(nextEndDate, 'MMM do, yyyy')}`;
    } else if (periodStartDates.length > 0 && avgCycleLength && isValid(periodStartDates[periodStartDates.length - 1])) {
         const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
         const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
         predictedNextPeriod = `Around ${format(nextStartDate, 'MMM do, yyyy')}`;
    }

    // Pregnancy Chance & Fertile Window
    let pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'N/A' = 'N/A';
    let fertileWindowString: string | null = null;
    const today = startOfDay(new Date());
    if (periodStartDates.length > 0 && avgCycleLength && isValid(periodStartDates[periodStartDates.length - 1])) {
        const lastStartDate = periodStartDates[periodStartDates.length - 1];
        const estimatedNextCycleStart = addDays(lastStartDate, avgCycleLength);
        const estimatedOvulationDay = subDays(estimatedNextCycleStart, 14);
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
        fertileWindowString = `${format(fertileWindowStart, 'MMM do')} - ${format(fertileWindowEnd, 'MMM do')}`;

         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: subDays(fertileWindowStart, 2), end: addDays(fertileWindowEnd, 2) })) { // Shorter buffer
             pregnancyChance = 'Moderate';
         } else {
             pregnancyChance = 'Low';
         }
    }

    // Format Chart Data
    const cycleLengths = cycleLengthsData.map((length, index) => ({ cycleNumber: index + 1, length }));
    const periodLengths = periodLengthsData.map((length, index) => ({ periodNumber: index + 1, length }));
    const phaseOrder: CyclePhase[] = ['Period', 'Follicular', 'Fertile Window', 'Luteal', 'Unknown'];
    const activityByPhase = phaseOrder.map(phase => ({ phase, count: activityByPhaseCounts[phase] || 0 }));
    const symptomsByPhase = phaseOrder.map(phase => {
        const totalCount = Object.values(symptomsByPhaseCounts[phase]).reduce((sum, count) => sum + count, 0);
        return { phase, count: totalCount };
    });


    return {
        avgCycleLength, minCycleLength, maxCycleLength, cycleLengthTrend,
        avgPeriodLength, minPeriodLength, maxPeriodLength,
        predictedNextPeriod,
        cycleLengths, periodLengths,
        totalSexualActivityDays, totalActivityCount, protectedActivityDays, unprotectedActivityDays,
        activityFrequency, protectionRate,
        pregnancyChance, fertileWindowString,
        activityByPhase, symptomsByPhase,
        totalSymptomCount,
    };
};


// Define chart configurations with labels
const cycleLengthChartConfig = {
  length: { label: "Cycle Length (Days)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const periodLengthChartConfig = {
  length: { label: "Period Length (Days)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const activityChartConfig = {
  count: { label: "Activity Count", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const symptomChartConfig = {
  count: { label: "Total Symptoms", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


// Helper to format numbers or return 'N/A'
const formatNumber = (num: number | null | undefined): string => {
    return num !== null && num !== undefined ? num.toString() : 'N/A';
};


// Tooltip formatter
const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Access the data point
    const configEntry = payload[0].payload.config; // Get the label from config if available

    let labelText = configEntry?.label || payload[0].name || 'Value'; // Use config label or default

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5"> {/* Adjusted grid layout */}
          {label && <p className="text-sm text-muted-foreground">{label}</p>}
           <p className="text-sm font-medium">{`${labelText}: ${payload[0].value}`}</p>
        </div>
      </div>
    );
  }
  return null;
};


export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState(() => calculateCycleInsights({}));
  const [healthTips, setHealthTips] = React.useState<string>('');
  const [isTipsLoading, setIsTipsLoading] = React.useState(false);
  const { toast } = useToast();

 React.useEffect(() => {
    if (!isLoading && logData) {
      const calculatedInsights = calculateCycleInsights(logData);
      console.log("Calculated Insights:", calculatedInsights);
      setInsights(calculatedInsights);
    } else if (!isLoading && Object.keys(logData).length === 0) {
        setInsights(calculateCycleInsights({}));
    }
  }, [logData, isLoading]);

  // Load health tips from localStorage on mount
  React.useEffect(() => {
    const storedTips = localStorage.getItem(TIPS_STORAGE_KEY);
    if (storedTips) {
        setHealthTips(storedTips);
    }
  }, []);


  // Handler to fetch health tips
  const handleGetTips = async () => {
    setIsTipsLoading(true);
    setHealthTips(''); // Clear previous tips visually, but localStorage clears below
    localStorage.removeItem(TIPS_STORAGE_KEY); // Clear cache
    try {
        const currentPhase = getCyclePhase(
            startOfDay(new Date()),
            Object.values(logData)
                .filter(log => log.periodFlow && log.periodFlow !== 'none' && log.date)
                .map(log => parseISO(log.date!))
                .filter(isValid)
                .sort((a, b) => a.getTime() - b.getTime()),
            insights.avgCycleLength,
            insights.avgPeriodLength
        );

        const relevantSymptoms = Object.entries(logData)
            .sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime())
            .slice(-7) // Look at last 7 days
            .flatMap(([, log]) => log.symptoms || []);
        const uniqueSymptoms = [...new Set(relevantSymptoms)];

        const { tips } = await getMenstrualTips({
            currentPhase: currentPhase !== 'Unknown' ? currentPhase : undefined,
            recentSymptoms: uniqueSymptoms.length > 0 ? uniqueSymptoms : undefined,
        });
        setHealthTips(tips);
        localStorage.setItem(TIPS_STORAGE_KEY, tips); // Cache the new tips
    } catch (error) {
      console.error('Error fetching health tips:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch health tips at this time.',
        variant: 'destructive',
      });
    } finally {
      setIsTipsLoading(false);
    }
  };

  // Prepare chart data, ensuring it uses the structure expected by charts
  const cycleLengthChartData = React.useMemo(() => insights.cycleLengths.map(item => ({
      ...item,
      fill: "var(--color-length)",
      name: `Cycle ${item.cycleNumber}` // Add name for tooltip label
  })), [insights.cycleLengths]);

  const periodLengthChartData = React.useMemo(() => insights.periodLengths.map(item => ({
      ...item,
      fill: "var(--color-length)",
      name: `Period ${item.periodNumber}` // Add name for tooltip label
  })), [insights.periodLengths]);

  const activityChartData = React.useMemo(() => insights.activityByPhase.map(item => ({
      ...item,
      fill: "var(--color-count)",
      name: item.phase // Use phase name for tooltip label
  })), [insights.activityByPhase]);

  const symptomChartData = React.useMemo(() => insights.symptomsByPhase.map(item => ({
      ...item,
      fill: "var(--color-count)",
      name: item.phase // Use phase name for tooltip label
  })), [insights.symptomsByPhase]);


  // Render Loading State
  if (isLoading) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-lg space-y-6"> {/* Increased max-width */}
             <h1 className="text-3xl font-bold text-center mb-8">Your Cycle Insights</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[...Array(6)].map((_, i) => ( // More skeletons for a grid layout
                    <Card key={i}>
                        <CardHeader><CardTitle><Skeleton className="h-7 w-3/4" /></CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-5 w-1/3" />
                        </CardContent>
                    </Card>
                 ))}
             </div>
        </div>
     );
  }

  const noDataMessage = (feature: string) => (
      <p className="text-muted-foreground text-sm italic">Log data to see {feature}.</p>
  );
  const noChartDataMessage = (action: string) => (
      <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md p-4">
         <p className="text-muted-foreground text-center text-sm">{action}</p>
      </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-lg space-y-8"> {/* Increased max-width & spacing */}
      <h1 className="text-3xl font-bold text-center mb-8">Your Cycle Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Get Health Tips Card */}
        <Dialog>
            <DialogTrigger asChild>
                 <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-accent/10 to-primary/10 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center text-accent">
                            <Lightbulb className="mr-2 h-6 w-6"/> Get Personalized Health Tips
                        </CardTitle>
                        <CardDescription className="!mt-1 text-xs">
                             Receive AI-powered tips related to your cycle phase, symptoms, nutrition, and well-being.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button variant="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={(e) => { e.stopPropagation(); handleGetTips(); }}> {/* Prevent triggering Dialog open when clicking button inside trigger */}
                             Generate Tips
                         </Button>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-accent" /> Health & Wellness Tips</DialogTitle>
                    <DialogDescription>
                        General tips based on common menstrual health knowledge. Remember, this is not medical advice.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] p-4 border rounded-md my-4"> {/* Added ScrollArea */}
                     {isTipsLoading ? (
                        <div className="flex justify-center items-center h-40">
                             <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        </div>
                    ) : healthTips ? (
                         <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                             {healthTips}
                         </div>
                     ) : (
                         <p className="text-muted-foreground text-center italic">Click "Generate Tips" again to get advice.</p>
                    )}
                </ScrollArea>
                 <DialogFooter>
                     <DialogClose asChild>
                         <Button type="button" variant="secondary">
                             Close
                         </Button>
                    </DialogClose>
                     <Button type="button" onClick={handleGetTips} disabled={isTipsLoading}>
                        {isTipsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                         Regenerate Tips
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        {/* Baby Planning Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2">
            <CardHeader>
                 {/* Use Baby icon if available, otherwise HeartHandshake */}
                 <CardTitle className="text-xl flex items-center text-pink-600 dark:text-pink-400">
                    <Baby className="mr-2 h-6 w-6"/> {/* Or HeartHandshake */}
                    Baby Planning Center
                </CardTitle>
                 <CardDescription className="!mt-1 text-xs text-muted-foreground">
                    Explore resources and checklists to help you prepare for conception.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/baby-planning">
                         Explore Planning Resources
                    </Link>
                </Button>
            </CardContent>
        </Card>


        {/* Cycle Summary Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary">
                <CalendarDays className="mr-2 h-6 w-6"/> Cycle Summary
            </CardTitle>
            {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1 text-xs">Log at least 2 full cycles for detailed summaries.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Avg Length:</span> <span className="font-semibold">{formatNumber(insights.avgCycleLength)} days</span></div>
                <div className="flex justify-between"><span>Range:</span> <span className="font-semibold">{formatNumber(insights.minCycleLength)}-{formatNumber(insights.maxCycleLength)} days</span></div>
                {insights.cycleLengthTrend && (
                    <div className="flex justify-between items-center">
                        <span>Trend:</span>
                        <span className={cn("font-semibold flex items-center",
                            insights.cycleLengthTrend === 'increasing' && 'text-orange-500',
                            insights.cycleLengthTrend === 'decreasing' && 'text-blue-500',
                            insights.cycleLengthTrend === 'stable' && 'text-green-500'
                        )}>
                            {insights.cycleLengthTrend === 'increasing' && <TrendingUp className="mr-1 h-4 w-4"/>}
                            {insights.cycleLengthTrend === 'decreasing' && <TrendingDown className="mr-1 h-4 w-4"/>}
                            {insights.cycleLengthTrend === 'stable' && <MinusIcon className="mr-1 h-4 w-4"/>}
                            {insights.cycleLengthTrend.charAt(0).toUpperCase() + insights.cycleLengthTrend.slice(1)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border/50"><span>Predicted Next:</span> <span className="font-semibold text-right">{insights.predictedNextPeriod || 'N/A'}</span></div>
            </CardContent>
        </Card>

        {/* Period Summary Card */}
         <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="text-xl flex items-center text-chart-2">
                    <Droplet className="mr-2 h-6 w-6"/> Period Summary
                </CardTitle>
                 {insights.periodLengths.length < 1 && <CardDescription className="!mt-1 text-xs">Log period start and end for summaries.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Avg Length:</span> <span className="font-semibold">{formatNumber(insights.avgPeriodLength)} days</span></div>
                <div className="flex justify-between"><span>Range:</span> <span className="font-semibold">{formatNumber(insights.minPeriodLength)}-{formatNumber(insights.maxPeriodLength)} days</span></div>
                {/* Add trend or consistency if enough data? */}
            </CardContent>
        </Card>

       {/* Fertility Estimate Card */}
       <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="text-xl flex items-center text-green-600">
                    <Percent className="mr-2 h-6 w-6"/> Fertility Estimate
                </CardTitle>
                <CardDescription className={cn("!mt-1 text-xs text-muted-foreground")}>
                    Estimated based on average cycle length. Not a reliable method of contraception or conception planning. Consult a healthcare professional for accurate advice.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span>Est. Fertile Window:</span> <span className="font-semibold">{insights.fertileWindowString || 'N/A'}</span></div>
                <div className="flex justify-between">
                    <span>Est. Chance Today:</span>
                    <span className={cn(
                        "font-bold text-lg", // Make it more prominent
                        insights.pregnancyChance === 'Higher' && 'text-red-600 dark:text-red-400',
                        insights.pregnancyChance === 'Moderate' && 'text-yellow-600 dark:text-yellow-400',
                        insights.pregnancyChance === 'Low' && 'text-green-600 dark:text-green-400',
                        insights.pregnancyChance === 'N/A' && 'text-muted-foreground italic'
                    )}>{insights.pregnancyChance}</span>
                </div>
            </CardContent>
        </Card>


       {/* Sexual Activity Summary Card */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
            <CardTitle className="text-xl flex items-center text-red-500">
                <HeartPulse className="mr-2 h-6 w-6"/> Activity Summary
            </CardTitle>
            {insights.totalActivityCount === 0 && <CardDescription className="!mt-1 text-xs">Log sexual activity for summaries.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Total Count:</span> <span className="font-semibold">{insights.totalActivityCount}</span></div>
                <div className="flex justify-between"><span>Days w/ Activity:</span> <span className="font-semibold">{insights.totalSexualActivityDays}</span></div>
                <div className="flex justify-between"><span>Frequency:</span> <span className="font-semibold">{insights.activityFrequency > 0 ? `${insights.activityFrequency.toFixed(0)}% of days` : 'N/A'}</span></div>
                 <div className="flex justify-between"><span>Protection Rate:</span> <span className="font-semibold">
                    {insights.protectionRate !== null
                        ? `${insights.protectionRate.toFixed(0)}% of active days` // Clarified label
                        : 'N/A'}
                 </span></div>
            </CardContent>
        </Card>

       {/* Cycle Length History Card */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow"> {/* Span across columns */}
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
             <BarChartIcon className="mr-2 h-5 w-5 text-chart-1"/> Cycle Length History
          </CardTitle>
           {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1 text-xs">Log at least 2 full cycles to visualize history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {cycleLengthChartData.length > 0 ? (
             <ChartContainer config={cycleLengthChartConfig} className="h-52 w-full"> {/* Increased height */}
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cycleLengthChartData} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}> {/* Adjusted margins */}
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="cycleNumber"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `C${value}`}
                            fontSize={10}
                        />
                        <YAxis
                             type="number"
                             domain={['dataMin - 2', 'dataMax + 2']}
                             allowDecimals={false}
                             tickLine={false}
                             axisLine={false}
                             tickMargin={8}
                             fontSize={10}
                             width={30}
                             label={{ value: 'Days', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px', fill: 'hsl(var(--muted-foreground))' } }} // Y-axis label
                        />
                        <ChartTooltip
                             cursor={{ fill: 'hsl(var(--muted)/0.3)'}}
                             content={<CustomTooltipContent />} // Use custom tooltip
                         />
                        <Bar dataKey="length" name="Cycle Length" radius={4} fill="var(--color-length)">
                             <LabelList dataKey="length" position="top" offset={5} fontSize={10} fill="hsl(var(--foreground)/0.8)" /> {/* Show value labels */}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
              noChartDataMessage("Log more cycle start dates to visualize your cycle length history.")
          )}
        </CardContent>
      </Card>

      {/* Period Length History Card */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
             <Droplet className="mr-2 h-5 w-5 text-chart-2"/> Period Length History
          </CardTitle>
           {insights.periodLengths.length < 1 && <CardDescription className="!mt-1 text-xs">Log period start and end dates for history.</CardDescription>}
        </CardHeader>
        <CardContent>
            {periodLengthChartData.length > 0 ? (
                 <ChartContainer config={periodLengthChartConfig} className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={periodLengthChartData} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="periodNumber"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => `P${value}`}
                                fontSize={10}
                            />
                            <YAxis
                                type="number"
                                domain={['dataMin - 1', 'dataMax + 1']}
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                fontSize={10}
                                width={30}
                                label={{ value: 'Days', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px', fill: 'hsl(var(--muted-foreground))' } }}
                            />
                             <ChartTooltip
                                cursor={{ fill: 'hsl(var(--muted)/0.3)'}}
                                content={<CustomTooltipContent />}
                             />
                            <Bar dataKey="length" name="Period Length" radius={4} fill="var(--color-length)">
                                <LabelList dataKey="length" position="top" offset={5} fontSize={10} fill="hsl(var(--foreground)/0.8)" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                noChartDataMessage("Log your period flow and mark the last day to visualize period length history.")
            )}
        </CardContent>
      </Card>

      {/* Sexual Activity Patterns Card */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
             <Activity className="mr-2 h-5 w-5 text-chart-4"/> Activity by Cycle Phase
          </CardTitle>
           {insights.totalActivityCount === 0 && <CardDescription className="!mt-1 text-xs">Log activity to see patterns.</CardDescription>}
        </CardHeader>
        <CardContent>
           {activityChartData.filter(d => d.phase !== 'Unknown').length > 0 && insights.totalActivityCount > 0 ? (
             <ChartContainer config={activityChartConfig} className="h-52 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChartData.filter(d => d.phase !== 'Unknown')} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="phase"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={9}
                            interval={0}
                        />
                        <YAxis
                             type="number"
                             domain={[0, 'dataMax + 1']}
                             allowDecimals={false}
                             tickLine={false}
                             axisLine={false}
                             tickMargin={8}
                             fontSize={10}
                             width={30}
                             label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px', fill: 'hsl(var(--muted-foreground))' } }}
                        />
                         <ChartTooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.3)'}}
                            content={<CustomTooltipContent />}
                         />
                        <Bar dataKey="count" name="Activity Count" radius={4} fill="var(--color-count)">
                             <LabelList dataKey="count" position="top" offset={5} fontSize={10} fill="hsl(var(--foreground)/0.8)" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
             noChartDataMessage("Log sexual activity to visualize patterns across your cycle phases.")
           )}
        </CardContent>
      </Card>


      {/* Symptom Patterns Card */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
             <Info className="mr-2 h-5 w-5 text-chart-3"/> Symptom Frequency by Cycle Phase
          </CardTitle>
           {insights.totalSymptomCount === 0 && <CardDescription className="!mt-1 text-xs">Log symptoms to uncover patterns.</CardDescription>}
           <CardDescription className="!mt-1 text-xs text-muted-foreground">Shows the total number of times symptoms were logged in each phase.</CardDescription>
        </CardHeader>
        <CardContent>
           {symptomChartData.filter(d => d.phase !== 'Unknown').length > 0 && insights.totalSymptomCount > 0 ? (
             <ChartContainer config={symptomChartConfig} className="h-52 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={symptomChartData.filter(d => d.phase !== 'Unknown')} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="phase"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={9}
                            interval={0}
                        />
                        <YAxis
                             type="number"
                             domain={[0, 'dataMax + 1']}
                             allowDecimals={false}
                             tickLine={false}
                             axisLine={false}
                             tickMargin={8}
                             fontSize={10}
                             width={30}
                             label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px', fill: 'hsl(var(--muted-foreground))' } }}
                        />
                         <ChartTooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.3)'}}
                            content={<CustomTooltipContent />}
                         />
                        <Bar dataKey="count" name="Total Symptoms" radius={4} fill="var(--color-count)">
                             <LabelList dataKey="count" position="top" offset={5} fontSize={10} fill="hsl(var(--foreground)/0.8)" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
           ) : (
              noChartDataMessage("Log symptoms on the calendar to visualize patterns across your cycle phases.")
           )}
        </CardContent>
      </Card>

      </div> {/* Close grid */}
    </div> /* Close container */
  );
}

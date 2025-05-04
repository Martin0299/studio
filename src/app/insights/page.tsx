// src/app/insights/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplet, CalendarDays, HeartPulse, Percent, Activity, LineChart, BarChart as BarChartIcon, Info } from 'lucide-react'; // Added Info icon
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays, subDays, isWithinInterval, isValid, isAfter, isEqual, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// Define cycle phases
type CyclePhase = 'Period' | 'Follicular' | 'Fertile Window' | 'Luteal' | 'Unknown';

// Helper function to determine cycle phase for a given date
const getCyclePhase = (
    date: Date,
    periodStartDates: Date[],
    avgCycleLength: number | null,
    avgPeriodLength: number | null
): CyclePhase => {
    if (!avgCycleLength || !avgPeriodLength || periodStartDates.length === 0) {
        return 'Unknown';
    }

    // Find the cycle this date belongs to
    let cycleStartDate: Date | null = null;
    let cycleEndDate: Date | null = null;
    let nextCycleStartDate: Date | null = null;

    for (let i = periodStartDates.length - 1; i >= 0; i--) {
        const currentStart = periodStartDates[i];
        const estimatedNextStart = addDays(currentStart, avgCycleLength);

        if (!isAfter(date, estimatedNextStart)) { // Belongs to the cycle starting on currentStart or before
            cycleStartDate = currentStart;
            nextCycleStartDate = estimatedNextStart;
            // Estimate the end date of the period
             const periodEndDate = addDays(cycleStartDate, avgPeriodLength - 1);
             cycleEndDate = periodEndDate; // Keep this for clarity, might refine later

             // Period Phase
             if (isWithinInterval(date, { start: cycleStartDate, end: periodEndDate })) {
                 return 'Period';
             }
             break;
        }
    }

    if (!cycleStartDate || !nextCycleStartDate || !cycleEndDate) {
        // If the date is before the very first logged period start, it's Unknown
        if (periodStartDates.length > 0 && isBefore(date, periodStartDates[0])) {
             return 'Unknown';
        }
        // If it's after the last known cycle but we lack enough data to predict the next one reliably
         // This might still be improved based on how predictions are handled
         return 'Unknown';
    }

    // Estimate ovulation day (approx. 14 days before next cycle starts)
    const ovulationDay = subDays(nextCycleStartDate, 14);

    // Fertile Window (approx. 5 days before + ovulation day + 1 day after)
    const fertileWindowStart = subDays(ovulationDay, 5);
    const fertileWindowEnd = addDays(ovulationDay, 1);
    if (isWithinInterval(date, { start: fertileWindowStart, end: fertileWindowEnd })) {
        return 'Fertile Window';
    }

    // Follicular Phase (After period ends, before fertile window starts)
    const follicularStart = addDays(cycleEndDate, 1); // Day after period ends
    const follicularEnd = subDays(fertileWindowStart, 1); // Day before fertile window
    // Check if follicularEnd is before follicularStart (can happen with very short cycles/long periods)
    if (!isBefore(follicularEnd, follicularStart)) {
        if (isWithinInterval(date, { start: follicularStart, end: follicularEnd })) {
             return 'Follicular';
        }
    } else if (isEqual(date, follicularStart)) { // Handle case where follicular phase is only one day
         return 'Follicular';
    }


    // Luteal Phase (After fertile window ends, before next period starts)
    const lutealStart = addDays(fertileWindowEnd, 1); // Day after fertile window
    const lutealEnd = subDays(nextCycleStartDate, 1); // Day before next period
    // Check if lutealEnd is before lutealStart (unlikely but possible with calculation issues)
    if (!isBefore(lutealEnd, lutealStart)) {
        if (isWithinInterval(date, { start: lutealStart, end: lutealEnd })) {
            return 'Luteal';
        }
    } else if (isEqual(date, lutealStart)) { // Handle case where luteal phase is only one day
        return 'Luteal';
    }

    return 'Unknown'; // Default if it doesn't fit neatly
};


// Helper function to calculate cycle insights from log data
const calculateCycleInsights = (logData: Record<string, LogData>): {
    avgCycleLength: number | null;
    avgPeriodLength: number | null;
    predictedNextPeriod: string | null;
    cycleLengths: number[];
    periodLengths: number[];
    totalSexualActivityDays: number;
    totalActivityCount: number;
    protectedActivityDays: number;
    unprotectedActivityDays: number;
    activityFrequency: number;
    protectionRate: number | null;
    pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'Not enough data';
    fertileWindowString: string;
    activityByPhase: Record<CyclePhase, number>; // Added for activity chart
    symptomsByPhase: Record<CyclePhase, Record<string, number>>; // Added for symptom chart
    totalSymptomCount: number; // Added total count for quick check
} => {
    const periodStartDates: Date[] = [];
    const periodLengths: number[] = [];
    const cycleLengths: number[] = [];
    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;
    let totalSymptomCount = 0; // Initialize total symptom count

    const activityByPhase: Record<CyclePhase, number> = {
        'Period': 0, 'Follicular': 0, 'Fertile Window': 0, 'Luteal': 0, 'Unknown': 0,
    };
    // Initialize symptomsByPhase with all phases and empty symptom records
     const symptomsByPhase: Record<CyclePhase, Record<string, number>> = {
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
        }) // Filter out invalid date strings
        .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

    // 1. Identify all period start dates
    sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry || !entry.date) return;

        const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';
        const date = startOfDay(parseISO(entry.date)); // Ensure date is normalized

        const prevDay = subDays(date, 1);
        const prevDayString = format(prevDay, 'yyyy-MM-dd');
        const prevLog = logData[prevDayString];
        const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

        if (isPeriodStart) {
             periodStartDates.push(date);
             if (periodStartDates.length > 1) {
                 const previousStartDate = periodStartDates[periodStartDates.length - 2];
                 const cycleLength = differenceInDays(date, previousStartDate);
                 if (cycleLength > 10 && cycleLength < 100) { // Basic validation for plausible cycle lengths
                     cycleLengths.push(cycleLength);
                 }
             }
        }
    });

     // 2. Calculate Averages needed for phase calculation
     const avgCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : null;

    // 3. Calculate period lengths based on start and end dates
    periodStartDates.forEach((startDate) => {
        let endDate: Date | null = null;
        let lastFlowDate = startDate;
        const searchLimit = addDays(startDate, 20); // Limit search to avoid infinite loops in odd cases

        // Iterate through sorted dates *after* the start date
        for (let d = 0; d < sortedDates.length; d++) {
            const currentDateString = sortedDates[d];
            const currentDate = startOfDay(parseISO(currentDateString)); // Normalize

            // Skip dates before or on the current start date
            if (!isAfter(currentDate, startDate)) {
                 // Special case: If period starts and ends on the same day
                 if(isEqual(currentDate, startDate) && logData[currentDateString]?.isPeriodEnd) {
                    endDate = currentDate;
                    break; // Found end date on the same day
                }
                continue; // Move to the next date
            }

             // Stop searching if we go too far past the start date
             if (isAfter(currentDate, searchLimit)) {
                 break;
             }

             const currentEntry = logData[currentDateString];

             // If an end marker is found, use that date
             if (currentEntry?.isPeriodEnd) {
                endDate = currentDate;
                break;
             }

             // Keep track of the last day with *any* flow
             if (currentEntry?.periodFlow && currentEntry.periodFlow !== 'none') {
                 lastFlowDate = currentDate;
             }
        }

        // If no explicit end marker was found, use the last day with flow as the end date
        if (!endDate) {
            // Only assign lastFlowDate if it's different from startDate or if startDate had isPeriodEnd=true
             if (!isEqual(startDate, lastFlowDate) || logData[format(startDate, 'yyyy-MM-dd')]?.isPeriodEnd) {
                endDate = lastFlowDate;
             } else {
                 // If only the start day had flow and no end marker, period is 1 day
                 endDate = startDate;
             }
        }

        // Calculate length if we have a valid end date
        if (endDate) {
             const length = differenceInDays(endDate, startDate) + 1;
             if (length > 0 && length < 20) { // Basic validation for plausible period lengths
                 periodLengths.push(length);
             }
        }
    });


     // Correct average period length calculation
    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null;

     // 4. Process Activity and Symptoms, assigning them to phases
     sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry || !entry.date) return;
        const date = startOfDay(parseISO(entry.date)); // Normalize date

        // Determine the cycle phase for this date using calculated averages
        const phase = getCyclePhase(date, periodStartDates, avgCycleLength, avgPeriodLength);

        // Process Sexual Activity
        const activityCount = entry.sexualActivityCount ?? 0;
        if (activityCount > 0) {
            totalSexualActivityDays++;
            totalActivityCount += activityCount;
            if (entry.protectionUsed === true) {
                protectedActivityDays++;
            } else if (entry.protectionUsed === false) {
                unprotectedActivityDays++;
            }
             activityByPhase[phase] += activityCount; // Add count to the specific phase
        }

        // Process Symptoms
         if (entry.symptoms && entry.symptoms.length > 0) {
             entry.symptoms.forEach(symptom => {
                 if (!symptomsByPhase[phase][symptom]) {
                     symptomsByPhase[phase][symptom] = 0;
                 }
                 symptomsByPhase[phase][symptom]++;
                 totalSymptomCount++; // Increment total symptom count
             });
         }
     });

    // Final calculations
    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    const protectionRate = totalActivityCount > 0 ? (protectedActivityDays / totalActivityCount) * 100 : null; // Corrected: Base protection rate on total *count* if meaningful, or days otherwise. Let's use days.
    // const protectionRate = totalSexualActivityDays > 0 ? (protectedActivityDays / totalSexualActivityDays) * 100 : null;


    // Predict next period
    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength && avgPeriodLength > 0) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1);
        predictedNextPeriod = `${format(nextStartDate, 'MMM do')} - ${format(nextEndDate, 'MMM do, yyyy')}`;
    } else if (periodStartDates.length > 0 && avgCycleLength) {
         const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
         const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
         predictedNextPeriod = `Around ${format(nextStartDate, 'MMM do, yyyy')}`;
    }

    // Basic Pregnancy Chance & Fertile Window
    let pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'Not enough data' = 'Not enough data';
    let fertileWindowString = 'Not enough data';
    const today = startOfDay(new Date()); // Normalize today
    if (periodStartDates.length > 0 && avgCycleLength) {
        const lastStartDate = periodStartDates[periodStartDates.length - 1];
        const estimatedNextCycleStart = addDays(lastStartDate, avgCycleLength);
        const estimatedOvulationDay = subDays(estimatedNextCycleStart, 14); // Simple Luteal Phase assumption
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
        fertileWindowString = `${format(fertileWindowStart, 'MMM do')} - ${format(fertileWindowEnd, 'MMM do')}`;

         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: subDays(fertileWindowStart, 3), end: addDays(fertileWindowEnd, 3) })) {
             // Include buffer days around the fertile window for 'Moderate'
             pregnancyChance = 'Moderate';
         } else {
             pregnancyChance = 'Low';
         }
    } else {
        pregnancyChance = 'Not enough data';
    }


    return {
        avgCycleLength,
        avgPeriodLength,
        predictedNextPeriod,
        cycleLengths,
        periodLengths,
        totalSexualActivityDays,
        totalActivityCount,
        protectedActivityDays,
        unprotectedActivityDays,
        activityFrequency,
        protectionRate,
        pregnancyChance,
        fertileWindowString,
        activityByPhase,
        symptomsByPhase, // Return symptom breakdown
        totalSymptomCount, // Return total symptom count
    };
};


// Define chart configurations
const cycleLengthChartConfig = {
  length: {
    label: "Cycle Length (Days)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const activityChartConfig = {
  count: {
    label: "Activity Count",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

const symptomChartConfig = {
  count: {
    label: "Total Symptoms Logged",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;


export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState(() => calculateCycleInsights({})); // Initialize with default empty state using function


 React.useEffect(() => {
    if (!isLoading && logData) {
      const calculatedInsights = calculateCycleInsights(logData);
      console.log("Calculated Insights:", calculatedInsights); // Log insights
      setInsights(calculatedInsights);
    } else if (!isLoading && Object.keys(logData).length === 0) {
        // Explicitly reset if logData is empty after loading
        setInsights(calculateCycleInsights({}));
    }
  }, [logData, isLoading]);


  // Format cycle length data for the chart
  const cycleLengthChartData = React.useMemo(() => {
      if (insights.cycleLengths.length < 1) return []; // Allow chart with even one cycle length
      return insights.cycleLengths.map((length, index) => ({
          cycleNumber: index + 1,
          length: length,
          fill: "var(--color-length)", // Add fill color
      }));
  }, [insights.cycleLengths]);

  // Format sexual activity data for the chart
   const activityChartData = React.useMemo(() => {
     const phaseOrder: CyclePhase[] = ['Period', 'Follicular', 'Fertile Window', 'Luteal', 'Unknown'];
     return phaseOrder
       .map(phase => ({
         phase: phase,
         count: insights.activityByPhase[phase] || 0,
         fill: "var(--color-count)", // Add fill color
       }))
       .filter(item => item.count > 0 || item.phase !== 'Unknown' || insights.totalActivityCount > 0); // Show all phases if any activity exists
   }, [insights.activityByPhase, insights.totalActivityCount]);

   // Format symptom data for the chart (Total symptoms per phase)
   const symptomChartData = React.useMemo(() => {
        const phaseOrder: CyclePhase[] = ['Period', 'Follicular', 'Fertile Window', 'Luteal', 'Unknown'];
        return phaseOrder.map(phase => {
            const symptomsInPhase = insights.symptomsByPhase[phase];
            // Sum up the counts of all symptoms within this phase
            const totalCount = Object.values(symptomsInPhase).reduce((sum, count) => sum + count, 0);
            return {
                phase: phase,
                count: totalCount,
                fill: "var(--color-count)", // Use symptom color from config
            };
        })
        .filter(item => item.count > 0 || item.phase !== 'Unknown' || insights.totalSymptomCount > 0); // Show all phases if any symptoms exist
    }, [insights.symptomsByPhase, insights.totalSymptomCount]);


  // Render Loading State
  if (isLoading) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
             <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>
             {[...Array(7)].map((_, i) => ( // Increased skeleton count
                <Card key={i}>
                    <CardHeader><CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
             ))}
        </div>
     );
  }

  // Render Content when data is loaded
  const hasEnoughCycleData = insights.avgCycleLength !== null; // Need at least one cycle for average
  const hasEnoughPeriodData = insights.avgPeriodLength !== null; // Need at least one period for average

  return (
    <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>

      {/* Cycle Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <CalendarDays className="mr-2 h-5 w-5 text-primary"/> Cycle Summary
          </CardTitle>
          {!hasEnoughCycleData && <CardDescription className="!mt-1">Log at least two full cycles to see summaries.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Average Cycle Length: <span className="font-medium">{insights.avgCycleLength ? `${insights.avgCycleLength} days` : 'Not enough data'}</span></p>
          <p>Average Period Length: <span className="font-medium">{insights.avgPeriodLength ? `${insights.avgPeriodLength} days` : 'Not enough data'}</span></p>
          <p>Predicted Next Period: <span className="font-medium">{insights.predictedNextPeriod || 'Not enough data'}</span></p>
        </CardContent>
      </Card>

       {/* Sexual Activity Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <HeartPulse className="mr-2 h-5 w-5 text-red-500"/> Sexual Activity Summary
          </CardTitle>
          {insights.totalActivityCount === 0 && <CardDescription className="!mt-1">Log sexual activity to see summaries.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Total Activity Count: <span className="font-medium">{insights.totalActivityCount}</span></p>
          <p>Days with Activity: <span className="font-medium">{insights.totalSexualActivityDays}</span></p>
          <p>Activity Frequency: <span className="font-medium">{insights.activityFrequency > 0 ? `${insights.activityFrequency.toFixed(1)}% of logged days` : 'No activity logged'}</span></p>
          <p>Protection Rate: <span className="font-medium">
            {/* Base rate on days with activity */}
            {insights.totalSexualActivityDays > 0
             ? `${((insights.protectedActivityDays / insights.totalSexualActivityDays) * 100).toFixed(1)}% of active days`
             : 'No activity logged'}
          </span></p>
        </CardContent>
      </Card>

       {/* Pregnancy Chance Card */}
       <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Percent className="mr-2 h-5 w-5 text-green-500"/> Fertility Estimate
          </CardTitle>
           {insights.pregnancyChance === 'Not enough data' && <CardDescription className="!mt-1">Log more cycles for estimates.</CardDescription>}
          <CardDescription className={cn("!mt-1 text-xs text-muted-foreground", insights.pregnancyChance !== 'Not enough data' && "pt-1")}>
             Based on simple cycle calculation. Not a reliable method of contraception or conception planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Estimated Fertile Window: <span className="font-medium">{insights.fertileWindowString}</span></p>
          <p>Estimated Pregnancy Chance Today: <span className={cn(
                "font-medium",
                insights.pregnancyChance === 'Higher' && 'text-red-600 dark:text-red-400',
                insights.pregnancyChance === 'Moderate' && 'text-yellow-600 dark:text-yellow-400',
                insights.pregnancyChance === 'Low' && 'text-green-600 dark:text-green-400',
                insights.pregnancyChance === 'Not enough data' && 'text-muted-foreground italic'
              )}>{insights.pregnancyChance}</span>
          </p>
        </CardContent>
      </Card>

       {/* Cycle Length History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <BarChartIcon className="mr-2 h-5 w-5 text-chart-1"/> Cycle Length History
          </CardTitle>
          {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1">Log at least two full cycles for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {cycleLengthChartData.length > 0 ? (
             <ChartContainer config={cycleLengthChartConfig} className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cycleLengthChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                             width={30} // Ensure space for Y-axis labels
                        />
                         <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent indicator="dot" nameKey="length"/>} // Pass nameKey for label
                             />
                        <Bar dataKey="length" name="Cycle Length" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
              <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                 <p className="text-muted-foreground text-center text-sm px-4">Log more cycle start dates to visualize your cycle length history.</p>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Period Length History Card (Placeholder/Coming Soon) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <Droplet className="mr-2 h-5 w-5 text-chart-2"/> Period Length History
          </CardTitle>
           {!hasEnoughPeriodData && <CardDescription className="!mt-1">Log period flow and end dates for at least one period for history.</CardDescription>}
        </CardHeader>
        <CardContent>
            <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground text-center text-sm px-4">Period length chart coming soon. Log your period flow and mark the last day.</p>
            </div>
        </CardContent>
      </Card>

      {/* Sexual Activity Patterns Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <Activity className="mr-2 h-5 w-5 text-chart-4"/> Activity by Cycle Phase
          </CardTitle>
           {insights.totalActivityCount === 0 && <CardDescription className="!mt-1">Log activity to see patterns.</CardDescription>}
        </CardHeader>
        <CardContent>
           {activityChartData.length > 0 ? (
             <ChartContainer config={activityChartConfig} className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                        />
                         <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent indicator="dot" nameKey="count" />} // Use nameKey for label
                         />
                        <Bar dataKey="count" name="Activity Count" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
              <p className="text-muted-foreground text-center text-sm px-4">Log sexual activity to visualize patterns across your cycle.</p>
            </div>
           )}
        </CardContent>
      </Card>


      {/* Symptom Patterns Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             {/* Using Info icon as a generic representation */}
             <Info className="mr-2 h-5 w-5 text-chart-3"/> Symptom Patterns (Total Count)
          </CardTitle>
           {insights.totalSymptomCount === 0 && <CardDescription className="!mt-1">Log symptoms regularly to uncover patterns.</CardDescription>}
           <CardDescription className="!mt-1 text-xs text-muted-foreground">Shows the total number of symptoms logged per cycle phase.</CardDescription>
        </CardHeader>
        <CardContent>
           {symptomChartData.length > 0 ? (
             <ChartContainer config={symptomChartConfig} className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={symptomChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                        />
                         <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent indicator="dot" nameKey="count" />} // Use nameKey for label
                         />
                        <Bar dataKey="count" name="Total Symptoms" radius={4} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
           ) : (
              <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground text-center text-sm px-4">Log symptoms on the calendar to visualize patterns across your cycle.</p>
              </div>
           )}
           {/* TODO: Add drill-down or specific symptom charts later */}
        </CardContent>
      </Card>

    </div>
  );
}

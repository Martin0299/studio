// src/app/insights/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplet, CalendarDays, HeartPulse, Percent, Activity, LineChart, BarChart as BarChartIcon } from 'lucide-react';
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
    if (isWithinInterval(date, { start: follicularStart, end: follicularEnd })) {
        return 'Follicular';
    }

    // Luteal Phase (After fertile window ends, before next period starts)
    const lutealStart = addDays(fertileWindowEnd, 1); // Day after fertile window
    const lutealEnd = subDays(nextCycleStartDate, 1); // Day before next period
    if (isWithinInterval(date, { start: lutealStart, end: lutealEnd })) {
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
} => {
    const periodStartDates: Date[] = [];
    const periodLengths: number[] = [];
    const cycleLengths: number[] = [];
    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;
    const activityByPhase: Record<CyclePhase, number> = {
        'Period': 0,
        'Follicular': 0,
        'Fertile Window': 0,
        'Luteal': 0,
        'Unknown': 0,
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
                 if (cycleLength > 10 && cycleLength < 100) {
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
        const searchLimit = addDays(startDate, 20);

        for (let d = 0; d < sortedDates.length; d++) {
            const currentDateString = sortedDates[d];
            const currentDate = startOfDay(parseISO(currentDateString)); // Normalize

            if (!isAfter(currentDate, startDate)) {
                 if(isEqual(currentDate, startDate) && logData[currentDateString]?.isPeriodEnd) {
                    endDate = currentDate;
                    break;
                }
                continue;
            }

             if (isAfter(currentDate, searchLimit)) {
                 break;
             }

             const currentEntry = logData[currentDateString];

             if (currentEntry?.isPeriodEnd) {
                endDate = currentDate;
                break;
             }

             if (currentEntry?.periodFlow && currentEntry.periodFlow !== 'none') {
                 lastFlowDate = currentDate;
             }
        }

        if (!endDate) {
            endDate = lastFlowDate;
        }

        if (endDate) {
             const length = differenceInDays(endDate, startDate) + 1;
             if (length > 0 && length < 20) {
                 periodLengths.push(length);
             }
        }
    });

     // Correct average period length calculation
    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null;

     // 4. Process Activity and assign to phases
     sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry || !entry.date) return;
        const date = startOfDay(parseISO(entry.date)); // Normalize date

        const activityCount = entry.sexualActivityCount ?? 0;
        if (activityCount > 0) {
            totalSexualActivityDays++;
            totalActivityCount += activityCount;
            if (entry.protectionUsed === true) {
                protectedActivityDays++;
            } else if (entry.protectionUsed === false) {
                unprotectedActivityDays++;
            }

             // Get phase for the activity date
             const phase = getCyclePhase(date, periodStartDates, avgCycleLength, avgPeriodLength);
             activityByPhase[phase] += activityCount; // Add count to the specific phase
        }
     });

    // Final calculations
    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    const protectionRate = totalSexualActivityDays > 0 ? (protectedActivityDays / totalSexualActivityDays) * 100 : null;

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
        const estimatedOvulationDay = subDays(estimatedNextCycleStart, 14);
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
        fertileWindowString = `${format(fertileWindowStart, 'MMM do')} - ${format(fertileWindowEnd, 'MMM do')}`;

         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: subDays(fertileWindowStart, 3), end: addDays(fertileWindowEnd, 3) })) {
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
        activityByPhase, // Return activity breakdown
    };
};


// Define chart configurations
const cycleLengthChartConfig = {
  length: { // Use 'length' as the data key from cycleLengthChartData
    label: "Cycle Length (Days)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const activityChartConfig = {
  count: { // Use 'count' as the data key from activityChartData
    label: "Activity Count",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;


export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState(calculateCycleInsights({})); // Initialize with default empty state

 React.useEffect(() => {
    if (!isLoading && logData) {
      const calculatedInsights = calculateCycleInsights(logData);
      setInsights(calculatedInsights);
    } else if (!isLoading) {
        setInsights(calculateCycleInsights({}));
    }
  }, [logData, isLoading]);

  // Format cycle length data for the chart
  const cycleLengthChartData = React.useMemo(() => {
      // Only include cycles if there are at least two lengths
      if (insights.cycleLengths.length < 2) return [];
      return insights.cycleLengths.map((length, index) => ({
          cycleNumber: index + 1,
          length: length,
      }));
  }, [insights.cycleLengths]);

  // Format sexual activity data for the chart
   const activityChartData = React.useMemo(() => {
     // Define the desired order of phases
     const phaseOrder: CyclePhase[] = ['Period', 'Follicular', 'Fertile Window', 'Luteal', 'Unknown'];

     return phaseOrder
       .map(phase => ({
         phase: phase,
         count: insights.activityByPhase[phase] || 0, // Get count or default to 0
       }))
       .filter(item => item.count > 0 || item.phase !== 'Unknown'); // Include phases with activity, or keep 'Unknown' if it has activity
   }, [insights.activityByPhase]);


  // Render Loading State
  if (isLoading) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
             <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>
             {[...Array(6)].map((_, i) => ( // Increased skeleton count
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
  const hasEnoughCycleData = insights.avgCycleLength !== null || insights.avgPeriodLength !== null;
  const hasEnoughPeriodData = insights.periodLengths.length >= 2; // Check for period length history

  return (
    <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>

      {/* Cycle Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <CalendarDays className="mr-2 h-5 w-5 text-primary"/> Cycle Summary
          </CardTitle>
          {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1">Log at least two full cycles to see summaries.</CardDescription>}
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
          {insights.totalSexualActivityDays === 0 && <CardDescription className="!mt-1">Log sexual activity to see summaries.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Total Activity Count: <span className="font-medium">{insights.totalActivityCount}</span></p>
          <p>Days with Activity: <span className="font-medium">{insights.totalSexualActivityDays}</span></p>
          <p>Activity Frequency: <span className="font-medium">{insights.activityFrequency.toFixed(1)}% of logged days</span></p>
          <p>Protection Rate: <span className="font-medium">
            {insights.protectionRate !== null ? `${insights.protectionRate.toFixed(1)}% of active days` : 'No activity logged'}
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
          {cycleLengthChartData.length > 0 ? ( // Check if data exists before rendering chart
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
                        />
                         <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent indicator="dot" />} // Use indicator for better hover
                             />
                        <Bar dataKey="length" fill="var(--color-length)" radius={4} />
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

      {/* Period Length History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <Droplet className="mr-2 h-5 w-5 text-chart-2"/> Period Length History
          </CardTitle>
           {!hasEnoughPeriodData && <CardDescription className="!mt-1">Log period flow and end dates for at least two periods for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {hasEnoughPeriodData ? (
            <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground text-sm">Period length chart coming soon</p>
            </div>
          ) : (
             <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                 <p className="text-muted-foreground text-center text-sm px-4">Log your period flow and mark the last day for several periods to see history.</p>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Sexual Activity Patterns Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <Activity className="mr-2 h-5 w-5 text-chart-4"/> Activity by Cycle Phase
          </CardTitle>
           {insights.totalSexualActivityDays < 3 && <CardDescription className="!mt-1">Log activity more often to see patterns.</CardDescription>}
        </CardHeader>
        <CardContent>
           {activityChartData.length > 0 ? ( // Only render chart if there's data
             <ChartContainer config={activityChartConfig} className="h-40 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="phase"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={9} // Slightly smaller font for phase names
                            interval={0} // Ensure all labels are shown
                            // angle={-30} // Angle labels if needed
                            // textAnchor="end"
                        />
                        <YAxis
                             type="number"
                             domain={[0, 'dataMax + 1']} // Start from 0, add padding
                             allowDecimals={false}
                             tickLine={false}
                             axisLine={false}
                             tickMargin={8}
                             fontSize={10}
                             width={30} // Give YAxis a bit more space
                        />
                         <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent indicator="dot" />}
                         />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
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


      {/* Symptom Patterns Card (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <LineChart className="mr-2 h-5 w-5 text-chart-3"/> Symptom Patterns
          </CardTitle>
           <CardDescription className="!mt-1">Log symptoms regularly to uncover patterns.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-center text-sm px-4">Log symptoms on the calendar to visualize patterns across your cycle.</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

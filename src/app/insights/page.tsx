// src/app/insights/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart, Droplet, CalendarDays, HeartPulse, Percent, Activity } from 'lucide-react'; // Added icons
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays, subDays, isWithinInterval, isValid, isAfter, isEqual } from 'date-fns'; // Add subDays, isValid, isAfter, isEqual
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { cn } from '@/lib/utils'; // Import cn utility

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
} => {
    const periodStartDates: Date[] = [];
    const periodLengths: number[] = [];
    const cycleLengths: number[] = [];
    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;

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
        if (!entry || !entry.date) return; // Skip if entry is somehow null/undefined or missing date

        const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';
        const date = parseISO(entry.date); // Parse the date string

        const prevDay = subDays(date, 1);
        const prevDayString = format(prevDay, 'yyyy-MM-dd');
        const prevLog = logData[prevDayString];
        const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

        if (isPeriodStart) {
             periodStartDates.push(date);
             // Calculate cycle length if we have a previous start date
             if (periodStartDates.length > 1) {
                 const previousStartDate = periodStartDates[periodStartDates.length - 2];
                 const cycleLength = differenceInDays(date, previousStartDate);
                 if (cycleLength > 10 && cycleLength < 100) { // Basic validation
                     cycleLengths.push(cycleLength);
                 }
             }
        }

         // Sexual Activity Calculations
        const activityCount = entry.sexualActivityCount ?? 0;
        if (activityCount > 0) {
            totalSexualActivityDays++;
            totalActivityCount += activityCount;
            if (entry.protectionUsed === true) {
                protectedActivityDays++;
            } else if (entry.protectionUsed === false) {
                unprotectedActivityDays++;
            }
        }
    });

    // 2. Calculate period lengths based on start and end dates
    periodStartDates.forEach((startDate, index) => {
        let endDate: Date | null = null;
        let lastFlowDate = startDate; // Initialize last flow date as the start date

        // Search forward from the start date
        const searchLimit = addDays(startDate, 20); // Limit search to avoid excessive loops

        for (let d = 0; d < sortedDates.length; d++) {
            const currentDateString = sortedDates[d];
            const currentDate = parseISO(currentDateString);

             // Skip dates before or on the start date
            if (!isAfter(currentDate, startDate)) {
                 // If it *is* the start date, check if it's also marked as end
                if(isEqual(currentDate, startDate) && logData[currentDateString]?.isPeriodEnd) {
                    endDate = currentDate;
                    break; // Found end on the same day as start
                }
                continue;
            }

             // Stop searching if we go beyond the limit
             if (isAfter(currentDate, searchLimit)) {
                 break;
             }

             const currentEntry = logData[currentDateString];

             // Check for explicit end marker
             if (currentEntry?.isPeriodEnd) {
                endDate = currentDate;
                break; // Found the explicit end date for this period
             }

             // Track the last day flow was logged for implicit end detection
             if (currentEntry?.periodFlow && currentEntry.periodFlow !== 'none') {
                 lastFlowDate = currentDate;
             }
        }

         // If no explicit end was found, use the last recorded flow day as the implicit end
        if (!endDate) {
            endDate = lastFlowDate;
        }

        // Calculate length if we have a valid end date
        if (endDate) {
             const length = differenceInDays(endDate, startDate) + 1; // Inclusive
             if (length > 0 && length < 20) { // Basic validation
                 periodLengths.push(length);
             }
        }
    });


    // Averages
    const avgCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : null; // Return null if no data

    // Correct average period length calculation
    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null; // Return null if no data


    // Sexual Activity Insights
    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    const protectionRate = totalSexualActivityDays > 0 ? (protectedActivityDays / totalSexualActivityDays) * 100 : null; // Rate based on days with activity

    // Predict next period (basic: last start + avg cycle length)
    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength && avgPeriodLength > 0) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        // Predict end based on avg period length, adjust if needed
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1); // -1 because start day counts
        predictedNextPeriod = `${format(nextStartDate, 'MMM do')} - ${format(nextEndDate, 'MMM do, yyyy')}`;
    } else if (periodStartDates.length > 0 && avgCycleLength) {
         // Predict only start date if period length is unknown
         const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
         const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
         predictedNextPeriod = `Around ${format(nextStartDate, 'MMM do, yyyy')}`;
    }


    // Basic Pregnancy Chance Placeholder (Highly inaccurate - needs proper fertile window calculation)
    let pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'Not enough data' = 'Not enough data';
    let fertileWindowString = 'Not enough data';
    const today = new Date();
    if (periodStartDates.length > 0 && avgCycleLength) {
        const lastStartDate = periodStartDates[periodStartDates.length - 1];
        // Estimate ovulation based on avg cycle length (simple midpoint - needs improvement)
        // Ovulation typically occurs 14 days BEFORE the next period starts
        const estimatedNextCycleStart = addDays(lastStartDate, avgCycleLength);
        const estimatedOvulationDay = subDays(estimatedNextCycleStart, 14);

        // Fertile window: typically 5 days before ovulation + ovulation day + 1 day after
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
        fertileWindowString = `${format(fertileWindowStart, 'MMM do')} - ${format(fertileWindowEnd, 'MMM do')}`;

         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: subDays(fertileWindowStart, 3), end: addDays(fertileWindowEnd, 3) })) { // Wider window for 'moderate'
             pregnancyChance = 'Moderate';
         } else {
             pregnancyChance = 'Low'; // Default outside the wider window
         }
    } else {
        pregnancyChance = 'Not enough data';
    }


    return {
        avgCycleLength,
        avgPeriodLength,
        predictedNextPeriod,
        cycleLengths, // Return raw data for charts
        periodLengths, // Return raw data for charts
        totalSexualActivityDays,
        totalActivityCount,
        protectedActivityDays,
        unprotectedActivityDays,
        activityFrequency, // Percentage of logged days with activity
        protectionRate, // Percentage of activity days that were protected
        pregnancyChance,
        fertileWindowString, // Add fertile window info
    };
};


export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState(calculateCycleInsights({})); // Initialize with default empty state

 React.useEffect(() => {
    if (!isLoading && logData) { // Ensure logData is not null/undefined
      const calculatedInsights = calculateCycleInsights(logData);
      setInsights(calculatedInsights);
    } else if (!isLoading) {
        // Handle case with no log data but loading finished
        setInsights(calculateCycleInsights({})); // Calculate with empty data for default null values
    }
     // Intentionally only depend on logData and isLoading.
  }, [logData, isLoading]);


  // Render Loading State
  if (isLoading) { // Only check isLoading now
     return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
             <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>
             {/* Skeleton Cards */}
             {[...Array(5)].map((_, i) => (
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


  return (
    <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-center mb-6">Your Insights</h1>

      {/* Cycle Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <CalendarDays className="mr-2 h-5 w-5 text-primary"/> Cycle Summary
          </CardTitle>
          {!hasEnoughCycleData && insights.cycleLengths.length < 2 && <CardDescription className="!mt-1">Log at least two full cycles to see summaries.</CardDescription>}
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
             <BarChart className="mr-2 h-5 w-5 text-chart-1"/> Cycle Length History
          </CardTitle>
          {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1">Log at least two full cycles for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {insights.cycleLengths.length >= 2 ? (
             <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground text-sm">Cycle length chart coming soon</p>
                {/* TODO: Implement Bar Chart using shadcn/ui charts */}
                 {/* <p className="text-xs text-muted-foreground mt-2">Data: {insights.cycleLengths.join(', ')}</p> */}
             </div>
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
           {insights.periodLengths.length < 2 && <CardDescription className="!mt-1">Log period flow and end dates for at least two periods for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {insights.periodLengths.length >= 2 ? (
            <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground text-sm">Period length chart coming soon</p>
                {/* TODO: Implement Bar Chart for Period Length */}
                 {/* <p className="text-xs text-muted-foreground mt-2">Data: {insights.periodLengths.join(', ')}</p> */}
            </div>
          ) : (
             <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                 <p className="text-muted-foreground text-center text-sm px-4">Log your period flow and mark the last day for several periods to see history.</p>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Sexual Activity Patterns Card (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <Activity className="mr-2 h-5 w-5 text-chart-4"/> Sexual Activity Patterns
          </CardTitle>
           {insights.totalSexualActivityDays < 3 && <CardDescription className="!mt-1">Log activity more often to see patterns.</CardDescription>}
        </CardHeader>
        <CardContent>
           <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-center text-sm px-4">Log sexual activity to visualize patterns across your cycle.</p>
            {/* TODO: Implement Chart showing activity relative to cycle phase */}
          </div>
        </CardContent>
      </Card>


      {/* Symptom Patterns Card (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <LineChart className="mr-2 h-5 w-5 text-chart-3"/> Symptom Patterns
          </CardTitle>
          {/* Add condition based on symptom data availability */}
           <CardDescription className="!mt-1">Log symptoms regularly to uncover patterns.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-center text-sm px-4">Log symptoms on the calendar to visualize patterns across your cycle.</p>
            {/* TODO: Implement Line Chart/Heatmap */}
          </div>
        </CardContent>
      </Card>

        {/* Add placeholders Cycle Phase Overview, Mood Patterns */}

    </div>
  );
}

// src/app/insights/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart, Droplet, CalendarDays, HeartPulse, Percent, Activity } from 'lucide-react'; // Added icons
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Helper function to calculate cycle insights from log data
const calculateCycleInsights = (logData: Record<string, LogData>) => {
    const periodStartDates: Date[] = [];
    let currentPeriodLength = 0;
    let inPeriod = false;
    const periodLengths: number[] = [];
    const cycleLengths: number[] = [];
    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;

    // Sort dates to process chronologically
    const sortedDates = Object.keys(logData).sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

    sortedDates.forEach(dateString => {
        const entry = logData[dateString];
        if (!entry) return; // Skip if entry is somehow null/undefined

        const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';

        // Cycle and Period Length Calculations
        if (isPeriodDay && !inPeriod) {
            // Start of a new period
            const periodStartDate = parseISO(dateString);
            if (periodStartDates.length > 0) {
                // Calculate cycle length from the previous period start
                const previousStartDate = periodStartDates[periodStartDates.length - 1];
                const cycleLength = differenceInDays(periodStartDate, previousStartDate);
                if (cycleLength > 10 && cycleLength < 100) { // Basic validation
                    cycleLengths.push(cycleLength);
                }
            }
            periodStartDates.push(periodStartDate);
            inPeriod = true;
            currentPeriodLength = 1;
        } else if (isPeriodDay && inPeriod) {
            // Continuation of a period
            currentPeriodLength++;
        } else if (!isPeriodDay && inPeriod) {
            // End of a period
            if (currentPeriodLength > 0 && currentPeriodLength < 20) { // Basic validation
                 periodLengths.push(currentPeriodLength);
            }
            inPeriod = false;
            currentPeriodLength = 0;
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

     // Add the last period length if still in period at the end of logs
    if (inPeriod && currentPeriodLength > 0 && currentPeriodLength < 20) {
        periodLengths.push(currentPeriodLength);
    }

    // Averages
    const avgCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : null; // Return null if no data

    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null; // Return null if no data

    // Sexual Activity Insights
    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    const protectionRate = totalSexualActivityDays > 0 ? (protectedActivityDays / totalSexualActivityDays) * 100 : null; // Rate based on days with activity

    // Predict next period (very basic - should use better prediction)
    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1); // -1 because start day counts
        predictedNextPeriod = `${format(nextStartDate, 'MMM do')} - ${format(nextEndDate, 'MMM do, yyyy')}`;
    }

    // Basic Pregnancy Chance Placeholder (Highly inaccurate - needs proper fertile window calculation)
    let pregnancyChance = 'Low'; // Default
    const today = new Date();
    if (periodStartDates.length > 0 && avgCycleLength) {
        const lastStartDate = periodStartDates[periodStartDates.length - 1];
        const estimatedOvulationDay = addDays(lastStartDate, Math.round(avgCycleLength / 2) - 1); // Very rough estimate
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: addDays(fertileWindowStart, -3), end: addDays(fertileWindowEnd, 3) })) {
             pregnancyChance = 'Moderate';
         }
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
        pregnancyChance, // Placeholder
    };
};

type InsightsData = ReturnType<typeof calculateCycleInsights> | null;

export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState<InsightsData>(null);

 React.useEffect(() => {
    if (!isLoading && Object.keys(logData).length > 0) {
      const calculatedInsights = calculateCycleInsights(logData);
      setInsights(calculatedInsights);
    } else if (!isLoading) {
        // Handle case with no log data
        setInsights(calculateCycleInsights({})); // Calculate with empty data for default values
    }
  }, [logData, isLoading]);


  // Render Loading State
  if (isLoading || insights === null) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
             <h1 className="text-2xl font-semibold text-center">Your Insights</h1>
             {/* Skeleton Cards */}
             {[...Array(5)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
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
      <h1 className="text-2xl font-semibold text-center">Your Insights</h1>

      {/* Cycle Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <CalendarDays className="mr-2 h-5 w-5 text-primary"/> Cycle Summary
          </CardTitle>
          {!hasEnoughCycleData && <CardDescription>Log more cycles to see detailed summaries.</CardDescription>}
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
          {insights.totalSexualActivityDays === 0 && <CardDescription>Log sexual activity to see summaries.</CardDescription>}
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

       {/* Pregnancy Chance Card (Placeholder) */}
       <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Percent className="mr-2 h-5 w-5 text-green-500"/> Estimated Pregnancy Chance Today
          </CardTitle>
          <CardDescription className="!mt-1 text-xs text-muted-foreground">Based on simple cycle calculation. Not a reliable method of contraception or conception planning.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>Current Estimate: <span className={cn(
                "font-medium",
                insights.pregnancyChance === 'Higher' && 'text-red-600',
                insights.pregnancyChance === 'Moderate' && 'text-yellow-600',
                insights.pregnancyChance === 'Low' && 'text-green-600'
              )}>{insights.pregnancyChance}</span>
          </p>
          {/* TODO: Add info about fertile window */}
        </CardContent>
      </Card>

       {/* Cycle Length History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <BarChart className="mr-2 h-5 w-5 text-chart-1"/> Cycle Length History
          </CardTitle>
          {insights.cycleLengths.length < 2 && <CardDescription>Log at least two full cycles for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {insights.cycleLengths.length >= 2 ? (
             <div className="h-40 flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground text-sm">Cycle length chart coming soon</p>
                {/* TODO: Implement Bar Chart using shadcn/ui charts */}
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
           {insights.periodLengths.length < 2 && <CardDescription>Log period flow for at least two periods for history.</CardDescription>}
        </CardHeader>
        <CardContent>
          {insights.periodLengths.length >= 2 ? (
            <div className="h-40 flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground text-sm">Period length chart coming soon</p>
                {/* TODO: Implement Bar Chart for Period Length */}
            </div>
          ) : (
             <div className="h-40 flex items-center justify-center bg-muted/50 rounded-md">
                 <p className="text-muted-foreground text-center text-sm px-4">Log your period flow on the calendar for several days to see history.</p>
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
           {insights.totalSexualActivityDays < 3 && <CardDescription>Log activity more often to see patterns.</CardDescription>}
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
           <CardDescription>Log symptoms regularly to uncover patterns.</CardDescription>
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
```
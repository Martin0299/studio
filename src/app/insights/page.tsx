'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart, Droplet, CalendarDays } from 'lucide-react'; // Example Icons
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Helper function to calculate cycle lengths and period lengths from log data
const calculateCycleInsights = (logData: Record<string, LogData>) => {
    const periodStartDates: Date[] = [];
    let currentPeriodLength = 0;
    let inPeriod = false;
    const periodLengths: number[] = [];
    const cycleLengths: number[] = [];

    // Sort dates to process chronologically
    const sortedDates = Object.keys(logData).sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

    sortedDates.forEach(dateString => {
        const entry = logData[dateString];
        const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';

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
    });

     // Add the last period length if still in period at the end of logs
    if (inPeriod && currentPeriodLength > 0 && currentPeriodLength < 20) {
        periodLengths.push(currentPeriodLength);
    }

    const avgCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : null; // Return null if no data

    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null; // Return null if no data

    // Predict next period (very basic)
    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1); // -1 because start day counts
        predictedNextPeriod = `${format(nextStartDate, 'MMM do')} - ${format(nextEndDate, 'MMM do, yyyy')}`;
    }


    return {
        avgCycleLength,
        avgPeriodLength,
        predictedNextPeriod,
        cycleLengths, // Return raw data for charts
        periodLengths // Return raw data for charts
    };
};


export default function InsightsPage() {
  const { logData, isLoading } = useCycleData();
  const [insights, setInsights] = React.useState<{
      avgCycleLength: number | null;
      avgPeriodLength: number | null;
      predictedNextPeriod: string | null;
      cycleLengths: number[];
      periodLengths: number[];
  } | null>(null);

 React.useEffect(() => {
    if (!isLoading && Object.keys(logData).length > 0) {
      const calculatedInsights = calculateCycleInsights(logData);
      setInsights(calculatedInsights);
    } else if (!isLoading) {
        // Handle case with no log data
        setInsights({ avgCycleLength: null, avgPeriodLength: null, predictedNextPeriod: null, cycleLengths: [], periodLengths: [] });
    }
  }, [logData, isLoading]);


  // Render Loading State
  if (isLoading || insights === null) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
             <h1 className="text-2xl font-semibold text-center">Your Insights</h1>
             <Card>
                 <CardHeader><CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle></CardHeader>
                 <CardContent className="space-y-3">
                     <Skeleton className="h-4 w-1/2" />
                     <Skeleton className="h-4 w-1/2" />
                     <Skeleton className="h-4 w-2/3" />
                 </CardContent>
             </Card>
             <Card>
                 <CardHeader><CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle></CardHeader>
                 <CardContent><Skeleton className="h-40 w-full rounded-md" /></CardContent>
             </Card>
              <Card>
                 <CardHeader><CardTitle><Skeleton className="h-6 w-1/2" /></CardTitle></CardHeader>
                 <CardContent><Skeleton className="h-40 w-full rounded-md" /></CardContent>
             </Card>
        </div>
     );
  }


    // Render Content when data is loaded
   const hasEnoughData = insights.avgCycleLength !== null || insights.avgPeriodLength !== null;


  return (
    <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-center">Your Insights</h1>

      {/* Data Summaries Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
             <CalendarDays className="mr-2 h-5 w-5 text-primary"/> Cycle Summary
          </CardTitle>
          {!hasEnoughData && <CardDescription>Log more cycles to see detailed summaries.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Average Cycle Length: <span className="font-medium">{insights.avgCycleLength ? `${insights.avgCycleLength} days` : 'Not enough data'}</span></p>
          <p>Average Period Length: <span className="font-medium">{insights.avgPeriodLength ? `${insights.avgPeriodLength} days` : 'Not enough data'}</span></p>
          <p>Predicted Next Period: <span className="font-medium">{insights.predictedNextPeriod || 'Not enough data'}</span></p>
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

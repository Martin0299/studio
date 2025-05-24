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
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Droplet, CalendarDays, HeartPulse, Percent, Activity, LineChart, BarChart as BarChartIcon, Info, TrendingUp, TrendingDown, Minus as MinusIcon, BrainCircuit, Lightbulb, Loader2, Baby, HeartHandshake, Eye, ShieldCheck, Ban, SmilePlus, Frown, Edit3, PillIcon } from 'lucide-react'; // Added PillIcon
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { differenceInDays, format, parseISO, addDays, subDays, isWithinInterval, isValid, isAfter, isEqual, startOfDay, isBefore } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getMenstrualTips } from '@/ai/flows/menstrual-tips-flow';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


// Define cycle phases
type CyclePhase = 'Period' | 'Follicular' | 'Fertile Window' | 'Luteal' | 'Unknown';
const TIPS_STORAGE_KEY = 'healthTipsCache'; // Key for localStorage

interface DetailedActivityLog {
  date: Date;
  count: number;
  protectionUsed?: boolean;
  orgasm?: boolean;
  phase: CyclePhase;
}

interface DetailedSymptomLog {
  date: Date;
  symptoms: string[];
  phase: CyclePhase;
}

interface RawPeriodLengthEntry {
    startDate: Date;
    endDate: Date;
    length: number;
}

interface RawCycleLengthEntry {
    startDate: Date;
    endDate: Date | null;
    length: number;
}


// Helper function to determine cycle phase for a given date
const getCyclePhase = (
    date: Date,
    periodStartDates: Date[],
    avgCycleLength: number | null,
    avgPeriodLength: number | null, // Can be null
    logData: Record<string, LogData>
): CyclePhase => {
    const dateString = format(date, 'yyyy-MM-dd');
    const currentLog = logData[dateString];

    // Most definitive: if the day is logged as a period day
    if (currentLog?.periodFlow && currentLog.periodFlow !== 'none') {
        return 'Period';
    }

    // If not a logged period day, proceed with cycle calculations for other phases
    if (!avgCycleLength || periodStartDates.length === 0 || !date || !isValid(date)) {
        return 'Unknown'; // Not enough info for other phases
    }

    let cycleStartDate: Date | null = null;
    let nextCycleStartDate: Date | null = null;

    // Find the cycle this date falls into
    for (let i = periodStartDates.length - 1; i >= 0; i--) {
        const currentStart = periodStartDates[i];
        if (!isValid(currentStart)) continue;
        const estimatedNextStart = addDays(currentStart, avgCycleLength);
        if ((isAfter(date, currentStart) || isEqual(date, currentStart)) && isBefore(date, estimatedNextStart)) {
            cycleStartDate = currentStart;
            nextCycleStartDate = estimatedNextStart;
            break;
        }
        // Handle the very last cycle if 'date' is exactly its start
        if (i === periodStartDates.length -1 && isEqual(date, currentStart)){
            cycleStartDate = currentStart;
            nextCycleStartDate = estimatedNextStart;
            break;
        }
    }

    if (!cycleStartDate || !nextCycleStartDate) {
        // Fallback for dates that might be outside fully calculated cycles but still have logs
        // This was primarily for period days, already handled above.
        // For other phases, if we can't determine a cycle, it's Unknown.
        return 'Unknown';
    }

    // Determine the end of the period for phase boundary calculations
    let actualPeriodEndDateForPhaseCalc = cycleStartDate;
    if (avgPeriodLength) { // Use average if available and reliable
        actualPeriodEndDateForPhaseCalc = addDays(cycleStartDate, avgPeriodLength - 1);
    } else { // Otherwise, try to find the actual end from logs for *this* specific cycle
        let foundEnd = false;
        for (let i = 0; i < 15; i++) { // Check up to 15 days for this period
            const d = addDays(cycleStartDate, i);
            const dStr = format(d, 'yyyy-MM-dd');
            const logEntry = logData[dStr];
            if (logEntry) {
                if (logEntry.periodFlow && logEntry.periodFlow !== 'none') {
                    actualPeriodEndDateForPhaseCalc = d; // Update if flow continues
                }
                if (logEntry.isPeriodEnd) {
                    actualPeriodEndDateForPhaseCalc = d;
                    foundEnd = true;
                    break;
                }
                // If no flow on day 'd' (and it's after cycleStartDate), and we haven't found an isPeriodEnd yet,
                // assume period ended on the previous day that had flow.
                if (i > 0 && (!logEntry.periodFlow || logEntry.periodFlow === 'none') && !foundEnd) {
                     // Check if the previous day actually had flow before setting it as the end
                    const prevDayStr = format(subDays(d,1), 'yyyy-MM-dd');
                    if (logData[prevDayStr]?.periodFlow && logData[prevDayStr]?.periodFlow !== 'none') {
                        actualPeriodEndDateForPhaseCalc = subDays(d,1);
                    }
                    // If previous day also had no flow, actualPeriodEndDateForPhaseCalc remains the last known flow day or cycleStartDate
                    break;
                }
            } else if (i > 0 && !foundEnd) { // No log data for day 'd', assume period ended on previously recorded flow day
                 // Similar check for previous day having flow
                const prevDayStr = format(subDays(d,1), 'yyyy-MM-dd');
                if (logData[prevDayStr]?.periodFlow && logData[prevDayStr]?.periodFlow !== 'none') {
                     actualPeriodEndDateForPhaseCalc = subDays(d,1);
                }
                break;
            }
        }
    }


    const ovulationDay = subDays(nextCycleStartDate, 14);
    const fertileWindowStart = subDays(ovulationDay, 5);
    const fertileWindowEnd = addDays(ovulationDay, 1); // Typically includes ovulation day and one day after

    // Check if date is in fertile window (includes ovulation day)
    if (isWithinInterval(date, { start: fertileWindowStart, end: fertileWindowEnd })) {
        return 'Fertile Window';
    }

    const follicularStart = addDays(actualPeriodEndDateForPhaseCalc, 1);
    const follicularEnd = subDays(fertileWindowStart, 1);

    if (!isBefore(follicularEnd, follicularStart)) { // Check if follicular phase has valid length
        if (isWithinInterval(date, { start: follicularStart, end: follicularEnd })) {
            return 'Follicular';
        }
    } else if (isEqual(date, follicularStart)) { // Handle case where follicular phase might be just one day or start/end are same
        return 'Follicular';
    }

    const lutealStart = addDays(fertileWindowEnd, 1); // Day after fertile window ends
    const lutealEnd = subDays(nextCycleStartDate, 1);

    if (!isBefore(lutealEnd, lutealStart)) { // Check if luteal phase has valid length
        if (isWithinInterval(date, { start: lutealStart, end: lutealEnd })) {
            return 'Luteal';
        }
    } else if (isEqual(date, lutealStart)) { // Handle case where luteal phase might be just one day
        return 'Luteal';
    }

    return 'Unknown';
};


// Helper function to calculate cycle insights from log data
const calculateCycleInsights = (logData: Record<string, LogData>): {
    avgCycleLength: number | null;
    minCycleLength: number | null;
    maxCycleLength: number | null;
    cycleLengthTrend: 'stable' | 'increasing' | 'decreasing' | null;
    avgPeriodLength: number | null;
    minPeriodLength: number | null;
    maxPeriodLength: number | null;
    predictedNextPeriod: string | null;
    cycleLengths: { label: string; length: number }[]; // For chart
    rawCycleLengths: RawCycleLengthEntry[]; // For modal, now with end date
    periodLengths: { label: string; length: number }[]; // For chart
    rawPeriodLengths: RawPeriodLengthEntry[]; // For modal, now with end date
    totalSexualActivityDays: number;
    totalActivityCount: number;
    protectedActivityDays: number;
    unprotectedActivityDays: number;
    activityFrequency: number;
    protectionRate: number | null;
    pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'N/A';
    fertileWindowString: string | null;
    activityByPhase: { phase: CyclePhase; count: number }[];
    symptomsByPhase: { phase: CyclePhase; count: number }[];
    totalSymptomCount: number;
    detailedActivityLogs: DetailedActivityLog[];
    detailedSymptomLogs: DetailedSymptomLog[];
} => {
    const periodStartDates: Date[] = [];
    const periodLengthsData: { date: Date; length: number; endDate: Date }[] = [];
    const cycleLengthsData: { startDate: Date; endDate: Date | null; length: number }[] = [];

    let totalSexualActivityDays = 0;
    let protectedActivityDays = 0;
    let unprotectedActivityDays = 0;
    let totalActivityCount = 0;
    let totalSymptomCount = 0;
    const detailedActivityLogs: DetailedActivityLog[] = [];
    const detailedSymptomLogs: DetailedSymptomLog[] = [];


    const activityByPhaseCounts: Record<CyclePhase, number> = {
        'Period': 0, 'Follicular': 0, 'Fertile Window': 0, 'Luteal': 0, 'Unknown': 0,
    };
    const symptomsByPhaseCounts: Record<CyclePhase, Record<string, number>> = {
        'Period': {}, 'Follicular': {}, 'Fertile Window': {}, 'Luteal': {}, 'Unknown': {},
    };


    const sortedDates = Object.keys(logData)
        .filter(dateString => {
            try {
                return isValid(parseISO(dateString));
            } catch {
                return false;
            }
        })
        .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

    sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry?.date) return;

        const isPeriodDay = entry.periodFlow && entry.periodFlow !== 'none';
        const date = startOfDay(parseISO(entry.date));
        if (!isValid(date)) return;

        const prevDay = subDays(date, 1);
        const prevDayString = format(prevDay, 'yyyy-MM-dd');
        const prevLog = logData[prevDayString];
        const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

        if (isPeriodStart) {
             periodStartDates.push(date);
        }
    });

    // Calculate cycle lengths and end dates
    for (let i = 0; i < periodStartDates.length; i++) {
        const currentStartDate = periodStartDates[i];
        if (i + 1 < periodStartDates.length) {
            const nextStartDate = periodStartDates[i+1];
            if (isValid(currentStartDate) && isValid(nextStartDate)) {
                const cycleLength = differenceInDays(nextStartDate, currentStartDate);
                if (cycleLength > 10 && cycleLength < 100) { // Basic validation
                    cycleLengthsData.push({ startDate: currentStartDate, endDate: subDays(nextStartDate, 1), length: cycleLength });
                }
            }
        } else {
            const lastCycleLog = logData[format(currentStartDate, 'yyyy-MM-dd')];
            if(lastCycleLog) {
                const avgCycle = cycleLengthsData.filter(c => c.endDate !== null).length > 0 ? Math.round(cycleLengthsData.filter(c => c.endDate !== null).map(d => d.length).reduce((a,b) => a+b,0) / cycleLengthsData.filter(c => c.endDate !== null).length) : null;
                if (avgCycle) {
                    cycleLengthsData.push({ startDate: currentStartDate, endDate: null, length: avgCycle});
                }
            }
        }
    }


     const avgCycleLength = cycleLengthsData.filter(c => c.endDate !== null).length > 0
        ? Math.round(cycleLengthsData.filter(c => c.endDate !== null).map(d => d.length).reduce((a, b) => a + b, 0) / cycleLengthsData.filter(c => c.endDate !== null).length)
        : null;

    // Calculate period lengths
    periodStartDates.forEach((startDate) => {
        if (!isValid(startDate)) return;
        let endDate: Date | null = null;
        let lastFlowDate = startDate;
        const searchLimit = addDays(startDate, 20);
        let foundExplicitEnd = false;

        for (let d = 0; d < sortedDates.length; d++) {
            const currentDateString = sortedDates[d];
            const currentEntry = logData[currentDateString];
            if (!currentEntry?.date) continue;

            const currentDate = startOfDay(parseISO(currentEntry.date));
            if (!isValid(currentDate)) continue;

            if (isBefore(currentDate, startDate)) continue;
            if (isEqual(currentDate, startDate)) {
                if (currentEntry.isPeriodEnd) {
                    endDate = currentDate;
                    foundExplicitEnd = true;
                    break;
                }
            }


            if (isAfter(currentDate, searchLimit)) break;

            const isNextPeriodStart = periodStartDates.some(nextStart => isEqual(currentDate, nextStart) && !isEqual(nextStart, startDate));
            if (isNextPeriodStart) break;

            if (currentEntry.isPeriodEnd) {
                endDate = currentDate;
                foundExplicitEnd = true;
                break;
            }

            if (currentEntry.periodFlow && currentEntry.periodFlow !== 'none') {
                 if (isAfter(currentDate, lastFlowDate) && !isAfter(currentDate, addDays(startDate,15))) {
                    lastFlowDate = currentDate;
                 }
            }
        }

        const finalEndDate = foundExplicitEnd ? endDate : (isAfter(lastFlowDate, startDate) ? lastFlowDate : startDate);

        if (finalEndDate && isValid(finalEndDate) && !isBefore(finalEndDate,startDate) ) {
             const length = differenceInDays(finalEndDate, startDate) + 1;
             if (length > 0 && length < 20) {
                 periodLengthsData.push({ date: startDate, length, endDate: finalEndDate });
             } else {
                 console.warn("Calculated period length (" + length + ") for start " + format(startDate, 'yyyy-MM-dd') + " is out of range [1-19]. Start: " + format(startDate, 'yyyy-MM-dd') + ", End: " + format(finalEndDate, 'yyyy-MM-dd') + ". Skipping.");
             }
        } else {
            console.warn("Could not determine valid end date for period starting " + format(startDate, 'yyyy-MM-dd'));
        }
    });

    const avgPeriodLength = periodLengthsData.length > 0
        ? Math.round(periodLengthsData.map(d => d.length).reduce((a, b) => a + b, 0) / periodLengthsData.length)
        : null;


     sortedDates.forEach((dateString) => {
        const entry = logData[dateString];
        if (!entry?.date) return;
        const date = startOfDay(parseISO(entry.date));
        if (!isValid(date)) return;

        // Pass the potentially null avgPeriodLength here. getCyclePhase needs to handle it.
        const phase = getCyclePhase(date, periodStartDates, avgCycleLength, avgPeriodLength, logData);


        const activityCount = entry.sexualActivityCount ?? 0;
        if (activityCount > 0) {
            totalSexualActivityDays++;
            totalActivityCount += activityCount;
            if (entry.protectionUsed === true) protectedActivityDays++;
            else if (entry.protectionUsed === false) unprotectedActivityDays++;
            activityByPhaseCounts[phase] += activityCount;
            detailedActivityLogs.push({
                date,
                count: activityCount,
                protectionUsed: entry.protectionUsed,
                orgasm: entry.orgasm,
                phase
            });
        }

         if (entry.symptoms && entry.symptoms.length > 0) {
             entry.symptoms.forEach(symptom => {
                 if (!symptomsByPhaseCounts[phase][symptom]) {
                     symptomsByPhaseCounts[phase][symptom] = 0;
                 }
                 symptomsByPhaseCounts[phase][symptom]++;
                 totalSymptomCount++;
             });
             detailedSymptomLogs.push({
                date,
                symptoms: entry.symptoms,
                phase
             });
         }
     });

    const totalLoggedDays = sortedDates.length;
    const activityFrequency = totalLoggedDays > 0 ? (totalSexualActivityDays / totalLoggedDays) * 100 : 0;
    const protectionRate = totalSexualActivityDays > 0 && (protectedActivityDays + unprotectedActivityDays) > 0
        ? (protectedActivityDays / (protectedActivityDays + unprotectedActivityDays)) * 100
        : null;

    const minCycleLength = cycleLengthsData.filter(c => c.endDate !== null).length > 0 ? Math.min(...cycleLengthsData.filter(c => c.endDate !== null).map(d => d.length)) : null;
    const maxCycleLength = cycleLengthsData.filter(c => c.endDate !== null).length > 0 ? Math.max(...cycleLengthsData.filter(c => c.endDate !== null).map(d => d.length)) : null;
    const minPeriodLength = periodLengthsData.length > 0 ? Math.min(...periodLengthsData.map(d => d.length)) : null;
    const maxPeriodLength = periodLengthsData.length > 0 ? Math.max(...periodLengthsData.map(d => d.length)) : null;

    let cycleLengthTrend: 'stable' | 'increasing' | 'decreasing' | null = null;
    if (cycleLengthsData.filter(c => c.endDate !== null).length >= 3) {
        const lengthsOnly = cycleLengthsData.filter(c => c.endDate !== null).map(d => d.length);
        const firstHalfAvg = lengthsOnly.slice(0, Math.floor(lengthsOnly.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(lengthsOnly.length / 2);
        const secondHalfAvg = lengthsOnly.slice(Math.ceil(lengthsOnly.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(lengthsOnly.length / 2);
        if (Math.abs(firstHalfAvg - secondHalfAvg) < 1.5) {
            cycleLengthTrend = 'stable';
        } else if (secondHalfAvg > firstHalfAvg) {
            cycleLengthTrend = 'increasing';
        } else {
            cycleLengthTrend = 'decreasing';
        }
    }

    let predictedNextPeriod = null;
    if (periodStartDates.length > 0 && avgCycleLength && avgPeriodLength && isValid(periodStartDates[periodStartDates.length - 1])) {
        const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
        const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
        const nextEndDate = addDays(nextStartDate, avgPeriodLength - 1);
        predictedNextPeriod = format(nextStartDate, 'MMM do') + " - " + format(nextEndDate, 'MMM do, yyyy');
    } else if (periodStartDates.length > 0 && avgCycleLength && isValid(periodStartDates[periodStartDates.length - 1])) {
         const lastPeriodStartDate = periodStartDates[periodStartDates.length - 1];
         const nextStartDate = addDays(lastPeriodStartDate, avgCycleLength);
         predictedNextPeriod = "Around " + format(nextStartDate, 'MMM do, yyyy');
    }


    let pregnancyChance: 'Low' | 'Moderate' | 'Higher' | 'N/A' = 'N/A';
    let fertileWindowString: string | null = null;
    const today = startOfDay(new Date());
    if (periodStartDates.length > 0 && avgCycleLength && isValid(periodStartDates[periodStartDates.length - 1])) {
        const lastStartDate = periodStartDates[periodStartDates.length - 1];
        const estimatedNextCycleStart = addDays(lastStartDate, avgCycleLength);
        const estimatedOvulationDay = subDays(estimatedNextCycleStart, 14);
        const fertileWindowStart = subDays(estimatedOvulationDay, 5);
        const fertileWindowEnd = addDays(estimatedOvulationDay, 1);
        fertileWindowString = format(fertileWindowStart, 'MMM do') + " - " + format(fertileWindowEnd, 'MMM do');

         if (isWithinInterval(today, { start: fertileWindowStart, end: fertileWindowEnd })) {
            pregnancyChance = 'Higher';
         } else if (isWithinInterval(today, { start: subDays(fertileWindowStart, 2), end: addDays(fertileWindowEnd, 2) })) {
             pregnancyChance = 'Moderate';
         } else {
             pregnancyChance = 'Low';
         }
    }

    const cycleLengths = cycleLengthsData.filter(c => c.endDate !== null).map(({ startDate, length }, index) => ({
        label: format(startDate, 'MMM') + " C" + (index + 1),
        length
    }));

    const rawCycleLengths: RawCycleLengthEntry[] = [];
    for(let i = 0; i < periodStartDates.length; i++) {
        const currentStartDate = periodStartDates[i];
        if(i + 1 < periodStartDates.length) {
            const nextStartDate = periodStartDates[i+1];
            const length = differenceInDays(nextStartDate, currentStartDate);
            if (length > 10 && length < 100) {
                 rawCycleLengths.push({ startDate: currentStartDate, endDate: subDays(nextStartDate, 1), length});
            }
        } else if (avgCycleLength && isValid(currentStartDate)) {
            rawCycleLengths.push({ startDate: currentStartDate, endDate: null, length: avgCycleLength});
        }
    }



    const periodLengths = periodLengthsData.map(({ date, length }, index) => ({
        label: format(date, 'MMM') + " P" + (index + 1),
        length
    }));

    const rawPeriodLengths: RawPeriodLengthEntry[] = periodLengthsData.map(({date, length, endDate}) => ({
        startDate: date,
        endDate: endDate,
        length
    }));

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
        cycleLengths, rawCycleLengths, periodLengths, rawPeriodLengths,
        totalSexualActivityDays, totalActivityCount, protectedActivityDays, unprotectedActivityDays,
        activityFrequency, protectionRate,
        pregnancyChance, fertileWindowString,
        activityByPhase, symptomsByPhase,
        totalSymptomCount,
        detailedActivityLogs,
        detailedSymptomLogs,
    };
};


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


const formatNumber = (num: number | null | undefined, suffix: string = ''): string => {
    return num !== null && num !== undefined ? num.toString() + suffix : 'N/A';
};


const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const configEntry = payload[0].payload.config;

    let labelText = configEntry?.label || payload[0].name || 'Value';

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1.5">
          {label && <p className="text-sm text-muted-foreground">{label}</p>}
           <p className="text-sm font-medium">{labelText + ": " + payload[0].value}</p>
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
  const [isTipsDialogOpen, setIsTipsDialogOpen] = React.useState(false);
  const [isCycleHistoryModalOpen, setIsCycleHistoryModalOpen] = React.useState(false);
  const [isPeriodHistoryModalOpen, setIsPeriodHistoryModalOpen] = React.useState(false);
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = React.useState(false);
  const [isSymptomLogModalOpen, setIsSymptomLogModalOpen] = React.useState(false);
  const { toast } = useToast();

 React.useEffect(() => {
    if (!isLoading && logData) {
      const calculatedInsights = calculateCycleInsights(logData);
      setInsights(calculatedInsights);
    } else if (!isLoading && Object.keys(logData).length === 0) {
        setInsights(calculateCycleInsights({}));
    }
  }, [logData, isLoading]);

  React.useEffect(() => {
    const storedTips = localStorage.getItem(TIPS_STORAGE_KEY);
    if (storedTips) {
        setHealthTips(storedTips);
    }
  }, []);


  const handleGetTips = async () => {
    setIsTipsLoading(true);
    setHealthTips('');
    localStorage.removeItem(TIPS_STORAGE_KEY);
    try {
        const currentPhase = getCyclePhase(
            startOfDay(new Date()),
            Object.values(logData)
                .filter(log => log.periodFlow && log.periodFlow !== 'none' && log.date)
                .map(log => parseISO(log.date!))
                .filter(isValid)
                .sort((a, b) => a.getTime() - b.getTime()),
            insights.avgCycleLength,
            insights.avgPeriodLength,
            logData
        );

        const relevantSymptoms = Object.entries(logData)
            .sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime())
            .slice(-7)
            .flatMap(([, log]) => log.symptoms || []);
        const uniqueSymptoms = [...new Set(relevantSymptoms)];

        const { tips } = await getMenstrualTips({
            currentPhase: currentPhase !== 'Unknown' ? currentPhase : undefined,
            recentSymptoms: uniqueSymptoms.length > 0 ? uniqueSymptoms : undefined,
        });
        setHealthTips(tips);
        localStorage.setItem(TIPS_STORAGE_KEY, tips);
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

  const cycleLengthChartData = React.useMemo(() => insights.cycleLengths
    .slice(-4)
    .map(item => ({
      ...item,
      fill: "var(--color-length)",
      name: item.label,
      config: cycleLengthChartConfig.length
  })), [insights.cycleLengths]);

  const periodLengthChartData = React.useMemo(() => insights.periodLengths
    .slice(-4)
    .map(item => ({
      ...item,
      fill: "var(--color-length)",
      name: item.label,
      config: periodLengthChartConfig.length
  })), [insights.periodLengths]);

  const activityChartData = React.useMemo(() => insights.activityByPhase.map(item => ({
      ...item,
      fill: "var(--color-count)",
      name: item.phase,
      config: activityChartConfig.count
  })), [insights.activityByPhase]);

  const symptomChartData = React.useMemo(() => insights.symptomsByPhase.map(item => ({
      ...item,
      fill: "var(--color-count)",
      name: item.phase,
      config: symptomChartConfig.count
  })), [insights.symptomsByPhase]);


  if (isLoading) {
     return (
        <div className="container mx-auto py-6 px-4 max-w-lg space-y-6">
             <h1 className="text-3xl font-bold text-center mb-8">Your Cycle Insights</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[...Array(6)].map((_, i) => (
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
    <div className="container mx-auto py-6 px-4 max-w-lg space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Your Cycle Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

         <Dialog open={isTipsDialogOpen} onOpenChange={setIsTipsDialogOpen}>
             <DialogTrigger asChild>
                 <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-accent/10 to-primary/10 md:col-span-2">
                     <CardHeader>
                         <CardTitle className="text-xl flex items-center text-accent">
                             <Lightbulb className="mr-2 h-6 w-6"/> Personalized Health Tips
                         </CardTitle>
                         <CardDescription className="!mt-1 text-xs">
                             View AI-powered tips related to your cycle phase, symptoms, nutrition, and well-being.
                         </CardDescription>
                     </CardHeader>
                     <CardContent>
                         <Button variant="outline" className="w-full" onClick={() => setIsTipsDialogOpen(true)}>
                             View Tips
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
                 <ScrollArea className="max-h-[60vh] p-4 border rounded-md my-4">
                     {isTipsLoading ? (
                         <div className="flex justify-center items-center h-40">
                             <Loader2 className="h-8 w-8 animate-spin text-accent" />
                         </div>
                     ) : healthTips ? (
                         <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                             {healthTips}
                         </div>
                     ) : (
                         <p className="text-muted-foreground text-center italic">Click "Generate Tips" to get advice.</p>
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
                         {healthTips ? 'Regenerate Tips' : 'Generate Tips'}
                     </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>


        <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2">
            <CardHeader>
                 <CardTitle className="text-xl flex items-center text-pink-600 dark:text-pink-400">
                    <Baby className="mr-2 h-6 w-6"/>
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


        <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary">
                <CalendarDays className="mr-2 h-6 w-6"/> Cycle Summary
            </CardTitle>
            {insights.cycleLengths.length < 2 && <CardDescription className="!mt-1 text-xs">Log at least 2 full cycles for detailed summaries.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Avg Length:</span> <span className="font-semibold">{formatNumber(insights.avgCycleLength, ' days')}</span></div>
                <div className="flex justify-between"><span>Range:</span> <span className="font-semibold">{formatNumber(insights.minCycleLength)}-{formatNumber(insights.maxCycleLength, ' days')}</span></div>
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

         <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="text-xl flex items-center text-chart-2">
                    <Droplet className="mr-2 h-6 w-6"/> Period Summary
                </CardTitle>
                 {insights.periodLengths.length < 1 && <CardDescription className="!mt-1 text-xs">Log period start and end for summaries.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Avg Length:</span> <span className="font-semibold">{formatNumber(insights.avgPeriodLength, ' days')}</span></div>
                <div className="flex justify-between"><span>Range:</span> <span className="font-semibold">{formatNumber(insights.minPeriodLength)}-{formatNumber(insights.maxPeriodLength, ' days')}</span></div>
            </CardContent>
        </Card>

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
                        "font-bold text-lg",
                        insights.pregnancyChance === 'Higher' && 'text-red-600 dark:text-red-400',
                        insights.pregnancyChance === 'Moderate' && 'text-yellow-600 dark:text-yellow-400',
                        insights.pregnancyChance === 'Low' && 'text-green-600 dark:text-green-400',
                        insights.pregnancyChance === 'N/A' && 'text-muted-foreground italic'
                    )}>{insights.pregnancyChance}</span>
                </div>
            </CardContent>
        </Card>


        <Dialog open={isActivityLogModalOpen} onOpenChange={setIsActivityLogModalOpen}>
          <DialogTrigger asChild>
            <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-red-500">
                  <HeartPulse className="mr-2 h-6 w-6" /> Activity Summary
                </CardTitle>
                {insights.totalActivityCount === 0 && <CardDescription className="!mt-1 text-xs">Log sexual activity for summaries.</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Total Count:</span> <span className="font-semibold">{insights.totalActivityCount}</span></div>
                <div className="flex justify-between"><span>Days w/ Activity:</span> <span className="font-semibold">{insights.totalSexualActivityDays}</span></div>
                <div className="flex justify-between"><span>Frequency:</span> <span className="font-semibold">{insights.activityFrequency > 0 ? insights.activityFrequency.toFixed(0) + "% of days" : 'N/A'}</span></div>
                <div className="flex justify-between"><span>Protection Rate:</span> <span className="font-semibold">
                  {insights.protectionRate !== null
                    ? insights.protectionRate.toFixed(0) + "% of active days"
                    : 'N/A'}
                </span></div>
                {insights.totalActivityCount > 0 && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-accent -ml-1" onClick={(e) => {e.stopPropagation(); setIsActivityLogModalOpen(true); }}>
                        <Eye className="mr-1 h-4 w-4"/> View Detailed Log
                    </Button>
                )}
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detailed Activity Log</DialogTitle>
              <DialogDescription>History of logged sexual activity.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {insights.detailedActivityLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Protection</TableHead>
                      <TableHead>Orgasm</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insights.detailedActivityLogs.sort((a,b) => b.date.getTime() - a.date.getTime()).map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(log.date, 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{log.count}</TableCell>
                        <TableCell>
                          {log.protectionUsed === undefined ? <MinusIcon className="h-4 w-4 text-muted-foreground" /> :
                           log.protectionUsed ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <Ban className="h-5 w-5 text-red-600" />}
                        </TableCell>
                        <TableCell>
                          {log.orgasm === undefined ? <MinusIcon className="h-4 w-4 text-muted-foreground" /> :
                           log.orgasm ? <SmilePlus className="h-5 w-5 text-pink-500" /> : <Frown className="h-5 w-5 text-orange-500" />}
                        </TableCell>
                        <TableCell>{log.phase}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild aria-label={'Edit log for ' + format(log.date, 'MMM dd, yyyy')}>
                                <Link href={'/log?date=' + format(log.date, 'yyyy-MM-dd')} onClick={() => setIsActivityLogModalOpen(false)}>
                                    <Edit3 className="h-4 w-4 text-muted-foreground"/>
                                </Link>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center italic py-4">No detailed activity data available.</p>
              )}
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Cycle Length History Card with Modal Trigger */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl flex items-center">
              <BarChartIcon className="mr-2 h-5 w-5 text-chart-1"/> Cycle Length History
            </CardTitle>
            {insights.cycleLengths.length < 2 && (
              <CardDescription className="!mt-1 text-xs">Log at least 2 full cycles to visualize history.</CardDescription>
            )}
          </div>
          {insights.rawCycleLengths.length > 0 && (
            <Dialog open={isCycleHistoryModalOpen} onOpenChange={setIsCycleHistoryModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsCycleHistoryModalOpen(true)}>
                  <Eye className="mr-2 h-4 w-4" /> Full History
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Full Cycle Length History</DialogTitle>
                  <DialogDescription>Detailed view of all logged cycle lengths.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {insights.rawCycleLengths.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead className="text-right">Length (Days)</TableHead>
                          <TableHead className="text-right">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insights.rawCycleLengths.sort((a,b) => b.startDate.getTime() - a.startDate.getTime()).map((cycle, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(cycle.startDate, 'MMM dd, yyyy')}</TableCell>
                             <TableCell>{cycle.endDate ? format(cycle.endDate, 'MMM dd, yyyy') : <span className="italic text-muted-foreground">Ongoing</span>}</TableCell>
                            <TableCell className="text-right">{cycle.length}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" asChild aria-label={'Edit log for cycle starting ' + format(cycle.startDate, 'MMM dd, yyyy')}>
                                    <Link href={'/log?date=' + format(cycle.startDate, 'yyyy-MM-dd')} onClick={() => setIsCycleHistoryModalOpen(false)}>
                                        <Edit3 className="h-4 w-4 text-muted-foreground"/>
                                    </Link>
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center italic py-4">No cycle length data available.</p>
                  )}
                </ScrollArea>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {cycleLengthChartData.length > 0 ? (
             <ChartContainer config={cycleLengthChartConfig} className="h-52 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cycleLengthChartData} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={10}
                            interval={0}
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
                             label={{ value: 'Days', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '10px', fill: 'hsl(var(--muted-foreground))' } }}
                        />
                        <ChartTooltip
                             cursor={{ fill: 'hsl(var(--muted)/0.3)'}}
                             content={<CustomTooltipContent />}
                         />
                        <Bar dataKey="length" name="Cycle Length" radius={4} fill="var(--color-length)">
                             <LabelList dataKey="length" position="top" offset={5} fontSize={10} fill="hsl(var(--foreground)/0.8)" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
              noChartDataMessage("Log more cycle start dates to visualize your cycle length history.")
          )}
        </CardContent>
      </Card>


      {/* Period Length History Card with Modal Trigger */}
      <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl flex items-center">
              <Droplet className="mr-2 h-5 w-5 text-chart-2"/> Period Length History
            </CardTitle>
            {insights.periodLengths.length < 1 && <CardDescription className="!mt-1 text-xs">Log period start and end dates for history.</CardDescription>}
          </div>
          {insights.rawPeriodLengths.length > 0 && (
            <Dialog open={isPeriodHistoryModalOpen} onOpenChange={setIsPeriodHistoryModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsPeriodHistoryModalOpen(true)}>
                  <Eye className="mr-2 h-4 w-4" /> Full History
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Full Period Length History</DialogTitle>
                  <DialogDescription>Detailed view of all logged period lengths.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  {insights.rawPeriodLengths.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead className="text-right">Length (Days)</TableHead>
                          <TableHead className="text-right">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insights.rawPeriodLengths.sort((a,b) => b.startDate.getTime() - a.startDate.getTime()).map((period, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(period.startDate, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{format(period.endDate, 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-right">{period.length}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" asChild aria-label={'Edit log for period starting ' + format(period.startDate, 'MMM dd, yyyy')}>
                                <Link href={'/log?date=' + format(period.startDate, 'yyyy-MM-dd')} onClick={() => setIsPeriodHistoryModalOpen(false)}>
                                  <Edit3 className="h-4 w-4 text-muted-foreground"/>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center italic py-4">No period length data available.</p>
                  )}
                </ScrollArea>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
            {periodLengthChartData.length > 0 ? (
                 <ChartContainer config={periodLengthChartConfig} className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={periodLengthChartData} margin={{ top: 20, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                fontSize={10}
                                interval={0}
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


        {/* Symptom Frequency by Cycle Phase Card with Modal Trigger */}
        <Dialog open={isSymptomLogModalOpen} onOpenChange={setIsSymptomLogModalOpen}>
            <DialogTrigger asChild>
                <Card className="md:col-span-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-xl flex items-center">
                                <Info className="mr-2 h-5 w-5 text-chart-3"/> Symptom Frequency by Cycle Phase
                            </CardTitle>
                            {insights.totalSymptomCount === 0 && <CardDescription className="!mt-1 text-xs">Log symptoms to uncover patterns.</CardDescription>}
                             <CardDescription className="!mt-1 text-xs text-muted-foreground">Shows the total number of times symptoms were logged in each phase. Click to see details.</CardDescription>
                        </div>
                         {insights.detailedSymptomLogs.length > 0 && (
                            <Button variant="outline" size="sm" onClick={(e) => {e.stopPropagation(); setIsSymptomLogModalOpen(true);}}>
                                <Eye className="mr-2 h-4 w-4" /> View Full Log
                            </Button>
                         )}
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
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detailed Symptom Log</DialogTitle>
                    <DialogDescription>History of logged symptoms across cycle phases.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    {insights.detailedSymptomLogs.length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Symptoms</TableHead>
                            <TableHead>Phase</TableHead>
                            <TableHead className="text-right">Edit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {insights.detailedSymptomLogs.sort((a,b) => b.date.getTime() - a.date.getTime()).map((log, index) => (
                            <TableRow key={index}>
                                <TableCell>{format(log.date, 'MMM dd, yyyy')}</TableCell>
                                <TableCell>
                                    <ul className="list-disc list-inside">
                                        {log.symptoms.map(symptom => <li key={symptom} className="capitalize">{symptom}</li>)}
                                    </ul>
                                </TableCell>
                                <TableCell>{log.phase}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild aria-label={'Edit log for ' + format(log.date, 'MMM dd, yyyy')}>
                                        <Link href={'/log?date=' + format(log.date, 'yyyy-MM-dd')} onClick={() => setIsSymptomLogModalOpen(false)}>
                                            <Edit3 className="h-4 w-4 text-muted-foreground"/>
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center italic py-4">No detailed symptom data available.</p>
                    )}
                </ScrollArea>
                <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

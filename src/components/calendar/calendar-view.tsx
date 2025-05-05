// components/calendar/calendar-view.tsx

'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, buttonVariants } from '@/components/ui/button';
import { format as formatDateFns, parseISO, startOfDay, isBefore, isAfter, isEqual, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isValid } from 'date-fns';
import Link from 'next/link';
import { Droplet, Sparkles, HeartPulse, Smile, CloudRain, Zap, StickyNote, Info, CheckCircle, Wind, FlagOff, SmilePlus, ShieldCheck, Ban, Minus, Plus, ChevronLeft, ChevronRight, Anchor, Annoyed, Frown, Meh, Activity, Snowflake, ThermometerSun, Flame } from 'lucide-react';
import { useCycleData, LogData } from '@/context/CycleDataContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigation, CaptionProps } from 'react-day-picker';

// Structure for derived calendar data including period range info
interface DayInfo {
  date: Date;
  isPeriod?: boolean;
  periodIntensity?: 'light' | 'medium' | 'heavy';
  isPeriodStart?: boolean;
  isPeriodEnd?: boolean;
  isInPeriodRange?: boolean;
  isPredictedPeriod?: boolean;
  isFertile?: boolean;
  isOvulation?: boolean;
  loggedData?: LogData;
  hasSexualActivity?: boolean;
  hasSymptoms?: boolean;
  hasMood?: boolean;
  hasNotes?: boolean;
  hasAnyLog?: boolean;
}

// Enhanced prediction and period range calculation
const calculateDayInfo = (date: Date, logs: Record<string, LogData>, allSortedPeriodDates: Date[]): DayInfo => {
  const dateString = formatDateFns(date, 'yyyy-MM-dd');
  const loggedData = logs[dateString];

  const isLoggedPeriod = loggedData?.periodFlow && loggedData.periodFlow !== 'none';
  const isLoggedEnd = loggedData?.isPeriodEnd === true;
  const hasActivity = (loggedData?.sexualActivityCount ?? 0) > 0;
  const hasSymptoms = (loggedData?.symptoms ?? []).length > 0;
  const hasMood = !!loggedData?.mood;
  const hasNotes = !!loggedData?.notes;
  const hasAnyLog = isLoggedPeriod || hasActivity || hasSymptoms || hasMood || hasNotes;

  const dayInfo: DayInfo = {
    date,
    loggedData,
    isPeriod: isLoggedPeriod,
    periodIntensity: loggedData?.periodFlow && loggedData.periodFlow !== 'none' ? loggedData?.periodFlow : undefined,
    isPeriodEnd: isLoggedEnd,
    hasSexualActivity: hasActivity,
    hasSymptoms,
    hasMood,
    hasNotes,
    hasAnyLog
  };

  // --- Period Range Calculation ---
  let lastPeriodStartDate: Date | null = null;
  for (let i = allSortedPeriodDates.length - 1; i >= 0; i--) {
    if (!isAfter(allSortedPeriodDates[i], date)) {
      lastPeriodStartDate = allSortedPeriodDates[i];
      break;
    }
  }

  if (lastPeriodStartDate) {
    let periodEndDate: Date | null = null;
    const logsArray = Object.values(logs).sort((a, b) => {
      const timeA = a.date ? parseISO(a.date).getTime() : 0;
      const timeB = b.date ? parseISO(b.date).getTime() : 0;
      return timeA - timeB;
    });
    for (const log of logsArray) {
      if (!log.date) continue;
      const logDate = parseISO(log.date);
      if (!isValid(logDate)) continue;
      if (!isBefore(logDate, lastPeriodStartDate) && log.isPeriodEnd) {
        let isCorrectEnd = true;
        for (let k = allSortedPeriodDates.length - 1; k >= 0; k--) {
          const intermediateStartDate = allSortedPeriodDates[k];
          if (isAfter(intermediateStartDate, lastPeriodStartDate) && isBefore(intermediateStartDate, logDate)) {
            isCorrectEnd = false;
            break;
          }
        }
        if (isCorrectEnd) {
          periodEndDate = logDate;
          break;
        }
      }
    }

    if (isEqual(date, lastPeriodStartDate)) {
      dayInfo.isPeriodStart = true;
    }
    if (periodEndDate && isEqual(date, periodEndDate)) {
      dayInfo.isPeriodEnd = true;
    }
    if (periodEndDate && isAfter(date, lastPeriodStartDate) && isBefore(date, periodEndDate)) {
      dayInfo.isInPeriodRange = true;
    } else if (!periodEndDate && isAfter(date, lastPeriodStartDate) && isLoggedPeriod) {
      dayInfo.isInPeriodRange = true;
    }
    if (dayInfo.isPeriodStart && dayInfo.isPeriodEnd) {
      dayInfo.isInPeriodRange = false;
    }
  }
  // --- End Period Range Calculation ---

  // --- Simplified Prediction Placeholder ---
  // TODO: Replace with actual calculation from insights data
  const MOCK_CYCLE_LENGTH = 28;
  const MOCK_PERIOD_LENGTH = 5;

  if (allSortedPeriodDates.length > 0) {
    const latestStartDate = allSortedPeriodDates[allSortedPeriodDates.length - 1];
    const daysSinceStart = Math.floor((date.getTime() - latestStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart >= 0) {
      // TODO: Use calculated fertile window from insights
      if (daysSinceStart >= 10 && daysSinceStart <= 16) {
        dayInfo.isFertile = true;
      }
      // TODO: Use calculated ovulation day from insights
      if (daysSinceStart === 14) {
        dayInfo.isOvulation = true;
      }
      // TODO: Use calculated prediction from insights
      const predictedNextStart = addDays(latestStartDate, MOCK_CYCLE_LENGTH);
      const daysUntilPredicted = Math.floor((predictedNextStart.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilPredicted >= -(MOCK_PERIOD_LENGTH - 1) && daysUntilPredicted <= 3 && !isLoggedPeriod && !dayInfo.isPeriodStart && !dayInfo.isInPeriodRange && !dayInfo.isPeriodEnd) {
        dayInfo.isPredictedPeriod = true;
      }
    }
  }
  // --- End Prediction Placeholder ---

  return dayInfo;
};

// Custom Caption Component for better button placement
function CustomCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  return (
    <div className="flex justify-center items-center relative h-14 px-4 border-b bg-background">
      <Button
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        variant="ghost" // Changed to ghost for less visual clutter
        size="icon"
        className="h-9 w-9 absolute left-2" // Adjusted padding and position
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Go to previous month</span>
      </Button>
      <span className="text-lg font-semibold text-foreground">
        {formatDateFns(props.displayMonth, 'MMMM yyyy')}
      </span>
      <Button
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        variant="ghost" // Changed to ghost
        size="icon"
        className="h-9 w-9 absolute right-2" // Adjusted padding and position
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Go to next month</span>
      </Button>
    </div>
  );
}


export default function CalendarView() {
  const { logData, isLoading } = useCycleData();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date()));
  const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfMonth(new Date())); // Use startOfMonth
  const [monthDayInfo, setMonthDayInfo] = React.useState<Record<string, DayInfo>>({});
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const today = startOfDay(new Date());

  const allSortedPeriodStartDates = React.useMemo(() => {
    return Object.values(logData)
      .filter(log => log.periodFlow && log.periodFlow !== 'none')
      .filter(log => {
        if (!log.date) return false;
        try {
          const logDate = parseISO(log.date);
          if (!isValid(logDate)) return false;
          const prevDay = subDays(logDate, 1);
          const prevDayString = formatDateFns(prevDay, 'yyyy-MM-dd');
          const prevLog = logData[prevDayString];
          return !prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none';
        } catch (e) {
          console.error(`Error processing date for period start check: ${log.date}`, e);
          return false;
        }
      })
      .map(log => parseISO(log.date!))
      .filter(isValid)
      .sort((a, b) => a.getTime() - b.getTime());
  }, [logData]);

  React.useEffect(() => {
    if (isLoading) return;

    const newMonthDayInfo: Record<string, DayInfo> = {};
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const displayDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    displayDays.forEach(day => {
      const normalizedDay = startOfDay(day);
      const dateString = formatDateFns(normalizedDay, 'yyyy-MM-dd');
      newMonthDayInfo[dateString] = calculateDayInfo(normalizedDay, logData, allSortedPeriodStartDates);
    });

    setMonthDayInfo(newMonthDayInfo);

  }, [currentMonth, logData, isLoading, allSortedPeriodStartDates]);


  const handleDayClick = (day: Date | undefined, modifiers: any, e: React.MouseEvent<HTMLDivElement>) => {
    if (!day || isAfter(day, today)) return; // Prevent selecting future dates
    const normalizedDay = startOfDay(day);
    setSelectedDate(normalizedDay);
    setPopoverOpen(true);
  };

  const renderDayContent = (date: Date, displayMonth: Date): React.ReactNode => {
    const normalizedDay = startOfDay(date);
    const dateString = formatDateFns(normalizedDay, 'yyyy-MM-dd');
    const isOutside = normalizedDay.getMonth() !== displayMonth.getMonth();
    const isFutureDate = isAfter(normalizedDay, today);

    const dayInfo = monthDayInfo[dateString];

    let baseClasses = 'relative w-full h-full flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-sm';
    let backgroundClass = '';
    let textClass = 'text-foreground/80';
    let borderClass = 'border border-transparent';
    let indicators = []; // Array to hold indicator icons/elements
    let shapeClass = 'rounded-md'; // Use rounded-md for a softer look
    let cursorClass = 'cursor-pointer';

    if (isLoading) {
      return <Skeleton className="h-10 w-10 rounded-md" />;
    }

    if (isOutside) {
      textClass = isFutureDate ? 'text-muted-foreground/10' : 'text-muted-foreground/30'; // Make future outside days almost invisible
      cursorClass = 'cursor-not-allowed'; // Disable cursor
      baseClasses = cn(baseClasses, 'opacity-50');
       if (isFutureDate) baseClasses = cn(baseClasses, 'opacity-20'); // Further reduce opacity
    } else if (isFutureDate) {
      textClass = 'text-muted-foreground/40'; // Dim future dates
      cursorClass = 'cursor-not-allowed';
      baseClasses = cn(baseClasses, 'opacity-60');
    } else if (dayInfo) {
      const isSelected = selectedDate && isEqual(normalizedDay, selectedDate);
      const isToday = isEqual(normalizedDay, today);

      // --- Period Styling ---
      if (dayInfo.isPeriodStart && dayInfo.isPeriodEnd) {
        backgroundClass = 'bg-primary/90'; // Stronger background
        textClass = 'text-primary-foreground font-semibold';
        shapeClass = 'rounded-md'; // Keep square for single day
        borderClass = 'border-primary border-2';
      } else if (dayInfo.isPeriodStart) {
        backgroundClass = 'bg-primary/90';
        textClass = 'text-primary-foreground font-semibold';
        shapeClass = 'rounded-l-md'; // Square left side
        borderClass = 'border-y-2 border-l-2 border-primary';
      } else if (dayInfo.isPeriodEnd) {
        backgroundClass = 'bg-primary/90';
        textClass = 'text-primary-foreground font-semibold';
        shapeClass = 'rounded-r-md'; // Square right side
        borderClass = 'border-y-2 border-r-2 border-primary';
      } else if (dayInfo.isInPeriodRange) {
        backgroundClass = 'bg-primary/70'; // Slightly less intense
        textClass = 'text-primary-foreground/90';
        shapeClass = 'rounded-none'; // No rounding in middle
        borderClass = 'border-y-2 border-primary/80';
      } else if (dayInfo.isPeriod) { // Fallback for logged period days outside a detected range
        backgroundClass = 'bg-primary/50';
        textClass = 'text-primary-foreground/80 font-medium';
        shapeClass = 'rounded-md'; // Default square
        borderClass = 'border border-primary/70';
      }

      // --- Other States (Apply if not a period day) ---
      if (!backgroundClass) { // Only apply if not already styled as period
        if (dayInfo.isFertile && !dayInfo.isOvulation) {
          backgroundClass = 'bg-teal-100 dark:bg-teal-900/30'; // Use a specific color for fertility
          borderClass = 'border border-dashed border-teal-400/50 dark:border-teal-600/50';
          textClass = 'text-teal-800 dark:text-teal-200';
        } else if (dayInfo.isPredictedPeriod) {
          borderClass = 'border border-dashed border-primary/40'; // Use primary color dashed border
          textClass = 'text-muted-foreground';
        }

        if (dayInfo.isOvulation) {
          backgroundClass = cn(backgroundClass, 'bg-accent/20 dark:bg-accent/30'); // Stronger accent for ovulation
          borderClass = 'border-2 border-accent/70'; // More prominent border
          textClass = 'text-accent font-medium';
          indicators.push(<Sparkles key="ovulation" className="absolute top-0.5 right-0.5 h-3 w-3 stroke-2 text-accent" aria-label="Predicted ovulation"/>);
        }

        // --- Logged Data Indicators ---
        // Use small dots at the bottom for logged data types
        let indicatorCount = 0;
        const maxIndicators = 3; // Limit visible dots

        if (dayInfo.hasSexualActivity && indicatorCount < maxIndicators) {
             indicators.push(<span key="activity" className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Sexual activity logged"></span>);
             indicatorCount++;
        }
        if (dayInfo.hasSymptoms && indicatorCount < maxIndicators) {
             indicators.push(<span key="symptoms" className="h-1.5 w-1.5 rounded-full bg-yellow-500" aria-label="Symptoms logged"></span>);
             indicatorCount++;
        }
        if (dayInfo.hasMood && indicatorCount < maxIndicators) {
             indicators.push(<span key="mood" className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-label="Mood logged"></span>);
             indicatorCount++;
        }
        // Add a generic dot if more than maxIndicators or only notes are present
         if ((dayInfo.hasAnyLog && indicatorCount === 0) || indicatorCount >= maxIndicators) {
            if(indicatorCount >= maxIndicators) indicators = indicators.slice(0, maxIndicators -1); // Keep space for the generic dot
            indicators.push(<span key="log" className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="Data logged"></span>);
        }


        // Today's Styling
        if (isToday && !isSelected) {
          borderClass = cn(borderClass !== 'border border-transparent' ? borderClass : '', 'border-2 border-ring'); // Use theme ring color
          textClass = cn(textClass, 'font-bold'); // Bold today's number
        }

        // Hover effect (only if not selected and not primary background)
        if (!isSelected && !backgroundClass.includes('bg-primary')) {
          baseClasses = cn(baseClasses, 'hover:bg-muted hover:border-border');
        }
      }


      // --- Selection Styling (Overrides others) ---
      if (isSelected) {
        backgroundClass = 'bg-accent';
        textClass = 'text-accent-foreground font-bold';
        borderClass = 'border-2 border-accent';
        baseClasses = cn(baseClasses, 'ring-2 ring-accent ring-offset-1 ring-offset-background shadow-lg z-10'); // Add z-index

        // Adjust shape based on period range connection if selected
        if (dayInfo.isPeriodStart && dayInfo.isPeriodEnd) shapeClass = 'rounded-md';
        else if (dayInfo.isPeriodStart) shapeClass = 'rounded-l-md';
        else if (dayInfo.isPeriodEnd) shapeClass = 'rounded-r-md';
        else if (dayInfo.isInPeriodRange) shapeClass = 'rounded-none';
        else shapeClass = 'rounded-md'; // Default for selected non-period days

        // Change indicator colors for selected state if needed
        indicators = indicators.map((indicator: React.ReactElement) =>
            React.cloneElement(indicator, {
                className: cn(indicator.props.className, indicator.key !== 'ovulation' ? 'bg-accent-foreground/70' : '') // Make dots visible on accent bg
            })
        );
        if (dayInfo.isOvulation && indicators.some(ind => ind.key === 'ovulation')) {
            indicators = indicators.map((indicator: React.ReactElement) =>
                indicator.key === 'ovulation' ? React.cloneElement(indicator, { className: cn(indicator.props.className, 'text-accent-foreground') }) : indicator
            );
        }

      } else {
        // --- Non-Selected Period Range Connection Styling ---
        const prevDayString = formatDateFns(subDays(normalizedDay, 1), 'yyyy-MM-dd');
        const nextDayString = formatDateFns(addDays(normalizedDay, 1), 'yyyy-MM-dd');
        const prevDayInfo = monthDayInfo[prevDayString];
        const nextDayInfo = monthDayInfo[nextDayString];

        const isCurrentInRangeLike = dayInfo.isPeriodStart || dayInfo.isPeriodEnd || dayInfo.isInPeriodRange;
        const isPrevInRangeLike = prevDayInfo && (prevDayInfo.isPeriodStart || prevDayInfo.isInPeriodRange);
        const isNextInRangeLike = nextDayInfo && (nextDayInfo.isPeriodEnd || nextDayInfo.isInPeriodRange);

        if (isCurrentInRangeLike) {
          if (dayInfo.isPeriodStart && dayInfo.isPeriodEnd) shapeClass = 'rounded-md';
          else if (dayInfo.isPeriodStart && isNextInRangeLike) shapeClass = 'rounded-l-md';
          else if (dayInfo.isPeriodEnd && isPrevInRangeLike) shapeClass = 'rounded-r-md';
          else if (dayInfo.isInPeriodRange && isPrevInRangeLike && isNextInRangeLike) shapeClass = 'rounded-none';
           // Handle edge cases where range extends beyond visible month if needed
           else if (dayInfo.isInPeriodRange && isPrevInRangeLike) shapeClass = 'rounded-r-md'; // Connect left, be end shape
           else if (dayInfo.isInPeriodRange && isNextInRangeLike) shapeClass = 'rounded-l-md'; // Connect right, be start shape
        }
      }
    } else { // Basic styling for days with no info (and not future/outside)
        const isToday = isEqual(normalizedDay, today);
        if (isToday) {
             borderClass = 'border-2 border-ring';
             textClass = cn(textClass, 'font-semibold');
        }
         baseClasses = cn(baseClasses, 'hover:bg-muted hover:border-border');
    }


    const combinedClasses = cn(
      baseClasses,
      backgroundClass,
      borderClass,
      textClass,
      shapeClass,
      cursorClass
    );

    return (
      <div
        className={combinedClasses}
        onClick={(e) => handleDayClick(normalizedDay, {}, e)}
        aria-label={!isFutureDate ? `Details for ${formatDateFns(normalizedDay, 'PPP')}` : `Future date ${formatDateFns(normalizedDay, 'PPP')}, disabled`}
        role={!isFutureDate ? "button" : undefined}
        tabIndex={isFutureDate || isOutside ? -1 : 0}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isFutureDate && !isOutside) handleDayClick(normalizedDay, {}, e as any); }}
        aria-disabled={isFutureDate || isOutside}
      >
        {formatDateFns(normalizedDay, 'd')}
        {/* Render indicators at the bottom */}
         {indicators.length > 0 && (
             <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                 {indicators}
             </div>
         )}
      </div>
    );
  };


  const getSymptomIcon = (symptom: string) => {
    switch (symptom.toLowerCase()) {
      case 'cramps': return <Zap className="w-4 h-4 mr-1.5 text-yellow-500" />;
      case 'headache': return <CloudRain className="w-4 h-4 mr-1.5 text-blue-400" />;
      case 'bloating': return <Wind className="w-4 h-4 mr-1.5 text-purple-400" />;
      case 'fatigue': return <Activity className="w-4 h-4 mr-1.5 text-gray-500" />;
      case 'acne': return <Snowflake className="w-4 h-4 mr-1.5 text-cyan-400" />;
      case 'backache': return <Flame className="w-4 h-4 mr-1.5 text-orange-500" />;
      case 'nausea': return <ThermometerSun className="w-4 h-4 mr-1.5 text-lime-500" />;
      default: return <Info className="w-4 h-4 mr-1.5 text-gray-400" />;
    }
  }
  const getMoodIcon = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'happy': return <Smile className="w-4 h-4 mr-1.5 text-yellow-400" />;
      case 'sad': return <Frown className="w-4 h-4 mr-1.5 text-blue-500" />;
      case 'anxious': return <Meh className="w-4 h-4 mr-1.5 text-purple-500" />;
      case 'irritable': return <Annoyed className="w-4 h-4 mr-1.5 text-orange-500" />;
      case 'calm': return <Anchor className="w-4 h-4 mr-1.5 text-green-500" />;
      default: return <Smile className="w-4 h-4 mr-1.5 text-gray-400" />;
    }
  }

  const selectedDayInfo = selectedDate ? monthDayInfo[formatDateFns(selectedDate, 'yyyy-MM-dd')] : null;

  const hasAnySelectedData = selectedDayInfo?.hasAnyLog ||
                             selectedDayInfo?.isFertile ||
                             selectedDayInfo?.isOvulation ||
                             selectedDayInfo?.isPredictedPeriod;


  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="rounded-lg border shadow-md overflow-hidden bg-card cursor-default">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onMonthChange={(month) => setCurrentMonth(startOfMonth(month))}
            disabled={(date) => isAfter(date, today)}
            className="p-0"
            classNames={{
              root: 'bg-card text-card-foreground rounded-lg w-full',
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "hidden",
              nav: "hidden",
              table: 'w-full border-collapse', // Removed mt-1
              head_row: 'flex justify-around items-center h-10 border-b', // Added border-b
              head_cell: 'w-10 text-muted-foreground font-medium text-[0.8rem]', // Slightly smaller text
              row: 'flex w-full mt-0.5 justify-around',
              cell: cn(
                'h-10 w-10 text-center text-sm p-0 relative', // Cell base styles
                'focus-within:relative focus-within:z-20'
              ),
              day: 'h-10 w-10 p-0 font-normal', // Base size for layout, content handles styling
              day_selected: ' ', day_today: ' ', day_outside: ' ', // Handled by DayContent
              day_disabled: 'text-muted-foreground/30 opacity-50 cursor-not-allowed aria-disabled:cursor-not-allowed',
              day_hidden: 'invisible',
              day_range_start: ' ', day_range_end: ' ', day_range_middle: ' ', // Reset range styles
            }}
            components={{
              Caption: CustomCaption,
              DayContent: ({ date, displayMonth }) => renderDayContent(date, displayMonth),
            }}
            showOutsideDays={true}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-4 border shadow-xl rounded-lg bg-popover" // Fixed width
        align="center"
        sideOffset={8}
        alignOffset={0}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-radix-popover-content]')) {
             // Inside popover
          } else {
             if (!(event.target instanceof Element && event.target.closest('.rdp-button, .rdp-day, [role="button"], [role="gridcell"]'))) {
                 setPopoverOpen(false);
             }
          }
        }}
      >
        {selectedDayInfo ? (
          <div className="space-y-4 max-w-xs text-popover-foreground">
            <h4 className="font-semibold text-center text-lg border-b pb-2 mb-3">{formatDateFns(selectedDayInfo.date, 'PPP')}</h4>

            {/* Section for Period/Predictions */}
            <div className="space-y-2 text-sm">
              {(selectedDayInfo.isPeriodStart || selectedDayInfo.isPeriod || selectedDayInfo.isInPeriodRange || selectedDayInfo.isPeriodEnd) && (
                <div className={cn("flex items-center font-medium p-2 rounded-md shadow-sm", selectedDayInfo.isPeriodStart || selectedDayInfo.isPeriodEnd ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  <Droplet className="w-4 h-4 mr-2 flex-shrink-0" />
                  Period
                  {selectedDayInfo.periodIntensity && ` (${selectedDayInfo.periodIntensity.charAt(0).toUpperCase() + selectedDayInfo.periodIntensity.slice(1)})`}
                  {selectedDayInfo.isPeriodStart && !selectedDayInfo.isPeriodEnd && " (Start)"}
                  {selectedDayInfo.isPeriodEnd && !selectedDayInfo.isPeriodStart && " (End)"}
                  {selectedDayInfo.isPeriodStart && selectedDayInfo.isPeriodEnd && " (Start & End)"}
                </div>
              )}
              {selectedDayInfo.isFertile && !selectedDayInfo.isOvulation && !selectedDayInfo.isPeriod && (
                <div className="flex items-center p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 rounded-md shadow-sm">
                  <HeartPulse className="w-4 h-4 mr-2 flex-shrink-0 text-teal-500" /> Predicted Fertile Window
                </div>
              )}
              {selectedDayInfo.isOvulation && !selectedDayInfo.isPeriod && (
                <div className="flex items-center font-medium p-2 bg-accent/10 text-accent rounded-md shadow-sm">
                  <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" /> Predicted Ovulation
                </div>
              )}
              {selectedDayInfo.isPredictedPeriod && !selectedDayInfo.isPeriod && (
                <div className="flex items-center text-primary/80 italic p-2 bg-primary/5 rounded-md">
                  <Droplet className="w-4 h-4 mr-2 flex-shrink-0 opacity-50" /> Predicted Period
                </div>
              )}
            </div>

            {/* Section for Logged Data */}
             {(selectedDayInfo.hasSymptoms || selectedDayInfo.hasMood || selectedDayInfo.hasSexualActivity || selectedDayInfo.hasNotes) && (
                <div className="space-y-3 pt-3 border-t">
                  {selectedDayInfo.loggedData?.symptoms && selectedDayInfo.loggedData.symptoms.length > 0 && (
                    <div>
                      <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Symptoms</span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        {selectedDayInfo.loggedData.symptoms.map(symptom => (
                          <span key={symptom} className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs shadow-sm">
                            {getSymptomIcon(symptom)}
                            <span className="capitalize">{symptom}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDayInfo.loggedData?.mood && (
                    <div>
                      <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Mood</span>
                      <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs w-fit shadow-sm">
                        {getMoodIcon(selectedDayInfo.loggedData.mood)}
                        <span className="capitalize">{selectedDayInfo.loggedData.mood}</span>
                      </span>
                    </div>
                  )}
                  {(selectedDayInfo.loggedData?.sexualActivityCount ?? 0) > 0 && (
                    <div>
                      <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Activity</span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs shadow-sm">
                          <HeartPulse className="w-4 h-4 mr-1.5 text-red-500" />
                          Activity ({selectedDayInfo.loggedData!.sexualActivityCount})
                        </span>
                        {selectedDayInfo.loggedData!.protectionUsed !== undefined && (
                          <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs shadow-sm">
                            {selectedDayInfo.loggedData!.protectionUsed ? <ShieldCheck className="w-4 h-4 mr-1.5 text-green-600" /> : <Ban className="w-4 h-4 mr-1.5 text-red-600" />}
                            {selectedDayInfo.loggedData!.protectionUsed ? 'Protected' : 'Unprotected'}
                          </span>
                        )}
                        {selectedDayInfo.loggedData!.orgasm !== undefined && (
                          <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs shadow-sm">
                            <SmilePlus className="w-4 h-4 mr-1.5 text-pink-500" />
                            {selectedDayInfo.loggedData!.orgasm ? 'Orgasm' : 'No Orgasm'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedDayInfo.loggedData?.notes && (
                    <div>
                      <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Notes</span>
                      <p className="text-xs bg-muted/50 p-2 rounded shadow-sm line-clamp-3">{selectedDayInfo.loggedData.notes}</p>
                    </div>
                  )}
                </div>
             )}

            {!hasAnySelectedData && (
              <p className="text-sm text-muted-foreground text-center pt-2 italic">No data logged or predicted for this day.</p>
            )}

            {/* Button: Always show, text changes based on data */}
            <Button
                variant="default"
                size="sm"
                className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-md"
                asChild>
              <Link href={`/log?date=${formatDateFns(selectedDayInfo.date, 'yyyy-MM-dd')}`} onClick={() => setPopoverOpen(false)}>
                {selectedDayInfo.hasAnyLog ? 'Edit Log' : 'Add Log'}
              </Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 w-48">
            <Skeleton className="h-6 w-32 mx-auto rounded" />
            <hr className="border-border/50" />
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-10 w-full mt-4 rounded-full" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a day to see details.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// components/calendar/calendar-view.tsx

'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, buttonVariants } from '@/components/ui/button'; // Import buttonVariants
import { format, parseISO, startOfDay, isBefore, isAfter, isEqual, addDays, subDays } from 'date-fns';
import Link from 'next/link';
import { Droplet, Sparkles, HeartPulse, Smile, CloudRain, Zap, StickyNote, CircleDot, Info, CheckCircle, Wind, FlagOff } from 'lucide-react'; // Added FlagOff
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context and LogData type
import { cn } from '@/lib/utils'; // Import cn utility
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Structure for derived calendar data including period range info
interface DayInfo {
  date: Date;
  isPeriod?: boolean;
  periodIntensity?: 'light' | 'medium' | 'heavy';
  isPeriodStart?: boolean; // Mark the start day
  isPeriodEnd?: boolean; // Mark the end day (logged)
  isInPeriodRange?: boolean; // Mark days between start and end
  isPredictedPeriod?: boolean;
  isFertile?: boolean;
  isOvulation?: boolean;
  loggedData?: LogData;
}

// Enhanced prediction and period range calculation
const calculateDayInfo = (date: Date, logs: Record<string, LogData>, allSortedPeriodDates: Date[]): DayInfo => {
  const dateString = format(date, 'yyyy-MM-dd');
  const loggedData = logs[dateString];

  const isLoggedPeriod = loggedData?.periodFlow && loggedData.periodFlow !== 'none';
  const isLoggedEnd = loggedData?.isPeriodEnd === true;

  const dayInfo: DayInfo = {
    date,
    loggedData,
    isPeriod: isLoggedPeriod,
    periodIntensity: loggedData?.periodFlow && loggedData.periodFlow !== 'none' ? loggedData?.periodFlow : undefined,
    isPeriodEnd: isLoggedEnd,
  };

  // --- Period Range Calculation ---
  let lastPeriodStartDate: Date | null = null;
  for (let i = allSortedPeriodDates.length - 1; i >= 0; i--) {
      if (!isAfter(allSortedPeriodDates[i], date)) { // Find the most recent start date <= current date
          lastPeriodStartDate = allSortedPeriodDates[i];
          break;
      }
  }

  if (lastPeriodStartDate) {
    // Find the corresponding end date (logged end or assume based on length)
    let periodEndDate: Date | null = null;
    const logsArray = Object.values(logs).sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    for (const log of logsArray) {
        const logDate = parseISO(log.date);
        if (!isBefore(logDate, lastPeriodStartDate) && log.isPeriodEnd) {
            periodEndDate = logDate;
            break; // Found the logged end for this cycle
        }
    }

    // Determine if the current date is the start, end, or within the range
    if (isEqual(date, lastPeriodStartDate)) {
        dayInfo.isPeriodStart = true;
    }
    if (periodEndDate && isEqual(date, periodEndDate)) {
        // isPeriodEnd is already set from loggedData
    }
    if (periodEndDate && isAfter(date, lastPeriodStartDate) && isBefore(date, periodEndDate)) {
        dayInfo.isInPeriodRange = true;
    } else if (!periodEndDate && isAfter(date, lastPeriodStartDate) && isLoggedPeriod) {
        // If no end date logged yet, but it's a logged period day after the start, mark as in range
        dayInfo.isInPeriodRange = true;
    }
  }
  // --- End Period Range Calculation ---


  // --- Simplified Prediction Placeholder ---
  // Predictions need historical data and average lengths - this is very basic
  const MOCK_CYCLE_LENGTH = 28;
  const MOCK_PERIOD_LENGTH = 5;

  if (allSortedPeriodDates.length > 0) {
    const latestStartDate = allSortedPeriodDates[allSortedPeriodDates.length - 1]; // Most recent start
    const daysSinceStart = Math.floor((date.getTime() - latestStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart >= 0) { // Only predict for future/current cycles relative to the last known start
        // Fertile window prediction (e.g., days 10-16 of cycle)
        if (daysSinceStart >= 10 && daysSinceStart <= 16) {
          dayInfo.isFertile = true;
        }
        // Ovulation prediction (e.g., day 14)
        if (daysSinceStart === 14) {
          dayInfo.isOvulation = true;
        }
        // Predict next period start roughly
        const predictedNextStart = addDays(latestStartDate, MOCK_CYCLE_LENGTH);
        const daysUntilPredicted = Math.floor((predictedNextStart.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        // Predict for a few days including the predicted start day itself
        if (daysUntilPredicted >= -(MOCK_PERIOD_LENGTH - 1) && daysUntilPredicted <= 3 && !isLoggedPeriod && !dayInfo.isPeriodStart && !dayInfo.isInPeriodRange && !dayInfo.isPeriodEnd) {
           dayInfo.isPredictedPeriod = true;
        }
    }
  }
  // --- End Prediction Placeholder ---

  return dayInfo;
};


export default function CalendarView() {
  const { logData, isLoading, refreshData } = useCycleData();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date())); // Ensure normalized default
  const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfDay(new Date()));
  const [monthDayInfo, setMonthDayInfo] = React.useState<Record<string, DayInfo>>({});
  const [popoverOpen, setPopoverOpen] = React.useState(false);

   // Pre-calculate sorted period start dates for efficiency
   const allSortedPeriodStartDates = React.useMemo(() => {
      return Object.values(logData)
          .filter(log => log.periodFlow && log.periodFlow !== 'none')
          // Heuristic to identify start dates: Check if the previous day wasn't a period day or doesn't exist
          .filter(log => {
              const prevDay = subDays(parseISO(log.date), 1);
              const prevDayString = format(prevDay, 'yyyy-MM-dd');
              const prevLog = logData[prevDayString];
              return !prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none';
          })
          .map(log => parseISO(log.date))
          .sort((a, b) => a.getTime() - b.getTime());
  }, [logData]);


  React.useEffect(() => {
    if (!isLoading) {
      const newMonthDayInfo: Record<string, DayInfo> = {};
      const tempDate = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Iterate through days potentially visible (previous, current, next month)
      // For simplicity, recalculate for the current month display logic uses `displayMonth`
       const monthStart = startOfMonth(currentMonth);
       const monthEnd = endOfMonth(currentMonth);
       const displayDays = eachDayOfInterval({start: monthStart, end: monthEnd});

       // Calculate info for all days in the current month
      displayDays.forEach(day => {
           const normalizedDay = startOfDay(day);
           const dateString = format(normalizedDay, 'yyyy-MM-dd');
           newMonthDayInfo[dateString] = calculateDayInfo(normalizedDay, logData, allSortedPeriodStartDates);
      });

      setMonthDayInfo(newMonthDayInfo);
    }
  }, [currentMonth, logData, isLoading, allSortedPeriodStartDates]);

  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleDayClick = (day: Date | undefined, modifiers: any, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!day) return;
    const normalizedDay = startOfDay(day);
    setSelectedDate(normalizedDay);
    setPopoverOpen(true);
  };

  const renderDayContent = (date: Date, displayMonth: Date): React.ReactNode => {
    const normalizedDay = startOfDay(date);
    const dateString = format(normalizedDay, 'yyyy-MM-dd');
    // Ensure we only process days within the current display month from the state
    if (normalizedDay.getMonth() !== displayMonth.getMonth()) {
       return <div className="h-10 w-10 flex items-center justify-center text-muted-foreground/30 opacity-50">{format(date, 'd')}</div>;
    }

    const dayInfo = monthDayInfo[dateString];

    if (isLoading) {
         return <Skeleton className="h-10 w-10 rounded-full" />;
    }
    if (!dayInfo) {
        // Render a basic day if info hasn't been calculated yet (should be rare)
        return <div className="h-10 w-10 flex items-center justify-center">{format(date, 'd')}</div>;
    }


    const isSelected = selectedDate && isEqual(normalizedDay, selectedDate);
    const isToday = isEqual(normalizedDay, startOfDay(new Date()));


    // Visual Indicators - Using background, border, text, and icons
    let baseClasses = 'relative w-full h-full flex items-center justify-center transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
    let backgroundClass = '';
    let textClass = 'text-foreground/80'; // Default text
    let borderClass = 'border border-transparent';
    let iconOverlay = null;
    let shapeClass = 'rounded-full'; // Default shape

    // --- Period Styling ---
    if (dayInfo.isPeriodStart) {
        backgroundClass = 'bg-primary';
        textClass = 'text-primary-foreground font-semibold';
        shapeClass = 'rounded-l-full'; // Start of range shape
        borderClass = 'border-y-2 border-l-2 border-primary'; // Stronger border start
         if (dayInfo.isPeriodEnd) shapeClass = 'rounded-full'; // If start and end are same day
    } else if (dayInfo.isPeriodEnd) {
        backgroundClass = 'bg-primary';
        textClass = 'text-primary-foreground font-semibold';
        shapeClass = 'rounded-r-full'; // End of range shape
         borderClass = 'border-y-2 border-r-2 border-primary'; // Stronger border end
    } else if (dayInfo.isInPeriodRange) {
        backgroundClass = 'bg-primary/80'; // Slightly lighter fill for in-between days
        textClass = 'text-primary-foreground/90';
        shapeClass = 'rounded-none'; // Square shape for middle days
         borderClass = 'border-y-2 border-primary/80'; // Match background opacity
    } else if (dayInfo.isPeriod) { // Fallback for single period days if range logic fails
         backgroundClass = 'bg-primary';
         textClass = 'text-primary-foreground font-semibold';
         shapeClass = 'rounded-full';
         borderClass = 'border-2 border-primary';
    }

    // --- Other States (Apply if not a period day) ---
    if (!backgroundClass) {
        if (dayInfo.isFertile && !dayInfo.isOvulation) {
            backgroundClass = 'bg-secondary/10';
            borderClass = 'border border-dashed border-secondary/40';
            textClass = 'text-secondary-foreground/80';
        } else if (dayInfo.isPredictedPeriod) {
            borderClass = 'border border-dashed border-primary/30';
            textClass = 'text-muted-foreground';
            // Maybe add a subtle dot instead?
            // iconOverlay = <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/50" />;
        }

        // Ovulation Styling (can overlay fertile)
        if (dayInfo.isOvulation) {
            backgroundClass = cn(backgroundClass, 'bg-accent/15'); // Combine backgrounds if needed
            borderClass = 'border-2 border-accent/60';
            textClass = 'text-accent font-medium';
            iconOverlay = <Sparkles className="absolute top-0.5 right-0.5 h-3 w-3 stroke-2 text-accent" />;
        }

         // Logged Data Indicator
        if (dayInfo.loggedData && (Object.keys(dayInfo.loggedData).length > (dayInfo.loggedData.date ? 1 : 0)) && !dayInfo.isPeriod) { // Check if more than just date exists, and not already styled as period
            const iconPosition = dayInfo.isOvulation ? "bottom-0.5 left-0.5" : "top-0.5 right-0.5";
            iconOverlay = iconOverlay && dayInfo.isOvulation ? iconOverlay : <CheckCircle className={cn("absolute h-3 w-3", iconPosition, "text-muted-foreground/70")} aria-label="Data logged" />;
        }

         // Today's Styling
        if (isToday && !isSelected) {
           borderClass = cn(borderClass !== 'border border-transparent' ? borderClass : '', 'border-2 border-ring'); // Add ring-like border if no other border
           textClass = cn(textClass, 'font-semibold');
        }

         // Hover effect only for non-selected, non-period days
         if (!isSelected && !backgroundClass.includes('bg-primary')) {
            baseClasses = cn(baseClasses, 'hover:bg-muted/50 hover:border-border');
         }
    }


    // --- Selection Styling (Overrides others) ---
    if (isSelected) {
        backgroundClass = 'bg-accent'; // Accent color for selection
        textClass = 'text-accent-foreground font-bold';
        borderClass = 'border-2 border-accent';
        // Ensure selection ring is visible
        baseClasses = cn(baseClasses, 'ring-2 ring-accent ring-offset-1 ring-offset-background shadow-md');
        if (iconOverlay) { // Make icon contrast with selection
            iconOverlay = React.cloneElement(iconOverlay, { className: cn(iconOverlay.props.className, 'text-accent-foreground/80') });
        }
         // If selected day is part of period range, adjust shape
         if (dayInfo.isPeriodStart && !dayInfo.isPeriodEnd) shapeClass = 'rounded-l-full';
         else if (dayInfo.isPeriodEnd && !dayInfo.isPeriodStart) shapeClass = 'rounded-r-full';
         else if (dayInfo.isInPeriodRange) shapeClass = 'rounded-none';
         else shapeClass = 'rounded-full'; // Default selected shape
    } else {
        // If not selected, but part of range, connect shapes
        // Check neighbours (simple check, might need refinement for month edges)
         const prevDayString = format(subDays(normalizedDay, 1), 'yyyy-MM-dd');
         const nextDayString = format(addDays(normalizedDay, 1), 'yyyy-MM-dd');
         const prevDayInfo = monthDayInfo[prevDayString];
         const nextDayInfo = monthDayInfo[nextDayString];

         const isInRangeLike = dayInfo.isPeriodStart || dayInfo.isPeriodEnd || dayInfo.isInPeriodRange;
         const prevIsInRangeLike = prevDayInfo && (prevDayInfo.isPeriodStart || prevDayInfo.isInPeriodRange);
         const nextIsInRangeLike = nextDayInfo && (nextDayInfo.isPeriodEnd || nextDayInfo.isInPeriodRange);

        if (isInRangeLike) {
             if (prevIsInRangeLike && nextIsInRangeLike) shapeClass = 'rounded-none';
             else if (prevIsInRangeLike) shapeClass = 'rounded-r-full'; // Connected to left
             else if (nextIsInRangeLike) shapeClass = 'rounded-l-full'; // Connected to right
             // If it's a start or end day specifically, override if needed
             if (dayInfo.isPeriodStart && dayInfo.isPeriodEnd) shapeClass = 'rounded-full'; // Single day period
             else if (dayInfo.isPeriodStart) shapeClass = 'rounded-l-full';
             else if (dayInfo.isPeriodEnd) shapeClass = 'rounded-r-full';
        }
    }


    const combinedClasses = cn(
      baseClasses,
      backgroundClass,
      borderClass,
      textClass,
      shapeClass
    );

     // Use a div wrapper for styling, button inside for interaction if needed,
     // but DayPicker handles click via onSelect on Calendar itself now.
    return (
        <div className={combinedClasses} aria-label={`Details for ${format(normalizedDay, 'PPP')}`}>
           {format(normalizedDay, 'd')}
           {iconOverlay}
        </div>
    );
  };

  const getSymptomIcon = (symptom: string) => {
      switch(symptom.toLowerCase()) { // Case-insensitive matching
          case 'cramp': return <Zap className="w-4 h-4 mr-1.5 text-yellow-500" />;
          case 'headache': return <CloudRain className="w-4 h-4 mr-1.5 text-blue-400" />;
          case 'bloating': return <Wind className="w-4 h-4 mr-1.5 text-purple-400" />;
          default: return <Info className="w-4 h-4 mr-1.5 text-gray-400" />;
      }
  }
   const getMoodIcon = (mood: string) => {
       switch(mood.toLowerCase()) { // Case-insensitive matching
          case 'irritable': return <Smile className="w-4 h-4 mr-1.5 text-orange-500" />;
          case 'calm': return <Smile className="w-4 h-4 mr-1.5 text-green-500" />;
          case 'happy': return <Smile className="w-4 h-4 mr-1.5 text-yellow-400" />;
          case 'sad': return <Smile className="w-4 h-4 mr-1.5 text-blue-500" />;
          case 'anxious': return <Smile className="w-4 h-4 mr-1.5 text-purple-500" />;
          default: return <Smile className="w-4 h-4 mr-1.5 text-gray-400" />;
      }
  }

   const selectedDayInfo = selectedDate ? monthDayInfo[format(selectedDate, 'yyyy-MM-dd')] : null;


  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
         {/* The entire Calendar container can act as the trigger */}
         {/* Remove redundant button wrapper */}
          <div className="rounded-lg border shadow-md overflow-hidden bg-card cursor-pointer">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={ (day, selectedDay, activeModifiers, e) => {
                     if (day) handleDayClick(day, activeModifiers, e as React.MouseEvent<HTMLButtonElement>);
                     // If clicking outside days (e.g., prev/next month names), day might be undefined
                     else if (e.target instanceof Element && e.target.closest('.rdp-nav_button')) {
                          // Allow month navigation clicks without opening popover
                         setPopoverOpen(false);
                     } else {
                         // Potentially handle clicks on week numbers or other elements if needed
                         setPopoverOpen(false);
                     }
                 }}
                month={currentMonth}
                onMonthChange={(month) => setCurrentMonth(startOfDay(month))}
                className="p-0"
                classNames={{
                root: 'bg-card text-card-foreground rounded-lg',
                caption: 'flex justify-center items-center h-14 border-b relative px-4',
                caption_label: 'text-lg font-semibold text-foreground',
                nav: 'flex items-center absolute inset-y-0',
                nav_button: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full'
                ),
                nav_button_previous: 'left-2',
                nav_button_next: 'right-2',
                table: 'w-full border-collapse mt-1',
                head_row: 'flex justify-around items-center h-10',
                head_cell: 'w-10 text-muted-foreground font-medium text-sm',
                row: 'flex w-full mt-0.5 justify-around', // Reduced row spacing slightly
                cell: cn( // Cell container - remove internal padding, apply on DayContent
                    'h-10 w-10 text-center text-sm p-0 relative',
                    'focus-within:relative focus-within:z-20'
                ),
                // Daypicker's default day styles - make them minimal or transparent
                // We control appearance fully in DayContent
                day: 'h-10 w-10 p-0 font-normal', // Base size, remove button variant styles
                day_selected: ' ', // Handled by DayContent
                day_today: ' ', // Handled by DayContent
                day_outside: ' ', // Handled by DayContent (renders dimmed number)
                day_disabled: 'text-muted-foreground/50 opacity-50 cursor-not-allowed',
                day_hidden: 'invisible',
                // Range styles might interfere, reset them
                day_range_start: ' ',
                day_range_end: ' ',
                day_range_middle: ' ',
                }}
                components={{
                  DayContent: ({ date, displayMonth }) => renderDayContent(date, displayMonth),
                }}
                showOutsideDays={true}
              />
          </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-4 border shadow-xl rounded-lg bg-popover"
        align="center"
        sideOffset={8}
        alignOffset={0}
        onFocusOutside={(event) => event.preventDefault()}
         onPointerDownOutside={(event) => {
            // Allow interaction with elements inside the popover
            if (event.target instanceof Element && event.target.closest('[data-radix-popover-content]')) {
                 // Do nothing, interaction is inside the popover
            } else {
                // Close if clicking outside, but check if the click was on the calendar trigger itself
                 if (!(event.target instanceof Element && event.target.closest('.rdp-button'))) {
                     setPopoverOpen(false);
                 }
            }
        }}
      >
         {selectedDayInfo ? (
          <div className="space-y-3 max-w-xs text-popover-foreground">
            <h4 className="font-semibold text-center text-lg">{format(selectedDayInfo.date, 'PPP')}</h4>
            <hr className="border-border/50"/>
            <div className="space-y-2 text-sm">
                 {/* Period Indicators */}
                {(selectedDayInfo.isPeriodStart || selectedDayInfo.isPeriod || selectedDayInfo.isInPeriodRange || selectedDayInfo.isPeriodEnd) && (
                    <div className={cn(
                        "flex items-center font-medium p-1.5 rounded-md shadow-sm",
                        selectedDayInfo.isPeriodStart || selectedDayInfo.isPeriodEnd ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                        <Droplet className="w-4 h-4 mr-2 flex-shrink-0" />
                        Period
                        {selectedDayInfo.periodIntensity && ` (${selectedDayInfo.periodIntensity.charAt(0).toUpperCase() + selectedDayInfo.periodIntensity.slice(1)})`}
                        {selectedDayInfo.isPeriodStart && !selectedDayInfo.isPeriodEnd && " (Start)"}
                        {selectedDayInfo.isPeriodEnd && " (End)"}
                         {selectedDayInfo.isPeriodStart && selectedDayInfo.isPeriodEnd && " (Start & End)"}
                    </div>
                )}
                {/* Predictions */}
                 {selectedDayInfo.isFertile && !selectedDayInfo.isOvulation && !selectedDayInfo.isPeriod && (
                    <div className="flex items-center text-secondary-foreground p-1.5 bg-secondary/10 rounded-md shadow-sm">
                        <HeartPulse className="w-4 h-4 mr-2 flex-shrink-0" /> Fertile Window
                    </div>
                 )}
                {selectedDayInfo.isOvulation && !selectedDayInfo.isPeriod && (
                    <div className="flex items-center text-accent font-medium p-1.5 bg-accent/10 rounded-md shadow-sm">
                        <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" /> Predicted Ovulation
                    </div>
                )}
                 {selectedDayInfo.isPredictedPeriod && !selectedDayInfo.isPeriod && (
                    <div className="flex items-center text-primary/80 italic p-1.5 bg-primary/5 rounded-md">
                        <Droplet className="w-4 h-4 mr-2 flex-shrink-0 opacity-50" /> Predicted Period
                    </div>
                )}
                {/* Logged Data */}
                {selectedDayInfo.loggedData?.symptoms && selectedDayInfo.loggedData.symptoms.length > 0 && (
                <div className="pt-1">
                    <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Symptoms:</span>
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
                <div className="pt-1">
                     <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Mood:</span>
                     <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs w-fit shadow-sm">
                         {getMoodIcon(selectedDayInfo.loggedData.mood)}
                         <span className="capitalize">{selectedDayInfo.loggedData.mood}</span>
                     </span>
                </div>
                )}
                 {selectedDayInfo.loggedData?.sexualActivity && (
                     <div className="pt-1">
                         <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Activity:</span>
                         <span className="flex items-center bg-muted/60 px-2 py-0.5 rounded-full text-xs w-fit shadow-sm">
                             <HeartPulse className="w-4 h-4 mr-1.5 text-red-500" />
                             Sexual Activity {selectedDayInfo.loggedData.protectionUsed ? '(Protected)' : '(Unprotected)'}
                         </span>
                     </div>
                 )}
                {selectedDayInfo.loggedData?.notes && (
                <div className="pt-1">
                     <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Notes:</span>
                     <p className="text-xs bg-muted/50 p-2 rounded shadow-sm line-clamp-3">{selectedDayInfo.loggedData.notes}</p>
                </div>
                )}

            </div>
             {(!selectedDayInfo.isPeriod && !selectedDayInfo.isFertile && !selectedDayInfo.isOvulation && !selectedDayInfo.isPredictedPeriod && !selectedDayInfo.loggedData?.symptoms?.length && !selectedDayInfo.loggedData?.mood && !selectedDayInfo.loggedData?.sexualActivity && !selectedDayInfo.loggedData?.notes) && (
                 <p className="text-sm text-muted-foreground text-center pt-2 italic">No data logged or predicted.</p>
             )}
            {/* Check if there's any meaningful data logged beyond just date and 'none' flow */}
             {selectedDayInfo.loggedData && (Object.keys(selectedDayInfo.loggedData).length > 1 || (selectedDayInfo.loggedData.periodFlow && selectedDayInfo.loggedData.periodFlow !== 'none')) ? (
                 <Button variant="default" size="sm" className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-md" asChild>
                   <Link href={`/log?date=${format(selectedDayInfo.date, 'yyyy-MM-dd')}`} onClick={() => setPopoverOpen(false)}>
                    Edit Log
                  </Link>
                </Button>
             ) : (
                 <Button variant="default" size="sm" className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-md" asChild>
                    <Link href={`/log?date=${format(selectedDayInfo.date, 'yyyy-MM-dd')}`} onClick={() => setPopoverOpen(false)}>
                     Add Log
                   </Link>
                 </Button>
            )}
          </div>
        ) : isLoading ? (
             <div className="space-y-2 w-48">
                 <Skeleton className="h-6 w-32 mx-auto rounded" />
                 <hr className="border-border/50"/>
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
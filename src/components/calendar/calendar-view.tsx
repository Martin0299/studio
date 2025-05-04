
'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, buttonVariants } from '@/components/ui/button'; // Import buttonVariants
import { format, parseISO, startOfDay } from 'date-fns';
import Link from 'next/link';
import { Droplet, Sparkles, HeartPulse, Smile, CloudRain, Zap, StickyNote, CircleDot, Info, CheckCircle } from 'lucide-react'; // Added Info icon
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context and LogData type
import { cn } from '@/lib/utils'; // Import cn utility
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock data structure for derived calendar data
interface DayInfo {
  date: Date;
  isPeriod?: boolean;
  periodIntensity?: 'light' | 'medium' | 'heavy';
  isPredictedPeriod?: boolean; // Future feature
  isFertile?: boolean;        // Future feature
  isOvulation?: boolean;      // Future feature
  loggedData?: LogData;
}

// Mock prediction logic - replace with actual cycle prediction algorithm later
const calculateDayInfo = (date: Date, logs: Record<string, LogData>): DayInfo => {
  const dateString = format(date, 'yyyy-MM-dd');
  const loggedData = logs[dateString];

  const dayInfo: DayInfo = {
    date,
    loggedData,
    isPeriod: loggedData?.periodFlow && loggedData.periodFlow !== 'none',
    periodIntensity: loggedData?.periodFlow && loggedData.periodFlow !== 'none' ? loggedData?.periodFlow : undefined,
  };

  // --- Simplified Prediction Placeholder ---
  // In a real app, this would involve complex logic based on user settings and past cycles
  const MOCK_CYCLE_LENGTH = 28; // Get from settings
  const MOCK_PERIOD_LENGTH = 5; // Get from settings or average
  const MOCK_START_DATE = new Date(2024, 6, 15); // This needs a proper way to find the last period start

  // Find days since last period start more reliably - needs proper history tracking
  // Placeholder logic:
  const periodStartDates = Object.keys(logs)
      .filter(d => logs[d]?.periodFlow && logs[d].periodFlow !== 'none')
      .map(d => parseISO(d))
      .sort((a, b) => b.getTime() - a.getTime()); // Sort descending

  let daysSinceStart: number | undefined = undefined;
  if (periodStartDates.length > 0) {
      // Find the most recent start date *before or on* the current date
      const lastPeriodStart = periodStartDates.find(start => start <= date);
      if (lastPeriodStart) {
          daysSinceStart = Math.floor((date.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      }
  } else {
    // Fallback if no logged period data
    daysSinceStart = Math.floor((date.getTime() - MOCK_START_DATE.getTime()) / (1000 * 60 * 60 * 24)) % MOCK_CYCLE_LENGTH;
  }


  if (daysSinceStart !== undefined) {
      // Simple fertile window prediction (days 10-16) - Adjust based on user's cycle length
      if (daysSinceStart >= 10 && daysSinceStart <= 16) {
        dayInfo.isFertile = true;
      }
      // Simple ovulation prediction (day 14) - Adjust based on user's cycle length
      if (daysSinceStart === 14) {
        dayInfo.isOvulation = true;
      }
       // Predict next period start roughly - More advanced: use average cycle length
      if (periodStartDates.length > 0 && MOCK_CYCLE_LENGTH > 0) {
          const lastStartDate = periodStartDates[0]; // Most recent start
          const predictedStartDate = new Date(lastStartDate);
          predictedStartDate.setDate(lastStartDate.getDate() + MOCK_CYCLE_LENGTH);
          // Check if 'date' falls within a few days before the predicted start
          const daysUntilPredicted = Math.floor((predictedStartDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilPredicted >= 0 && daysUntilPredicted <= 3 && !dayInfo.isPeriod) {
             dayInfo.isPredictedPeriod = true;
          }
      }
  }
  // --- End Prediction Placeholder ---

  return dayInfo;
};


export default function CalendarView() {
  const { logData, getLogsForMonth, isLoading, refreshData } = useCycleData();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date())); // Ensure normalized default
  const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfDay(new Date()));
  const [monthDayInfo, setMonthDayInfo] = React.useState<Record<string, DayInfo>>({});
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverAnchor, setPopoverAnchor] = React.useState<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!isLoading) {
        const monthLogs = getLogsForMonth(currentMonth); // Use context data directly
        const newMonthDayInfo: Record<string, DayInfo> = {};
        const tempDate = new Date(currentMonth);
        tempDate.setDate(1);
        const monthIndex = tempDate.getMonth();

        while (tempDate.getMonth() === monthIndex) {
            const day = startOfDay(new Date(tempDate));
            const dateString = format(day, 'yyyy-MM-dd');
            // Re-calculate day info using potentially updated logData from context
            newMonthDayInfo[dateString] = calculateDayInfo(day, logData);
            tempDate.setDate(tempDate.getDate() + 1);
        }
        setMonthDayInfo(newMonthDayInfo);
    }
    // Remove setIsLoading dependency if it's only from context
  }, [currentMonth, logData, getLogsForMonth, isLoading]); // Depend on logData from context

    // Refresh data when the component mounts initially or when requested
  React.useEffect(() => {
    refreshData();
  }, [refreshData]); // Ensure refreshData has stable identity


  const handleDayClick = (day: Date, modifiers: any, e: React.MouseEvent<HTMLButtonElement>) => {
    const normalizedDay = startOfDay(day);
    setSelectedDate(normalizedDay);
    setPopoverOpen(true);
    setPopoverAnchor(e.currentTarget);
  };


  const renderDayContent = (day: Date): React.ReactNode => {
    const normalizedDay = startOfDay(day);
    const dateString = format(normalizedDay, 'yyyy-MM-dd');
    const dayInfo = monthDayInfo[dateString];

    const isSelected = selectedDate && format(normalizedDay, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    const isToday = format(normalizedDay, 'yyyy-MM-dd') === format(startOfDay(new Date()), 'yyyy-MM-dd');


    // Visual Indicators - More distinct and modern
    let backgroundClass = '';
    let borderClass = 'border border-transparent'; // Default transparent border
    let textColorClass = isSelected ? 'text-accent-foreground' : 'text-foreground'; // Default to foreground
    let indicatorDotClass = '';
    let overlayIcon = null;

     // Period Styling: Gradient fill, stronger border
    if (dayInfo?.isPeriod) {
       const intensity = dayInfo.periodIntensity || 'medium';
       backgroundClass = intensity === 'light' ? 'bg-gradient-to-br from-primary/30 to-primary/10' :
                         intensity === 'medium' ? 'bg-gradient-to-br from-primary/50 to-primary/20' :
                         'bg-gradient-to-br from-primary/70 to-primary/40';
       if (!isSelected) textColorClass = 'text-primary-foreground'; // Ensure contrast on period days
       borderClass = 'border-2 border-primary/80';
       if (isSelected) borderClass = cn(borderClass, 'ring-2 ring-accent ring-offset-1 ring-offset-background'); // Ensure ring shows over border
    }
    // Fertile Window Styling: Subtle glow or background pattern
    else if (dayInfo?.isFertile && !dayInfo.isOvulation) {
         backgroundClass = 'bg-secondary/10'; // Very light background tint
         borderClass = 'border border-dashed border-secondary/40'; // Dashed border
         if (!isSelected) textColorClass = 'text-secondary-foreground/80';
    }
    // Predicted Period Styling: Subtle pattern or border
    else if (dayInfo?.isPredictedPeriod) {
         borderClass = 'border border-dashed border-primary/30'; // Fainter dashed border
         if (!isSelected) textColorClass = 'text-muted-foreground'; // Dimmed text
         indicatorDotClass = 'bg-primary/50'; // Dot indicator
    }

     // Today's Styling: Clear circle outline
     if (isToday && !isSelected) {
       borderClass = cn(borderClass !== 'border border-transparent' ? borderClass : '', 'border-2 border-ring'); // Add ring-like border
       textColorClass = cn(textColorClass, 'font-semibold');
    }

    // Ovulation Styling: Accent color highlight with icon
    if (dayInfo?.isOvulation) {
        backgroundClass = 'bg-accent/15';
        borderClass = 'border-2 border-accent/60';
        if (!isSelected) textColorClass = 'text-accent font-medium';
        overlayIcon = <Sparkles className={cn("absolute top-0.5 right-0.5 h-3 w-3 stroke-2", isSelected ? "text-accent-foreground" : "text-accent")} />;
    }

    // Logged Data Indicator: Checkmark icon
     if (dayInfo?.loggedData) {
        overlayIcon = overlayIcon ? overlayIcon : <CheckCircle className={cn("absolute bottom-0.5 left-0.5 h-3 w-3", isSelected ? "text-accent-foreground/70" : "text-muted-foreground/70")} aria-label="Data logged" />;
     }


    // Combine classes
    const dayClasses = cn(
      'relative w-full h-full flex items-center justify-center rounded-full transition-all duration-150 ease-in-out',
      backgroundClass,
      borderClass,
      textColorClass,
      isSelected ? 'bg-accent text-accent-foreground font-bold shadow-md ring-2 ring-accent ring-offset-1 ring-offset-background' : '',
      // Hover effect only for non-selected, non-period days
      !isSelected && !dayInfo?.isPeriod && 'hover:bg-muted/50 hover:border-border',
       // Ensure contrast if no specific color set
      !isSelected && !dayInfo?.isPeriod && !dayInfo?.isFertile && !dayInfo?.isPredictedPeriod && !dayInfo?.isOvulation && textColorClass === 'text-foreground' && 'text-foreground/80',
       // Today's non-selected, non-event styling
      isToday && !isSelected && !dayInfo?.isPeriod && !dayInfo?.isFertile && !dayInfo?.isPredictedPeriod && !dayInfo?.isOvulation && 'font-semibold',
    );


    return (
      <div className={dayClasses}>
        {format(normalizedDay, 'd')}
        {overlayIcon}
         {/* Dot indicator only if no icon is present */}
         {indicatorDotClass && !overlayIcon && !dayInfo?.isPeriod && !isSelected && (
             <span className={cn("absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full", indicatorDotClass)} />
         )}
      </div>
    );
  };


  // Dummy function for icon mapping
  const getSymptomIcon = (symptom: string) => {
      switch(symptom.toLowerCase()) { // Case-insensitive matching
          case 'cramps': return <Zap className="w-4 h-4 mr-1.5 text-yellow-500" />;
          case 'headache': return <CloudRain className="w-4 h-4 mr-1.5 text-blue-400" />;
          case 'bloating': return <Wind className="w-4 h-4 mr-1.5 text-purple-400" />; // Replace Wind if better icon found
          // Add more symptoms: Fatigue, Acne, Backache, Nausea etc.
          default: return <Info className="w-4 h-4 mr-1.5 text-gray-400" />; // Generic info icon
      }
  }
   const getMoodIcon = (mood: string) => {
       switch(mood.toLowerCase()) { // Case-insensitive matching
          case 'irritable': return <Smile className="w-4 h-4 mr-1.5 text-orange-500" />; // Needs specific mood icons
          case 'calm': return <Smile className="w-4 h-4 mr-1.5 text-green-500" />;
          case 'happy': return <Smile className="w-4 h-4 mr-1.5 text-yellow-400" />;
          case 'sad': return <Smile className="w-4 h-4 mr-1.5 text-blue-500" />;
          case 'anxious': return <Smile className="w-4 h-4 mr-1.5 text-purple-500" />;
          // Add other moods
          default: return <Smile className="w-4 h-4 mr-1.5 text-gray-400" />; // Generic smile
      }
  }

   const selectedDayInfo = selectedDate ? monthDayInfo[format(selectedDate, 'yyyy-MM-dd')] : null;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div ref={popoverAnchor as React.RefObject<HTMLDivElement>} className="rounded-lg border shadow-md overflow-hidden bg-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onMonthChange={(month) => setCurrentMonth(startOfDay(month))}
            className="p-0"
            classNames={{
              root: 'bg-card text-card-foreground rounded-lg', // Apply border radius here too
              caption: 'flex justify-center items-center h-14 border-b relative px-4',
              caption_label: 'text-lg font-semibold text-foreground', // Increased font weight
              nav: 'flex items-center absolute inset-y-0',
              nav_button: cn(
                buttonVariants({ variant: 'ghost' }),
                'h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full' // Make buttons round
              ),
              nav_button_previous: 'left-2',
              nav_button_next: 'right-2',
              table: 'w-full border-collapse mt-1', // Add margin top
              head_row: 'flex justify-around items-center h-10',
              head_cell: 'w-10 text-muted-foreground font-medium text-sm', // Make weekday names medium weight
              row: 'flex w-full mt-1.5 justify-around', // Increase row spacing
              cell: cn(
                'h-10 w-10 text-center text-sm p-0 relative',
                '[&:has([aria-selected])]:bg-transparent',
                'focus-within:relative focus-within:z-20'
              ),
              day: 'h-10 w-10 p-0 font-normal rounded-full',
              day_selected: ' ', // Handled in DayContent
              day_today: ' ', // Handled in DayContent
              day_outside: 'text-muted-foreground/30 opacity-50 aria-selected:bg-transparent aria-selected:text-muted-foreground/30',
              day_disabled: 'text-muted-foreground/50 opacity-50 cursor-not-allowed',
              day_hidden: 'invisible',
            }}
            components={{
              DayContent: ({ date, displayMonth }) => {
                  if (displayMonth.getMonth() !== date.getMonth()) {
                    return <div className="h-10 w-10"></div>;
                  }
                  return (
                    <button
                        type="button"
                        className="h-10 w-10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full" // Ensure focus ring applies
                        onClick={(e) => handleDayClick(date, {}, e)}
                        aria-label={`Details for ${format(date, 'PPP')}`}
                    >
                        {isLoading ? <Skeleton className="h-8 w-8 rounded-full" /> : renderDayContent(date)}
                    </button>
                  );
              },
            }}
            showOutsideDays={true}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4 border shadow-xl rounded-lg bg-popover" // Use popover background
        align="center"
        sideOffset={8} // Increased offset
        // Removed anchor prop as it might not be standard or needed if trigger positioning is sufficient
        alignOffset={0}
      >
         {selectedDayInfo ? (
          <div className="space-y-3 max-w-xs text-popover-foreground"> {/* Ensure text color matches popover */}
            <h4 className="font-semibold text-center text-lg">{format(selectedDayInfo.date, 'PPP')}</h4>
            <hr className="border-border/50"/> {/* Use slightly lighter border */}
            <div className="space-y-2 text-sm"> {/* Compact spacing */}
                {selectedDayInfo.isPeriod && (
                <div className="flex items-center text-primary font-medium p-1.5 bg-primary/10 rounded-md shadow-sm">
                    <Droplet className="w-4 h-4 mr-2 flex-shrink-0" /> Period ({selectedDayInfo.periodIntensity ? selectedDayInfo.periodIntensity.charAt(0).toUpperCase() + selectedDayInfo.periodIntensity.slice(1) : 'Medium'})
                </div>
                )}
                {selectedDayInfo.isFertile && !selectedDayInfo.isOvulation && (
                <div className="flex items-center text-secondary-foreground p-1.5 bg-secondary/10 rounded-md shadow-sm">
                    <HeartPulse className="w-4 h-4 mr-2 flex-shrink-0" /> Fertile Window
                </div>
                )}
                {selectedDayInfo.isOvulation && (
                <div className="flex items-center text-accent font-medium p-1.5 bg-accent/10 rounded-md shadow-sm">
                    <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" /> Predicted Ovulation
                </div>
                )}
                 {selectedDayInfo.isPredictedPeriod && !selectedDayInfo.isPeriod && (
                    <div className="flex items-center text-primary/80 italic p-1.5 bg-primary/5 rounded-md">
                        <Droplet className="w-4 h-4 mr-2 flex-shrink-0 opacity-50" /> Predicted Period Start
                    </div>
                )}
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
                {selectedDayInfo.loggedData?.notes && (
                <div className="pt-1">
                     <span className="font-medium text-popover-foreground/90 block mb-1 text-xs uppercase tracking-wider">Notes:</span>
                     <p className="text-xs bg-muted/50 p-2 rounded shadow-sm line-clamp-3">{selectedDayInfo.loggedData.notes}</p>
                </div>
                )}
            </div>
            {(!selectedDayInfo.loggedData && !selectedDayInfo.isPeriod && !selectedDayInfo.isFertile && !selectedDayInfo.isPredictedPeriod && !selectedDayInfo.isOvulation) && (
                 <p className="text-sm text-muted-foreground text-center pt-2 italic">No data logged or predicted.</p>
             )}
            <Button variant="default" size="sm" className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full shadow-md" asChild>
               <Link href={`/log?date=${format(selectedDayInfo.date, 'yyyy-MM-dd')}`}>
                {selectedDayInfo.loggedData ? 'Edit Log' : 'Add Log'}
              </Link>
            </Button>
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

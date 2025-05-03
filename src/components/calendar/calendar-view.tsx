'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';
import { Droplet, Sparkles, HeartPulse, Smile, CloudRain, Zap, Footprints, StickyNote, CircleDot } from 'lucide-react'; // Example icons

// Mock data structure - replace with actual data fetching/state management
interface LoggedData {
  period?: 'light' | 'medium' | 'heavy';
  symptoms?: string[];
  mood?: string;
  notes?: boolean;
  // Add other tracked items
}

interface DayData {
  date: Date;
  isPeriod?: boolean;
  periodIntensity?: 'light' | 'medium' | 'heavy';
  isPredictedPeriod?: boolean;
  isFertile?: boolean;
  isOvulation?: boolean;
  loggedData?: LoggedData;
}

// Mock function to get data for a month - replace with real logic
const getMonthData = (month: Date): DayData[] => {
  // In a real app, fetch this from local storage based on the displayed month
  const MOCK_START_DATE = new Date(2024, 6, 15); // Example July 15th
  const MOCK_CYCLE_LENGTH = 28;
  const MOCK_PERIOD_LENGTH = 5;

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthData: DayData[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(month.getFullYear(), month.getMonth(), i);
    const dayData: DayData = { date };

    // Basic prediction logic (very simplified)
    const daysSinceStart = Math.floor((date.getTime() - MOCK_START_DATE.getTime()) / (1000 * 60 * 60 * 24)) % MOCK_CYCLE_LENGTH;

    if (daysSinceStart >= 0 && daysSinceStart < MOCK_PERIOD_LENGTH) {
      dayData.isPeriod = true;
      dayData.periodIntensity = 'medium'; // Mock intensity
    } else if (daysSinceStart >= MOCK_CYCLE_LENGTH - 3 && daysSinceStart < MOCK_CYCLE_LENGTH) {
      // Predict next period start roughly
      dayData.isPredictedPeriod = true;
    }

    // Simple fertile window prediction (days 10-16)
    if (daysSinceStart >= 10 && daysSinceStart <= 16) {
      dayData.isFertile = true;
    }
    // Simple ovulation prediction (day 14)
    if (daysSinceStart === 14) {
      dayData.isOvulation = true;
    }

    // Mock logged data for some days
    if (i === 15 || i === 16) {
        dayData.loggedData = { period: 'medium', symptoms: ['cramp', 'headache'], mood: 'irritable' };
    }
    if (i === 20) {
        dayData.loggedData = { notes: true, mood: 'calm' };
    }


    monthData.push(dayData);
  }
  return monthData;
};

export default function CalendarView() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [monthData, setMonthData] = React.useState<DayData[]>([]);
  const [selectedDayData, setSelectedDayData] = React.useState<DayData | null>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    setMonthData(getMonthData(currentMonth));
    // In a real app, dependencies would include user settings, etc.
  }, [currentMonth]);


  const handleDayClick = (day: Date) => {
    setDate(day);
    const dataForDay = monthData.find(d => d.date.toDateString() === day.toDateString());
    setSelectedDayData(dataForDay || { date: day }); // Ensure selectedDayData is always set
    setPopoverOpen(true);
  };

  const renderDayContent = (day: Date): React.ReactNode => {
    const dayData = monthData.find(d => d.date.toDateString() === day.toDateString());
    const modifiers: string[] = [];

    if (dayData?.isPeriod) modifiers.push('bg-primary/20');
    if (dayData?.isPredictedPeriod) modifiers.push('border border-dashed border-primary');
    if (dayData?.isFertile) modifiers.push('bg-secondary/30');
    if (dayData?.isOvulation) modifiers.push('relative'); // For positioning the icon

    // Use a Set to avoid duplicate modifier classes
    const dayClasses = new Set<string>();

    if (dayData?.isPeriod) dayClasses.add('bg-primary/20 rounded-full');
    else if (dayData?.isPredictedPeriod) dayClasses.add('border border-primary border-dashed rounded-full');

    if (dayData?.isFertile) dayClasses.add('bg-secondary/30 rounded-md'); // Different shape/style for fertile days

    // Apply classes
    const cellClassNames = Array.from(dayClasses).join(' ');

    return (
      <div className={`relative w-full h-full flex items-center justify-center ${cellClassNames}`}>
        {format(day, 'd')}
        {dayData?.isOvulation && (
            <Sparkles className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-accent" strokeWidth={3} />
        )}
        {dayData?.loggedData && (
          <CircleDot className="absolute bottom-0.5 right-0.5 h-2 w-2 text-muted-foreground fill-current" />
        )}
      </div>
    );
  };


  // Dummy function for icon mapping
  const getSymptomIcon = (symptom: string) => {
      switch(symptom) {
          case 'cramp': return <Zap className="w-4 h-4 mr-1 text-yellow-500" />;
          case 'headache': return <CloudRain className="w-4 h-4 mr-1 text-blue-400" />; // Example, needs better icon
          // Add other symptoms
          default: return null;
      }
  }
   const getMoodIcon = (mood: string) => {
      switch(mood) {
          case 'irritable': return <Smile className="w-4 h-4 mr-1 text-orange-500" />; // Replace with actual mood icons later
          case 'calm': return <Smile className="w-4 h-4 mr-1 text-green-500" />;
          // Add other moods
          default: return null;
      }
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div> {/* Wrap Calendar in a div for PopoverTrigger */}
          <Calendar
            mode="single"
            selected={date}
            // onSelect={setDate} - We handle selection via onDayClick
            onDayClick={handleDayClick}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-md border shadow p-0"
            classNames={{
              day_selected: 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-full',
              day_today: 'bg-secondary text-secondary-foreground rounded-full',
              day: 'h-10 w-10 rounded-full', // Make days circular
              day_outside: 'text-muted-foreground opacity-50',
              head_cell: 'text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]',
              cell: 'h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full focus-within:relative focus-within:z-20', // Adjust cell padding/sizing
              row: 'flex w-full mt-2 justify-center',
              caption_label: 'text-sm font-medium',
              nav_button: 'h-7 w-7',
            }}
            components={{
              DayContent: ({ date, displayMonth }) => {
                  if (displayMonth.getMonth() !== date.getMonth()) {
                     // Render placeholder for outside days to maintain grid structure
                    return <div className="h-10 w-10"></div>;
                  }
                  return (
                    <div className="h-10 w-10 flex items-center justify-center">
                      {renderDayContent(date)}
                    </div>
                  );
              },
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center">
         {selectedDayData ? (
          <div className="space-y-2">
            <h4 className="font-semibold">{format(selectedDayData.date, 'PPP')}</h4>
            {selectedDayData.isPeriod && (
              <div className="flex items-center text-sm text-primary">
                <Droplet className="w-4 h-4 mr-1" /> Period ({selectedDayData.periodIntensity || 'Medium'})
              </div>
            )}
             {selectedDayData.isFertile && !selectedDayData.isOvulation && (
              <div className="flex items-center text-sm text-secondary-foreground">
                <HeartPulse className="w-4 h-4 mr-1" /> Fertile Window
              </div>
            )}
            {selectedDayData.isOvulation && (
              <div className="flex items-center text-sm text-accent">
                <Sparkles className="w-4 h-4 mr-1" /> Predicted Ovulation
              </div>
            )}
            {selectedDayData.loggedData?.symptoms && selectedDayData.loggedData.symptoms.length > 0 && (
              <div className="flex items-center text-sm text-muted-foreground flex-wrap">
                <span className="font-medium mr-1">Symptoms:</span>
                {selectedDayData.loggedData.symptoms.map(symptom => getSymptomIcon(symptom))}
              </div>
            )}
             {selectedDayData.loggedData?.mood && (
              <div className="flex items-center text-sm text-muted-foreground">
                 <span className="font-medium mr-1">Mood:</span> {getMoodIcon(selectedDayData.loggedData.mood)}
              </div>
            )}
             {selectedDayData.loggedData?.notes && (
              <div className="flex items-center text-sm text-muted-foreground">
                 <StickyNote className="w-4 h-4 mr-1" /> Notes logged
              </div>
            )}
            {!selectedDayData.loggedData && !selectedDayData.isPeriod && !selectedDayData.isFertile && !selectedDayData.isPredictedPeriod && (
                 <p className="text-sm text-muted-foreground">No data logged for this day.</p>
             )}
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
               <Link href={`/log?date=${format(selectedDayData.date, 'yyyy-MM-dd')}`}>
                {selectedDayData.loggedData ? 'Edit Data' : 'Add Data'}
              </Link>
            </Button>
          </div>
        ) : (
          <p>Select a day to see details.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

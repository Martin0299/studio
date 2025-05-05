// components/log/log-entry-form.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription // Import FormDescription
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from "@/components/ui/label"; // Ensure Label is imported
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Import Input
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from '@/components/ui/switch';
// Corrected icon imports and added new mood icons
import { Droplet, Zap, CloudRain, Wind, StickyNote, ShieldCheck, Ban, FlagOff, HeartPulse, SmilePlus, Minus, Plus, Activity, Snowflake, ThermometerSun, Flame, Smile, Frown, Meh, Annoyed, Anchor } from 'lucide-react'; // Changed thermometerSun to ThermometerSun and flame to Flame
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context and LogData type
import { useRouter } from 'next/navigation'; // Import useRouter
import { cn } from '@/lib/utils'; // Import cn utility

// Define symptom and mood options with icons
const symptomOptions = [
  { id: 'cramps', label: 'Cramps', icon: Zap },
  { id: 'headache', label: 'Headache', icon: CloudRain },
  { id: 'bloating', label: 'Bloating', icon: Wind },
  { id: 'fatigue', label: 'Fatigue', icon: Activity },
  { id: 'acne', label: 'Acne', icon: Snowflake },
  { id: 'backache', label: 'Backache', icon: Flame },
  { id: 'nausea', label: 'Nausea', icon: ThermometerSun },
];

const moodOptions = [
  { id: 'happy', label: 'Happy', icon: Smile },
  { id: 'sad', label: 'Sad', icon: Frown },
  { id: 'anxious', label: 'Anxious', icon: Meh },
  { id: 'irritable', label: 'Irritable', icon: Annoyed },
  { id: 'calm', label: 'Calm', icon: Anchor },
  // Add more moods
];

const flowOptions = [
  { id: 'light', label: 'Light', iconCount: 1 },
  { id: 'medium', label: 'Medium', iconCount: 2 },
  { id: 'heavy', label: 'Heavy', iconCount: 3 },
];

// Zod schema for form validation
const logEntrySchema = z.object({
  date: z.date(), // Keep date object for internal form state if needed, but we save string
  periodFlow: z.enum(['none', 'light', 'medium', 'heavy']).default('none'),
  isPeriodEnd: z.boolean().default(false), // Added period end field
  symptoms: z.array(z.string()).default([]),
  mood: z.string().optional().default(undefined), // Ensure optional fields default to undefined for consistency
  sexualActivityCount: z.number().min(0).optional().default(0), // Use number for count
  protectionUsed: z.boolean().optional().default(undefined), // Make optional, handled conditionally
  orgasm: z.boolean().optional().default(undefined), // Whether orgasm occurred
  notes: z.string().optional().default(''),
}).refine(data => (data.sexualActivityCount ?? 0) > 0 ? data.protectionUsed !== undefined : true, {
    message: "Please specify if protection was used.",
    path: ["protectionUsed"], // Path of the error
});


type LogEntryFormValues = z.infer<typeof logEntrySchema>;

interface LogEntryFormProps {
  selectedDate: Date; // Receive Date object
}

export default function LogEntryForm({ selectedDate }: LogEntryFormProps) {
  const { toast } = useToast();
  const { addOrUpdateLog, getLogForDate, isLoading } = useCycleData(); // Use context
  const router = useRouter(); // Get router instance

  // Fetch existing data for the selected date when the component mounts or date changes
  const existingLog = React.useMemo(() => getLogForDate(selectedDate), [selectedDate, getLogForDate]);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      date: selectedDate,
      periodFlow: existingLog?.periodFlow ?? 'none',
      isPeriodEnd: existingLog?.isPeriodEnd ?? false, // Initialize period end
      symptoms: existingLog?.symptoms ?? [],
      mood: existingLog?.mood ?? undefined,
      sexualActivityCount: existingLog?.sexualActivityCount ?? 0,
      // Conditionally set protectionUsed/orgasm default ONLY if activity occurred
      protectionUsed: (existingLog?.sexualActivityCount ?? 0) > 0 ? (existingLog?.protectionUsed ?? false) : undefined,
      orgasm: (existingLog?.sexualActivityCount ?? 0) > 0 ? (existingLog?.orgasm ?? false) : undefined,
      notes: existingLog?.notes ?? '',
    },
    mode: 'onChange', // Validate on change
  });

 React.useEffect(() => {
    // Reset form with new date and potentially fetched data if selectedDate prop changes
    const logForDate = getLogForDate(selectedDate);
    const activityCount = logForDate?.sexualActivityCount ?? 0;
    form.reset({
      date: selectedDate,
      periodFlow: logForDate?.periodFlow ?? 'none',
      isPeriodEnd: logForDate?.isPeriodEnd ?? false, // Reset period end
      symptoms: logForDate?.symptoms ?? [],
      mood: logForDate?.mood ?? undefined,
      sexualActivityCount: activityCount,
      protectionUsed: activityCount > 0 ? (logForDate?.protectionUsed ?? false) : undefined,
      orgasm: activityCount > 0 ? (logForDate?.orgasm ?? false) : undefined,
      notes: logForDate?.notes ?? '',
    });
  }, [selectedDate, getLogForDate, form]); // Re-run when selectedDate changes or getLogForDate (from context) updates


  function onSubmit(data: LogEntryFormValues) {
    // Extract data excluding the 'date' object (we use selectedDate)
    const { date, ...logDataToSave } = data;
    const activityOccurred = (logDataToSave.sexualActivityCount ?? 0) > 0;

    // Ensure protectionUsed and orgasm are only saved if activity occurred
    // Allow saving isPeriodEnd=true even if periodFlow is 'none'
    const finalLogData: Omit<LogData, 'date'> = {
        ...logDataToSave,
        protectionUsed: activityOccurred ? logDataToSave.protectionUsed ?? false : undefined,
        orgasm: activityOccurred ? logDataToSave.orgasm ?? false : undefined,
        isPeriodEnd: logDataToSave.isPeriodEnd, // Save the value directly from the form
        sexualActivityCount: Math.max(0, logDataToSave.sexualActivityCount ?? 0),
    };


    addOrUpdateLog(selectedDate, finalLogData); // Use context function to save
    toast({
      title: 'Log Saved',
      description: `Your entry for ${format(selectedDate, 'PPP')} has been updated.`,
    });
     // Redirect back to the calendar page after saving
    router.push('/calendar');
  }

  // Watch fields to manage interactions
  const watchSexualActivityCount = form.watch('sexualActivityCount');
  const watchPeriodFlow = form.watch('periodFlow'); // Watch periodFlow
  const watchIsPeriodEnd = form.watch('isPeriodEnd'); // Watch isPeriodEnd

   // Effect to manage conditional fields based on activity count
   React.useEffect(() => {
       const activityOccurred = (watchSexualActivityCount ?? 0) > 0;
       if (!activityOccurred) {
           form.setValue('protectionUsed', undefined, { shouldValidate: false });
           form.setValue('orgasm', undefined, { shouldValidate: false });
       } else {
           // If activity becomes > 0, ensure protectionUsed has a default value (e.g., false) if it was previously undefined.
           if (form.getValues('protectionUsed') === undefined) {
               form.setValue('protectionUsed', false, { shouldValidate: true });
           }
            if (form.getValues('orgasm') === undefined) {
                 form.setValue('orgasm', false, { shouldValidate: true });
           }
       }
   }, [watchSexualActivityCount, form]);

   // Effect to manage isPeriodEnd based on periodFlow
   React.useEffect(() => {
        // Logic removed as per user request: Allow marking end even if flow is 'none'
   }, [watchPeriodFlow, watchIsPeriodEnd, form]);


   if (isLoading) {
     // Optional: Show a loading state while context is loading initial data
     return <div className="text-center p-6">Loading log data...</div>;
   }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        <h2 className="text-xl font-semibold text-center mb-4">
          Log for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>

        {/* Menstruation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Droplet className="mr-2 h-5 w-5 text-primary" />Menstruation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4"> {/* Added space-y-4 */}
            <FormField
              control={form.control}
              name="periodFlow"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Flow Intensity</FormLabel>
                  <FormControl>
                     <ToggleGroup
                        type="single"
                        variant="outline"
                        value={field.value ?? 'none'} // Ensure value is never undefined for ToggleGroup
                        onValueChange={(value) => {
                            // If the clicked value is the same as the current value, it means deselection.
                            // Treat deselection as setting to 'none'.
                            // Otherwise, set to the new value.
                            const newValue = value === field.value ? 'none' : (value || 'none');
                            field.onChange(newValue as 'none' | 'light' | 'medium' | 'heavy');
                        }}
                        className="justify-start flex-wrap gap-2" // Added gap
                        >
                         <ToggleGroupItem value="none" aria-label="No flow" className="flex flex-col h-auto p-2 border rounded-lg data-[state=on]:bg-secondary data-[state=on]:border-muted-foreground data-[state=on]:text-muted-foreground">
                            <Ban className="h-5 w-5 mb-1"/> None
                        </ToggleGroupItem>
                        {flowOptions.map((option) => (
                            <ToggleGroupItem key={option.id} value={option.id} aria-label={option.label} className="flex flex-col h-auto p-2 border rounded-lg data-[state=on]:bg-primary/10 data-[state=on]:border-primary data-[state=on]:text-primary">
                               <div className="flex mb-1">
                                    {Array.from({ length: option.iconCount }).map((_, i) => (
                                         <Droplet key={i} className="h-4 w-4 fill-current" />
                                    ))}
                                </div>
                                {option.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* Period End Switch */}
             <FormField
                control={form.control}
                name="isPeriodEnd"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                                <FlagOff className="mr-2 h-5 w-5 text-red-600"/> Mark as Last Day of Period
                            </FormLabel>
                            <FormDescription className="text-xs">
                                Marks this day as the end of your period flow.
                            </FormDescription>
                             <FormMessage className="text-xs" />
                        </div>
                        <FormControl>
                           <Switch
                                id={field.name} // Add id for accessibility if needed
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Mark as Last Day of Period"
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
          </CardContent>
        </Card>

        {/* Symptoms Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="symptoms"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-3 gap-3">
                    {symptomOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="symptoms"
                        render={({ field }) => {
                          const Icon = item.icon;
                          const isChecked = field.value?.includes(item.id) ?? false;
                          return (
                            <FormItem
                              className={cn(
                                "flex flex-col items-center space-y-1 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                                isChecked && "bg-accent/10 border-accent text-accent"
                              )}
                              onClick={() => { // Keep onClick for the whole item for better UX
                                  const currentSymptoms = field.value || [];
                                  let newSymptoms;
                                  if (!isChecked) {
                                    newSymptoms = [...currentSymptoms, item.id];
                                  } else {
                                    newSymptoms = currentSymptoms.filter(
                                      (value) => value !== item.id
                                    );
                                  }
                                  field.onChange(newSymptoms);
                              }}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checkedState) => {
                                    // Let FormItem onClick handle the logic change
                                    // This avoids potential double state updates
                                  }}
                                  className="sr-only" // Keep it visually hidden but accessible
                                  aria-hidden="true"
                                  tabIndex={-1}
                                />
                              </FormControl>
                              <Label htmlFor={`symptom-${item.id}`} className="flex flex-col items-center w-full cursor-pointer">
                                <Icon className={cn("h-6 w-6 mb-1", isChecked ? "text-accent" : "text-muted-foreground")} />
                                <span className="font-normal text-sm text-center select-none">{item.label}</span>
                              </Label>
                              {/* Assign a unique ID to the checkbox itself for the label */}
                              <input type="checkbox" id={`symptom-${item.id}`} checked={isChecked} readOnly className="sr-only" />
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>


        {/* Mood Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormControl>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={field.value || ''} // Handle undefined value for ToggleGroup
                            onValueChange={(value) => {
                                // If the same value is clicked again, it returns '', treat as undefined
                                field.onChange(value || undefined);
                            }}
                            className="grid grid-cols-3 gap-3" // Slightly reduced gap
                        >
                            {moodOptions.map((item) => {
                                const Icon = item.icon;
                                const isSelected = field.value === item.id;
                                return (
                                     <ToggleGroupItem
                                        key={item.id}
                                        value={item.id}
                                        aria-label={item.label}
                                        className="flex flex-col items-center space-y-1 h-auto p-3 border rounded-lg data-[state=on]:bg-accent/10 data-[state=on]:border-accent data-[state=on]:text-accent"
                                    >
                                        <Icon className={cn("h-6 w-6 mb-1", isSelected ? "text-accent" : "text-muted-foreground")} />
                                        <span className="font-normal text-sm text-center">{item.label}</span>
                                    </ToggleGroupItem>
                                );
                            })}
                        </ToggleGroup>
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

         {/* Sexual Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-red-500" />Sexual Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
                control={form.control}
                name="sexualActivityCount"
                render={({ field }) => (
                  <FormItem className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-base">
                            Times / Count
                        </FormLabel>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => field.onChange(Math.max(0, (field.value ?? 0) - 1))}
                                disabled={(field.value ?? 0) === 0} // Explicit check for 0
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-medium w-8 text-center">
                                {field.value ?? 0} {/* Display 0 if undefined */}
                            </span>
                             <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => field.onChange((field.value ?? 0) + 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <FormDescription className="text-xs pt-2">
                        Log the number of times sexual activity occurred today.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Conditionally render protectionUsed and orgasm based on count */}
              {(watchSexualActivityCount ?? 0) > 0 && (
                 <>
                 <FormField
                    control={form.control}
                    name="protectionUsed"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                                <ShieldCheck className="mr-2 h-5 w-5 text-green-600"/> Protection Used
                            </FormLabel>
                             <FormMessage className="text-xs" />
                        </div>
                        <FormControl>
                            <Switch
                                id={field.name + "-protection"} // Ensure unique ID
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                aria-label="Protection Used"
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="orgasm"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                                <SmilePlus className="mr-2 h-5 w-5 text-pink-500"/> Orgasm Reached
                            </FormLabel>
                             <FormMessage className="text-xs" />
                        </div>
                        <FormControl>
                            <Switch
                                id={field.name + "-orgasm"} // Ensure unique ID
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                                aria-label="Orgasm Reached"
                            />
                        </FormControl>
                    </FormItem>
                    )}
                />
                </>
              )}
          </CardContent>
        </Card>


        {/* Notes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><StickyNote className="mr-2 h-5 w-5 text-muted-foreground"/>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="sr-only">Notes</FormLabel>{/* Screen reader label */}
                  <FormControl>
                    <Textarea
                      placeholder="Add any personal notes for the day (optional)..."
                      className="resize-none min-h-[100px]" // Ensure enough height
                      value={field.value ?? ''} // Handle potential null/undefined
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Add placeholders for Vaginal Discharge, Custom Fields */}

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Save Log Entry
        </Button>
      </form>
    </Form>
  );
}

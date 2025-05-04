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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Import Input
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from '@/components/ui/switch';
import { Droplet, Zap, CloudRain, Wind, Smile, StickyNote, ShieldCheck, Ban, FlagOff, HeartPulse, SmilePlus, Minus, Plus } from 'lucide-react'; // Added icons
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context and LogData type
import { useRouter } from 'next/navigation'; // Import useRouter

// Define symptom and mood options with icons
const symptomOptions = [
  { id: 'cramp', label: 'Cramps', icon: Zap },
  { id: 'headache', label: 'Headache', icon: CloudRain },
  { id: 'bloating', label: 'Bloating', icon: Wind },
  // Add more symptoms: Fatigue, Acne, Backache, Nausea etc.
];

const moodOptions = [
  { id: 'happy', label: 'Happy', icon: Smile }, // Replace with specific mood icons later
  { id: 'sad', label: 'Sad', icon: Smile },
  { id: 'anxious', label: 'Anxious', icon: Smile },
  { id: 'irritable', label: 'Irritable', icon: Smile },
  { id: 'calm', label: 'Calm', icon: Smile },
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
}).refine(data => !(data.isPeriodEnd && data.periodFlow === 'none'), {
    message: "Cannot mark end of period without selecting a flow intensity.",
    path: ["isPeriodEnd"], // Path of the error
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
    // Ensure isPeriodEnd is false if periodFlow is 'none'
    const finalLogData: Omit<LogData, 'date'> = {
        ...logDataToSave,
        protectionUsed: activityOccurred ? logDataToSave.protectionUsed ?? false : undefined,
        orgasm: activityOccurred ? logDataToSave.orgasm ?? false : undefined,
        isPeriodEnd: logDataToSave.periodFlow !== 'none' ? logDataToSave.isPeriodEnd : false,
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

  // Watch sexualActivityCount field to conditionally render protectionUsed/orgasm
  const watchSexualActivityCount = form.watch('sexualActivityCount');
  const watchPeriodFlow = form.watch('periodFlow');
  const watchIsPeriodEnd = form.watch('isPeriodEnd');

  // Effect to manage conditional fields based on activity count
  React.useEffect(() => {
      const activityOccurred = (watchSexualActivityCount ?? 0) > 0;
      if (!activityOccurred) {
          // If count is 0, reset protectionUsed and orgasm
          form.setValue('protectionUsed', undefined, { shouldValidate: true });
          form.setValue('orgasm', undefined, { shouldValidate: true });
      } else {
          // If count > 0 and fields were undefined, set to default false
           if (form.getValues('protectionUsed') === undefined) {
               form.setValue('protectionUsed', false, { shouldValidate: true });
           }
           if (form.getValues('orgasm') === undefined) {
                form.setValue('orgasm', false, { shouldValidate: true });
           }
      }
  }, [watchSexualActivityCount, form]);


    // If period flow is set to 'none', ensure 'isPeriodEnd' is false
    React.useEffect(() => {
        if (watchPeriodFlow === 'none' && watchIsPeriodEnd) {
            form.setValue('isPeriodEnd', false, { shouldValidate: true });
        }
    }, [watchPeriodFlow, watchIsPeriodEnd, form]);

     // If 'isPeriodEnd' is toggled on, but flow is 'none', set flow to 'light' (or last known?)
    React.useEffect(() => {
        if (watchIsPeriodEnd && watchPeriodFlow === 'none') {
            form.setValue('periodFlow', 'light', { shouldValidate: true }); // Default to light if ending period with no flow selected
            toast({
                title: "Flow Updated",
                description: "Period flow set to 'Light' as you marked this as the end day.",
                variant: "default"
            });
        }
    }, [watchIsPeriodEnd, watchPeriodFlow, form, toast]);


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
                        value={field.value === 'none' ? '' : field.value} // Handle 'none' case for ToggleGroup
                        onValueChange={(value) => {
                            // If the same value is clicked again, it returns '', treat as 'none'
                            const newValue = value || 'none';
                            field.onChange(newValue as 'none' | 'light' | 'medium' | 'heavy');
                        }}
                        className="justify-start flex-wrap gap-2" // Added gap
                        >
                         <ToggleGroupItem value="" aria-label="No flow" className="flex flex-col h-auto p-2 border rounded-lg data-[state=on]:bg-secondary data-[state=on]:border-primary data-[state=on]:text-primary">
                            <Ban className="h-5 w-5 mb-1"/> None
                        </ToggleGroupItem>
                        {flowOptions.map((option) => (
                            <ToggleGroupItem key={option.id} value={option.id} aria-label={option.label} className="flex flex-col h-auto p-2 border rounded-lg data-[state=on]:bg-primary/10 data-[state=on]:border-primary data-[state=on]:text-primary">
                               <div className="flex mb-1">
                                    {Array.from({ length: option.iconCount }).map((_, i) => (
                                         <Droplet key={i} className="h-4 w-4 fill-current" /> // Removed text-primary, relies on parent state
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
                        <FormMessage className="text-xs" />
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={watchPeriodFlow === 'none' && !field.value} // Disable if flow is none unless it's already checked (to allow unchecking)
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
                   <div className="grid grid-cols-3 gap-3"> {/* Slightly reduced gap */}
                    {symptomOptions.map((item) => {
                      const Icon = item.icon;
                       return (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="symptoms"
                          render={({ field }) => {
                            const isChecked = field.value?.includes(item.id);
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-col items-center space-y-1 border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer data-[state=checked]:bg-accent/10 data-[state=checked]:border-accent data-[state=checked]:text-accent"
                                data-state={isChecked ? "checked" : "unchecked"}
                                onClick={() => {
                                   const currentSymptoms = field.value || [];
                                   if (isChecked) {
                                        field.onChange(currentSymptoms.filter((value) => value !== item.id));
                                   } else {
                                        field.onChange([...currentSymptoms, item.id]);
                                   }
                                }}
                              >
                                <FormControl>
                                   {/* Hidden checkbox for form state */}
                                    <Checkbox
                                        checked={isChecked}
                                        // onCheckedChange is handled by the FormItem onClick
                                        className="sr-only" // Hide the actual checkbox
                                        tabIndex={-1} // Prevent tabbing to hidden checkbox
                                        aria-hidden="true"
                                    />
                                </FormControl>
                                <Icon className={`h-6 w-6 mb-1 ${isChecked ? 'text-accent' : 'text-muted-foreground'}`} />
                                <FormLabel className="font-normal text-sm text-center cursor-pointer">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )
                    })}
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
                                        <Icon className={`h-6 w-6 mb-1 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
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
                            <FormMessage className="text-xs" /> {/* Show validation message here */}
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value ?? false} // Handle potential undefined state
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
                            checked={field.value ?? false} // Handle potential undefined state
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

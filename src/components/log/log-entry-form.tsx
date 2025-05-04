'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from '@/components/ui/switch';
import { Droplet, Zap, CloudRain, Wind, Smile, StickyNote, ShieldCheck, Ban } from 'lucide-react'; // Example icons
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
  symptoms: z.array(z.string()).default([]),
  mood: z.string().optional().default(undefined), // Ensure optional fields default to undefined for consistency
  sexualActivity: z.boolean().default(false),
  protectionUsed: z.boolean().optional().default(undefined), // Make optional, handled conditionally
  notes: z.string().optional().default(''),
}).refine(data => data.sexualActivity ? data.protectionUsed !== undefined : true, {
    message: "Please specify if protection was used during sexual activity.", // Example validation
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
      symptoms: existingLog?.symptoms ?? [],
      mood: existingLog?.mood ?? undefined,
      sexualActivity: existingLog?.sexualActivity ?? false,
      // Conditionally set protectionUsed default ONLY if sexualActivity was true
      protectionUsed: existingLog?.sexualActivity ? (existingLog?.protectionUsed ?? false) : undefined,
      notes: existingLog?.notes ?? '',
    },
    mode: 'onChange', // Validate on change
  });

 React.useEffect(() => {
    // Reset form with new date and potentially fetched data if selectedDate prop changes
    const logForDate = getLogForDate(selectedDate);
    form.reset({
      date: selectedDate,
      periodFlow: logForDate?.periodFlow ?? 'none',
      symptoms: logForDate?.symptoms ?? [],
      mood: logForDate?.mood ?? undefined,
      sexualActivity: logForDate?.sexualActivity ?? false,
      protectionUsed: logForDate?.sexualActivity ? (logForDate?.protectionUsed ?? false) : undefined,
      notes: logForDate?.notes ?? '',
    });
  }, [selectedDate, getLogForDate, form]); // Re-run when selectedDate changes or getLogForDate (from context) updates


  function onSubmit(data: LogEntryFormValues) {
    // Extract data excluding the 'date' object (we use selectedDate)
    const { date, ...logDataToSave } = data;

     // Ensure protectionUsed is only saved if sexualActivity is true
    const finalLogData: Omit<LogData, 'date'> = {
        ...logDataToSave,
        protectionUsed: logDataToSave.sexualActivity ? logDataToSave.protectionUsed ?? false : undefined,
    };


    addOrUpdateLog(selectedDate, finalLogData); // Use context function to save
    toast({
      title: 'Log Saved',
      description: `Your entry for ${format(selectedDate, 'PPP')} has been updated.`,
    });
     // Redirect back to the calendar page after saving
    router.push('/calendar');
  }

  // Watch sexualActivity field to conditionally render protectionUsed
  const watchSexualActivity = form.watch('sexualActivity');

  React.useEffect(() => {
      // If sexual activity is toggled off, reset protectionUsed field
      if (!watchSexualActivity) {
          form.setValue('protectionUsed', undefined, { shouldValidate: true });
      } else if (watchSexualActivity && form.getValues('protectionUsed') === undefined){
           // If toggled on and it was undefined, set to default false
           form.setValue('protectionUsed', false, { shouldValidate: true });
      }
  }, [watchSexualActivity, form]);


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
          <CardContent>
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
            <CardTitle className="text-lg">Sexual Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
                control={form.control}
                name="sexualActivity"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Intercourse / Activity Logged
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* Conditionally render protectionUsed based on watched value */}
              {watchSexualActivity && (
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

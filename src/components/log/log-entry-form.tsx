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
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Droplet, Zap, CloudRain, Wind, Smile, StickyNote, ShieldCheck, Ban } from 'lucide-react'; // Example icons


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
  date: z.date(),
  periodFlow: z.enum(['none', 'light', 'medium', 'heavy']).default('none'),
  symptoms: z.array(z.string()).default([]),
  mood: z.string().optional(),
  // Add fields for discharge, sexual activity, notes, custom fields
  sexualActivity: z.boolean().default(false),
  protectionUsed: z.boolean().default(false),
  notes: z.string().optional(),
});

type LogEntryFormValues = z.infer<typeof logEntrySchema>;

interface LogEntryFormProps {
  selectedDate: Date;
}

export default function LogEntryForm({ selectedDate }: LogEntryFormProps) {
  const { toast } = useToast();
  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      date: selectedDate,
      periodFlow: 'none',
      symptoms: [],
      mood: undefined,
      sexualActivity: false,
      protectionUsed: false,
      notes: '',
      // Load existing data for the selectedDate here from local storage
    },
    mode: 'onChange', // Validate on change
  });

 React.useEffect(() => {
    // Reset form with new date if selectedDate prop changes
    form.reset({
      date: selectedDate,
      // Fetch and set other default values based on the new date from storage
      periodFlow: 'none', // Example reset
      symptoms: [],
      mood: undefined,
      sexualActivity: false,
      protectionUsed: false,
      notes: '',
    });
  }, [selectedDate, form]);


  function onSubmit(data: LogEntryFormValues) {
    // TODO: Implement saving data to local storage
    console.log('Saving data:', data);
    toast({
      title: 'Data Saved',
      description: `Your log for ${format(data.date, 'PPP')} has been saved locally.`,
    });
    // Potentially redirect or update UI state after saving
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        value={field.value}
                        onValueChange={(value) => {
                            // Ensure value is one of the allowed enum values or 'none'
                            const validValue = ['light', 'medium', 'heavy'].includes(value) ? value as 'light' | 'medium' | 'heavy' : 'none';
                            field.onChange(validValue);
                        }}
                        className="justify-start flex-wrap"
                        >
                         <ToggleGroupItem value="none" aria-label="No flow" className="flex flex-col h-auto p-2">
                            <Ban className="h-5 w-5 mb-1"/> None
                        </ToggleGroupItem>
                        {flowOptions.map((option) => (
                            <ToggleGroupItem key={option.id} value={option.id} aria-label={option.label} className="flex flex-col h-auto p-2">
                               <div className="flex mb-1">
                                    {Array.from({ length: option.iconCount }).map((_, i) => (
                                         <Droplet key={i} className="h-4 w-4 fill-current text-primary" />
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
                   <div className="grid grid-cols-3 gap-4">
                    {symptomOptions.map((item) => {
                      const Icon = item.icon;
                       return (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="symptoms"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-col items-center space-y-1 border rounded-lg p-3 hover:bg-secondary/50 transition-colors cursor-pointer data-[state=checked]:bg-secondary data-[state=checked]:border-secondary-foreground"
                                data-state={field.value?.includes(item.id) ? "checked" : "unchecked"}
                                onClick={() => {
                                   const currentSymptoms = field.value || [];
                                   if (currentSymptoms.includes(item.id)) {
                                        field.onChange(currentSymptoms.filter((value) => value !== item.id));
                                   } else {
                                        field.onChange([...currentSymptoms, item.id]);
                                   }
                                }}
                              >
                                <FormControl>
                                   {/* Hidden checkbox for form state */}
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            const currentSymptoms = field.value || [];
                                            return checked
                                            ? field.onChange([...currentSymptoms, item.id])
                                            : field.onChange(currentSymptoms.filter((value) => value !== item.id));
                                        }}
                                        className="sr-only" // Hide the actual checkbox
                                    />
                                </FormControl>
                                <Icon className={`h-6 w-6 mb-1 ${field.value?.includes(item.id) ? 'text-accent' : 'text-muted-foreground'}`} />
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
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-3 gap-4"
                        >
                            {moodOptions.map((item) => {
                                const Icon = item.icon;
                                return (
                                     <ToggleGroupItem
                                        key={item.id}
                                        value={item.id}
                                        aria-label={item.label}
                                        className="flex flex-col items-center space-y-1 h-auto p-3 data-[state=on]:bg-secondary data-[state=on]:border-secondary-foreground"
                                    >
                                        <Icon className={`h-6 w-6 mb-1 ${field.value === item.id ? 'text-accent' : 'text-muted-foreground'}`} />
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
                        Intercourse
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
              {form.watch('sexualActivity') && (
                 <FormField
                    control={form.control}
                    name="protectionUsed"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                                <ShieldCheck className="mr-2 h-5 w-5 text-green-600"/> Protection Used
                            </FormLabel>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
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
                  <FormControl>
                    <Textarea
                      placeholder="Add any personal notes for the day..."
                      className="resize-none"
                      {...field}
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

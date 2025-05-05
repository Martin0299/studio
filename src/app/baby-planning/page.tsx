// src/app/baby-planning/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { BookOpen, HeartHandshake, Stethoscope, Utensils, Moon, Activity, MapPin, CalendarCheck2, Brain } from 'lucide-react';

// Define the structure for checklist items
interface ChecklistItem {
  id: string;
  label: string;
  details?: string;
}

// Define the structure for checklist sections
interface ChecklistSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ChecklistItem[];
}

// Define the checklist data
const planningChecklist: ChecklistSection[] = [
  {
    id: 'health',
    title: 'Health & Wellness Check-up',
    icon: Stethoscope,
    items: [
      { id: 'health-visit', label: 'Schedule a preconception check-up with your doctor/OB-GYN' },
      { id: 'health-meds', label: 'Discuss current medications & supplements with your doctor' },
      { id: 'health-vaccines', label: 'Ensure vaccinations are up-to-date (e.g., Rubella, Varicella)' },
      { id: 'health-dental', label: 'Schedule a dental check-up and cleaning' },
      { id: 'health-sti', label: 'Consider STI screening if applicable' },
      { id: 'health-genetics', label: 'Discuss genetic carrier screening if relevant based on family history/ethnicity' },
    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition & Lifestyle',
    icon: Utensils,
    items: [
      { id: 'nutrition-folic', label: 'Start taking a prenatal vitamin with folic acid (at least 400mcg)', details: 'Begin at least 1 month before trying to conceive.' },
      { id: 'nutrition-diet', label: 'Focus on a balanced diet rich in fruits, vegetables, lean protein, and whole grains' },
      { id: 'nutrition-limit-fish', label: 'Limit high-mercury fish (e.g., shark, swordfish)' },
      { id: 'nutrition-limit-caffeine', label: 'Reduce caffeine intake (consult doctor for recommendations)' },
      { id: 'nutrition-stop-alcohol', label: 'Stop drinking alcohol completely' },
      { id: 'nutrition-stop-smoking', label: 'Stop smoking and avoid secondhand smoke' },
      { id: 'nutrition-stop-drugs', label: 'Avoid recreational drugs' },
    ],
  },
  {
    id: 'fitness-sleep',
    title: 'Fitness & Sleep',
    icon: Activity, // Changed icon
    items: [
      { id: 'fitness-exercise', label: 'Maintain or start a moderate exercise routine', details: 'Aim for ~150 minutes of moderate activity per week.' },
      { id: 'fitness-weight', label: 'Achieve a healthy weight (BMI within healthy range)' },
      { id: 'fitness-sleep', label: 'Prioritize getting enough sleep (7-9 hours per night)' },
      { id: 'fitness-stress', label: 'Manage stress through relaxation techniques (yoga, meditation, etc.)' },
    ],
  },
   {
    id: 'cycle-tracking',
    title: 'Cycle Tracking & Timing',
    icon: CalendarCheck2,
    items: [
      { id: 'cycle-track', label: 'Track your menstrual cycles accurately', details: 'Use LunaBloom or another method.'},
      { id: 'cycle-fertile', label: 'Identify your fertile window (use ovulation predictor kits, basal body temp, cervical mucus tracking if desired)' },
      { id: 'cycle-timing', label: 'Plan intercourse during the fertile window', details: 'Typically the few days leading up to and including ovulation.' },
    ],
  },
  {
    id: 'partner-mental',
    title: 'Partner & Mental Preparation',
    icon: HeartHandshake,
    items: [
      { id: 'partner-discuss', label: 'Discuss parenting goals and expectations with your partner' },
      { id: 'partner-support', label: 'Build a strong support system (family, friends)' },
      { id: 'partner-mental', label: 'Mentally prepare for the lifestyle changes pregnancy and parenthood bring' },
      { id: 'partner-finances', label: 'Review finances and plan for potential costs (healthcare, baby supplies)' },
    ],
  },
  {
    id: 'environment',
    title: 'Environmental Factors',
    icon: MapPin,
    items: [
      { id: 'env-toxins', label: 'Avoid exposure to harmful chemicals and toxins at home and work' },
      { id: 'env-hazards', label: 'Assess potential workplace hazards' },
    ],
  },
    {
    id: 'knowledge',
    title: 'Knowledge & Education',
    icon: Brain,
    items: [
      { id: 'knowledge-read', label: 'Read books or reliable resources about pregnancy and childbirth' },
      { id: 'knowledge-classes', label: 'Consider attending preconception or early pregnancy classes' },
    ],
  },
];

const CHECKLIST_STORAGE_KEY = 'babyPlanningChecklist';

export default function BabyPlanningPage() {
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});

  // Load checked state from localStorage on mount
  React.useEffect(() => {
    const storedState = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        if (typeof parsedState === 'object' && parsedState !== null) {
          setCheckedItems(parsedState);
        }
      } catch (error) {
        console.error("Error loading checklist state:", error);
      }
    }
  }, []);

  // Save checked state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  const handleCheckedChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-lg space-y-8">
      <h1 className="text-3xl font-bold text-center mb-4 flex items-center justify-center text-pink-600 dark:text-pink-400">
        <Baby className="mr-2 h-8 w-8" /> {/* Or HeartHandshake */}
        Baby Planning Checklist
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        A guide to help you prepare for a healthy conception and pregnancy. Remember to consult your healthcare provider for personalized advice.
      </p>

      <Accordion type="multiple" defaultValue={planningChecklist.map(s => s.id)} className="w-full space-y-4">
        {planningChecklist.map((section) => {
          const Icon = section.icon;
          return (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg shadow-md bg-card overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                 <div className="flex items-center text-lg font-semibold">
                    <Icon className="mr-3 h-6 w-6 text-accent" />
                    {section.title}
                 </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-2 border-t bg-background">
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={item.id}
                        checked={!!checkedItems[item.id]}
                        onCheckedChange={(checked) => handleCheckedChange(item.id, !!checked)}
                        className="mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <div className="grid gap-1.5 leading-snug">
                        <Label
                          htmlFor={item.id}
                          className={cn(
                              "font-medium cursor-pointer",
                              checkedItems[item.id] && "line-through text-muted-foreground"
                          )}
                        >
                          {item.label}
                        </Label>
                        {item.details && (
                          <p className={cn(
                              "text-sm text-muted-foreground",
                              checkedItems[item.id] && "line-through"
                           )}>
                            {item.details}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

// src/app/baby-planning/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BookOpen, HeartHandshake, Stethoscope, Utensils, Activity, MapPin, CalendarCheck2, Brain, Baby, Wallet, FileText, Building, Salad, Dumbbell, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLifestylePlan } from '@/ai/flows/lifestyle-plan-flow'; // Import the new flow

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
      { id: 'health-visit-doctor', label: 'Schedule a preconception check-up with your doctor/OB-GYN', details: 'Discuss medical history, current health, and pregnancy goals.' },
      { id: 'health-meds', label: 'Review all current medications & supplements with your doctor', details: 'Include prescription, over-the-counter, and herbal supplements.' },
      { id: 'health-vaccines', label: 'Ensure vaccinations are up-to-date', details: 'Check for immunity to Rubella, Varicella (Chickenpox), MMR, Tdap.' },
      { id: 'health-chronic', label: 'Manage chronic health conditions', details: 'Optimize conditions like diabetes, hypertension, thyroid issues before conceiving.' },
      { id: 'health-dental', label: 'Schedule a dental check-up and cleaning', details: 'Gum disease can be linked to preterm birth.' },
      { id: 'health-sti', label: 'Consider STI screening for both partners', details: 'Untreated STIs can affect fertility and pregnancy.' },
      { id: 'health-genetics', label: 'Discuss genetic carrier screening', details: 'Based on family history, ethnicity, or doctor’s recommendation.' },
      { id: 'health-pap', label: 'Ensure Pap smear is up-to-date', details: 'Follow your doctor’s screening recommendations.' },
    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition & Hydration',
    icon: Utensils,
    items: [
      { id: 'nutrition-folic', label: 'Start taking a prenatal vitamin with folic acid', details: 'Begin at least 1 month before trying (min 400mcg folic acid, check for DHA).' },
      { id: 'nutrition-diet', label: 'Eat a balanced, nutrient-dense diet', details: 'Focus on fruits, vegetables, lean proteins, whole grains, healthy fats.' },
      { id: 'nutrition-hydration', label: 'Stay well-hydrated', details: 'Aim for 8-10 glasses of water daily.' },
      { id: 'nutrition-limit-fish', label: 'Limit high-mercury fish', details: 'Avoid shark, swordfish, king mackerel, tilefish. Limit albacore tuna.' },
      { id: 'nutrition-food-safety', label: 'Practice good food safety', details: 'Avoid unpasteurized dairy, undercooked meats/eggs, deli meats unless heated.' },
      { id: 'nutrition-limit-processed', label: 'Reduce processed foods and added sugars', details: 'Focus on whole, unprocessed foods.' },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle Adjustments',
    icon: Activity,
    items: [
      { id: 'lifestyle-alcohol', label: 'Stop drinking alcohol completely', details: 'There is no known safe amount of alcohol during pregnancy planning or pregnancy.' },
      { id: 'lifestyle-smoking', label: 'Stop smoking and using tobacco products', details: 'This includes vaping. Seek help if needed.' },
      { id: 'lifestyle-secondhand', label: 'Avoid secondhand smoke.' },
      { id: 'lifestyle-drugs', label: 'Avoid recreational drugs.' },
      { id: 'lifestyle-caffeine', label: 'Reduce caffeine intake', details: 'Aim for less than 200mg per day (about one 12oz cup of coffee).' },
      { id: 'lifestyle-exercise', label: 'Maintain or start moderate exercise', details: 'Aim for ~150 minutes/week (walking, swimming, prenatal yoga). Listen to your body.' },
      { id: 'lifestyle-weight', label: 'Achieve and maintain a healthy weight', details: 'Discuss with your doctor if you are underweight or overweight.' },
      { id: 'lifestyle-sleep', label: 'Prioritize adequate sleep', details: 'Aim for 7-9 hours per night.' },
      { id: 'lifestyle-stress', label: 'Manage stress effectively', details: 'Practice relaxation techniques like deep breathing, meditation, yoga, or hobbies.' },
    ],
  },
   {
    id: 'cycle-tracking',
    title: 'Cycle Tracking & Timing',
    icon: CalendarCheck2,
    items: [
      { id: 'cycle-track', label: 'Track your menstrual cycles', details: 'Use LunaBloom or another method to understand your cycle length and regularity.' },
      { id: 'cycle-fertile', label: 'Identify your fertile window', details: 'Use ovulation predictor kits, basal body temperature, or cervical mucus tracking.' },
      { id: 'cycle-timing', label: 'Time intercourse during the fertile window', details: 'Typically the 5 days before and the day of ovulation.' },
    ],
  },
  {
    id: 'partner-mental',
    title: 'Partner & Mental Preparation',
    icon: HeartHandshake,
    items: [
      { id: 'partner-discuss-parenting', label: 'Discuss parenting goals, values, and expectations with your partner' },
      { id: 'partner-discuss-roles', label: 'Talk about roles, responsibilities, and division of labor after baby arrives' },
      { id: 'partner-support', label: 'Build and nurture your support system', details: 'Connect with supportive family, friends, or parent groups.' },
      { id: 'partner-mental', label: 'Mentally prepare for lifestyle changes', details: 'Acknowledge the shifts pregnancy and parenthood bring.' },
      { id: 'partner-mental-health', label: 'Address any existing mental health concerns', details: 'Seek professional support if needed.' },
    ],
  },
   {
    id: 'financial-planning',
    title: 'Financial Planning',
    icon: Wallet,
    items: [
      { id: 'finance-budget', label: 'Review your budget and savings', details: 'Plan for costs of prenatal care, delivery, baby supplies, potential income changes.' },
      { id: 'finance-insurance', label: 'Understand your health insurance coverage', details: 'Check maternity benefits, provider network, deductibles, copays.' },
      { id: 'finance-leave', label: 'Research parental leave policies', details: 'Understand options available through work and government programs.' },
      { id: 'finance-life-insurance', label: 'Consider life and disability insurance', details: 'Review needs for financial protection.' },
    ],
  },
  {
    id: 'environment',
    title: 'Environmental Health',
    icon: MapPin,
    items: [
      { id: 'env-toxins-home', label: 'Reduce exposure to harmful chemicals at home', details: 'Use natural cleaning products, ensure good ventilation, filter drinking water if needed.' },
      { id: 'env-toxins-work', label: 'Assess potential workplace hazards', details: 'Discuss concerns about chemical exposure, radiation, or heavy lifting with your employer/doctor.' },
      { id: 'env-pesticides', label: 'Minimize exposure to pesticides', details: 'Wash produce thoroughly, consider organic options.' },
      { id: 'env-plastics', label: 'Reduce exposure to BPA and phthalates', details: 'Avoid microwaving food in plastic, choose glass or stainless steel containers.' },
    ],
  },
    {
    id: 'healthcare-provider',
    title: 'Choosing Healthcare Provider',
    icon: Building,
    items: [
      { id: 'provider-research', label: 'Research potential OB-GYNs or midwives', details: 'Consider hospital affiliations, birthing philosophies, patient reviews.' },
      { id: 'provider-schedule', label: 'Schedule consultations if desired', details: 'Meet potential providers to see if they are a good fit.' },
      { id: 'provider-confirm', label: 'Confirm your chosen provider accepts your insurance.' },
    ],
  },
    {
    id: 'knowledge',
    title: 'Knowledge & Education',
    icon: Brain,
    items: [
      { id: 'knowledge-read', label: 'Read reputable books/websites about preconception, pregnancy, childbirth, and newborn care.' },
      { id: 'knowledge-classes', label: 'Consider attending preconception or early pregnancy classes.' },
      { id: 'knowledge-ask', label: 'Prepare questions for your healthcare provider.' },
    ],
  },
];

const CHECKLIST_STORAGE_KEY = 'babyPlanningChecklist';
const LIFESTYLE_INPUTS_STORAGE_KEY = 'babyPlanningLifestyleInputs';
const LIFESTYLE_PLAN_STORAGE_KEY = 'babyPlanningLifestylePlan';

type PregnancyStage = 'Trying to Conceive' | '1st Trimester' | '2nd Trimester' | '3rd Trimester' | 'Postpartum';

export default function BabyPlanningPage() {
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Lifestyle Tab State
  const [age, setAge] = React.useState<string>('');
  const [weight, setWeight] = React.useState<string>('');
  const [height, setHeight] = React.useState<string>('');
  const [pregnancyStage, setPregnancyStage] = React.useState<PregnancyStage | undefined>(undefined);
  const [gestationalAge, setGestationalAge] = React.useState<string>(''); // Weeks
  const [generatedPlan, setGeneratedPlan] = React.useState<string>('');
  const [isLoadingPlan, setIsLoadingPlan] = React.useState(false);

  // Load checklist state
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

  // Save checklist state
  React.useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  // Load lifestyle inputs and plan
  React.useEffect(() => {
    const storedInputs = localStorage.getItem(LIFESTYLE_INPUTS_STORAGE_KEY);
    if (storedInputs) {
      try {
        const parsedInputs = JSON.parse(storedInputs);
        setAge(parsedInputs.age || '');
        setWeight(parsedInputs.weight || '');
        setHeight(parsedInputs.height || '');
        setPregnancyStage(parsedInputs.pregnancyStage || undefined);
        setGestationalAge(parsedInputs.gestationalAge || '');
      } catch (error) {
        console.error("Error loading lifestyle inputs:", error);
      }
    }
    const storedPlan = localStorage.getItem(LIFESTYLE_PLAN_STORAGE_KEY);
    if (storedPlan) {
      setGeneratedPlan(storedPlan);
    }
  }, []);

  // Save lifestyle inputs
  React.useEffect(() => {
    const inputsToSave = { age, weight, height, pregnancyStage, gestationalAge };
    localStorage.setItem(LIFESTYLE_INPUTS_STORAGE_KEY, JSON.stringify(inputsToSave));
  }, [age, weight, height, pregnancyStage, gestationalAge]);


  const handleCheckedChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  const handleGeneratePlan = async () => {
    if (!pregnancyStage) {
      toast({
        title: "Missing Information",
        description: "Please select your current pregnancy stage.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPlan(true);
    setGeneratedPlan(''); // Clear previous plan
    localStorage.removeItem(LIFESTYLE_PLAN_STORAGE_KEY);

    try {
      const result = await generateLifestylePlan({
        age: age ? parseInt(age) : undefined,
        weightKg: weight ? parseFloat(weight) : undefined,
        heightCm: height ? parseFloat(height) : undefined,
        pregnancyStage,
        gestationalAgeWeeks: gestationalAge ? parseInt(gestationalAge) : undefined,
      });
      setGeneratedPlan(result.lifestylePlan);
      localStorage.setItem(LIFESTYLE_PLAN_STORAGE_KEY, result.lifestylePlan);
      toast({
        title: "Lifestyle Plan Generated!",
        description: "Your personalized weekly plan is ready.",
      });
    } catch (error) {
      console.error("Error generating lifestyle plan:", error);
      toast({
        title: "Error",
        description: "Could not generate lifestyle plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlan(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-lg space-y-8">
      <h1 className="text-3xl font-bold text-center mb-2 flex items-center justify-center text-pink-600 dark:text-pink-400">
        <Baby className="mr-2 h-8 w-8" />
        Baby Planning Center
      </h1>
      <p className="text-center text-muted-foreground mb-6 text-sm">
        A comprehensive guide to help you prepare for a healthy conception and pregnancy. Remember to consult your healthcare provider for personalized advice.
      </p>

      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="checklist">
            <FileText className="mr-2 h-4 w-4" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="lifestyle">
            <Dumbbell className="mr-2 h-4 w-4" /> Lifestyle
          </TabsTrigger>
          <TabsTrigger value="meal">
            <Salad className="mr-2 h-4 w-4" /> Meal Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
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
                            aria-labelledby={`${item.id}-label`}
                          />
                          <div className="grid gap-1.5 leading-snug">
                            <Label
                              id={`${item.id}-label`}
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
        </TabsContent>

        <TabsContent value="lifestyle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Dumbbell className="mr-2 h-6 w-6 text-accent" />AI-Powered Lifestyle Plan</CardTitle>
              <CardDescription>Get a personalized weekly lifestyle plan based on your inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age (Years)</Label>
                  <Input id="age" type="number" placeholder="e.g., 30" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" placeholder="e.g., 65" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input id="height" type="number" placeholder="e.g., 160" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="pregnancyStage">Current Stage</Label>
                <Select value={pregnancyStage} onValueChange={(value) => setPregnancyStage(value as PregnancyStage)}>
                  <SelectTrigger id="pregnancyStage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trying to Conceive">Trying to Conceive</SelectItem>
                    <SelectItem value="1st Trimester">1st Trimester</SelectItem>
                    <SelectItem value="2nd Trimester">2nd Trimester</SelectItem>
                    <SelectItem value="3rd Trimester">3rd Trimester</SelectItem>
                    <SelectItem value="Postpartum">Postpartum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(pregnancyStage === '1st Trimester' || pregnancyStage === '2nd Trimester' || pregnancyStage === '3rd Trimester') && (
                <div>
                  <Label htmlFor="gestationalAge">Gestational Age (weeks)</Label>
                  <Input id="gestationalAge" type="number" placeholder="e.g., 12" value={gestationalAge} onChange={(e) => setGestationalAge(e.target.value)} />
                </div>
              )}
              {(pregnancyStage === 'Postpartum') && (
                 <div>
                  <Label htmlFor="postpartumAge">Baby's Age (weeks)</Label>
                  <Input id="postpartumAge" type="number" placeholder="e.g., 6" value={gestationalAge} onChange={(e) => setGestationalAge(e.target.value)} />
                </div>
              )}
              <Button onClick={handleGeneratePlan} disabled={isLoadingPlan} className="w-full">
                {isLoadingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {generatedPlan ? 'Regenerate Plan' : 'Generate Weekly Plan'}
              </Button>

              {isLoadingPlan && (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="ml-2 text-muted-foreground">Generating your plan...</p>
                </div>
              )}

              {generatedPlan && !isLoadingPlan && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30">
                  <h3 className="text-lg font-semibold mb-2">Your Weekly Lifestyle Plan:</h3>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: generatedPlan.replace(/\n/g, '<br />') }} // Basic formatting
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Salad className="mr-2 h-6 w-6 text-accent" />Meal Plan Suggestions</CardTitle>
              <CardDescription>Nutritional guidance and sample meal ideas for preconception.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Example meal plans and dietary recommendations tailored for fertility and early pregnancy will be featured here. This section will focus on nutrient-dense foods, essential vitamins, and healthy eating patterns.</p>
               <div>
                <h3 className="font-semibold text-md mb-2">Focus On:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Folate-rich foods</li>
                  <li>Iron and Vitamin D sources</li>
                  <li>Healthy fats and proteins</li>
                  <li>Hydration strategies</li>
                  <li>Foods to limit or avoid</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

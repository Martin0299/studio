
// src/ai/flows/meal-plan-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to generate personalized weekly meal plans
 * and vitamin recommendations for pregnancy.
 *
 * - generateMealAndVitaminPlan - Generates a meal and vitamin plan.
 * - MealPlanInput - Input schema for the flow.
 * - MealPlanOutput - Output schema for the flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Define dietary preference enum for checkboxes
const DietaryPreferenceEnum = z.enum(["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"]);
export type DietaryPreference = z.infer<typeof DietaryPreferenceEnum>;

// Define input schema
const MealPlanInputSchema = z.object({
  age: z.number().optional().describe('User\'s age in years.'),
  weightKg: z.number().optional().describe('User\'s current weight in kilograms.'),
  heightCm: z.number().optional().describe('User\'s current height in centimeters.'),
  pregnancyStageWeeks: z.number().min(1).max(42).describe('Current week of pregnancy (e.g., 12 for the 12th week).'),
  dietaryPreferences: z.array(DietaryPreferenceEnum).optional().describe('Selected common dietary preferences.'),
  otherDietaryRestrictions: z.string().optional().describe('Any other dietary restrictions or allergies, e.g., "nut allergy, avoid shellfish".'),
  activityLevel: z.enum(['Sedentary', 'Light', 'Moderate', 'Active']).optional().describe('User\'s general activity level.'),
  preExistingConditions: z.string().optional().describe('Any pre-existing conditions to note for context, e.g., "gestational diabetes controlled by diet". The AI will not give medical advice for these but may consider them for general food suggestions if appropriate and safe.'),
});
export type MealPlanInput = z.infer<typeof MealPlanInputSchema>;

// Define output schema
const MealPlanOutputSchema = z.object({
  plan: z.string().describe('A personalized 7-day meal plan (breakfast, lunch, dinner, 2-3 snacks) and vitamin recommendations for the specified pregnancy week, formatted in Markdown. Includes explanations and disclaimers.'),
});
export type MealPlanOutput = z.infer<typeof MealPlanOutputSchema>;

// Exported wrapper function
export async function generateMealAndVitaminPlan(input: MealPlanInput): Promise<MealPlanOutput> {
  return mealAndVitaminPlanFlow(input);
}

// Define the prompt
const mealPlanPrompt = ai.definePrompt({
  name: 'mealAndVitaminPlanPrompt',
  input: { schema: MealPlanInputSchema },
  output: { schema: MealPlanOutputSchema },
  prompt: `You are Luna, an AI Health Assistant with specialized expertise in prenatal nutrition and maternal health.
You are professional, knowledgeable, supportive, and assertive in your recommendations.

Based on the user's provided information:
- Age: {{#if age}}{{age}} years{{else}}Not provided{{/if}}
- Weight: {{#if weightKg}}{{weightKg}} kg{{else}}Not provided{{/if}}
- Height: {{#if heightCm}}{{heightCm}} cm{{else}}Not provided{{/if}}
- Pregnancy Stage: Week {{pregnancyStageWeeks}}
{{#if dietaryPreferences.length}}- Dietary Preferences: {{#each dietaryPreferences}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}- Dietary Preferences: None specified{{/if}}
{{#if otherDietaryRestrictions}}- Other Dietary Restrictions/Allergies: {{{otherDietaryRestrictions}}}{{else}}- Other Dietary Restrictions/Allergies: None specified{{/if}}
{{#if activityLevel}}- Activity Level: {{{activityLevel}}}{{else}}- Activity Level: Not provided{{/if}}
{{#if preExistingConditions}}- Pre-existing Conditions Noted: {{{preExistingConditions}}} (Note: I will consider this for general suggestions if applicable, but I cannot provide medical advice for managing conditions. Always follow your doctor's guidance.){{else}}- Pre-existing Conditions: None specified{{/if}}

Generate a CONFIDENT and ACTIONABLE 7-day meal plan and vitamin/supplement focus for the user's current week of pregnancy (Week {{pregnancyStageWeeks}}).
The plan should be structured clearly using Markdown.

**I. Weekly Meal Plan for Week {{pregnancyStageWeeks}}**

Provide a brief nutritional focus for this week.
Then, for each of the 7 days (Day 1 to Day 7):
  List suggestions for:
  - Breakfast: (Suggest 1-2 simple, pregnancy-safe food ideas)
  - Mid-Morning Snack: (Suggest 1 healthy, pregnancy-safe snack idea)
  - Lunch: (Suggest 1-2 simple, pregnancy-safe food ideas)
  - Afternoon Snack: (Suggest 1 healthy, pregnancy-safe snack idea)
  - Dinner: (Suggest 1-2 simple, pregnancy-safe food ideas)
  - Optional Evening Snack: (Suggest 1 light, pregnancy-safe idea if appropriate)
Include general portion guidance (e.g., "Ensure adequate protein at each main meal," "Include a variety of colorful vegetables").
Consider any dietary preferences or restrictions mentioned.

**II. Vitamin & Supplement Focus for Week {{pregnancyStageWeeks}}**

Based on standard prenatal guidelines for Week {{pregnancyStageWeeks}}, list 2-3 key vitamins/minerals that are particularly important during this stage of fetal development.
For each:
  - Briefly explain its importance for mother and baby.
  - Suggest 2-3 natural food sources (linking to meal plan ideas if possible).
  - Provide general information on typical prenatal supplement inclusion (e.g., "Often included in prenatal vitamins").

Make your recommendations assertive and direct. For example, instead of "You might want to consider...", say "Focus on incorporating..." or "Ensure you get...".
Emphasize food safety practices for pregnancy where relevant (e.g., thoroughly cooked meats, pasteurized dairy).

IMPORTANT: Conclude your ENTIRE response with the following disclaimer, exactly as written, on a new line, with a blank line before it:

"**Disclaimer:** This meal plan and vitamin information provides general suggestions based on common knowledge and established prenatal guidelines. It is NOT a substitute for personalized medical advice, diagnosis, or treatment from your doctor, midwife, or a registered dietitian. Nutrient needs can vary based on individual health, pre-existing conditions, and specific pregnancy circumstances. Always consult with your healthcare provider before making any changes to your diet, starting any new supplements, or if you have any questions or concerns about your health or your baby's health. They are best equipped to provide advice tailored to your specific situation."

Generated Plan:
`,
});

// Define the flow
const mealAndVitaminPlanFlow = ai.defineFlow(
  {
    name: 'mealAndVitaminPlanFlow',
    inputSchema: MealPlanInputSchema,
    outputSchema: MealPlanOutputSchema,
  },
  async (input) => {
    const { output } = await mealPlanPrompt(input);
    let planText = output?.plan || "Could not generate a meal and vitamin plan at this moment. Please try again later.";

    const requiredDisclaimer = "**Disclaimer:** This meal plan and vitamin information provides general suggestions based on common knowledge and established prenatal guidelines. It is NOT a substitute for personalized medical advice, diagnosis, or treatment from your doctor, midwife, or a registered dietitian. Nutrient needs can vary based on individual health, pre-existing conditions, and specific pregnancy circumstances. Always consult with your healthcare provider before making any changes to your diet, starting any new supplements, or if you have any questions or concerns about your health or your baby's health. They are best equipped to provide advice tailored to your specific situation.";
    if (!planText.includes(requiredDisclaimer)) {
      planText += `\n\n${requiredDisclaimer}`;
    }
    
    return { plan: planText };
  }
);


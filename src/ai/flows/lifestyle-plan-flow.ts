// src/ai/flows/lifestyle-plan-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to generate personalized weekly lifestyle plans
 * for pregnancy and postpartum stages.
 *
 * - generateLifestylePlan - Generates a lifestyle plan.
 * - LifestylePlanInput - Input schema for the flow.
 * - LifestylePlanOutput - Output schema for the flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Define input schema
const LifestylePlanInputSchema = z.object({
  weightKg: z.number().optional().describe('User\'s current weight in kilograms.'),
  heightCm: z.number().optional().describe('User\'s current height in centimeters.'),
  pregnancyStage: z.enum(['Trying to Conceive', '1st Trimester', '2nd Trimester', '3rd Trimester', 'Postpartum']).describe('Current stage of pregnancy or planning.'),
  gestationalAgeWeeks: z.number().optional().describe('Current gestational age in weeks (if pregnant or postpartum).'),
});
export type LifestylePlanInput = z.infer<typeof LifestylePlanInputSchema>;

// Define output schema
const LifestylePlanOutputSchema = z.object({
  lifestylePlan: z.string().describe('A personalized weekly lifestyle plan covering nutrition, exercise, well-being, and sleep, formatted in Markdown.'),
});
export type LifestylePlanOutput = z.infer<typeof LifestylePlanOutputSchema>;

// Exported wrapper function
export async function generateLifestylePlan(input: LifestylePlanInput): Promise<LifestylePlanOutput> {
  return lifestylePlanFlow(input);
}

// Define the prompt
const lifestylePrompt = ai.definePrompt({
  name: 'lifestylePlanPrompt',
  input: { schema: LifestylePlanInputSchema },
  output: { schema: LifestylePlanOutputSchema },
  prompt: `You are Luna, an AI Health Assistant with expertise in prenatal and postnatal health, nutrition, and fitness.
You are professional, knowledgeable, and assertive in your recommendations.

Based on the user's provided information:
- Weight: {{#if weightKg}}{{weightKg}} kg{{else}}Not provided{{/if}}
- Height: {{#if heightCm}}{{heightCm}} cm{{else}}Not provided{{/if}}
- Stage: {{{pregnancyStage}}}
{{#if gestationalAgeWeeks}}- {{#ifEquals pregnancyStage "Postpartum"}}Baby's Age{{else}}Gestational Age{{/ifEquals}}: {{gestationalAgeWeeks}} weeks{{/if}}

Generate a CONFIDENT and ACTIONABLE weekly lifestyle plan tailored to their current stage.
The plan should include practical tips for a one-week timeframe. Structure your response clearly using Markdown headings (e.g., ## Nutrition, ## Exercise) and bullet points for tips.

Your plan must cover:
1.  **Nutrition**: Key food groups to focus on this week. Specific examples of beneficial foods. Foods to consider limiting or avoiding. Hydration goals and tips.
2.  **Exercise**: Safe and beneficial exercise suggestions for this week. Be specific about type, duration, and frequency (e.g., "Aim for 3 sessions of 30-minute brisk walking," or "Try 2 prenatal yoga sessions focusing on gentle stretches for back relief."). If a type of exercise is generally not recommended for the stage, state that confidently.
3.  **Well-being & Stress Management**: At least 2-3 concrete techniques for stress reduction, ensuring adequate rest, and promoting mental well-being relevant to the stage for this week.
4.  **Sleep Hygiene**: Practical tips for improving sleep quality this week.
5.  **Important Considerations**: Key things to be mindful of or general reminders specific to this stage for the week (e.g., upcoming checkups, common symptoms to expect, self-care activities).

Make your recommendations assertive and direct. For example, instead of "You might want to consider...", say "Focus on incorporating..." or "Ensure you get...".

IMPORTANT: Conclude your ENTIRE response with the following disclaimer, exactly as written, on a new line:
"**Disclaimer:** This lifestyle plan provides general suggestions based on common knowledge and is not a substitute for personalized medical advice. Always consult your doctor, midwife, or a qualified healthcare professional before making any changes to your diet, exercise routine, or lifestyle, especially during pregnancy or postpartum."

Lifestyle Plan:
`,
});

// Define the flow
const lifestylePlanFlow = ai.defineFlow(
  {
    name: 'lifestylePlanFlow',
    inputSchema: LifestylePlanInputSchema,
    outputSchema: LifestylePlanOutputSchema,
  },
  async (input) => {
    const { output } = await lifestylePrompt(input);
    let plan = output?.lifestylePlan || "Could not generate a lifestyle plan at this moment. Please try again later.";

    // Ensure the disclaimer is present, even if the AI somehow misses it.
    const requiredDisclaimer = "**Disclaimer:** This lifestyle plan provides general suggestions based on common knowledge and is not a substitute for personalized medical advice. Always consult your doctor, midwife, or a qualified healthcare professional before making any changes to your diet, exercise routine, or lifestyle, especially during pregnancy or postpartum.";
    if (!plan.includes(requiredDisclaimer)) {
      plan += `\n\n${requiredDisclaimer}`;
    }
    
    return { lifestylePlan: plan };
  }
);

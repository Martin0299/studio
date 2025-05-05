'use server';
/**
 * @fileOverview A Genkit flow to generate personalized menstrual health tips.
 *
 * - getMenstrualTips - Generates tips based on cycle phase and symptoms.
 * - MenstrualTipsInput - Input schema for the flow.
 * - MenstrualTipsOutput - Output schema for the flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Define input schema
const MenstrualTipsInputSchema = z.object({
  currentPhase: z.enum(['Period', 'Follicular', 'Fertile Window', 'Luteal']).optional().describe('The current phase of the menstrual cycle.'),
  recentSymptoms: z.array(z.string()).optional().describe('List of symptoms experienced recently (e.g., last few days).'),
});
export type MenstrualTipsInput = z.infer<typeof MenstrualTipsInputSchema>;

// Define output schema
const MenstrualTipsOutputSchema = z.object({
  tips: z.string().describe('Personalized tips regarding menstrual health, diet, vitamins, and well-being based on the provided phase and symptoms.'),
});
export type MenstrualTipsOutput = z.infer<typeof MenstrualTipsOutputSchema>;

// Exported wrapper function
export async function getMenstrualTips(input: MenstrualTipsInput): Promise<MenstrualTipsOutput> {
  return menstrualTipsFlow(input);
}

// Define the prompt
const tipsPrompt = ai.definePrompt({
  name: 'menstrualTipsPrompt',
  input: { schema: MenstrualTipsInputSchema },
  output: { schema: MenstrualTipsOutputSchema },
  prompt: `You are Luna, a knowledgeable and supportive virtual health assistant specializing in women's health and menstrual cycles.

  Based on the user's current cycle phase and recent symptoms, provide helpful and actionable tips focusing on:
  - Nutrition: Suggest foods that might be beneficial or good to avoid.
  - Vitamins/Supplements: Mention potentially helpful vitamins (always advise consulting a doctor before starting supplements).
  - Well-being: Offer general advice for comfort, stress management, or exercise suitable for the phase/symptoms.
  - Symptom Management: Provide gentle, non-medical suggestions for managing the listed symptoms.

  Keep the tone positive, empathetic, and informative. Structure the tips clearly, perhaps using bullet points or short paragraphs for readability.

  User's Context:
  {{#if currentPhase}}- Current Cycle Phase: {{{currentPhase}}}{{/if}}
  {{#if recentSymptoms}}- Recent Symptoms: {{#each recentSymptoms}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{#unless currentPhase}}{{#unless recentSymptoms}}- No specific phase or symptoms provided. Provide general menstrual health tips.{{/unless}}{{/unless}}

  IMPORTANT: Explicitly state that these tips are general suggestions and NOT medical advice. Always recommend consulting a healthcare professional (doctor, gynecologist, registered dietitian) for personalized medical guidance, diagnosis, or before making significant changes to diet or starting any supplements.

  Provide the tips below:
  Tips:`,
});

// Define the flow
const menstrualTipsFlow = ai.defineFlow(
  {
    name: 'menstrualTipsFlow',
    inputSchema: MenstrualTipsInputSchema,
    outputSchema: MenstrualTipsOutputSchema,
  },
  async (input) => {
    console.log("Generating tips for input:", input); // Log input for debugging
    const { output } = await tipsPrompt(input);

    // Ensure disclaimer is present (basic check)
    const responseText = output?.tips || "Could not generate tips at this moment.";
    const disclaimer = "Remember, these are general tips and not a substitute for professional medical advice. Please consult your doctor or a qualified healthcare provider for personalized guidance.";

    if (!responseText.toLowerCase().includes("medical advice") && !responseText.toLowerCase().includes("healthcare provider") && !responseText.toLowerCase().includes("doctor")) {
        return { tips: `${responseText}\n\n**Disclaimer:** ${disclaimer}` };
    }

    return { tips: responseText };
  }
);

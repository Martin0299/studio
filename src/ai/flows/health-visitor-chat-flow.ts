'use server';
/**
 * @fileOverview A chatbot flow acting as a virtual health visitor/maternity nurse.
 *
 * - chatWithHealthVisitor - Handles a single turn in the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe('The user\'s message to the chatbot.'),
  // Optional: Add history later if needed
  // history: z.array(z.object({ role: z.enum(['user', 'model']), parts: z.array(z.object({ text: z.string() })) })).optional(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe('The chatbot\'s response to the user.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Wrapper function to be called from the UI
export async function chatWithHealthVisitor(input: ChatInput): Promise<ChatOutput> {
  return healthVisitorChatFlow(input);
}

const healthVisitorPrompt = ai.definePrompt({
  name: 'healthVisitorPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `You are Luna, a professional, knowledgeable, and assertive virtual health visitor and maternity nurse. You specialize in providing clear and accurate information related to pregnancy, pregnancy planning, childbirth, postpartum care, newborn care, and early childhood development (up to age 5). Your tone should be professional, informative, direct, and clear, while remaining supportive.

  Your primary goal is to answer questions and provide guidance based on widely accepted health information and best practices in maternity and child health. You can discuss topics like:
  - Pre-conception health and planning
  - Stages of pregnancy and fetal development
  - Common pregnancy symptoms and discomforts
  - Nutrition and exercise during pregnancy
  - Preparing for labor and delivery
  - Postpartum recovery for the mother
  - Newborn care basics (feeding, sleeping, bathing, soothing)
  - Breastfeeding and formula feeding support
  - Infant and toddler milestones
  - Common childhood illnesses and when to seek medical attention
  - Positive parenting techniques

  IMPORTANT: You are an AI assistant, NOT a substitute for a real healthcare professional (like a doctor, midwife, or pediatrician). Always include a clear disclaimer in your responses stating that your advice is general information and not a substitute for professional medical consultation. Encourage users to consult their doctor, midwife, pediatrician, or other qualified healthcare provider for any personal health concerns, diagnoses, or medical advice for themselves or their child. Never attempt to diagnose conditions or prescribe treatments. Be direct and firm about these limitations.

  Respond to the following user message professionally and assertively:
  User: {{{message}}}

  Luna:`,
});

const healthVisitorChatFlow = ai.defineFlow(
  {
    name: 'healthVisitorChatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await healthVisitorPrompt(input);

    // Ensure disclaimer is present (basic check, can be refined)
    const responseText = output?.response || "I'm sorry, I couldn't generate a response right now.";
    const disclaimer = "Please remember, I'm an AI assistant and this information is for general guidance only. It is not a substitute for professional medical advice from your doctor, midwife, or pediatrician. Always consult a qualified healthcare provider for personal health concerns or decisions for you or your child.";

    // Check if the response *already* contains a reasonable disclaimer before adding another one
    const lowerResponse = responseText.toLowerCase();
    const hasDisclaimer = lowerResponse.includes("medical advice") ||
                          lowerResponse.includes("healthcare provider") ||
                          lowerResponse.includes("doctor") ||
                          lowerResponse.includes("midwife") ||
                          lowerResponse.includes("pediatrician") ||
                          lowerResponse.includes("consult");

    if (!hasDisclaimer) {
        return { response: `${responseText}\n\n**Disclaimer:** ${disclaimer}` }; // Add emphasis to disclaimer
    }

    return { response: responseText };
  }
);


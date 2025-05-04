'use server';
/**
 * @fileOverview A simple chatbot flow acting as a health visitor specializing in menstrual health.
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
  prompt: `You are Luna, a friendly and knowledgeable virtual health visitor specializing in women's health, particularly menstrual cycles, fertility, and related topics. Your tone should be empathetic, informative, and supportive.

  Your primary goal is to provide general information and answer questions related to menstrual health, cycle tracking, common symptoms, and fertility awareness based on widely accepted knowledge.

  IMPORTANT: You are an AI assistant, NOT a medical professional. Always include a clear disclaimer in your responses stating that your advice is not a substitute for professional medical consultation. Encourage users to consult a doctor or qualified healthcare provider for any personal health concerns or medical advice.

  Respond to the following user message:
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
    const disclaimer = "Please remember, I'm an AI assistant and this information is not a substitute for professional medical advice. Consult your doctor for personal health concerns.";

    if (!responseText.includes("medical advice") && !responseText.includes("doctor")) {
        return { response: `${responseText}\n\n${disclaimer}` };
    }

    return { response: responseText };
  }
);

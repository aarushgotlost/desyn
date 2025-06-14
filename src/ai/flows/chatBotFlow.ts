
'use server';
/**
 * @fileOverview A conversational AI chatbot flow for DevConnect.
 *
 * - chatBotFlow - A function that handles the chatbot conversation.
 * - ChatBotInput - The input type for the chatBotFlow function.
 * - ChatBotOutput - The return type for the chatBotFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; // Corrected import path

// Define the structure for a single message in the history
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })).min(1),
});
export type Message = z.infer<typeof MessageSchema>;


export const ChatBotInputSchema = z.object({
  userInput: z.string().describe("The user's current message to the chatbot."),
  history: z.array(MessageSchema).optional().describe("The conversation history between the user and the AI model."),
});
export type ChatBotInput = z.infer<typeof ChatBotInputSchema>;

export const ChatBotOutputSchema = z.object({
  aiResponse: z.string().describe("The AI's response to the user's message."),
});
export type ChatBotOutput = z.infer<typeof ChatBotOutputSchema>;

// This is the main function Next.js components will call.
export async function chatBotFlow(input: ChatBotInput): Promise<ChatBotOutput> {
  return internalChatBotFlow(input);
}

const chatBotPrompt = ai.definePrompt({
  name: 'devConnectChatBotPrompt',
  system: `You are DevBot, a friendly and highly knowledgeable AI assistant for DevConnect, a social platform for developers.
Your primary goal is to assist users by answering their questions about software development, DevConnect features, popular technologies, programming languages, and general tech topics.
Keep your responses helpful, informative, and concise.
If you don't know the answer to something, it's better to say so than to make something up.
Format code snippets using Markdown if a user asks for code.
Current date: ${new Date().toLocaleDateString()}`,
  input: { schema: ChatBotInputSchema },
  output: { schema: ChatBotOutputSchema },
  prompt: `{{#if history}}
{{#each history}}
{{#if (eq this.role "user")}}User: {{this.parts.0.text}}
{{/if}}
{{#if (eq this.role "model")}}DevBot: {{this.parts.0.text}}
{{/if}}
{{/each}}
{{/if}}
User: {{{userInput}}}
DevBot:`,
});


const internalChatBotFlow = ai.defineFlow(
  {
    name: 'internalDevConnectChatBotFlow',
    inputSchema: ChatBotInputSchema,
    outputSchema: ChatBotOutputSchema,
  },
  async (input) => {
    const { output } = await chatBotPrompt(input);
    if (!output) {
      // Fallback or error handling if output is null/undefined
      // This scenario should ideally be handled by Genkit or the model returning an error
      // For robustness, we provide a generic fallback.
      return { aiResponse: "I'm sorry, I couldn't process that. Can you try rephrasing?" };
    }
    return output;
  }
);


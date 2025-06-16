
'use server';
/**
 * @fileOverview A conversational AI chatbot flow for Desyn.
 *
 * - chatBotFlow - A function that handles the chatbot conversation.
 * - ChatBotInput - The input type for the chatBotFlow function.
 * - ChatBotOutput - The return type for the chatBotFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit'; 

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string() })).min(1),
});
export type Message = z.infer<typeof MessageSchema>;


const ChatBotInputSchema = z.object({
  userInput: z.string().describe("The user's current message to the chatbot."),
  history: z.array(MessageSchema).optional().describe("The conversation history between the user and the AI model."),
});
export type ChatBotInput = z.infer<typeof ChatBotInputSchema>;

const ChatBotOutputSchema = z.object({
  aiResponse: z.string().describe("The AI's response to the user's message."),
});
export type ChatBotOutput = z.infer<typeof ChatBotOutputSchema>;

export async function chatBotFlow(input: ChatBotInput): Promise<ChatBotOutput> {
  return internalDesynChatBotFlow(input);
}

const chatBotPrompt = ai.definePrompt({
  name: 'desynChatBotPrompt',
  system: "You are DevBot, a friendly and helpful AI assistant for Desyn. Desyn is a platform for developers, artists, animators, and other creators to connect, collaborate, and share their work. Be prepared to answer questions about the Desyn platform, coding, art, animation, creative tools, and general technology topics.",
  input: { schema: ChatBotInputSchema },
  output: { schema: ChatBotOutputSchema },
  prompt: `{{#if history}}
{{#each history}}
{{this.role}}: {{this.parts.0.text}}
{{/each}}
{{/if}}
User: {{{userInput}}}
DevBot:`,
});


const internalDesynChatBotFlow = ai.defineFlow(
  {
    name: 'internalDesynChatBotFlow',
    inputSchema: ChatBotInputSchema,
    outputSchema: ChatBotOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await chatBotPrompt(input);
      if (!output) {
        console.error("Chatbot flow: Received null/undefined output from prompt.");
        return { aiResponse: "I'm sorry, I couldn't process your request at the moment. (Output Error)" };
      }
      return output;
    } catch (flowError: any) {
      console.error("Error within internalDesynChatBotFlow:", flowError);
      return { aiResponse: `I encountered an issue processing your request: ${flowError.message || 'Unknown error'}. Please try again.` };
    }
  }
);

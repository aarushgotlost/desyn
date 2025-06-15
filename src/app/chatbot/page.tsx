
import { ChatbotInterface } from "@/components/ai/ChatbotInterface";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DevBot Assistant - Desyn',
  description: 'Chat with DevBot, your AI assistant for Desyn and development questions.',
};

export default function ChatbotPage() {
  return (
    <div className="h-full">
      <ChatbotInterface />
    </div>
  );
}

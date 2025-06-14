
import { ChatbotInterface } from "@/components/ai/ChatbotInterface";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DevBot Assistant - DevConnect',
  description: 'Chat with DevBot, your AI assistant for DevConnect and development questions.',
};

export default function ChatbotPage() {
  return (
    <div className="h-full">
      <ChatbotInterface />
    </div>
  );
}

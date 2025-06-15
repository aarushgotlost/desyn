
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Bot, Sparkles } from "lucide-react";
import { ChatbotMessage } from "./ChatbotMessage";
import { chatBotFlow, type ChatBotInput, type Message as FlowMessage } from "@/ai/flows/chatBotFlow";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';


interface DisplayMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp?: string;
}

export function ChatbotInterface() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userInput: DisplayMessage = {
      id: Date.now().toString() + "-user",
      role: "user",
      content: inputValue.trim(),
      timestamp: format(new Date(), 'p'),
    };
    setMessages((prevMessages) => [...prevMessages, userInput]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Prepare history for the flow
      const flowHistory: FlowMessage[] = messages.map(msg => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const flowInput: ChatBotInput = {
        userInput: userInput.content,
        history: flowHistory,
      };

      const result = await chatBotFlow(flowInput);

      const aiResponse: DisplayMessage = {
        id: Date.now().toString() + "-ai",
        role: "ai",
        content: result.aiResponse,
        timestamp: format(new Date(), 'p'),
      };
      setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast({
        title: "Chatbot Error",
        description: error.message || "Sorry, something went wrong. Please try again.",
        variant: "destructive",
      });
      const errorResponse: DisplayMessage = {
        id: Date.now().toString() + "-ai-error",
        role: "ai",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: format(new Date(), 'p'),
      };
      setMessages((prevMessages) => [...prevMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto flex flex-col shadow-xl h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center text-xl font-headline">
          <Bot className="mr-2 h-6 w-6 text-primary" />
          DevBot Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Welcome to DevBot!</p>
              <p className="text-sm">Ask me anything about Desyn, coding, or tech.</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatbotMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Ask DevBot..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading} aria-label="Send message">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

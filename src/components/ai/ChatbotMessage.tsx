
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface ChatbotMessageProps {
  role: "user" | "ai";
  content: string;
  timestamp?: string;
}

export function ChatbotMessage({ role, content, timestamp }: ChatbotMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex items-start space-x-3 py-3",
        isUser ? "justify-end" : ""
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 self-start border bg-primary/10 text-primary">
          {/* You can replace this with an actual AI avatar image if you have one */}
          {/* <AvatarImage src="/ai-avatar.png" alt="DevBot" /> */}
          <AvatarFallback>
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] p-3.5 rounded-xl shadow-sm break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground border rounded-bl-none"
        )}
      >
        <ReactMarkdown
          className="text-sm prose prose-sm dark:prose-invert max-w-none"
          components={{
            // Customize rendering of specific elements if needed
            // For example, to add Tailwind classes to paragraphs or code blocks
            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
            pre: ({node, ...props}) => <pre className="bg-muted/50 p-2 rounded-md my-2 text-xs" {...props} />,
            code: ({node, inline, className, children, ...props}) => {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <code className={cn(className, "font-mono")} {...props}>{children}</code>
              ) : (
                <code className={cn(className, "font-mono bg-muted/30 px-1 py-0.5 rounded-sm text-xs")} {...props}>{children}</code>
              )
            },
            ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
            li: ({node, ...props}) => <li className="mb-1" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
        {timestamp && (
          <p
            className={cn(
              "text-xs mt-1.5",
              isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground/80 text-left"
            )}
          >
            {timestamp}
          </p>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 self-start border bg-muted">
          <AvatarFallback>
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

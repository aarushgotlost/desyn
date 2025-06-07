
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <MessageSquareText className="mr-3 w-7 h-7 text-primary" />
            Messages
          </CardTitle>
          <CardDescription>
            Your direct messages and community chats will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-16">
          <div className="flex flex-col items-center justify-center">
            <MessageSquareText size={64} className="mx-auto text-muted-foreground mb-6 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Messaging Coming Soon!</h3>
            <p className="text-muted-foreground max-w-md">
              We're working hard to bring you a seamless real-time chat experience. Stay tuned for updates!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

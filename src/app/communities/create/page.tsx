import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";

export default function CreateCommunityPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <PlusCircle className="mr-3 w-7 h-7 text-primary" />
            Create a New Community
          </CardTitle>
          <CardDescription>
            Build a space for developers to connect and collaborate around a specific topic or technology.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="communityName">Community Name</Label>
            <Input id="communityName" placeholder="e.g., Awesome JavaScript Coders" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="communityIcon">Community Icon (URL)</Label>
            <Input id="communityIcon" placeholder="https://example.com/icon.png" />
            <p className="text-xs text-muted-foreground">Provide a URL for the community icon. For now, upload will be added later.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="communityDescription">Description</Label>
            <Textarea id="communityDescription" placeholder="What is this community about?" rows={4} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="communityTags">Tags (comma-separated)</Label>
            <Input id="communityTags" placeholder="e.g., javascript, react, frontend, webdev" />
            <p className="text-xs text-muted-foreground">Help others discover your community.</p>
          </div>
          
          <Button type="submit" className="w-full">
            Create Community
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Image as ImageIcon, Code2 } from "lucide-react";

// Mock communities for the select dropdown
const mockUserCommunities = [
  { id: "1", name: "Next.js Developers" },
  { id: "2", name: "Firebase Experts" },
  { id: "3", name: "Frontend Wizards" },
];

export default function CreatePostPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
             <FileText className="mr-3 w-7 h-7 text-primary" /> Create a New Post
          </CardTitle>
          <CardDescription>
            Share your thoughts, code snippets, or ask questions to the community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="postTitle">Title</Label>
            <Input id="postTitle" placeholder="Enter a catchy title for your post" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postCommunity">Community</Label>
            <Select>
              <SelectTrigger id="postCommunity">
                <SelectValue placeholder="Select a community to post in" />
              </SelectTrigger>
              <SelectContent>
                {mockUserCommunities.map(community => (
                  <SelectItem key={community.id} value={community.id}>{community.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Choose one of your joined communities.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="postDescription">Description / Content</Label>
            <Textarea id="postDescription" placeholder="Write your post content here. Markdown is supported." rows={10} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postCodeSnippet">Code Snippet (Optional)</Label>
            <Textarea id="postCodeSnippet" placeholder="```javascript\nconsole.log('Hello DevConnect!');\n```" rows={6} className="font-code" />
             <p className="text-xs text-muted-foreground">Use markdown for code blocks.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="postImage">Image (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Input id="postImage" type="file" accept="image/*" className="flex-1" />
              <ImageIcon className="text-muted-foreground" />
            </div>
             <p className="text-xs text-muted-foreground">Upload an image related to your post.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postTags">Tags (comma-separated)</Label>
            <Input id="postTags" placeholder="e.g., react, bug, tutorial, discussion" />
             <p className="text-xs text-muted-foreground">Help categorize your post.</p>
          </div>
          
          <Button type="submit" className="w-full">
            <Code2 className="mr-2 h-4 w-4" /> Publish Post
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

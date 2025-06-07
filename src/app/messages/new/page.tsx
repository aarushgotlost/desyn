
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, ChangeEvent } from "react";
import { getAllUsersForNewChat } from "@/services/firestoreService"; 
import type { UserProfile } from "@/contexts/AuthContext"; 
import Image from "next/image";
import { getOrCreateDirectChat } from "@/services/chatService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface DisplayUser extends Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'email'> {}

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export default function NewMessagePage() {
  const router = useRouter();
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DisplayUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState<string | null>(null); // Store UID of user being chatted with

  useEffect(() => {
    async function fetchUsers() {
      if (!currentUser) {
          setIsLoadingUsers(false);
          return;
      }
      setIsLoadingUsers(true);
      try {
        const allUsers = await getAllUsersForNewChat(currentUser.uid); 
        setUsers(allUsers); 
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
      } finally {
        setIsLoadingUsers(false);
      }
    }
    if (!authLoading) {
        fetchUsers();
    }
  }, [currentUser, authLoading, toast]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredUsers(
      users.filter(user => 
        user.displayName?.toLowerCase().includes(term) || 
        user.email?.toLowerCase().includes(term)
      )
    );
  };

  const handleSelectUser = async (selectedUser: DisplayUser) => {
    if (!currentUserProfile || !selectedUser.uid || selectedUser.uid === currentUserProfile.uid) return;
    setIsCreatingChat(selectedUser.uid);
    try {
      // Adapt selectedUser to UserProfile for getOrCreateDirectChat if needed, or adjust service
      const otherUserProfileForChat: UserProfile = {
          uid: selectedUser.uid,
          displayName: selectedUser.displayName,
          email: selectedUser.email || null, // Ensure email is string or null
          photoURL: selectedUser.photoURL,
          onboardingCompleted: true, // Assume true, or fetch full profile if needed
      };
      const chatId = await getOrCreateDirectChat(currentUserProfile, otherUserProfileForChat);
      router.push(`/messages/${chatId}`);
    } catch (error: any) {
      console.error("Error creating or getting chat:", error);
      toast({ title: "Error", description: error.message || "Could not start chat.", variant: "destructive"});
    } finally {
      setIsCreatingChat(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
      return (
          <div className="max-w-2xl mx-auto space-y-6">
              <Card className="shadow-xl">
                  <CardHeader>
                      <CardTitle>Access Denied</CardTitle>
                      <CardDescription>Please log in to start a new chat.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                      <Button asChild><Link href="/login">Log In</Link></Button>
                  </CardContent>
              </Card>
          </div>
      );
  }


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold font-headline flex items-center">
              <UserPlus className="mr-3 w-7 h-7 text-primary" />
              Start a New Chat
            </CardTitle>
          </div>
          <CardDescription>
            Search for users by name or email to start a new conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={handleSearch}
              disabled={isLoadingUsers || !!isCreatingChat}
            />
          </div>

          {isLoadingUsers && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoadingUsers && users.length === 0 && !searchTerm && (
             <p className="text-center text-muted-foreground py-4">No other users found to chat with.</p>
          )}
          
          {!isLoadingUsers && filteredUsers.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground py-4">No users found matching "{searchTerm}".</p>
          )}


          {!isLoadingUsers && filteredUsers.length > 0 && (
            <div className="space-y-2 max-h-[calc(100vh-25rem)] overflow-y-auto pr-1">
              {filteredUsers.map(user => (
                <Card 
                  key={user.uid} 
                  className="p-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} data-ai-hint="user avatar" />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user.displayName || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => !isCreatingChat && handleSelectUser(user)}
                    disabled={!!isCreatingChat && isCreatingChat !== user.uid}
                  >
                    {isCreatingChat === user.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    {isCreatingChat === user.uid ? 'Starting...' : 'Chat'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
           <Button onClick={() => router.push('/messages')} variant="outline" className="w-full mt-4">
              Back to Chats
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

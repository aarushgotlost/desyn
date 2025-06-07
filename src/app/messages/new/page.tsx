
// src/app/messages/new/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
// import { getAllUsers } from "@/services/userService"; // This service would need to be created
// import type { UserProfile } from "@/contexts/AuthContext"; // For user type
// import Image from "next/image";
// import { getOrCreateDirectChat } from "@/services/chatService";
// import { useAuth } from "@/contexts/AuthContext";
// import { useToast } from "@/hooks/use-toast";


// Mock user data for now, replace with actual user fetching
const mockUsers = [
  // { uid: "user1", displayName: "Alice Wonderland", photoURL: "https://placehold.co/40x40.png?text=AW", email: "alice@example.com" },
  // { uid: "user2", displayName: "Bob The Builder", photoURL: "https://placehold.co/40x40.png?text=BB", email: "bob@example.com" },
  // { uid: "user3", displayName: "Charlie Brown", photoURL: "https://placehold.co/40x40.png?text=CB", email: "charlie@example.com" },
  // { uid: "user4", displayName: "Diana Prince", photoURL: "https://placehold.co/40x40.png?text=DP", email: "diana@example.com" },
];


export default function NewMessagePage() {
  const router = useRouter();
  // const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  // const { toast } = useToast();
  // const [users, setUsers] = useState<UserProfile[]>([]);
  // const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  // const [searchTerm, setSearchTerm] = useState("");
  // const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  // const [isCreatingChat, setIsCreatingChat] = useState(false);

  // useEffect(() => {
  //   async function fetchUsers() {
  //     setIsLoadingUsers(true);
  //     try {
  //       // const allUsers = await getAllUsers(); // Implement this service function
  //       // setUsers(allUsers.filter(u => u.uid !== currentUser?.uid)); // Exclude current user
  //       // setFilteredUsers(allUsers.filter(u => u.uid !== currentUser?.uid));
  //       setUsers(mockUsers as UserProfile[]); // Using mock for now
  //       setFilteredUsers(mockUsers as UserProfile[]);
  //     } catch (error) {
  //       console.error("Error fetching users:", error);
  //       toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
  //     } finally {
  //       setIsLoadingUsers(false);
  //     }
  //   }
  //   if (currentUser) fetchUsers();
  // }, [currentUser, toast]);

  // const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const term = event.target.value.toLowerCase();
  //   setSearchTerm(term);
  //   setFilteredUsers(
  //     users.filter(user => user.displayName?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))
  //   );
  // };

  // const handleSelectUser = async (selectedUser: UserProfile) => {
  //   if (!currentUserProfile || !selectedUser) return;
  //   setIsCreatingChat(true);
  //   try {
  //     const chatId = await getOrCreateDirectChat(currentUserProfile, selectedUser);
  //     router.push(`/messages/${chatId}`);
  //   } catch (error) {
  //     console.error("Error creating or getting chat:", error);
  //     toast({ title: "Error", description: "Could not start chat.", variant: "destructive"});
  //   } finally {
  //     setIsCreatingChat(false);
  //   }
  // };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold font-headline flex items-center">
              <UserPlus className="mr-3 w-7 h-7 text-primary" />
              Start a New Chat
            </CardTitle>
          </div>
          <CardDescription>
            Search for users to start a new conversation. This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={handleSearch}
              disabled={isLoadingUsers || isCreatingChat}
            />
          </div>

          {isLoadingUsers && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoadingUsers && filteredUsers.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground py-4">No users found matching "{searchTerm}".</p>
          )}
          {!isLoadingUsers && users.length === 0 && !searchTerm && (
             <p className="text-center text-muted-foreground py-4">No users available to chat with.</p>
          )}

          {!isLoadingUsers && filteredUsers.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredUsers.map(user => (
                <Card 
                  key={user.uid} 
                  className="p-3 flex items-center space-x-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => !isCreatingChat && handleSelectUser(user)}
                >
                  <Image 
                    src={user.photoURL || "https://placehold.co/40x40.png?text=N/A"} 
                    alt={user.displayName || "User"} 
                    width={40} 
                    height={40} 
                    className="rounded-full object-cover"
                    data-ai-hint="user avatar"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{user.displayName || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {isCreatingChat && <Loader2 className="h-5 w-5 animate-spin" />}
                </Card>
              ))}
            </div>
          )} */}
           <p className="text-center text-muted-foreground py-6">
            User search and selection functionality will be implemented here soon.
          </p>
           <Button onClick={() => router.push('/messages')} variant="outline" className="w-full">
              Back to Chats
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

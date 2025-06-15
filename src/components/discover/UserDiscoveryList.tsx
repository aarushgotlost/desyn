
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDiscoverableUsers } from "@/services/firestoreService";
import type { UserProfile } from "@/contexts/AuthContext"; // Assuming UserProfile is exported from AuthContext
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FollowButtonClient } from "@/components/profile/FollowButtonClient";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UserDiscoveryListProps {
  currentUserId: string | null; // To exclude self from list and for FollowButton
}

export function UserDiscoveryList({ currentUserId }: UserDiscoveryListProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const fetchedUsers = await getDiscoverableUsers(currentUserId, 50); // Fetch up to 50 users
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching discoverable users:", error);
        // Optionally show a toast message
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, [currentUserId]);

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.bio?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.techStack?.some(tech => tech.toLowerCase().includes(lowerCaseSearchTerm))
      )
    );
  }, [searchTerm, users]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, bio, or tech stack..."
          className="pl-10 pr-4 py-2 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.uid} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-4 items-center text-center">
                <Link href={`/profile/${user.uid}`}>
                  <Avatar className="h-20 w-20 border-2 hover:border-primary transition-colors">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User avatar"} data-ai-hint="user avatar profile list"/>
                    <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Link>
                <Link href={`/profile/${user.uid}`}>
                    <CardTitle className="text-lg font-semibold hover:text-primary transition-colors mt-2 truncate">
                        {user.displayName || "Anonymous User"}
                    </CardTitle>
                </Link>
                {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0 text-sm">
                {user.bio && (
                    <p className="text-muted-foreground mb-3 h-12 overflow-hidden text-ellipsis text-center">
                        {user.bio}
                    </p>
                )}
                {user.techStack && user.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                        {user.techStack.slice(0,3).map(tech => (
                            <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                        ))}
                        {user.techStack.length > 3 && <Badge variant="outline" className="text-xs">+{user.techStack.length - 3}</Badge>}
                    </div>
                )}
                {!user.bio && (!user.techStack || user.techStack.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center italic py-2">No bio or tech stack provided.</p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t mt-auto flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full sm:flex-1" variant="outline">
                  <Link href={`/profile/${user.uid}`}>View Profile</Link>
                </Button>
                {currentUserId !== user.uid && ( // Show follow button if not the current user
                    <FollowButtonClient 
                        targetUserId={user.uid}
                        targetUserProfile={{ displayName: user.displayName || '' }}
                        // initialIsFollowing is optional, will be fetched by client
                        // Pass currentUserId to avoid FollowButtonClient fetching it again unnecessarily
                    />
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <User size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No Users Found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? `No users match your search for "${searchTerm}".` : "No users to display at the moment."}
          </p>
        </div>
      )}
    </div>
  );
}

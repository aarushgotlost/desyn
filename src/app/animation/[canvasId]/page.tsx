
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCanvasDetails, findUserByEmail, callAddFriendToCanvas } from '@/services/firestoreService';
import type { CanvasProject } from '@/types/data';
import type { UserProfile } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, ArrowLeft, Clapperboard, Users, Mail, AlertTriangle, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const canvasId = params.canvasId as string;

  const [canvas, setCanvas] = useState<CanvasProject | null>(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [friendEmail, setFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [allowedUsersProfiles, setAllowedUsersProfiles] = useState<Partial<UserProfile>[]>([]);

  useEffect(() => {
    async function fetchCanvasData() {
      if (!canvasId || !user) {
        setIsLoadingCanvas(false);
        return;
      }
      setIsLoadingCanvas(true);
      setError(null);
      try {
        const canvasDetails = await getCanvasDetails(canvasId);
        if (canvasDetails) {
          if (!canvasDetails._allowedUsers.includes(user.uid)) {
            setError("You do not have permission to access this canvas.");
            setCanvas(null);
          } else {
            setCanvas(canvasDetails);
            // Fetch profiles for allowed users
            const profilesPromises = canvasDetails._allowedUsers.map(async (uid) => {
              const profile = await getUserProfile(uid); // Assuming getUserProfile fetches by UID
              if (profile) {
                return profile;
              } else if (uid === canvasDetails._ownerId) { // Fallback for owner if profile fetch fails
                return { uid: uid, displayName: "Owner (You)", email: user.email };
              }
              return null;
            });
            const profiles = await Promise.all(profilesPromises);
            setAllowedUsersProfiles(profiles.filter(p => p) as UserProfile[]);
          }
        } else {
          setError("Canvas not found.");
        }
      } catch (err) {
        console.error("Error fetching canvas:", err);
        setError("Failed to load canvas details.");
      } finally {
        setIsLoadingCanvas(false);
      }
    }

    if (!authLoading) {
      fetchCanvasData();
    }
  }, [canvasId, user, authLoading]);
  
   const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim() || !canvas || !user || canvas._ownerId !== user.uid) {
      toast({ title: "Error", description: "Invalid operation or insufficient permissions.", variant: "destructive" });
      return;
    }
    setIsAddingFriend(true);
    try {
      const friendProfile = await findUserByEmail(friendEmail.trim());
      if (!friendProfile) {
        toast({ title: "User Not Found", description: `No user found with email: ${friendEmail}.`, variant: "destructive" });
        setIsAddingFriend(false);
        return;
      }
      if (friendProfile.uid === user.uid) {
        toast({ title: "Cannot Add Self", description: "You cannot add yourself as a collaborator again.", variant: "destructive" });
        setIsAddingFriend(false);
        return;
      }
       if (canvas._allowedUsers.includes(friendProfile.uid)) {
        toast({ title: "Already Collaborator", description: `${friendProfile.displayName || 'User'} is already a collaborator.`, variant: "default" });
        setIsAddingFriend(false);
        return;
      }

      const result = await callAddFriendToCanvas({ canvasId: canvas.id, friendUid: friendProfile.uid });
      if (result.data.success) {
        toast({ title: "Collaborator Added!", description: `${friendProfile.displayName || 'User'} can now access this canvas.` });
        setFriendEmail('');
        // Refresh canvas details to show new collaborator
        const updatedCanvas = await getCanvasDetails(canvasId);
        if (updatedCanvas) {
          setCanvas(updatedCanvas);
          const profilesPromises = updatedCanvas._allowedUsers.map(async (uid) => {
              const profile = await getUserProfile(uid);
              if (profile) return profile;
              if (uid === updatedCanvas._ownerId && user?.uid === uid) return { uid: uid, displayName: "Owner (You)", email: user.email };
              return null;
            });
          const profiles = await Promise.all(profilesPromises);
          setAllowedUsersProfiles(profiles.filter(p => p) as UserProfile[]);
        }
      } else {
        toast({ title: "Failed to Add", description: result.data.message, variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error adding friend:", err);
      toast({ title: "Error", description: err.message || "Could not add collaborator.", variant: "destructive" });
    } finally {
      setIsAddingFriend(false);
    }
  };


  if (authLoading || isLoadingCanvas) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Canvas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-3">Access Error</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button asChild variant="outline">
          <Link href="/animation"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Canvases</Link>
        </Button>
      </div>
    );
  }
  
  if (!canvas) {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <Clapperboard className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-semibold mb-3">Canvas Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested animation canvas could not be loaded.</p>
        <Button asChild variant="outline">
          <Link href="/animation"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Canvases</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user?.uid === canvas._ownerId;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/animation')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Canvases
        </Button>
        {/* Add other canvas-specific actions here, e.g., rename, delete */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <Clapperboard className="mr-3 w-7 h-7 text-primary" /> {canvas._title}
          </CardTitle>
          <CardDescription>
            Owned by: {isOwner ? "You" : allowedUsersProfiles.find(p=>p.uid === canvas._ownerId)?.displayName || "Another user"} | Last updated: {new Date(canvas._updatedAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for actual animation editor */}
          <div className="aspect-video bg-muted/30 border border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-center p-8">
            <Square className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Animation Canvas Area</h3>
            <p className="text-sm text-muted-foreground">Editor and tools coming soon!</p>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
                <UserPlus className="mr-2 h-5 w-5 text-primary" /> Add Collaborator
            </CardTitle>
            <CardDescription>Enter the email address of the user you want to share this canvas with.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddFriend} className="flex flex-col sm:flex-row items-start gap-2">
              <Input
                type="email"
                placeholder="Friend's email address"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                className="flex-grow"
                disabled={isAddingFriend}
                required
              />
              <Button type="submit" disabled={isAddingFriend || !friendEmail.trim()} className="w-full sm:w-auto">
                {isAddingFriend ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add Friend
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" /> Collaborators ({allowedUsersProfiles.length})
            </CardTitle>
        </CardHeader>
        <CardContent>
            {allowedUsersProfiles.length > 0 ? (
                <ul className="space-y-3">
                    {allowedUsersProfiles.map(profile => (
                        profile && (
                            <li key={profile.uid} className="flex items-center space-x-3 p-2 border-b last:border-b-0">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName || "User"} data-ai-hint="collaborator avatar small"/>
                                    <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{profile.displayName || "Unknown User"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {profile.uid === canvas._ownerId ? "(Owner)" : "(Collaborator)"}
                                        {profile.email && ` - ${profile.email}`}
                                    </p>
                                </div>
                            </li>
                        )
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No collaborators yet (except the owner).</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function (can be moved to a service or utils if used elsewhere)
async function getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    const userDocRef = doc(db, 'users', uid);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Basic processing, can be expanded
            return {
                uid: docSnap.id,
                displayName: data.displayName || null,
                email: data.email || null,
                photoURL: data.photoURL || null,
                onboardingCompleted: data.onboardingCompleted || false,
                // Add other fields as needed from your UserProfile type
            } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching profile for user ${uid}:`, error);
        return null;
    }
}

    
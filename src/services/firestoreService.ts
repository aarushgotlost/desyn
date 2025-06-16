
import { db, auth } from '@/lib/firebase';
import type { Community, Post, Comment, AnimationProject } from '@/types/data';
import type { UserProfile } from '@/contexts/AuthContext';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore();
  // This function is problematic in server components if auth state isn't readily available.
  // For now, it will return null, relying on client components or actions to get the current user.
  // To make this work server-side reliably, you'd need a different auth mechanism (e.g., session cookies).
  // Consider using `useAuth` in client components or passing userId from client to server actions.

  // TEMPORARY: To allow some server components to work without full auth integration,
  // we'll try to get the user from the auth object if available. This is NOT reliable for SSR
  // without proper session management.
  // return auth.currentUser?.uid || null;
  return null;
}

const processDoc = <T extends { id: string; createdAt?: string | Timestamp | Date; updatedAt?: string | Timestamp | Date; lastLogin?: string | Timestamp | Date; lastMessageAt?: string | Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null; bannerURL?: string | null; followersCount?: number; followingCount?: number; skills?: string[]; likes?: number; commentsCount?: number; memberCount?: number; }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };

  const dateFields: (keyof T)[] = ['createdAt', 'updatedAt', 'lastLogin', 'lastMessageAt'];
  dateFields.forEach(field => {
    const fieldValue = data[field];
    if (fieldValue && typeof (fieldValue as Timestamp).toDate === 'function') {
      processedData[field] = (fieldValue as Timestamp).toDate().toISOString();
    } else if (fieldValue instanceof Date) {
      processedData[field] = fieldValue.toISOString();
    } else if (typeof fieldValue === 'string') {
      try {
            const d = new Date(fieldValue);
            if (!isNaN(d.getTime())) { // Check if date is valid
              processedData[field] = d.toISOString();
            } else {
              processedData[field] = fieldValue; // Keep original if invalid
            }
      } catch (e) {
        processedData[field] = fieldValue; // Fallback
      }
    } else if (fieldValue && typeof fieldValue === 'object' && fieldValue.seconds && fieldValue.nanoseconds) { // Handle plain Timestamp-like objects
        try {
            processedData[field] = new Timestamp(fieldValue.seconds, fieldValue.nanoseconds).toDate().toISOString();
        } catch (e) {
            processedData[field] = null;
        }
    }
  });


  if (data.members && docSnap.ref.parent.id === 'communities') {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) {
    processedData.members = [];
  }

  if ('authorId' in data) {
      processedData.authorAvatar = data.authorAvatar || null;
  }

  if (typeof data.uid !== 'undefined' || docSnap.ref.parent.id === 'users') {
      processedData.photoURL = data.photoURL || null;
      processedData.bannerURL = data.bannerURL || null;
      processedData.followersCount = typeof data.followersCount === 'number' ? data.followersCount : 0;
      processedData.followingCount = typeof data.followingCount === 'number' ? data.followingCount : 0;
      processedData.bio = data.bio || '';
      processedData.skills = data.skills || [];
      processedData.interests = data.interests || [];
      processedData.onboardingCompleted = typeof data.onboardingCompleted === 'boolean' ? data.onboardingCompleted : false;
  }

  // Ensure common numeric fields are numbers or default to 0
  if ('likes' in data) {
    processedData.likes = typeof data.likes === 'number' ? data.likes : 0;
  }
  if ('commentsCount' in data) {
    processedData.commentsCount = typeof data.commentsCount === 'number' ? data.commentsCount : 0;
  }
  if ('memberCount' in data && docSnap.ref.parent.id === 'communities') { // memberCount relevant for communities
    processedData.memberCount = typeof data.memberCount === 'number' ? data.memberCount : 0;
  }


  return processedData as T;
};

export async function getCommunities(): Promise<Community[]> {
  noStore();
  const communitiesCol = collection(db, 'communities');
  const q = query(communitiesCol, orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
  } catch (error) {
    console.error("Error fetching communities:", error);
    return [];
  }
}

export async function getCommunityDetails(communityId: string): Promise<Community | null> {
  noStore();
  if (!communityId) return null;
  const communityDocRef = doc(db, 'communities', communityId);
  try {
    const docSnap = await getDoc(communityDocRef);
    if (docSnap.exists()) {
      return processDoc<Community>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching community details for ${communityId}:`, error);
    return null;
  }
}

export async function getPostsForCommunity(communityId: string, count: number = 10): Promise<Post[]> {
  noStore();
  const postsCol = collection(db, 'posts');
  const q = query(
    postsCol,
    where('communityId', '==', communityId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error(`Error fetching posts for community ${communityId}:`, error);
    return [];
  }
}

export async function getRecentPosts(count: number = 10): Promise<Post[]> {
  noStore();
  const postsCol = collection(db, 'posts');
  const q = query(postsCol, orderBy('createdAt', 'desc'), limit(count));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    return [];
  }
}

export async function getPostDetails(postId: string): Promise<Post | null> {
  noStore();
  const postDocRef = doc(db, 'posts', postId);
  try {
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      return processDoc<Post>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching post details for ${postId}:`, error);
    return null;
  }
}


export async function getCommentsForPostSSR(postId: string): Promise<Comment[]> {
  noStore();
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Comment>(docSnap));
  } catch (error) {
    console.error(`Error fetching comments SSR for post ${postId}:`, error);
    return [];
  }
}

export function getCommentsForPostRealtime(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let createdAtStr: string;
      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        createdAtStr = (data.createdAt as Timestamp).toDate().toISOString();
      } else if (data.createdAt instanceof Date) {
        createdAtStr = data.createdAt.toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else if (data.createdAt) {
         try {
             createdAtStr = new Date(data.createdAt).toISOString();
         } catch {
            createdAtStr = new Date().toISOString();
         }
      }
      else {
        createdAtStr = new Date().toISOString();
      }
      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAtStr,
      } as Comment;
    });
    callback(comments);
  }, (error) => {
    console.error("Error in getCommentsForPostRealtime snapshot: ", error);
    if (onError) onError(error);
  });

  return unsubscribe;
}


export async function getDiscoverableUsers(currentUserId: string | null, count: number = 20): Promise<UserProfile[]> {
    noStore();
    const usersCol = collection(db, 'users');
    let q;
    if (currentUserId) {
        q = query(
            usersCol,
            where('onboardingCompleted', '==', true),
            where('uid', '!=', currentUserId),
            orderBy('uid'),
            limit(count)
        );
    } else {
        q = query(usersCol, where('onboardingCompleted', '==', true), orderBy('displayName', 'asc'), limit(count));
    }

    try {
        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(docSnap => processDoc<UserProfile>(docSnap));
        if (currentUserId) {
            users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        }
        return users;
    } catch (error) {
        console.error("Error fetching discoverable users:", error);
        return [];
    }
}

export async function getUserPosts(userId: string, count: number = 10): Promise<Post[]> {
  noStore();
  if (!userId) return [];
  const postsCol = collection(db, 'posts');
  const q = query(
    postsCol,
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    return [];
  }
}

export async function getUserJoinedCommunities(userId: string): Promise<Community[]> {
  noStore();
  if (!userId) return [];
  const communitiesCol = collection(db, 'communities');
  const q = query(
    communitiesCol,
    where('members', 'array-contains', userId),
    orderBy('name', 'asc')
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
  } catch (error) {
    console.error(`Error fetching joined communities for user ${userId}:`, error);
    return [];
  }
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  noStore();
  if (!currentUserId || !targetUserId) return false;
  try {
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    const docSnap = await getDoc(followingRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

export async function getFollowers(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followersColRef = collection(db, 'users', userId, 'followers');
    const q = query(followersColRef, orderBy('followedAt', 'desc'), limit(count));

    try {
      const snapshot = await getDocs(q);
      const followerProfiles: Partial<UserProfile>[] = [];
      for (const followerDoc of snapshot.docs) {
          const followerData = followerDoc.data();
          if (followerData.userId) {
            const userProfileDoc = await getDoc(doc(db, 'users', followerData.userId));
            if (userProfileDoc.exists()) {
                const profile = processDoc<UserProfile>(userProfileDoc);
                followerProfiles.push({
                    uid: userProfileDoc.id,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL,
                });
            }
          }
      }
      return followerProfiles;
    } catch (error) {
      console.error(`Error fetching followers for user ${userId}:`, error);
      return [];
    }
}

export async function getFollowing(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followingColRef = collection(db, 'users', userId, 'following');
    const q = query(followingColRef, orderBy('followedAt', 'desc'), limit(count));
    try {
      const snapshot = await getDocs(q);
      const followingProfiles: Partial<UserProfile>[] = [];
      for (const followingDoc of snapshot.docs) {
          const followingData = followingDoc.data();
          if (followingData.userId) {
            const userProfileDoc = await getDoc(doc(db, 'users', followingData.userId));
            if (userProfileDoc.exists()) {
                const profile = processDoc<UserProfile>(userProfileDoc);
                followingProfiles.push({
                    uid: userProfileDoc.id,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL,
                });
            }
          }
      }
      return followingProfiles;
    } catch (error) {
      console.error(`Error fetching following for user ${userId}:`, error);
      return [];
    }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    noStore();
    if (!userId) return null;
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return processDoc<UserProfile>(docSnap);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        return null;
    }
}

export async function getAllUsersForNewChat(currentUserId: string, count: number = 50): Promise<UserProfile[]> {
  noStore();
  const usersCol = collection(db, 'users');
  const q = query(
    usersCol,
    where('uid', '!=', currentUserId),
    where('onboardingCompleted', '==', true),
    orderBy('uid'),
  );

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => processDoc<UserProfile>(docSnap))
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
      .slice(0, count);
  } catch (error) {
    console.error("Error fetching all users for new chat:", error);
    return [];
  }
}

export async function createAnimationProject(userId: string, projectName: string, fps: number): Promise<string> {
  if (!userId) {
    throw new Error("User ID is required to create an animation project.");
  }
  if (!projectName.trim()) {
    throw new Error("Project name cannot be empty.");
  }

  const projectsColRef = collection(db, 'projects');
  const newProjectData: Omit<AnimationProject, 'id' | 'updatedAt' | 'createdAt'> & { createdBy: string; createdAt: Timestamp; updatedAt: Timestamp; thumbnailURL: null } = {
    name: projectName,
    createdBy: userId,
    fps: fps || 12,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    thumbnailURL: null, // Initialize with no thumbnail
  };

  try {
    const projectDocRef = await addDoc(projectsColRef, newProjectData);
    return projectDocRef.id;
  } catch (error) {
    console.error("Error creating animation project in Firestore:", error);
    throw new Error("Could not create animation project.");
  }
}

export async function getUserAnimationProjects(userId: string): Promise<AnimationProject[]> {
  noStore();
  if (!userId) return [];
  const projectsCol = collection(db, 'projects');
  const q = query(
    projectsCol,
    where('createdBy', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<AnimationProject>(docSnap));
  } catch (error) {
    console.error(`Error fetching animation projects for user ${userId}:`, error);
    return [];
  }
}

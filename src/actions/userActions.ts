
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  writeBatch,
  increment,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import { createNotification } from '@/services/notificationService';
import type { NotificationActor } from '@/types/notifications';

// Updated revalidation paths
async function revalidateProfilePaths(currentUserId: string, targetUserId?: string) {
  revalidatePath('/profile'); // For the current user's own profile page (src/app/profile/page.tsx)
  if (targetUserId) {
    revalidatePath(`/profile/${targetUserId}`); // For the target user's profile page
  }
  // Revalidate common pages where follow status/counts might appear
  revalidatePath('/'); // Home feed
  revalidatePath('/communities'); // Discover page (user lists)
  revalidatePath('/notifications'); // For potential notification updates
}

export async function followUser(
  currentUserId: string,
  currentUserProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>, // For notification actor
  targetUserId: string,
  targetUserProfile: Pick<UserProfile, 'displayName'> // For notification message
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, message: 'Invalid user IDs.' };
  }
  if (!currentUserProfile.uid || !currentUserProfile.displayName) {
    return { success: false, message: 'Current user profile information is incomplete for notification.' };
  }


  const batch = writeBatch(db);

  const currentUserFollowingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.set(currentUserFollowingRef, { userId: targetUserId, followedAt: serverTimestamp() });
  const currentUserRef = doc(db, 'users', currentUserId);
  batch.update(currentUserRef, { followingCount: increment(1) });

  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.set(targetUserFollowersRef, { userId: currentUserId, followedAt: serverTimestamp() });
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, { followersCount: increment(1) });

  try {
    await batch.commit();

    const actor: NotificationActor = {
      id: currentUserProfile.uid,
      displayName: currentUserProfile.displayName, // Already checked for null/undefined
      avatarUrl: currentUserProfile.photoURL
    };
    await createNotification({
      userId: targetUserId,
      type: 'new_follower',
      actor,
      message: `${currentUserProfile.displayName} started following you.`,
      link: `/profile/${currentUserId}`,
      relatedEntityId: currentUserId,
    });
    
    await revalidateProfilePaths(currentUserId, targetUserId);
    return { success: true, message: `Successfully followed ${targetUserProfile.displayName || 'user'}.` };
  } catch (error: any) {
    console.error('Error following user:', error);
    return { success: false, message: error.message || 'Could not follow user.' };
  }
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, message: 'Invalid user IDs.' };
  }

  const batch = writeBatch(db);

  const currentUserFollowingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.delete(currentUserFollowingRef);
  const currentUserRef = doc(db, 'users', currentUserId);
  batch.update(currentUserRef, { followingCount: increment(-1) });

  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.delete(targetUserFollowersRef);
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, { followersCount: increment(-1) });

  try {
    await batch.commit();
    await revalidateProfilePaths(currentUserId, targetUserId);
    return { success: true, message: 'Successfully unfollowed user.' };
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return { success: false, message: error.message || 'Could not unfollow user.' };
  }
}

export async function deleteUserAccountAndBasicData(
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'User ID is missing.' };
  }

  const batch = writeBatch(db);

  // 1. Delete user profile document
  const userProfileRef = doc(db, 'users', userId);
  batch.delete(userProfileRef);

  // 2. Delete notifications for this user
  const notificationsColRef = collection(db, 'notifications');
  const notificationsQuery = query(notificationsColRef, where('userId', '==', userId));
  
  try {
    const notificationsSnapshot = await getDocs(notificationsQuery);
    notificationsSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    const postsColRef = collection(db, 'posts');
    const postsQuery = query(postsColRef, where('authorId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);
    postsSnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    const communitiesColRef = collection(db, 'communities');
    const memberCommunitiesQuery = query(communitiesColRef, where('members', 'array-contains', userId));
    const memberCommunitiesSnapshot = await getDocs(memberCommunitiesQuery);
    memberCommunitiesSnapshot.forEach(communityDocSnap => {
        batch.update(communityDocSnap.ref, {
            members: communityDocSnap.data().members.filter((uid: string) => uid !== userId),
            memberCount: increment(-1)
        });
    });

    // Consider deleting user's followers and following entries (from other users' subcollections)
    // This is more complex and might be better handled by a Firebase Function for atomicity and thoroughness.
    // For now, focusing on data directly owned by or referencing the user.


    await batch.commit();
    
    revalidatePath('/profile'); // Current user's profile
    revalidatePath('/settings');
    revalidatePath('/'); 
    revalidatePath('/communities');
    // No easy way to revalidate all profiles that might have followed/been followed by this user without knowing their IDs.

    return { success: true, message: 'User data (profile, notifications, posts, community memberships) removed successfully. Firebase Auth record to be deleted by client.' };
  } catch (error: any) {
    console.error('Error deleting user data:', error);
    return { success: false, message: error.message || 'Could not delete user data.' };
  }
}

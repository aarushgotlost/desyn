
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  writeBatch,
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import { createNotification } from '@/services/notificationService';
import type { NotificationActor } from '@/types/notifications';

async function revalidateProfilePaths(userId: string, otherUserId?: string) {
  revalidatePath(`/profile`); // Current user's main profile page
  if (otherUserId) {
    // revalidatePath(`/profile/${otherUserId}`);
  }
  revalidatePath('/notifications');
}

export async function followUser(
  currentUserId: string,
  currentUserProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>,
  targetUserId: string,
  targetUserProfile: Pick<UserProfile, 'displayName'> // Only need display name for notification message
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, message: 'Invalid user IDs.' };
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

    // Create notification for the user who was followed
    if (currentUserProfile) {
       const actor: NotificationActor = {
        id: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        avatarUrl: currentUserProfile.photoURL
      };
      await createNotification({
        userId: targetUserId,
        type: 'new_follower',
        actor,
        message: `${currentUserProfile.displayName || 'Someone'} started following you.`,
        link: `/profile/${currentUserId}`, // Link to the follower's profile (or a generic profile page for now)
        relatedEntityId: currentUserId,
      });
    }

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


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
        link: `/profile/${currentUserId}`,
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

    // IMPORTANT: Add deletion for user's posts
    const postsColRef = collection(db, 'posts');
    const postsQuery = query(postsColRef, where('authorId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);
    postsSnapshot.forEach(docSnap => {
        // Further: could delete comments and likes within each post, or handle via Firebase Functions
        batch.delete(docSnap.ref);
    });

    // IMPORTANT: Add deletion for user's comments (more complex, might need iterating through all posts)
    // For simplicity, this is omitted here but is crucial for full data cleanup.
    // Example: Iterate all posts, then all comments within those posts, then check authorId.
    // This is very inefficient without proper indexing or a Firebase Function.

    // IMPORTANT: Remove user from community member lists and decrement counts
    const communitiesColRef = collection(db, 'communities');
    const memberCommunitiesQuery = query(communitiesColRef, where('members', 'array-contains', userId));
    const memberCommunitiesSnapshot = await getDocs(memberCommunitiesQuery);
    memberCommunitiesSnapshot.forEach(communityDocSnap => {
        batch.update(communityDocSnap.ref, {
            members: communityDocSnap.data().members.filter((uid: string) => uid !== userId),
            memberCount: increment(-1)
        });
    });


    await batch.commit();
    
    revalidatePath('/profile');
    revalidatePath('/settings');
    revalidatePath('/'); // Revalidate home feed
    revalidatePath('/communities'); // Revalidate communities list
    // Other paths might need revalidation depending on how deleted user's content is handled.

    return { success: true, message: 'User data (profile, notifications, posts, community memberships) removed successfully. Firebase Auth record to be deleted by client.' };
  } catch (error: any) {
    console.error('Error deleting user data:', error);
    return { success: false, message: error.message || 'Could not delete user data.' };
  }
}

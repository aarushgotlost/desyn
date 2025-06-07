
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  updateDoc,
  increment,
  getDoc,
  writeBatch,
  collection,
  deleteDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Post, Comment } from '@/types/data'; // Ensure Post type is imported

// Helper function to revalidate common paths
async function revalidatePostPaths(postId: string, communityId?: string) {
  revalidatePath(`/posts/${postId}`);
  revalidatePath('/'); // Revalidate home feed
  if (communityId) {
    revalidatePath(`/communities/${communityId}`); // Revalidate specific community feed
  }
  revalidatePath('/profile'); // Revalidate current user's profile page in case their posts list needs update
}

export async function togglePostLike(
  postId: string,
  userId: string
): Promise<{ success: boolean; message: string; newLikesCount?: number; isLiked?: boolean }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!postId) {
    return { success: false, message: 'Post ID is missing.' };
  }

  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', userId);

  try {
    let newLikesCount: number;
    let isLiked: boolean;

    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return { success: false, message: 'Post not found.' };
    }
    const postData = postSnap.data() as Post;

    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
      // User has liked it, so unlike
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likes: increment(-1) });
      newLikesCount = (postData.likes || 0) - 1;
      isLiked = false;
    } else {
      // User has not liked it, so like
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(postRef, { likes: increment(1) });
      newLikesCount = (postData.likes || 0) + 1;
      isLiked = true;
    }
    
    await revalidatePostPaths(postId, postData.communityId);

    return {
      success: true,
      message: isLiked ? 'Post liked!' : 'Post unliked!',
      newLikesCount: Math.max(0, newLikesCount),
      isLiked,
    };
  } catch (error: any) {
    console.error('Error toggling post like:', error);
    return { success: false, message: error.message || 'Could not update like status.' };
  }
}

export async function getPostLikeStatus(
  postId: string,
  userId: string | undefined // userId can be undefined if user is not logged in
): Promise<{ isLiked: boolean; likesCount: number }> {
  const postRef = doc(db, 'posts', postId);
  
  // Attempt to get post likes even if user is not logged in
  if (!userId) {
    const postSnap = await getDoc(postRef);
    return { isLiked: false, likesCount: postSnap.exists() ? (postSnap.data() as Post).likes || 0 : 0 };
  }

  const likeRef = doc(db, 'posts', postId, 'likes', userId);

  try {
    const [postSnap, likeSnap] = await Promise.all([getDoc(postRef), getDoc(likeRef)]);
    const likesCount = postSnap.exists() ? (postSnap.data() as Post).likes || 0 : 0;
    return { isLiked: likeSnap.exists(), likesCount };
  } catch (error) {
    console.error('Error fetching like status:', error);
    // Attempt to get post likes count even on error, default isLiked to false
    try {
        const postSnapOnError = await getDoc(postRef);
        const likesCountOnError = postSnapOnError.exists() ? (postSnapOnError.data() as Post).likes || 0 : 0;
        return { isLiked: false, likesCount: likesCountOnError };
    } catch (finalError) {
        console.error('Error fetching post data on like status error:', finalError);
        return { isLiked: false, likesCount: 0 }; // Default to not liked and 0 count on final error
    }
  }
}


export async function addCommentToPost(
  postId: string,
  commentData: { text: string; authorId: string; authorName: string; authorAvatar?: string | null }
): Promise<{ success: boolean; message: string; commentId?: string; newComment?: Comment }> {
  if (!commentData.authorId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!postId) {
    return { success: false, message: 'Post ID is missing.' };
  }
  if (!commentData.text.trim()) {
    return { success: false, message: 'Comment text cannot be empty.' };
  }

  const postRef = doc(db, 'posts', postId);
  const commentsColRef = collection(db, 'posts', postId, 'comments');

  try {
    const batch = writeBatch(db);
    const commentTimestamp = serverTimestamp();

    const newCommentRef = doc(commentsColRef); // Auto-generate ID
    const newComment: Omit<Comment, 'id' | 'createdAt'> & { createdAt: Timestamp } = { // Omit id, ensure createdAt is Timestamp for return
      postId,
      text: commentData.text.trim(),
      authorId: commentData.authorId,
      authorName: commentData.authorName,
      authorAvatar: commentData.authorAvatar || null,
      createdAt: commentTimestamp as Timestamp, // Cast for type consistency before commit, Firestore handles it
    };
    batch.set(newCommentRef, newComment); // Firestore will use serverTimestamp here
    batch.update(postRef, { commentsCount: increment(1) });

    await batch.commit();

    const postSnap = await getDoc(postRef); 
    if (postSnap.exists()) {
        const postData = postSnap.data() as Post;
        await revalidatePostPaths(postId, postData.communityId);
    } else {
        await revalidatePostPaths(postId); 
    }
    
    // Construct a Comment object to return for optimistic updates on the client
    const createdComment: Comment = {
      ...newComment,
      id: newCommentRef.id,
      // For optimistic client-side update, convert serverTimestamp to Date, or use a placeholder
      // Firestore Timestamps on the client might need .toDate() after fetch
      // For now, we pass it as is; client can handle. Or use new Date() for immediate display.
      // createdAt: new Date() // Or pass as Timestamp and let client handle
    };

    return { success: true, message: 'Comment added!', commentId: newCommentRef.id, newComment: createdComment };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, message: error.message || 'Could not add comment.' };
  }
}

export async function togglePostSolvedStatus(
  postId: string,
  userId: string
): Promise<{ success: boolean; message: string; isSolved?: boolean }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!postId) {
    return { success: false, message: 'Post ID is missing.' };
  }

  const postRef = doc(db, 'posts', postId);

  try {
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return { success: false, message: 'Post not found.' };
    }

    const postData = postSnap.data() as Post;
    if (postData.authorId !== userId) {
      return { success: false, message: 'Only the post author can mark it as solved.' };
    }

    const newSolvedStatus = !postData.isSolved;
    await updateDoc(postRef, { isSolved: newSolvedStatus });

    await revalidatePostPaths(postId, postData.communityId);

    return {
      success: true,
      message: newSolvedStatus ? 'Post marked as solved.' : 'Post marked as unsolved.',
      isSolved: newSolvedStatus,
    };
  } catch (error: any) {
    console.error('Error toggling post solved status:', error);
    return { success: false, message: error.message || 'Could not update solved status.' };
  }
}

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  // This function is for a one-time fetch if needed,
  // but real-time updates are usually handled client-side with onSnapshot.
  // For now, this can be used by server components if needed, or adapted for client.
  // Real-time fetching is already in `src/services/chatSubscriptionService.ts` (wrong file, should be `firestoreService.ts` or a new one)
  // Let's assume CommentList.tsx will use a client-side subscription.
  // This function might not be strictly necessary if CommentList uses onSnapshot directly.
  // However, if we need to fetch initial comments server-side for PostDetailsPage, this is where it'd go.
  // For now, I'll keep it simple. Real-time is in CommentList.
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(data.createdAt), // Ensure it's a Date object
    } as Comment;
  });
}

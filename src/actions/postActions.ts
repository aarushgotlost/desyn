
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
  query, // Added query
  orderBy, // Added orderBy
  getDocs, // Added getDocs
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Post, Comment } from '@/types/data'; 

async function revalidatePostPaths(postId: string, communityId?: string) {
  revalidatePath(`/posts/${postId}`);
  revalidatePath('/'); 
  if (communityId) {
    revalidatePath(`/communities/${communityId}`); 
  }
  revalidatePath('/profile'); 
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
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likes: increment(-1) });
      newLikesCount = (postData.likes || 0) - 1;
      isLiked = false;
    } else {
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
  userId: string | undefined 
): Promise<{ isLiked: boolean; likesCount: number }> {
  const postRef = doc(db, 'posts', postId);
  
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
    try {
        const postSnapOnError = await getDoc(postRef);
        const likesCountOnError = postSnapOnError.exists() ? (postSnapOnError.data() as Post).likes || 0 : 0;
        return { isLiked: false, likesCount: likesCountOnError };
    } catch (finalError) {
        console.error('Error fetching post data on like status error:', finalError);
        return { isLiked: false, likesCount: 0 };
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
    
    const newCommentRef = doc(commentsColRef); 
    const newCommentForFirestore = { 
      postId,
      text: commentData.text.trim(),
      authorId: commentData.authorId,
      authorName: commentData.authorName,
      authorAvatar: commentData.authorAvatar || null,
      createdAt: serverTimestamp(), // Firestore will handle this
    };
    batch.set(newCommentRef, newCommentForFirestore); 
    batch.update(postRef, { commentsCount: increment(1) });

    await batch.commit();

    const postSnap = await getDoc(postRef); 
    if (postSnap.exists()) {
        const postData = postSnap.data() as Post;
        await revalidatePostPaths(postId, postData.communityId);
    } else {
        await revalidatePostPaths(postId); 
    }
    
    const createdCommentForClient: Comment = {
      ...newCommentForFirestore,
      id: newCommentRef.id,
      createdAt: new Date().toISOString(), // For optimistic client-side update, provide ISO string
    };

    return { success: true, message: 'Comment added!', commentId: newCommentRef.id, newComment: createdCommentForClient };
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
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt as any).toISOString(), 
    } as Comment;
  });
}

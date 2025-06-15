
'use server';

import { db, auth } from '@/lib/firebase'; // Ensure auth is imported if needed for user verification server-side
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
  query, 
  orderBy, 
  getDocs, 
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Post, Comment } from '@/types/data'; 
import { createNotification } from '@/services/notificationService';
import type { NotificationActor } from '@/types/notifications';

async function revalidatePostPaths(postId: string, communityId?: string | null) {
  revalidatePath(`/posts/${postId}`);
  revalidatePath('/'); 
  if (communityId) {
    revalidatePath(`/communities/${communityId}`); 
  }
  revalidatePath('/profile'); 
  revalidatePath('/notifications'); 
}

export interface UpdatePostData {
  title: string;
  description: string;
  codeSnippet?: string | null;
  imageURL?: string | null; // This will be the URL if a new image is uploaded or existing one kept
  tags: string[];
  // communityId and communityName are not editable via this form directly
}


export async function togglePostLike(
  postId: string,
  userId: string,
  likerProfile?: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'> // Added for notifications
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
      // User is unliking
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likes: increment(-1) });
      newLikesCount = (postData.likes || 0) - 1;
      isLiked = false;
    } else {
      // User is liking
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(postRef, { likes: increment(1) });
      newLikesCount = (postData.likes || 0) + 1;
      isLiked = true;

      // Create notification if someone else liked the post
      if (postData.authorId !== userId && likerProfile && likerProfile.uid && likerProfile.displayName) {
        const actor: NotificationActor = {
          id: likerProfile.uid,
          displayName: likerProfile.displayName,
          avatarUrl: likerProfile.photoURL
        };
        await createNotification({
          userId: postData.authorId, // Notify the post author
          type: 'new_like',
          actor,
          message: `${likerProfile.displayName} liked your post: "${postData.title}"`,
          link: `/posts/${postId}`,
          relatedEntityId: postId,
        });
      }
    }
    
    await revalidatePostPaths(postId, postData.communityId);

    return {
      success: true,
      message: isLiked ? 'Post liked!' : 'Post unliked!',
      newLikesCount: Math.max(0, newLikesCount), // Ensure count doesn't go below 0
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
      createdAt: serverTimestamp(), 
    };
    batch.set(newCommentRef, newCommentForFirestore); 
    batch.update(postRef, { commentsCount: increment(1) });

    await batch.commit();

    const postSnap = await getDoc(postRef); 
    if (postSnap.exists()) {
        const postData = postSnap.data() as Post;
        await revalidatePostPaths(postId, postData.communityId);

        // Create notification if someone else commented
        if (postData.authorId !== commentData.authorId && commentData.authorId && commentData.authorName) {
          const actor: NotificationActor = {
            id: commentData.authorId,
            displayName: commentData.authorName,
            avatarUrl: commentData.authorAvatar
          };
          await createNotification({
            userId: postData.authorId, // Notify the post author
            type: 'new_comment',
            actor,
            message: `${commentData.authorName} commented on your post: "${postData.title}"`,
            link: `/posts/${postId}#comment-${newCommentRef.id}`, // Link to post, potentially with fragment for comment
            relatedEntityId: postId,
          });
        }
    } else {
        await revalidatePostPaths(postId); 
    }
    
    const createdCommentForClient: Comment = {
      ...newCommentForFirestore,
      id: newCommentRef.id,
      createdAt: new Date().toISOString(), // Simulate timestamp for client
    };

    return { success: true, message: 'Comment added!', commentId: newCommentRef.id, newComment: createdCommentForClient };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, message: error.message || 'Could not add comment.' };
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

export async function deletePost(
  postId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
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
      return { success: false, message: 'User not authorized to delete this post.' };
    }

    const batch = writeBatch(db);

    // 1. Delete comments subcollection
    const commentsColRef = collection(db, 'posts', postId, 'comments');
    const commentsSnapshot = await getDocs(commentsColRef);
    commentsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

    // 2. Delete likes subcollection
    const likesColRef = collection(db, 'posts', postId, 'likes');
    const likesSnapshot = await getDocs(likesColRef);
    likesSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

    // 3. Delete the post document itself
    batch.delete(postRef);

    await batch.commit();
    
    await revalidatePostPaths(postId, postData.communityId);

    // Optionally, delete related notifications (more complex, might need a Firebase Function)

    return { success: true, message: 'Post deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return { success: false, message: error.message || 'Could not delete post.' };
  }
}


export async function updatePostAction(
  postId: string,
  userId: string,
  updatedData: UpdatePostData,
  newImageFile?: File // Keep newImageFile separate for clarity
): Promise<{ success: boolean; message: string; updatedPost?: Post }> {
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

    const existingPostData = postSnap.data() as Post;
    if (existingPostData.authorId !== userId) {
      return { success: false, message: 'User not authorized to update this post.' };
    }

    const dataToUpdate: Partial<Post> & { updatedAt: Timestamp } = {
      title: updatedData.title,
      description: updatedData.description,
      codeSnippet: updatedData.codeSnippet || null,
      tags: updatedData.tags || [],
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Handle image update
    if (newImageFile) {
      // In a real app, upload to Firebase Storage and get URL
      // For this example, we'll assume newImageFile is a data URL or a placeholder for upload logic
      // This part needs to be handled carefully based on how images are stored (e.g., Firebase Storage)
      // Let's simulate storing a data URL if provided, or you'd integrate actual upload logic.
      const reader = new FileReader(); // This will not work in a server action environment.
                                     // Image upload must happen client-side or via a dedicated backend endpoint.
                                     // For now, assume imageURL is provided if changed, or handled differently.
                                     // Let's assume `updatedData.imageURL` will contain the new URL if image changed,
                                     // or null if removed. The File object itself cannot be processed here.
      // This simulation of FileReader won't work in server actions.
      // dataToUpdate.imageURL = "simulated_upload_url_from_file"; // Placeholder
      console.warn("Image file upload in server action needs client-side pre-upload to a URL or a dedicated endpoint.")
    } 
    
    if (updatedData.imageURL !== undefined) { // If imageURL is explicitly passed in updatedData
        dataToUpdate.imageURL = updatedData.imageURL; // This could be null to remove, or a new URL
    }
    // If updatedData.imageURL is undefined and no newImageFile, existing imageURL is preserved by not including it in dataToUpdate.


    await updateDoc(postRef, dataToUpdate);
    
    const updatedPostSnap = await getDoc(postRef);
    const updatedPostResult = { id: updatedPostSnap.id, ...updatedPostSnap.data() } as Post;
    
    // Ensure date fields are ISO strings for client
    if (updatedPostResult.createdAt && typeof (updatedPostResult.createdAt as any).toDate === 'function') {
      updatedPostResult.createdAt = (updatedPostResult.createdAt as any).toDate().toISOString();
    }
    if (updatedPostResult.updatedAt && typeof (updatedPostResult.updatedAt as any).toDate === 'function') {
      updatedPostResult.updatedAt = (updatedPostResult.updatedAt as any).toDate().toISOString();
    }


    await revalidatePostPaths(postId, existingPostData.communityId);

    return { success: true, message: 'Post updated successfully.', updatedPost: updatedPostResult };
  } catch (error: any) {
    console.error('Error updating post:', error);
    return { success: false, message: error.message || 'Could not update post.' };
  }
}

    
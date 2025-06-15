
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db, app } from '@/lib/firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseUserProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bannerURL?: string | null;
  bio?: string;
  techStack?: string[];
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt?: string; // ISO string
  lastLogin?: string; // ISO string
  updatedAt?: string; // ISO string
  followersCount?: number;
  followingCount?: number;
}

interface UpdateProfileData {
  displayName?: string;
  photoDataUrl?: string | null; // Can be a new data URL or an existing URL string, or null to remove
  bannerDataUrl?: string | null; // Can be a new data URL or an existing URL string, or null to remove
  bio?: string;
  techStack?: string[];
  onboardingCompleted?: boolean;
}

interface CreateCommunityData {
  name: string;
  iconFile?: File; // File object for new uploads
  description: string;
  tags: string[];
}

interface CreatePostData {
  title: string;
  communityId?: string | null;
  communityName?: string | null;
  description: string;
  codeSnippet?: string;
  imageFile?: File; // File object for new uploads
  tags: string[];
}


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, interests?: string[]) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateCurrentProfile: (data: UpdateProfileData) => Promise<void>;
  createCommunity: (data: CreateCommunityData) => Promise<string>;
  createPost: (data: CreatePostData) => Promise<string>;
  deleteCurrentUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function is not used in this iteration, image handling is direct data URLs.
// const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
//   const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
//   const storage = getStorage(app);
//   const fileRef = storageRef(storage, path);
//   await uploadBytes(fileRef, file);
//   return getDownloadURL(fileRef);
// };


const processUserProfileFromFirestore = (docSnapData: any, uid: string): UserProfile => {
    const profileData = { ...docSnapData };
    const dateFields: (keyof UserProfile)[] = ['createdAt', 'lastLogin', 'updatedAt'];
    dateFields.forEach(field => {
      const val = profileData[field];
      if (val && typeof (val as Timestamp).toDate === 'function') {
        profileData[field] = (val as Timestamp).toDate().toISOString();
      } else if (val instanceof Date) {
        profileData[field] = val.toISOString();
      } else if (typeof val === 'string') {
        // Attempt to parse if it's a string, otherwise keep as is
        try {
            profileData[field] = new Date(val).toISOString();
        } catch (e) { /* keep original string if not parsable */ }
      }
    });
    return {
      uid: uid,
      email: profileData.email || null,
      displayName: profileData.displayName || null,
      photoURL: profileData.photoURL || null,
      bannerURL: profileData.bannerURL || null,
      bio: profileData.bio || '',
      techStack: profileData.techStack || [],
      interests: profileData.interests || [],
      onboardingCompleted: typeof profileData.onboardingCompleted === 'boolean' ? profileData.onboardingCompleted : false,
      createdAt: profileData.createdAt, // Should be ISO string now
      lastLogin: profileData.lastLogin, // Should be ISO string now
      updatedAt: profileData.updatedAt, // Should be ISO string now
      followersCount: profileData.followersCount || 0,
      followingCount: profileData.followingCount || 0,
    };
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Set loading true at the start of auth state change
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const fetchedProfile = processUserProfileFromFirestore(userDocSnap.data(), firebaseUser.uid);
          setUserProfile(fetchedProfile);
          // Update lastLogin without necessarily re-fetching the whole profile for this minor update
          await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          // Create new user profile
          const initialPhotoURL = firebaseUser.photoURL;
          const newProfileData: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: initialPhotoURL,
            bannerURL: null,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(), // For immediate client use
            lastLogin: new Date().toISOString(),  // For immediate client use
            followersCount: 0,
            followingCount: 0,
            bio: '',
            techStack: [],
            interests: [],
          };
          await setDoc(userDocRef, {
            ...newProfileData,
            createdAt: serverTimestamp(), // Firestore server timestamp for DB
            lastLogin: serverTimestamp(),  // Firestore server timestamp for DB
          });
          setUserProfile(newProfileData);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false); // Set loading false after all processing is done
    });

    return () => unsubscribe();
  }, []); // Removed router from dependencies as it's stable


  const createUserProfileDocument = async (
    firebaseUser: FirebaseUser,
    additionalData: Partial<UserProfile> = {}
  ): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: additionalData.displayName || firebaseUser.displayName || 'New User',
        photoURL: additionalData.photoURL !== undefined ? additionalData.photoURL : firebaseUser.photoURL,
        bannerURL: additionalData.bannerURL || null,
        bio: additionalData.bio || '',
        techStack: additionalData.techStack || [],
        interests: additionalData.interests || [],
        onboardingCompleted: additionalData.onboardingCompleted || false,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(), // For immediate use
        lastLogin: new Date().toISOString(), // For immediate use
      };
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      setUserProfile(newProfile); // Update context state
      return newProfile;
    } else {
      // Profile exists, ensure it's up-to-date in context
      const existingProfile = processUserProfileFromFirestore(userDocSnap.data(), firebaseUser.uid);
      setUserProfile(existingProfile);
      await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
      return existingProfile;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const currentProfile = await createUserProfileDocument(result.user, {
          photoURL: result.user.photoURL,
          displayName: result.user.displayName,
        });
        if (!currentProfile.onboardingCompleted) {
             router.push('/onboarding/profile-setup');
        } else {
            router.push('/');
        }
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      // Rethrow to be caught by UI form if necessary
      throw error;
    } finally {
      // setLoading(false); // Auth state change listener will handle final loading state
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, interests: string[] = []) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await sendEmailVerification(result.user);
        await updateFirebaseUserProfile(result.user, { displayName: name });
        await createUserProfileDocument(result.user, { displayName: name, interests, onboardingCompleted: false, photoURL: null, bannerURL: null });
        router.push('/onboarding/profile-setup');
      }
    } catch (error) {
      console.error("Error signing up: ", error);
      throw error;
    } finally {
      // setLoading(false); // Auth state change listener handles loading
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
       if (result.user) {
        const currentProfile = await createUserProfileDocument(result.user); // Ensures profile exists and is loaded
        if (!currentProfile.onboardingCompleted) {
            router.push('/onboarding/profile-setup');
        } else {
            router.push('/');
        }
      }
    } catch (error) {
      console.error("Error signing in: ", error);
      throw error;
    } finally {
       // setLoading(false); // Auth state change listener handles loading
    }
  };

  const logout = async () => {
    try {
      // setLoading(true); // onAuthStateChanged will handle this
      await signOut(auth);
      // setUser(null); // Handled by onAuthStateChanged
      // setUserProfile(null); // Handled by onAuthStateChanged
      router.push('/login'); // Explicit redirect
    } catch (error) {
      console.error("Error signing out: ", error);
      throw error;
    } finally {
        // setLoading(false); // Handled by onAuthStateChanged
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email: ", error);
      throw error;
    }
  };

  const updateCurrentProfile = async (data: UpdateProfileData) => {
    if (!user) throw new Error("User not authenticated for profile update");
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updateForFirestore: Partial<UserProfile & {updatedAt: Timestamp}> = {
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (data.displayName !== undefined) updateForFirestore.displayName = data.displayName;
      if (data.bio !== undefined) updateForFirestore.bio = data.bio;
      if (data.techStack !== undefined) updateForFirestore.techStack = data.techStack;
      if (data.onboardingCompleted !== undefined) updateForFirestore.onboardingCompleted = data.onboardingCompleted;
      if (data.photoDataUrl !== undefined) updateForFirestore.photoURL = data.photoDataUrl;
      if (data.bannerDataUrl !== undefined) updateForFirestore.bannerURL = data.bannerDataUrl;

      await updateDoc(userDocRef, updateForFirestore);

      // Update Firebase Auth profile if displayName or photoURL changed
      if (auth.currentUser) {
        const authUpdates: { displayName?: string; photoURL?: string | null } = {};
        if (data.displayName !== undefined && data.displayName !== auth.currentUser.displayName) {
          authUpdates.displayName = data.displayName;
        }
        // Only update Firebase Auth photoURL if it's a non-data URL string or null to remove
        if (data.photoDataUrl !== undefined) {
            if (data.photoDataUrl === null && auth.currentUser.photoURL !== null) {
                authUpdates.photoURL = null;
            } else if (typeof data.photoDataUrl === 'string' && !data.photoDataUrl.startsWith('data:') && data.photoDataUrl !== auth.currentUser.photoURL) {
                authUpdates.photoURL = data.photoDataUrl;
            }
        }


        if (Object.keys(authUpdates).length > 0) {
          await updateFirebaseUserProfile(auth.currentUser, authUpdates);
        }
      }

      // Re-fetch and update local userProfile state
      const updatedDocSnap = await getDoc(userDocRef);
      if (updatedDocSnap.exists()) {
        setUserProfile(processUserProfileFromFirestore(updatedDocSnap.data(), user.uid));
      }
    } catch (error) {
      console.error("Error updating profile: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createCommunity = async (data: CreateCommunityData): Promise<string> => {
    if (!user || !userProfile) throw new Error("User not authenticated or profile missing");
    setLoading(true);
    try {
      const communityColRef = collection(db, 'communities');
      const communityPayload: { [key: string]: any } = {
        name: data.name,
        description: data.description,
        tags: data.tags,
        createdBy: user.uid,
        memberCount: 1,
        members: [user.uid],
        createdAt: serverTimestamp(),
        iconURL: null, 
      };

      if (data.iconFile) { // Assuming iconFile is a File object
        const reader = new FileReader();
        communityPayload.iconURL = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(data.iconFile!);
        });
      }

      const newCommunityDocRef = await addDoc(communityColRef, communityPayload);
      return newCommunityDocRef.id;
    } catch (error) {
      console.error("Error creating community: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (data: CreatePostData): Promise<string> => {
    if (!user || !userProfile) throw new Error("User not authenticated or profile missing");
    setLoading(true);

    try {
      const postColRef = collection(db, 'posts');
      const postPayload: { [key: string]: any } = {
        title: data.title,
        communityId: data.communityId || null,
        communityName: data.communityName || null,
        description: data.description,
        codeSnippet: data.codeSnippet || null,
        tags: data.tags,
        authorId: user.uid,
        authorName: userProfile.displayName || "Anonymous",
        authorAvatar: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        commentsCount: 0,
        imageURL: null, 
      };

      if (data.imageFile) { // Assuming imageFile is a File object
         const reader = new FileReader();
         postPayload.imageURL = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(data.imageFile!);
        });
      }

      const newPostDocRef = await addDoc(postColRef, postPayload);
      return newPostDocRef.id;
    } catch (error) {
      console.error("Error creating post: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const deleteCurrentUserAccount = async () => {
    if (!user) throw new Error("User not authenticated.");
    try {
      setLoading(true); // Indicate process start
      // Firestore data deletion is handled by a server action called from settings page
      await user.delete(); // This will trigger onAuthStateChanged
      // No need to setUser(null) or router.push here, onAuthStateChanged will handle it
    } catch (error: any) {
      console.error("Error deleting Firebase Auth user:", error);
      setLoading(false); // Reset loading on error
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("This operation is sensitive and requires recent authentication. Please log out and log back in, then try again.");
      }
      throw error;
    } 
    // setLoading(false) is handled by onAuthStateChanged if successful
  };


  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout,
      sendPasswordReset,
      updateCurrentProfile,
      createCommunity,
      createPost,
      deleteCurrentUserAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

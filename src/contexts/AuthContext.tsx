
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bio?: string;
  techStack?: string[];
  interests?: string[];
  onboardingCompleted: boolean; // New flag
  createdAt?: any;
  lastLogin?: any;
  // Add other profile fields as needed
}

interface CreateCommunityData {
  name: string;
  iconURL?: string;
  description: string;
  tags: string[];
}

interface CreatePostData {
  title: string;
  communityId: string;
  communityName: string;
  description: string;
  codeSnippet?: string;
  imageURL?: string;
  tags: string[];
}


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, interests?: string[], photoURL?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateCurrentProfile: (data: Partial<UserProfile>) => Promise<void>; // New function
  createCommunity: (data: CreateCommunityData) => Promise<string>;
  createPost: (data: CreatePostData) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // This case should ideally be handled by createUserProfileDocument
          // but as a fallback:
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            onboardingCompleted: false, // Default for absolutely new user
          };
          await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
          setUserProfile(newUserProfile);
        }
        // Update last login timestamp
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });

      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserProfileDocument = async (firebaseUser: FirebaseUser, additionalData: Partial<UserProfile> = {}) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const { email, displayName, photoURL } = firebaseUser;
      const profileData: UserProfile = {
        uid: firebaseUser.uid,
        email,
        displayName: additionalData.displayName || displayName,
        photoURL: additionalData.photoURL || photoURL,
        bio: additionalData.bio || '',
        techStack: additionalData.techStack || [],
        interests: additionalData.interests || [],
        onboardingCompleted: additionalData.onboardingCompleted || false, // Ensure this is set
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        ...additionalData,
      };
      try {
        await setDoc(userDocRef, profileData);
        setUserProfile(profileData);
      } catch (error) {
        console.error("Error creating user profile: ", error);
        throw error; 
      }
    } else {
       const existingProfile = userDocSnap.data() as UserProfile;
        // If onboardingCompleted is not set, default to false
        if (typeof existingProfile.onboardingCompleted === 'undefined') {
            existingProfile.onboardingCompleted = false;
            await setDoc(userDocRef, { onboardingCompleted: false }, { merge: true });
        }
       setUserProfile(existingProfile);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await createUserProfileDocument(result.user);
        // AuthGuard will handle redirection based on onboardingCompleted status
        if (!userProfile?.onboardingCompleted) {
             router.push('/onboarding/profile-setup');
        } else {
            router.push('/');
        }
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const signUpWithEmail = async (email: string, password: string, name: string, interests: string[] = [], photoURL?: string) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await createUserProfileDocument(result.user, { displayName: name, interests, photoURL, onboardingCompleted: false });
        router.push('/onboarding/profile-setup'); 
      }
    } catch (error) {
      console.error("Error signing up: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
       if (result.user) {
        // Fetch profile to check onboarding status
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const profile = userDocSnap.data() as UserProfile;
            setUserProfile(profile); // update local state
            if (!profile.onboardingCompleted) {
                router.push('/onboarding/profile-setup');
            } else {
                router.push('/');
            }
        } else {
            // Should not happen if signup creates profile, but handle defensively
            await createUserProfileDocument(result.user, { onboardingCompleted: false });
            router.push('/onboarding/profile-setup');
        }
      }
    } catch (error) {
      console.error("Error signing in: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      throw error;
    } finally {
      // setLoading(false); // State will reset on navigation
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

  const updateCurrentProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("User not authenticated for profile update");
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const profileDataToUpdate = {
        ...data,
        techStack: typeof data.techStack === 'string' ? (data.techStack as unknown as string).split(',').map(s => s.trim()).filter(s => s) : data.techStack,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(userDocRef, profileDataToUpdate);
      const updatedDoc = await getDoc(userDocRef);
      if (updatedDoc.exists()) {
        setUserProfile(updatedDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error updating profile: ", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createCommunity = async (data: CreateCommunityData): Promise<string> => {
    if (!user) throw new Error("User not authenticated");
    try {
      const communityColRef = collection(db, 'communities');
      const newCommunityDocRef = await addDoc(communityColRef, {
        ...data,
        createdBy: user.uid,
        memberCount: 1, 
        members: [user.uid], 
        createdAt: serverTimestamp(),
      });
      return newCommunityDocRef.id;
    } catch (error) {
      console.error("Error creating community: ", error);
      throw error;
    }
  };

  const createPost = async (data: CreatePostData): Promise<string> => {
    if (!user || !userProfile) throw new Error("User not authenticated or profile missing");
    
    let communityName = data.communityName;
    if (!communityName) {
        const communityDocRef = doc(db, 'communities', data.communityId);
        const communitySnap = await getDoc(communityDocRef);
        if (communitySnap.exists()) {
            communityName = communitySnap.data()?.name;
        } else {
            throw new Error("Community not found");
        }
    }

    try {
      const postColRef = collection(db, 'posts');
      const newPostDocRef = await addDoc(postColRef, {
        ...data,
        communityName, 
        authorId: user.uid,
        authorName: userProfile.displayName || "Anonymous",
        authorAvatar: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        commentsCount: 0,
        isSolved: false,
      });
      return newPostDocRef.id;
    } catch (error) {
      console.error("Error creating post: ", error);
      throw error;
    }
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
      createPost
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


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
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bio?: string;
  techStack?: string[];
  interests?: string[];
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
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
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
        ...additionalData,
      };
      try {
        await setDoc(userDocRef, { ...profileData, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
        setUserProfile(profileData);
      } catch (error) {
        console.error("Error creating user profile: ", error);
        throw error; // re-throw to be caught by caller
      }
    } else {
       setUserProfile(userDocSnap.data() as UserProfile);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await createUserProfileDocument(result.user);
         // Check if it's a new user (creation time equals last sign-in time)
        if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
            router.push('/onboarding');
        } else {
            router.push('/');
        }
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      // Handle error (e.g., show toast notification by throwing)
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
        await createUserProfileDocument(result.user, { displayName: name, interests, photoURL });
        router.push('/onboarding'); // Redirect new sign-ups to onboarding
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
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
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
      // No setLoading(false) here as the component will unmount or AuthGuard will take over
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

  const createCommunity = async (data: CreateCommunityData): Promise<string> => {
    if (!user) throw new Error("User not authenticated");
    try {
      const communityColRef = collection(db, 'communities');
      const newCommunityDocRef = await addDoc(communityColRef, {
        ...data,
        createdBy: user.uid,
        memberCount: 1, // Creator is the first member
        members: [user.uid], // Store member UIDs
        createdAt: serverTimestamp(),
      });
      // Optionally, add community to user's joined communities list in user profile
      // const userDocRef = doc(db, 'users', user.uid);
      // await updateDoc(userDocRef, {
      //   joinedCommunities: arrayUnion(newCommunityDocRef.id)
      // });
      return newCommunityDocRef.id;
    } catch (error) {
      console.error("Error creating community: ", error);
      throw error;
    }
  };

  const createPost = async (data: CreatePostData): Promise<string> => {
    if (!user || !userProfile) throw new Error("User not authenticated or profile missing");
    
    // Ensure communityName is present, if not, fetch it (though passed from client now)
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
        communityName, // Storing denormalized name
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

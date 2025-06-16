
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
  deleteUser as deleteFirebaseAuthUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore'; // Added arrayUnion
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bannerURL?: string | null;
  bio?: string;
  skills?: string[]; // Renamed from techStack
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt?: string; 
  lastLogin?: string; 
  updatedAt?: string; 
  followersCount?: number;
  followingCount?: number;
  fcmTokens?: string[]; 
}

interface UpdateProfileData {
  displayName?: string;
  photoDataUrl?: string | null; 
  bannerDataUrl?: string | null; 
  bio?: string;
  skills?: string[]; // Renamed from techStack
  onboardingCompleted?: boolean;
  newFcmToken?: string; 
}

interface CreateCommunityData {
  name: string;
  iconFile?: File; 
  description: string;
  tags: string[];
}

interface CreatePostData {
  title: string;
  communityId?: string | null;
  communityName?: string | null;
  description: string;
  codeSnippet?: string;
  imageFile?: File; 
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
      skills: profileData.skills || [], // Updated from techStack
      interests: profileData.interests || [],
      onboardingCompleted: typeof profileData.onboardingCompleted === 'boolean' ? profileData.onboardingCompleted : false,
      createdAt: profileData.createdAt, 
      lastLogin: profileData.lastLogin, 
      updatedAt: profileData.updatedAt, 
      followersCount: profileData.followersCount || 0,
      followingCount: profileData.followingCount || 0,
      fcmTokens: profileData.fcmTokens || [], 
    };
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); 
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const fetchedProfile = processUserProfileFromFirestore(userDocSnap.data(), firebaseUser.uid);
          setUserProfile(fetchedProfile);
          await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          const initialPhotoURL = firebaseUser.photoURL;
          const newProfileData: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: initialPhotoURL,
            bannerURL: null,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(), 
            lastLogin: new Date().toISOString(),  
            followersCount: 0,
            followingCount: 0,
            bio: '',
            skills: [], // Updated from techStack
            interests: [],
            fcmTokens: [], 
          };
          await setDoc(userDocRef, {
            ...newProfileData,
            createdAt: serverTimestamp(), 
            lastLogin: serverTimestamp(),  
          });
          setUserProfile(newProfileData);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []); 


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
        skills: additionalData.skills || [], // Updated from techStack
        interests: additionalData.interests || [],
        onboardingCompleted: additionalData.onboardingCompleted || false,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(), 
        lastLogin: new Date().toISOString(), 
        fcmTokens: additionalData.fcmTokens || [], 
      };
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      setUserProfile(newProfile); 
      return newProfile;
    } else {
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
      throw error;
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
    } 
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
       if (result.user) {
        const currentProfile = await createUserProfileDocument(result.user); 
        if (!currentProfile.onboardingCompleted) {
            router.push('/onboarding/profile-setup');
        } else {
            router.push('/');
        }
      }
    } catch (error) {
      console.error("Error signing in: ", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); 
    } catch (error) {
      console.error("Error signing out: ", error);
      throw error;
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
      const updateForFirestore: Partial<UserProfile & {updatedAt: Timestamp; fcmTokens?: any}> = { 
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (data.displayName !== undefined) updateForFirestore.displayName = data.displayName;
      if (data.bio !== undefined) updateForFirestore.bio = data.bio;
      if (data.skills !== undefined) updateForFirestore.skills = data.skills; // Updated from techStack
      if (data.onboardingCompleted !== undefined) updateForFirestore.onboardingCompleted = data.onboardingCompleted;
      if (data.photoDataUrl !== undefined) updateForFirestore.photoURL = data.photoDataUrl;
      if (data.bannerDataUrl !== undefined) updateForFirestore.bannerURL = data.bannerDataUrl;
      if (data.newFcmToken) {
        updateForFirestore.fcmTokens = arrayUnion(data.newFcmToken);
      }


      await updateDoc(userDocRef, updateForFirestore);

      if (auth.currentUser) {
        const authUpdates: { displayName?: string; photoURL?: string | null } = {};
        if (data.displayName !== undefined && data.displayName !== auth.currentUser.displayName) {
          authUpdates.displayName = data.displayName;
        }
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

      if (data.iconFile) { 
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

      if (data.imageFile) { 
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
      setLoading(true); 
      await deleteFirebaseAuthUser(user); 
    } catch (error: any) {
      console.error("Error deleting Firebase Auth user:", error);
      setLoading(false); 
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("This operation is sensitive and requires recent authentication. Please log out and log back in, then try again.");
      }
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

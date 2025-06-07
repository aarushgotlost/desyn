
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
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation'; // Added missing import

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; 
  bio?: string;
  techStack?: string[];
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt?: Timestamp | Date;
  lastLogin?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  followersCount?: number;
  followingCount?: number;
}

interface UpdateProfileData {
  displayName?: string;
  photoDataUrl?: string | null; 
  bio?: string;
  techStack?: string[];
  onboardingCompleted?: boolean;
}

interface CreateCommunityData {
  name: string;
  iconFile?: File; 
  description: string;
  tags: string[];
}

interface CreatePostData {
  title: string;
  communityId: string;
  communityName: string;
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
  signUpWithEmail: (email: string, password: string, name: string, interests?: string[], photoURL?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateCurrentProfile: (data: UpdateProfileData) => Promise<void>;
  createCommunity: (data: CreateCommunityData) => Promise<string>;
  createPost: (data: CreatePostData) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
  const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage(app);
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};


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
          const profileData = userDocSnap.data() as UserProfile;
          if (typeof profileData.onboardingCompleted === 'undefined') {
            profileData.onboardingCompleted = false;
          }
          // Ensure follower/following counts exist
          profileData.followersCount = profileData.followersCount || 0;
          profileData.followingCount = profileData.followingCount || 0;
          setUserProfile(profileData);
        } else {
          const initialPhotoURL = firebaseUser.photoURL;
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: initialPhotoURL,
            onboardingCompleted: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            followersCount: 0,
            followingCount: 0,
          };
          await setDoc(userDocRef, newUserProfile);
          setUserProfile(newUserProfile);
        }
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

    let profileData: UserProfile;

    if (!userDocSnap.exists()) {
      const { email, displayName } = firebaseUser;
      const initialPhotoURL = additionalData.photoURL !== undefined ? additionalData.photoURL : firebaseUser.photoURL;

      profileData = {
        uid: firebaseUser.uid,
        email,
        displayName: additionalData.displayName || displayName,
        photoURL: initialPhotoURL,
        bio: additionalData.bio || '',
        techStack: additionalData.techStack || [],
        interests: additionalData.interests || [],
        onboardingCompleted: additionalData.onboardingCompleted || false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        followersCount: 0, // Initialize
        followingCount: 0, // Initialize
        ...additionalData,
      };
      try {
        await setDoc(userDocRef, profileData);
      } catch (error) {
        console.error("Error creating user profile: ", error);
        throw error;
      }
    } else {
       profileData = userDocSnap.data() as UserProfile;
        if (typeof profileData.onboardingCompleted === 'undefined') {
            profileData.onboardingCompleted = false; 
            await setDoc(userDocRef, { onboardingCompleted: false, lastLogin: serverTimestamp() }, { merge: true });
        } else {
            await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        }
        // Ensure counts exist if fetching an older profile
        profileData.followersCount = profileData.followersCount || 0;
        profileData.followingCount = profileData.followingCount || 0;
    }
    setUserProfile(profileData); 
    return profileData; 
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const currentProfile = await createUserProfileDocument(result.user, {
          photoURL: result.user.photoURL,
          displayName: result.user.displayName
        });

        if (currentProfile && !currentProfile.onboardingCompleted) {
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

  const signUpWithEmail = async (email: string, password: string, name: string, interests: string[] = []) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateFirebaseUserProfile(result.user, { displayName: name }); 
        await createUserProfileDocument(result.user, { displayName: name, interests, onboardingCompleted: false, photoURL: null, followersCount: 0, followingCount: 0 });
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
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const profile = userDocSnap.data() as UserProfile;
             if (typeof profile.onboardingCompleted === 'undefined') {
                profile.onboardingCompleted = false; 
            }
            profile.followersCount = profile.followersCount || 0;
            profile.followingCount = profile.followingCount || 0;
            setUserProfile(profile); 
            if (!profile.onboardingCompleted) {
                router.push('/onboarding/profile-setup');
            } else {
                router.push('/');
            }
        } else {
            const profile = await createUserProfileDocument(result.user, { onboardingCompleted: false });
            if (!profile.onboardingCompleted) {
                 router.push('/onboarding/profile-setup');
            } else {
                router.push('/');
            }
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
      const newFirestorePhotoURL = data.photoDataUrl !== undefined ? data.photoDataUrl : userProfile?.photoURL;

      const profileUpdateForFirestore: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio,
        techStack: data.techStack,
        photoURL: newFirestorePhotoURL, 
        onboardingCompleted: data.onboardingCompleted,
        updatedAt: serverTimestamp(),
      };

      Object.keys(profileUpdateForFirestore).forEach(key => {
        const typedKey = key as keyof Partial<UserProfile>;
        if (profileUpdateForFirestore[typedKey] === undefined) {
          delete profileUpdateForFirestore[typedKey];
        }
      });

      await updateDoc(userDocRef, profileUpdateForFirestore);

      if (auth.currentUser) {
        const updatesForFirebaseAuth: { displayName?: string; photoURL?: string | null } = {};
        let needsFirebaseAuthUpdate = false;

        if (data.displayName !== undefined && data.displayName !== auth.currentUser.displayName) {
          updatesForFirebaseAuth.displayName = data.displayName;
          needsFirebaseAuthUpdate = true;
        }
        
        // Only update Firebase Auth photoURL if user explicitly REMOVES the photo
        // Do NOT attempt to set a Data URL to Firebase Auth photoURL
        if (data.photoDataUrl === null && auth.currentUser.photoURL !== null) {
            updatesForFirebaseAuth.photoURL = null;
            needsFirebaseAuthUpdate = true;
        }
        
        if (needsFirebaseAuthUpdate) {
          await updateFirebaseUserProfile(auth.currentUser, updatesForFirebaseAuth);
        }
      }

      const updatedDoc = await getDoc(userDocRef);
      if (updatedDoc.exists()) {
        const updatedProfileData = updatedDoc.data() as UserProfile;
        updatedProfileData.followersCount = updatedProfileData.followersCount || 0;
        updatedProfileData.followingCount = updatedProfileData.followingCount || 0;
        setUserProfile(updatedProfileData);
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
    setLoading(true);
    try {
      let iconStorageURL: string | null = null;
      if (data.iconFile) {
        const filePath = `community_icons/${user.uid}/${Date.now()}_${data.iconFile.name}`;
        iconStorageURL = await uploadImageToStorage(data.iconFile, filePath);
      }

      const communityColRef = collection(db, 'communities');
      const communityPayload: { [key: string]: any } = {
        name: data.name,
        description: data.description,
        tags: data.tags,
        createdBy: user.uid,
        memberCount: 1,
        members: [user.uid],
        createdAt: serverTimestamp(),
        iconURL: iconStorageURL,
      };

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

    let communityName = data.communityName;
    if (!communityName && data.communityId) {
        const communityDocRef = doc(db, 'communities', data.communityId);
        const communitySnap = await getDoc(communityDocRef);
        if (communitySnap.exists()) {
            communityName = communitySnap.data()?.name;
        } else {
            console.error("Community not found for ID:", data.communityId);
            throw new Error("Community not found");
        }
    }

    try {
      let imageStorageURL: string | null = null;
      if (data.imageFile) {
        const filePath = `post_images/${user.uid}/${Date.now()}_${data.imageFile.name}`;
        imageStorageURL = await uploadImageToStorage(data.imageFile, filePath);
      }

      const postColRef = collection(db, 'posts');
      const postPayload: { [key: string]: any } = {
        title: data.title,
        communityId: data.communityId,
        communityName,
        description: data.description,
        codeSnippet: data.codeSnippet || null,
        tags: data.tags,
        authorId: user.uid,
        authorName: userProfile.displayName || "Anonymous",
        authorAvatar: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        likes: 0,
        commentsCount: 0,
        isSolved: false,
        imageURL: imageStorageURL,
      };

      const newPostDocRef = await addDoc(postColRef, postPayload);
      return newPostDocRef.id;
    } catch (error) {
      console.error("Error creating post: ", error);
      throw error;
    } finally {
      setLoading(false);
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

    


"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db, app } from '@/lib/firebase'; // Added app for storage
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
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // Firebase Storage imports
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; // This will store the download URL from Firebase Storage
  bio?: string;
  techStack?: string[];
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt?: any;
  lastLogin?: any;
}

// Data for creating/updating, accepting File objects
interface UpdateProfileData {
  displayName?: string;
  photoFile?: File; // Changed from photoURL
  bio?: string;
  techStack?: string[]; // Keep as string[], form will handle comma-separated input
  onboardingCompleted?: boolean;
}

interface CreateCommunityData {
  name: string;
  iconFile?: File; // Changed from iconURL
  description: string;
  tags: string[];
}

interface CreatePostData {
  title: string;
  communityId: string;
  communityName: string;
  description: string;
  codeSnippet?: string;
  imageFile?: File; // Changed from imageURL
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

// Helper function to upload image to Firebase Storage
const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
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
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL, // Keep initial if from Google/Social
            onboardingCompleted: false, 
          };
          await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
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
        onboardingCompleted: additionalData.onboardingCompleted || false,
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
        // Pass photoURL from Google to createUserProfileDocument
        await createUserProfileDocument(result.user, { photoURL: result.user.photoURL });
        
        // Fetch the possibly newly created or existing profile to check onboarding status
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const currentProfile = userDocSnap.data() as UserProfile | undefined;

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
  
  const signUpWithEmail = async (email: string, password: string, name: string, interests: string[] = [], photoURL?: string) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        // photoURL here is if we were passing a URL, but we'll handle file uploads in profile setup
        await createUserProfileDocument(result.user, { displayName: name, interests, onboardingCompleted: false });
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
            setUserProfile(profile); 
            if (!profile.onboardingCompleted) {
                router.push('/onboarding/profile-setup');
            } else {
                router.push('/');
            }
        } else {
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
      let uploadedPhotoURL = userProfile?.photoURL; // Keep existing if no new file

      if (data.photoFile) {
        // Delete old profile picture if it exists and is a Firebase Storage URL
        if (userProfile?.photoURL && userProfile.photoURL.includes('firebasestorage.googleapis.com')) {
            try {
                const oldFileRef = storageRef(getStorage(app), userProfile.photoURL);
                await deleteObject(oldFileRef);
            } catch (deleteError: any) {
                // Non-fatal, log it. User might have manually deleted or it's not a storage URL.
                console.warn("Could not delete old profile picture:", deleteError.message);
            }
        }
        const filePath = `profile_pictures/${user.uid}/${Date.now()}_${data.photoFile.name}`;
        uploadedPhotoURL = await uploadImageToStorage(data.photoFile, filePath);
      }

      const profileDataToUpdate: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio,
        techStack: typeof data.techStack === 'string' 
            ? (data.techStack as unknown as string).split(',').map(s => s.trim()).filter(s => s) 
            : data.techStack,
        photoURL: uploadedPhotoURL,
        onboardingCompleted: data.onboardingCompleted,
        updatedAt: serverTimestamp(),
      };
      
      // Remove undefined fields to avoid overwriting with undefined in Firestore
      Object.keys(profileDataToUpdate).forEach(key => profileDataToUpdate[key as keyof Partial<UserProfile>] === undefined && delete profileDataToUpdate[key as keyof Partial<UserProfile>]);


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
    setLoading(true);
    try {
      let iconStorageURL: string | undefined = undefined;
      if (data.iconFile) {
        const filePath = `community_icons/${user.uid}/${Date.now()}_${data.iconFile.name}`;
        iconStorageURL = await uploadImageToStorage(data.iconFile, filePath);
      }

      const communityColRef = collection(db, 'communities');
      const newCommunityDocRef = await addDoc(communityColRef, {
        name: data.name,
        iconURL: iconStorageURL,
        description: data.description,
        tags: data.tags,
        createdBy: user.uid,
        memberCount: 1, 
        members: [user.uid], 
        createdAt: serverTimestamp(),
      });
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
    if (!communityName && data.communityId) { // Ensure communityId is present
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
      let imageStorageURL: string | undefined = undefined;
      if (data.imageFile) {
        const filePath = `post_images/${user.uid}/${Date.now()}_${data.imageFile.name}`;
        imageStorageURL = await uploadImageToStorage(data.imageFile, filePath);
      }

      const postColRef = collection(db, 'posts');
      const newPostDocRef = await addDoc(postColRef, {
        title: data.title,
        communityId: data.communityId,
        communityName, 
        description: data.description,
        codeSnippet: data.codeSnippet,
        imageURL: imageStorageURL,
        tags: data.tags,
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


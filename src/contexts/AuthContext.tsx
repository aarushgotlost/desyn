
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
  updateProfile as updateFirebaseUserProfile, // To update Firebase Auth user's displayName/photoURL
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, DocumentReference, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; 
  bio?: string;
  techStack?: string[];
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt?: Timestamp | Date; // Allow both for flexibility
  lastLogin?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface UpdateProfileData {
  displayName?: string;
  photoFile?: File; 
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
           // Ensure onboardingCompleted is explicitly boolean
          if (typeof profileData.onboardingCompleted === 'undefined') {
            profileData.onboardingCompleted = false; 
          }
          setUserProfile(profileData);
        } else {
          // This case should ideally be handled during sign-up/Google sign-in
          // But as a fallback, create a basic profile.
          const newUserProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL, 
            onboardingCompleted: false, 
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };
          await setDoc(userDocRef, newUserProfile);
          setUserProfile(newUserProfile);
        }
        // Update last login irrespective of profile existence
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
      const { email, displayName, photoURL } = firebaseUser;
      profileData = {
        uid: firebaseUser.uid,
        email,
        displayName: additionalData.displayName || displayName,
        photoURL: additionalData.photoURL || photoURL, // Use photoURL from social if available
        bio: additionalData.bio || '',
        techStack: additionalData.techStack || [],
        interests: additionalData.interests || [],
        onboardingCompleted: additionalData.onboardingCompleted || false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        ...additionalData, // Spread additionalData last to override if needed
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
    }
    setUserProfile(profileData); // Set userProfile state
    return profileData; // Return the profile data
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const currentProfile = await createUserProfileDocument(result.user, { 
          photoURL: result.user.photoURL, // Pass Google's photoURL
          displayName: result.user.displayName // Pass Google's displayName
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
        // Update Firebase Auth user profile immediately with display name
        await updateFirebaseUserProfile(result.user, { displayName: name });
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
             if (typeof profile.onboardingCompleted === 'undefined') {
                profile.onboardingCompleted = false; 
            }
            setUserProfile(profile); 
            if (!profile.onboardingCompleted) {
                router.push('/onboarding/profile-setup');
            } else {
                router.push('/');
            }
        } else {
            // This case might happen if Firestore profile creation failed during signup
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
      // user and userProfile will be set to null by onAuthStateChanged listener
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      throw error;
    } finally {
      // No need to setLoading(false) here if onAuthStateChanged handles it
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
      let uploadedPhotoURL = userProfile?.photoURL || null; 

      if (data.photoFile) {
        if (userProfile?.photoURL && userProfile.photoURL.includes('firebasestorage.googleapis.com')) {
            try {
                const oldFileStorageRef = storageRef(getStorage(app), userProfile.photoURL);
                await deleteObject(oldFileStorageRef);
            } catch (deleteError: any) {
                if (deleteError.code !== 'storage/object-not-found') {
                    console.warn("Could not delete old profile picture:", deleteError.message);
                }
            }
        }
        const filePath = `profile_pictures/${user.uid}/${Date.now()}_${data.photoFile.name}`;
        uploadedPhotoURL = await uploadImageToStorage(data.photoFile, filePath);
      }

      const profileUpdateForFirestore: Partial<UserProfile> = {
        displayName: data.displayName,
        bio: data.bio,
        techStack: data.techStack,
        photoURL: uploadedPhotoURL,
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
      
      // Also update Firebase Auth user's displayName and photoURL if changed
      if (auth.currentUser && (data.displayName !== auth.currentUser.displayName || uploadedPhotoURL !== auth.currentUser.photoURL)) {
        await updateFirebaseUserProfile(auth.currentUser, {
          displayName: data.displayName,
          photoURL: uploadedPhotoURL,
        });
      }
      
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
        iconURL: iconStorageURL, // Will be null if no iconFile
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
        imageURL: imageStorageURL, // Will be null if no imageFile
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

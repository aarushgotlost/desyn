
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const addFriendToAnimationProject = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const ownerId = context.auth.uid;
  const { projectId, friendEmail } = data;

  if (!projectId || typeof projectId !== "string" || projectId.trim() === "") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'projectId'."
    );
  }
  if (!friendEmail || typeof friendEmail !== "string" || friendEmail.trim() === "") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'friendEmail'."
    );
  }

  const projectRef = db.collection("projects").doc(projectId);

  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Project not found.");
    }

    const projectData = projectDoc.data();
    if (!projectData || projectData.ownerId !== ownerId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You must be the owner to add collaborators."
      );
    }

    // Find friend's UID by email
    const userQuerySnapshot = await db
      .collection("users")
      .where("email", "==", friendEmail)
      .limit(1)
      .get();

    if (userQuerySnapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `User with email ${friendEmail} not found.`
      );
    }
    const friendUid = userQuerySnapshot.docs[0].id;
    const friendProfile = userQuerySnapshot.docs[0].data();


    if (projectData.allowedUsers.includes(friendUid)) {
      return {
        success: true,
        message: "User is already a collaborator.",
        collaborator: { uid: friendUid, displayName: friendProfile.displayName, photoURL: friendProfile.photoURL },
      };
    }

    await projectRef.update({
      allowedUsers: admin.firestore.FieldValue.arrayUnion(friendUid),
    });

    // Optionally, send a notification to the new collaborator
    // (Requires notification system setup)

    return {
        success: true,
        message: "Friend added to the project successfully.",
        collaborator: { uid: friendUid, displayName: friendProfile.displayName, photoURL: friendProfile.photoURL },
    };
  } catch (error) {
    console.error("Error in addFriendToAnimationProject:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An internal error occurred while adding a friend to the project."
    );
  }
});

// You can add other Cloud Functions here if needed for other features.

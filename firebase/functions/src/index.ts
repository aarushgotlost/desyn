
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const addFriendToAnimationProject = functions.https.onCall(async (data, context) => {
  const { projectId, collaboratorEmail } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const callerUid = context.auth.uid;

  if (!projectId || !collaboratorEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing projectId or collaboratorEmail."
    );
  }

  try {
    const projectRef = db.collection("animationProjects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Animation project not found.");
    }

    const projectData = projectDoc.data();
    if (!projectData || projectData.ownerId !== callerUid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the project owner can add collaborators."
      );
    }

    // Find collaborator UID by email
    const usersRef = db.collection("users");
    const userQuery = await usersRef.where("email", "==", collaboratorEmail).limit(1).get();

    if (userQuery.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `User with email ${collaboratorEmail} not found.`
      );
    }
    const collaboratorDoc = userQuery.docs[0];
    const collaboratorUid = collaboratorDoc.id;
    const collaboratorProfile = collaboratorDoc.data();


    if (projectData.allowedUsers.includes(collaboratorUid)) {
        return { success: true, message: "User is already a collaborator." };
    }

    await projectRef.update({
      allowedUsers: admin.firestore.FieldValue.arrayUnion(collaboratorUid),
      // Store basic collaborator info for easier display without multiple lookups client-side
      collaborators: admin.firestore.FieldValue.arrayUnion({
        uid: collaboratorUid,
        email: collaboratorProfile.email || null,
        displayName: collaboratorProfile.displayName || null,
        photoURL: collaboratorProfile.photoURL || null,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Collaborator added successfully." };
  } catch (error: any) {
    console.error("Error adding collaborator:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      error.message || "An unexpected error occurred."
    );
  }
});

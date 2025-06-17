
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Adds a friend's UID to the _allowedUsers list of a canvas.
 * Only the owner of the canvas can perform this action.
 *
 * @param data - Object containing { canvasId: string, friendUid: string }
 * @param context - CallableContext containing auth information.
 */
export const addFriendToCanvas = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const callerUid = context.auth.uid;

  // 2. Validate Input Data
  const { canvasId, friendUid } = data;
  if (!canvasId || typeof canvasId !== "string" || !canvasId.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'canvasId'."
    );
  }
  if (!friendUid || typeof friendUid !== "string" || !friendUid.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'friendUid'."
    );
  }

  if (callerUid === friendUid) {
     throw new functions.https.HttpsError(
      "invalid-argument",
      "You cannot add yourself as a collaborator."
    );
  }

  const canvasRef = db.collection("canvases").doc(canvasId);

  try {
    const canvasDoc = await canvasRef.get();

    // 3. Check if Canvas Exists
    if (!canvasDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "The specified canvas does not exist."
      );
    }

    const canvasData = canvasDoc.data();
    if (!canvasData) {
      throw new functions.https.HttpsError(
        "internal",
        "Canvas data is missing."
      );
    }

    // 4. Authorization Check: Ensure the caller is the owner of the canvas.
    if (canvasData._ownerId !== callerUid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You must be the owner of the canvas to add collaborators."
      );
    }

    // 5. Check if friendUid exists as a user (optional but good practice)
    const friendUserRef = db.collection("users").doc(friendUid);
    const friendUserDoc = await friendUserRef.get();
    if (!friendUserDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            `User with UID ${friendUid} does not exist.`
        );
    }

    // 6. Update the _allowedUsers array.
    // arrayUnion ensures the UID is only added if it's not already present.
    await canvasRef.update({
      _allowedUsers: admin.firestore.FieldValue.arrayUnion(friendUid),
      _updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `User ${friendUid} successfully added to canvas ${canvasId}.`,
    };
  } catch (error) {
    console.error("Error in addFriendToCanvas:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred."
    );
  }
});

// You can add more Cloud Functions here.

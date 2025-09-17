const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateUser() {
  await db.collection("users").doc("CTpNaoQ6Y6fCSFacZFRAfLChZzl1").update({
    subscriptionStatus: "active",
    plan: "weekly",
    hasAcceptedTrial: true,
    subscriptionDate: "2024-09-17T20:04:09.000Z",
    updatedAt: "2024-09-17T20:04:09.000Z",
  });

  console.log("✅ User updated!");
}

updateUser();

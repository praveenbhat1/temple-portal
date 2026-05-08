const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to find service account in .env.local or local files
// Since I'm running in the workspace, I'll just use the project ID and initialize with default credentials if possible
// But better to use the one from .env.local if I can parse it.

const email = 'sowkurpraveenbhat@gmail.com';

async function main() {
  try {
    // For local dev, if we are logged in via CLI, we can sometimes just use this
    // But since I'm an agent, I'll try to use the project ID directly
    admin.initializeApp({
      projectId: 'revora-2f62e'
    });

    const db = admin.firestore();
    await db.collection('admins').doc('primary').set({
      email: email,
      role: 'superadmin',
      addedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully added ${email} as admin in Firestore.`);
  } catch (error) {
    console.error('Error adding admin:', error);
    process.exit(1);
  }
}

main();

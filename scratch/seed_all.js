import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { SEVA_DATA } from "../lib/sevaData";

const firebaseConfig = {
  apiKey: "AIzaSyDZ0qXWWTVlt6P_O7kIZUY4jFkuEFNfeQQ",
  authDomain: "ganapathi-160ae.firebaseapp.com",
  projectId: "ganapathi-160ae",
  storageBucket: "ganapathi-160ae.firebasestorage.app",
  messagingSenderId: "702447108600",
  appId: "1:702447108600:web:878bea036f8d6b59c7160d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("🚀 Starting Full Database Seeding...");

  try {
    // 1. Seed Admins
    console.log("👥 Setting up Admins...");
    await setDoc(doc(db, "admins", "primary"), {
      email: "sowkurpraveenbhat@gmail.com",
      role: "superadmin",
      addedAt: serverTimestamp()
    });

    // 2. Seed Sevas
    console.log("🕉️ Setting up Sevas...");
    for (const group of SEVA_DATA) {
      for (const item of group.items) {
        await setDoc(doc(db, "sevas", item.id), {
          name: item.nameEn,
          nameKn: item.nameKn,
          price: item.price,
          description: item.noteEn || "",
          descriptionKn: item.noteKn || "",
          type: "basic",
          category: group.titleEn,
          isActive: true,
          createdAt: serverTimestamp()
        });
      }
    }

    // 3. Seed Announcements
    console.log("📢 Setting up Announcements...");
    await setDoc(doc(db, "announcements", "welcome"), {
      title: "Welcome to our new Digital Portal",
      description: "Devotees can now book sevas and view temple updates online. May Lord Sri Vinayaka bless you.",
      date: new Date().toISOString(),
      createdAt: serverTimestamp()
    });

    console.log("✅ Database Setup Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Setup Failed:", error);
    process.exit(1);
  }
}

seed();

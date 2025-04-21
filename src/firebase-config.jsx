// src/firebase-config.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCUzveJjlXhXengwlitbljTZaKcUAOwI_I",
  authDomain: "omniflow-frontend.firebaseapp.com",
  projectId: "omniflow-frontend",
  storageBucket: "omniflow-frontend.appspot.com", // ✅ fixed the storage bucket domain
  messagingSenderId: "1084982597923",
  appId: "1:1084982597923:web:eacc4e45cdbd383b2d5496"
};

// ⚠️ Prevent re-initialization during hot-reloading
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
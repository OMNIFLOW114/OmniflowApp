// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCUzveJjlXhXengwlitbljTZaKcUAOwI_I",
  authDomain: "omniflow-frontend.firebaseapp.com",
  projectId: "omniflow-frontend",
  storageBucket: "omniflow-frontend.appspot.com", // fixed typo here!
  messagingSenderId: "1084982597923",
  appId: "1:1084982597923:web:eacc4e45cdbd383b2d5496",
};

// 🛠️ Prevent Duplicate Firebase App Error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };

// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase-config'; // Or '@/firebase' if using alias
import { onAuthStateChanged } from 'firebase/auth';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the custom hook
export const useAuth = () => useContext(AuthContext);

// 3. Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

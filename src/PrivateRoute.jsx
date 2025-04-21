import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { auth } from "@/firebase"; // Firebase auth import to check the user's authentication state

const PrivateRoute = () => {
  if (!auth.currentUser) {
    // If no user is authenticated, redirect to the Auth page
    return <Navigate to="/auth" />;
  }

  // If user is authenticated, render the children components (the protected routes)
  return <Outlet />;
};

export default PrivateRoute;

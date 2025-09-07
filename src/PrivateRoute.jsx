import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/AuthContext"; // Make sure this path is correct

const PrivateRoute = () => {
  const { user, loading } = useAuth(); // useAuth must provide `user` and `loading`

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;

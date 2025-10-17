// src/components/admin/ProtectedAdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/supabase";
import toast from "react-hot-toast";

export default function ProtectedAdminRoute({ children }) {
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAuthorized(false);
        return;
      }

      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", session.user.email)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !adminUser) {
        toast.error("Access denied: Admin privileges required.");
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    };

    checkAccess();
  }, []);

  if (authorized === null) return <div className="loader">Checking access...</div>;
  if (!authorized) return <Navigate to="/admin" replace />;

  return children;
}

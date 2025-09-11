// src/components/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for recovery session event
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase emits "PASSWORD_RECOVERY" when redirect_to used for recovery
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
      }
    });

    // If user already has a recovery session, getSession will indicate session exists
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // In some flows the session exists already (server did session restore)
        setSessionReady(true);
      }
    })();

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const isValidPassword = (pwd) => /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const submit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      toast.error("Password must include uppercase, lowercase, number & 8+ chars.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — please sign in.");
      navigate("/auth");
    } catch (err) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="auth-container">
        <div className="auth-form-container glass-card">
          <h2 className="auth-title">Reset Password</h2>
          <p style={{ textAlign: "center", color: "#bbb" }}>Validating reset link — please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Set a New Password</h2>
        <form onSubmit={submit} className="auth-form">
          <div className="auth-input-group">
            <label>New password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••" />
          </div>
          <div className="auth-input-group">
            <label>Confirm password</label>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Updating..." : "Reset Password"}</Button>
        </form>
      </div>
    </div>
  );
}

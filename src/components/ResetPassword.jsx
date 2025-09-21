// src/components/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or expired reset link.");
      navigate("/auth");
      return;
    }

    // Supabase emits PASSWORD_RECOVERY event
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setSessionReady(true);
    })();

    return () => listener?.subscription?.unsubscribe();
  }, [token, navigate]);

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const handleSubmit = async (e) => {
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
      toast.success("Password updated successfully! Please login.");
      navigate("/auth");
    } catch (err) {
      toast.error(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="auth-container">
        <div className="auth-form-container glass-card">
          <h2 className="auth-title">Reset Password</h2>
          <p style={{ textAlign: "center", color: "#bbb" }}>Validating reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Set a New Password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label>New password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="auth-input-group">
            <label>Confirm password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// src/components/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL
  const token = new URLSearchParams(location.search).get("access_token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or expired password reset link.");
      setTokenValid(false);
      return;
    }

    // Optional: verify token exists with Supabase (more advanced)
    const checkToken = async () => {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          toast.error("Invalid or expired password reset link.");
          setTokenValid(false);
        }
      } catch (err) {
        toast.error("Invalid or expired password reset link.");
        setTokenValid(false);
      }
    };

    checkToken();
  }, [token]);

  // Password strength check
  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!isValidPassword(password)) {
      toast.error(
        "Password must contain uppercase, lowercase, number & be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { password },
        { accessToken: token }
      );

      if (error) throw error;

      toast.success("✅ Password updated successfully!");
      navigate("/auth"); // redirect to login
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-form-container glass-card">
          <h2 className="auth-title">Reset Password</h2>
          <p style={{ textAlign: "center", color: "#bbb" }}>
            This link is invalid or has expired. Please request a new password
            reset from the login page.
          </p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Set a New Password</h2>
        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="reset-input auth-input-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="reset-input auth-input-group">
            <label>Confirm Password</label>
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

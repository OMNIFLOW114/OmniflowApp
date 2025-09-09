// src/components/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css"; // reuse your auth styles

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Supabase sends the access_token in the URL
  const token = searchParams.get("access_token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      navigate("/auth");
    }
  }, [token, navigate]);

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      toast.error(
        "Password must contain uppercase, lowercase, number & be at least 8 characters."
      );
      return;
    }

    setLoading(true);
    try {
      // Update user password using Supabase
      const { error } = await supabase.auth.updateUser(
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (error) throw error;

      toast.success("✅ Password reset successfully. Please log in.");
      navigate("/auth");
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Set a New Password</h2>
        <form onSubmit={handleReset} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

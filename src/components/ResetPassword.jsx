import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import "./Auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const accessToken = searchParams.get("access_token"); // comes from Supabase reset email

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!accessToken) {
      setError("❌ Invalid or expired reset link.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("❌ Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!isValidPassword(password)) {
      setError("❌ Password must include uppercase, lowercase, number, and 8+ characters.");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.updateUser(
        { password },
        { accessToken }
      );

      if (resetError) throw resetError;

      setMessage("✅ Password updated successfully. Redirecting to login...");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="auth-form-container glass-card"
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <h2 className="auth-title">🔑 Reset Password</h2>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleResetPassword} className="auth-form">
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

          <div className="auth-input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

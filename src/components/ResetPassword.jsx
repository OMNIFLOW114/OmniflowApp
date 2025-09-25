// src/components/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // For consistency with Auth.jsx
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // For toggle
  const [errors, setErrors] = useState({}); // For real-time validation

  useEffect(() => {
    // Listen for Supabase recovery session
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setSessionReady(true);
        } else if (!session) {
          // Edge case: No recovery session detected
          toast.error("Invalid reset link. Please request a new one.");
          navigate("/auth");
        }
      }
    );

    // Also check immediately if a session is already active (from recovery link)
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session && session.user) {
          setSessionReady(true);
        } else {
          toast.error("Invalid reset link. Please request a new one.");
          navigate("/auth");
        }
      } catch (err) {
        console.error("Session check failed:", err.message);
        toast.error("Failed to validate reset link. Please try again.");
        navigate("/auth");
      }
    })();

    return () => listener?.subscription?.unsubscribe();
  }, [navigate]);

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const handlePasswordChange = (e, isConfirm = false) => {
    const value = e.target.value;
    const field = isConfirm ? "confirmPassword" : "password";
    const prevValue = isConfirm ? confirmPassword : password;

    // Update state
    if (!isConfirm) {
      setPassword(value);
    } else {
      setConfirmPassword(value);
    }

    // Real-time validation
    setErrors((prev) => ({
      ...prev,
      [field]:
        !isValidPassword(value)
          ? "Password must include uppercase, lowercase, number & 8+ chars."
          : isConfirm && value !== password
          ? "Passwords do not match."
          : "",
    }));
  };

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
      // Reset form
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      // Redirect after a brief delay to show success toast
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err) {
      toast.error(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <motion.div
        className="auth-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        role="main"
      >
        <div className="auth-form-container glass-card">
          <h2 className="auth-title">Reset Password</h2>
          <p style={{ textAlign: "center", color: "var(--light-secondary)" }}>
            Validating reset link...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="main"
    >
      <div className="auth-form-container glass-card">
        <h2 className="auth-title" id="reset-title">
          Set a New Password
        </h2>
        <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="reset-title">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e, false)}
                required
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className="error-text">{errors.password}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-wrapper">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => handlePasswordChange(e, true)}
                required
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="confirmPassword-error" className="error-text">{errors.confirmPassword}</span>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || Object.values(errors).some((e) => e)}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            {loading ? "Updating..." : "Reset Password"}
          </Button>
          <button
            type="button"
            className="link-btn back-link"
            onClick={() => navigate("/auth")}
          >
            Back to login
          </button>
        </form>
      </div>
    </motion.div>
  );
}
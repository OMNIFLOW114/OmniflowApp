
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const token = searchParams.get("access_token");

  // Verify token/session on mount
  useEffect(() => {
    const checkRecoveryToken = async () => {
      if (!token) {
        toast.error("Invalid or missing reset link. Please request a new one.");
        setTimeout(() => navigate("/auth"), 3000);
        return;
      }

      try {
        // Attempt to refresh session with the token
        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session || data.session.access_token !== token) {
          throw new Error("Invalid or expired recovery session");
        }
        setVerified(true);
        toast.success("Please set your new password");
      } catch (err) {
        console.error("Reset session error:", err);
        const errorMessage = err.message.includes("expired")
          ? "The reset link has expired. Please request a new one."
          : "Invalid reset link. Please try again or request a new link.";
        toast.error(errorMessage);
        setTimeout(() => navigate("/auth"), 3000);
      } finally {
        setVerifying(false);
      }
    };

    checkRecoveryToken();
  }, [token, navigate]);

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isValidPassword(formData.password)) {
      newErrors.password =
        "Password must include uppercase, lowercase, number, and be 8+ characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please try again later.");
        }
        throw error;
      }

      toast.success("Password reset successfully! Redirecting to login...");
      // Sign out after reset for security
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      console.error("Password reset error:", err);
      const errorMessage = err.message || "Failed to reset password. The link may have expired.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-form-container glass-card text-center">
          <h2 className="auth-title">Verifying Reset Link</h2>
          <Loader2 className="animate-spin h-8 w-8 mx-auto mt-4 text-blue-600" />
          <p className="mt-4 text-gray-400">Please wait while we verify your reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid session
  if (!verified) {
    return (
      <div className="auth-container">
        <div className="auth-form-container glass-card text-center">
          <h2 className="auth-title text-red-600">Invalid Reset Link</h2>
          <p className="mt-4 text-gray-400">The reset link is invalid or has expired.</p>
          <Button onClick={() => navigate("/auth")} className="mt-4 auth-button">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="auth-form-container glass-card">
        <button
          onClick={() => navigate("/auth")}
          className="back-button"
          aria-label="Back to login"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="auth-title">Set New Password</h2>
        <p className="auth-subtitle">Enter your new password below</p>
        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleInputChange}
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
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="confirmPassword-error" className="error-text">{errors.confirmPassword}</span>
            )}
          </div>
          <Button
            type="submit"
            className="auth-button"
            disabled={loading || Object.values(errors).some((e) => e)}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
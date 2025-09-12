// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup | reset | verifyOtp
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");

  // 🔹 Detect URL mode (reset-password, etc.)
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode) setMode(urlMode);

    const token = searchParams.get("access_token") || searchParams.get("token");
    if (token && urlMode === "reset") {
      toast("Enter new password to reset.");
    }
  }, [searchParams]);

  // 🔹 If logged in already, redirect
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mode !== "reset") {
        navigate("/home");
      }
    };
    checkSession();
  }, [navigate, mode]);

  // 🔹 Helpers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;

  // 🔹 Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isValidPassword(formData.password)) {
      toast.error("Password must include uppercase, lowercase, number, and be 8+ chars.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name, phone: formData.phone } },
      });
      if (error) throw error;
      toast.success("Signup successful — please confirm via email.");
      setMode("login");
    } catch (err) {
      toast.error(err?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/home");
    } catch (err) {
      toast.error(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Forgot password
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent.");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Reset password (user clicked link from email)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword(formData.password)) {
      toast.error("Weak password. Must include upper, lower, number, 8+ chars.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password });
      if (error) throw error;
      toast.success("Password updated! You can now log in.");
      setMode("login");
      navigate("/auth");
    } catch (err) {
      toast.error(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Verify phone OTP (optional, after signup)
  const handleVerifyOtp = async () => {
    if (!formData.phone || otp.length !== 6) {
      toast.error("Enter valid phone + 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formData.phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      toast.success("Phone verified!");
      navigate("/home");
    } catch (err) {
      toast.error(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Google OAuth
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${APP_URL}/auth` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err?.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Render forms
  const renderForm = () => {
    switch (mode) {
      case "signup":
        return (
          <form onSubmit={handleSignup} className="auth-form">
            <input name="name" placeholder="Full name" onChange={handleChange} required />
            <input name="phone" placeholder="+2547..." onChange={handleChange} />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Sign up"}
            </Button>
          </form>
        );
      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form">
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <button type="button" onClick={handleForgotPassword} className="forgot-btn">
              Forgot password?
            </button>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        );
      case "reset":
        return (
          <form onSubmit={handleResetPassword} className="auth-form">
            <input
              type="password"
              name="password"
              placeholder="New password"
              onChange={handleChange}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        );
      case "verifyOtp":
        return (
          <div className="otp-form">
            <input
              className="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              placeholder="123456"
            />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">
          {mode === "signup"
            ? "Create an account"
            : mode === "reset"
            ? "Reset your password"
            : mode === "verifyOtp"
            ? "Verify your phone"
            : "Welcome back"}
        </h2>

        {renderForm()}

        {mode !== "reset" && mode !== "verifyOtp" && (
          <>
            <div className="auth-divider">or</div>
            <button onClick={handleGoogle} className="google-signin-btn" disabled={loading}>
              Continue with Google
            </button>
            <div className="toggle-form-text">
              <p>
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="toggle-btn"
                >
                  {mode === "signup" ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

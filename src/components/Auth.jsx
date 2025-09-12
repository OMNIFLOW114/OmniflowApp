// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

const BACKEND_URL = "https://omniflowapp.co.ke"; // your backend domain
const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup | reset | verifyOtp
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  // Detect reset link from email
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    const token = searchParams.get("access_token") || searchParams.get("token");
    const email = searchParams.get("email");

    if ((urlMode === "reset" || searchParams.get("type") === "recovery") && token) {
      setMode("reset");
      setRecoveryToken(token);
      if (email) setFormData((prev) => ({ ...prev, email }));
      toast("Enter your new password to reset.");
    }
  }, [searchParams]);

  // Redirect logged-in users if not resetting
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mode !== "reset") navigate("/home");
    };
    checkSession();
  }, [navigate, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  // Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isValidPassword(formData.password)) {
      toast.error("Password must include uppercase, lowercase, number, 8+ chars.");
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
      toast.success("Signup successful — check email for confirmation.");
      setMode("login");
    } catch (err) {
      toast.error(err?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  // Login
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

  // Forgot password → send email pointing to /auth?mode=reset
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/auth?mode=reset&email=${encodeURIComponent(formData.email)}`,
      });
      if (error) throw error;
      toast.success("Check your email for the reset link. Do NOT click the Supabase default page.");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // Reset password via backend
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword(formData.password)) {
      toast.error("Weak password. Must include upper, lower, number, 8+ chars.");
      return;
    }
    if (!formData.email) {
      toast.error("Email missing. Please use the reset link from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, newPassword: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      toast.success(data.message || "Password updated successfully!");
      navigate("/home");
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // OTP verification
  const handleVerifyOtp = async () => {
    if (!formData.phone || otp.length !== 6) {
      toast.error("Enter valid phone + 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: formData.phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("Phone verified!");
      navigate("/home");
    } catch (err) {
      toast.error(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
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

  // Render forms
  const renderForm = () => {
    switch (mode) {
      case "signup":
        return (
          <form onSubmit={handleSignup} className="auth-form">
            <input name="name" placeholder="Full name" onChange={handleChange} required />
            <input name="phone" placeholder="+2547..." onChange={handleChange} />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Sign up"}</Button>
          </form>
        );
      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form">
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <button type="button" onClick={handleForgotPassword} className="forgot-btn">Forgot password?</button>
            <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
        );
      case "reset":
        return (
          <form onSubmit={handleResetPassword} className="auth-form">
            <input type="password" name="password" placeholder="New password" onChange={handleChange} required />
            <Button type="submit" disabled={loading}>{loading ? "Updating..." : "Reset Password"}</Button>
          </form>
        );
      case "verifyOtp":
        return (
          <div className="otp-form">
            <input className="otp-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} placeholder="123456" />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "Verify OTP"}</Button>
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
          {mode === "signup" ? "Create an account" : mode === "reset" ? "Reset your password" : mode === "verifyOtp" ? "Verify your phone" : "Welcome back"}
        </h2>
        {renderForm()}
        {mode !== "reset" && mode !== "verifyOtp" && (
          <>
            <div className="auth-divider">or</div>
            <button onClick={handleGoogle} className="google-signin-btn" disabled={loading}>Continue with Google</button>
            <div className="toggle-form-text">
              <p>{mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="toggle-btn">{mode === "signup" ? "Sign in" : "Sign up"}</button>
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

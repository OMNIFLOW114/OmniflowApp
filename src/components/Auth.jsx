// src/pages/Auth.jsx
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

  // controls which "screen" to show
  const [mode, setMode] = useState("login"); 
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");

  // 🔹 detect query params (reset / verifyOtp flows)
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode) setMode(urlMode);

    const token = searchParams.get("access_token") || searchParams.get("token");
    if (token && urlMode === "reset") {
      // user clicked reset link
      toast("Enter new password to reset.");
    }
  }, [searchParams]);

  // 🔹 check session and redirect
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mode !== "reset") navigate("/home");
    };
    checkSession();
  }, [navigate, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  // 🔹 Signup / Login
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!isValidPassword(formData.password)) {
          toast.error("Password must have uppercase, lowercase, number, and 8+ chars.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.name, phone: formData.phone } },
        });
        if (error) throw error;
        toast.success("Signup successful — check your email.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/home");
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong.");
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
        redirectTo: `${APP_URL}/auth?mode=reset`,
      });
      if (error) throw error;
      toast.success("Password reset link sent.");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Reset password (after Supabase redirects back)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isValidPassword(formData.password)) {
      toast.error("Weak password. Must be strong.");
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

  // 🔹 OTP verify
  const handleVerifyOtp = async () => {
    if (!formData.phone || otp.length < 4) {
      toast.error("Enter valid OTP.");
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
      toast.error(err?.message || "Invalid OTP.");
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

  // 🔹 UI per mode
  const renderForm = () => {
    switch (mode) {
      case "signup":
      case "login":
        return (
          <form onSubmit={handleAuth} className="auth-form">
            {mode === "signup" && (
              <>
                <input name="name" placeholder="Full name" onChange={handleChange} />
                <input name="phone" placeholder="+2547..." onChange={handleChange} />
              </>
            )}
            <input name="email" placeholder="Email" onChange={handleChange} required />
            <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
            {mode === "login" && (
              <button type="button" onClick={handleForgotPassword} className="forgot-btn">
                Forgot password?
              </button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "signup" ? "Sign up" : "Sign in"}
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
                {mode === "signup" ? "Already have an account?" : "Don't have one?"}{" "}
                <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="toggle-btn">
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

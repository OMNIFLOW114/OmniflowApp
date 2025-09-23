// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import "./Auth.css";

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup | forgot | verifyOtp
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");

  // Reset redirect
  useEffect(() => {
    const recoveryToken = searchParams.get("token");
    const type = searchParams.get("type");
    const email = searchParams.get("email");

    if (type === "recovery" && recoveryToken) {
      navigate(
        `/auth/reset?token=${recoveryToken}${email ? `&email=${encodeURIComponent(email)}` : ""}`,
        { replace: true }
      );
    }
  }, [searchParams, navigate]);

  // Auto-redirect logged in users
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const type = searchParams.get("type");

      if (session?.user) {
        if (type === "recovery") {
          navigate(`/auth/reset?token=${searchParams.get("token")}&email=${encodeURIComponent(session.user.email)}`);
        } else {
          navigate("/home");
        }
      }
    };
    checkSession();
  }, [navigate, searchParams]);

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
      toast.error("Password must include uppercase, lowercase, number & 8+ chars.");
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
      toast.success("Signup successful — confirm via email.");
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
      toast.success("Welcome back 👋");
      navigate("/home");
    } catch (err) {
      toast.error(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/auth/reset?email=${encodeURIComponent(formData.email)}`,
      });
      if (error) throw error;
      toast.success("Check your email for a secure reset link.");
      setMode("login");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // OTP verify
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
      toast.success("Phone verified 🎉");
      navigate("/home");
    } catch (err) {
      toast.error(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Google
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
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Creating..." : "Sign up"}
            </Button>
          </form>
        );
      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form">
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <div className="auth-links">
              <button type="button" onClick={() => setMode("forgot")} className="link-btn">
                Forgot password?
              </button>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        );
      case "forgot":
        return (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <input name="email" type="email" placeholder="Enter your email" onChange={handleChange} required />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <button type="button" className="link-btn back-link" onClick={() => setMode("login")}>
              Back to login
            </button>
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
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">
          {mode === "signup"
            ? "Create an account"
            : mode === "forgot"
            ? "Reset your password"
            : mode === "verifyOtp"
            ? "Verify your phone"
            : "Welcome back"}
        </h2>
        {renderForm()}
        {mode === "login" || mode === "signup" ? (
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
        ) : null}
      </div>
    </motion.div>
  );
}

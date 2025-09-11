// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

const APP_URL = process.env.REACT_APP_PUBLIC_URL || window.location.origin;

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });

  const navigate = useNavigate();
  const location = useLocation();

  // skip auto-redirect to /home if visiting with recovery token (Supabase recovery flow)
  useEffect(() => {
    const check = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get("access_token") || urlParams.get("token");
      if (token) return; // user likely following a recovery flow, don't auto-redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) navigate("/home");
    };
    check();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get("access_token") || urlParams.get("token");
      if (token) return;
      if (event === "SIGNED_IN" && session?.user) navigate("/home");
    });

    return () => listener?.subscription?.unsubscribe();
  }, [navigate, location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const toggleMode = () => {
    setOtpStage(false);
    setIsSignUp((s) => !s);
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  // Signup / Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { name, phone, email, password } = formData;
        if (!isValidPassword(password)) {
          toast.error("Password must include uppercase, lowercase, number & be at least 8 chars.");
          setLoading(false);
          return;
        }

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || null, phone: phone.trim() || null } },
        });
        if (signUpErr) throw signUpErr;

        // If phone provided, start SMS OTP flow. Otherwise, email confirmation flow occurs via Supabase (confirmation email)
        if (phone) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({ phone });
          if (otpErr) throw otpErr;
          setOtpStage(true);
          toast.success("OTP sent to phone — enter the code to verify.");
        } else {
          toast.success("Signup successful — check your email to confirm your account.");
          // Optionally navigate to a page instructing user to check email
        }
      } else {
        // Login (email/password). we also try phone->email fallback if user input is phone
        const { email, password } = formData;
        let loginErr = null;

        const { error: emailErr } = await supabase.auth.signInWithPassword({ email, password });
        if (emailErr) {
          // try treat `email` input as phone lookup in your users table
          const { data: userByPhone, error: qErr } = await supabase
            .from("users")
            .select("email")
            .eq("phone", email)
            .maybeSingle();
          if (qErr) throw qErr;
          if (userByPhone?.email) {
            const { error: phoneErr } = await supabase.auth.signInWithPassword({
              email: userByPhone.email,
              password,
            });
            loginErr = phoneErr;
          } else {
            loginErr = emailErr;
          }
        }

        if (loginErr) throw loginErr;
        toast.success("Welcome back!");
        navigate("/home");
      }
    } catch (err) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Verify phone OTP
  const handleVerifyOtp = async () => {
    if (!formData.phone) {
      toast.error("Phone missing.");
      return;
    }
    if (!otp || otp.length < 4) {
      toast.error("Enter full OTP.");
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
      toast.success("Phone verified — you are signed in.");
      // Supabase may sign the user in automatically after verifyOtp. Get session & navigate.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) navigate("/home");
      else navigate("/home"); // fallback
    } catch (err) {
      toast.error(err?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${APP_URL}/auth` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password — Supabase will include token and redirect to /reset-password (whitelisted)
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Enter your registered email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email.");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="auth-form-container glass-card" initial={{ y: 30 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100 }}>
        <h2 className="auth-title">{isSignUp ? "Create an account" : "Welcome back"}</h2>

        {!otpStage ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {isSignUp && (
              <>
                <div className="auth-input-group">
                  <label htmlFor="name">Full Name</label>
                  <input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" required />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+254712345678" />
                </div>
              </>
            )}

            <div className="auth-input-group">
              <label htmlFor="email">Email or Phone</label>
              <input id="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com or +2547..." required />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
            </div>

            {!isSignUp && (
              <div className="forgot-password">
                <button type="button" className="forgot-btn" onClick={handleForgotPassword}>Forgot password?</button>
              </div>
            )}

            <Button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (isSignUp ? "Creating..." : "Signing in...") : isSignUp ? "Sign up" : "Sign in"}
            </Button>
          </form>
        ) : (
          <div className="otp-form">
            <h3>Enter OTP sent to {formData.phone}</h3>
            <input className="otp-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} placeholder="123456" />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>{loading ? "Verifying..." : "Verify OTP"}</Button>
          </div>
        )}

        {!otpStage && (
          <>
            <div className="auth-divider">or</div>
            <button onClick={handleGoogleSignIn} className="google-signin-btn" disabled={loading}>{loading ? "Please wait..." : "Sign in with Google"}</button>

            <div className="toggle-form-text">
              <p>
                {isSignUp ? "Already have an account?" : "Don't have one?"}
                <button onClick={toggleMode} className="toggle-btn">{isSignUp ? "Sign in" : "Sign up"}</button>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

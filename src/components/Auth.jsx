// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Auto-login persistence (skip if reset token exists)
  useEffect(() => {
    const checkSession = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get("access_token"); // password reset token

      if (token) return; // skip auto-login if resetting password

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) navigate("/home");
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get("access_token");
        if (token) return; // skip auto-login if resetting password

        if (event === "SIGNED_IN" && session?.user) {
          navigate("/home");
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, [navigate, location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setOtpStage(false);
    setIsSignUp((prev) => !prev);
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    pwd.length >= 8;

  // ✅ Handle Signup/Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { name, phone, email, password } = formData;

        if (!isValidPassword(password)) {
          toast.error(
            "Password must contain uppercase, lowercase, number & be at least 8 characters."
          );
          setLoading(false);
          return;
        }

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, phone } },
        });

        if (signUpErr) throw signUpErr;

        if (phone) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({ phone });
          if (otpErr) throw otpErr;
          setOtpStage(true);
          toast.success("📱 OTP sent! Enter the 6-digit code.");
        } else {
          toast.success("📧 Check your inbox to confirm your email.");
        }
      } else {
        const { email, password } = formData;
        let loginError = null;

        const { error: emailErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (emailErr) {
          const { data: userByPhone } = await supabase
            .from("users")
            .select("email")
            .eq("phone", email)
            .maybeSingle();

          if (userByPhone?.email) {
            const { error: phoneErr } = await supabase.auth.signInWithPassword({
              email: userByPhone.email,
              password,
            });
            loginError = phoneErr;
          } else {
            loginError = emailErr;
          }
        }

        if (loginError) throw loginError;

        toast.success("✅ Welcome back! You are now logged in.");
        navigate("/home");
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify OTP
  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formData.phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      toast.success("🎉 Phone verified! Account created successfully.");
      navigate("/home");
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Forgot password
  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("⚠️ Enter your registered email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) toast.error(error.message);
    else toast.success("📧 Password reset link sent to your email.");
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="auth-form-container glass-card"
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <h2 className="auth-title">{isSignUp ? "Create an Account" : "Welcome Back"}</h2>

        {!otpStage ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {isSignUp && (
              <>
                <div className="auth-input-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+254712345678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div className="auth-input-group">
              <label htmlFor="email">Email Address or Phone</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="you@example.com or +254712345678"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {!isSignUp && (
              <div className="forgot-password">
                <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </div>
            )}

            <Button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (isSignUp ? "Creating..." : "Signing in...") : isSignUp ? "Sign Up" : "Log In"}
            </Button>
          </form>
        ) : (
          <div className="otp-form">
            <h3>Enter OTP sent to {formData.phone}</h3>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="otp-input"
            />
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </div>
        )}

        {!otpStage && (
          <>
            <div className="auth-divider">or</div>
            <button onClick={handleGoogleSignIn} className="google-signin-btn" disabled={loading}>
              {loading ? "Please wait..." : "Sign In with Google"}
            </button>
            <div className="toggle-form-text">
              <p>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={toggleMode} className="toggle-btn">
                  {isSignUp ? "Log in" : "Sign up"}
                </button>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

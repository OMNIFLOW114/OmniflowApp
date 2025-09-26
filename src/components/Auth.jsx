import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import "./Auth.css";

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup | forgot | verifyOtp
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  // Handle password reset redirect from email
  useEffect(() => {
    const recoveryToken = searchParams.get("token");
    const type = searchParams.get("type");

    if (type === "recovery" && recoveryToken) {
      // Redirect to reset password page with token
      navigate(`/auth/reset?token=${recoveryToken}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Auto-redirect logged in users (but not when handling reset)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        // Don't redirect if we're on a reset flow or auth callback
        const isResetFlow = window.location.pathname.includes('/auth/reset') || 
                           searchParams.get('type') === 'recovery';
        
        if (session?.user && !isResetFlow) {
          navigate("/home");
        }
      } catch (err) {
        console.error("Session check failed:", err.message);
      }
    };
    
    checkSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const isResetFlow = window.location.pathname.includes('/auth/reset');
        if (!isResetFlow) {
          navigate("/home");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const validatePhone = (phone) => {
    const phoneRegex = /^\+254\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "email" && value && !validateEmail(value)
          ? "Invalid email format"
          : name === "phone" && value && !validatePhone(value)
          ? "Phone must be in +254XXXXXXXXX format"
          : name === "password" && value && !isValidPassword(value)
          ? "Password must include uppercase, lowercase, number, and be 8+ chars"
          : "",
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (!isValidPassword(formData.password)) {
      toast.error("Password must include uppercase, lowercase, number, and be 8+ chars.");
      return;
    }
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error("Phone must be in +254XXXXXXXXX format.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          data: { full_name: formData.name, phone: formData.phone },
          emailRedirectTo: `${APP_URL}/auth`
        },
      });
      if (error) throw error;
      toast.success("Signup successful — please check your email to confirm your account.");
      setMode("login");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
    } catch (err) {
      toast.error(err.message || "Signup failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      toast.success("Welcome back 👋");
      navigate("/home");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
    } catch (err) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error("Please enter your email.");
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/auth/reset`,
      });
      if (error) throw error;
      toast.success("Check your email for a secure reset link.");
      setMode("login");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.phone || !validatePhone(formData.phone)) {
      toast.error("Please enter a valid phone number in +254XXXXXXXXX format.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formData.phone,
      });
      if (error) throw error;
      toast.success("OTP sent to your phone.");
      setMode("verifyOtp");
      setOtpResendCooldown(30); // 30-second cooldown
    } catch (err) {
      toast.error(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.phone || !validatePhone(formData.phone) || otp.length !== 6) {
      toast.error("Enter a valid phone number and 6-digit OTP.");
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
      setFormData({ name: "", phone: "", email: "", password: "" });
      setOtp("");
      setErrors({});
    } catch (err) {
      toast.error(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: `${APP_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || "Google login failed.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpResendCooldown > 0) {
      const timer = setTimeout(() => setOtpResendCooldown(otpResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCooldown]);

  const renderForm = () => {
    switch (mode) {
      case "signup":
        return (
          <form onSubmit={handleSignup} className="auth-form" aria-labelledby="signup-title">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                placeholder="Full name"
                onChange={handleChange}
                value={formData.name}
                required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && <span id="name-error" className="error-text">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                placeholder="+2547..."
                onChange={handleChange}
                value={formData.phone}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && <span id="phone-error" className="error-text">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                onChange={handleChange}
                value={formData.email}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <span id="email-error" className="error-text">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  onChange={handleChange}
                  value={formData.password}
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
              {errors.password && <span id="password-error" className="error-text">{errors.password}</span>}
            </div>
            <Button type="submit" disabled={loading || Object.values(errors).some((e) => e)}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Creating..." : "Sign up"}
            </Button>
          </form>
        );
      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form" aria-labelledby="login-title">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                onChange={handleChange}
                value={formData.email}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <span id="email-error" className="error-text">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  onChange={handleChange}
                  value={formData.password}
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
              {errors.password && <span id="password-error" className="error-text">{errors.password}</span>}
            </div>
            <div className="auth-links">
              <button type="button" onClick={() => setMode("forgot")} className="link-btn">
                Forgot password?
              </button>
              <button type="button" onClick={handleSendOtp} className="link-btn">
                Login with OTP
              </button>
            </div>
            <Button type="submit" disabled={loading || Object.values(errors).some((e) => e)}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        );
      case "forgot":
        return (
          <form onSubmit={handleForgotPassword} className="auth-form" aria-labelledby="forgot-title">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                onChange={handleChange}
                value={formData.email}
                required
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <span id="email-error" className="error-text">{errors.email}</span>}
            </div>
            <Button type="submit" disabled={loading || Object.values(errors).some((e) => e)}>
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
          <div className="otp-form" aria-labelledby="otp-title">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                placeholder="+2547..."
                onChange={handleChange}
                value={formData.phone}
                required
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && <span id="phone-error" className="error-text">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="otp">OTP</label>
              <input
                id="otp"
                className="otp-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="123456"
                required
                aria-describedby="otp-hint"
              />
              <span id="otp-hint" className="hint-text">Enter the 6-digit code sent to your phone.</span>
            </div>
            <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6 || Object.values(errors).some((e) => e)}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <button
              type="button"
              className="link-btn"
              onClick={handleSendOtp}
              disabled={loading || otpResendCooldown > 0}
            >
              {otpResendCooldown > 0 ? `Resend OTP in ${otpResendCooldown}s` : "Resend OTP"}
            </button>
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
      transition={{ duration: 0.3 }}
      role="main"
    >
      <div className="auth-form-container glass-card">
        <h2
          className="auth-title"
          id={
            mode === "signup"
              ? "signup-title"
              : mode === "forgot"
              ? "forgot-title"
              : mode === "verifyOtp"
              ? "otp-title"
              : "login-title"
          }
        >
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
            <div className="auth-divider">
              <span>or</span>
            </div>
            <button
              onClick={handleGoogle}
              className="google-signin-btn"
              disabled={loading}
              aria-label="Sign in with Google"
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <div className="toggle-form-text">
              <p>
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
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
import React, { useState, useEffect, useCallback, Component } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff, X } from "lucide-react";
import "./Auth.css";

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

// Error Boundary Component
class AuthErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Oops, Something Went Wrong</h2>
          <p>
            {this.state.error?.message || "An unexpected error occurred."}
            {this.state.error?.message.includes("VITE_SUPABASE_URL") ||
            this.state.error?.message.includes("VITE_SUPABASE_ANON_KEY")
              ? " Please check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) in your .env file."
              : ""}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="auth-button"
            aria-label="Reload the page"
          >
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [envError, setEnvError] = useState(null);

  // Validate environment variables
  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const errorMessage = "Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.";
      setEnvError(errorMessage);
      toast.error(errorMessage);
    } else {
      setEnvError(null);
    }
  }, []);

  // Handle OAuth callback and password reset
  useEffect(() => {
    const handleAuthCallback = async () => {
      if (envError) return; // Skip if environment variables are missing
      const code = searchParams.get("code");
      const type = searchParams.get("type");
      const recoveryToken = searchParams.get("access_token");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        toast.error(
          `Google Sign-In failed: ${errorParam}${
            errorDescription ? ` - ${errorDescription}` : ""
          }. Try again or use incognito mode.`
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        try {
          if (process.env.NODE_ENV !== "production") {
            console.log("Exchanging OAuth code:", code);
          }
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (error.message.includes("expired") || error.message.includes("invalid_grant")) {
              toast.error("OAuth code expired or invalid. Please try signing in again.");
            } else if (error.message.includes("invalid request")) {
              toast.error("Invalid OAuth request. Please try again or use incognito mode.");
            } else {
              toast.error(error.message || "Google authentication failed");
            }
            if (process.env.NODE_ENV !== "production") {
              console.error("Exchange error:", error);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          if (data.session?.user) {
            if (process.env.NODE_ENV !== "production") {
              console.log("Session established:", data.session.user);
            }
            toast.success("Successfully signed in with Google");
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate("/home");
          } else {
            toast.error("No valid user session after Google sign-in. Please try again.");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Callback error:", err);
          }
          toast.error(err.message || "Google authentication failed. Try incognito mode.");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (type === "recovery" && recoveryToken) {
        navigate(`/auth/reset?access_token=${recoveryToken}`, { replace: true });
      }
    };
    handleAuthCallback();
  }, [searchParams, navigate, envError]);

  // Auto-redirect logged-in users
  useEffect(() => {
    const checkSession = async () => {
      if (envError) return; // Skip if environment variables are missing
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        const isResetFlow =
          window.location.pathname.includes("/auth/reset") ||
          searchParams.get("type") === "recovery";
        if (session?.user && !isResetFlow) {
          if (process.env.NODE_ENV !== "production") {
            console.log("Redirecting to /home with user:", session.user);
          }
          navigate("/home");
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Session check failed:", err.message);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (envError) return; // Skip if environment variables are missing
      if (event === "SIGNED_IN" && session?.user) {
        const isResetFlow = window.location.pathname.includes("/auth/reset");
        if (!isResetFlow) {
          if (process.env.NODE_ENV !== "production") {
            console.log("Auth state changed to SIGNED_IN:", session.user);
          }
          navigate("/home");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, envError]);

  // Input validation and sanitization
  const validatePhone = (phone) => /^\+254\d{9}$/.test(phone);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;
  const sanitizeInput = (input) => input.replace(/[<>{}]/g, "").trim();

  // Enhanced error message handler
  const getErrorMessage = (error) => {
    const message = error?.message?.toLowerCase() || "";
    if (
      message.includes("already registered") ||
      message.includes("user already exists") ||
      message.includes("email already in use") ||
      error?.code === "user_already_exists" ||
      error?.status === 422
    ) {
      return {
        message: "This email is already registered. Redirecting to login...",
        type: "user_exists",
      };
    }
    if (
      message.includes("invalid login credentials") ||
      message.includes("user not found") ||
      message.includes("email not confirmed") ||
      message.includes("invalid email or password")
    ) {
      return {
        message: "User not found. Please check your credentials or sign up.",
        type: "user_not_found",
      };
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return {
        message: "Too many attempts. Please wait a minute and try again.",
        type: "rate_limit",
      };
    }
    return {
      message: error?.message || "An unexpected error occurred",
      type: "generic",
    };
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "email" && value && !validateEmail(sanitizedValue)
          ? "Invalid email format"
          : name === "phone" && value && !validatePhone(sanitizedValue)
          ? "Phone must be in +254XXXXXXXXX format"
          : name === "password" && value && !isValidPassword(sanitizedValue)
          ? "Password must include uppercase, lowercase, number, and be 8+ chars"
          : name === "name" && value && sanitizedValue.length < 2
          ? "Name must be at least 2 characters"
          : "",
    }));
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (envError) {
      toast.error("Cannot sign up due to missing Supabase configuration.");
      return;
    }
    if (attemptCount >= 5) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
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
          emailRedirectTo: `${APP_URL}/auth/callback`,
        },
      });
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_exists") {
          toast.error(errorInfo.message);
          setTimeout(() => {
            setMode("login");
            setFormData((prev) => ({ ...prev, password: "" }));
          }, 2000);
          return;
        }
        throw error;
      }
      toast.success("Signup successful — please check your email to confirm your account.");
      setMode("login");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
      setAttemptCount(0);
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      setAttemptCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (envError) {
      toast.error("Cannot sign in due to missing Supabase configuration.");
      return;
    }
    if (attemptCount >= 5) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
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
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_not_found") {
          toast.error(errorInfo.message);
          setTimeout(() => {
            if (window.confirm("Would you like to create a new account?")) {
              setMode("signup");
              setFormData((prev) => ({ ...prev, password: "" }));
            }
          }, 2000);
          return;
        }
        throw error;
      }
      toast.success("Welcome back 👋");
      navigate("/home");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
      setAttemptCount(0);
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      setAttemptCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (envError) {
      toast.error("Cannot reset password due to missing Supabase configuration.");
      return;
    }
    if (attemptCount >= 5) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
    if (!formData.email || !validateEmail(formData.email)) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/auth/reset`,
      });
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_not_found") {
          toast.error("No account found with this email address.");
          return;
        }
        throw error;
      }
      toast.success("Password reset link sent. Check your email.");
      setMode("login");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setErrors({});
      setAttemptCount(0);
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      setAttemptCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (envError) {
      toast.error("Cannot send OTP due to missing Supabase configuration.");
      return;
    }
    if (attemptCount >= 5) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
    if (!formData.phone || !validatePhone(formData.phone)) {
      toast.error("Please enter a valid phone number in +254XXXXXXXXX format.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formData.phone,
        options: {
          shouldCreateUser: true,
          data: { full_name: formData.name },
        },
      });
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_exists") {
          toast.error("This phone number is already registered. Please login instead.");
          setIsOtpModalOpen(false);
          setMode("login");
          return;
        }
        throw error;
      }
      toast.success("OTP sent to your phone.");
      setOtpResendCooldown(60);
      setAttemptCount(0);
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      setAttemptCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (envError) {
      toast.error("Cannot verify OTP due to missing Supabase configuration.");
      return;
    }
    if (attemptCount >= 5) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
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
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_not_found") {
          toast.error("No account found with this phone number.");
          return;
        }
        throw error;
      }
      toast.success("Phone verified 🎉");
      setIsOtpModalOpen(false);
      navigate("/home");
      setFormData({ name: "", phone: "", email: "", password: "" });
      setOtp("");
      setErrors({});
      setAttemptCount(0);
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      setAttemptCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (envError) {
      toast.error("Cannot sign in with Google due to missing Supabase configuration.");
      return;
    }
    setLoading(true);
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("Starting Google OAuth flow");
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${APP_URL}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
            scope: "email profile",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Google OAuth error:", err);
      }
      toast.error(err.message || "Google login failed. Try again or use incognito mode.");
      setLoading(false);
    }
  };

  // OTP resend cooldown
  useEffect(() => {
    if (otpResendCooldown > 0) {
      const timer = setTimeout(() => setOtpResendCooldown(otpResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCooldown]);

  // Reset attempt count after 1 minute
  useEffect(() => {
    if (attemptCount >= 5) {
      const resetTimer = setTimeout(() => setAttemptCount(0), 60000);
      return () => clearTimeout(resetTimer);
    }
  }, [attemptCount]);

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
              <label htmlFor="phone">Phone Number (Optional)</label>
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
            <Button
              type="submit"
              className="auth-button"
              disabled={loading || Object.values(errors).some((e) => e) || envError}
            >
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
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="link-btn"
                aria-label="Forgot password"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(true)}
                className="link-btn"
                aria-label="Login with OTP"
              >
                Login with OTP
              </button>
            </div>
            <Button
              type="submit"
              className="auth-button"
              disabled={loading || Object.values(errors).some((e) => e) || envError}
            >
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
            <Button
              type="submit"
              className="auth-button"
              disabled={loading || Object.values(errors).some((e) => e) || envError}
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <button
              type="button"
              className="link-btn back-link"
              onClick={() => setMode("login")}
              aria-label="Back to login"
            >
              Back to login
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <AuthErrorBoundary>
      <motion.div
        className="auth-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        role="main"
      >
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <div className="auth-form-container glass-card">
          {envError && (
            <div className="env-error-message">
              <p>{envError}</p>
              <p>Please update your .env file and reload the page.</p>
            </div>
          )}
          <h2
            className="auth-title"
            id={
              mode === "signup"
                ? "signup-title"
                : mode === "forgot"
                ? "forgot-title"
                : "login-title"
            }
          >
            {mode === "signup"
              ? "Create an Account"
              : mode === "forgot"
              ? "Reset Your Password"
              : "Welcome to OmniFlow"}
          </h2>
          {renderForm()}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <button
                onClick={handleGoogle}
                className="google-signin-btn"
                disabled={loading || envError}
                aria-label="Sign in with Google"
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
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
                    aria-label={mode === "signup" ? "Switch to sign in" : "Switch to sign up"}
                  >
                    {mode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
        <AnimatePresence>
          {isOtpModalOpen && (
            <motion.div
              className="otp-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOtpModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="otp-modal-title"
            >
              <motion.div
                className="otp-modal"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="modal-close-btn"
                  onClick={() => setIsOtpModalOpen(false)}
                  aria-label="Close OTP modal"
                >
                  <X size={20} />
                </button>
                <h3 id="otp-modal-title" className="otp-modal-title">
                  Login with OTP
                </h3>
                <div className="form-group">
                  <label htmlFor="otp-phone">Phone Number</label>
                  <input
                    id="otp-phone"
                    name="phone"
                    placeholder="+2547..."
                    onChange={handleChange}
                    value={formData.phone}
                    required
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "otp-phone-error" : undefined}
                  />
                  {errors.phone && (
                    <span id="otp-phone-error" className="error-text">
                      {errors.phone}
                    </span>
                  )}
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
                  <span id="otp-hint" className="hint-text">
                    Enter the 6-digit code sent to your phone.
                  </span>
                </div>
                <div className="otp-modal-buttons">
                  <Button
                    onClick={handleSendOtp}
                    className="auth-button"
                    disabled={loading || otpResendCooldown > 0 || !!errors.phone || envError}
                  >
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    {otpResendCooldown > 0 ? `Resend OTP in ${otpResendCooldown}s` : "Send OTP"}
                  </Button>
                  <Button
                    onClick={handleVerifyOtp}
                    className="auth-button"
                    disabled={loading || otp.length !== 6 || !!errors.phone || envError}
                  >
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Verify OTP
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthErrorBoundary>
  );
}

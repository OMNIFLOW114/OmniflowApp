import React, { useState, useEffect, useCallback, Component } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import "./Auth.css";

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

// Error Boundary Component
class AuthErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Auth Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Oops, Something Went Wrong</h2>
          <p>
            {this.state.error?.message || "An unexpected error occurred."}
            {this.state.error?.message?.includes("VITE_SUPABASE_URL") ||
            this.state.error?.message?.includes("VITE_SUPABASE_ANON_KEY")
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
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    password: "" 
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [envError, setEnvError] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // 🧩 Hidden Developer Shortcut — ALT + A → Admin Login
  useEffect(() => {
    const handleKeyShortcut = (e) => {
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/admin");
      }
    };
    window.addEventListener("keydown", handleKeyShortcut);
    return () => window.removeEventListener("keydown", handleKeyShortcut);
  }, [navigate]);

  // Validate environment variables
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      const errorMessage = "Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.";
      setEnvError(errorMessage);
      toast.error(errorMessage);
      console.error("Environment variables missing:", { supabaseUrl, supabaseKey });
    } else {
      setEnvError(null);
    }
  }, []);

  // Handle OAuth callback and password reset
  useEffect(() => {
    const handleAuthCallback = async () => {
      if (envError) return;

      const hash = window.location.hash;
      const urlParams = new URLSearchParams(hash.substring(1));
      const type = urlParams.get('type');
      const tokenHash = urlParams.get('token_hash');

      const searchParamsObj = new URLSearchParams(window.location.search);
      const code = searchParamsObj.get("code");
      const errorParam = searchParamsObj.get("error");
      const errorDescription = searchParamsObj.get("error_description");

      // Handle OAuth error response from Google
      if (errorParam) {
        toast.error(
          `Google Sign-In failed: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ""}. Try again or use incognito mode.`
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Handle OAuth success (Google login redirect with ?code=...)
      if (code) {
        try {
          setLoading(true);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (error.message.includes("already registered")) {
              toast.error("This email is already registered. Please sign in with email/password or link your Google account.");
              setMode("login");
              return;
            }
            throw error;
          }

          if (data?.session?.user) {
            await syncUserData(data.session.user);
            setSuccessMessage("Successfully signed in with Google");
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate("/home");
          } else {
            toast.error("No valid user session after Google sign-in. Please try again.");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("OAuth callback error:", err);
          toast.error(err.message || "Google authentication failed. Try incognito mode or check OAuth setup.");
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Handle password recovery or email confirmation from email link
      if (tokenHash && type) {
        if (type === "recovery") {
          console.log("Password recovery detected, redirecting to reset page...");
          navigate("/reset-password", { replace: true });
          return;
        }
        if (type === "signup") {
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              type: 'signup',
              token_hash: tokenHash,
            });
            if (error) throw error;
            if (data.session) {
              await syncUserData(data.session.user);
              setSuccessMessage("Email confirmed successfully!");
              navigate("/home");
            }
          } catch (err) {
            toast.error("Error confirming email: " + err.message);
          }
          return;
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, envError]);

  // Auto-redirect logged-in users
  useEffect(() => {
    const checkSession = async () => {
      if (envError) return;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        const isResetFlow =
          window.location.pathname.includes("/reset-password") ||
          searchParams.get("type") === "recovery";
        if (session?.user && !isResetFlow) {
          navigate("/home");
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (envError) return;
      
      if (event === "SIGNED_IN" && session?.user) {
        const isResetFlow = window.location.pathname.includes("/reset-password");
        if (!isResetFlow) {
          await syncUserData(session.user);
          navigate("/home");
        }
      }
      
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
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
        message: "Invalid email or password. Please check your credentials.",
        type: "user_not_found",
      };
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return {
        message: "Too many attempts. Please wait a minute and try again.",
        type: "rate_limit",
      };
    }
    if (message.includes("password recovery")) {
      return {
        message: "Password reset failed. Please try again.",
        type: "recovery_error",
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
    
    // Clear specific error when user starts typing
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    // Real-time validation
    if (name === "email" && value && !validateEmail(sanitizedValue)) {
      setErrors((prev) => ({ 
        ...prev, 
        [name]: "Please enter a valid email address" 
      }));
    } else if (name === "phone" && value && !validatePhone(sanitizedValue)) {
      setErrors((prev) => ({ 
        ...prev, 
        [name]: "Phone must be in +254XXXXXXXXX format" 
      }));
    } else if (name === "password" && value && !isValidPassword(sanitizedValue)) {
      setErrors((prev) => ({ 
        ...prev, 
        [name]: "Password must include uppercase, lowercase, number, and be 8+ characters" 
      }));
    } else if (name === "name" && value && sanitizedValue.length < 2) {
      setErrors((prev) => ({ 
        ...prev, 
        [name]: "Name must be at least 2 characters" 
      }));
    }
  }, []);

  // Check if email exists in users table
  const checkEmailExists = async (email) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error("Error checking email:", err);
      return false;
    }
  };

  // Sync user data after sign-in/sign-up using upsert
  const syncUserData = async (user) => {
    try {
      if (!user?.id) return;

      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || formData.name || user.email?.split("@")[0] || "User",
        phone: formData.phone || user.user_metadata?.phone,
        updated_at: new Date().toISOString(),
      };

      if (mode === "signup" && acceptedTerms) {
        userData.accepted_terms = acceptedTerms;
      }

      const { error } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' });

      if (error) {
        console.error("Error upserting user data:", error);
      }
    } catch (err) {
      console.error("Unexpected error syncing user data:", err);
    }
  };

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

    // Validate all fields
    if (!formData.name || formData.name.length < 2) {
      toast.error("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(formData.password)) {
      toast.error("Password must include uppercase, lowercase, number, and be 8+ characters.");
      return;
    }
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error("Phone must be in +254XXXXXXXXX format.");
      return;
    }

    // Check if terms are accepted
    if (!acceptedTerms) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    try {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        toast.error("This email is already registered. Redirecting to login...");
        setTimeout(() => {
          setMode("login");
          setFormData((prev) => ({ ...prev, password: "" }));
        }, 2000);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            full_name: formData.name, 
            phone: formData.phone,
            accepted_terms: acceptedTerms,
          },
          emailRedirectTo: `${APP_URL}/auth`,
        },
      });
      
      if (error) throw error;

      // Check for fake user (existing email)
      if (!data.user?.identities || data.user.identities.length === 0) {
        toast.error("This account already exists. Proceed to login page.");
        setTimeout(() => {
          setMode("login");
          setFormData((prev) => ({ ...prev, password: "" }));
        }, 2000);
        return;
      }

      if (data.user) {
        // Rely on trigger for insert, no sync here
        setSuccessMessage("Account created successfully! Please check your email to confirm your account.");
        setMode("login");
        setFormData({ name: "", phone: "", email: "", password: "" });
        setErrors({});
        setAttemptCount(0);
        setAcceptedTerms(false);
      }
    } catch (err) {
      const errorInfo = getErrorMessage(err);
      toast.error(errorInfo.message);
      if (errorInfo.type === "user_exists") {
        setTimeout(() => {
          setMode("login");
          setFormData((prev) => ({ ...prev, password: "" }));
        }, 2000);
      }
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
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!formData.password) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_not_found") {
          toast.error("Invalid email or password. Please check your credentials.");
          setTimeout(() => {
            if (window.confirm("No account found with this email. Would you like to create a new account?")) {
              setMode("signup");
              setFormData((prev) => ({ ...prev, password: "" }));
            }
          }, 1500);
          return;
        }
        throw error;
      }

      if (data?.user) {
        await syncUserData(data.user);
        setSuccessMessage("Welcome back! 👋");
        navigate("/home");
        setFormData({ name: "", phone: "", email: "", password: "" });
        setErrors({});
        setAttemptCount(0);
      }
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
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${APP_URL}/auth`,
      });
      
      if (error) {
        const errorInfo = getErrorMessage(error);
        if (errorInfo.type === "user_not_found") {
          toast.error("No account found with this email address.");
          return;
        }
        throw error;
      }
      
      setSuccessMessage("Password reset link sent! Check your email for instructions.");
      setMode("login");
      setFormData((prev) => ({ ...prev, password: "" }));
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${APP_URL}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      
      if (error) throw error;
    } catch (err) {
      console.error("Google OAuth error:", err);
      toast.error(
        err.message || "Google login failed. Try again or use incognito mode."
      );
      setLoading(false);
    }
  };

  // Reset attempt count after 1 minute
  useEffect(() => {
    if (attemptCount >= 5) {
      const resetTimer = setTimeout(() => setAttemptCount(0), 60000);
      return () => clearTimeout(resetTimer);
    }
  }, [attemptCount]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const renderForm = () => {
    switch (mode) {
      case "signup":
        return (
          <form onSubmit={handleSignup} className="auth-form" aria-labelledby="signup-title">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                placeholder="Enter your full name"
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
              <label htmlFor="email">Email *</label>
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
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
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
              <div className="password-hint">
                Password must contain uppercase, lowercase, number, and be at least 8 characters
              </div>
            </div>
            
            <div className="terms-acceptance">
              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkmark"></span>
                I agree to the{" "}
                <button
                  type="button"
                  className="terms-link"
                  onClick={() => navigate('/terms')}
                >
                  Terms & Conditions
                </button>
              </label>
            </div>

            <Button
              type="submit"
              className="auth-button"
              disabled={loading || Object.values(errors).some((e) => e) || envError || !acceptedTerms}
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        );
      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form" aria-labelledby="login-title">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
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
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
            </div>
            <Button
              type="submit"
              className="auth-button"
              disabled={loading || Object.values(errors).some((e) => e) || envError}
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        );
      case "forgot":
        return (
          <form onSubmit={handleForgotPassword} className="auth-form" aria-labelledby="forgot-title">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
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
              {loading ? "Sending Reset Link..." : "Send Reset Link"}
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
        <Toaster 
          position="top-center" 
          toastOptions={{ 
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }} 
        />
        <div className="auth-form-container glass-card">
          {envError && (
            <div className="env-error-message">
              <p>{envError}</p>
              <p>Please update your .env file and reload the page.</p>
            </div>
          )}
          {successMessage && (
            <div className="success-message">
              {successMessage}
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
              : "Welcome to Omniflow App"}
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
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.3-4.53 6.16-4.53z"
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
      </motion.div>
    </AuthErrorBoundary>
  );
}
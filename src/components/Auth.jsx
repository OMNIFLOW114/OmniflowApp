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
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                onChange={handleChange}
                value={formData.name}
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

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
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+254 700 000000"
                onChange={handleChange}
                value={formData.phone}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  onChange={handleChange}
                  value={formData.password}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the <button type="button" className="terms-link" onClick={() => navigate('/terms')}>Terms of Service</button> and <button type="button" className="terms-link" onClick={() => navigate('/privacy')}>Privacy Policy</button>
              </label>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || envError || !acceptedTerms}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Create account"}
            </button>
          </form>
        );

      case "login":
        return (
          <form onSubmit={handleLogin} className="auth-form">
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
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <div className="password-header">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="forgot-link"
                >
                  Forgot password?
                </button>
              </div>
              <div className="password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  onChange={handleChange}
                  value={formData.password}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || envError}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign in"}
            </button>
          </form>
        );

      case "forgot":
        return (
          <form onSubmit={handleForgotPassword} className="auth-form">
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
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || envError}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => setMode("login")}
              className="back-to-login"
            >
              ← Back to sign in
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
      >
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
          }}
        />

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand">
              <div className="logo">
                <img 
                  src="/icons/logo.png" 
                  alt="Omniflow Logo" 
                  className="logo-image"
                />
                <span className="brand-name">Omniflow</span>
              </div>
            </div>

            <h1 className="auth-greeting">
              {mode === "signup" ? "Create an account" : mode === "forgot" ? "Reset password" : "Welcome back"}
            </h1>
            <p className="auth-subheading">
              {mode === "signup" 
                ? "Sign up to start shopping" 
                : mode === "forgot"
                ? "Enter your email to reset your password"
                : "Sign in to continue to Omniflow"}
            </p>
          </div>

          {envError && (
            <div className="env-error">
              <p>{envError}</p>
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="9" fill="#10B981" fillOpacity="0.1" />
                <path d="M5 9L7.5 11.5L13 6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {renderForm()}

          {(mode === "login" || mode === "signup") && (
            <>
              <div className="divider">
                <span>or continue with</span>
              </div>

              <button
                onClick={handleGoogle}
                className="google-btn"
                disabled={loading || envError}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18.171 10.1709C18.171 9.58002 18.1165 8.99002 18.0065 8.41504H10.222V11.7551H14.659C14.4815 12.7101 13.933 13.5551 13.1345 14.1151V16.0651H15.747C17.281 14.6251 18.171 12.5501 18.171 10.1709Z" fill="#4285F4"/>
                  <path d="M10.222 18.5C12.385 18.5 14.1945 17.765 15.747 16.065L13.1345 14.115C12.295 14.68 11.3065 15.005 10.222 15.005C8.135 15.005 6.3705 13.595 5.7285 11.695H3.035V13.705C4.576 16.75 7.7 18.5 10.222 18.5Z" fill="#34A853"/>
                  <path d="M5.7285 11.695C5.3935 10.705 5.3935 9.635 5.7285 8.645V6.635H3.035C1.8965 8.895 1.8965 11.445 3.035 13.705L5.7285 11.695Z" fill="#FBBC04"/>
                  <path d="M10.222 5.335C11.3735 5.315 12.485 5.74 13.3205 6.53L15.801 4.045C14.1185 2.47 11.7425 1.57 10.222 1.575C7.7 1.575 4.576 3.325 3.035 6.365L5.7285 8.375C6.3705 6.475 8.135 5.065 10.222 5.065V5.335Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="auth-footer">
                <p>
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}
                  <button
                    onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                    className="toggle-mode"
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
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import "./ResetPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Check for recovery token and verify it
  useEffect(() => {
    const verifyRecoveryToken = async () => {
      try {
        console.log("Starting recovery token verification...");
        
        // Get tokens from URL hash (Supabase redirects to hash parameters)
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const type = urlParams.get('type');
        const tokenHash = urlParams.get('token_hash');

        console.log("URL Hash Parameters:", { 
          accessToken, 
          type, 
          tokenHash,
          fullHash: hash,
          fullURL: window.location.href
        });

        // Check query parameters as backup
        const queryAccessToken = searchParams.get("access_token");
        const queryType = searchParams.get("type");
        const queryTokenHash = searchParams.get("token_hash");

        // Use the correct token (token_hash is the new standard, access_token is legacy)
        const finalToken = tokenHash || queryTokenHash || accessToken || queryAccessToken;
        const finalType = type || queryType;

        console.log("Final token and type:", { finalToken, finalType });

        if (finalType === "recovery" && finalToken) {
          console.log("Recovery token found, attempting to verify...");
          
          // For Supabase, we need to use verifyOtp for password recovery
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: finalToken,
              type: 'recovery'
            });

            if (error) {
              console.error("Token verification error:", error);
              throw new Error(`Token verification failed: ${error.message}`);
            }

            if (data?.user) {
              console.log("Token verified successfully, user:", data.user);
              setVerified(true);
              toast.success("Please set your new password");
              
              // Clear the URL parameters after successful verification
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              throw new Error("Failed to verify recovery token");
            }
          } catch (verifyError) {
            console.error("Verify OTP error:", verifyError);
            // Fallback to session method for older Supabase versions
            const { data, error } = await supabase.auth.setSession({
              access_token: finalToken,
            });

            if (error) {
              console.error("Session set error:", error);
              throw new Error("Invalid or expired recovery token");
            }

            if (data?.session) {
              console.log("Session set successfully via fallback");
              setVerified(true);
              toast.success("Please set your new password");
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              throw new Error("Failed to establish recovery session");
            }
          }
        } else {
          // Check if user already has a valid session (they might have come from auth redirect)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Session check error:", sessionError);
            throw sessionError;
          }

          if (session?.user) {
            console.log("User already has valid session:", session.user);
            setVerified(true);
          } else {
            throw new Error("No valid recovery token found in URL");
          }
        }
      } catch (err) {
        console.error("Recovery verification failed:", err);
        
        let errorMessage = "Invalid or expired reset link. Please request a new password reset.";
        
        if (err.message.includes("expired")) {
          errorMessage = "The reset link has expired. Please request a new one.";
        } else if (err.message.includes("used")) {
          errorMessage = "This reset link has already been used. Please request a new one.";
        } else if (err.message.includes("invalid")) {
          errorMessage = "Invalid reset link. Please check the link or request a new one.";
        } else if (err.message.includes("token")) {
          errorMessage = "The reset token is invalid or malformed. Please request a new reset link.";
        }
        
        toast.error(errorMessage);
        
        // Redirect to auth page after delay
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 4000);
      } finally {
        setVerifying(false);
      }
    };

    verifyRecoveryToken();
  }, [navigate, searchParams]);

  const isValidPassword = (pwd) =>
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isValidPassword(formData.password)) {
      newErrors.password =
        "Password must include uppercase, lowercase, number, and be 8+ characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("Attempting to update password...");
      
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        console.error("Password update error:", error);
        
        if (error.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please try again later.");
        } else if (error.message.includes("weak")) {
          throw new Error("Password is too weak. Please choose a stronger password.");
        } else if (error.message.includes("session")) {
          throw new Error("Your session has expired. Please request a new reset link.");
        }
        throw error;
      }

      console.log("Password updated successfully:", data);
      
      toast.success(
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
          Password reset successfully! Redirecting to login...
        </div>
      );

      // Wait a moment before signing out and redirecting
      setTimeout(async () => {
        // Sign out after successful reset for security
        await supabase.auth.signOut();
        
        navigate("/auth", { replace: true });
      }, 2000);
      
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!formData.password) return null;
    
    const hasLower = /[a-z]/.test(formData.password);
    const hasUpper = /[A-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasMinLength = formData.password.length >= 8;
    
    const strength = [hasLower, hasUpper, hasNumber, hasMinLength].filter(Boolean).length;
    
    if (strength === 4) return { text: "Strong", color: "text-green-500" };
    if (strength >= 2) return { text: "Medium", color: "text-yellow-500" };
    return { text: "Weak", color: "text-red-500" };
  };

  const passwordStrength = getPasswordStrength();

  // Loading state
  if (verifying) {
    return (
      <div className="auth-container">
        <Toaster position="top-center" />
        <div className="auth-form-container glass-card text-center">
          <h2 className="auth-title">Verifying Reset Link</h2>
          <Loader2 className="animate-spin h-8 w-8 mx-auto mt-4 text-blue-600" />
          <p className="mt-4 text-gray-400">Please wait while we verify your reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid session - show error
  if (!verified) {
    return (
      <div className="auth-container">
        <Toaster position="top-center" />
        <div className="auth-form-container glass-card text-center">
          <h2 className="auth-title text-red-600">Reset Link Invalid</h2>
          <p className="mt-4 text-gray-400 mb-4">
            The password reset link is invalid, has expired, or has already been used.
          </p>
          <Button 
            onClick={() => navigate("/auth")} 
            className="mt-4 auth-button"
          >
            Request New Reset Link
          </Button>
        </div>
      </div>
    );
  }

  // Success - show password form
  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <div className="auth-form-container glass-card">
        <button
          onClick={() => navigate("/auth")}
          className="back-button"
          aria-label="Back to login"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="text-center mb-6">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="auth-title">Set New Password</h2>
          <p className="auth-subtitle">Create a strong, secure password for your account</p>
        </div>

        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={formData.password}
                onChange={handleInputChange}
                required
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : "password-strength"}
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
            {formData.password && passwordStrength && (
              <div className={`text-sm mt-1 ${passwordStrength.color}`}>
                Password strength: {passwordStrength.text}
              </div>
            )}
            {errors.password && (
              <span id="password-error" className="error-text">{errors.password}</span>
            )}
            <div className="password-hint mt-1">
              Must contain uppercase, lowercase, number, and be at least 8 characters
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="confirm-password-error" className="error-text">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <Button
            type="submit"
            className="auth-button w-full"
            disabled={loading || Object.values(errors).some((e) => e)}
          >
            {loading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {loading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
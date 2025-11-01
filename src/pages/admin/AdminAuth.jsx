// src/pages/admin/AdminAuth.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";
import "./AdminAuth.css";

export default function AdminAuth() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    
    try {
      // Step 1: Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      
      if (authError) throw authError;

      const { user } = authData;
      
      // Step 2: Verify this user is in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("id, email, role, is_active, last_login, user_id")
        .eq("email", user.email)
        .eq("is_active", true)
        .maybeSingle();

      if (adminError) {
        console.error("Admin verification error:", adminError);
        throw new Error("Failed to verify admin privileges");
      }

      if (!adminData) {
        toast.error("Access denied: You are not an authorized administrator.");
        await supabase.auth.signOut();
        setFormData({ email: "", password: "" });
        return;
      }

      // Step 3: Update last login timestamp
      try {
        const { error: updateError } = await supabase
          .from("admin_users")
          .update({ 
            last_login: new Date().toISOString() 
          })
          .eq("id", adminData.id);

        if (updateError) {
          console.warn("Failed to update last login timestamp:", updateError);
        }
      } catch (updateErr) {
        console.warn("Could not update last login:", updateErr);
      }

      // Step 4: Success - redirect to admin dashboard
      toast.success(`Welcome ${adminData.role || 'Administrator'}!`);
      
      // Small delay to show success message
      setTimeout(() => {
        navigate("/admin-dashboard", { replace: true });
      }, 1000);
      
    } catch (err) {
      console.error("Admin login error:", err);
      
      // More specific error messages
      if (err.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (err.message?.includes("Email not confirmed")) {
        toast.error("Please verify your email address before logging in.");
      } else if (err.message?.includes("admin privileges")) {
        toast.error("Administrator verification failed. Please contact system admin.");
      } else {
        toast.error(err.message || "Login failed. Please try again.");
      }
      
      // Ensure we're signed out on error
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Error during sign out:", signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press for form submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && formData.email && formData.password) {
      handleLogin(e);
    }
  };

  return (
    <div className="auth-container admin-auth">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155'
          },
        }}
      />
      
      <div className="auth-form-container glass-card">
        <div className="auth-header">
          <Shield size={48} className="auth-icon" />
          <h2 className="auth-title">Admin Portal</h2>
          <p className="auth-subtitle">Secure access to administration panel</p>
        </div>
        
        <form onSubmit={handleLogin} className="auth-form" onKeyDown={handleKeyPress}>
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              placeholder="admin@yourcompany.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="email"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="password-wrapper">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="auth-button"
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Authenticating...
              </>
            ) : (
              "Access Dashboard"
            )}
          </Button>
        </form>

        <div className="security-badge">
          <div className="badge">
            <Shield size={14} />
            Secure Admin Portal
          </div>
        </div>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-info">
            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '1rem' }}>
              
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
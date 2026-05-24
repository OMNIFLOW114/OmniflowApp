// src/pages/admin/AdminAuth.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
    
    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      
      if (authError) throw authError;

      const { user } = authData;
      
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

      toast.success(`Welcome back`);
      
      setTimeout(() => {
        navigate("/admin-dashboard", { replace: true });
      }, 1000);
      
    } catch (err) {
      console.error("Admin login error:", err);
      
      if (err.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (err.message?.includes("Email not confirmed")) {
        toast.error("Please verify your email address before logging in.");
      } else if (err.message?.includes("admin privileges")) {
        toast.error("Administrator verification failed. Please contact system admin.");
      } else {
        toast.error(err.message || "Login failed. Please try again.");
      }
      
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Error during sign out:", signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && formData.email && formData.password) {
      handleLogin(e);
    }
  };

  return (
    <div className="admin-auth-container">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #333333',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
      
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <div className="admin-logo">
            <img 
              src="/icons/logo.png" 
              alt="Logo" 
              className="admin-logo-image"
            />
          </div>
          <h2 className="admin-auth-title">Admin Login</h2>
          <p className="admin-auth-subtitle">Enter your credentials to continue</p>
        </div>
        
        <form onSubmit={handleLogin} className="admin-auth-form" onKeyDown={handleKeyPress}>
          <div className="admin-form-group">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="admin-form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-password-wrapper">
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
              />
              <button
                type="button"
                className="admin-password-toggle"
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
            className="admin-auth-button"
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
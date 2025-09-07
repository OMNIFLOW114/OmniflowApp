import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import "../components/Settings.css";

const Settings = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    email: "",
    phone: "",
    language: "English",
    dark_mode: false,
    push_notifications: true,
    privacy: false,
    auto_update: true,
    data_sharing: false,
    time_zone: "Africa/Nairobi",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("users")
        .select(`
          email, phone, language, dark_mode,
          push_notifications, privacy, auto_update,
          data_sharing, time_zone
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching settings:", error);
        toast.error("⚠️ Failed to load settings.");
      } else {
        setSettings(data);
      }

      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSetting = async (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));

    const { error } = await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      toast.error(`❌ Failed to update ${field}.`);
    } else {
      toast.success(`✅ ${field.replaceAll("_", " ")} updated.`);
    }

    if (field === "dark_mode") {
      document.body.classList.toggle("dark-theme", value);
    }
  };

  const handlePromptUpdate = (field, label, currentValue) => {
    const input = prompt(`Enter new ${label}:`, currentValue);
    if (input && input !== currentValue) {
      updateSetting(field, input);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      "⚠️ Are you sure you want to delete your account permanently?"
    );
    if (!confirm) return;

    const { error } = await supabase.from("users").delete().eq("id", user.id);
    if (error) {
      toast.error("Failed to delete account.");
    } else {
      toast.success("Account deleted.");
      logout();
    }
  };

  if (loading) return <div className="settings-container"><p>Loading settings...</p></div>;

  return (
    <div className="settings-container">
      <h1 className="settings-title">⚙️ Settings & Preferences</h1>

      {/* Account Section */}
      <section>
        <h2>👤 Account Information</h2>
        <div className="settings-item">
          <label>Email</label>
          <button onClick={() => handlePromptUpdate("email", "email", settings.email)}>
            {settings.email}
          </button>
        </div>
        <div className="settings-item">
          <label>Phone Number</label>
          <button onClick={() => handlePromptUpdate("phone", "phone number", settings.phone)}>
            {settings.phone}
          </button>
        </div>
        <div className="settings-item">
          <label>Preferred Language</label>
          <select
            value={settings.language}
            onChange={(e) => updateSetting("language", e.target.value)}
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>Swahili</option>
          </select>
        </div>
        <div className="settings-item">
          <label>Time Zone</label>
          <select
            value={settings.time_zone}
            onChange={(e) => updateSetting("time_zone", e.target.value)}
          >
            <option value="Africa/Nairobi">Africa/Nairobi</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New York</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>
      </section>

      {/* Preferences Section */}
      <section>
        <h2>🎛 App Preferences</h2>
        {[
          ["dark_mode", "Dark Mode"],
          ["push_notifications", "Push Notifications"],
          ["auto_update", "Auto Updates"],
          ["data_sharing", "Allow Data Sharing"],
        ].map(([field, label], index) => (
          <div className="settings-item" key={index}>
            <label>{label}</label>
            <input
              type="checkbox"
              checked={settings[field]}
              onChange={(e) => updateSetting(field, e.target.checked)}
            />
          </div>
        ))}
      </section>

      {/* Privacy Section */}
      <section>
        <h2>🔒 Privacy</h2>
        <div className="settings-item">
          <label>Private Profile</label>
          <input
            type="checkbox"
            checked={settings.privacy}
            onChange={(e) => updateSetting("privacy", e.target.checked)}
          />
        </div>
        <p className="settings-note">
          Enabling privacy will hide your profile, store, and public interactions from other users.
        </p>
      </section>

      {/* Support */}
      <section>
        <h2>📨 Support</h2>
        <p className="settings-item">
          Questions? <a href="mailto:support@omniflow.ai">Email Support</a>
        </p>
        <p className="settings-item">
          Want to give feedback? <a href="/feedback">Send Feedback</a>
        </p>
      </section>

      {/* Danger Zone */}
      <section>
        <h2>⚠️ Danger Zone</h2>
        <button className="delete-btn" onClick={handleDeleteAccount}>
          ❌ Delete My Account
        </button>
      </section>

      {/* About */}
      <section>
        <h2>📦 About</h2>
        <p className="settings-meta">Version: 1.0.0</p>
        <p className="settings-meta">© 2025 OmniFlow Inc. All rights reserved.</p>
      </section>
    </div>
  );
};

export default Settings;

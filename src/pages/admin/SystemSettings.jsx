import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-toastify";
import "./SystemSettings.css";

const adminSenderId = "a7e0653f-789d-408b-9a85-4d0db68b81ad";

const predefinedMessages = [
  {
    title: "System Update",
    message: "We’re performing scheduled maintenance tonight at 11 PM.",
  },
  {
    title: "🎉 New Features",
    message: "Check out the latest features we just launched!",
  },
  {
    title: "⚠️ Policy Reminder",
    message: "Please follow the updated community guidelines.",
  },
];

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [announcement, setAnnouncement] = useState({
    title: "",
    message: "",
    target: "global",
    userId: "",
  });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [{ data: settingsData }, { data: usersData }] = await Promise.all([
          supabase.from("platform_settings").select("*").order("created_at", { ascending: false }),
          supabase.from("users").select("id, email").order("email"),
        ]);
        setSettings(settingsData || []);
        setUsers(usersData || []);
      } catch (error) {
        toast.error("Error loading settings or users");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleBroadcast = async () => {
    const { title, message, target, userId } = announcement;

    if (!title.trim() || !message.trim()) {
      return toast.error("Please fill in both title and message.");
    }

    setSending(true);

    try {
      const { data: insertedSetting, error: settingError } = await supabase
        .from("platform_settings")
        .insert({ message: `${title}: ${message}` })
        .select()
        .single();

      if (settingError) throw settingError;

      let notifPayload = [];

      if (target === "global") {
        const { data: allUsers, error: usersErr } = await supabase.from("users").select("id");
        if (usersErr) throw usersErr;

        notifPayload = allUsers.map((u) => ({
          user_id: u.id,
          title,
          message,
          type: "announcement",
          read: false,
          color: "info",
          sender_id: adminSenderId,
        }));
      } else {
        if (!userId) {
          toast.error("Please select a user for specific message");
          return;
        }

        notifPayload = [
          {
            user_id: userId,
            title,
            message,
            type: "personal",
            read: false,
            color: "warning",
            sender_id: adminSenderId,
          },
        ];
      }

      const { error: notifError } = await supabase.from("notifications").insert(notifPayload);
      if (notifError) throw notifError;

      toast.success(target === "global" ? "📢 Global announcement sent!" : "📩 Message sent to user.");
      setSettings([insertedSetting, ...settings]);
      setAnnouncement({ title: "", message: "", target: "global", userId: "" });
    } catch (err) {
      console.error("Broadcast error:", err);
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this announcement?");
    if (!confirm) return;

    const { error } = await supabase.from("platform_settings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete announcement.");
    } else {
      toast.success("Announcement deleted.");
      setSettings((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleUseTemplate = (template) => {
    setAnnouncement((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
    }));
  };

  return (
    <div className="system-settings-container">
      <h2>⚙️ System Settings & Broadcast</h2>

      <div className="announcement-box">
        <input
          type="text"
          placeholder="Announcement Title"
          value={announcement.title}
          onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
        />
        <textarea
          placeholder="Enter your message here..."
          value={announcement.message}
          onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
        />

        <div className="target-type">
          <label>
            <input
              type="radio"
              name="target"
              value="global"
              checked={announcement.target === "global"}
              onChange={() => setAnnouncement({ ...announcement, target: "global", userId: "" })}
            />
            Global
          </label>
          <label>
            <input
              type="radio"
              name="target"
              value="user"
              checked={announcement.target === "user"}
              onChange={() => setAnnouncement({ ...announcement, target: "user" })}
            />
            Specific User
          </label>
        </div>

        {announcement.target === "user" && (
          <select
            value={announcement.userId}
            onChange={(e) => setAnnouncement({ ...announcement, userId: e.target.value })}
          >
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        )}

        <button onClick={handleBroadcast} disabled={sending}>
          {sending ? "Sending..." : "🚀 Broadcast"}
        </button>
      </div>

      <div className="quick-templates">
        <h3>📌 Quick Messages</h3>
        <div className="template-buttons">
          {predefinedMessages.map((t, index) => (
            <button key={index} onClick={() => handleUseTemplate(t)}>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <h3>📜 Past Announcements</h3>
      {loading ? (
        <p>Loading...</p>
      ) : settings.length === 0 ? (
        <p>No announcements yet.</p>
      ) : (
        <ul className="settings-list">
          {settings.map((s) => (
            <li key={s.id}>
              <strong>{new Date(s.created_at).toLocaleString()}:</strong> {s.message}
              <button
                className="delete-btn"
                onClick={() => handleDeleteAnnouncement(s.id)}
              >
                🗑 Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SystemSettings;

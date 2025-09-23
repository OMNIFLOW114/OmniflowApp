import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaEnvelope } from "react-icons/fa";
import SidebarMenu from "./SidebarMenu";
import { supabase } from "@/supabase";
import { useDarkMode } from "@/context/DarkModeContext"; 
import "./Home.css";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const Home = () => {
  const [greeting, setGreeting] = useState(getGreeting());
  const [userName, setUserName] = useState("there");
  const [showMenu, setShowMenu] = useState(false);
  const [newAdminNotification, setNewAdminNotification] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  // Update greeting every minute
  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  // Supabase user handling
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(
          user.user_metadata?.full_name || user.email?.split("@")[0] || "there"
        );
      }
    };

    getUser();

    // ✅ subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserName(
            session.user.user_metadata?.full_name ||
              session.user.email?.split("@")[0] ||
              "there"
          );
        } else {
          setUserName("there");
        }
      }
    );

    return () => subscription?.subscription.unsubscribe();
  }, []);

useEffect(() => {
  const fetchNotifications = async () => {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setNewMessages(false);
        return;
      }

      // Fetch unread messages for this user
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("is_read", false)
        .eq("receiver_id", user.id)
        .limit(1);

      if (messagesError) {
        console.error("Error fetching messages:", messagesError.message);
        setNewMessages(false);
      } else {
        setNewMessages(messagesData?.length > 0);
      }

    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      setNewMessages(false);
    }
  };

  fetchNotifications();

  const interval = setInterval(fetchNotifications, 15000); // check every 15s
  return () => clearInterval(interval);
}, []);

  const toggleMenu = useCallback(() => setShowMenu((prev) => !prev), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const tiles = [
    {
      title: "💎 OmniCash Wallet",
      description: "Next-gen wallet to send, receive, and grow your OmniCash.",
      link: "/wallet",
      color: "linear-gradient(135deg, #FFD700, #000000)",
    },
    {
      title: "🛍️ Trade & Virtual Store",
      description: "Buy, sell or dropship with OmniCash.",
      link: "/trade",
      color: "linear-gradient(135deg, #FF7E5F, #FEB47B)",
    },
    {
      title: "💼 Business Hub",
      description: "Create stores & post work opportunities.",
      link: "/business-hub",
      color: "linear-gradient(135deg, #6a11cb, #2575fc)",
    },
    {
      title: "🎓 Student Assistant",
      description: "AI exam tools, job matching & flashcards.",
      link: "/student",
      color: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    },
    // Removed OmniVerse tile
  ];

  return (
    <div className="home-container transition-all">
      {/* Navbar */}
      <nav className="navbar">
        <button
          onClick={toggleMenu}
          className="nav-icon profile-icon-wrapper"
          aria-label="Open menu"
        >
          <FaUserCircle size={26} />
          {newAdminNotification && <span className="dot top-left-dot" />}
        </button>

        <Link to="/messages" className="nav-icon messages-wrapper" aria-label="Messages">
          <FaEnvelope size={20} />
          {newMessages && <span className="dot top-right-dot" />}
        </Link>
      </nav>

      {/* Sidebar */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="sidebar-wrapper"
          >
            <SidebarMenu
              onClose={closeMenu}
              onLogout={handleLogout}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <motion.div className="omniflow-title">
        <h1 className="title">Omniflow</h1>
      </motion.div>

      {/* Greeting */}
      <motion.div
        className="greeting-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {greeting}, {userName} 👋
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Here's what's happening in your OmniFlow dashboard today.
        </motion.p>
      </motion.div>

      {/* Tiles */}
      <div className="tiles-container">
        {tiles.length > 0 ? (
          tiles.map((tile, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(tile.link)}
              className={`tile ${darkMode ? "dark-tile" : ""}`}
              style={{
                backgroundImage: tile.color,
              }}
              title={tile.description}
            >
              <h2>{tile.title}</h2>
              <p>{tile.description}</p>
            </motion.div>
          ))
        ) : (
          <p className="no-tiles">No features available at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default Home;

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaBell,
  FaEnvelope,
  FaHome,
  FaCompass,
  FaPlusCircle,
} from "react-icons/fa";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import SidebarMenu from "./SidebarMenu";
import TestBackendConnection from "@/components/TestBackendConnection";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const Home = () => {
  const [greeting, setGreeting] = useState(getGreeting());
  const [userName, setUserName] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUserName(storedUser?.displayName || auth.currentUser?.displayName || "there");
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => setShowMenu((prev) => !prev);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const tiles = [
    {
      title: "💰 OmniCurrency",
      description: "Manage your wallet, deposit, withdraw & earn rewards.",
      link: "/currency",
      color: "from-yellow-400 to-orange-500",
    },
    {
      title: "🛍️ Trade & Virtual Store",
      description: "Buy, sell, or dropship goods using OmniCash.",
      link: "/trade",
      color: "from-pink-500 to-red-600",
    },
    {
      title: "💼 Business Hub",
      description: "Create your virtual store & post opportunities.",
      link: "/store/create",
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "🎓 Student Assistant",
      description: "AI exam generator, job matching & past paper hub.",
      link: "/student",
      color: "from-green-400 to-emerald-600",
    },
    {
      title: "📊 Finance Tracker",
      description: "Track expenses & receive smart money advice.",
      link: "/finance",
      color: "from-purple-500 to-fuchsia-600",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-white to-purple-100">
      {/* Top Navbar */}
      <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="text-xl font-bold text-blue-700">OmniFlow</Link>
        <div className="flex items-center space-x-5">
          <Link to="/messages" className="text-gray-600 hover:text-blue-600" aria-label="Messages">
            <FaEnvelope size={20} />
          </Link>
          <button onClick={toggleMenu} className="text-gray-600 hover:text-blue-600 focus:outline-none" aria-label="User Menu">
            <FaUserCircle size={24} />
          </button>
        </div>
      </nav>

      {showMenu && <SidebarMenu onClose={toggleMenu} onLogout={handleLogout} />}

      {/* Greeting and Dashboard */}
      <motion.div
        className="flex-grow px-6 pt-10 pb-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-gray-800 mb-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {greeting}, {userName} 👋
          </motion.h1>
          <motion.p
            className="text-gray-600 text-lg mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Here's what's happening in your OmniFlow dashboard today.
          </motion.p>
        </div>

        {/* Feature Tiles */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiles.map((tile, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(tile.link)}
              className={`cursor-pointer p-6 rounded-2xl text-white shadow-xl bg-gradient-to-br ${tile.color}`}
              title={tile.description}
            >
              <h2 className="text-xl font-bold mb-2">{tile.title}</h2>
              <p className="text-sm text-white/90">{tile.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Backend Test */}
      <TestBackendConnection />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-inner py-2 px-6 flex justify-around items-center border-t z-50">
        <BottomNavLink to="/" icon={<FaHome size={22} />} label="Home" />
        <BottomNavLink to="/discover" icon={<FaCompass size={22} />} label="Discover" />
        <BottomNavLink to="/create" icon={<FaPlusCircle size={22} />} label="Create" />
        <BottomNavLink to="/notifications" icon={<FaBell size={22} />} label="Alerts" />
      </nav>
    </div>
  );
};

// 🔹 Bottom Nav Link Component
const BottomNavLink = ({ to, icon, label }) => (
  <Link to={to} className="flex flex-col items-center text-gray-700 hover:text-blue-600 transition">
    {icon}
    <span className="text-xs">{label}</span>
  </Link>
);

export default Home;

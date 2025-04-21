import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUserCircle,
  FaCogs,
  FaQuestionCircle,
  FaSignOutAlt,
} from "react-icons/fa";

const SidebarMenu = ({ onClose, onLogout }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 right-0 w-1/4 min-w-[250px] h-full bg-white shadow-lg z-50 flex flex-col"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-xl focus:outline-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col px-4 py-2 space-y-3">
          <Link
            to="/profile"
            className="flex items-center space-x-3 text-gray-700 hover:bg-gray-100 p-3 rounded-lg transition duration-200 ease-in-out"
            onClick={onClose}
          >
            <FaUserCircle size={20} /> <span className="text-sm">Profile</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center space-x-3 text-gray-700 hover:bg-gray-100 p-3 rounded-lg transition duration-200 ease-in-out"
            onClick={onClose}
          >
            <FaCogs size={20} /> <span className="text-sm">Settings</span>
          </Link>
          <Link
            to="/help"
            className="flex items-center space-x-3 text-gray-700 hover:bg-gray-100 p-3 rounded-lg transition duration-200 ease-in-out"
            onClick={onClose}
          >
            <FaQuestionCircle size={20} /> <span className="text-sm">Help Center</span>
          </Link>
          <button
            onClick={() => {
              onClose();
              onLogout(); // 🔐 triggers logout and redirect
            }}
            className="flex items-center space-x-3 text-red-600 hover:bg-red-50 p-3 rounded-lg transition duration-200 ease-in-out"
          >
            <FaSignOutAlt size={20} /> <span className="text-sm">Logout</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default SidebarMenu;

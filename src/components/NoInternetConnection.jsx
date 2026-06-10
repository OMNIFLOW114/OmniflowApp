// src/components/NoInternetConnection.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDarkMode } from "@/context/DarkModeContext";
import { FaSyncAlt } from "react-icons/fa";
import BrokenOmniFlowTrolley from "./icons/BrokenOmniFlowTrolley";
import styles from "./NoInternetConnection.module.css";

const NoInternetConnection = ({ onRetry }) => {
  const { darkMode } = useDarkMode();
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleRetry = async () => {
    setIsRetrying(true);
    setCountdown(3);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimeout(async () => {
      if (onRetry) {
        await onRetry();
      } else if (navigator.onLine) {
        window.location.reload();
      }
      setIsRetrying(false);
    }, 3000);
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.content}>
        {/* Large Centered Broken OmniFlow Trolley Illustration */}
        <motion.div
          className={styles.illustrationWrapper}
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 15, duration: 0.7 }}
        >
          <BrokenOmniFlowTrolley size={280} />
        </motion.div>

        {/* Title */}
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          No Connection
        </motion.h1>

        {/* Message */}
        <motion.p
          className={styles.message}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Can't connect to the internet.
          <br />
          Please check your internet connection
        </motion.p>

        {/* Retry Button */}
        <motion.button
          className={styles.retryButton}
          onClick={handleRetry}
          disabled={isRetrying}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileTap={{ scale: 0.97 }}
        >
          {isRetrying ? (
            <>
              <FaSyncAlt className={styles.spinning} />
              <span>Reconnecting{countdown > 0 ? ` in ${countdown}s` : '...'}</span>
            </>
          ) : (
            <>
              <FaSyncAlt />
              <span>Try Again</span>
            </>
          )}
        </motion.button>

        {/* Auto-retry hint */}
        <motion.p
          className={styles.hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          We'll reconnect automatically when your connection is restored
        </motion.p>
      </div>
    </div>
  );
};

export default NoInternetConnection;
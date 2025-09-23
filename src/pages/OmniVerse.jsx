import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./OmniVerse.module.css";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function OmniVerse() {
  const navigate = useNavigate();

  const sections = [
    {
      id: "vault",
      title: "🚪 The Vault",
      description: "Your portal to elite tasks, secret missions, and daily drops.",
      action: () => navigate("/vault"),
      locked: false,
    },
    {
      id: "skills",
      title: "🧠 Skill Ascend",
      description: "Level up your intelligence. Unlock AI-enhanced earnings.",
      action: null,
      locked: true,
    },
    {
      id: "referrals",
      title: "🔗 Echo Network",
      description: "Recruit. Earn. Rise in the pyramid of trust and influence.",
      action: null,
      locked: true,
    },
    {
      id: "contracts",
      title: "🔥 Dream Contracts",
      description: "Elite contracts only for the bold. Complete and conquer.",
      action: null,
      locked: true,
    },
  ];

  return (
    <div className={styles.omniverseContainer}>
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className={styles.title}>🌌 Welcome to the OmniVerse</h1>
        <p className={styles.subtitle}>
          A world built for the fearless — where intellect, grit, and network forge fortune.
        </p>
        <button
          className={styles.primaryButton}
          onClick={() => navigate("/vault")}
        >
          Enter The Vault
        </button>
      </motion.div>

      <div className={styles.sections}>
        {sections.map((section, idx) => (
          <motion.div
            key={section.id}
            className={`${styles.card} ${
              section.locked ? styles.locked : styles.unlocked
            }`}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
          >
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            {section.locked ? (
              <span className={styles.lockedLabel}>Coming Soon 🔒</span>
            ) : (
              <button
                onClick={section.action}
                className={styles.secondaryButton}
              >
                Launch
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <footer className={styles.footer}>
        <Sparkles size={18} />
        <span>OmniVerse: Evolve or be replaced.</span>
      </footer>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import styles from "./Vault.module.css";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";

export default function LootBoxModal({ reward, onClose }) {
  const [isOpening, setIsOpening] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRevealed(true);
    }, 2500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={styles.modalBackdrop}>
      <motion.div
        className={styles.lootBoxModal}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.lootBoxHeader}>
          <Sparkles size={20} /> Loot Drop Incoming!
        </div>

        <div className={styles.lootBoxContent}>
          {!revealed ? (
            <motion.div
              className={styles.lootBox}
              initial={{ scale: 1 }}
              animate={{ rotate: [0, -5, 5, -5, 5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: 0 }}
            >
              <Gift size={60} />
              <p>Opening...</p>
            </motion.div>
          ) : (
            <motion.div
              className={styles.rewardReveal}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2>🎉 You Got:</h2>
              <p className={styles.rewardText}>{reward}</p>
              <button className={styles.closeButton} onClick={onClose}>
                Close
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

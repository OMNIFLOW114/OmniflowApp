import React, { useEffect, useState } from "react";
import styles from "./Vault.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Star, Gift, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Vault() {
  const [tasks, setTasks] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [claimedTask, setClaimedTask] = useState(null);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    fetchVaultTasks();
  }, []);

  const fetchVaultTasks = async () => {
    const { data, error } = await supabase
      .from("vault_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching tasks:", error);
    else setTasks(data);
  };

  const handleClaim = async (task) => {
    setClaiming(true);
    setClaimedTask(task);

    // Simulated delay (for animation feel)
    setTimeout(() => {
      setXp((prev) => prev + 20); // XP gain placeholder
      setClaiming(false);
    }, 2000);
  };

  const closeModal = () => {
    setClaimedTask(null);
  };

  return (
    <div className={styles.vaultContainer}>
      {/* Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h1 className={styles.title}>🚪 Welcome to The Vault</h1>
        <p className={styles.subtitle}>Elite missions. Secret rewards. Unlock your legacy.</p>

        <div className={styles.xpBarWrapper}>
          <div className={styles.xpBar} style={{ width: `${xp}%` }} />
        </div>
      </motion.div>

      {/* Vault Tasks */}
      <div className={styles.tasksGrid}>
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            className={`${styles.taskCard} ${
              task.locked ? styles.locked : styles.unlocked
            }`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className={styles.taskTop}>
              <Star size={18} className={styles.icon} />
              <h3>{task.title}</h3>
            </div>
            <p>{task.description}</p>

            {task.locked ? (
              <div className={styles.lockedBadge}>
                <Lock size={14} /> Locked
              </div>
            ) : (
              <button
                className={styles.claimButton}
                onClick={() => handleClaim(task)}
                disabled={claiming}
              >
                <Gift size={14} /> Claim
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <Sparkles size={18} />
        <span>You’re inside. The vault opens daily. Don’t miss your drops.</span>
      </footer>

      {/* Loot Box Modal */}
      <AnimatePresence>
        {claimedTask && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <button onClick={closeModal} style={{ float: "right", background: "none", border: "none", color: "#fff" }}>
                <X size={20} />
              </button>
              <h2>🎉 You unlocked a reward!</h2>
              <div className={styles.rewardItem}>
                +20 XP<br />
                Loot: {claimedTask.title}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

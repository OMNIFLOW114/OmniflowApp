// src/pages/ReportProductPage.jsx - PREMIUM REDESIGNED VERSION
import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import {
  FaArrowLeft,
  FaFlag,
  FaExclamationTriangle,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaUserSecret,
  FaGavel,
  FaInfoCircle,
  FaPaperPlane,
  FaClipboardList
} from "react-icons/fa";
import styles from "./ReportProductPage.module.css";

const ReportProductPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  
  const productName = location.state?.productName || "this product";
  const productId = location.state?.productId || id;
  
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  
  const reportReasons = [
    { 
      value: "counterfeit", 
      label: "Counterfeit or Fake Product", 
      description: "Product appears to be counterfeit or not authentic",
      icon: <FaShieldAlt />,
      color: "#EF4444"
    },
    { 
      value: "misleading", 
      label: "Misleading Description", 
      description: "Product description does not match actual item",
      icon: <FaInfoCircle />,
      color: "#F59E0B"
    },
    { 
      value: "scam", 
      label: "Suspected Scam", 
      description: "Seller may be attempting fraudulent activity",
      icon: <FaUserSecret />,
      color: "#8B5CF6"
    },
    { 
      value: "prohibited", 
      label: "Prohibited Item", 
      description: "Product violates marketplace policies",
      icon: <FaGavel />,
      color: "#EC4899"
    },
    { 
      value: "spam", 
      label: "Spam or Duplicate Listing", 
      description: "Multiple identical listings or spam content",
      icon: <FaClipboardList />,
      color: "#06B6D4"
    },
    { 
      value: "inappropriate", 
      label: "Inappropriate Content", 
      description: "Product contains offensive or inappropriate content",
      icon: <FaTimesCircle />,
      color: "#EF4444"
    },
    { 
      value: "other", 
      label: "Other Issue", 
      description: "Other concern not listed above",
      icon: <FaExclamationTriangle />,
      color: "#6B7280"
    }
  ];
  
  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    if (text.length <= 500) {
      setDescription(text);
      setCharacterCount(text.length);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error("Please select a reason for reporting");
      return;
    }
    
    if (!user) {
      toast.error("Please login to report");
      navigate("/auth");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("product_reports")
        .insert([{
          product_id: productId,
          user_id: user.id,
          reason: reason,
          description: description.trim() || null,
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setSubmitted(true);
      toast.success("Report submitted successfully. Our team will review it shortly.");
      
      setTimeout(() => {
        navigate(-1);
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const selectedReasonData = reportReasons.find(r => r.value === reason);
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Report Product</h1>
        <div className={styles.headerRight}>
          <div className={styles.stepIndicator}>
            <span className={styles.stepDot}></span>
            <span className={styles.stepLine}></span>
            <span className={styles.stepDot}></span>
          </div>
        </div>
      </header>
      
      <div className={styles.content}>
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className={styles.form}
            >
              {/* Product Card */}
              <div className={styles.productCard}>
                <div className={styles.productIcon}>
                  <FaExclamationTriangle />
                </div>
                <div className={styles.productDetails}>
                  <h3>Reporting Product</h3>
                  <p>{productName}</p>
                </div>
                <div className={styles.productBadge}>
                  <span>Item ID: {productId?.slice(0, 8)}</span>
                </div>
              </div>
              
              {/* Trust Message */}
              <div className={styles.trustMessage}>
                <FaShieldAlt />
                <div>
                  <strong>Your report is anonymous</strong>
                  <p>The seller will not be notified that you reported this item. Your identity remains confidential.</p>
                </div>
              </div>
              
              {/* Reason Selection */}
              <div className={styles.formGroup}>
                <label>Why are you reporting this product? *</label>
                <div className={styles.reasonsGrid}>
                  {reportReasons.map((r) => (
                    <motion.button
                      key={r.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`${styles.reasonCard} ${reason === r.value ? styles.selected : ''}`}
                      style={{
                        borderColor: reason === r.value ? r.color : 'transparent',
                        background: reason === r.value ? `${r.color}10` : 'var(--bg-secondary)'
                      }}
                      onClick={() => setReason(r.value)}
                    >
                      <div className={styles.reasonIcon} style={{ color: r.color }}>
                        {r.icon}
                      </div>
                      <div className={styles.reasonInfo}>
                        <strong>{r.label}</strong>
                        <span>{r.description}</span>
                      </div>
                      {reason === r.value && (
                        <div className={styles.reasonCheck}>
                          <FaCheckCircle />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Selected Reason Preview */}
              {selectedReasonData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={styles.selectedReasonPreview}
                  style={{ borderLeftColor: selectedReasonData.color }}
                >
                  <strong>Selected:</strong> {selectedReasonData.label}
                </motion.div>
              )}
              
              {/* Additional Details */}
              <div className={styles.formGroup}>
                <label>Additional Details (Optional)</label>
                <div className={styles.textareaWrapper}>
                  <textarea
                    placeholder="Please provide any additional information that may help us investigate this report. Be specific about the issue you've identified..."
                    rows={5}
                    value={description}
                    onChange={handleDescriptionChange}
                    maxLength={500}
                  />
                  <div className={styles.charCounter}>
                    <span className={characterCount > 450 ? styles.warning : ''}>
                      {characterCount}/500
                    </span>
                  </div>
                </div>
                <p className={styles.hint}>
                  Include specific details that can help our moderation team investigate effectively.
                </p>
              </div>
              
              {/* Form Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting || !reason}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className={styles.spinning} />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.successContainer}
            >
              <div className={styles.successAnimation}>
                <div className={styles.successCircle}>
                  <FaCheckCircle />
                </div>
              </div>
              <h2>Report Submitted</h2>
              <p>Thank you for helping keep ComradeMarket safe and trustworthy.</p>
              <div className={styles.successDetails}>
                <div className={styles.successDetailItem}>
                  <FaShieldAlt />
                  <span>Your report is anonymous</span>
                </div>
                <div className={styles.successDetailItem}>
                  <FaClock />
                  <span>Review typically takes 24-48 hours</span>
                </div>
                <div className={styles.successDetailItem}>
                  <FaGavel />
                  <span>Appropriate action will be taken</span>
                </div>
              </div>
              <button className={styles.continueBtn} onClick={() => navigate(-1)}>
                Continue Shopping
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Bottom Spacing for Navigation */}
      <div className={styles.bottomSpacing} />
    </div>
  );
};

export default ReportProductPage;
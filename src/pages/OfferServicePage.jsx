// src/pages/OfferServicePage.jsx - Service Creation Page
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaGraduationCap, FaClock, FaMoneyBillWave,
  FaMapMarkerAlt, FaCheck, FaInfoCircle, FaPlus, FaTimes,
  FaTag, FaSpinner, FaBook, FaLaptop, FaPalette, FaChalkboardTeacher, FaBriefcase, FaArrowRight
} from "react-icons/fa";
import styles from "./OfferServicePage.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const OfferServicePage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [campusProfile, setCampusProfile] = useState(null);
  const [activeSection, setActiveSection] = useState("basic");
  const [showHelp, setShowHelp] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price_type: "fixed",
    price_amount: "",
    price_range: "",
    delivery_time: "",
    tags: [],
    requirements: []
  });
  
  const [tagInput, setTagInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  // Categories
  const categories = [
    { id: "academic", name: "Academic", icon: <FaBook />, color: "#10B981", description: "Essays, research, homework help" },
    { id: "technical", name: "Technical", icon: <FaLaptop />, color: "#3B82F6", description: "Programming, web dev, IT support" },
    { id: "creative", name: "Creative", icon: <FaPalette />, color: "#EC4899", description: "Design, writing, video editing" },
    { id: "tutoring", name: "Tutoring", icon: <FaChalkboardTeacher />, color: "#F59E0B", description: "One-on-one teaching" },
    { id: "consulting", name: "Consulting", icon: <FaBriefcase />, color: "#8B5CF6", description: "Career advice, mentorship" }
  ];

  // Suggested tags
  const suggestedTags = [
    "fast_delivery", "experienced", "student_discount", "urgent", 
    "flexible", "group_discount", "online_only", "in_person"
  ];

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      if (!user?.id) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData) setUserProfile(profileData);
      
      const { data: campusData } = await supabase
        .from('student_campus_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (campusData) setCampusProfile(campusData);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Unable to load profile');
    }
  };

  const getUserCampus = () => {
    return campusProfile?.campus_name || userProfile?.city || "University of Nairobi";
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.title.trim()) errors.push("Service title is required");
    if (formData.title.length < 5) errors.push("Title must be at least 5 characters");
    
    if (!formData.description.trim()) errors.push("Description is required");
    if (formData.description.length < 20) errors.push("Description must be at least 20 characters");
    
    if (!formData.category) errors.push("Please select a category");
    
    if (formData.price_type === "fixed" && !formData.price_amount) {
      errors.push("Please enter a price amount");
    } else if (formData.price_type === "range" && !formData.price_range) {
      errors.push("Please enter a price range");
    }
    
    if (!formData.delivery_time) errors.push("Please specify delivery time");
    
    return errors;
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim()) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
      toast.success('Tag added');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addRequirement = () => {
    if (requirementInput.trim() && !formData.requirements.includes(requirementInput.trim()) && formData.requirements.length < 8) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, requirementInput.trim()]
      }));
      setRequirementInput("");
      toast.success('Requirement added');
    }
  };

  const removeRequirement = (reqToRemove) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req !== reqToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      errors.forEach(error => toast.error(error));
      return;
    }
    
    setLoading(true);
    
    try {
      const serviceData = {
        provider_user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price_type: formData.price_type,
        price_amount: formData.price_type === "fixed" ? parseFloat(formData.price_amount) : null,
        price_range: formData.price_type === "range" ? formData.price_range : null,
        delivery_time: formData.delivery_time,
        campus_name: getUserCampus(),
        tags: formData.tags,
        requirements: formData.requirements,
        is_active: true,
        total_orders: 0,
        rating: 0
      };

      const { data, error } = await supabase
        .from('student_services')
        .insert([serviceData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Service offered successfully! 🎉');
      navigate('/student/marketplace');
      
    } catch (error) {
      console.error('Error offering service:', error);
      toast.error(error.message || 'Failed to offer service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Steps for progress indicator
  const steps = [
    { id: "basic", label: "Basic Info", icon: "📝" },
    { id: "pricing", label: "Pricing", icon: "💰" },
    { id: "details", label: "Details", icon: "⚙️" }
  ];

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Offer a Service</h1>
        <button className={styles.helpBtn} onClick={() => setShowHelp(!showHelp)}>
          <FaInfoCircle />
        </button>
      </header>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className={styles.helpPanel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className={styles.helpContent}>
              <h4>Tips for a successful service</h4>
              <ul>
                <li>✨ Be specific about what you're offering</li>
                <li>💰 Price competitively - research similar services</li>
                <li>⏰ Set realistic delivery times</li>
                <li>🏷️ Use relevant tags to help students find you</li>
                <li>📝 List clear requirements for customers</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Steps */}
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`${styles.step} ${activeSection === step.id ? styles.active : ''}`}
            onClick={() => setActiveSection(step.id)}
          >
            <span className={styles.stepNumber}>{index + 1}</span>
            <span className={styles.stepLabel}>{step.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Basic Information Section */}
        {activeSection === "basic" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Service Title *</label>
              <input
                type="text"
                placeholder="e.g., Math Tutoring, Web Development, Essay Writing"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={100}
              />
              <div className={styles.charCount}>{formData.title.length}/100</div>
            </div>

            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                placeholder="Describe your service in detail. What you offer, your experience, what makes you unique..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                maxLength={500}
              />
              <div className={styles.charCount}>{formData.description.length}/500</div>
            </div>

            <div className={styles.formGroup}>
              <label>Category *</label>
              <div className={styles.categoryGrid}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${styles.categoryBtn} ${formData.category === cat.id ? styles.selected : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                  >
                    <span className={styles.categoryIcon} style={{ color: cat.color }}>
                      {cat.icon}
                    </span>
                    <div className={styles.categoryInfo}>
                      <span>{cat.name}</span>
                      <small>{cat.description}</small>
                    </div>
                    {formData.category === cat.id && <FaCheck className={styles.checkIcon} />}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("pricing")}>
                Next: Pricing <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Pricing Section */}
        {activeSection === "pricing" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Pricing Type *</label>
              <div className={styles.priceTypeOptions}>
                <button
                  type="button"
                  className={`${styles.priceTypeBtn} ${formData.price_type === 'fixed' ? styles.selected : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, price_type: 'fixed', price_range: '' }))}
                >
                  <FaMoneyBillWave /> Fixed Price
                </button>
                <button
                  type="button"
                  className={`${styles.priceTypeBtn} ${formData.price_type === 'range' ? styles.selected : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, price_type: 'range', price_amount: '' }))}
                >
                  <FaMoneyBillWave /> Price Range
                </button>
              </div>
            </div>

            {formData.price_type === 'fixed' && (
              <div className={styles.formGroup}>
                <label>Price Amount *</label>
                <div className={styles.priceInput}>
                  <FaMoneyBillWave />
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.price_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_amount: e.target.value }))}
                    min="0"
                    step="50"
                  />
                  <span>KSh</span>
                </div>
              </div>
            )}

            {formData.price_type === 'range' && (
              <div className={styles.formGroup}>
                <label>Price Range *</label>
                <input
                  type="text"
                  placeholder="e.g., KSh 500 - 2,000 or KSh 1,000 - 5,000"
                  value={formData.price_range}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
                />
                <p className={styles.hint}>Example: KSh 500 - 2,000 (depending on complexity)</p>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Delivery Time *</label>
              <input
                type="text"
                placeholder="e.g., Within 24 hours, 2-3 days, Flexible"
                value={formData.delivery_time}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_time: e.target.value }))}
              />
              <p className={styles.hint}>Be realistic about how long the service takes</p>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("basic")}>
                <FaArrowLeft /> Back
              </button>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("details")}>
                Next: Details <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Details Section */}
        {activeSection === "details" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Tags</label>
              <p className={styles.hint}>Add tags to help students find your service (max 10)</p>
              
              <div className={styles.tagsDisplay}>
                {formData.tags.map(tag => (
                  <span key={tag} className={styles.tag}>
                    #{tag.replace('_', ' ')}
                    <button type="button" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              
              <div className={styles.tagInput}>
                <input
                  type="text"
                  placeholder="Enter a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button type="button" onClick={addTag} disabled={!tagInput.trim()}>
                  <FaPlus />
                </button>
              </div>
              
              <div className={styles.suggestedTags}>
                <p className={styles.suggestedLabel}>Suggested tags:</p>
                <div className={styles.tagsGrid}>
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.suggestedTag}
                      onClick={() => {
                        if (!formData.tags.includes(tag)) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                        }
                      }}
                      disabled={formData.tags.includes(tag)}
                    >
                      <FaTag /> {tag.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Requirements</label>
              <p className={styles.hint}>What do customers need to provide? (max 8)</p>
              
              <div className={styles.requirementsDisplay}>
                {formData.requirements.map(req => (
                  <span key={req} className={styles.requirement}>
                    <FaCheck /> {req}
                    <button type="button" onClick={() => removeRequirement(req)}>×</button>
                  </span>
                ))}
              </div>
              
              <div className={styles.requirementInput}>
                <input
                  type="text"
                  placeholder="e.g., Assignment brief, Course materials..."
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                />
                <button type="button" onClick={addRequirement} disabled={!requirementInput.trim()}>
                  <FaPlus />
                </button>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <h4>Service Summary</h4>
              <div className={styles.summaryItem}>
                <span>Title:</span>
                <strong>{formData.title || "Not set"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Category:</span>
                <strong>{categories.find(c => c.id === formData.category)?.name || "Not selected"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Pricing:</span>
                <strong>
                  {formData.price_type === 'fixed' 
                    ? formatKenyanPrice(formData.price_amount)
                    : formData.price_range || "Not set"}
                </strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Delivery:</span>
                <strong>{formData.delivery_time || "Not set"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Tags:</span>
                <strong>{formData.tags.length} tags</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Campus:</span>
                <strong>{getUserCampus()}</strong>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("pricing")}>
                <FaArrowLeft /> Back
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className={styles.spinning} />
                    Offering Service...
                  </>
                ) : (
                  "Offer Service"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
};

export default OfferServicePage;
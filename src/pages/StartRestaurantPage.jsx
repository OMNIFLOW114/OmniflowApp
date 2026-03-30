// src/pages/StartRestaurantPage.jsx - PRODUCTION READY
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaCamera, FaUtensils, FaClock,
  FaPhone, FaMapMarkerAlt, FaUniversity, FaMoneyBillWave,
  FaCheck, FaInfoCircle, FaUpload, FaTrash, FaPlus,
  FaStore, FaPizzaSlice, FaHamburger, FaAppleAlt,
  FaCoffee, FaBreadSlice, FaLeaf, FaSpinner, FaStar,
  FaMotorcycle, FaCalendarAlt, FaTag, FaPercent, FaTimes, FaArrowRight
} from "react-icons/fa";
import styles from "./StartRestaurantPage.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

// Cuisine types with icons
const cuisineTypes = [
  { value: "Kenyan Traditional", label: "Kenyan Traditional", icon: <FaUtensils />, color: "#F59E0B" },
  { value: "Pizza & Italian", label: "Pizza & Italian", icon: <FaPizzaSlice />, color: "#EF4444" },
  { value: "Burgers & Fast Food", label: "Burgers & Fast Food", icon: <FaHamburger />, color: "#F97316" },
  { value: "Chinese", label: "Chinese", icon: <FaUtensils />, color: "#EF4444" },
  { value: "Indian", label: "Indian", icon: <FaUtensils />, color: "#8B5CF6" },
  { value: "Breakfast & Brunch", label: "Breakfast & Brunch", icon: <FaCoffee />, color: "#10B981" },
  { value: "Coffee & Snacks", label: "Coffee & Snacks", icon: <FaCoffee />, color: "#A855F7" },
  { value: "Bakery", label: "Bakery", icon: <FaBreadSlice />, color: "#EC4899" },
  { value: "Healthy & Salads", label: "Healthy & Salads", icon: <FaLeaf />, color: "#84CC16" },
  { value: "Other", label: "Other", icon: <FaStore />, color: "#6B7280" }
];

// Delivery time options
const deliveryTimes = [
  { value: "10-20 min", label: "10-20 minutes", icon: "⚡" },
  { value: "15-25 min", label: "15-25 minutes", icon: "🚀" },
  { value: "20-30 min", label: "20-30 minutes", icon: "🏃" },
  { value: "25-35 min", label: "25-35 minutes", icon: "🚶" },
  { value: "30-45 min", label: "30-45 minutes", icon: "🐢" }
];

// Weekdays for operating hours
const weekdays = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

const StartRestaurantPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [userCampus, setUserCampus] = useState(null);
  const [activeSection, setActiveSection] = useState("basic");
  const [showHelp, setShowHelp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cuisine_type: "",
    location_description: "",
    contact_phone: "",
    delivery_time_range: "15-25 min",
    min_order_amount: "200",
    delivery_fee: "0",
    operating_hours: {
      monday: "7:00-22:00",
      tuesday: "7:00-22:00",
      wednesday: "7:00-22:00",
      thursday: "7:00-22:00",
      friday: "7:00-23:00",
      saturday: "8:00-23:00",
      sunday: "8:00-22:00"
    },
    special_offers: []
  });
  
  const [coverImage, setCoverImage] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserCampus();
  }, [user, navigate]);

  const loadUserCampus = async () => {
    try {
      const { data, error } = await supabase
        .from('student_campus_profiles')
        .select('campus_name, campus_location')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setUserCampus(data);
      } else {
        toast.error('Please complete your campus profile first');
        navigate('/student/profile');
      }
    } catch (error) {
      console.error('Error loading campus:', error);
      toast.error('Failed to load campus information');
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push("Restaurant name is required");
    if (formData.name.length < 3) errors.push("Name must be at least 3 characters");
    
    if (!formData.description.trim()) errors.push("Description is required");
    if (formData.description.length < 20) errors.push("Description must be at least 20 characters");
    
    if (!formData.cuisine_type) errors.push("Please select a cuisine type");
    
    if (!formData.location_description.trim()) errors.push("Location description is required");
    
    if (!formData.contact_phone.trim()) errors.push("Contact phone is required");
    if (!/^\+?[0-9]{10,13}$/.test(formData.contact_phone.replace(/\s/g, ''))) {
      errors.push("Please enter a valid phone number");
    }
    
    if (parseFloat(formData.min_order_amount) < 0) errors.push("Minimum order amount cannot be negative");
    if (parseFloat(formData.delivery_fee) < 0) errors.push("Delivery fee cannot be negative");
    
    if (!coverImage) errors.push("Please add a cover photo for your restaurant");
    
    return errors;
  };

  const handleImageUpload = async (file) => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WEBP images are allowed");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
      const filePath = `restaurants/${user.id}/${fileName}`;

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(interval);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      setCoverImage(publicUrl);
      setUploadProgress(100);
      toast.success('Cover photo uploaded successfully');
      
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
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
      const restaurantData = {
        owner_user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        cuisine_type: formData.cuisine_type,
        campus_name: userCampus.campus_name,
        location_description: formData.location_description.trim(),
        contact_phone: formData.contact_phone.trim(),
        delivery_time_range: formData.delivery_time_range,
        min_order_amount: parseFloat(formData.min_order_amount),
        delivery_fee: parseFloat(formData.delivery_fee),
        cover_image_url: coverImage,
        operating_hours: formData.operating_hours,
        special_offers: formData.special_offers,
        is_active: true,
        rating: 0,
        total_ratings: 0,
        total_orders: 0
      };

      const { data, error } = await supabase
        .from('campus_restaurants')
        .insert([restaurantData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Restaurant created successfully! 🎉');
      navigate('/student/marketplace');
      
    } catch (error) {
      console.error('Error creating restaurant:', error);
      toast.error(error.message || 'Failed to create restaurant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSpecialOffer = () => {
    const offer = prompt("Enter special offer (e.g., 'Free delivery on orders above 500'):");
    if (offer && offer.trim()) {
      if (formData.special_offers.length >= 5) {
        toast.error("Maximum 5 special offers allowed");
        return;
      }
      setFormData(prev => ({
        ...prev,
        special_offers: [...prev.special_offers, offer.trim()]
      }));
      toast.success('Special offer added');
    }
  };

  const removeSpecialOffer = (index) => {
    setFormData(prev => ({
      ...prev,
      special_offers: prev.special_offers.filter((_, i) => i !== index)
    }));
    toast.success('Offer removed');
  };

  const updateOperatingHours = (day, value) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: value
      }
    }));
  };

  // Steps for progress indicator
  const steps = [
    { id: "basic", label: "Basic Info", icon: "📝" },
    { id: "location", label: "Location", icon: "📍" },
    { id: "delivery", label: "Delivery", icon: "🚚" },
    { id: "offers", label: "Offers", icon: "🏷️" }
  ];

  // Loading skeleton
  if (!userCampus && !loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBackBtn}></div>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonHelpBtn}></div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>Loading your campus information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Start Food Business</h1>
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
              <h4>Tips for a successful restaurant</h4>
              <ul>
                <li>📸 Use a high-quality cover photo that showcases your best dishes</li>
                <li>✍️ Write a detailed description highlighting your specialties</li>
                <li>💰 Set competitive prices - research other campus restaurants</li>
                <li>📍 Be specific about your location for easy pickup/delivery</li>
                <li>🏷️ Add special offers to attract more customers</li>
                <li>⏰ Keep operating hours accurate to avoid customer disappointment</li>
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
            {/* Cover Image */}
            <div className={styles.formGroup}>
              <label>Restaurant Cover Image *</label>
              <p className={styles.hint}>Add an eye-catching cover photo for your restaurant</p>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                  <span>Uploading... {uploadProgress}%</span>
                </div>
              )}
              
              <div className={styles.coverImageUpload}>
                {coverImage ? (
                  <div className={styles.coverPreview}>
                    <img src={coverImage} alt="Restaurant cover" />
                    <button
                      type="button"
                      className={styles.removeCoverBtn}
                      onClick={() => setCoverImage(null)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ) : (
                  <label className={styles.coverUploadBtn}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    {uploading ? (
                      <div className={styles.uploadingSpinner}>
                        <FaSpinner className={styles.spinning} />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <FaCamera />
                        <span>Add Cover Photo</span>
                        <small>Recommended: 1200x600px</small>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Restaurant Name *</label>
              <input
                type="text"
                placeholder="e.g., Mama Njeri Cafe, Campus Pizza Hub..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={50}
              />
              <div className={styles.charCount}>{formData.name.length}/50</div>
            </div>

            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                placeholder="Describe your restaurant, specialty dishes, what makes you unique..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                maxLength={500}
              />
              <div className={styles.charCount}>{formData.description.length}/500</div>
            </div>

            <div className={styles.formGroup}>
              <label>Cuisine Type *</label>
              <div className={styles.cuisineGrid}>
                {cuisineTypes.map(cuisine => (
                  <button
                    key={cuisine.value}
                    type="button"
                    className={`${styles.cuisineBtn} ${formData.cuisine_type === cuisine.value ? styles.selected : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, cuisine_type: cuisine.value }))}
                  >
                    <span className={styles.cuisineIcon} style={{ color: cuisine.color }}>
                      {cuisine.icon}
                    </span>
                    <span>{cuisine.label}</span>
                    {formData.cuisine_type === cuisine.value && <FaCheck className={styles.checkIcon} />}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("location")}>
                Next: Location <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Location Section */}
        {activeSection === "location" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Campus</label>
              <div className={styles.campusDisplay}>
                <FaUniversity />
                <span>{userCampus?.campus_name || "Loading..."}</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Location Description *</label>
              <input
                type="text"
                placeholder="e.g., Near Hostel A, Opposite Library, Main Campus Gate..."
                value={formData.location_description}
                onChange={(e) => setFormData(prev => ({ ...prev, location_description: e.target.value }))}
              />
              <p className={styles.hint}>Be specific to help customers find you easily</p>
            </div>

            <div className={styles.formGroup}>
              <label>Contact Phone *</label>
              <div className={styles.phoneInput}>
                <FaPhone />
                <input
                  type="tel"
                  placeholder="+254712345678"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Operating Hours</label>
              <div className={styles.hoursGrid}>
                {weekdays.map(day => (
                  <div key={day} className={styles.hourRow}>
                    <span className={styles.dayLabel}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                    <input
                      type="text"
                      value={formData.operating_hours[day]}
                      onChange={(e) => updateOperatingHours(day, e.target.value)}
                      placeholder="9:00-22:00"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("basic")}>
                <FaArrowLeft /> Back
              </button>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("delivery")}>
                Next: Delivery <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Delivery Section */}
        {activeSection === "delivery" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Delivery Time *</label>
                <div className={styles.deliveryTimeGrid}>
                  {deliveryTimes.map(time => (
                    <button
                      key={time.value}
                      type="button"
                      className={`${styles.timeBtn} ${formData.delivery_time_range === time.value ? styles.selected : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, delivery_time_range: time.value }))}
                    >
                      <span>{time.icon}</span>
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Minimum Order Amount *</label>
                <div className={styles.priceInput}>
                  <FaMoneyBillWave />
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                    min="0"
                    step="50"
                  />
                  <span>KSh</span>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Delivery Fee</label>
              <div className={styles.priceInput}>
                <FaMoneyBillWave />
                <input
                  type="number"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: e.target.value }))}
                  min="0"
                  step="50"
                />
                <span>KSh</span>
              </div>
              <p className={styles.hint}>Set to 0 for free delivery</p>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("location")}>
                <FaArrowLeft /> Back
              </button>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("offers")}>
                Next: Offers <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Offers Section */}
        {activeSection === "offers" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Special Offers</label>
              <p className={styles.hint}>Add promotions to attract more customers (max 5)</p>
              
              <div className={styles.offersList}>
                {formData.special_offers.map((offer, index) => (
                  <div key={index} className={styles.offerItem}>
                    <span className={styles.offerIcon}>🎉</span>
                    <span className={styles.offerText}>{offer}</span>
                    <button
                      type="button"
                      className={styles.removeOfferBtn}
                      onClick={() => removeSpecialOffer(index)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
              
              {formData.special_offers.length < 5 && (
                <button
                  type="button"
                  className={styles.addOfferBtn}
                  onClick={addSpecialOffer}
                >
                  <FaPlus /> Add Special Offer
                </button>
              )}
            </div>

            {/* Summary Card */}
            <div className={styles.summaryCard}>
              <h4>Restaurant Summary</h4>
              <div className={styles.summaryItem}>
                <span>Name:</span>
                <strong>{formData.name || "Not set"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Cuisine:</span>
                <strong>{formData.cuisine_type || "Not selected"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Location:</span>
                <strong>{formData.location_description || "Not set"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Delivery:</span>
                <strong>{formData.delivery_time_range}</strong>
                <span className={styles.deliveryFeeBadge}>
                  {parseFloat(formData.delivery_fee) === 0 ? 'Free Delivery' : formatKenyanPrice(formData.delivery_fee)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span>Min Order:</span>
                <strong>{formatKenyanPrice(formData.min_order_amount)}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Offers:</span>
                <strong>{formData.special_offers.length} active offers</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Cover Photo:</span>
                <strong>{coverImage ? "✅ Uploaded" : "❌ Missing"}</strong>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("delivery")}>
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
                    Creating Restaurant...
                  </>
                ) : (
                  "Start Food Business"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
};

export default StartRestaurantPage;
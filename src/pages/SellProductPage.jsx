// src/pages/SellProductPage.jsx - PRODUCTION READY
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaCamera, FaUpload, FaTag, FaMoneyBillWave,
  FaMapMarkerAlt, FaUniversity, FaCheck, FaInfoCircle,
  FaSpinner, FaTrash, FaPlus, FaImage, FaTimes,
  FaStore, FaBook, FaLaptop, FaTshirt, FaHome, FaFutbol,
  FaCouch, FaGripfire, FaPercent, FaArrowRight
} from "react-icons/fa";
import styles from "./SellProductPage.module.css";

// Helper function for validation
const validateForm = (formData, images) => {
  const errors = [];
  
  if (!formData.title.trim()) errors.push("Product title is required");
  if (formData.title.length < 5) errors.push("Title must be at least 5 characters");
  if (formData.title.length > 100) errors.push("Title must be less than 100 characters");
  
  if (!formData.description.trim()) errors.push("Description is required");
  if (formData.description.length < 20) errors.push("Description must be at least 20 characters");
  
  if (!formData.price) errors.push("Price is required");
  if (parseFloat(formData.price) <= 0) errors.push("Price must be greater than 0");
  if (parseFloat(formData.price) > 10000000) errors.push("Price seems too high. Please verify.");
  
  if (!formData.category) errors.push("Please select a category");
  if (!formData.condition) errors.push("Please select condition");
  
  if (formData.meeting_places.length === 0) errors.push("Please select at least one meeting place");
  
  if (images.length === 0) errors.push("Please upload at least one product image");
  if (images.length > 5) errors.push("Maximum 5 images allowed");
  
  return errors;
};

const SellProductPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [campusProfile, setCampusProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");
  const [showHelp, setShowHelp] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "good",
    meeting_places: [],
    is_negotiable: true,
    tags: []
  });
  
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  // Categories with icons
  const categories = [
    { value: "textbooks", label: "Textbooks", icon: <FaBook />, color: "#10B981" },
    { value: "electronics", label: "Electronics", icon: <FaLaptop />, color: "#3B82F6" },
    { value: "clothing", label: "Clothing", icon: <FaTshirt />, color: "#EF4444" },
    { value: "dorm_essentials", label: "Dorm Essentials", icon: <FaHome />, color: "#F59E0B" },
    { value: "sports", label: "Sports", icon: <FaFutbol />, color: "#84CC16" },
    { value: "furniture", label: "Furniture", icon: <FaCouch />, color: "#EC4899" },
    { value: "accessories", label: "Accessories", icon: <FaGripfire />, color: "#A855F7" },
    { value: "other", label: "Other", icon: <FaStore />, color: "#6B7280" }
  ];

  // Condition options
  const conditions = [
    { value: "new", label: "New", description: "Never used, in original packaging" },
    { value: "like_new", label: "Like New", description: "Used briefly, looks new" },
    { value: "good", label: "Good", description: "Light signs of use, fully functional" },
    { value: "fair", label: "Fair", description: "Visible wear, fully functional" }
  ];

  // Meeting places
  const meetingPlaces = [
    "Library", "Main Gate", "Cafeteria", "Hostel A", "Hostel B",
    "Student Center", "Sports Complex", "Parking Lot", "Lecture Hall", "Other"
  ];

  // Suggested tags
  const suggestedTags = [
    { value: "urgent_sale", label: "Urgent Sale", icon: "⚡" },
    { value: "price_negotiable", label: "Price Negotiable", icon: "💰" },
    { value: "like_new", label: "Like New", icon: "✨" },
    { value: "barely_used", label: "Barely Used", icon: "🆕" },
    { value: "must_sell", label: "Must Sell", icon: "🔥" },
    { value: "bundle", label: "Bundle Deal", icon: "📦" },
    { value: "student_discount", label: "Student Discount", icon: "🎓" },
    { value: "free_delivery", label: "Free Delivery", icon: "🚚" }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserData();
  }, [user, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) return;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (profileData) {
        setUserProfile(profileData);
      } else {
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "Student",
          email: user.email,
          profile_completed: false
        };
        await supabase.from('profiles').insert([newProfile]);
        setUserProfile(newProfile);
      }
      
      // Load campus profile
      const { data: campusData } = await supabase
        .from('student_campus_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (campusData) {
        setCampusProfile(campusData);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Unable to load profile');
      setUserProfile({
        id: user.id,
        full_name: "Student",
        email: user.email,
        city: "University of Nairobi"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserCampus = () => {
    return campusProfile?.campus_name || userProfile?.city || "University of Nairobi";
  };

  const handleImageUpload = async (file) => {
    if (images.length >= 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

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
      const filePath = `products/${user.id}/${fileName}`;

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(interval);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImages(prev => [...prev, publicUrl]);
      setUploadProgress(100);
      toast.success('Image uploaded successfully');
      
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm(formData, images);
    if (errors.length > 0) {
      setValidationErrors(errors);
      errors.forEach(error => toast.error(error));
      setActiveSection("basic");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const campusName = getUserCampus();
      
      const productData = {
        seller_user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: images,
        campus_name: campusName,
        meeting_places: formData.meeting_places,
        is_negotiable: formData.is_negotiable,
        tags: formData.tags,
        status: 'available',
        created_at: new Date().toISOString(),
        view_count: 0,
        like_count: 0
      };

      const { data, error } = await supabase
        .from('campus_products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          toast.error("Permission denied. Please check your login status.");
          return;
        }
        throw error;
      }

      toast.success('Product listed successfully! 🎉');
      navigate('/student/marketplace');
      
    } catch (error) {
      console.error('Error listing product:', error);
      toast.error(error.message || 'Failed to list product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = (tag) => {
    if (formData.tags.length >= 8) {
      toast.error("Maximum 8 tags allowed");
      return;
    }
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      toast.success(`Added tag: ${tag.replace('_', ' ')}`);
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const updateCampus = async () => {
    const campus = prompt("Enter your campus/university name:", getUserCampus());
    if (campus && campus.trim()) {
      setUserProfile(prev => ({ ...prev, city: campus }));
      
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ city: campus })
          .eq('id', user.id);
        
        if (!error) {
          toast.success('Campus updated successfully');
        }
      }
    }
  };

  // Progress steps
  const steps = [
    { id: "basic", label: "Basic Info", icon: "📝" },
    { id: "media", label: "Photos", icon: "📸" },
    { id: "details", label: "Details", icon: "⚙️" },
    { id: "location", label: "Location", icon: "📍" }
  ];

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBackBtn}></div>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonHelpBtn}></div>
        </div>
        <div className={styles.skeletonSteps}>
          {[1,2,3,4].map(i => <div key={i} className={styles.skeletonStep}></div>)}
        </div>
        <div className={styles.skeletonForm}>
          <div className={styles.skeletonInput}></div>
          <div className={styles.skeletonInput}></div>
          <div className={styles.skeletonInput}></div>
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
        <h1>Sell Your Item</h1>
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
              <h4>Tips for successful listing</h4>
              <ul>
                <li>📸 Use clear, well-lit photos showing all angles</li>
                <li>✍️ Write a detailed description with condition and reason for selling</li>
                <li>💰 Price competitively - check similar items on campus</li>
                <li>📍 Choose specific meeting places on campus</li>
                <li>🏷️ Add relevant tags to help buyers find your item</li>
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
              <label>Product Title *</label>
              <input
                type="text"
                placeholder="e.g., MacBook Air M1 2020, Calculus Textbook, Nike Air Max"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={100}
                className={formData.title.length > 90 ? styles.warning : ''}
              />
              <div className={styles.charCount}>
                <span className={formData.title.length > 90 ? styles.warning : ''}>
                  {formData.title.length}/100
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                placeholder="Describe your item in detail. Include condition, features, reason for selling, any defects, etc."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                maxLength={500}
              />
              <div className={styles.charCount}>
                <span>{formData.description.length}/500</span>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Category *</label>
                <div className={styles.categoryGrid}>
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`${styles.categoryBtn} ${formData.category === cat.value ? styles.selected : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                    >
                      <span className={styles.categoryIcon} style={{ color: cat.color }}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                      {formData.category === cat.value && <FaCheck className={styles.checkIcon} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Condition *</label>
                <div className={styles.conditionGrid}>
                  {conditions.map(cond => (
                    <button
                      key={cond.value}
                      type="button"
                      className={`${styles.conditionBtn} ${formData.condition === cond.value ? styles.selected : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, condition: cond.value }))}
                    >
                      <strong>{cond.label}</strong>
                      <small>{cond.description}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("media")}>
                Next: Add Photos <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* Media Section */}
        {activeSection === "media" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.section}
          >
            <div className={styles.formGroup}>
              <label>Product Photos *</label>
              <p className={styles.hint}>Add up to 5 high-quality photos (JPEG, PNG, up to 5MB each)</p>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                  <span>Uploading... {uploadProgress}%</span>
                </div>
              )}
              
              <div className={styles.imageGrid}>
                {images.map((image, index) => (
                  <div key={index} className={styles.imagePreview}>
                    <img src={image} alt={`Product ${index + 1}`} />
                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() => removeImage(index)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <label className={styles.imageUploadBtn}>
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
                      </div>
                    ) : (
                      <>
                        <FaCamera />
                        <span>Add Photo</span>
                        <small>{images.length}/5</small>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("basic")}>
                <FaArrowLeft /> Back
              </button>
              <button type="button" className={styles.nextBtn} onClick={() => setActiveSection("details")}>
                Next: Add Details <FaArrowRight />
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
              <label>Price *</label>
              <div className={styles.priceInput}>
                <FaMoneyBillWave />
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="1"
                />
                <span>KSh</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_negotiable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
                />
                <span className={styles.checkmark}></span>
                Price is negotiable
              </label>
            </div>

            <div className={styles.formGroup}>
              <label>Tags (Optional)</label>
              <p className={styles.hint}>Add tags to help buyers find your item (max 8)</p>
              
              <div className={styles.tagsDisplay}>
                {formData.tags.map(tag => (
                  <span key={tag} className={styles.tag}>
                    {tag.replace('_', ' ')}
                    <button type="button" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              
              <div className={styles.suggestedTags}>
                <p className={styles.suggestedLabel}>Suggested tags:</p>
                <div className={styles.tagsGrid}>
                  {suggestedTags.map(tag => (
                    <button
                      key={tag.value}
                      type="button"
                      className={styles.suggestedTag}
                      onClick={() => addTag(tag.value)}
                      disabled={formData.tags.includes(tag.value)}
                    >
                      <span>{tag.icon}</span>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("media")}>
                <FaArrowLeft /> Back
              </button>
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
              <div className={styles.campusDisplay} onClick={updateCampus}>
                <FaUniversity />
                <span>{getUserCampus()}</span>
                <small>Click to change</small>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Meeting Places *</label>
              <p className={styles.hint}>Select where buyers can pick up the item</p>
              
              <div className={styles.meetingPlacesGrid}>
                {meetingPlaces.map(place => (
                  <button
                    key={place}
                    type="button"
                    className={`${styles.placeBtn} ${formData.meeting_places.includes(place) ? styles.selected : ''}`}
                    onClick={() => {
                      if (formData.meeting_places.includes(place)) {
                        setFormData(prev => ({
                          ...prev,
                          meeting_places: prev.meeting_places.filter(p => p !== place)
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          meeting_places: [...prev.meeting_places, place]
                        }));
                      }
                    }}
                  >
                    <FaMapMarkerAlt />
                    {place}
                    {formData.meeting_places.includes(place) && <FaCheck />}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.summaryCard}>
              <h4>Listing Summary</h4>
              <div className={styles.summaryItem}>
                <span>Title:</span>
                <strong>{formData.title || "Not set"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Price:</span>
                <strong>KSh {formData.price || "0"}</strong>
                {formData.is_negotiable && <span className={styles.negotiableBadge}>Negotiable</span>}
              </div>
              <div className={styles.summaryItem}>
                <span>Category:</span>
                <strong>{formData.category || "Not selected"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Condition:</span>
                <strong>{formData.condition?.replace('_', ' ') || "Not selected"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Photos:</span>
                <strong>{images.length}/5 uploaded</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Meeting Places:</span>
                <strong>{formData.meeting_places.length} selected</strong>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.prevBtn} onClick={() => setActiveSection("details")}>
                <FaArrowLeft /> Back
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <FaSpinner className={styles.spinning} />
                    Listing Your Item...
                  </>
                ) : (
                  "List Item for Sale"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </form>

      {/* Validation Errors Toast */}
      {validationErrors.length > 0 && (
        <div className={styles.errorToast}>
          {validationErrors.map((error, i) => (
            <div key={i} className={styles.errorMessage}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellProductPage;
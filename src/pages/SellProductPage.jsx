// src/pages/SellProductPage.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaCamera, FaUpload, FaTag, FaMoneyBillWave,
  FaMapMarkerAlt, FaUniversity, FaCheck, FaInfoCircle,
  FaSpinner
} from "react-icons/fa";
import "./SellProductPage.css";

const SellProductPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Start with loading true
  const [userProfile, setUserProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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

  const categories = [
    "textbooks", "electronics", "clothing", "dorm_essentials", 
    "sports", "furniture", "accessories", "other"
  ];

  const meetingPlaces = [
    "Library", "Main Gate", "Cafeteria", "Hostel A", "Hostel B",
    "Student Center", "Sports Complex", "Other"
  ];

  useEffect(() => {
    // Redirect if no user
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserProfile();
  }, [user, navigate]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('Loading profile for user:', user?.id);
      
      if (!user?.id) {
        console.error('No user ID available');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data) {
        console.log('Profile loaded:', data);
        setUserProfile(data);
      } else {
        console.log('No profile found, creating new one...');
        // Create a basic profile if none exists
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "Student",
          email: user.email,
          profile_completed: false
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
          // Still set the profile locally even if insert fails
          setUserProfile(newProfile);
        } else {
          setUserProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // Set fallback profile
      setUserProfile({
        id: user?.id,
        full_name: "Student",
        email: user?.email,
        city: "University of Nairobi"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get campus from user profile
  const getUserCampus = () => {
    return userProfile?.city || "University of Nairobi";
  };

  const handleImageUpload = async (file) => {
    if (images.length >= 5) {
      alert("Maximum 5 images allowed");
      return;
    }

    if (!user?.id) {
      alert("Please log in to upload images");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${user.id}/${fileName}`;

      // Upload with proper error handling for RLS
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If RLS error, try to create the bucket or handle differently
        if (uploadError.message.includes('row-level security')) {
          console.error('RLS Policy Error - Check storage policies');
          // For now, we'll use a data URL as fallback
          const reader = new FileReader();
          reader.onload = (e) => {
            setImages(prev => [...prev, e.target.result]);
          };
          reader.readAsDataURL(file);
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImages(prev => [...prev, publicUrl]);
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Fallback: Convert to data URL if upload fails
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert("Please log in to sell products");
      navigate('/auth');
      return;
    }

    if (!userProfile) {
      alert("Please complete your profile first");
      navigate('/student/profile');
      return;
    }

    setSubmitting(true);
    try {
      const campusName = getUserCampus();
      
      const productData = {
        seller_user_id: user.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: images,
        campus_name: campusName,
        meeting_places: formData.meeting_places,
        is_negotiable: formData.is_negotiable,
        tags: formData.tags,
        status: 'available',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('campus_products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        // Handle specific errors
        if (error.code === '42501') {
          alert("Permission denied. Please check if you're logged in properly.");
          return;
        }
        throw error;
      }

      alert('Product listed successfully!');
      navigate('/student/marketplace');
    } catch (error) {
      console.error('Error listing product:', error);
      
      // More specific error messages
      if (error.message.includes('row-level security')) {
        alert("Permission error. Please make sure you're verified to sell products.");
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        alert("Network error. Please check your connection and try again.");
      } else {
        alert('Error listing product: ' + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = (tag) => {
    if (formData.tags.length < 5 && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Quick campus setup if not set
  const setupCampus = () => {
    const campus = prompt("Enter your campus name:", getUserCampus());
    if (campus) {
      setUserProfile(prev => ({ ...prev, city: campus }));
      // Optionally save to profile
      if (user?.id) {
        supabase
          .from('profiles')
          .update({ city: campus })
          .eq('id', user.id)
          .then(({ error }) => {
            if (!error) {
              console.log("Campus updated successfully");
            }
          });
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="sell-product-page">
        <header className="page-header">
          <motion.button
            className="back-btn"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
          </motion.button>
          <h1>Sell Your Item</h1>
          <div className="header-actions">
            <motion.button
              className="help-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaInfoCircle />
            </motion.button>
          </div>
        </header>
        
        <div className="loading-container">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="loading-spinner-large"
          />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show auth required state
  if (!user) {
    return (
      <div className="sell-product-page">
        <header className="page-header">
          <motion.button
            className="back-btn"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
          </motion.button>
          <h1>Sell Your Item</h1>
        </header>
        
        <div className="auth-required-container">
          <div className="auth-required-content">
            <h2>Authentication Required</h2>
            <p>Please log in to sell products on the marketplace.</p>
            <motion.button
              className="auth-btn"
              onClick={() => navigate('/auth')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Go to Login
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sell-product-page">
      {/* Header */}
      <header className="page-header">
        <motion.button
          className="back-btn"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft />
        </motion.button>
        <h1>Sell Your Item</h1>
        <div className="header-actions">
          <motion.button
            className="help-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaInfoCircle />
          </motion.button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="product-form">
        {/* Image Upload Section */}
        <section className="form-section">
          <h3>Product Images</h3>
          <p className="section-subtitle">Add up to 5 photos of your item</p>
          
          <div className="image-upload-grid">
            {images.map((image, index) => (
              <div key={index} className="image-preview">
                <img src={image} alt={`Product ${index + 1}`} />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            ))}
            
            {images.length < 5 && (
              <motion.label
                className="image-upload-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
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
                  <div className="uploading-spinner" />
                ) : (
                  <>
                    <FaCamera />
                    <span>Add Photo</span>
                  </>
                )}
              </motion.label>
            )}
          </div>
        </section>

        {/* Basic Information */}
        <section className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label>Product Title *</label>
            <input
              type="text"
              placeholder="e.g., MacBook Air M1 2020, Calculus Textbook, etc."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              maxLength={100}
            />
            <span className="char-count">{formData.title.length}/100</span>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Describe your item in detail. Include condition, features, why you're selling..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={4}
              maxLength={500}
            />
            <span className="char-count">{formData.description.length}/500</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                required
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Condition *</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                required
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="form-section">
          <h3>Pricing</h3>
          
          <div className="form-group">
            <label>Price (KSh) *</label>
            <div className="price-input-container">
              <FaMoneyBillWave className="price-icon" />
              <input
                type="number"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_negotiable}
                onChange={(e) => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
              />
              <span className="checkmark"></span>
              Price is negotiable
            </label>
          </div>
        </section>

        {/* Location & Meeting */}
        <section className="form-section">
          <h3>Location & Meeting</h3>
          
          <div className="form-group">
            <label>Campus</label>
            <div className="campus-display" onClick={setupCampus} style={{ cursor: 'pointer' }}>
              <FaUniversity />
              <span>{getUserCampus()}</span>
              <small style={{ marginLeft: '8px', color: '#666' }}>
                {!userProfile?.city && "(Click to set your campus)"}
              </small>
            </div>
          </div>

          <div className="form-group">
            <label>Meeting Places *</label>
            <p className="section-subtitle">Where can buyers pick up the item?</p>
            
            <div className="meeting-places-grid">
              {meetingPlaces.map(place => (
                <motion.button
                  key={place}
                  type="button"
                  className={`meeting-place-btn ${formData.meeting_places.includes(place) ? 'selected' : ''}`}
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaMapMarkerAlt />
                  {place}
                  {formData.meeting_places.includes(place) && <FaCheck className="check-icon" />}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="form-section">
          <h3>Tags</h3>
          <p className="section-subtitle">Add tags to help buyers find your item</p>
          
          <div className="tags-input-container">
            <div className="tags-display">
              {formData.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
            
            <div className="suggested-tags">
              {["urgent_sale", "price_negotiable", "like_new", "barely_used", "must_sell"].map(tag => (
                <motion.button
                  key={tag}
                  type="button"
                  className="suggested-tag"
                  onClick={() => addTag(tag)}
                  disabled={formData.tags.includes(tag)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaTag />
                  {tag.replace('_', ' ')}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="submit-btn"
          disabled={submitting || !formData.title || !formData.description || !formData.price || !formData.category || formData.meeting_places.length === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {submitting ? (
            <>
              <FaSpinner className="spinner" />
              Listing Your Item...
            </>
          ) : (
            "List Item for Sale"
          )}
        </motion.button>
      </form>
    </div>
  );
};

export default SellProductPage;
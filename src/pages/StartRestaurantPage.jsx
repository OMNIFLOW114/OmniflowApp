// src/pages/StartRestaurantPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaCamera, FaUtensils, FaClock,
  FaPhone, FaMapMarkerAlt, FaUniversity, FaMoneyBillWave,
  FaCheck, FaInfoCircle, FaUpload
} from "react-icons/fa";
import "./StartRestaurantPage.css";

const StartRestaurantPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userCampus, setUserCampus] = useState(null);
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
  const [uploading, setUploading] = useState(false);

  const cuisineTypes = [
    "Kenyan Traditional", "Pizza & Italian", "Burgers & Fast Food",
    "Chinese", "Indian", "Breakfast & Brunch", "Coffee & Snacks",
    "Bakery", "Healthy & Salads", "Other"
  ];

  useEffect(() => {
    loadUserCampus();
  }, [user]);

  const loadUserCampus = async () => {
    try {
      const { data } = await supabase
        .from('student_campus_profiles')
        .select('campus_name, campus_location')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserCampus(data);
      }
    } catch (error) {
      console.error('Error loading campus:', error);
    }
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `restaurants/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      setCoverImage(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userCampus) {
      alert("Please set your campus first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campus_restaurants')
        .insert([{
          owner_user_id: user.id,
          name: formData.name,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          campus_name: userCampus.campus_name,
          location_description: formData.location_description,
          contact_phone: formData.contact_phone,
          delivery_time_range: formData.delivery_time_range,
          min_order_amount: parseFloat(formData.min_order_amount),
          delivery_fee: parseFloat(formData.delivery_fee),
          cover_image_url: coverImage,
          operating_hours: formData.operating_hours,
          special_offers: formData.special_offers,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Restaurant created successfully!');
      navigate('/student/marketplace');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      alert('Error creating restaurant');
    } finally {
      setLoading(false);
    }
  };

  const addSpecialOffer = () => {
    const offer = prompt("Enter special offer (e.g., 'Free delivery on orders above 500'):");
    if (offer && offer.trim()) {
      setFormData(prev => ({
        ...prev,
        special_offers: [...prev.special_offers, offer.trim()]
      }));
    }
  };

  const removeSpecialOffer = (index) => {
    setFormData(prev => ({
      ...prev,
      special_offers: prev.special_offers.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="start-restaurant-page">
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
        <h1>Start Food Business</h1>
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

      <form onSubmit={handleSubmit} className="restaurant-form">
        {/* Cover Image */}
        <section className="form-section">
          <h3>Restaurant Cover Image</h3>
          <p className="section-subtitle">Add a cover photo for your restaurant</p>
          
          <div className="cover-image-upload">
            {coverImage ? (
              <div className="cover-image-preview">
                <img src={coverImage} alt="Restaurant cover" />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => setCoverImage(null)}
                >
                  ×
                </button>
              </div>
            ) : (
              <motion.label
                className="cover-upload-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? (
                  <div className="uploading-spinner" />
                ) : (
                  <>
                    <FaCamera />
                    <span>Add Cover Photo</span>
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
            <label>Restaurant Name *</label>
            <input
              type="text"
              placeholder="e.g., Mama Njeri Cafe, Campus Pizza Hub..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              maxLength={50}
            />
            <span className="char-count">{formData.name.length}/50</span>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Describe your restaurant, specialty dishes, etc."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={4}
              maxLength={300}
            />
            <span className="char-count">{formData.description.length}/300</span>
          </div>

          <div className="form-group">
            <label>Cuisine Type *</label>
            <select
              value={formData.cuisine_type}
              onChange={(e) => setFormData(prev => ({ ...prev, cuisine_type: e.target.value }))}
              required
            >
              <option value="">Select Cuisine Type</option>
              {cuisineTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Location & Contact */}
        <section className="form-section">
          <h3>Location & Contact</h3>
          
          <div className="form-group">
            <label>Campus</label>
            <div className="campus-display">
              <FaUniversity />
              <span>{userCampus?.campus_name || "Loading..."}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Location Description *</label>
            <input
              type="text"
              placeholder="e.g., Near Hostel A, Main Campus Gate, Juja Town..."
              value={formData.location_description}
              onChange={(e) => setFormData(prev => ({ ...prev, location_description: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Phone *</label>
            <div className="phone-input-container">
              <FaPhone className="phone-icon" />
              <input
                type="tel"
                placeholder="+254712345678"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                required
              />
            </div>
          </div>
        </section>

        {/* Delivery Information */}
        <section className="form-section">
          <h3>Delivery Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Delivery Time *</label>
              <select
                value={formData.delivery_time_range}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_time_range: e.target.value }))}
                required
              >
                <option value="10-20 min">10-20 minutes</option>
                <option value="15-25 min">15-25 minutes</option>
                <option value="20-30 min">20-30 minutes</option>
                <option value="25-35 min">25-35 minutes</option>
                <option value="30-45 min">30-45 minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label>Minimum Order (KSh) *</label>
              <div className="price-input-container">
                <FaMoneyBillWave className="price-icon" />
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                  required
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Delivery Fee (KSh)</label>
            <div className="price-input-container">
              <FaMoneyBillWave className="price-icon" />
              <input
                type="number"
                value={formData.delivery_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: e.target.value }))}
                min="0"
              />
            </div>
          </div>
        </section>

        {/* Special Offers */}
        <section className="form-section">
          <h3>Special Offers</h3>
          <p className="section-subtitle">Add promotions to attract customers</p>
          
          <div className="special-offers-list">
            {formData.special_offers.map((offer, index) => (
              <div key={index} className="special-offer-item">
                <span>{offer}</span>
                <button
                  type="button"
                  className="remove-offer"
                  onClick={() => removeSpecialOffer(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <motion.button
            type="button"
            className="add-offer-btn"
            onClick={addSpecialOffer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            + Add Special Offer
          </motion.button>
        </section>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className="submit-btn"
          disabled={loading || !formData.name || !formData.description || !formData.cuisine_type}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? "Creating Restaurant..." : "Start Food Business"}
        </motion.button>
      </form>
    </div>
  );
};

export default StartRestaurantPage;
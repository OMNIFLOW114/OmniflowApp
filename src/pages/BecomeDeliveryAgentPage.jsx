// src/pages/BecomeDeliveryAgentPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaMotorcycle, FaBicycle, FaWalking,
  FaIdCard, FaCheck, FaMoneyBillWave, FaClock,
  FaMapMarkerAlt, FaUniversity, FaShieldVirus
} from "react-icons/fa";
import "./BecomeDeliveryAgentPage.css";

const BecomeDeliveryAgentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userCampus, setUserCampus] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_type: "",
    license_plate: "",
    has_license: false,
    agree_to_terms: false
  });

  const vehicleTypes = [
    { value: "bicycle", label: "Bicycle", icon: <FaBicycle />, earnings: "KSh 3K-8K/mo" },
    { value: "motorcycle", label: "Motorcycle", icon: <FaMotorcycle />, earnings: "KSh 8K-25K/mo" },
    { value: "walk", label: "Walking", icon: <FaWalking />, earnings: "KSh 2K-5K/mo" }
  ];

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load campus
      const { data: campusData } = await supabase
        .from('student_campus_profiles')
        .select('campus_name, campus_location')
        .eq('user_id', user.id)
        .single();
      
      if (campusData) {
        setUserCampus(campusData);
      }

      // Check existing application
      const { data: existingAgent } = await supabase
        .from('campus_delivery_agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setExistingApplication(existingAgent);

    } catch (error) {
      console.error('Error loading user data:', error);
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
        .from('campus_delivery_agents')
        .insert([{
          user_id: user.id,
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate,
          campus_name: userCampus.campus_name,
          is_approved: false, // Needs admin approval
          is_online: false
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Application submitted successfully! We will review your application within 24 hours.');
      navigate('/student/marketplace');
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  // If already applied
  if (existingApplication) {
    return (
      <div className="delivery-agent-page">
        <header className="page-header">
          <motion.button
            className="back-btn"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
          </motion.button>
          <h1>Delivery Agent</h1>
        </header>

        <div className="application-status">
          <div className="status-card">
            <div className="status-icon">
              <FaMotorcycle />
            </div>
            
            <h2>
              {existingApplication.is_approved 
                ? "You're a Delivery Agent!" 
                : "Application Under Review"}
            </h2>
            
            <div className="status-details">
              <div className="detail-item">
                <strong>Status:</strong>
                <span className={`status ${existingApplication.is_approved ? 'approved' : 'pending'}`}>
                  {existingApplication.is_approved ? 'Approved' : 'Pending Review'}
                </span>
              </div>
              
              <div className="detail-item">
                <strong>Vehicle:</strong>
                <span>{existingApplication.vehicle_type}</span>
              </div>
              
              <div className="detail-item">
                <strong>Campus:</strong>
                <span>{existingApplication.campus_name}</span>
              </div>

              {existingApplication.is_approved && (
                <>
                  <div className="detail-item">
                    <strong>Total Deliveries:</strong>
                    <span>{existingApplication.total_deliveries || 0}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Total Earnings:</strong>
                    <span>KSh {existingApplication.total_earnings || 0}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Rating:</strong>
                    <span>⭐ {existingApplication.rating || 'New'}</span>
                  </div>
                </>
              )}
            </div>

            {existingApplication.is_approved ? (
              <motion.button
                className="go-online-btn"
                onClick={() => navigate('/student/delivery-dashboard')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Go Online
              </motion.button>
            ) : (
              <p className="pending-message">
                We're reviewing your application. You'll receive a notification once approved.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-agent-page">
      <header className="page-header">
        <motion.button
          className="back-btn"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft />
        </motion.button>
        <h1>Become Delivery Agent</h1>
      </header>

      <div className="delivery-content">
        {/* Benefits Section */}
        <section className="benefits-section">
          <h2>Earn Money Delivering on Campus</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <FaMoneyBillWave />
              <h4>Flexible Earnings</h4>
              <p>Earn KSh 2K-25K per month working around your schedule</p>
            </div>
            <div className="benefit-card">
              <FaClock />
              <h4>Flexible Hours</h4>
              <p>Work between classes, evenings, or weekends</p>
            </div>
            <div className="benefit-card">
              <FaMapMarkerAlt />
              <h4>On Campus</h4>
              <p>Deliver within your campus - no long distances</p>
            </div>
            <div className="benefit-card">
              <FaShieldVirus />
              <h4>Safe & Secure</h4>
              <p>All transactions are secure and verified</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="application-form">
          {/* Vehicle Type */}
          <section className="form-section">
            <h3>Vehicle Information</h3>
            <p className="section-subtitle">Select your primary delivery vehicle</p>
            
            <div className="vehicle-options">
              {vehicleTypes.map(vehicle => (
                <motion.label
                  key={vehicle.value}
                  className={`vehicle-option ${formData.vehicle_type === vehicle.value ? 'selected' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <input
                    type="radio"
                    name="vehicle_type"
                    value={vehicle.value}
                    checked={formData.vehicle_type === vehicle.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_type: e.target.value }))}
                    required
                  />
                  <div className="vehicle-icon">{vehicle.icon}</div>
                  <div className="vehicle-info">
                    <h4>{vehicle.label}</h4>
                    <p>{vehicle.earnings}</p>
                  </div>
                  <FaCheck className="check-icon" />
                </motion.label>
              ))}
            </div>
          </section>

          {/* License Information */}
          {formData.vehicle_type === 'motorcycle' && (
            <section className="form-section">
              <h3>License Information</h3>
              
              <div className="form-group">
                <label>License Plate Number</label>
                <input
                  type="text"
                  placeholder="e.g., KAA 123A"
                  value={formData.license_plate}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.has_license}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_license: e.target.checked }))}
                    required
                  />
                  <span className="checkmark"></span>
                  I have a valid motorcycle license
                </label>
              </div>
            </section>
          )}

          {/* Campus Information */}
          <section className="form-section">
            <h3>Campus Information</h3>
            
            <div className="form-group">
              <label>Delivery Campus</label>
              <div className="campus-display">
                <FaUniversity />
                <span>{userCampus?.campus_name || "Loading..."}</span>
              </div>
              <p className="helper-text">
                You'll only receive delivery requests within this campus
              </p>
            </div>
          </section>

          {/* Requirements */}
          <section className="requirements-section">
            <h3>Requirements</h3>
            <ul className="requirements-list">
              <li>
                <FaCheck />
                Must be a current student at {userCampus?.campus_name}
              </li>
              <li>
                <FaCheck />
                Valid student ID required
              </li>
              <li>
                <FaCheck />
                For motorcycles: Valid license and insurance
              </li>
              <li>
                <FaCheck />
                Smartphone with internet access
              </li>
              <li>
                <FaCheck />
                Good knowledge of campus locations
              </li>
            </ul>
          </section>

          {/* Terms */}
          <section className="form-section">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.agree_to_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, agree_to_terms: e.target.checked }))}
                  required
                />
                <span className="checkmark"></span>
                I agree to the Terms of Service and understand that I'm an independent contractor
              </label>
            </div>
          </section>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="submit-btn"
            disabled={loading || !formData.vehicle_type || !formData.agree_to_terms}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Submitting Application..." : "Apply to Become Delivery Agent"}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default BecomeDeliveryAgentPage;
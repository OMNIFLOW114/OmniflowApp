// src/pages/ServiceDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaStar, FaClock, FaGraduationCap,
  FaCheck, FaWhatsapp, FaMoneyBillWave,
  FaUsers, FaCalendar, FaMapMarkerAlt
} from "react-icons/fa";
import "./ServiceDetailPage.css";

const ServiceDetailPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState({
    requirements_description: "",
    deadline: "",
    delivery_method: "online",
    meeting_location: "",
    customer_notes: ""
  });

  useEffect(() => {
    loadServiceData();
  }, [id]);

  const loadServiceData = async () => {
    try {
      const { data: serviceData, error } = await supabase
        .from('student_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setService(serviceData);

      // Load provider info
      const { data: providerData } = await supabase
        .from('users')
        .select('full_name, avatar_url, rating')
        .eq('id', serviceData.provider_user_id)
        .single();

      setProvider(providerData);

    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to order this service");
      return;
    }

    setOrdering(true);
    try {
      // Generate order number
      const orderNumber = `SERV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const { data, error } = await supabase
        .from('service_orders')
        .insert([{
          customer_user_id: user.id,
          service_id: id,
          order_number: orderNumber,
          total_amount: service.price_amount,
          requirements_description: orderData.requirements_description,
          deadline: orderData.deadline,
          delivery_method: orderData.delivery_method,
          meeting_location: orderData.meeting_location,
          customer_notes: orderData.customer_notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Service ordered successfully!');
      setShowOrderForm(false);
      navigate('/student/orders');
    } catch (error) {
      console.error('Error ordering service:', error);
      alert('Error ordering service');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading service details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="error-screen">
        <h2>Service not found</h2>
        <button onClick={() => navigate('/student/marketplace')}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
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
        <h1>Service Details</h1>
        <div className="header-actions">
          <motion.button
            className="share-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Share
          </motion.button>
        </div>
      </header>

      <div className="service-content">
        {/* Service Header */}
        <section className="service-header">
          <div className="service-icon">
            {service.category === 'academic' ? '📚' : 
             service.category === 'technical' ? '💻' : 
             service.category === 'creative' ? '🎨' : '🔧'}
          </div>
          <div className="service-title-section">
            <h2>{service.title}</h2>
            <div className="service-meta">
              <span className="category-badge">{service.category}</span>
              <span className="rating">
                <FaStar /> {service.rating || 'New'}
              </span>
              <span className="orders">{service.total_orders} orders</span>
            </div>
          </div>
        </section>

        {/* Provider Info */}
        <section className="provider-section">
          <h3>Service Provider</h3>
          <div className="provider-card">
            <div className="provider-avatar">
              {provider?.avatar_url ? (
                <img src={provider.avatar_url} alt={provider.full_name} />
              ) : (
                <div className="avatar-placeholder">
                  {provider?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="provider-info">
              <h4>{provider?.full_name || 'Unknown User'}</h4>
              <p>Verified Student</p>
              <div className="provider-stats">
                <span><FaStar /> {provider?.rating || '5.0'}</span>
                <span><FaCheck /> 97% Completion</span>
              </div>
            </div>
            <motion.button
              className="contact-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaWhatsapp /> Contact
            </motion.button>
          </div>
        </section>

        {/* Service Details */}
        <section className="details-section">
          <h3>Service Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <FaMoneyBillWave />
              <div>
                <strong>Price</strong>
                <span>{service.price_range || `KSh ${service.price_amount}`}</span>
              </div>
            </div>
            <div className="detail-item">
              <FaClock />
              <div>
                <strong>Delivery Time</strong>
                <span>{service.delivery_time}</span>
              </div>
            </div>
            <div className="detail-item">
              <FaGraduationCap />
              <div>
                <strong>Category</strong>
                <span>{service.category}</span>
              </div>
            </div>
            <div className="detail-item">
              <FaMapMarkerAlt />
              <div>
                <strong>Campus</strong>
                <span>{service.campus_name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="description-section">
          <h3>Description</h3>
          <p>{service.description}</p>
        </section>

        {/* Requirements */}
        {service.requirements && service.requirements.length > 0 && (
          <section className="requirements-section">
            <h3>Requirements</h3>
            <ul className="requirements-list">
              {service.requirements.map((req, index) => (
                <li key={index}>
                  <FaCheck />
                  {req}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <section className="tags-section">
            <h3>Tags</h3>
            <div className="tags-list">
              {service.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Order Section */}
        <section className="order-section">
          <div className="price-card">
            <div className="price-info">
              <span className="price">KSh {service.price_amount}</span>
              <span className="price-type">{service.price_type}</span>
            </div>
            <motion.button
              className="order-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowOrderForm(true)}
            >
              Order Now
            </motion.button>
          </div>
        </section>
      </div>

      {/* Order Modal */}
      {showOrderForm && (
        <div className="modal-overlay">
          <motion.div
            className="order-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h3>Order Service</h3>
              <button onClick={() => setShowOrderForm(false)}>×</button>
            </div>
            
            <form onSubmit={handleOrder} className="order-form">
              <div className="form-group">
                <label>Requirements Description *</label>
                <textarea
                  placeholder="Describe exactly what you need help with..."
                  value={orderData.requirements_description}
                  onChange={(e) => setOrderData(prev => ({ ...prev, requirements_description: e.target.value }))}
                  required
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  value={orderData.deadline}
                  onChange={(e) => setOrderData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Delivery Method</label>
                <select
                  value={orderData.delivery_method}
                  onChange={(e) => setOrderData(prev => ({ ...prev, delivery_method: e.target.value }))}
                >
                  <option value="online">Online</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>

              {orderData.delivery_method === 'in_person' && (
                <div className="form-group">
                  <label>Meeting Location</label>
                  <input
                    type="text"
                    placeholder="e.g., Library, Hostel A..."
                    value={orderData.meeting_location}
                    onChange={(e) => setOrderData(prev => ({ ...prev, meeting_location: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  placeholder="Any special requirements or notes..."
                  value={orderData.customer_notes}
                  onChange={(e) => setOrderData(prev => ({ ...prev, customer_notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowOrderForm(false)}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  className="confirm-btn"
                  disabled={ordering}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {ordering ? "Placing Order..." : "Confirm Order"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailPage;
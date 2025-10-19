// src/pages/OrderTrackingPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaArrowLeft, FaShoppingBag, FaUtensils, FaGraduationCap,
  FaCheck, FaClock, FaMotorcycle, FaMapMarkerAlt,
  FaPhone, FaStar, FaWhatsapp, FaShippingFast
} from "react-icons/fa";
import "./OrderTrackingPage.css";

const OrderTrackingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState({
    active: [],
    completed: [],
    cancelled: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      // Load food orders
      const { data: foodOrders } = await supabase
        .from('food_orders')
        .select(`
          *,
          campus_restaurants (
            name,
            cover_image_url,
            contact_phone
          )
        `)
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false });

      // Load service orders
      const { data: serviceOrders } = await supabase
        .from('service_orders')
        .select(`
          *,
          student_services (
            title,
            provider_user_id
          )
        `)
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false });

      // Combine and categorize orders
      const allOrders = [
        ...(foodOrders || []).map(order => ({ ...order, type: 'food' })),
        ...(serviceOrders || []).map(order => ({ ...order, type: 'service' }))
      ];

      const categorized = {
        active: allOrders.filter(order => 
          ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'accepted', 'in_progress'].includes(order.status)
        ),
        completed: allOrders.filter(order => 
          ['delivered', 'completed'].includes(order.status)
        ),
        cancelled: allOrders.filter(order => 
          ['cancelled'].includes(order.status)
        )
      };

      setOrders(categorized);

    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = (order) => {
    if (order.type === 'food') {
      const steps = [
        { status: 'pending', label: 'Order Placed', icon: FaCheck },
        { status: 'confirmed', label: 'Confirmed', icon: FaCheck },
        { status: 'preparing', label: 'Preparing', icon: FaUtensils },
        { status: 'out_for_delivery', label: 'Out for Delivery', icon: FaMotorcycle },
        { status: 'delivered', label: 'Delivered', icon: FaCheck }
      ];
      return steps;
    } else {
      const steps = [
        { status: 'pending', label: 'Order Placed', icon: FaCheck },
        { status: 'accepted', label: 'Accepted', icon: FaCheck },
        { status: 'in_progress', label: 'In Progress', icon: FaGraduationCap },
        { status: 'completed', label: 'Completed', icon: FaCheck }
      ];
      return steps;
    }
  };

  const getCurrentStepIndex = (order, steps) => {
    return steps.findIndex(step => step.status === order.status);
  };

  const formatOrderNumber = (orderNumber) => {
    return orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  };

  const getOrderTitle = (order) => {
    if (order.type === 'food') {
      return order.campus_restaurants?.name || 'Restaurant Order';
    } else {
      return order.student_services?.title || 'Service Order';
    }
  };

  const contactSeller = (order) => {
    let phone = '';
    if (order.type === 'food') {
      phone = order.campus_restaurants?.contact_phone;
    }
    // For services, we'd need to get the provider's phone
    if (phone) {
      const message = `Hi! I have a question about my order: ${formatOrderNumber(order.order_number)}`;
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="order-tracking-page">
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
        <h1>My Orders</h1>
      </header>

      {/* Order Tabs */}
      <nav className="order-tabs">
        {[
          { id: "active", label: "Active", count: orders.active.length },
          { id: "completed", label: "Completed", count: orders.completed.length },
          { id: "cancelled", label: "Cancelled", count: orders.cancelled.length }
        ].map(tab => (
          <button
            key={tab.id}
            className={`order-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {/* Orders List */}
      <div className="orders-container">
        {orders[activeTab].length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">
              {activeTab === 'active' ? '📦' : 
               activeTab === 'completed' ? '✅' : '❌'}
            </div>
            <h3>
              {activeTab === 'active' ? 'No Active Orders' :
               activeTab === 'completed' ? 'No Completed Orders' :
               'No Cancelled Orders'}
            </h3>
            <p>
              {activeTab === 'active' ? 
               'Your active orders will appear here' :
               activeTab === 'completed' ?
               'Your completed orders will appear here' :
               'Your cancelled orders will appear here'}
            </p>
            {activeTab === 'active' && (
              <motion.button
                className="browse-btn"
                onClick={() => navigate('/student/marketplace')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Marketplace
              </motion.button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {orders[activeTab].map(order => {
              const steps = getStatusSteps(order);
              const currentStepIndex = getCurrentStepIndex(order, steps);
              
              return (
                <motion.div
                  key={order.id}
                  className="order-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Order Header */}
                  <div className="order-header">
                    <div className="order-info">
                      <h3>{getOrderTitle(order)}</h3>
                      <p className="order-number">
                        {formatOrderNumber(order.order_number)}
                      </p>
                      <p className="order-date">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="order-amount">
                      KSh {order.total_amount}
                    </div>
                  </div>

                  {/* Order Type Badge */}
                  <div className="order-type">
                    <span className={`type-badge ${order.type}`}>
                      {order.type === 'food' ? <FaUtensils /> : <FaGraduationCap />}
                      {order.type === 'food' ? 'Food Delivery' : 'Service'}
                    </span>
                  </div>

                  {/* Progress Tracking */}
                  {activeTab === 'active' && (
                    <div className="progress-tracking">
                      <div className="progress-steps">
                        {steps.map((step, index) => {
                          const StepIcon = step.icon;
                          const isCompleted = index <= currentStepIndex;
                          const isCurrent = index === currentStepIndex;
                          
                          return (
                            <div
                              key={step.status}
                              className={`progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                              <div className="step-icon">
                                <StepIcon />
                              </div>
                              <span className="step-label">{step.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="progress-bar">
                        {steps.map((_, index) => (
                          <div
                            key={index}
                            className={`progress-segment ${index <= currentStepIndex ? 'completed' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="order-details">
                    {order.type === 'food' && (
                      <>
                        <div className="detail-item">
                          <FaMapMarkerAlt />
                          <span>Delivery to: {order.delivery_location}</span>
                        </div>
                        {order.assigned_delivery_user_id && (
                          <div className="detail-item">
                            <FaMotorcycle />
                            <span>Delivery agent assigned</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {order.type === 'service' && (
                      <>
                        <div className="detail-item">
                          <FaClock />
                          <span>Deadline: {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'Flexible'}</span>
                        </div>
                        <div className="detail-item">
                          <FaMapMarkerAlt />
                          <span>Delivery: {order.delivery_method === 'online' ? 'Online' : 'In Person'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Order Actions */}
                  <div className="order-actions">
                    <motion.button
                      className="contact-btn"
                      onClick={() => contactSeller(order)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaWhatsapp /> Contact
                    </motion.button>
                    
                    <motion.button
                      className="details-btn"
                      onClick={() => navigate(`/student/order/${order.id}`)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View Details
                    </motion.button>
                  </div>

                  {/* Status Badge */}
                  <div className={`status-badge ${order.status}`}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
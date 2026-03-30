// src/pages/ServiceDetailPage.jsx - PRODUCTION READY
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaClock, FaGraduationCap,
  FaCheck, FaWhatsapp, FaMoneyBillWave,
  FaUsers, FaCalendar, FaMapMarkerAlt, FaShare,
  FaHeart, FaFlag, FaSpinner, FaTrophy, FaShieldAlt,
  FaInfoCircle, FaTimes, FaUser, FaThumbsUp
} from "react-icons/fa";
import styles from "./ServiceDetailPage.module.css";

// Helper function for Kenyan price formatting
const formatKenyanPrice = (price) => {
  if (!price && price !== 0) return 'KSh 0';
  return `KSh ${price.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const ServiceDetailPage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [orderData, setOrderData] = useState({
    requirements_description: "",
    deadline: "",
    delivery_method: "online",
    meeting_location: "",
    customer_notes: ""
  });

  useEffect(() => {
    loadServiceData();
    checkIfFavorite();
  }, [id, user]);

  const loadServiceData = async () => {
    try {
      const { data: serviceData, error } = await supabase
        .from('student_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(serviceData);

      // Load provider info from profiles
      const { data: providerData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at')
        .eq('id', serviceData.provider_user_id)
        .single();

      if (providerData) {
        setProvider(providerData);
      } else {
        // Fallback
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', serviceData.provider_user_id)
          .single();
        setProvider(userData || { full_name: 'Student Provider' });
      }

      // Increment view count
      await supabase
        .from('student_services')
        .update({ total_orders: (serviceData.total_orders || 0) + 1 })
        .eq('id', id);

    } catch (error) {
      console.error('Error loading service:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('student_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('entity_type', 'service')
        .eq('entity_id', id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to add favorites');
      navigate('/auth');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('student_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('entity_type', 'service')
          .eq('entity_id', id);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('student_favorites')
          .insert([{
            user_id: user.id,
            entity_type: 'service',
            entity_id: id
          }]);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: service.title,
      text: `Check out this service: ${service.title} on ComradeMarket!`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
        setShowShareOptions(true);
      }
    } else {
      setShowShareOptions(true);
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShowShareOptions(false), 2000);
    }
  };

  const reportService = async () => {
    if (!user) {
      toast.error('Please login to report');
      navigate('/auth');
      return;
    }
    
    setReporting(true);
    try {
      const { error } = await supabase
        .from('service_reports')
        .insert([{
          service_id: id,
          user_id: user.id,
          reason: 'Reported by user',
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      toast.success('Service reported. We will review it.');
    } catch (error) {
      console.error('Error reporting service:', error);
      toast.error('Failed to report service');
    } finally {
      setReporting(false);
    }
  };

  const contactProvider = () => {
    if (!user) {
      toast.error('Please login to contact provider');
      navigate('/auth');
      return;
    }
    
    const message = `Hi! I'm interested in your service: ${service.title} (${formatKenyanPrice(service.price_amount)})`;
    const phoneNumber = provider?.phone || '254700000000';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to order this service');
      navigate('/auth');
      return;
    }

    if (!orderData.requirements_description.trim()) {
      toast.error('Please describe your requirements');
      return;
    }

    setOrdering(true);
    try {
      const orderNumber = `SERV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from('service_orders')
        .insert([{
          customer_user_id: user.id,
          service_id: id,
          order_number: orderNumber,
          total_amount: service.price_amount,
          requirements_description: orderData.requirements_description,
          deadline: orderData.deadline || null,
          delivery_method: orderData.delivery_method,
          meeting_location: orderData.meeting_location,
          customer_notes: orderData.customer_notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Service ordered successfully! 🎉');
      setShowOrderForm(false);
      navigate('/student/orders');
    } catch (error) {
      console.error('Error ordering service:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  // Loading Skeleton
  const SkeletonLoader = () => (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonActions}></div>
      </div>
      <div className={styles.skeletonIcon}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitleLarge}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonProvider}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonPrice}></div>
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  if (!service) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h2>Service not found</h2>
          <p>The service you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/student/marketplace')} className={styles.errorBtn}>
            Back to Marketplace
          </button>
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
        <h1>Service Details</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={toggleFavorite}>
            <FaHeart className={isFavorite ? styles.favorited : ''} />
          </button>
          <button className={styles.iconBtn} onClick={handleShare}>
            <FaShare />
          </button>
          <button className={styles.iconBtn} onClick={reportService} disabled={reporting}>
            <FaFlag />
          </button>
        </div>
      </header>

      {/* Share Options Modal */}
      <AnimatePresence>
        {showShareOptions && (
          <motion.div
            className={styles.shareModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareOptions(false)}
          >
            <motion.div
              className={styles.shareContent}
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Share via</h3>
              <div className={styles.shareOptions}>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`)}>
                  WhatsApp
                </button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`)}>
                  Twitter
                </button>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}>
                  Facebook
                </button>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  Copy Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.content}>
        {/* Service Header */}
        <section className={styles.serviceHeader}>
          <div className={styles.serviceIcon}>
            {service.category === 'academic' ? '📚' : 
             service.category === 'technical' ? '💻' : 
             service.category === 'creative' ? '🎨' : '🔧'}
          </div>
          <div className={styles.serviceTitleSection}>
            <h2>{service.title}</h2>
            <div className={styles.serviceMeta}>
              <span className={styles.categoryBadge}>{service.category}</span>
              <span className={styles.rating}>
                <FaStar /> {service.rating || 'New'}
              </span>
              <span className={styles.orders}>
                <FaUsers /> {service.total_orders || 0} orders
              </span>
            </div>
          </div>
        </section>

        {/* Provider Info */}
        <section className={styles.providerSection}>
          <h3>Service Provider</h3>
          <div className={styles.providerCard}>
            <div className={styles.providerAvatar}>
              {provider?.avatar_url ? (
                <img src={provider.avatar_url} alt={provider.full_name} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {provider?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className={styles.providerInfo}>
              <h4>{provider?.full_name || 'Student Provider'}</h4>
              <p>Verified Student</p>
              <div className={styles.providerStats}>
                <span><FaStar /> {service.provider_rating || '5.0'}</span>
                <span><FaCheck /> {service.total_orders || 0}+ completed</span>
              </div>
            </div>
            <button className={styles.contactBtn} onClick={contactProvider}>
              <FaWhatsapp /> Contact
            </button>
          </div>
        </section>

        {/* Service Details */}
        <section className={styles.detailsSection}>
          <h3>Service Details</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <FaMoneyBillWave />
              <div>
                <strong>Price</strong>
                <span>{service.price_range || formatKenyanPrice(service.price_amount)}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <FaClock />
              <div>
                <strong>Delivery Time</strong>
                <span>{service.delivery_time || 'Flexible'}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <FaGraduationCap />
              <div>
                <strong>Category</strong>
                <span>{service.category?.charAt(0).toUpperCase() + service.category?.slice(1)}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <FaMapMarkerAlt />
              <div>
                <strong>Campus</strong>
                <span>{service.campus_name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className={styles.descriptionSection}>
          <h3>Description</h3>
          <p>{service.description}</p>
        </section>

        {/* Requirements */}
        {service.requirements && service.requirements.length > 0 && (
          <section className={styles.requirementsSection}>
            <h3>Requirements</h3>
            <ul className={styles.requirementsList}>
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
          <section className={styles.tagsSection}>
            <h3>Tags</h3>
            <div className={styles.tagsList}>
              {service.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>#{tag.replace('_', ' ')}</span>
              ))}
            </div>
          </section>
        )}

        {/* Safety Tips */}
        <section className={styles.safetyTips}>
          <h4><FaShieldAlt /> Safety Tips</h4>
          <ul>
            <li>Communicate clearly about your requirements before ordering</li>
            <li>Agree on deadlines and deliverables upfront</li>
            <li>Keep all communication within the platform</li>
            <li>Only make payments through the platform</li>
            <li>Review the provider's rating and completed orders</li>
          </ul>
        </section>
      </div>

      {/* Fixed Action Bar */}
      <motion.div
        className={styles.actionBar}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className={styles.actionContent}>
          <div className={styles.priceSection}>
            <span className={styles.priceLarge}>
              {service.price_range || formatKenyanPrice(service.price_amount)}
            </span>
            <span className={styles.priceType}>{service.price_type}</span>
          </div>
          
          <div className={styles.actionButtons}>
            <button className={styles.contactActionBtn} onClick={contactProvider}>
              <FaWhatsapp /> Chat
            </button>
            <button className={styles.orderActionBtn} onClick={() => setShowOrderForm(true)}>
              Order Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderForm && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.orderModal}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className={styles.modalHeader}>
                <h3>Order Service</h3>
                <button onClick={() => setShowOrderForm(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleOrder} className={styles.orderForm}>
                <div className={styles.formGroup}>
                  <label>Requirements Description *</label>
                  <textarea
                    placeholder="Describe exactly what you need help with..."
                    value={orderData.requirements_description}
                    onChange={(e) => setOrderData(prev => ({ ...prev, requirements_description: e.target.value }))}
                    required
                    rows={4}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    value={orderData.deadline}
                    onChange={(e) => setOrderData(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Delivery Method</label>
                  <div className={styles.deliveryMethodOptions}>
                    <button
                      type="button"
                      className={`${styles.methodBtn} ${orderData.delivery_method === 'online' ? styles.selected : ''}`}
                      onClick={() => setOrderData(prev => ({ ...prev, delivery_method: 'online', meeting_location: '' }))}
                    >
                      <FaLaptop /> Online
                    </button>
                    <button
                      type="button"
                      className={`${styles.methodBtn} ${orderData.delivery_method === 'in_person' ? styles.selected : ''}`}
                      onClick={() => setOrderData(prev => ({ ...prev, delivery_method: 'in_person' }))}
                    >
                      <FaMapMarkerAlt /> In Person
                    </button>
                  </div>
                </div>

                {orderData.delivery_method === 'in_person' && (
                  <div className={styles.formGroup}>
                    <label>Meeting Location *</label>
                    <input
                      type="text"
                      placeholder="e.g., Library, Hostel A, Student Center..."
                      value={orderData.meeting_location}
                      onChange={(e) => setOrderData(prev => ({ ...prev, meeting_location: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Additional Notes</label>
                  <textarea
                    placeholder="Any special requirements or notes..."
                    value={orderData.customer_notes}
                    onChange={(e) => setOrderData(prev => ({ ...prev, customer_notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className={styles.priceSummary}>
                  <span>Total Amount:</span>
                  <strong>{formatKenyanPrice(service.price_amount)}</strong>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowOrderForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.confirmBtn}
                    disabled={ordering}
                  >
                    {ordering ? (
                      <>
                        <FaSpinner className={styles.spinning} />
                        Placing Order...
                      </>
                    ) : (
                      "Confirm Order"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceDetailPage;
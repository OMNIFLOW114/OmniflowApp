// src/pages/CampusPopularServices.jsx - UPDATED
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaStar, FaHeart, FaMapMarkerAlt, FaGraduationCap, 
  FaFilter, FaUsers, FaCheck, FaPlus, FaBook, FaLaptop, 
  FaPalette, FaChalkboardTeacher, FaBriefcase, FaSpinner
} from "react-icons/fa";
import styles from "./CampusPopularServices.module.css";

const CampusPopularServices = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCampus, setFilterCampus] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    loadServices();
    loadCampuses();
  }, [filterCampus, categoryFilter]);

  const loadServices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('student_services')
        .select('*')
        .eq('is_active', true)
        .order('total_orders', { ascending: false });
      
      if (filterCampus) {
        query = query.eq('campus_name', filterCampus);
      }
      
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadCampuses = async () => {
    try {
      const { data } = await supabase
        .from('student_services')
        .select('campus_name')
        .not('campus_name', 'is', null);
      
      const uniqueCampuses = [...new Set(data?.map(item => item.campus_name).filter(Boolean))];
      setCampuses(uniqueCampuses);
    } catch (error) {
      console.error('Error loading campuses:', error);
    }
  };

  const categories = [
    { id: "academic", name: "Academic", icon: <FaBook />, color: "#10B981" },
    { id: "technical", name: "Technical", icon: <FaLaptop />, color: "#3B82F6" },
    { id: "creative", name: "Creative", icon: <FaPalette />, color: "#EC4899" },
    { id: "tutoring", name: "Tutoring", icon: <FaChalkboardTeacher />, color: "#F59E0B" },
    { id: "consulting", name: "Consulting", icon: <FaBriefcase />, color: "#8B5CF6" }
  ];

  const ServiceCard = ({ service, index }) => (
    <motion.div
      className={styles.serviceCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/student/service/${service.id}`)}
    >
      <div className={styles.serviceIcon}>
        {service.category === 'academic' ? '📚' : 
         service.category === 'technical' ? '💻' : 
         service.category === 'creative' ? '🎨' : '🔧'}
      </div>
      <div className={styles.serviceInfo}>
        <div className={styles.serviceHeader}>
          <h4>{service.title}</h4>
          <div className={styles.popularityBadge}>
            <FaUsers /> {service.total_orders || 0} orders
          </div>
        </div>
        <p className={styles.serviceDesc}>{service.description?.substring(0, 80)}...</p>
        <div className={styles.serviceDetails}>
          <div className={styles.servicePrice}>
            {service.price_range || `KSh ${service.price_amount}`}
          </div>
          <div className={styles.serviceRating}>
            <FaStar /> {service.rating || '5.0'}
          </div>
        </div>
        <div className={styles.serviceMeta}>
          <span><FaMapMarkerAlt /> {service.campus_name}</span>
          <span><FaCheck /> {service.total_orders || 0}+ completed</span>
        </div>
        {service.tags?.length > 0 && (
          <div className={styles.serviceTags}>
            {service.tags.slice(0, 3).map(tag => (
              <span key={tag} className={styles.tag}>#{tag.replace('_', ' ')}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Popular Services</h1>
        <button className={styles.filterBtn} onClick={() => setShowFilters(!showFilters)}>
          <FaFilter />
        </button>
      </header>

      {showFilters && (
        <div className={styles.filtersBar}>
          <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)}>
            <option value="">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus} value={campus}>{campus}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonList}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeletonCard}></div>
            ))}
          </div>
        ) : services.length > 0 ? (
          <>
            <div className={styles.resultsHeader}>
              <span><FaGraduationCap /> {services.length} popular services available</span>
              <button 
                className={styles.offerServiceBtn}
                onClick={() => navigate('/student/offer-service')}
              >
                <FaPlus /> Offer a Service
              </button>
            </div>
            <div className={styles.servicesList}>
              {services.map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔧</div>
            <h3>No services available</h3>
            <p>Be the first to offer your skills and start earning!</p>
            <motion.button 
              className={styles.emptyOfferBtn}
              onClick={() => navigate('/student/offer-service')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlus /> Offer a Service
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CampusPopularServices;
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import {
  FiChevronRight,
  FiChevronLeft,
  FiUpload,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiMapPin,
  FiTruck,
  FiInfo,
} from "react-icons/fi";
import { FaMotorcycle, FaStore } from "react-icons/fa";
import "./CreateStore.css";

const Spinner = ({ size = 24 }) => (
  <svg className="cs-spinner" width={size} height={size} viewBox="0 0 50 50">
    <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" />
  </svg>
);

const CreateStore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useDarkMode();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEligible, setIsEligible] = useState(null);
  const [totalStores, setTotalStores] = useState(0);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const [storeData, setStoreData] = useState({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    location: "",
    location_lat: null,
    location_lng: null,
    kraPin: "",
    registrationNumber: "",
    businessType: "",
    businessDocument: null,
    ownerIdCard: null,
    delivery_type: "omniflow-managed",
    // For self-delivery sellers - ensure these have proper defaults
    has_delivery_fleet: false,
    delivery_fleet_size: 0,
    delivery_coverage_radius: 50,
    delivery_base_fee: 100,
    delivery_rate_per_km: 15,
  });

  // Enhanced GPS detection with better error handling
  useEffect(() => {
    const detectLocation = async () => {
      if (!user) return;
      
      setDetectingLocation(true);
      
      // Default fallback: Nairobi CBD
      let lat = -1.2921;
      let lng = 36.8219;
      let city = "Nairobi";
      let locationSource = "fallback";

      try {
        // Try to get precise location
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });

          lat = position.coords.latitude;
          lng = position.coords.longitude;
          locationSource = "gps";
          
          // Try to get city name from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
              { headers: { 'User-Agent': 'Omniflow-App' } }
            );
            const data = await response.json();
            
            city = data.address?.city ||
                   data.address?.town ||
                   data.address?.village ||
                   data.address?.county ||
                   "Nairobi";
          } catch (geoError) {
            console.log("Could not reverse geocode:", geoError);
          }
        }
      } catch (err) {
        console.log("GPS error, using fallback:", err);
      } finally {
        // Ensure coordinates are numbers with proper precision
        const finalLat = parseFloat(lat.toFixed(8));
        const finalLng = parseFloat(lng.toFixed(8));
        
        console.log(`Location detected (${locationSource}):`, { 
          lat: finalLat, 
          lng: finalLng, 
          city,
          source: locationSource 
        });

        setStoreData(prev => ({
          ...prev,
          location: city,
          location_lat: finalLat,
          location_lng: finalLng,
        }));

        setDetectingLocation(false);
      }
    };

    detectLocation();
  }, [user]);

  // Check existing store request
  useEffect(() => {
    const fetchExistingRequest = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("store_requests")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (error && error.code !== "PGRST116") {
          console.warn(error);
        } else if (data && data.length > 0) {
          setRequestStatus(data[0].status);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExistingRequest();
  }, [user]);

  // Check eligibility
  useEffect(() => {
    if (user && !requestStatus) {
      async function fetchEligibility() {
        setLoading(true);
        try {
          const { count } = await supabase
            .from("stores")
            .select("*", { count: "exact", head: true });
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle();
          setTotalStores(count || 0);
          setIsEligible((count || 0) < 1000 || !!subscription);
        } catch (err) {
          console.error(err);
          setIsEligible(true);
        } finally {
          setLoading(false);
        }
      }
      fetchEligibility();
    }
  }, [user, requestStatus]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStoreData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setStoreData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : parseFloat(value),
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files?.length) {
      setStoreData(prev => ({ ...prev, [name]: null }));
      return;
    }
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setStoreData(prev => ({ ...prev, [name]: file }));
  };

  const uploadFile = async (file, prefix) => {
    if (!file || !user?.id) return null;
    const safeName = file.name.replace(/\s+/g, "_");
    const path = `${prefix}/${user.id}_${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("store-documents").upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  };

  const validateForm = () => {
    // Check required fields
    const required = ["name", "contactEmail", "contactPhone", "location", "kraPin", "registrationNumber", "businessType", "delivery_type"];
    for (const field of required) {
      if (!storeData[field]) {
        toast.error(`Please fill all required fields`);
        return false;
      }
    }

    // Validate coordinates
    if (!storeData.location_lat || !storeData.location_lng) {
      toast.error("Location coordinates are required. Please wait for GPS detection.");
      return false;
    }

    // Validate self-delivery fields
    if (storeData.delivery_type === 'self-delivery') {
      if (storeData.delivery_fleet_size < 1) {
        toast.error("Please specify your delivery fleet size");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error("Login required");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setDebugInfo(null);

    try {
      // Upload files if present
      let businessDocPath = null;
      let idCardPath = null;

      if (storeData.businessDocument) {
        businessDocPath = await uploadFile(storeData.businessDocument, "business-documents");
      }
      if (storeData.ownerIdCard) {
        idCardPath = await uploadFile(storeData.ownerIdCard, "id-cards");
      }

      // CRITICAL: Ensure all values are properly typed and formatted
      const latValue = parseFloat(storeData.location_lat);
      const lngValue = parseFloat(storeData.location_lng);
      const isSelfDelivery = storeData.delivery_type === 'self-delivery';

      // Prepare payload with explicit type conversion
      const payload = {
        // Core fields
        user_id: user.id,
        name: storeData.name.trim(),
        description: storeData.description?.trim() || null,
        contact_email: storeData.contactEmail.trim(),
        contact_phone: storeData.contactPhone.trim(),
        location: storeData.location.trim(),
        
        // Location coordinates - ensure numbers
        location_lat: latValue,
        location_lng: lngValue,
        
        // Delivery fields - ensure correct types
        delivery_type: storeData.delivery_type,
        has_delivery_fleet: isSelfDelivery, // Boolean - critical!
        delivery_fleet_size: isSelfDelivery ? parseInt(storeData.delivery_fleet_size) : 0,
        delivery_coverage_radius: isSelfDelivery ? parseInt(storeData.delivery_coverage_radius) : 50,
        delivery_base_fee: isSelfDelivery ? parseFloat(storeData.delivery_base_fee) : 100,
        delivery_rate_per_km: isSelfDelivery ? parseFloat(storeData.delivery_rate_per_km) : 15,
        
        // Business fields
        kra_pin: storeData.kraPin.trim(),
        registration_number: storeData.registrationNumber.trim(),
        business_type: storeData.businessType,
        business_document: businessDocPath,
        owner_id_card: idCardPath,
        status: "pending",
        
        // Metadata for debugging
        metadata: {
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          form_data: {
            location_source: storeData.location,
            self_delivery: isSelfDelivery,
            fleet_size: storeData.delivery_fleet_size
          }
        }
      };

      // Log the complete payload for debugging
      console.log("=== SUBMITTING STORE REQUEST ===");
      console.log("Payload:", JSON.stringify(payload, null, 2));
      console.log("Coordinate values:", { lat: latValue, lng: lngValue, latType: typeof latValue, lngType: typeof lngValue });
      console.log("Delivery fields:", {
        has_delivery_fleet: payload.has_delivery_fleet,
        type: typeof payload.has_delivery_fleet,
        fleet_size: payload.delivery_fleet_size,
        delivery_type: payload.delivery_type
      });

      setDebugInfo(payload);

      // Insert into database
      const { data, error } = await supabase
        .from("store_requests")
        .insert(payload)
        .select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Database response:", data);

      // Verify the inserted data
      if (data && data[0]) {
        console.log("=== VERIFICATION ===");
        console.log("Inserted data:", data[0]);
        console.log("Location lat inserted:", data[0].location_lat);
        console.log("Location lng inserted:", data[0].location_lng);
        console.log("Has delivery fleet inserted:", data[0].has_delivery_fleet);
        console.log("Fleet size inserted:", data[0].delivery_fleet_size);
      }

      toast.success("Store request submitted successfully!");
      setRequestStatus("pending");
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
      
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(`Submission failed: ${err.message}`);
      
      // Log detailed error for debugging
      setDebugInfo({
        error: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fileLabel = (file) => (file ? file.name : "No file selected");

  // Status screens
  if (loading) {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center">
          <Spinner size={40} />
          <div className="cs-loading-text">Checking status...</div>
        </div>
      </div>
    );
  }

  if (requestStatus === "pending") {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center cs-card-status">
          <div className="cs-status-icon pending">
            <FiClock size={36} />
          </div>
          <h3 className="cs-status-title">Request Under Review</h3>
          <p className="cs-status-desc">
            Thank you — your store verification request is being reviewed by our team. We'll notify you when a decision is made.
          </p>
          <div className="cs-status-actions">
            <button className="cs-btn cs-btn-muted" onClick={() => navigate("/")}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requestStatus === "approved") {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center cs-card-status">
          <div className="cs-status-icon approved">
            <FiCheckCircle size={36} />
          </div>
          <h3 className="cs-status-title">Store Approved</h3>
          <p className="cs-status-desc">Your store is live. You can now manage products and orders from your dashboard.</p>
          <div className="cs-status-actions">
            <button className="cs-btn" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requestStatus === "rejected") {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center cs-card-status">
          <div className="cs-status-icon rejected">
            <FiXCircle size={36} />
          </div>
          <h3 className="cs-status-title">Request Rejected</h3>
          <p className="cs-status-desc">Your store request was rejected. Please review your details or contact support.</p>
          <div className="cs-status-actions">
            <button className="cs-btn" onClick={() => setRequestStatus(null)}>
              Resubmit Request
            </button>
            <a href="mailto:support@omniflow.ai" className="cs-btn cs-btn-muted">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isEligible === null) {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center">
          <Spinner size={40} />
          <div className="cs-loading-text">Checking eligibility...</div>
        </div>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center cs-card-status">
          <h3 className="cs-status-title">Premium Subscription Required</h3>
          <p className="cs-status-desc">
            We have reached {totalStores} stores. To create a store, subscribe to our premium plan.
          </p>
          <div className="cs-status-actions">
            <button className="cs-btn cs-btn-primary" onClick={() => navigate("/store/premium")}>
              Go to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`create-store-page ${darkMode ? "dark" : "light"}`}>
      <div className="cs-container" role="main">
        <div className="cs-header">
          <h2 className="cs-title">Create a Verified Store</h2>
          {totalStores < 1000 && (
            <p className="cs-offer-text">
              Limited Offer: Free store creation for the first 1000 users! ({1000 - totalStores} slots left)
            </p>
          )}
          <div className="cs-progress">
            <div className={`cs-step ${step >= 1 ? "active" : ""}`}>1</div>
            <div className="cs-progress-line" />
            <div className={`cs-step ${step >= 2 ? "active" : ""}`}>2</div>
            <div className="cs-progress-label">Step {step} of 2</div>
          </div>
        </div>

        <form className="cs-form" onSubmit={handleSubmit} noValidate>
          <div className={`cs-step-panel ${step === 1 ? "visible" : "hidden"}`}>
            <div className="cs-location-box">
              <div className="cs-location-header">
                <FiMapPin className={detectingLocation ? "pulse" : ""} />
                <span>Your Location</span>
                {detectingLocation && <Spinner size={18} />}
              </div>
              <input
                className="cs-input"
                name="location"
                value={storeData.location}
                onChange={handleInputChange}
                placeholder="e.g. Westlands, Nairobi"
                required
              />
              <small style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                Auto-detected for accurate delivery. You can edit if needed.
              </small>
              
              {/* Show coordinates for verification */}
              {storeData.location_lat && storeData.location_lng && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  background: darkMode ? '#2a2a2a' : '#f5f5f5',
                  borderRadius: 6,
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📍 Latitude:</span>
                    <strong>{storeData.location_lat.toFixed(6)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>📍 Longitude:</span>
                    <strong>{storeData.location_lng.toFixed(6)}</strong>
                  </div>
                </div>
              )}
            </div>

            <label className="cs-label">Store Name *</label>
            <input
              className="cs-input"
              name="name"
              value={storeData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g. Omniflow Emporium"
            />

            <label className="cs-label">Short Description</label>
            <textarea
              className="cs-textarea"
              name="description"
              value={storeData.description}
              onChange={handleInputChange}
              placeholder="Describe your store in one or two lines (optional)"
              rows="3"
            />

            <div className="cs-grid-2">
              <div>
                <label className="cs-label">Contact Email *</label>
                <input
                  className="cs-input"
                  name="contactEmail"
                  type="email"
                  value={storeData.contactEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="owner@business.com"
                />
              </div>

              <div>
                <label className="cs-label">Contact Phone *</label>
                <input
                  className="cs-input"
                  name="contactPhone"
                  value={storeData.contactPhone}
                  onChange={handleInputChange}
                  required
                  placeholder="+2547XXXXXXXX"
                />
              </div>
            </div>

            {/* DELIVERY TYPE SELECTION */}
            <div className="cs-delivery-section">
              <label className="cs-label cs-section-label">
                <FiTruck style={{ marginRight: 8 }} />
                Delivery Type *
              </label>
              
              <div className="cs-delivery-cards">
                <label 
                  className={`cs-delivery-card ${storeData.delivery_type === 'self-delivery' ? 'selected' : ''}`}
                  onClick={() => {
                    setStoreData(prev => ({ 
                      ...prev, 
                      delivery_type: 'self-delivery',
                      has_delivery_fleet: true // Auto-set when self-delivery selected
                    }));
                  }}
                >
                  <input
                    type="radio"
                    name="delivery_type"
                    value="self-delivery"
                    checked={storeData.delivery_type === 'self-delivery'}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  <FaStore className="cs-card-icon" />
                  <h4>Self-Delivery</h4>
                  <p className="cs-card-desc">I have my own delivery fleet</p>
                  <div className="cs-card-features">
                    <span>✅ Keep 95% of delivery fees</span>
                    <span>📦 Full control over delivery</span>
                    <span>📍 Set your own rates</span>
                  </div>
                </label>

                <label 
                  className={`cs-delivery-card ${storeData.delivery_type === 'omniflow-managed' ? 'selected' : ''}`}
                  onClick={() => {
                    setStoreData(prev => ({ 
                      ...prev, 
                      delivery_type: 'omniflow-managed',
                      has_delivery_fleet: false // Auto-set when omniflow selected
                    }));
                  }}
                >
                  <input
                    type="radio"
                    name="delivery_type"
                    value="omniflow-managed"
                    checked={storeData.delivery_type === 'omniflow-managed'}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  <FaMotorcycle className="cs-card-icon" />
                  <h4>Omniflow Managed</h4>
                  <p className="cs-card-desc">We handle delivery for you</p>
                  <div className="cs-card-features">
                    <span>✅ Keep 90% of delivery fees</span>
                    <span>📦 Professional riders</span>
                    <span>📍 Nationwide coverage</span>
                  </div>
                </label>
              </div>
            </div>

            {/* SELF-DELIVERY DETAILS */}
            {storeData.delivery_type === 'self-delivery' && (
              <div className="cs-self-delivery-details">
                <h4 className="cs-subsection-title">Delivery Fleet Details</h4>
                
                <div className="cs-grid-2">
                  <div>
                    <label className="cs-label">Fleet Size *</label>
                    <input
                      className="cs-input"
                      type="number"
                      name="delivery_fleet_size"
                      value={storeData.delivery_fleet_size}
                      onChange={handleNumberChange}
                      min="1"
                      required
                      placeholder="Number of riders"
                    />
                  </div>

                  <div>
                    <label className="cs-label">Coverage Radius (km) *</label>
                    <input
                      className="cs-input"
                      type="number"
                      name="delivery_coverage_radius"
                      value={storeData.delivery_coverage_radius}
                      onChange={handleNumberChange}
                      min="1"
                      max="500"
                      required
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>

                <div className="cs-grid-2">
                  <div>
                    <label className="cs-label">Base Delivery Fee (Ksh) *</label>
                    <input
                      className="cs-input"
                      type="number"
                      name="delivery_base_fee"
                      value={storeData.delivery_base_fee}
                      onChange={handleNumberChange}
                      min="0"
                      step="10"
                      required
                      placeholder="e.g. 100"
                    />
                    <small className="cs-hint">Fixed pickup cost</small>
                  </div>

                  <div>
                    <label className="cs-label">Rate per KM (Ksh) *</label>
                    <input
                      className="cs-input"
                      type="number"
                      name="delivery_rate_per_km"
                      value={storeData.delivery_rate_per_km}
                      onChange={handleNumberChange}
                      min="0"
                      step="1"
                      required
                      placeholder="e.g. 15"
                    />
                    <small className="cs-hint">Cost per kilometer traveled</small>
                  </div>
                </div>

                <div className="cs-info-box">
                  <FiInfo />
                  <span>
                    Your delivery fees will be calculated as: Base Fee + (Distance × Rate per KM)
                    <br />
                    <strong>Example:</strong> 5km delivery = Ksh {storeData.delivery_base_fee} + (5 × {storeData.delivery_rate_per_km}) = Ksh {storeData.delivery_base_fee + (5 * storeData.delivery_rate_per_km)}
                  </span>
                </div>
              </div>
            )}

            {/* OMNIFLOW MANAGED INFO */}
            {storeData.delivery_type === 'omniflow-managed' && (
              <div className="cs-omniflow-info">
                <div className="cs-info-box cs-info-blue">
                  <FiInfo />
                  <div>
                    <strong>Omniflow Managed Delivery Benefits:</strong>
                    <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                      <li>Professional, vetted riders</li>
                      <li>Real-time tracking for customers</li>
                      <li>Insurance coverage for all deliveries</li>
                      <li>Nationwide coverage across Kenya</li>
                      <li>You keep 90% of delivery fees</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="cs-step-buttons">
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                onClick={() => {
                  if (!storeData.name || !storeData.contactEmail || !storeData.contactPhone || !storeData.location || !storeData.delivery_type) {
                    toast.error("Please fill required fields before continuing.");
                    return;
                  }
                  if (storeData.delivery_type === 'self-delivery' && storeData.delivery_fleet_size < 1) {
                    toast.error("Please specify your fleet size for self-delivery");
                    return;
                  }
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Next <FiChevronRight style={{ marginLeft: 8 }} />
              </button>
            </div>
          </div>

          <div className={`cs-step-panel ${step === 2 ? "visible" : "hidden"}`}>
            <label className="cs-label">KRA PIN *</label>
            <input
              className="cs-input"
              name="kraPin"
              value={storeData.kraPin}
              onChange={handleInputChange}
              required
              placeholder="e.g. A123456789B"
            />

            <label className="cs-label">Business Registration Number *</label>
            <input
              className="cs-input"
              name="registrationNumber"
              value={storeData.registrationNumber}
              onChange={handleInputChange}
              required
              placeholder="Company or registration number"
            />

            <label className="cs-label">Business Type *</label>
            <select
              className="cs-select"
              name="businessType"
              value={storeData.businessType}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Type</option>
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="limited_liability">Limited Liability Company</option>
              <option value="partnership">Partnership</option>
              <option value="corporation">Corporation</option>
              <option value="ngo">NGO / Trust / CBO</option>
            </select>

            <div className="cs-file-grid">
              <div className="cs-file-box">
                <label className="cs-label">Business Registration Document</label>
                <div className="cs-file-row">
                  <label className="cs-file-chooser">
                    <FiUpload /> Choose file
                    <input
                      type="file"
                      name="businessDocument"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      hidden
                    />
                  </label>
                  <div className="cs-file-info">{fileLabel(storeData.businessDocument)}</div>
                </div>
                <small className="cs-file-hint">PDF or image, max 10MB</small>
              </div>

              <div className="cs-file-box">
                <label className="cs-label">Owner Government ID</label>
                <div className="cs-file-row">
                  <label className="cs-file-chooser">
                    <FiUpload /> Choose file
                    <input
                      type="file"
                      name="ownerIdCard"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      hidden
                    />
                  </label>
                  <div className="cs-file-info">{fileLabel(storeData.ownerIdCard)}</div>
                </div>
                <small className="cs-file-hint">PDF or image, max 10MB</small>
              </div>
            </div>

            {/* Summary Section */}
            <div className="cs-delivery-summary">
              <h4>Delivery Summary</h4>
              <div className="cs-summary-row">
                <span>Delivery Type:</span>
                <strong>
                  {storeData.delivery_type === 'self-delivery' ? 'Self-Delivery' : 'Omniflow Managed'}
                </strong>
              </div>
              {storeData.delivery_type === 'self-delivery' && (
                <>
                  <div className="cs-summary-row">
                    <span>Fleet Size:</span>
                    <strong>{storeData.delivery_fleet_size} riders</strong>
                  </div>
                  <div className="cs-summary-row">
                    <span>Coverage Radius:</span>
                    <strong>{storeData.delivery_coverage_radius} km</strong>
                  </div>
                  <div className="cs-summary-row">
                    <span>Base Fee:</span>
                    <strong>Ksh {storeData.delivery_base_fee}</strong>
                  </div>
                  <div className="cs-summary-row">
                    <span>Rate per KM:</span>
                    <strong>Ksh {storeData.delivery_rate_per_km}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="cs-location-summary">
              <h4>Location Details</h4>
              <div className="cs-summary-row">
                <span>Location:</span>
                <strong>{storeData.location}</strong>
              </div>
              <div className="cs-summary-row">
                <span>Latitude:</span>
                <strong>{storeData.location_lat?.toFixed(6) || 'Not set'}</strong>
              </div>
              <div className="cs-summary-row">
                <span>Longitude:</span>
                <strong>{storeData.location_lng?.toFixed(6) || 'Not set'}</strong>
              </div>
            </div>

            <div className="cs-step-buttons">
              <button
                type="button"
                className="cs-btn cs-btn-muted"
                onClick={() => {
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <FiChevronLeft style={{ marginRight: 8 }} /> Back
              </button>

              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <button
                  type="submit"
                  className="cs-btn cs-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size={18} /> Submitting...
                    </>
                  ) : (
                    "Submit for Approval"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Debug Panel - Only visible in development */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div style={{
            marginTop: 20,
            padding: 15,
            background: '#1a1a1a',
            color: '#00ff00',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 300,
            overflow: 'auto'
          }}>
            <h4 style={{ color: '#fff', marginBottom: 10 }}>Debug Info:</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>

      {submitting && (
        <div className="cs-overlay" aria-hidden>
          <div className="cs-overlay-inner">
            <Spinner size={36} />
            <div className="cs-loading-text">Submitting, please wait…</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateStore;
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
  FiLoader,
  FiMapPin,
  FiTruck,
} from "react-icons/fi";
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
    has_own_delivery: false,
  });

  const [detectingLocation, setDetectingLocation] = useState(false);

  // FINAL GPS DETECTION — GUARANTEED TO SAVE COORDINATES
  useEffect(() => {
    const detectLocation = async () => {
      setDetectingLocation(true);

      let lat = -1.2921;  // Default fallback: Nairobi CBD
      let lng = 36.8219;
      let city = "Nairobi";

      try {
        let position;

        if (window.Capacitor?.isNative) {
          const { Geolocation } = await import("@capacitor/geolocation");
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
          });
        } else {
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
            });
          });
        }

        lat = parseFloat(position.coords.latitude.toFixed(8));
        lng = parseFloat(position.coords.longitude.toFixed(8));

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
        );
        const data = await response.json();

        city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          data.address?.state ||
          "Kenya";

        toast.success(`Location detected: ${city}`);
      } catch (err) {
        console.log("GPS unavailable — using Nairobi fallback");
        toast.info("Location not detected — using Nairobi (editable)");
      } finally {
        // FORCE SAVE COORDINATES — NO MATTER WHAT
        setStoreData(prev => ({
          ...prev,
          location: city,
          location_lat: lat,
          location_lng: lng,
        }));

        setDetectingLocation(false);
      }
    };

    if (user) detectLocation();
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
          .limit(1)
          .single();
        if (error && error.code !== "PGRST116") console.warn(error);
        setRequestStatus(data ? data.status : null);
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

  // Verify Stripe subscription
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (sessionId && user) {
      async function verifySession() {
        try {
          const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
            body: { session_id: sessionId },
          });
          if (error) throw error;
          if (data.subscription?.status === "active") {
            toast.success("Subscription successful!");
            setIsEligible(true);
          }
        } catch (err) {
          toast.error("Verification failed.");
        }
      }
      verifySession();
    }
  }, [location, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStoreData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return toast.error("Login required");

    const required = ["name", "contactEmail", "contactPhone", "location", "kraPin", "registrationNumber", "businessType"];
    for (const field of required) {
      if (!storeData[field]) {
        toast.error("All required fields must be filled");
        if (["name", "contactEmail", "contactPhone", "location"].includes(field)) setStep(1);
        else setStep(2);
        return;
      }
    }

    setSubmitting(true);

    try {
      let businessDocPath = null;
      let idCardPath = null;

      if (storeData.businessDocument) businessDocPath = await uploadFile(storeData.businessDocument, "business-documents");
      if (storeData.ownerIdCard) idCardPath = await uploadFile(storeData.ownerIdCard, "id-cards");

      const payload = {
        user_id: user.id,
        name: storeData.name.trim(),
        description: storeData.description?.trim() || null,
        contact_email: storeData.contactEmail.trim(),
        contact_phone: storeData.contactPhone.trim(),
        location: storeData.location.trim(),
        // GUARANTEED NON-NULL COORDINATES
        location_lat: parseFloat(storeData.location_lat?.toFixed(8)) || -1.2921,
        location_lng: parseFloat(storeData.location_lng?.toFixed(8)) || 36.8219,
        has_own_delivery: storeData.has_own_delivery,
        kra_pin: storeData.kraPin.trim(),
        registration_number: storeData.registrationNumber.trim(),
        business_type: storeData.businessType,
        business_document: businessDocPath,
        owner_id_card: idCardPath,
        status: "pending",
      };

      const { error } = await supabase.from("store_requests").insert(payload);
      if (error) throw error;

      toast.success("Store request submitted! We'll review it soon.");
      setRequestStatus("pending");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fileLabel = (file) => (file ? file.name : "No file selected");

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
            <button className="cs-btn" onClick={() => toast("Check again later for updates.")}>
              Refresh Status
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
            We have reached {totalStores} stores. The free creation offer for the first 1000 stores has ended. 
            To create a store, subscribe to our premium plan.
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

            <div className="cs-delivery-preference">
              <label className="cs-label">
                <FiTruck style={{ marginRight: 8 }} />
                Delivery Preference *
              </label>
              <div className="cs-radio-group">
                <label className="cs-radio-label">
                  <input
                    type="radio"
                    name="has_own_delivery"
                    checked={storeData.has_own_delivery === true}
                    onChange={() => setStoreData(prev => ({ ...prev, has_own_delivery: true }))}
                    required
                  />
                  I have my own delivery means (free for buyers)
                </label>
                <label className="cs-radio-label">
                  <input
                    type="radio"
                    name="has_own_delivery"
                    checked={storeData.has_own_delivery === false}
                    onChange={() => setStoreData(prev => ({ ...prev, has_own_delivery: false }))}
                    required
                  />
                  Use Omniflow delivery (fee applies)
                </label>
              </div>
            </div>

            <div className="cs-step-buttons">
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                onClick={() => {
                  if (!storeData.name || !storeData.contactEmail || !storeData.contactPhone || !storeData.location) {
                    toast.error("Please fill required fields before continuing.");
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
                    <>
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
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
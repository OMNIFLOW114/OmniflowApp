import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { ToastContainer, toast } from "react-toastify";
import {
  FiChevronRight,
  FiChevronLeft,
  FiUpload,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiLoader,
} from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import "./CreateStore.css";

const Spinner = ({ size = 24 }) => (
  <svg
    className="cs-spinner"
    width={size}
    height={size}
    viewBox="0 0 50 50"
    aria-hidden
  >
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
    kraPin: "",
    registrationNumber: "",
    businessType: "",
    businessDocument: null,
    ownerIdCard: null,
  });

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
        if (error && error.code !== "PGRST116") {
          console.warn("fetchExistingRequest error:", error);
        }
        setRequestStatus(data ? data.status : null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExistingRequest();
  }, [user]);

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
          toast.error("Failed to check eligibility");
          setIsEligible(true); // Fallback
        } finally {
          setLoading(false);
        }
      }
      fetchEligibility();
    }
  }, [user, requestStatus]);

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
          if (data.subscription && data.subscription.status === "active") {
            toast.success("Subscription successful! You can now create your store.");
            setIsEligible(true);
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to verify subscription.");
        }
      }
      verifySession();
    }
  }, [location, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files || files.length === 0) {
      setStoreData((p) => ({ ...p, [name]: null }));
      return;
    }
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Limit is 10MB.");
      return;
    }
    setStoreData((p) => ({ ...p, [name]: file }));
  };

  const uploadFile = async (file, pathPrefix) => {
    if (!file || !user?.id) return null;
    const safeName = file.name.replace(/\s+/g, "_");
    const filePath = `${pathPrefix}/${user.id}_${Date.now()}_${safeName}`;
    try {
      const { data, error } = await supabase.storage.from("store-documents").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        console.error("Upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      return data.path;
    } catch (err) {
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.info("Please log in to continue.");
      return;
    }

    if (!storeData.name || !storeData.contactEmail || !storeData.contactPhone || !storeData.location) {
      toast.error("Please complete the required fields in Step 1.");
      setStep(1);
      return;
    }
    if (!storeData.kraPin || !storeData.registrationNumber || !storeData.businessType) {
      toast.error("Please complete the required fields in Step 2.");
      setStep(2);
      return;
    }

    setSubmitting(true);

    try {
      let businessDocPath = null;
      let idCardPath = null;

      if (storeData.businessDocument) {
        businessDocPath = await uploadFile(storeData.businessDocument, "business-documents");
      }
      if (storeData.ownerIdCard) {
        idCardPath = await uploadFile(storeData.ownerIdCard, "id-cards");
      }

      const payload = {
        user_id: user.id,
        name: storeData.name.trim(),
        description: storeData.description?.trim() || null,
        contact_email: storeData.contactEmail.trim(),
        contact_phone: storeData.contactPhone.trim(),
        location: storeData.location.trim(),
        kra_pin: storeData.kraPin.trim(),
        registration_number: storeData.registrationNumber.trim(),
        business_type: storeData.businessType,
        business_document: businessDocPath,
        owner_id_card: idCardPath,
        status: "pending",
      };

      const { error } = await supabase.from("store_requests").insert(payload);

      if (error) {
        console.error("Insert error:", error);
        throw new Error(`Insert failed: ${error.message}`);
      }

      setRequestStatus("pending");
      toast.success("Store request submitted. We'll notify you when it's reviewed.");
    } catch (err) {
      console.error("submit error:", err);
      toast.error(`Failed to submit request: ${err.message}. Please check your Supabase storage policies and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const fileLabel = (file) => (file ? `${file.name}` : "No file selected");

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
            <button className="cs-btn" onClick={() => toast.info("Check again later for updates.")}>
              Refresh Status
            </button>
          </div>
        </div>
        <ToastContainer position="bottom-center" />
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
        <ToastContainer position="bottom-center" />
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
        <ToastContainer position="bottom-center" />
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
        <ToastContainer position="bottom-center" />
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

            <label className="cs-label">Location *</label>
            <input
              className="cs-input"
              name="location"
              value={storeData.location}
              onChange={handleInputChange}
              required
              placeholder="City / Town"
            />

            <div className="cs-step-buttons">
              <button
                type="button"
                className="cs-btn cs-btn-muted"
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
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                  <div className="cs-file-info">{fileLabel(storeData.businessDocument)}</div>
                </div>
              </div>

              <div className="cs-file-box">
                <label className="cs-label">Owner Government ID</label>
                <div className="cs-file-row">
                  <label className="cs-file-chooser">
                    <FiUpload /> Choose file
                    <input
                      type="file"
                      name="ownerIdCard"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                  <div className="cs-file-info">{fileLabel(storeData.ownerIdCard)}</div>
                </div>
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

      <ToastContainer position="bottom-center" />
    </div>
  );
};

export default CreateStore;
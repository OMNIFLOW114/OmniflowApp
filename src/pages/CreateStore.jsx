import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import "./CreateStore.css";

const CreateStore = () => {
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
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExistingRequest = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("store_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setRequestStatus(data.status);
      }
    };

    fetchExistingRequest();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setStoreData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const uploadFile = async (file, pathPrefix) => {
    const filePath = `${pathPrefix}/${user.id}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("store-documents")
      .upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return alert("Please login first.");
    setLoading(true);

    try {
      let businessDocPath = null;
      let idCardPath = null;

      if (storeData.businessDocument)
        businessDocPath = await uploadFile(storeData.businessDocument, "business-documents");
      if (storeData.ownerIdCard)
        idCardPath = await uploadFile(storeData.ownerIdCard, "id-cards");

      const payload = {
        user_id: user.id,
        name: storeData.name,
        description: storeData.description,
        contact_email: storeData.contactEmail,
        contact_phone: storeData.contactPhone,
        location: storeData.location,
        kra_pin: storeData.kraPin,
        registration_number: storeData.registrationNumber,
        business_type: storeData.businessType,
        business_document: businessDocPath,
        owner_id_card: idCardPath,
        status: "pending",
      };

      const { error } = await supabase.from("store_requests").insert(payload);

      if (error) throw error;

      setRequestStatus("pending");
      alert("✅ Store request submitted successfully. Await admin approval.");
    } catch (err) {
      console.error("Store request error:", err);
      alert("Failed to submit request. Please check your documents and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (requestStatus === "pending") {
    return (
      <div className="container">
        <h2>⏳ Request Pending</h2>
        <p>Your store request is currently under review. Please wait for admin approval.</p>
      </div>
    );
  }

  if (requestStatus === "approved") {
    return (
      <div className="container">
        <h2>✅ Store Approved</h2>
        <p>Your store has already been approved. You can now manage it in your dashboard.</p>
        <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Start Your Verified Store 🛍</h2>
      <form onSubmit={handleSubmit} className="store-form">
        <label>Store Name *</label>
        <input type="text" name="name" value={storeData.name} onChange={handleInputChange} required />

        <label>Description</label>
        <textarea name="description" value={storeData.description} onChange={handleInputChange} />

        <label>Contact Email *</label>
        <input type="email" name="contactEmail" value={storeData.contactEmail} onChange={handleInputChange} required />

        <label>Contact Phone *</label>
        <input type="text" name="contactPhone" value={storeData.contactPhone} onChange={handleInputChange} required />

        <label>Location *</label>
        <input type="text" name="location" value={storeData.location} onChange={handleInputChange} required />

        <label>KRA PIN *</label>
        <input type="text" name="kraPin" value={storeData.kraPin} onChange={handleInputChange} required />

        <label>Business Registration Number *</label>
        <input type="text" name="registrationNumber" value={storeData.registrationNumber} onChange={handleInputChange} required />

        <label>Business Type *</label>
        <select name="businessType" value={storeData.businessType} onChange={handleInputChange} required>
          <option value="">Select Type</option>
          <option value="sole_proprietorship">Sole Proprietorship</option>
          <option value="limited_liability">Limited Liability Company</option>
          <option value="partnership">Partnership</option>
          <option value="corporation">Corporation</option>
          <option value="ngo">NGO / Trust / CBO</option>
        </select>

        <label>Upload Business Registration Document</label>
        <input type="file" accept=".pdf,image/*" name="businessDocument" onChange={handleFileChange} />

        <label>Upload Government-Issued ID</label>
        <input type="file" accept=".pdf,image/*" name="ownerIdCard" onChange={handleFileChange} />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "🚀 Submit for Approval"}
        </button>
      </form>
    </div>
  );
};

export default CreateStore;

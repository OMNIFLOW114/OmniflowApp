import React, { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FaWhatsapp } from "react-icons/fa";
import "./Profile.css";


export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  // Fetch user + profile + seller info
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      // Check users table for full name
      const { data: userMeta } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Fetch profile
      let { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        // Insert empty profile
        await supabase.from("profiles").insert({ id: user.id });
        profileData = {};
      }

      // Check if user is a seller (active store)
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_email", user.email)
        .eq("is_active", true)
        .single();

      setProfile({
        id: user.id,
        fullName: userMeta?.full_name || "",
        email: user.email,
        phone: profileData.phone || "",
        gender: profileData.gender || "",
        birthday: profileData.birthday || "",
        city: profileData.city || "",
        country: profileData.country || "",
        jobTitle: profileData.job_title || "",
        company: profileData.company || "",
        linkedIn: profileData.linkedin || "",
        website: profileData.website || "",
        twitter: profileData.twitter || "",
        instagram: profileData.instagram || "",
        facebook: profileData.facebook || "",
        github: profileData.github || "",
        skills: profileData.skills || "",
        languages: profileData.languages || "",
        interests: profileData.interests || "",
        aboutMe: profileData.about_me || "",
        bio: profileData.bio || "",
        profilePicture: profileData.profile_picture || "",
        isSeller: !!storeData,
      });
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfile((prev) => ({ ...prev, profilePicture: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!profile.phone) return alert("Phone is required");

    setSaving(true);
    try {
      let profilePictureUrl = profile.profilePicture;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `profile_${profile.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, imageFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("profile-pictures")
          .getPublicUrl(fileName);

        profilePictureUrl = publicUrl.publicUrl;
      }

      const updates = {
        phone: profile.phone,
        gender: profile.gender,
        birthday: profile.birthday,
        city: profile.city,
        country: profile.country,
        job_title: profile.jobTitle,
        company: profile.company,
        linkedin: profile.linkedIn,
        website: profile.website,
        twitter: profile.twitter,
        instagram: profile.instagram,
        facebook: profile.facebook,
        github: profile.github,
        skills: profile.skills,
        languages: profile.languages,
        interests: profile.interests,
        about_me: profile.aboutMe,
        bio: profile.bio,
        profile_picture: profilePictureUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;

      navigate("/home");
    } catch (err) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-heading">My Profile</h2>

        <div className="profile-photo-wrapper">
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt="Profile" className="profile-photo" />
          ) : (
            <div className="profile-placeholder">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
              {profile.whatsappNumber && <FaWhatsapp className="whatsapp-icon" />}
            </div>
          )}

          <label className="upload-btn">
            Change Photo
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          </label>

          <div className="profile-basic-info">
            <h3>{profile.fullName || "Unnamed User"}</h3>
            <p>{profile.email}</p>
            {profile.isSeller && <span className="seller-badge">Seller</span>}
          </div>
        </div>

        {/* Personal Info (Required) */}
        <div className="profile-section">
          <h3 className="section-title">Personal Information</h3>
          <div className="grid-2">
            <input name="phone" placeholder="Phone *" value={profile.phone} onChange={handleChange} required />
            <input name="gender" placeholder="Gender" value={profile.gender} onChange={handleChange} />
            <input type="date" name="birthday" value={profile.birthday} onChange={handleChange} />
            <input name="city" placeholder="City" value={profile.city} onChange={handleChange} />
            <input name="country" placeholder="Country" value={profile.country} onChange={handleChange} />
          </div>
        </div>

        {/* Professional Info (Optional) */}
        <div className="profile-section">
          <h3 className="section-title">Professional Information (Optional)</h3>
          <div className="grid-2">
            <input name="jobTitle" placeholder="Job Title" value={profile.jobTitle} onChange={handleChange} />
            <input name="company" placeholder="Company" value={profile.company} onChange={handleChange} />
            <input name="linkedIn" placeholder="LinkedIn" value={profile.linkedIn} onChange={handleChange} />
            <input name="website" placeholder="Website" value={profile.website} onChange={handleChange} />
          </div>
        </div>

        {/* Social Media (Optional) */}
        <div className="profile-section">
          <h3 className="section-title">Social Media (Optional)</h3>
          <div className="grid-2">
            <input name="twitter" placeholder="Twitter" value={profile.twitter} onChange={handleChange} />
            <input name="instagram" placeholder="Instagram" value={profile.instagram} onChange={handleChange} />
            <input name="facebook" placeholder="Facebook" value={profile.facebook} onChange={handleChange} />
            <input name="github" placeholder="GitHub" value={profile.github} onChange={handleChange} />
          </div>
        </div>

        {/* Skills / Interests (Optional) */}
        <div className="profile-section">
          <h3 className="section-title">Skills & Interests (Optional)</h3>
          <div className="grid-2">
            <input name="skills" placeholder="Skills" value={profile.skills} onChange={handleChange} />
            <input name="languages" placeholder="Languages" value={profile.languages} onChange={handleChange} />
            <input name="interests" placeholder="Interests" value={profile.interests} onChange={handleChange} />
          </div>
        </div>

        {/* About & Bio (Optional) */}
        <div className="profile-section">
          <h3 className="section-title">About Me & Bio (Optional)</h3>
          <textarea name="aboutMe" placeholder="Tell us about yourself" value={profile.aboutMe} onChange={handleChange} />
          <textarea name="bio" placeholder="Professional Bio" value={profile.bio} onChange={handleChange} />
        </div>

        <div className="actions">
          <Button onClick={() => navigate("/home")} className="btn-secondary">Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    birthday: "",
    address: "",
    city: "",
    country: "",
    jobTitle: "",
    company: "",
    linkedIn: "",
    website: "",
    skills: "",
    interests: "",
    bio: "",
    profilePicture: "",
    portfolio: "",
    twitter: "",
    facebook: "",
    instagram: "",
    github: "",
    languages: "",
    aboutMe: "",
    resume: "",
  });

  useEffect(() => {
    const fetchUserAndCheckProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      setProfile((prev) => ({
        ...prev,
        email: user.email,
      }));

      const { data: userData, error } = await supabase
        .from("users")
        .select("profile_completed")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking profile:", error.message);
        return;
      }

      if (userData?.profile_completed) {
        navigate("/home");
      }
    };

    fetchUserAndCheckProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({
          ...prev,
          profilePicture: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    const { fullName, jobTitle, company, skills, interests } = profile;
    const generatedBio = `👋 Hi, I'm ${fullName}, a passionate ${jobTitle} at ${company}. I specialize in ${skills}. Outside of work, I enjoy ${interests}. I'm driven by innovation, collaboration, and a love for learning.`;
    setTimeout(() => {
      setProfile((prev) => ({ ...prev, bio: generatedBio }));
      setGeneratingBio(false);
    }, 1500);
  };

  const handleSave = async () => {
    if (!profile.fullName || !profile.email || !profile.phone) {
      alert("Please fill in all the required fields.");
      return;
    }

    setSaving(true);
    setLoading(true);

    try {
      const uid = user?.id;
      if (!uid) throw new Error("User not authenticated.");

      let profilePictureUrl = profile.profilePicture;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `profile_${uid}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, imageFile, { upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase
          .storage
          .from("profile-pictures")
          .getPublicUrl(fileName);

        profilePictureUrl = urlData?.publicUrl;
      }

      await supabase
        .from("users")
        .update({
          ...profile,
          profilePicture: profilePictureUrl,
          profile_completed: true,
        })
        .eq("id", uid);

      navigate("/home");
    } catch (error) {
      alert("Error saving profile: " + error.message);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  const requiredStyle = "text-red-500 text-sm ml-1";

  const Input = ({ label, name, required = false, type = "text" }) => (
    <div>
      <label className="block font-medium text-gray-700">
        {label}
        {required && <span className={requiredStyle}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={profile[name]}
        onChange={handleChange}
        className="mt-1 p-3 w-full border rounded-md"
        required={required}
      />
    </div>
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">OmniFlow Profile</h2>

        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
            <img
              src={profile.profilePicture || "/placeholder-profile.png"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="ml-4 p-2 text-gray-700"
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Full Name" name="fullName" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Phone Number" name="phone" type="tel" required />
            <Input label="Gender" name="gender" />
            <Input label="Birthday" name="birthday" type="date" />
            <Input label="Address" name="address" />
            <Input label="City" name="city" />
            <Input label="Country" name="country" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Job Title" name="jobTitle" />
            <Input label="Company" name="company" />
            <Input label="LinkedIn" name="linkedIn" />
            <Input label="Website" name="website" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Twitter" name="twitter" />
            <Input label="Instagram" name="instagram" />
            <Input label="Facebook" name="facebook" />
            <Input label="GitHub" name="github" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">Skills & Interests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Skills" name="skills" />
            <Input label="Languages" name="languages" />
            <Input label="Interests" name="interests" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">About Me & Bio</h3>
          <textarea
            name="aboutMe"
            value={profile.aboutMe}
            onChange={handleChange}
            className="mt-1 p-3 w-full border rounded-md"
            placeholder="Tell us something about yourself"
          />
          <div className="relative">
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              className="mt-1 p-3 w-full border rounded-md"
              placeholder="Professional Bio"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {generatingBio ? "Generating..." : "Generate Bio with AI"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700">Portfolio & Resume</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Portfolio URL" name="portfolio" />
            <Input label="Resume URL" name="resume" />
          </div>
        </div>

        <div className="pt-6 flex justify-end space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate("/home")}
            className="bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving || loading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

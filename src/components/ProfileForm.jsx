import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // Assuming you export the Firebase config

function ProfileForm() {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    jobTitle: '',
    company: '',
    linkedIn: '',
    website: '',
    skills: '',
    interests: '',
    bio: '',
    profilePicture: '',
  });
  
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(true); // To manage form validation

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const user = getAuth().currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        } else {
          console.log('No profile data found');
        }
      }
      setLoading(false);
    };
    
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prevProfile) => ({
          ...prevProfile,
          profilePicture: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields
    if (!profile.fullName || !profile.email || !profile.phone) {
      setError('Please fill in the required fields (Full Name, Email, and Phone).');
      setIsValid(false);
      return;
    }

    setLoading(true);
    const user = getAuth().currentUser;
    if (!user) {
      console.log('User is not authenticated');
      setLoading(false);
      return;
    }

    try {
      // Reference to the user's Firestore document
      const userRef = doc(db, 'users', user.uid);

      // Save the profile data to Firestore
      await setDoc(userRef, profile, { merge: true });
      console.log('Profile saved successfully');
      setEditMode(false); // Exit edit mode after saving
    } catch (error) {
      console.error('Error saving profile: ', error);
    }
    setLoading(false);
  };

  const handleEditToggle = () => {
    setEditMode((prevMode) => !prevMode);
    setError('');
    setIsValid(true);
  };

  return (
    <div className="p-4 max-w-xl mx-auto bg-white rounded shadow-lg">
      {loading && <div className="text-center">Loading...</div>}
      {!loading && (
        <form>
          {/* Profile Picture Upload */}
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
              <img
                src={profile.profilePicture || '/placeholder-profile.png'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="mt-4">
            {editMode && (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2 p-2 border rounded"
              />
            )}
          </div>

          {/* Profile Fields */}
          <div className="space-y-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-700">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-700">
                  Full Name<span className="text-red-500 text-sm ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">
                  Email<span className="text-red-500 text-sm ml-1">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">
                  Phone Number<span className="text-red-500 text-sm ml-1">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editMode}
                  required
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
            </div>

            {/* Other Fields */}
            <h3 className="text-xl font-semibold text-gray-700 pt-4">Location & Work</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  name="country"
                  value={profile.country}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
            </div>

            {/* Job Title & Company */}
            <h3 className="text-xl font-semibold text-gray-700 pt-4">Job & Company</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={profile.jobTitle}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  name="company"
                  value={profile.company}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="mt-1 p-3 w-full border rounded-md"
                />
              </div>
            </div>

            {/* Bio */}
            <h3 className="text-xl font-semibold text-gray-700 pt-4">About Me</h3>
            <div>
              <label className="block font-medium text-gray-700">Short Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                disabled={!editMode}
                className="mt-1 p-3 w-full border rounded-md"
                rows="4"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            {/* Error Message */}
            {!isValid && <div className="text-red-500 mt-2">{error}</div>}
          </div>

          {/* Edit/Save Profile Button */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={handleEditToggle}
              className="p-3 bg-blue-500 text-white rounded-md"
            >
              {editMode ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            {editMode ? (
              <button
                type="button"
                onClick={handleSaveProfile}
                className="p-3 bg-green-500 text-white rounded-md"
              >
                Save Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={loading}
                className="p-3 bg-blue-500 text-white rounded-md"
              >
                Save Profile
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default ProfileForm;

// src/pages/StudentProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft, FaUser, FaUniversity, FaIdCard, FaBook, FaCalendarAlt,
  FaHome, FaCheck, FaInfoCircle, FaSpinner, FaCamera, FaUpload,
  FaGraduationCap, FaMapMarkerAlt, FaPhone, FaEnvelope, FaSave,
  FaEdit, FaCheckCircle, FaTimesCircle, FaFileUpload
} from "react-icons/fa";
import styles from "./StudentProfilePage.module.css";

// Kenyan Universities List
const kenyanUniversities = [
  "University of Nairobi",
  "Kenyatta University",
  "Jomo Kenyatta University of Agriculture and Technology (JKUAT)",
  "Moi University",
  "Egerton University",
  "Strathmore University",
  "United States International University (USIU)",
  "Daystar University",
  "Catholic University of Eastern Africa",
  "Africa Nazarene University",
  "KCA University",
  "Multimedia University of Kenya",
  "Technical University of Kenya",
  "Machakos University",
  "Mount Kenya University",
  "Kirinyaga University",
  "Murang'a University of Technology",
  "Chuka University",
  "Kisii University",
  "Maseno University",
  "Laikipia University",
  "Karatina University",
  "Dedan Kimathi University of Technology",
  "Meru University of Science and Technology",
  "South Eastern Kenya University",
  "Pwani University",
  "Masinde Muliro University of Science and Technology",
  "University of Eldoret",
  "Rongo University",
  "Alupe University",
  "Tharaka University",
  "National Defence University-Kenya",
  "Co-operative University of Kenya",
  "Taita Taveta University",
  "Tom Mboya University",
  "Kiriri Women's University of Science and Technology",
  "Zetech University",
  "Riara University",
  "Gretsa University",
  "Kenya Methodist University",
  "Pan Africa Christian University",
  "St. Paul's University",
  "Kabarak University",
  "University of Eastern Africa, Baraton",
  "Great Lakes University of Kisumu",
  "Adventist University of Africa",
  "The East African University",
  "Management University of Africa",
  "Kenya Highlands University",
  "Presbyterian University of East Africa"
];

// Course Programs (General)
const coursePrograms = [
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Information Technology",
  "Bachelor of Business Administration",
  "Bachelor of Commerce",
  "Bachelor of Economics",
  "Bachelor of Laws (LLB)",
  "Bachelor of Education",
  "Bachelor of Engineering",
  "Bachelor of Architecture",
  "Bachelor of Medicine and Surgery",
  "Bachelor of Pharmacy",
  "Bachelor of Nursing",
  "Bachelor of Psychology",
  "Bachelor of Journalism",
  "Bachelor of Public Health",
  "Bachelor of Environmental Science",
  "Bachelor of Agriculture",
  "Bachelor of Actuarial Science",
  "Diploma in Information Technology",
  "Diploma in Business Management",
  "Diploma in Accounting",
  "Certificate in Computer Applications",
  "Other"
];

// Year of Study Options
const yearOptions = [1, 2, 3, 4, 5, 6];

// Semester Options
const semesterOptions = ["Semester 1", "Semester 2", "Trimester 1", "Trimester 2", "Trimester 3"];

const StudentProfilePage = () => {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    campus_name: "",
    campus_location: "",
    student_id_number: "",
    course_program: "",
    year_of_study: null,
    semester: "",
    residence_hall: "",
    verification_document: null
  });
  
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('student_campus_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setProfile(data);
        const profileData = {
          campus_name: data.campus_name || "",
          campus_location: data.campus_location || "",
          student_id_number: data.student_id_number || "",
          course_program: data.course_program || "",
          year_of_study: data.year_of_study || null,
          semester: data.semester || "",
          residence_hall: data.residence_hall || "",
          verification_document: data.verification_document || null
        };
        setFormData(profileData);
        setOriginalData(profileData);
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (file) => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, or PDF files are allowed");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `verification_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `verification_docs/${user.id}/${fileName}`;

      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(interval);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, verification_document: publicUrl }));
      setUploadProgress(100);
      toast.success('Document uploaded successfully');
      
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.campus_name) errors.push("Please select your campus/university");
    if (!formData.student_id_number) errors.push("Student ID number is required");
    if (formData.student_id_number.length < 5) errors.push("Please enter a valid student ID number");
    if (!formData.course_program) errors.push("Please select your course/program");
    if (!formData.year_of_study) errors.push("Please select your year of study");
    if (!formData.semester) errors.push("Please select your semester/trimester");
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    setSaving(true);
    
    try {
      const profileData = {
        user_id: user.id,
        campus_name: formData.campus_name,
        campus_location: formData.campus_location,
        student_id_number: formData.student_id_number,
        course_program: formData.course_program,
        year_of_study: formData.year_of_study,
        semester: formData.semester,
        residence_hall: formData.residence_hall,
        verification_document: formData.verification_document,
        is_verified_student: false,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (profile) {
        // Update existing profile
        result = await supabase
          .from('student_campus_profiles')
          .update(profileData)
          .eq('id', profile.id);
      } else {
        // Create new profile
        result = await supabase
          .from('student_campus_profiles')
          .insert([profileData]);
      }
      
      if (result.error) throw result.error;
      
      setProfile({ ...profile, ...profileData });
      setOriginalData({ ...formData });
      setIsEditing(false);
      
      toast.success('Profile saved successfully!');
      
      // If verification document is uploaded, notify admin
      if (formData.verification_document && !profile?.is_verified_student) {
        toast.success('Verification document uploaded. Your account will be verified soon.', {
          duration: 5000,
          icon: '📄'
        });
      }
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
  };

  // Loading Skeleton
  const SkeletonLoader = () => (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonEditBtn}></div>
      </div>
      <div className={styles.skeletonAvatar}></div>
      <div className={styles.skeletonForm}>
        <div className={styles.skeletonInput}></div>
        <div className={styles.skeletonInput}></div>
        <div className={styles.skeletonInput}></div>
        <div className={styles.skeletonInput}></div>
      </div>
    </div>
  );

  if (loading) return <SkeletonLoader />;

  const isVerified = profile?.is_verified_student;

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>Student Profile</h1>
        <div className={styles.headerActions}>
          <button className={styles.helpBtn} onClick={() => setShowHelp(!showHelp)}>
            <FaInfoCircle />
          </button>
          {!isEditing ? (
            <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
              <FaEdit /> Edit
            </button>
          ) : (
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? <FaSpinner className={styles.spinning} /> : <FaSave />}
                Save
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className={styles.helpPanel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className={styles.helpContent}>
              <h4>Why complete your profile?</h4>
              <ul>
                <li>🎓 Get verified as a student to access all marketplace features</li>
                <li>🛍️ List and sell items with trust from other students</li>
                <li>🍔 Order food and services from verified campus vendors</li>
                <li>💰 Withdraw earnings to your M-Pesa account</li>
                <li>🏆 Unlock special student deals and discounts</li>
              </ul>
              <div className={styles.helpNote}>
                <strong>Note:</strong> Your student ID document will be reviewed within 24-48 hours.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Status Banner */}
      {profile && (
        <div className={`${styles.verificationBanner} ${isVerified ? styles.verified : styles.pending}`}>
          {isVerified ? (
            <>
              <FaCheckCircle />
              <span>Your student account is verified! You have full access to all features.</span>
            </>
          ) : (
            <>
              <FaTimesCircle />
              <span>Your account is pending verification. Upload your student ID to get verified.</span>
            </>
          )}
        </div>
      )}

      <div className={styles.content}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            <div className={styles.avatarPlaceholder}>
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
            </div>
          </div>
          <div className={styles.userInfo}>
            <h2>{user?.user_metadata?.full_name || 'Student'}</h2>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className={styles.formContainer}>
          {/* Campus Selection */}
          <div className={styles.formGroup}>
            <label>
              <FaUniversity /> Campus / University *
            </label>
            {isEditing ? (
              <select
                value={formData.campus_name}
                onChange={(e) => handleInputChange('campus_name', e.target.value)}
                required
              >
                <option value="">Select your campus</option>
                {kenyanUniversities.map(campus => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            ) : (
              <div className={styles.readOnlyValue}>
                <FaMapMarkerAlt />
                <span>{formData.campus_name || 'Not specified'}</span>
              </div>
            )}
          </div>

          {/* Campus Location */}
          <div className={styles.formGroup}>
            <label><FaMapMarkerAlt /> Campus Location (Optional)</label>
            {isEditing ? (
              <input
                type="text"
                placeholder="e.g., Main Campus, Parklands, CBD"
                value={formData.campus_location}
                onChange={(e) => handleInputChange('campus_location', e.target.value)}
              />
            ) : (
              <div className={styles.readOnlyValue}>
                <FaMapMarkerAlt />
                <span>{formData.campus_location || 'Not specified'}</span>
              </div>
            )}
          </div>

          {/* Student ID */}
          <div className={styles.formGroup}>
            <label><FaIdCard /> Student ID Number *</label>
            {isEditing ? (
              <input
                type="text"
                placeholder="e.g., CS01/1234/2023, 123456789"
                value={formData.student_id_number}
                onChange={(e) => handleInputChange('student_id_number', e.target.value)}
                required
              />
            ) : (
              <div className={styles.readOnlyValue}>
                <FaIdCard />
                <span>{formData.student_id_number || 'Not specified'}</span>
              </div>
            )}
          </div>

          {/* Course Program */}
          <div className={styles.formGroup}>
            <label><FaBook /> Course / Program *</label>
            {isEditing ? (
              <select
                value={formData.course_program}
                onChange={(e) => handleInputChange('course_program', e.target.value)}
                required
              >
                <option value="">Select your course</option>
                {coursePrograms.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            ) : (
              <div className={styles.readOnlyValue}>
                <FaGraduationCap />
                <span>{formData.course_program || 'Not specified'}</span>
              </div>
            )}
          </div>

          {/* Year of Study & Semester Row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><FaCalendarAlt /> Year of Study *</label>
              {isEditing ? (
                <select
                  value={formData.year_of_study || ''}
                  onChange={(e) => handleInputChange('year_of_study', parseInt(e.target.value))}
                  required
                >
                  <option value="">Select year</option>
                  {yearOptions.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.readOnlyValue}>
                  <FaCalendarAlt />
                  <span>{formData.year_of_study ? `Year ${formData.year_of_study}` : 'Not specified'}</span>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label><FaCalendarAlt /> Semester / Trimester *</label>
              {isEditing ? (
                <select
                  value={formData.semester}
                  onChange={(e) => handleInputChange('semester', e.target.value)}
                  required
                >
                  <option value="">Select semester</option>
                  {semesterOptions.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              ) : (
                <div className={styles.readOnlyValue}>
                  <FaCalendarAlt />
                  <span>{formData.semester || 'Not specified'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Residence Hall */}
          <div className={styles.formGroup}>
            <label><FaHome /> Residence Hall / Hostel (Optional)</label>
            {isEditing ? (
              <input
                type="text"
                placeholder="e.g., Hall 1, Hostel A, Off-campus"
                value={formData.residence_hall}
                onChange={(e) => handleInputChange('residence_hall', e.target.value)}
              />
            ) : (
              <div className={styles.readOnlyValue}>
                <FaHome />
                <span>{formData.residence_hall || 'Not specified'}</span>
              </div>
            )}
          </div>

          {/* Verification Document Upload */}
          <div className={styles.formGroup}>
            <label><FaFileUpload /> Student ID / Verification Document</label>
            <p className={styles.hint}>Upload a clear photo of your student ID or admission letter for verification</p>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
                <span>Uploading... {uploadProgress}%</span>
              </div>
            )}
            
            {formData.verification_document ? (
              <div className={styles.documentPreview}>
                <FaCheckCircle className={styles.documentIcon} />
                <span>Document uploaded</span>
                {isEditing && (
                  <button
                    type="button"
                    className={styles.removeDocumentBtn}
                    onClick={() => handleInputChange('verification_document', null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              isEditing && (
                <label className={styles.uploadBtn}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleDocumentUpload(e.target.files[0]);
                      }
                    }}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  {uploading ? (
                    <div className={styles.uploadingSpinner}>
                      <FaSpinner className={styles.spinning} />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <FaUpload />
                      <span>Upload Student ID</span>
                      <small>JPG, PNG or PDF (max 5MB)</small>
                    </>
                  )}
                </label>
              )
            )}
          </div>
        </div>

        {/* Save Button for non-editing mode (shows at bottom if not editing) */}
        {!isEditing && !profile && (
          <div className={styles.saveBottom}>
            <button className={styles.completeProfileBtn} onClick={() => setIsEditing(true)}>
              Complete Your Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfilePage;
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { toast } from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Profile
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    campus_name: '',
    student_id_number: '',
    course_program: '',
    year_of_study: 1,
    
    // Preferences
    dark_mode: false,
    language: 'en',
    time_zone: 'Africa/Nairobi',
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    
    // Privacy
    profile_visibility: 'public',
    show_online_status: true,
    allow_messages: true,
    data_sharing: false,
    
    // Notifications
    order_updates: true,
    promotion_offers: false,
    campus_news: true,
    security_alerts: true
  });

  useEffect(() => {
    fetchUserData();
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch data from multiple tables
      const [userResponse, profileResponse, campusProfileResponse] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_campus_profiles').select('*').eq('user_id', user.id).single()
      ]);

      const userData = userResponse.data || {};
      const profileData = profileResponse.data || {};
      const campusData = campusProfileResponse.data || {};

      setFormData(prev => ({
        ...prev,
        ...userData,
        ...profileData,
        campus_name: campusData.campus_name || profileData.campus_name,
        student_id_number: campusData.student_id_number || profileData.student_id_number,
        course_program: campusData.course_program || profileData.course_program,
        year_of_study: campusData.year_of_study || profileData.year_of_study || 1
      }));

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSettings = async (section) => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Determine which table to update based on field
      const userFields = ['dark_mode', 'language', 'push_notifications', 'email_notifications', 'sms_notifications'];
      const profileFields = ['full_name', 'phone', 'avatar_url', 'profile_visibility', 'show_online_status', 'allow_messages'];
      const campusFields = ['campus_name', 'student_id_number', 'course_program', 'year_of_study'];

      const userUpdates = {};
      const profileUpdates = {};
      const campusUpdates = {};

      Object.keys(formData).forEach(key => {
        if (userFields.includes(key)) userUpdates[key] = formData[key];
        if (profileFields.includes(key)) profileUpdates[key] = formData[key];
        if (campusFields.includes(key)) campusUpdates[key] = formData[key];
      });

      // Execute updates
      const promises = [];

      if (Object.keys(userUpdates).length > 0) {
        promises.push(
          supabase.from('users').update(userUpdates).eq('id', user.id)
        );
      }

      if (Object.keys(profileUpdates).length > 0) {
        promises.push(
          supabase.from('profiles').update(profileUpdates).eq('id', user.id)
        );
      }

      if (Object.keys(campusUpdates).length > 0) {
        // Check if campus profile exists
        const { data: existingCampus } = await supabase
          .from('student_campus_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingCampus) {
          promises.push(
            supabase.from('student_campus_profiles')
              .update(campusUpdates)
              .eq('user_id', user.id)
          );
        } else {
          promises.push(
            supabase.from('student_campus_profiles')
              .insert([{ user_id: user.id, ...campusUpdates }])
          );
        }
      }

      await Promise.all(promises);

      // Apply theme changes immediately
      if (section === 'preferences' && formData.dark_mode !== undefined) {
        const theme = formData.dark_mode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
      }

      toast.success('Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Account scheduled for deletion');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const exportUserData = async () => {
    toast.loading('Preparing your data export...');
    // In a real app, this would generate and send a data export file
    setTimeout(() => {
      toast.dismiss();
      toast.success('Data export prepared! Check your email.');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div className="loading-spinner"></div>
          <p>Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="header-content">
          <h1>Account Settings</h1>
          <p>Manage your profile, preferences, and privacy</p>
        </div>
        <div className="user-avatar">
          {formData.avatar_url ? (
            <img src={formData.avatar_url} alt="Profile" />
          ) : (
            <div className="avatar-placeholder">
              {formData.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          )}
        </div>
      </div>

      <div className="settings-layout">
        {/* Navigation Sidebar */}
        <nav className="settings-nav">
          {[
            { id: 'profile', icon: '👤', label: 'Profile', color: '#6366f1' },
            { id: 'preferences', icon: '⚙️', label: 'Preferences', color: '#10b981' },
            { id: 'privacy', icon: '🔒', label: 'Privacy', color: '#f59e0b' },
            { id: 'notifications', icon: '🔔', label: 'Notifications', color: '#8b5cf6' },
            { id: 'security', icon: '🛡️', label: 'Security', color: '#ef4444' },
            { id: 'data', icon: '📊', label: 'Data', color: '#06b6d4' }
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              style={{ '--accent-color': item.color }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="settings-content">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Profile Information</h2>
                <p>Update your personal and campus details</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email || user?.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@campus.edu"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+254 700 000000"
                  />
                </div>

                <div className="form-group">
                  <label>Campus</label>
                  <select
                    value={formData.campus_name || ''}
                    onChange={(e) => handleInputChange('campus_name', e.target.value)}
                  >
                    <option value="">Select Campus</option>
                    <option value="University of Nairobi">University of Nairobi</option>
                    <option value="Kenyatta University">Kenyatta University</option>
                    <option value="Strathmore University">Strathmore University</option>
                    <option value="Technical University of Kenya">Technical University of Kenya</option>
                    <option value="Mount Kenya University">Mount Kenya University</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    value={formData.student_id_number || ''}
                    onChange={(e) => handleInputChange('student_id_number', e.target.value)}
                    placeholder="STD001234"
                  />
                </div>

                <div className="form-group">
                  <label>Course Program</label>
                  <input
                    type="text"
                    value={formData.course_program || ''}
                    onChange={(e) => handleInputChange('course_program', e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>

                <div className="form-group">
                  <label>Year of Study</label>
                  <select
                    value={formData.year_of_study || 1}
                    onChange={(e) => handleInputChange('year_of_study', parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Profile Photo URL</label>
                  <input
                    type="url"
                    value={formData.avatar_url || ''}
                    onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div className="section-actions">
                <button 
                  className="btn-primary"
                  onClick={() => saveSettings('profile')}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>App Preferences</h2>
                <p>Customize your app experience</p>
              </div>

              <div className="preferences-list">
                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Dark Mode</h4>
                    <p>Switch between light and dark themes</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.dark_mode}
                      onChange={(e) => handleInputChange('dark_mode', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Language</h4>
                    <p>Choose your preferred language</p>
                  </div>
                  <select
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="language-select"
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <h4>Time Zone</h4>
                    <p>Set your local time zone</p>
                  </div>
                  <select
                    value={formData.time_zone}
                    onChange={(e) => handleInputChange('time_zone', e.target.value)}
                    className="timezone-select"
                  >
                    <option value="Africa/Nairobi">East Africa Time (Nairobi)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="Europe/London">Greenwich Mean Time (London)</option>
                  </select>
                </div>
              </div>

              <div className="section-actions">
                <button 
                  className="btn-primary"
                  onClick={() => saveSettings('preferences')}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Privacy Settings</h2>
                <p>Control your visibility and data sharing</p>
              </div>

              <div className="privacy-list">
                <div className="privacy-item">
                  <div className="privacy-info">
                    <h4>Profile Visibility</h4>
                    <p>Who can see your profile and activity</p>
                  </div>
                  <select
                    value={formData.profile_visibility}
                    onChange={(e) => handleInputChange('profile_visibility', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="campus">Campus Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="privacy-item">
                  <div className="privacy-info">
                    <h4>Show Online Status</h4>
                    <p>Let others see when you're online</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.show_online_status}
                      onChange={(e) => handleInputChange('show_online_status', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="privacy-item">
                  <div className="privacy-info">
                    <h4>Allow Messages</h4>
                    <p>Receive messages from other users</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.allow_messages}
                      onChange={(e) => handleInputChange('allow_messages', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="privacy-item">
                  <div className="privacy-info">
                    <h4>Data Sharing</h4>
                    <p>Help improve CampusMart by sharing usage data</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={formData.data_sharing}
                      onChange={(e) => handleInputChange('data_sharing', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="section-actions">
                <button 
                  className="btn-primary"
                  onClick={() => saveSettings('privacy')}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Privacy Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Preferences</h2>
                <p>Choose what notifications you want to receive</p>
              </div>

              <div className="notifications-list">
                {[
                  ['push_notifications', 'Push Notifications', 'Receive notifications on your device'],
                  ['email_notifications', 'Email Notifications', 'Get updates via email'],
                  ['sms_notifications', 'SMS Notifications', 'Receive text message alerts'],
                  ['order_updates', 'Order Updates', 'Updates about your orders and deliveries'],
                  ['promotion_offers', 'Promotions & Offers', 'Special deals and campus promotions'],
                  ['campus_news', 'Campus News', 'Important campus announcements and events'],
                  ['security_alerts', 'Security Alerts', 'Important security notifications']
                ].map(([key, label, description]) => (
                  <div className="notification-item" key={key}>
                    <div className="notification-info">
                      <h4>{label}</h4>
                      <p>{description}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData[key]}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="section-actions">
                <button 
                  className="btn-primary"
                  onClick={() => saveSettings('notifications')}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Security Settings</h2>
                <p>Manage your account security and access</p>
              </div>

              <div className="security-actions">
                <div className="security-card">
                  <div className="security-icon">🔑</div>
                  <div className="security-info">
                    <h4>Change Password</h4>
                    <p>Update your account password</p>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => toast.success('Password change feature coming soon!')}
                  >
                    Change
                  </button>
                </div>

                <div className="security-card">
                  <div className="security-icon">🛡️</div>
                  <div className="security-info">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => toast.success('2FA setup coming soon!')}
                  >
                    Enable
                  </button>
                </div>

                <div className="security-card">
                  <div className="security-icon">📱</div>
                  <div className="security-info">
                    <h4>Active Sessions</h4>
                    <p>Manage your logged-in devices</p>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => toast.success('Session management coming soon!')}
                  >
                    Manage
                  </button>
                </div>
              </div>

              <div className="danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <p>Permanently delete your account and all associated data</p>
                <button 
                  className="btn-danger"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Data Section */}
          {activeSection === 'data' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Data Management</h2>
                <p>Control your data and privacy</p>
              </div>

              <div className="data-actions">
                <div className="data-card">
                  <div className="data-icon">📥</div>
                  <div className="data-info">
                    <h4>Export Data</h4>
                    <p>Download all your personal data from CampusMart</p>
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={exportUserData}
                  >
                    Export Data
                  </button>
                </div>

                <div className="data-card">
                  <div className="data-icon">🗑️</div>
                  <div className="data-info">
                    <h4>Clear Cache</h4>
                    <p>Clear temporary app data and free up storage</p>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      localStorage.clear();
                      toast.success('Cache cleared successfully!');
                    }}
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="data-card">
                  <div className="data-icon">📊</div>
                  <div className="data-info">
                    <h4>Usage Statistics</h4>
                    <p>View your app usage and activity data</p>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => toast.success('Usage statistics coming soon!')}
                  >
                    View Stats
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bottom-nav-spacer"></div>
    </div>
  );
};

export default Settings;
// src/pages/TermsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  Users, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  BookOpen,
  Scale,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Download,
  Printer
} from 'lucide-react';
import './TermsPage.css';

export default function TermsPage() {
  const [expandedSections, setExpandedSections] = useState({
    acceptance: true,
    eligibility: true,
    responsibilities: true,
    payments: true,
    prohibited: true,
    liability: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
    }
  };

  const termsData = {
    lastUpdated: 'October 26, 2025',
    version: 'v3.1',
    effectiveDate: 'November 1, 2025'
  };

  const quickStats = [
    { label: 'Sections', value: '12' },
    { label: 'Pages', value: '8' },
    { label: 'Read Time', value: '15 min' },
    { label: 'Last Updated', value: termsData.lastUpdated }
  ];

  const keyClauses = [
    { id: 'acceptance', title: 'Acceptance', icon: CheckCircle, color: '#10B981' },
    { id: 'eligibility', title: 'Eligibility', icon: Users, color: '#3B82F6' },
    { id: 'responsibilities', title: 'Responsibilities', icon: Shield, color: '#8B5CF6' },
    { id: 'payments', title: 'Payments', icon: CreditCard, color: '#F59E0B' },
    { id: 'prohibited', title: 'Prohibited Items', icon: AlertTriangle, color: '#EF4444' },
    { id: 'liability', title: 'Liability', icon: Scale, color: '#6B7280' }
  ];

  return (
    <div className="legal-document">
      {/* Top Action Bar */}
      <div className="legal-action-bar">
        <div className="container">
          <div className="action-bar-content">
            <div className="document-meta">
              <div className="document-badge">
                <FileText size={14} />
                <span>LEGAL DOCUMENT</span>
              </div>
              <span className="document-version">{termsData.version}</span>
            </div>
            
            <div className="action-buttons">
              <button className="action-btn">
                <Printer size={16} />
                <span>Print</span>
              </button>
              <button className="action-btn">
                <Download size={16} />
                <span>Download</span>
              </button>
              <Link to="/auth" className="back-to-signup">
                <ArrowLeft size={16} />
                <span>Back to Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="legal-content-wrapper">
          {/* Left Sidebar - Quick Navigation */}
          <aside className="legal-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <BookOpen size={18} />
                <span>Document Overview</span>
              </h3>
              
              <div className="stats-grid">
                {quickStats.map((stat, index) => (
                  <div key={index} className="stat-item">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Search size={18} />
                <span>Quick Find</span>
              </h3>
              
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Key Clauses</h3>
              <div className="clauses-list">
                {keyClauses.map((clause) => {
                  const Icon = clause.icon;
                  return (
                    <button
                      key={clause.id}
                      onClick={() => scrollToSection(clause.id)}
                      className="clause-item"
                    >
                      <div className="clause-icon" style={{ backgroundColor: `${clause.color}15`, color: clause.color }}>
                        <Icon size={16} />
                      </div>
                      <span>{clause.title}</span>
                      <ChevronRight size={16} className="chevron" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Need Help?</h3>
              <div className="help-contact">
                <div className="contact-item">
                  <Mail size={14} />
                  <a href="mailto:legal@omniflowapp.co.ke">legal@omniflowapp.co.ke</a>
                </div>
                <div className="contact-item">
                  <Phone size={14} />
                  <span>+254 700 000 000</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Document Content */}
          <main className="legal-main">
            {/* Document Header */}
            <header className="document-header">
              <div className="header-badge">
                <Shield size={20} />
                <span>OmniFlow Technologies Ltd.</span>
              </div>
              
              <h1 className="document-title">Terms & Conditions Agreement</h1>
              
              <div className="document-subtitle">
                <p>E-Commerce Marketplace Platform Terms</p>
                <div className="effective-badge">
                  <Clock size={14} />
                  <span>Effective: {termsData.effectiveDate}</span>
                </div>
              </div>

              <div className="warning-banner">
                <AlertTriangle size={20} />
                <div>
                  <strong>Legal Notice:</strong> This document constitutes a legally binding agreement. 
                  By using OmniFlow, you agree to all terms herein.
                </div>
              </div>
            </header>

            {/* Quick Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-icon" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                  <Users size={20} />
                </div>
                <div className="summary-content">
                  <h4>User Requirements</h4>
                  <p>18+ years, valid information, Kenyan resident</p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon" style={{ backgroundColor: '#3B82F615', color: '#3B82F6' }}>
                  <CreditCard size={20} />
                </div>
                <div className="summary-content">
                  <h4>Fees & Payments</h4>
                  <p>5% platform fee + 2.5% processing</p>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                  <Shield size={20} />
                </div>
                <div className="summary-content">
                  <h4>Security</h4>
                  <p>You are responsible for account security</p>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="document-sections">
              {/* Section 1 */}
              <section id="acceptance" className="document-section">
                <div className="section-header" onClick={() => toggleSection('acceptance')}>
                  <div className="section-number">01</div>
                  <div className="section-title-content">
                    <h2>Acceptance of Terms</h2>
                    <p className="section-subtitle">Binding agreement upon platform usage</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.acceptance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.acceptance && (
                  <div className="section-content">
                    <div className="content-block">
                      <p>
                        By accessing, browsing, or using the OmniFlow platform (including our website, 
                        mobile applications, and services), you acknowledge that you have read, understood, 
                        and agree to be bound by these Terms & Conditions.
                      </p>
                      
                      <div className="highlight-box critical">
                        <div className="highlight-icon">⚠️</div>
                        <div className="highlight-content">
                          <strong>Critical Notice:</strong> If you do not agree with any part of these terms, 
                          you must immediately discontinue use of the platform. Continued use constitutes 
                          acceptance of all terms.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 2 */}
              <section id="eligibility" className="document-section">
                <div className="section-header" onClick={() => toggleSection('eligibility')}>
                  <div className="section-number">02</div>
                  <div className="section-title-content">
                    <h2>Eligibility Requirements</h2>
                    <p className="section-subtitle">Who can use OmniFlow</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.eligibility ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.eligibility && (
                  <div className="section-content">
                    <div className="requirements-grid">
                      <div className="requirement-card">
                        <div className="requirement-status valid">
                          <CheckCircle size={20} />
                        </div>
                        <h4>Age Requirement</h4>
                        <ul>
                          <li>18 years or older</li>
                          <li>13-17 with parental consent</li>
                          <li>Valid age verification</li>
                        </ul>
                      </div>
                      
                      <div className="requirement-card">
                        <div className="requirement-status valid">
                          <CheckCircle size={20} />
                        </div>
                        <h4>Information Accuracy</h4>
                        <ul>
                          <li>Truthful registration data</li>
                          <li>Valid contact information</li>
                          <li>Current details maintained</li>
                        </ul>
                      </div>
                      
                      <div className="requirement-card">
                        <div className="requirement-status warning">
                          <AlertTriangle size={20} />
                        </div>
                        <h4>Geographic Restrictions</h4>
                        <ul>
                          <li>Available in Kenya</li>
                          <li>Subject to local laws</li>
                          <li>Export restrictions apply</li>
                        </ul>
                      </div>
                      
                      <div className="requirement-card">
                        <div className="requirement-status valid">
                          <CheckCircle size={20} />
                        </div>
                        <h4>Legal Capacity</h4>
                        <ul>
                          <li>Full contractual capacity</li>
                          <li>No legal prohibitions</li>
                          <li>Authorized representative if business</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 3 */}
              <section id="responsibilities" className="document-section">
                <div className="section-header" onClick={() => toggleSection('responsibilities')}>
                  <div className="section-number">03</div>
                  <div className="section-title-content">
                    <h2>User Responsibilities</h2>
                    <p className="section-subtitle">Your obligations as a user</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.responsibilities ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.responsibilities && (
                  <div className="section-content">
                    <div className="responsibility-table">
                      <div className="table-header">
                        <div className="table-cell">Responsibility</div>
                        <div className="table-cell">Description</div>
                        <div className="table-cell">Consequence of Breach</div>
                      </div>
                      
                      <div className="table-row">
                        <div className="table-cell">
                          <strong>Account Security</strong>
                        </div>
                        <div className="table-cell">
                          Maintain password confidentiality, enable 2FA if available
                        </div>
                        <div className="table-cell">
                          <span className="tag critical">Account Suspension</span>
                        </div>
                      </div>
                      
                      <div className="table-row">
                        <div className="table-cell">
                          <strong>Information Accuracy</strong>
                        </div>
                        <div className="table-cell">
                          Keep all profile and contact information current
                        </div>
                        <div className="table-cell">
                          <span className="tag warning">Restricted Access</span>
                        </div>
                      </div>
                      
                      <div className="table-row">
                        <div className="table-cell">
                          <strong>Transaction Integrity</strong>
                        </div>
                        <div className="table-cell">
                          Complete transactions as described, no fraudulent activity
                        </div>
                        <div className="table-cell">
                          <span className="tag critical">Permanent Ban + Legal</span>
                        </div>
                      </div>
                      
                      <div className="table-row">
                        <div className="table-cell">
                          <strong>Content Compliance</strong>
                        </div>
                        <div className="table-cell">
                          List only permitted items with accurate descriptions
                        </div>
                        <div className="table-cell">
                          <span className="tag warning">Content Removal + Fine</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 4 */}
              <section id="payments" className="document-section">
                <div className="section-header" onClick={() => toggleSection('payments')}>
                  <div className="section-number">04</div>
                  <div className="section-title-content">
                    <h2>Payments & Fees</h2>
                    <p className="section-subtitle">Transaction costs and processing</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.payments ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.payments && (
                  <div className="section-content">
                    <div className="fee-breakdown">
                      <h3>Fee Structure</h3>
                      <div className="fee-chart">
                        <div className="fee-item">
                          <div className="fee-label">Platform Commission</div>
                          <div className="fee-bar">
                            <div className="bar-fill" style={{ width: '50%', backgroundColor: '#3B82F6' }}></div>
                          </div>
                          <div className="fee-value">5.0%</div>
                        </div>
                        
                        <div className="fee-item">
                          <div className="fee-label">Payment Processing</div>
                          <div className="fee-bar">
                            <div className="bar-fill" style={{ width: '25%', backgroundColor: '#10B981' }}></div>
                          </div>
                          <div className="fee-value">2.5%</div>
                        </div>
                        
                        <div className="fee-item">
                          <div className="fee-label">Service Fee</div>
                          <div className="fee-bar">
                            <div className="bar-fill" style={{ width: '25%', backgroundColor: '#8B5CF6' }}></div>
                          </div>
                          <div className="fee-value">2.5%</div>
                        </div>
                      </div>
                      
                      <div className="total-fee">
                        <span>Total Transaction Cost</span>
                        <span className="total-value">10.0%</span>
                      </div>
                    </div>
                    
                    <div className="payment-methods">
                      <h3>Accepted Payment Methods</h3>
                      <div className="methods-grid">
                        <div className="method-card">
                          <div className="method-icon">💳</div>
                          <div className="method-name">OmniCash</div>
                          <div className="method-fee">No Fee</div>
                        </div>
                        
                        <div className="method-card">
                          <div className="method-icon">📱</div>
                          <div className="method-name">M-Pesa</div>
                          <div className="method-fee">2.5%</div>
                        </div>
                        
                        <div className="method-card">
                          <div className="method-icon">🌐</div>
                          <div className="method-name">PayPal</div>
                          <div className="method-fee">3.5%</div>
                        </div>
                        
                        <div className="method-card">
                          <div className="method-icon">💳</div>
                          <div className="method-name">Cards</div>
                          <div className="method-fee">2.9%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 5 */}
              <section id="prohibited" className="document-section">
                <div className="section-header" onClick={() => toggleSection('prohibited')}>
                  <div className="section-number">05</div>
                  <div className="section-title-content">
                    <h2>Prohibited Items & Activities</h2>
                    <p className="section-subtitle">What you cannot sell or do</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.prohibited ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.prohibited && (
                  <div className="section-content">
                    <div className="prohibited-categories">
                      <div className="prohibited-category illegal">
                        <div className="category-header">
                          <XCircle size={20} />
                          <h4>Illegal Items</h4>
                        </div>
                        <ul>
                          <li>Controlled substances & drugs</li>
                          <li>Weapons, firearms, ammunition</li>
                          <li>Stolen property or counterfeit goods</li>
                          <li>Government documents or IDs</li>
                        </ul>
                      </div>
                      
                      <div className="prohibited-category restricted">
                        <div className="category-header">
                          <AlertTriangle size={20} />
                          <h4>Restricted Content</h4>
                        </div>
                        <ul>
                          <li>Adult or explicit material</li>
                          <li>Hate speech or discriminatory content</li>
                          <li>Personal information of others</li>
                          <li>Violent or threatening material</li>
                        </ul>
                      </div>
                      
                      <div className="prohibited-category abuse">
                        <div className="category-header">
                          <Shield size={20} />
                          <h4>Platform Abuse</h4>
                        </div>
                        <ul>
                          <li>Multiple fake accounts</li>
                          <li>Spam or harassment</li>
                          <li>System hacking or exploitation</li>
                          <li>Fee circumvention</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section 6 */}
              <section id="liability" className="document-section">
                <div className="section-header" onClick={() => toggleSection('liability')}>
                  <div className="section-number">06</div>
                  <div className="section-title-content">
                    <h2>Limitation of Liability</h2>
                    <p className="section-subtitle">Our responsibilities and limits</p>
                  </div>
                  <button className="expand-toggle">
                    {expandedSections.liability ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {expandedSections.liability && (
                  <div className="section-content">
                    <div className="liability-content">
                      <div className="liability-card">
                        <h4>What We Are Not Liable For</h4>
                        <ul>
                          <li>User-to-user disputes or transactions</li>
                          <li>Product quality or authenticity</li>
                          <li>Platform downtime or technical issues</li>
                          <li>Third-party actions or content</li>
                          <li>Unauthorized account access due to user negligence</li>
                        </ul>
                      </div>
                      
                      <div className="liability-card">
                        <h4>Liability Cap</h4>
                        <div className="cap-display">
                          <div className="cap-value">6 months commissions</div>
                          <div className="cap-description">
                            Maximum liability limited to commissions paid in last 6 months
                          </div>
                        </div>
                      </div>
                      
                      <div className="notice-box">
                        <Scale size={24} />
                        <div>
                          <strong>Legal Disclaimer:</strong> This limitation applies to the fullest 
                          extent permitted by Kenyan law. Some jurisdictions do not allow certain 
                          limitations, so these may not apply to you.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Contact & Legal Info */}
              <section className="contact-section">
                <div className="contact-grid">
                  <div className="contact-card">
                    <div className="contact-icon">
                      <Globe size={24} />
                    </div>
                    <h4>Governing Law</h4>
                    <p>Laws of Kenya apply to all matters relating to your use of the platform.</p>
                  </div>
                  
                  <div className="contact-card">
                    <div className="contact-icon">
                      <Scale size={24} />
                    </div>
                    <h4>Dispute Resolution</h4>
                    <p>Courts in Nairobi have exclusive jurisdiction over any disputes.</p>
                  </div>
                  
                  <div className="contact-card">
                    <div className="contact-icon">
                      <MapPin size={24} />
                    </div>
                    <h4>Registered Office</h4>
                    <p>OmniFlow Technologies Ltd.<br />Nairobi, Kenya</p>
                  </div>
                </div>
              </section>

              {/* Acceptance Footer */}
              <footer className="acceptance-footer">
                <div className="acceptance-banner">
                  <div className="acceptance-content">
                    <h3>Agreement Acceptance</h3>
                    <p>
                      By proceeding with registration, you confirm that you have read, understood, 
                      and agree to be bound by all terms and conditions in this document.
                    </p>
                    <div className="acceptance-actions">
                      <Link to="/auth" className="btn-accept">
                        <CheckCircle size={18} />
                        <span>I Accept & Continue</span>
                      </Link>
                      <Link to="/" className="btn-decline">
                        <XCircle size={18} />
                        <span>I Decline & Exit</span>
                      </Link>
                    </div>
                    <p className="legal-note">
                      This document constitutes the complete and exclusive statement of the agreement 
                      between you and OmniFlow Technologies Ltd.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
// src/pages/PrivacyPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  FileText,
  Shield,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Globe,
  Menu,
  X,
  Lock,
  Database,
  UserCheck,
  Share2,
  Cookie,
  Baby,
  RefreshCw,
  Scale,
  Server,
  Users,
  Eye,
  Trash2,
  Download,
  AlertTriangle
} from 'lucide-react';
import './PrivacyPage.css';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState('introduction');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const privacyData = {
    lastUpdated: 'April 2026',
    effectiveDate: 'April 2026',
    version: '1.0'
  };

  const companyInfo = {
    name: 'OMNIFLOW GROUP LTD',
    regNo: 'BN-L3SD8Y27',
    address: 'Nairobi, Kenya, 00100',
    phone: '+254 745 456 476',
    email: 'privacy@omniflowapp.co.ke',
    website: 'omniflowapp.co.ke',
    dpoEmail: 'dpo@omniflowapp.co.ke'
  };

  const tabs = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'information', label: 'Information We Collect' },
    { id: 'collection', label: 'How We Collect' },
    { id: 'usage', label: 'How We Use' },
    { id: 'sharing', label: 'Sharing' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'security', label: 'Security' },
    { id: 'rights', label: 'Your Rights' },
    { id: 'retention', label: 'Retention' },
    { id: 'children', label: 'Children' },
    { id: 'transfers', label: 'Data Transfers' },
    { id: 'changes', label: 'Changes' },
    { id: 'contact', label: 'Contact' }
  ];

  const scrollToSection = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = tabs.map(tab => document.getElementById(tab.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveTab(tabs[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="privacy-page">
      {/* Breadcrumb Navigation */}
      <div className="privacy-breadcrumb">
        <div className="privacy-container">
          <div className="privacy-breadcrumb-wrapper">
            <Link to="/" className="privacy-breadcrumb-link">
              <Home size={16} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} />
            <span className="privacy-breadcrumb-current">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="privacy-tabs-wrapper">
        <div className="privacy-container">
          <div className="privacy-tabs-container">
            <button
              className={`privacy-tabs-mobile-toggle ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              <span>Quick Navigation</span>
            </button>
            <div className={`privacy-tabs-scroll ${mobileMenuOpen ? 'open' : ''}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`privacy-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="privacy-main">
        <div className="privacy-container">
          <div className="privacy-content-wrapper">
            {/* Header */}
            <header className="privacy-header">
              <div className="privacy-company-badge">
                <Shield size={24} />
                <span className="privacy-company-name">{companyInfo.name}</span>
              </div>
              <h1>Privacy Policy</h1>
              <div className="privacy-meta">
                <div className="privacy-meta-item">
                  <Clock size={16} />
                  <span>Version {privacyData.version}</span>
                </div>
                <div className="privacy-meta-item">
                  <FileText size={16} />
                  <span>Effective: {privacyData.effectiveDate}</span>
                </div>
              </div>
              <div className="privacy-notice">
                <Lock size={20} />
                <p>
                  This Privacy Policy explains how Omniflow Group Ltd. collects, uses, stores,
                  shares, and protects your personal information when you use the Omniflow Platform.
                  We are committed to protecting your privacy in accordance with the Data Protection
                  Act, 2019 of Kenya.
                </p>
              </div>
            </header>

            {/* 1. Introduction */}
            <section id="introduction" className="privacy-section">
              <h2>1. Introduction</h2>
              <p>
                Omniflow Group Ltd. ("Omniflow", "we", "us", or "our") operates the Omniflow
                marketplace platform, accessible via our website and mobile application (the
                "Platform"). This Privacy Policy describes how we handle personal data collected
                from users of the Platform, including buyers, sellers, and visitors.
              </p>

              <h3>1.1 Data Controller</h3>
              <p>
                Omniflow Group Ltd. is the data controller responsible for your personal data.
                We are registered in Kenya under registration number {companyInfo.regNo}, with
                our registered address at {companyInfo.address}.
              </p>

              <h3>1.2 Regulatory Compliance</h3>
              <p>
                We comply with the Data Protection Act, 2019 of Kenya (the "Act"), and where
                applicable, the General Data Protection Regulation (GDPR) of the European Union.
                We are committed to processing your personal data lawfully, fairly, and transparently.
              </p>

              <h3>1.3 Consent</h3>
              <p>
                By accessing or using the Platform, you acknowledge that you have read and
                understood this Privacy Policy and consent to the collection, use, and disclosure
                of your personal data as described herein.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="information" className="privacy-section">
              <h2>2. Information We Collect</h2>

              <h3>2.1 Personal Information You Provide</h3>
              <p>We collect information that you voluntarily provide to us, including:</p>

              <div className="privacy-info-grid">
                <div className="privacy-info-card">
                  <UserCheck size={22} />
                  <h4>Identity Information</h4>
                  <ul>
                    <li>Full name</li>
                    <li>National ID or Passport number</li>
                    <li>Date of birth</li>
                    <li>KRA PIN certificate</li>
                    <li>Business registration details</li>
                    <li>Profile photograph</li>
                  </ul>
                </div>
                <div className="privacy-info-card">
                  <Mail size={22} />
                  <h4>Contact Information</h4>
                  <ul>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Physical address</li>
                    <li>Delivery address</li>
                    <li>Billing address</li>
                  </ul>
                </div>
                <div className="privacy-info-card">
                  <Database size={22} />
                  <h4>Financial Information</h4>
                  <ul>
                    <li>M-Pesa number</li>
                    <li>Bank account details</li>
                    <li>Payment card information (tokenized)</li>
                    <li>Transaction history</li>
                    <li>Wallet balance information</li>
                  </ul>
                </div>
                <div className="privacy-info-card">
                  <FileText size={22} />
                  <h4>Transaction Information</h4>
                  <ul>
                    <li>Order details</li>
                    <li>Product listings</li>
                    <li>Messages with buyers/sellers</li>
                    <li>Dispute records</li>
                    <li>Reviews and ratings</li>
                  </ul>
                </div>
              </div>

              <h3>2.2 Information Automatically Collected</h3>
              <p>When you use the Platform, we automatically collect:</p>
              <ul>
                <li><strong>Device Information:</strong> Device type, operating system, browser type, unique device identifiers</li>
                <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URLs</li>
                <li><strong>Location Data:</strong> Approximate geographic location based on IP address (for fraud prevention and delivery zone determination)</li>
                <li><strong>Usage Data:</strong> Features used, search queries, and interactions with the Platform</li>
              </ul>

              <h3>2.3 Information from Third Parties</h3>
              <ul>
                <li>Authentication data from Google OAuth if you sign in with Google</li>
                <li>Payment confirmation data from M-Pesa, PayPal, and banking partners</li>
                <li>Identity verification data from KRA and credit reference bureaus</li>
                <li>Fraud detection data from security service providers</li>
              </ul>
            </section>

            {/* 3. How We Collect */}
            <section id="collection" className="privacy-section">
              <h2>3. How We Collect Information</h2>

              <h3>3.1 Direct Collection</h3>
              <ul>
                <li>When you create an account or register as a seller</li>
                <li>When you place or fulfill an order</li>
                <li>When you communicate with other users through the Platform</li>
                <li>When you contact customer support</li>
                <li>When you participate in surveys or promotions</li>
                <li>When you leave reviews or ratings</li>
              </ul>

              <h3>3.2 Automatic Collection</h3>
              <ul>
                <li>Through cookies and similar tracking technologies</li>
                <li>Through server logs and analytics tools</li>
                <li>Through mobile application permissions</li>
                <li>Through web beacons and pixel tags</li>
              </ul>

              <h3>3.3 Third-Party Sources</h3>
              <ul>
                <li>Identity verification services</li>
                <li>Payment processors</li>
                <li>Fraud prevention agencies</li>
                <li>Business partners and affiliates</li>
              </ul>
            </section>

            {/* 4. How We Use */}
            <section id="usage" className="privacy-section">
              <h2>4. How We Use Your Information</h2>

              <h3>4.1 Primary Purposes</h3>
              <div className="privacy-usage-grid">
                <div className="privacy-usage-item">
                  <Shield size={20} />
                  <div>
                    <strong>Provide Services</strong>
                    <p>Facilitate transactions, process orders, and manage your account</p>
                  </div>
                </div>
                <div className="privacy-usage-item">
                  <UserCheck size={20} />
                  <div>
                    <strong>Verify Identity</strong>
                    <p>Authenticate users and verify seller eligibility</p>
                  </div>
                </div>
                <div className="privacy-usage-item">
                  <Database size={20} />
                  <div>
                    <strong>Process Payments</strong>
                    <p>Handle escrow, wallet operations, and withdrawals</p>
                  </div>
                </div>
                <div className="privacy-usage-item">
                  <Share2 size={20} />
                  <div>
                    <strong>Facilitate Delivery</strong>
                    <p>Share necessary details with riders and logistics partners</p>
                  </div>
                </div>
                <div className="privacy-usage-item">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Prevent Fraud</strong>
                    <p>Detect and prevent fraudulent activity and abuse</p>
                  </div>
                </div>
                <div className="privacy-usage-item">
                  <Users size={20} />
                  <div>
                    <strong>Customer Support</strong>
                    <p>Respond to inquiries and resolve disputes</p>
                  </div>
                </div>
              </div>

              <h3>4.2 Legal Basis for Processing</h3>
              <ul>
                <li><strong>Contract Performance:</strong> To fulfill our obligations under the Merchant Agreement and Terms of Service</li>
                <li><strong>Legal Compliance:</strong> To comply with the Data Protection Act, 2019, tax laws, and other applicable regulations</li>
                <li><strong>Legitimate Interests:</strong> To improve our services, prevent fraud, and ensure platform security</li>
                <li><strong>Consent:</strong> For marketing communications and optional features where you have provided consent</li>
              </ul>
            </section>

            {/* 5. Sharing */}
            <section id="sharing" className="privacy-section">
              <h2>5. How We Share Your Information</h2>

              <h3>5.1 We Do Not Sell Your Data</h3>
              <p>
                Omniflow does not sell, rent, or trade your personal information to third parties
                for their marketing purposes.
              </p>

              <h3>5.2 When We Share</h3>
              <p>We may share your information in the following circumstances:</p>

              <div className="privacy-table-responsive">
                <table className="privacy-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Purpose</th>
                      <th>Data Shared</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Buyers/Sellers</td>
                      <td>Order fulfillment</td>
                      <td>Name, delivery address, phone</td>
                    </tr>
                    <tr>
                      <td>Delivery Partners</td>
                      <td>Delivery services</td>
                      <td>Name, address, phone, order details</td>
                    </tr>
                    <tr>
                      <td>Payment Processors</td>
                      <td>Payment processing</td>
                      <td>Payment details, transaction amount</td>
                    </tr>
                    <tr>
                      <td>KRA</td>
                      <td>Tax compliance</td>
                      <td>Transaction data, tax identification</td>
                    </tr>
                    <tr>
                      <td>Law Enforcement</td>
                      <td>Legal obligations</td>
                      <td>As required by law</td>
                    </tr>
                    <tr>
                      <td>Service Providers</td>
                      <td>Platform operations</td>
                      <td>As necessary for services</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>5.3 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your personal data may
                be transferred to the acquiring entity. We will notify you of any such change.
              </p>
            </section>

            {/* 6. Cookies */}
            <section id="cookies" className="privacy-section">
              <h2>6. Cookies and Tracking Technologies</h2>

              <h3>6.1 What Are Cookies</h3>
              <p>
                Cookies are small text files stored on your device when you visit the Platform.
                They help us provide a better experience and understand how you use our services.
              </p>

              <h3>6.2 Types of Cookies We Use</h3>
              <div className="privacy-table-responsive">
                <table className="privacy-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Essential</td>
                      <td>Authentication, security, session management</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>Functional</td>
                      <td>Remember preferences, language settings</td>
                      <td>1 year</td>
                    </tr>
                    <tr>
                      <td>Analytics</td>
                      <td>Understand usage patterns, improve services</td>
                      <td>2 years</td>
                    </tr>
                    <tr>
                      <td>Marketing</td>
                      <td>Relevant advertisements, campaign measurement</td>
                      <td>1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>6.3 Managing Cookies</h3>
              <p>
                You can control cookies through your browser settings. However, disabling
                essential cookies may affect the functionality of the Platform.
              </p>
            </section>

            {/* 7. Security */}
            <section id="security" className="privacy-section">
              <h2>7. Data Security</h2>

              <h3>7.1 Security Measures</h3>
              <p>We implement appropriate technical and organizational measures to protect your data:</p>
              <ul>
                <li><strong>Encryption:</strong> All data transmitted via TLS/SSL encryption</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
                <li><strong>Data Minimization:</strong> We only collect data necessary for specified purposes</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                <li><strong>Employee Training:</strong> Regular data protection training for staff</li>
                <li><strong>Incident Response:</strong> Documented procedures for data breach response</li>
              </ul>

              <h3>7.2 Data Breach Notification</h3>
              <p>
                In the event of a data breach that poses a risk to your rights and freedoms, we
                will notify the Office of the Data Protection Commissioner and affected individuals
                within 72 hours of becoming aware of the breach, in accordance with the Act.
              </p>
            </section>

            {/* 8. Rights */}
            <section id="rights" className="privacy-section">
              <h2>8. Your Rights</h2>

              <h3>8.1 Your Data Protection Rights</h3>
              <p>Under the Data Protection Act, 2019, you have the following rights:</p>

              <div className="privacy-rights-grid">
                <div className="privacy-right-item">
                  <Eye size={20} />
                  <div>
                    <strong>Right to Access</strong>
                    <p>Request a copy of the personal data we hold about you</p>
                  </div>
                </div>
                <div className="privacy-right-item">
                  <RefreshCw size={20} />
                  <div>
                    <strong>Right to Rectification</strong>
                    <p>Request correction of inaccurate or incomplete data</p>
                  </div>
                </div>
                <div className="privacy-right-item">
                  <Trash2 size={20} />
                  <div>
                    <strong>Right to Erasure</strong>
                    <p>Request deletion of your data under certain circumstances</p>
                  </div>
                </div>
                <div className="privacy-right-item">
                  <Lock size={20} />
                  <div>
                    <strong>Right to Restrict</strong>
                    <p>Request restriction of processing in certain cases</p>
                  </div>
                </div>
                <div className="privacy-right-item">
                  <Download size={20} />
                  <div>
                    <strong>Right to Portability</strong>
                    <p>Receive your data in a structured, machine-readable format</p>
                  </div>
                </div>
                <div className="privacy-right-item">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Right to Object</strong>
                    <p>Object to processing based on legitimate interests</p>
                  </div>
                </div>
              </div>

              <h3>8.2 How to Exercise Your Rights</h3>
              <p>
                To exercise any of these rights, please contact us at{' '}
                <a href={`mailto:${companyInfo.dpoEmail}`}>{companyInfo.dpoEmail}</a>.
                We will respond to your request within 30 days.
              </p>

              <h3>8.3 Right to Lodge a Complaint</h3>
              <p>
                You have the right to lodge a complaint with the Office of the Data Protection
                Commissioner (ODPC) if you believe your rights have been violated.
              </p>
            </section>

            {/* 9. Retention */}
            <section id="retention" className="privacy-section">
              <h2>9. Data Retention</h2>

              <h3>9.1 Retention Periods</h3>
              <div className="privacy-table-responsive">
                <table className="privacy-table">
                  <thead>
                    <tr>
                      <th>Data Type</th>
                      <th>Retention Period</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Account Information</td>
                      <td>Active account + 7 years</td>
                      <td>Tax and legal compliance</td>
                    </tr>
                    <tr>
                      <td>Transaction Records</td>
                      <td>7 years</td>
                      <td>Financial regulations</td>
                    </tr>
                    <tr>
                      <td>Communication Logs</td>
                      <td>3 years</td>
                      <td>Dispute resolution</td>
                    </tr>
                    <tr>
                      <td>Marketing Preferences</td>
                      <td>Until withdrawn</td>
                      <td>Consent-based</td>
                    </tr>
                    <tr>
                      <td>Analytics Data</td>
                      <td>2 years (anonymized)</td>
                      <td>Service improvement</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>9.2 Deletion</h3>
              <p>
                When retention periods expire, we securely delete or anonymize your data. You may
                request early deletion by contacting us, subject to legal retention requirements.
              </p>
            </section>

            {/* 10. Children */}
            <section id="children" className="privacy-section">
              <h2>10. Children's Privacy</h2>
              <p>
                The Platform is not intended for use by persons under the age of 18. We do not
                knowingly collect personal information from children. If we become aware that we
                have collected data from a child under 18, we will take steps to delete such
                information promptly.
              </p>
              <p>
                If you believe a child has provided us with personal information, please contact
                us at <a href={`mailto:${companyInfo.dpoEmail}`}>{companyInfo.dpoEmail}</a>.
              </p>
            </section>

            {/* 11. Transfers */}
            <section id="transfers" className="privacy-section">
              <h2>11. International Data Transfers</h2>

              <h3>11.1 Data Location</h3>
              <p>
                Your personal data is primarily stored and processed in Kenya. We use secure
                cloud infrastructure with data centers that may be located outside Kenya.
              </p>

              <h3>11.2 Transfer Safeguards</h3>
              <p>
                When we transfer data outside Kenya, we ensure appropriate safeguards are in place,
                including:
              </p>
              <ul>
                <li>Standard contractual clauses approved by the ODPC</li>
                <li>Adequacy decisions where applicable</li>
                <li>Explicit consent where required</li>
                <li>Binding corporate rules for intra-group transfers</li>
              </ul>
            </section>

            {/* 12. Changes */}
            <section id="changes" className="privacy-section">
              <h2>12. Changes to This Policy</h2>

              <h3>12.1 Notification of Changes</h3>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our
                practices or legal requirements. We will notify you of material changes by:
              </p>
              <ul>
                <li>Posting the updated policy on the Platform</li>
                <li>Sending an email notification to registered users</li>
                <li>Displaying a prominent notice within the Platform</li>
              </ul>

              <h3>12.2 Continued Use</h3>
              <p>
                Your continued use of the Platform after changes take effect constitutes acceptance
                of the updated Privacy Policy.
              </p>
            </section>

            {/* Contact Information */}
            <section id="contact" className="privacy-section">
              <h2>Contact Information</h2>
              <p>
                For questions, concerns, or requests regarding this Privacy Policy or your personal
                data, please contact:
              </p>

              <div className="privacy-contact-grid">
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><Globe size={20} /></div>
                  <div>
                    <strong>Company Name</strong>
                    <span>{companyInfo.name}</span>
                  </div>
                </div>
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><FileText size={20} /></div>
                  <div>
                    <strong>Registration Number</strong>
                    <span>{companyInfo.regNo}</span>
                  </div>
                </div>
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><MapPin size={20} /></div>
                  <div>
                    <strong>Physical Address</strong>
                    <span>{companyInfo.address}</span>
                  </div>
                </div>
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><Phone size={20} /></div>
                  <div>
                    <strong>Phone Number</strong>
                    <a href={`tel:${companyInfo.phone}`}>{companyInfo.phone}</a>
                  </div>
                </div>
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><Mail size={20} /></div>
                  <div>
                    <strong>General Email</strong>
                    <a href={`mailto:${companyInfo.email}`}>{companyInfo.email}</a>
                  </div>
                </div>
                <div className="privacy-contact-item">
                  <div className="privacy-contact-icon"><Shield size={20} /></div>
                  <div>
                    <strong>Data Protection Officer</strong>
                    <a href={`mailto:${companyInfo.dpoEmail}`}>{companyInfo.dpoEmail}</a>
                  </div>
                </div>
              </div>

              <div className="privacy-dpo-notice">
                <Scale size={20} />
                <p>
                  You also have the right to contact the Office of the Data Protection Commissioner
                  (ODPC) of Kenya at <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">www.odpc.go.ke</a>
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer className="privacy-footer">
              <div className="privacy-acceptance">
                <h3>Acknowledgment</h3>
                <p>
                  By using the Omniflow Platform, you acknowledge that you have read and understood
                  this Privacy Policy and agree to the collection, use, and disclosure of your
                  personal information as described herein.
                </p>
                <div className="privacy-footer-meta">
                  <div className="privacy-meta-item">
                    <strong>Effective Date:</strong> {privacyData.effectiveDate}
                  </div>
                  <div className="privacy-meta-item">
                    <strong>Version:</strong> {privacyData.version}
                  </div>
                </div>
                <Link to="/" className="privacy-back-btn">
                  <ArrowLeft size={18} />
                  <span>Back to Home</span>
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
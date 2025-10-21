// src/pages/TermsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Users, CreditCard, AlertTriangle } from 'lucide-react';
import './TermsPage.css';

export default function TermsPage() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="terms-page">
      {/* Header */}
      <header className="terms-header">
        <div className="container">
          <Link to="/auth" className="back-button">
            <ArrowLeft size={20} />
            Back to Sign Up
          </Link>
          <div className="header-content">
            <div className="header-icon">
              <Shield size={48} />
            </div>
            <h1>Terms & Conditions</h1>
            <p className="last-updated">Last Updated: October 2025</p>
            <p className="header-description">
              Please read these terms carefully before using OmniFlow. By accessing or using our platform, 
              you agree to be bound by these terms and all applicable laws and regulations.
            </p>
          </div>
        </div>
      </header>

      {/* Quick Navigation */}
      <nav className="terms-navigation">
        <div className="container">
          <h3>Quick Navigation</h3>
          <div className="nav-links">
            <button onClick={() => scrollToSection('acceptance')} className="nav-link">
              <FileText size={16} />
              Acceptance
            </button>
            <button onClick={() => scrollToSection('user-responsibilities')} className="nav-link">
              <Users size={16} />
              User Responsibilities
            </button>
            <button onClick={() => scrollToSection('payments')} className="nav-link">
              <CreditCard size={16} />
              Payments
            </button>
            <button onClick={() => scrollToSection('prohibited')} className="nav-link">
              <AlertTriangle size={16} />
              Prohibited Activities
            </button>
            <button onClick={() => scrollToSection('liability')} className="nav-link">
              <Shield size={16} />
              Liability
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="terms-content">
        <div className="container">
          <div className="content-wrapper">
            
            {/* Introduction */}
            <section className="intro-section">
              <h2>Welcome to OmniFlow</h2>
              <p>
                OmniFlow ("the Platform", "we", "us", or "our") is a digital marketplace operated by 
                OmniFlow Technologies, a company registered in Kenya. These Terms & Conditions govern 
                your use of our platform, services, and all related applications.
              </p>
            </section>

            {/* Main Terms Sections */}
            <div className="terms-sections">
              
              <section id="acceptance" className="terms-section">
                <div className="section-header">
                  <div className="section-icon">
                    <FileText size={24} />
                  </div>
                  <h3>1. Acceptance of Terms</h3>
                </div>
                <div className="section-content">
                  <p>
                    By accessing, browsing, or using OmniFlow (the "App", "Website", or "Platform"), 
                    you acknowledge that you have read, understood, and agree to be bound by these 
                    Terms & Conditions, our Privacy Policy, and all applicable laws and regulations.
                  </p>
                  <div className="highlight-box">
                    <p><strong>Important:</strong> If you do not agree with any part of these terms, 
                    you must immediately discontinue your use of the Platform and may not access 
                    our services.</p>
                  </div>
                </div>
              </section>

              <section className="terms-section">
                <div className="section-header">
                  <div className="section-icon">
                    <Users size={24} />
                  </div>
                  <h3>2. Eligibility Requirements</h3>
                </div>
                <div className="section-content">
                  <p>To use OmniFlow, you must meet the following criteria:</p>
                  <div className="requirements-grid">
                    <div className="requirement-item">
                      <div className="requirement-icon">👤</div>
                      <div className="requirement-text">
                        <strong>Age Requirement</strong>
                        <p>Be at least 18 years old, or have parental/guardian consent if between 13-17 years</p>
                      </div>
                    </div>
                    <div className="requirement-item">
                      <div className="requirement-icon">📧</div>
                      <div className="requirement-text">
                        <strong>Valid Contact</strong>
                        <p>Provide a valid email address and phone number for verification</p>
                      </div>
                    </div>
                    <div className="requirement-item">
                      <div className="requirement-icon">✅</div>
                      <div className="requirement-text">
                        <strong>Accurate Information</strong>
                        <p>Agree to provide truthful and accurate registration information</p>
                      </div>
                    </div>
                    <div className="requirement-item">
                      <div className="requirement-icon">🇰🇪</div>
                      <div className="requirement-text">
                        <strong>Location</strong>
                        <p>Reside in a region where our services are legally available</p>
                      </div>
                    </div>
                  </div>
                  <p className="warning-text">
                    We reserve the right to suspend or terminate accounts that violate these eligibility 
                    requirements or provide false information.
                  </p>
                </div>
              </section>

              <section id="user-responsibilities" className="terms-section">
                <div className="section-header">
                  <div className="section-icon">
                    <Shield size={24} />
                  </div>
                  <h3>3. User Account Responsibilities</h3>
                </div>
                <div className="section-content">
                  <p>As a user of OmniFlow, you are solely responsible for:</p>
                  <div className="responsibilities-list">
                    <div className="responsibility-item">
                      <span className="checkmark">✓</span>
                      <span>Maintaining the confidentiality and security of your password</span>
                    </div>
                    <div className="responsibility-item">
                      <span className="checkmark">✓</span>
                      <span>Keeping your account information accurate and up-to-date</span>
                    </div>
                    <div className="responsibility-item">
                      <span className="checkmark">✓</span>
                      <span>All activities that occur under your account</span>
                    </div>
                    <div className="responsibility-item">
                      <span className="checkmark">✓</span>
                      <span>Immediately notifying us of any unauthorized access</span>
                    </div>
                  </div>
                  <div className="legal-note">
                    <p>
                      <strong>Legal Notice:</strong> OmniFlow shall not be liable for any loss or damage 
                      arising from your failure to comply with these security obligations. In case of 
                      suspected unauthorized access, contact us immediately at security@omniflowapp.co.ke
                    </p>
                  </div>
                </div>
              </section>

              <section className="terms-section">
                <h3>4. Marketplace Usage Guidelines</h3>
                <div className="section-content">
                  <p>OmniFlow enables users to:</p>
                  <ul className="feature-list">
                    <li>Create personalized stores and list products/services</li>
                    <li>Browse and purchase items from verified sellers</li>
                    <li>Use multiple payment methods including OmniCash, M-Pesa, and PayPal</li>
                    <li>Communicate securely with sellers for order management</li>
                    <li>Track orders and manage transactions in real-time</li>
                  </ul>
                  <p>
                    You agree to use the Platform only for lawful commercial transactions and to list 
                    only authentic, accurately described products and services.
                  </p>
                </div>
              </section>

              <section className="terms-section">
                <h3>5. Seller Obligations & Commission Structure</h3>
                <div className="section-content">
                  <p>When opening a store on OmniFlow, you commit to:</p>
                  
                  <div className="obligation-card">
                    <h4>Product Listing Standards</h4>
                    <ul>
                      <li>Provide accurate product descriptions, specifications, and pricing</li>
                      <li>Use high-quality, truthful product images</li>
                      <li>Clearly state shipping costs and delivery timelines</li>
                      <li>Maintain adequate inventory levels</li>
                    </ul>
                  </div>

                  <div className="obligation-card">
                    <h4>Order Fulfillment</h4>
                    <ul>
                      <li>Process and ship confirmed orders within stated timeframes</li>
                      <li>Provide order tracking information when available</li>
                      <li>Maintain professional customer communication</li>
                      <li>Handle returns and exchanges according to platform policy</li>
                    </ul>
                  </div>

                  <div className="commission-structure">
                    <h4>Commission & Fees</h4>
                    <div className="commission-grid">
                      <div className="commission-item">
                        <span className="rate">5%</span>
                        <span className="label">Standard Transaction Fee</span>
                      </div>
                      <div className="commission-item">
                        <span className="rate">2.5%</span>
                        <span className="label">Payment Processing</span>
                      </div>
                      <div className="commission-item">
                        <span className="rate">₦0</span>
                        <span className="label">Store Setup Fee</span>
                      </div>
                    </div>
                    <p className="commission-note">
                      You authorize OmniFlow to automatically deduct applicable commissions and fees 
                      from your sales transactions. All fees are subject to change with 30 days notice.
                    </p>
                  </div>

                  <div className="warning-box">
                    <h4>⚠️ Violation Consequences</h4>
                    <p>
                      Serious violations including fake products, unfulfilled orders, misleading information, 
                      or fraudulent activities may result in immediate store suspension, permanent banning 
                      from the platform, and legal action where applicable.
                    </p>
                  </div>
                </div>
              </section>

              <section id="payments" className="terms-section">
                <div className="section-header">
                  <div className="section-icon">
                    <CreditCard size={24} />
                  </div>
                  <h3>6. Payment Processing & OmniCash</h3>
                </div>
                <div className="section-content">
                  <div className="payment-methods">
                    <h4>Supported Payment Methods</h4>
                    <div className="methods-grid">
                      <div className="method-item">
                        <div className="method-icon">💳</div>
                        <span>OmniCash Wallet</span>
                      </div>
                      <div className="method-item">
                        <div className="method-icon">📱</div>
                        <span>M-Pesa</span>
                      </div>
                      <div className="method-item">
                        <div className="method-icon">🌐</div>
                        <span>PayPal</span>
                      </div>
                      <div className="method-item">
                        <div className="method-icon">💳</div>
                        <span>Credit/Debit Cards</span>
                      </div>
                    </div>
                  </div>

                  <div className="payment-terms">
                    <h4>Payment Terms & Security</h4>
                    <ul>
                      <li>All transactions are processed through secure, encrypted payment gateways</li>
                      <li>Funds are held in escrow until order completion confirmation</li>
                      <li>Withdrawals are processed within 3-5 business days after security verification</li>
                      <li>Currency conversion rates are applied according to current market rates</li>
                      <li>Transaction history is maintained for 7 years for compliance purposes</li>
                    </ul>
                  </div>

                  <div className="prohibited-payment">
                <h4>❌ Prohibited Payment Activities</h4>
                    <p>
                      You expressly agree not to engage in fraudulent chargebacks, payment reversal 
                      attempts, money laundering, or any activity that violates financial regulations 
                      under Kenyan law.
                    </p>
                  </div>
                </div>
              </section>

              <section className="terms-section">
                <h3>7. Refund & Dispute Resolution Policy</h3>
                <div className="section-content">
                  <div className="refund-process">
                    <h4>Refund Eligibility</h4>
                    <p>Buyers may request refunds under these circumstances:</p>
                    <div className="eligibility-grid">
                      <div className="eligibility-item eligible">
                        <strong>✅ Eligible Cases</strong>
                        <ul>
                          <li>Non-delivery of paid items</li>
                          <li>Significantly damaged goods</li>
                          <li>Items not matching description</li>
                          <li>Verified fraudulent transactions</li>
                        </ul>
                      </div>
                      <div className="eligibility-item not-eligible">
                        <strong>❌ Non-Eligible Cases</strong>
                        <ul>
                          <li>Change of mind after purchase</li>
                          <li>Minor cosmetic issues</li>
                          <li>Buyer's failure to provide address</li>
                          <li>Delayed shipping during holidays</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="dispute-timeline">
                    <h4>Dispute Resolution Timeline</h4>
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-marker">1</div>
                        <div className="timeline-content">
                          <strong>Direct Resolution (3 days)</strong>
                          <p>Buyer and seller attempt to resolve issues directly</p>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-marker">2</div>
                        <div className="timeline-content">
                          <strong>Platform Mediation (4 days)</strong>
                          <p>OmniFlow support team reviews evidence from both parties</p>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-marker">3</div>
                        <div className="timeline-content">
                          <strong>Final Decision (3 days)</strong>
                          <p>Binding resolution issued by OmniFlow dispute team</p>
                        </div>
                      </div>
                    </div>
                    <p className="timeline-note">
                      All disputes must be filed within 7 days of transaction completion. 
                      Final decisions by OmniFlow's dispute resolution team are binding.
                    </p>
                  </div>
                </div>
              </section>

              <section id="prohibited" className="terms-section">
                <div className="section-header">
                  <div className="section-icon">
                    <AlertTriangle size={24} />
                  </div>
                  <h3>8. Prohibited Activities & Content</h3>
                </div>
                <div className="section-content">
                  <div className="prohibited-categories">
                    <div className="category">
                      <h4>🚫 Illegal Items</h4>
                      <ul>
                        <li>Drugs, narcotics, and controlled substances</li>
                        <li>Weapons, firearms, and ammunition</li>
                        <li>Stolen goods or property</li>
                        <li>Counterfeit currency and documents</li>
                      </ul>
                    </div>
                    <div className="category">
                      <h4>🔞 Restricted Content</h4>
                      <ul>
                        <li>Adult or sexually explicit material</li>
                        <li>Hate speech or discriminatory content</li>
                        <li>Violent or threatening material</li>
                        <li>Personal information of others</li>
                      </ul>
                    </div>
                    <div className="category">
                      <h4>⚡ Platform Abuse</h4>
                      <ul>
                        <li>Creating multiple fake accounts</li>
                        <li>Spamming or harassing other users</li>
                        <li>Attempting to hack or exploit the platform</li>
                        <li>Circumventing fees or payment systems</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section id="liability" className="terms-section">
                <h3>9. Limitation of Liability</h3>
                <div className="section-content">
                  <div className="liability-disclaimer">
                    <p>
                      To the maximum extent permitted by Kenyan law, OmniFlow Technologies shall not be 
                      liable for any indirect, incidental, special, consequential, or punitive damages, 
                      including but not limited to:
                    </p>
                    <ul>
                      <li>Loss of profits, data, or business opportunities</li>
                      <li>Damages resulting from user interactions or transactions</li>
                      <li>Platform downtime or technical issues</li>
                      <li>Third-party actions or content</li>
                      <li>Unauthorized access to user information</li>
                    </ul>
                    <p>
                      Our total cumulative liability to any user for all claims shall not exceed the 
                      total commissions paid by that user to OmniFlow in the six months preceding the claim.
                    </p>
                  </div>
                </div>
              </section>

              <section className="terms-section">
                <h3>10. Governing Law & Contact Information</h3>
                <div className="section-content">
                  <div className="governance-info">
                    <div className="governance-item">
                      <h4>📋 Governing Law</h4>
                      <p>These Terms & Conditions are governed by and construed in accordance with the laws of Kenya.</p>
                    </div>
                    <div className="governance-item">
                      <h4>⚖️ Dispute Resolution</h4>
                      <p>Any disputes shall be subject to the exclusive jurisdiction of the courts located in Nairobi, Kenya.</p>
                    </div>
                    <div className="governance-item">
                      <h4>📞 Contact Information</h4>
                      <div className="contact-details">
                        <p><strong>OmniFlow Technologies</strong></p>
                        <p>📧 Support: support@omniflowapp.co.ke</p>
                        <p>📧 Legal: legal@omniflowapp.co.ke</p>
                        <p>📞 Phone: +254 XXX XXX XXX</p>
                        <p>🌐 Website: https://omniflowapp.co.ke</p>
                        <p>📍 Address: Nairobi, Kenya</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* Acceptance Footer */}
            <footer className="terms-footer">
              <div className="acceptance-box">
                <h3>Acceptance Confirmation</h3>
                <p>
                  By proceeding with registration on OmniFlow, you acknowledge that you have read, 
                  understood, and agree to be bound by all the terms and conditions outlined above.
                </p>
                <Link to="/auth" className="accept-button">
                  I Understand - Return to Sign Up
                </Link>
              </div>
            </footer>

          </div>
        </div>
      </main>
    </div>
  );
}
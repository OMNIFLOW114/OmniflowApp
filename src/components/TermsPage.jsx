// src/pages/TermsPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight,
  Home,
  FileText,
  Shield,
  Users,
  CreditCard,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import './TermsPage.css';

export default function TermsPage() {
  const termsData = {
    lastUpdated: 'December 2, 2025',
    effectiveDate: 'January 1, 2026',
    version: '2.0'
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="terms-page">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-nav">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/" className="breadcrumb-link">
              <Home size={16} />
              <span>Home</span>
            </Link>
            <ChevronRight size={16} />
            <Link to="/legal" className="breadcrumb-link">Legal</Link>
            <ChevronRight size={16} />
            <span className="breadcrumb-current">Terms & Conditions</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="terms-container">
          {/* Sidebar */}
          <aside className="terms-sidebar">
            <div className="sidebar-header">
              <h3>Quick Links</h3>
            </div>
            <nav className="sidebar-nav">
              <button onClick={() => scrollToSection('introduction')} className="nav-link">
                <span>1. Introduction</span>
              </button>
              <button onClick={() => scrollToSection('account')} className="nav-link">
                <span>2. Account Registration</span>
              </button>
              <button onClick={() => scrollToSection('orders')} className="nav-link">
                <span>3. Orders & Payments</span>
              </button>
              <button onClick={() => scrollToSection('delivery')} className="nav-link">
                <span>4. Delivery & Returns</span>
              </button>
              <button onClick={() => scrollToSection('prohibited')} className="nav-link">
                <span>5. Prohibited Activities</span>
              </button>
              <button onClick={() => scrollToSection('intellectual')} className="nav-link">
                <span>6. Intellectual Property</span>
              </button>
              <button onClick={() => scrollToSection('liability')} className="nav-link">
                <span>7. Limitation of Liability</span>
              </button>
              <button onClick={() => scrollToSection('governing')} className="nav-link">
                <span>8. Governing Law</span>
              </button>
              <button onClick={() => scrollToSection('contact')} className="nav-link">
                <span>9. Contact Us</span>
              </button>
            </nav>

            <div className="sidebar-help">
              <div className="help-header">
                <AlertCircle size={18} />
                <span>Need Help?</span>
              </div>
              <div className="help-links">
                <Link to="/help-center" className="help-link">
                  <ExternalLink size={14} />
                  <span>Help Center</span>
                </Link>
                <Link to="/privacy" className="help-link">
                  <Shield size={14} />
                  <span>Privacy Policy</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="terms-content">
            {/* Header */}
            <header className="terms-header">
              <h1>Terms and Conditions</h1>
              <div className="terms-meta">
                <div className="meta-item">
                  <Clock size={16} />
                  <span>Last Updated: {termsData.lastUpdated}</span>
                </div>
                <div className="meta-item">
                  <FileText size={16} />
                  <span>Version: {termsData.version}</span>
                </div>
              </div>
              <div className="terms-notice">
                <AlertCircle size={20} />
                <p>
                  Welcome to OmniFlow. These Terms and Conditions govern your use of our website and services. 
                  By accessing or using OmniFlow, you agree to be bound by these terms.
                </p>
              </div>
            </header>

            {/* Introduction */}
            <section id="introduction" className="terms-section">
              <h2>1. Introduction</h2>
              <p>
                These Terms and Conditions ("Terms") govern your use of the OmniFlow e-commerce platform 
                available at <a href="https://omniflowapp.co.ke">omniflowapp.co.ke</a> and related mobile 
                applications (collectively, the "Platform"). The Platform is operated by OmniFlow Technologies 
                Ltd., a company registered in Kenya.
              </p>
              <p>
                By accessing, browsing, or using the Platform, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms. If you do not agree to these Terms, you must not use 
                the Platform.
              </p>
            </section>

            {/* Account Registration */}
            <section id="account" className="terms-section">
              <h2>2. Account Registration</h2>
              
              <h3>2.1 Eligibility</h3>
              <p>To use the Platform, you must:</p>
              <ul>
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into a binding contract</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the confidentiality of your account credentials</li>
              </ul>

              <h3>2.2 Account Security</h3>
              <p>
                You are responsible for all activities that occur under your account. You must immediately 
                notify us of any unauthorized use of your account or any other security breach.
              </p>

              <h3>2.3 Account Suspension</h3>
              <p>
                We reserve the right to suspend or terminate your account if we suspect fraudulent activity, 
                violation of these Terms, or for any other reason at our sole discretion.
              </p>
            </section>

            {/* Orders & Payments */}
            <section id="orders" className="terms-section">
              <h2>3. Orders & Payments</h2>
              
              <h3>3.1 Order Placement</h3>
              <p>
                When you place an order through the Platform, you are making an offer to purchase the product(s) 
                at the listed price. All orders are subject to acceptance by the seller and availability.
              </p>

              <h3>3.2 Pricing</h3>
              <p>
                All prices are displayed in Kenyan Shillings (KES) and include VAT where applicable. 
                We reserve the right to change prices at any time without prior notice.
              </p>

              <h3>3.3 Payment Methods</h3>
              <p>We accept the following payment methods:</p>
              <ul>
                <li>M-Pesa</li>
                <li>Visa/MasterCard credit/debit cards</li>
                <li>Bank transfers</li>
                <li>OmniFlow Wallet (where available)</li>
              </ul>

              <h3>3.4 Payment Processing</h3>
              <p>
                Payment is processed at the time of order placement. For card payments, we use secure 
                payment gateways that comply with PCI DSS standards.
              </p>
            </section>

            {/* Delivery & Returns */}
            <section id="delivery" className="terms-section">
              <h2>4. Delivery & Returns</h2>
              
              <h3>4.1 Delivery</h3>
              <p>
                Delivery times vary depending on the seller's location and the delivery method selected. 
                Standard delivery within major Kenyan cities is 3-7 business days.
              </p>
              <p>
                Delivery fees are calculated based on the delivery location and displayed at checkout. 
                You are responsible for providing accurate delivery information.
              </p>

              <h3>4.2 Returns Policy</h3>
              <p>You may return products within 7 days of delivery if:</p>
              <ul>
                <li>The product is defective or damaged</li>
                <li>The product is not as described</li>
                <li>You received the wrong product</li>
              </ul>
              <p>
                Returns must be in original packaging with all accessories. Some items (e.g., perishable goods, 
                personal care items) are not eligible for return.
              </p>

              <h3>4.3 Refunds</h3>
              <p>
                Refunds are processed within 7-14 business days after we receive and inspect the returned product. 
                Refunds will be issued to the original payment method.
              </p>
            </section>

            {/* Prohibited Activities */}
            <section id="prohibited" className="terms-section">
              <h2>5. Prohibited Activities</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Platform for any illegal purpose</li>
                <li>Sell counterfeit or stolen goods</li>
                <li>List prohibited items including but not limited to:
                  <ul>
                    <li>Illegal drugs and substances</li>
                    <li>Weapons and firearms</li>
                    <li>Stolen property</li>
                    <li>Counterfeit products</li>
                    <li>Pornographic material</li>
                    <li>Hazardous materials</li>
                  </ul>
                </li>
                <li>Engage in fraudulent activities</li>
                <li>Circumvent Platform fees</li>
                <li>Harass other users or Platform staff</li>
                <li>Use automated systems to access the Platform</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section id="intellectual" className="terms-section">
              <h2>6. Intellectual Property</h2>
              
              <h3>6.1 Platform Content</h3>
              <p>
                All content on the Platform, including text, graphics, logos, images, and software, is the 
                property of OmniFlow Technologies Ltd. or its licensors and is protected by copyright and 
                trademark laws.
              </p>

              <h3>6.2 User Content</h3>
              <p>
                By posting content on the Platform, you grant us a non-exclusive, worldwide, royalty-free 
                license to use, display, and distribute that content in connection with the Platform.
              </p>

              <h3>6.3 Trademarks</h3>
              <p>
                "OmniFlow", the OmniFlow logo, and related marks are trademarks of OmniFlow Technologies Ltd. 
                You may not use these marks without our prior written permission.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section id="liability" className="terms-section">
              <h2>7. Limitation of Liability</h2>
              
              <h3>7.1 Platform Services</h3>
              <p>
                The Platform is provided "as is" and "as available". We do not warrant that the Platform 
                will be uninterrupted, error-free, or completely secure.
              </p>

              <h3>7.2 Third-Party Sellers</h3>
              <p>
                OmniFlow acts as a marketplace connecting buyers and sellers. We are not responsible for:
              </p>
              <ul>
                <li>The quality, safety, or legality of products sold by third-party sellers</li>
                <li>The accuracy of product descriptions</li>
                <li>Seller fulfillment of orders</li>
                <li>Disputes between buyers and sellers</li>
              </ul>

              <h3>7.3 Liability Cap</h3>
              <p>
                To the maximum extent permitted by law, OmniFlow's total liability to you for any claims 
                arising from your use of the Platform shall not exceed the total amount paid by you to 
                OmniFlow in the 6 months preceding the claim.
              </p>
            </section>

            {/* Governing Law */}
            <section id="governing" className="terms-section">
              <h2>8. Governing Law</h2>
              
              <h3>8.1 Applicable Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of Kenya, 
                without regard to its conflict of law principles.
              </p>

              <h3>8.2 Dispute Resolution</h3>
              <p>
                Any disputes arising from these Terms shall first be attempted to be resolved through 
                negotiation. If unresolved, disputes shall be submitted to the exclusive jurisdiction 
                of the courts of Nairobi, Kenya.
              </p>

              <h3>8.3 Changes to Terms</h3>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective upon 
                posting to the Platform. Your continued use of the Platform after changes constitutes 
                acceptance of the modified Terms.
              </p>
            </section>

            {/* Contact Us */}
            <section id="contact" className="terms-section">
              <h2>9. Contact Us</h2>
              <p>For questions about these Terms, please contact us:</p>
              
              <div className="contact-info">
                <div className="contact-item">
                  <Mail size={18} />
                  <div>
                    <strong>Email:</strong>
                    <a href="mailto:legal@omniflowapp.co.ke">legal@omniflowapp.co.ke</a>
                  </div>
                </div>
                
                <div className="contact-item">
                  <Phone size={18} />
                  <div>
                    <strong>Phone:</strong>
                    <a href="tel:+254700000000">+254 700 000 000</a>
                  </div>
                </div>
                
                <div className="contact-item">
                  <MapPin size={18} />
                  <div>
                    <strong>Address:</strong>
                    <span>OmniFlow Technologies Ltd.<br />Nairobi, Kenya</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Acceptance Section */}
            <footer className="terms-footer">
              <div className="acceptance-box">
                <h3>Acceptance of Terms</h3>
                <p>
                  By using the OmniFlow Platform, you acknowledge that you have read, understood, and agree 
                  to be bound by these Terms and Conditions.
                </p>
                <div className="footer-meta">
                  <div className="meta-item">
                    <strong>Effective Date:</strong> {termsData.effectiveDate}
                  </div>
                  <div className="meta-item">
                    <strong>Version:</strong> {termsData.version}
                  </div>
                </div>
                <div className="footer-actions">
                  <Link to="/" className="btn-back">
                    <ArrowLeft size={18} />
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
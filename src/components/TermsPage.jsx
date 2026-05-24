// src/pages/TermsPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight,
  Home,
  FileText,
  Shield,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Truck,
  DollarSign,
  BookOpen,
  Lock,
  Award,
  HelpCircle,
  Globe,
  Menu,
  X
} from 'lucide-react';
import './TermsPage.css';

export default function TermsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('definitions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect dark mode from system preference
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.body.classList.contains('dark-mode') || 
                     (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkDarkMode();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const termsData = {
    lastUpdated: 'April 2026',
    effectiveDate: 'April 2026',
    version: '1.0'
  };

  const companyInfo = {
    name: 'OMNIFLOW GROUP LTD',
    regNo: 'BN-L3SD8Y27',
    address: 'Nairobi, Kenya, 00100',
    phone: '+254 745 456 476',
    email: 'info@omniflowapp.co.ke',
    website: 'omniflowapp.co.ke'
  };

  const tabs = [
    { id: 'definitions', label: 'Definitions' },
    { id: 'scope', label: 'Appointment' },
    { id: 'obligations', label: 'Obligations' },
    { id: 'listings', label: 'Listings' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'payments', label: 'Payments' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'returns', label: 'Returns' },
    { id: 'intellectual', label: 'IP Rights' },
    { id: 'data', label: 'Data Protection' },
    { id: 'prohibited', label: 'Prohibited' },
    { id: 'termination', label: 'Termination' },
    { id: 'liability', label: 'Liability' },
    { id: 'disputes', label: 'Disputes' },
    { id: 'general', label: 'General' },
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

  // Update active tab on scroll
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
    <div className={`terms-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Breadcrumb Navigation */}
      <div className="terms-breadcrumb">
        <div className="terms-container">
          <div className="terms-breadcrumb-wrapper">
            <Link to="/" className="terms-breadcrumb-link">
              <Home size={16} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} />
            <span className="terms-breadcrumb-current">Merchant Agreement</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="terms-tabs-wrapper">
        <div className="terms-container">
          <div className="terms-tabs-container">
            <button 
              className={`terms-tabs-mobile-toggle ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              <span>Quick Navigation</span>
            </button>
            <div className={`terms-tabs-scroll ${mobileMenuOpen ? 'open' : ''}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`terms-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="terms-main">
        <div className="terms-container">
          <div className="terms-content-wrapper">
            {/* Header */}
            <header className="terms-header">
              <div className="terms-company-badge">
                <Globe size={24} />
                <span className="terms-company-name">{companyInfo.name}</span>
              </div>
              <h1>Merchant Seller Agreement</h1>
              <div className="terms-meta">
                <div className="terms-meta-item">
                  <Clock size={16} />
                  <span>Version {termsData.version}</span>
                </div>
                <div className="terms-meta-item">
                  <FileText size={16} />
                  <span>Effective: {termsData.effectiveDate}</span>
                </div>
              </div>
              <div className="terms-notice">
                <AlertCircle size={20} />
                <p>
                  This Merchant Agreement governs the relationship between Omniflow Group Ltd. and Sellers 
                  using the Omniflow Platform. By registering as a seller, you agree to be bound by these terms.
                </p>
              </div>
            </header>

            {/* 1. Definitions */}
            <section id="definitions" className="terms-section">
              <h2>1. Definitions and Interpretation</h2>
              <p>In this Agreement, unless the context otherwise requires:</p>
              
              <div className="terms-definition-grid">
                <div className="terms-definition-item">
                  <strong>"Omniflow" / "Company" / "We" / "Us" / "Our"</strong>
                  <p>Omniflow Group Ltd., the operator of the online marketplace platform.</p>
                </div>
                <div className="terms-definition-item">
                  <strong>"Seller" / "Merchant" / "You" / "Your"</strong>
                  <p>The individual or entity registered to sell products/services through the Omniflow Platform.</p>
                </div>
                <div className="terms-definition-item">
                  <strong>"Platform"</strong>
                  <p>The Omniflow website, mobile application, and associated infrastructure enabling online transactions.</p>
                </div>
                <div className="terms-definition-item">
                  <strong>"Buyer" / "Customer"</strong>
                  <p>A user who purchases products or services through the Platform.</p>
                </div>
                <div className="terms-definition-item">
                  <strong>"Escrow"</strong>
                  <p>The secure holding of funds by Omniflow pending successful completion of an Order.</p>
                </div>
                <div className="terms-definition-item">
                  <strong>"Wallet"</strong>
                  <p>The Seller's digital account on the Platform where earnings are held.</p>
                </div>
              </div>
            </section>

            {/* 2. Appointment and Scope */}
            <section id="scope" className="terms-section">
              <h2>2. Appointment and Scope</h2>
              <h3>2.1 Appointment</h3>
              <p>
                Omniflow hereby appoints the Seller as an independent merchant on the Platform, and the Seller 
                accepts such appointment, to list and sell Products to Buyers through the Platform.
              </p>

              <h3>2.2 Non-Exclusivity</h3>
              <p>
                This Agreement is non-exclusive. The Seller retains the right to sell their Products through 
                any other channel, platform, or physical store.
              </p>

              <h3>2.3 Platform Purpose</h3>
              <p>
                The Platform serves as a marketplace connecting Sellers with potential Buyers. Omniflow does 
                not take ownership of Products at any time and is not a party to the direct transaction between 
                Seller and Buyer beyond facilitating payment processing and dispute resolution.
              </p>

              <h3>2.4 Relationship of Parties</h3>
              <p>
                The Seller is an independent contractor and not an employee, agent, joint venturer, or partner 
                of Omniflow. Nothing in this Agreement shall be construed to create any employment relationship.
              </p>
            </section>

            {/* 3. Seller Obligations */}
            <section id="obligations" className="terms-section">
              <h2>3. Seller Obligations and Representations</h2>
              
              <h3>3.1 Eligibility</h3>
              <p>The Seller represents and warrants that:</p>
              <ul>
                <li>The Seller is at least 18 years of age</li>
                <li>The Seller has the legal capacity to enter into this Agreement</li>
                <li>The Seller is properly registered as a business entity in Kenya (if applicable)</li>
                <li>The Seller possesses a valid KRA PIN and Tax Compliance Certificate</li>
                <li>The Seller has obtained all necessary permits, licenses, and approvals to sell the Products</li>
              </ul>

              <h3>3.2 Registration Information</h3>
              <p>The Seller agrees to provide accurate, current, and complete information during registration, including:</p>
              <ul>
                <li>Legal name and business name (if different)</li>
                <li>Physical address and contact information</li>
                <li>KRA PIN certificate</li>
                <li>Certificate of Incorporation or Business Registration (if applicable)</li>
                <li>Valid National ID Card or Passport</li>
                <li>Valid bank account or M-Pesa details for payouts</li>
              </ul>

              <h3>3.3 Ongoing Obligations</h3>
              <p>The Seller agrees to:</p>
              <ul>
                <li>Promptly update any registration information that changes</li>
                <li>Maintain all necessary licenses and permits throughout the term of this Agreement</li>
                <li>Comply with all applicable laws and regulations of the Republic of Kenya</li>
                <li>File and pay all applicable taxes, including but not limited to Income Tax and VAT</li>
                <li>Respond to Buyer inquiries within 24 hours</li>
                <li>Process Orders within 24 hours of receipt</li>
                <li>Maintain adequate stock levels of listed Products</li>
              </ul>
            </section>

            {/* 4. Product Listings */}
            <section id="listings" className="terms-section">
              <h2>4. Product Listing and Content Guidelines</h2>
              
              <h3>4.1 Listing Requirements</h3>
              <p>All Product listings must include:</p>
              <ul>
                <li>Accurate and truthful Product name and description</li>
                <li>Clear, high-quality images (minimum 3 per Product)</li>
                <li>Exact price in Kenyan Shillings (KSH)</li>
                <li>Stock quantity</li>
                <li>Product category (for correct commission application)</li>
                <li>Weight class (Small, Medium, or Heavy)</li>
                <li>Warranty information (if applicable)</li>
                <li>Return policy</li>
              </ul>

              <h3>4.2 Prohibited Content</h3>
              <p>Sellers shall not include in any Product listing:</p>
              <ul>
                <li>False, misleading, or deceptive information</li>
                <li>Images containing watermarks from other marketplaces</li>
                <li>Contact information (phone numbers, email addresses, or website URLs)</li>
                <li>Content that infringes any third-party intellectual property rights</li>
                <li>Obscene, offensive, or inappropriate content</li>
                <li>Price manipulation or artificially inflated original prices</li>
              </ul>
            </section>

            {/* 5. Pricing and Commissions */}
            <section id="pricing" className="terms-section">
              <h2>5. Pricing, Commissions, and Fees</h2>
              
              <h3>5.1 Commission Structure</h3>
              <div className="terms-table-responsive">
                <table className="terms-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Commission Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Electronics & Phones</td><td>3% - 5%</td></tr>
                    <tr><td>Fashion & Apparel</td><td>10% - 12%</td></tr>
                    <tr><td>Home & Kitchen</td><td>8%</td></tr>
                    <tr><td>Beauty & Health</td><td>10%</td></tr>
                    <tr><td>Groceries / FMCG</td><td>2.5%</td></tr>
                    <tr><td>Digital Services</td><td>12%</td></tr>
                    <tr><td>All Other Items</td><td>9%</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>5.2 Delivery Fee Commission</h3>
              <ul>
                <li><strong>Self-Delivery Sellers:</strong> Omniflow retains 5% of delivery fees collected</li>
                <li><strong>Omniflow-Managed Delivery Sellers:</strong> Omniflow retains 10% of delivery fees collected</li>
              </ul>

              <h3>5.3 No Other Fees</h3>
              <p>Omniflow does not charge:</p>
              <ul>
                <li>Listing fees</li>
                <li>Monthly subscription fees</li>
                <li>Account maintenance fees</li>
                <li>Withdrawal fees</li>
                <li>Any hidden fees</li>
              </ul>
            </section>

            {/* 6. Delivery */}
            <section id="delivery" className="terms-section">
              <h2>6. Delivery and Logistics</h2>
              
              <h3>6.1 Delivery Options</h3>
              <p>The Seller must select one of two delivery options:</p>
              
              <div className="terms-delivery-options">
                <div className="terms-delivery-option">
                  <Truck size={24} />
                  <h4>Option A: Self-Delivery</h4>
                  <p>Seller arranges delivery using own riders or courier services</p>
                  <ul>
                    <li>Seller receives 95% of delivery fees</li>
                    <li>Seller sets own delivery rates</li>
                    <li>Seller bears all delivery-related costs</li>
                    <li>Seller is responsible for delivery disputes</li>
                  </ul>
                </div>
                <div className="terms-delivery-option">
                  <Truck size={24} />
                  <h4>Option B: Omniflow-Managed Delivery</h4>
                  <p>Omniflow arranges delivery using professional riders</p>
                  <ul>
                    <li>Seller receives 90% of delivery fees</li>
                    <li>Omniflow sets delivery rates based on zone pricing</li>
                    <li>Omniflow manages delivery disputes</li>
                    <li>Seller benefits from nationwide coverage</li>
                  </ul>
                </div>
              </div>

              <h3>6.2 Delivery Timeframes</h3>
              <ul>
                <li>Sellers must dispatch Orders within 24 hours of receipt</li>
                <li>Estimated delivery times must be clearly communicated to Buyers</li>
                <li>Sellers are responsible for updating Order status accurately</li>
              </ul>
            </section>

            {/* 7. Payment Terms */}
            <section id="payments" className="terms-section">
              <h2>7. Payment Terms and Settlement</h2>
              
              <h3>7.1 Deposit Structure</h3>
              <ul>
                <li>Buyer pays 25% deposit upon Order placement</li>
                <li>Deposit is held in Omniflow Escrow Account</li>
                <li>Buyer pays remaining 75% upon delivery confirmation</li>
              </ul>

              <h3>7.2 Settlement Timeline</h3>
              <div className="terms-table-responsive">
                <table className="terms-table">
                  <thead><tr><th>Event</th><th>Timing</th></tr></thead>
                  <tbody>
                    <tr><td>Deposit received</td><td>Held in escrow</td></tr>
                    <tr><td>Order delivered</td><td>Awaiting confirmation</td></tr>
                    <tr><td>Buyer confirms delivery</td><td>Within 24 hours typically</td></tr>
                    <tr><td>Funds released to Seller Wallet</td><td>24-48 hours after confirmation</td></tr>
                    <tr><td>Seller may withdraw</td><td>Immediately upon Wallet credit</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>7.3 Withdrawals</h3>
              <div className="terms-table-responsive">
                <table className="terms-table">
                  <thead><tr><th>Withdrawal Method</th><th>Processing Time</th><th>Minimum</th></tr></thead>
                  <tbody>
                    <tr><td>M-Pesa</td><td>Instant</td><td>KSH 100</td></tr>
                    <tr><td>Bank Transfer</td><td>1-2 hours</td><td>KSH 500</td></tr>
                    <tr><td>PayPal</td><td>Instant</td><td>$10 equivalent</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 8. Escrow */}
            <section id="escrow" className="terms-section">
              <h2>8. Escrow Protection and Fund Holding</h2>
              
              <h3>8.1 Escrow Release Conditions</h3>
              <p>Funds shall be released from escrow only when:</p>
              <ul>
                <li>Buyer confirms delivery via OTP verification</li>
                <li>7 days have passed since delivery without any dispute</li>
                <li>Omniflow determines in its sole discretion that release is appropriate</li>
              </ul>

              <h3>8.2 Escrow Refunds to Buyer</h3>
              <p>Funds shall be refunded to the Buyer if:</p>
              <ul>
                <li>The Seller fails to deliver within the stated timeframe</li>
                <li>The Product is significantly different from description</li>
                <li>The Product is defective or damaged</li>
                <li>Omniflow determines refund is appropriate</li>
              </ul>
            </section>

            {/* 9. Returns */}
            <section id="returns" className="terms-section">
              <h2>9. Returns, Refunds, and Cancellations</h2>
              
              <h3>9.1 Buyer's Right to Cancel</h3>
              <ul>
                <li>Buyer may cancel an Order before dispatch without penalty</li>
                <li>Buyer may cancel after dispatch but before delivery, subject to a 50% cancellation fee</li>
                <li>Buyer may not cancel after delivery confirmation</li>
              </ul>

              <h3>9.2 Return Policy Requirements</h3>
              <ul>
                <li>Sellers must clearly state their return policy for each Product</li>
                <li>Minimum return period: 7 days for defective products</li>
                <li>Recommended return period: 14-30 days for customer satisfaction</li>
                <li>Return policies must comply with Kenyan consumer protection laws</li>
              </ul>

              <h3>9.3 Non-Returnable Items</h3>
              <ul>
                <li>Perishable goods (food, flowers)</li>
                <li>Personalized or customized items</li>
                <li>Digital products after download</li>
                <li>Intimate items (underwear, swimwear)</li>
                <li>Health and personal care items (opened)</li>
                <li>Hazardous materials</li>
              </ul>
            </section>

            {/* 10. Intellectual Property */}
            <section id="intellectual" className="terms-section">
              <h2>10. Intellectual Property Rights</h2>
              
              <h3>10.1 Seller's IP</h3>
              <ul>
                <li>The Seller retains all intellectual property rights in their Product images, descriptions, and branding</li>
                <li>The Seller grants Omniflow a non-exclusive, royalty-free license to display Seller content on the Platform</li>
                <li>The Seller warrants that they own or have license to all intellectual property in their listings</li>
              </ul>

              <h3>10.2 Omniflow's IP</h3>
              <ul>
                <li>Omniflow owns all intellectual property in the Platform, including software, design, and content</li>
                <li>The Seller may not copy, modify, or reverse engineer the Platform</li>
                <li>The Seller may not use Omniflow's trademarks without written permission</li>
              </ul>
            </section>

            {/* 11. Data Protection */}
            <section id="data" className="terms-section">
              <h2>11. Data Protection and Privacy</h2>
              
              <h3>11.1 Compliance with Kenyan Law</h3>
              <p>Both parties shall comply with the Data Protection Act, 2019 of Kenya.</p>

              <h3>11.2 Data Collection</h3>
              <ul>
                <li>Omniflow collects Buyer and Seller data necessary for Platform operation</li>
                <li>The Seller may only use Buyer data for Order fulfillment purposes</li>
                <li>The Seller may not use Buyer data for direct marketing without Buyer consent</li>
              </ul>
            </section>

            {/* 12. Prohibited Activities */}
            <section id="prohibited" className="terms-section">
              <h2>12. Prohibited Activities and Restricted Items</h2>
              
              <h3>12.1 Prohibited Products</h3>
              <div className="terms-table-responsive">
                <table className="terms-table">
                  <thead><tr><th>Category</th><th>Examples</th></tr></thead>
                  <tbody>
                    <tr><td>Illegal Items</td><td>Any product illegal under Kenyan law</td></tr>
                    <tr><td>Weapons</td><td>Firearms, knives, explosives, ammunition</td></tr>
                    <tr><td>Counterfeit Goods</td><td>Fake brand-name products</td></tr>
                    <tr><td>Stolen Property</td><td>Items without proof of legitimate origin</td></tr>
                    <tr><td>Adult Content</td><td>Pornography, adult toys, sexually explicit materials</td></tr>
                    <tr><td>Tobacco & Nicotine</td><td>Cigarettes, vaping products, nicotine</td></tr>
                    <tr><td>Alcohol</td><td>Beer, wine, spirits (without license)</td></tr>
                    <tr><td>Prescription Drugs</td><td>Medications requiring prescription</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 13. Termination */}
            <section id="termination" className="terms-section">
              <h2>13. Term and Termination</h2>
              
              <h3>13.1 Termination by Seller</h3>
              <p>The Seller may terminate this Agreement at any time by:</p>
              <ul>
                <li>Deleting all Product listings</li>
                <li>Providing 7 days' written notice to Omniflow</li>
                <li>Withdrawing all funds from the Seller Wallet</li>
              </ul>

              <h3>13.2 Termination by Omniflow</h3>
              <p>Omniflow may terminate this Agreement immediately upon notice if:</p>
              <ul>
                <li>The Seller violates any material term of this Agreement</li>
                <li>The Seller engages in fraudulent activity</li>
                <li>The Seller's actions harm Omniflow's reputation</li>
                <li>Required by law or regulatory authority</li>
              </ul>
            </section>

            {/* 14. Liability */}
            <section id="liability" className="terms-section">
              <h2>14. Liability and Indemnification</h2>
              
              <h3>14.1 Limitation of Liability</h3>
              <p>To the maximum extent permitted by Kenyan law, Omniflow's total liability to the Seller shall not exceed the total commissions paid by the Seller in the preceding 12 months.</p>

              <h3>14.2 No Warranty</h3>
              <p>The Platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.</p>
            </section>

            {/* 15. Dispute Resolution */}
            <section id="disputes" className="terms-section">
              <h2>15. Dispute Resolution</h2>
              
              <h3>15.1 Governing Law</h3>
              <p>This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya.</p>

              <h3>15.2 Arbitration</h3>
              <p>If mediation fails, disputes shall be resolved by binding arbitration under the Arbitration Act, 1995 of Kenya.</p>
            </section>

            {/* 16. General Provisions */}
            <section id="general" className="terms-section">
              <h2>16. General Provisions</h2>
              
              <h3>16.1 Entire Agreement</h3>
              <p>This Agreement constitutes the entire agreement between the parties.</p>

              <h3>16.2 Amendments</h3>
              <p>Omniflow may amend this Agreement upon 30 days' written notice.</p>
            </section>

            {/* Contact Information */}
            <section id="contact" className="terms-section">
              <h2>Contact Information</h2>
              
              <div className="terms-contact-grid">
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><Globe size={20} /></div>
                  <div><strong>Company Name</strong><span>{companyInfo.name}</span></div>
                </div>
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><FileText size={20} /></div>
                  <div><strong>Registration Number</strong><span>{companyInfo.regNo}</span></div>
                </div>
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><MapPin size={20} /></div>
                  <div><strong>Physical Address</strong><span>{companyInfo.address}</span></div>
                </div>
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><Phone size={20} /></div>
                  <div><strong>Phone Number</strong><a href={`tel:${companyInfo.phone}`}>{companyInfo.phone}</a></div>
                </div>
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><Mail size={20} /></div>
                  <div><strong>Email Address</strong><a href={`mailto:${companyInfo.email}`}>{companyInfo.email}</a></div>
                </div>
                <div className="terms-contact-item">
                  <div className="terms-contact-icon"><Globe size={20} /></div>
                  <div><strong>Website</strong><a href={`https://${companyInfo.website}`}>{companyInfo.website}</a></div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="terms-footer">
              <div className="terms-acceptance">
                <h3>Acceptance of Agreement</h3>
                <p>By registering as a seller on the Omniflow Platform, you acknowledge that you have read, understood, and agree to be bound by this Merchant Agreement.</p>
                <div className="terms-footer-meta">
                  <div className="terms-meta-item"><strong>Effective Date:</strong> {termsData.effectiveDate}</div>
                  <div className="terms-meta-item"><strong>Version:</strong> {termsData.version}</div>
                </div>
                <Link to="/" className="terms-back-btn">
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
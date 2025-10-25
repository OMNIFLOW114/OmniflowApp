import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/supabase';
import { toast } from 'react-hot-toast';
import './HelpCenter.css';

const HelpCenter = () => {
  const [activeTab, setActiveTab] = useState('faq');
  const [openCategory, setOpenCategory] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const helpData = {
    categories: [
      {
        id: 'getting-started',
        title: '🚀 Getting Started',
        icon: '🚀',
        questions: [
          {
            q: 'How do I create a CampusMart account?',
            a: 'Download the CampusMart app from your app store, tap "Sign Up", and use your campus email or phone number. You\'ll need to verify your student status to access all marketplace features.'
          },
          {
            q: 'How do I verify my student status?',
            a: 'Go to Profile → Verify Student → Upload your student ID card or use your official campus email address. Verification is usually completed within 24-48 hours.'
          },
          {
            q: 'Is CampusMart completely free to use?',
            a: 'Yes! CampusMart is free for all students. We only charge small commissions (5-10%) on successful sales to maintain and improve the platform.'
          }
        ]
      },
      {
        id: 'buying',
        title: '🛒 Buying & Orders',
        icon: '🛒',
        questions: [
          {
            q: 'How do I purchase items on CampusMart?',
            a: 'Browse products, tap on one you like, select options (size, color, etc.), and tap "Buy Now". Choose your payment method (M-Pesa, card, or wallet) and delivery preference.'
          },
          {
            q: 'What payment methods are accepted?',
            a: 'We accept M-Pesa, credit/debit cards, CampusMart Wallet balance, and cash on delivery for eligible items within campus areas.'
          },
          {
            q: 'How does the "Lipa Polepole" installment plan work?',
            a: 'Look for products with the "Lipa Polepole" badge. Pay a small deposit (usually 20-30%) and spread the remaining amount over 1-6 months. Perfect for textbooks and electronics!'
          },
          {
            q: 'What if I receive a damaged or wrong item?',
            a: 'Contact the seller within 24 hours of delivery. If unresolved, report to CampusMart support with photos/videos. We offer buyer protection on all transactions.'
          }
        ]
      },
      {
        id: 'selling',
        title: '🏪 Selling & Stores',
        icon: '🏪',
        questions: [
          {
            q: 'How do I create my own store?',
            a: 'Go to Profile → My Store → Create Store. Provide basic info about your store. For larger stores, identity verification may be required.'
          },
          {
            q: 'What items can I sell on CampusMart?',
            a: 'Textbooks, electronics, furniture, clothing, accessories, services (tutoring, design), and campus-appropriate items. Prohibited items include alcohol, weapons, illegal substances, and explicit content.'
          },
          {
            q: 'How much commission does CampusMart charge?',
            a: 'We charge 5-10% commission on successful sales, depending on the product category. There are no listing fees or monthly charges.'
          },
          {
            q: 'When and how do I get paid for my sales?',
            a: 'Earnings go directly to your CampusMart Wallet after the buyer confirms receipt. You can withdraw to M-Pesa or bank account once you reach the minimum withdrawal amount of KSh 100.'
          }
        ]
      },
      {
        id: 'delivery',
        title: '🚚 Delivery & Pickup',
        icon: '🚚',
        questions: [
          {
            q: 'How does campus delivery work?',
            a: 'We have verified campus delivery agents who can pick up and deliver items between students on the same campus. Delivery fees start from KSh 50.'
          },
          {
            q: 'What are safe meeting points?',
            a: 'Designated safe spots on campus include library entrances, student centers, main gates, and campus cafeterias. Always meet during daylight hours.'
          },
          {
            q: 'Can I deliver items between different campuses?',
            a: 'Yes! We offer inter-campus delivery services. Delivery times and costs vary based on distance between campuses.'
          },
          {
            q: 'How do I track my delivery?',
            a: 'Go to Orders → Track Delivery to see real-time updates and your delivery agent\'s location and contact information.'
          }
        ]
      },
      {
        id: 'wallet',
        title: '💰 Wallet & Payments',
        icon: '💰',
        questions: [
          {
            q: 'How do I add money to my CampusMart Wallet?',
            a: 'Go to Wallet → Deposit → Choose M-Pesa or card. Follow the prompts to complete the transaction. Deposits are instant and secure.'
          },
          {
            q: 'Is my money safe in the CampusMart Wallet?',
            a: 'Absolutely! We use bank-level security encryption and escrow services. Your funds are protected until you confirm receipt of your orders.'
          },
          {
            q: 'How do I withdraw money from my wallet?',
            a: 'Go to Wallet → Withdraw → Enter amount and M-Pesa number. Withdrawals process within 24 hours, usually much faster.'
          },
          {
            q: 'Are there any fees for deposits or withdrawals?',
            a: 'Deposits are free. Withdrawals have a small fee of KSh 10 to cover transaction costs. No hidden charges.'
          }
        ]
      },
      {
        id: 'safety',
        title: '🛡️ Safety & Trust',
        icon: '🛡️',
        questions: [
          {
            q: 'How does CampusMart ensure transaction safety?',
            a: 'We use escrow payments, verified student profiles, rating systems, and 24/7 moderation to ensure safe transactions for everyone.'
          },
          {
            q: 'What should I do if I encounter a scam?',
            a: 'Immediately report the user through their profile, contact support, and provide evidence. We investigate all reports promptly.'
          },
          {
            q: 'Are meetups safe on campus?',
            a: 'Always use designated safe meeting points, meet during daylight hours, and bring a friend if possible. Trust your instincts.'
          },
          {
            q: 'How are users verified on CampusMart?',
            a: 'We verify student status through campus emails, student ID uploads, and in some cases, campus administration verification.'
          }
        ]
      }
    ]
  };

  const quickActions = [
    { icon: '📱', label: 'Contact Support', action: () => setActiveTab('contact') },
    { icon: '🛒', label: 'My Orders', link: '/orders' },
    { icon: '🏪', label: 'My Store', link: '/store' },
    { icon: '💰', label: 'Wallet', link: '/wallet' },
    { icon: '📦', label: 'Track Delivery', link: '/delivery' },
    { icon: '🔄', label: 'Returns', link: '/returns' }
  ];

  const filteredCategories = helpData.categories.filter(category =>
    category.questions.some(q =>
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('feedback').insert([
        {
          rating: 0,
          message: `Contact Form - ${contactForm.subject}: ${contactForm.message}`,
          created_at: new Date().toISOString(),
          metadata: {
            type: 'contact_form',
            category: contactForm.category,
            email: contactForm.email,
            name: contactForm.name
          }
        }
      ]);

      if (error) throw error;

      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    try {
      const { error } = await supabase.from('feedback').insert([
        {
          rating: rating || 5,
          message: feedback,
          created_at: new Date().toISOString(),
          metadata: {
            type: 'app_feedback',
            rating: rating
          }
        }
      ]);

      if (error) throw error;

      toast.success('Thank you for your feedback! 💫');
      setRating(0);
      setFeedback('');
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const toggleCategory = (categoryId) => {
    setOpenCategory(openCategory === categoryId ? null : categoryId);
  };

  const toggleQuestion = (questionIndex) => {
    setOpenQuestion(openQuestion === questionIndex ? null : questionIndex);
  };

  return (
    <div className="help-center">
      {/* Hero Section */}
      <section className="help-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <h1>How can we help you today?</h1>
          <p>Get answers, contact support, or share feedback about CampusMart</p>
          
          {/* Search Bar */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h2>Quick Help</h2>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <motion.div
              key={index}
              className="action-card"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.action}
            >
              <div className="action-icon">{action.icon}</div>
              <span>{action.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="help-tabs">
        <button
          className={`tab ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          ❓ FAQ
        </button>
        <button
          className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          📞 Contact
        </button>
        <button
          className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          💬 Feedback
        </button>
        <button
          className={`tab ${activeTab === 'guides' ? 'active' : ''}`}
          onClick={() => setActiveTab('guides')}
        >
          📚 Guides
        </button>
      </nav>

      {/* FAQ Section */}
      {activeTab === 'faq' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="faq-section"
        >
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
            <p>Find quick answers to common questions</p>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No results found</h3>
              <p>Try searching with different keywords or browse the categories below</p>
            </div>
          ) : (
            <div className="categories-list">
              {filteredCategories.map((category, categoryIndex) => (
                <div key={category.id} className="category-card">
                  <button
                    className="category-header"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="category-title">
                      <span className="category-icon">{category.icon}</span>
                      <h3>{category.title}</h3>
                    </div>
                    <span className="toggle-icon">
                      {openCategory === category.id ? '−' : '+'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {openCategory === category.id && (
                      <motion.div
                        className="category-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {category.questions.map((question, questionIndex) => (
                          <div key={questionIndex} className="question-item">
                            <button
                              className="question-button"
                              onClick={() => toggleQuestion(`${category.id}-${questionIndex}`)}
                            >
                              <span className="question-text">{question.q}</span>
                              <span className="question-toggle">
                                {openQuestion === `${category.id}-${questionIndex}` ? '−' : '+'}
                              </span>
                            </button>

                            <AnimatePresence>
                              {openQuestion === `${category.id}-${questionIndex}` && (
                                <motion.div
                                  className="answer-content"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <p>{question.a}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* Contact Section */}
      {activeTab === 'contact' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="contact-section"
        >
          <div className="section-header">
            <h2>Contact Support</h2>
            <p>Get help from our dedicated support team</p>
          </div>

          <div className="contact-methods">
            <div className="contact-card">
              <div className="contact-icon">💬</div>
              <h3>Live Chat</h3>
              <p>Instant help from our support team</p>
              <button className="contact-btn primary">
                Start Live Chat
              </button>
              <small>Available 24/7</small>
            </div>

            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h3>Email Support</h3>
              <p>Detailed help via email</p>
              <a href="mailto:support@campusmart.com" className="contact-btn">
                support@campusmart.com
              </a>
              <small>Response within 24 hours</small>
            </div>

            <div className="contact-card">
              <div className="contact-icon">📱</div>
              <h3>Phone Support</h3>
              <p>Talk directly with our team</p>
              <a href="tel:+254700000000" className="contact-btn">
                +254 700 000 000
              </a>
              <small>Mon-Fri, 8AM-6PM</small>
            </div>

            <div className="contact-card">
              <div className="contact-icon">🏫</div>
              <h3>Campus Help Desk</h3>
              <p>Visit your campus help desk</p>
              <button className="contact-btn">
                Find Locations
              </button>
              <small>All major campuses</small>
            </div>
          </div>

          <div className="contact-form-section">
            <h3>Send us a message</h3>
            <form onSubmit={handleContactSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="safety">Safety Concern</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows="6"
                  placeholder="Describe your issue or question in detail..."
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                Send Message
              </button>
            </form>
          </div>
        </motion.section>
      )}

      {/* Feedback Section */}
      {activeTab === 'feedback' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="feedback-section"
        >
          <div className="section-header">
            <h2>Share Your Feedback</h2>
            <p>Help us improve CampusMart for everyone</p>
          </div>

          <div className="feedback-content">
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              <div className="rating-section">
                <label>How would you rate your experience?</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= rating ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <div className="rating-labels">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div className="feedback-input">
                <label>Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What do you love about CampusMart? What can we improve? Any features you'd like to see?"
                  rows="6"
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn large">
                Submit Feedback
              </button>
            </form>

            <div className="feature-requests">
              <h3>💡 Have a feature idea?</h3>
              <p>We're always looking for ways to make CampusMart better for students</p>
              <button 
                className="feature-btn"
                onClick={() => toast.success("Feature request submitted! We'll review it.")}
              >
                Suggest a Feature
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Guides Section */}
      {activeTab === 'guides' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="guides-section"
        >
          <div className="section-header">
            <h2>Helpful Guides</h2>
            <p>Step-by-step tutorials and resources</p>
          </div>

          <div className="guides-grid">
            <div className="guide-card">
              <div className="guide-icon">🛒</div>
              <h3>Buying Guide</h3>
              <p>Learn how to safely purchase items on CampusMart</p>
              <button className="guide-btn">Read Guide</button>
            </div>

            <div className="guide-card">
              <div className="guide-icon">🏪</div>
              <h3>Selling Guide</h3>
              <p>Maximize your sales with our seller tips</p>
              <button className="guide-btn">Read Guide</button>
            </div>

            <div className="guide-card">
              <div className="guide-icon">💰</div>
              <h3>Payment Guide</h3>
              <p>Understand all payment methods and security</p>
              <button className="guide-btn">Read Guide</button>
            </div>

            <div className="guide-card">
              <div className="guide-icon">🛡️</div>
              <h3>Safety Guide</h3>
              <p>Stay safe while buying and selling on campus</p>
              <button className="guide-btn">Read Guide</button>
            </div>
          </div>

          <div className="video-guides">
            <h3>Video Tutorials</h3>
            <div className="video-grid">
              <div className="video-card">
                <div className="video-thumbnail">
                  <div className="play-icon">▶</div>
                </div>
                <h4>Getting Started with CampusMart</h4>
                <span>5:24</span>
              </div>
              <div className="video-card">
                <div className="video-thumbnail">
                  <div className="play-icon">▶</div>
                </div>
                <h4>How to Create Your Store</h4>
                <span>7:12</span>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Footer */}
      <footer className="help-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>📞 Emergency Support</h4>
            <p>For urgent safety or transaction issues</p>
            <a href="tel:+254711000000" className="emergency-link">+254 711 000 000</a>
          </div>
          
          <div className="footer-section">
            <h4>🕒 Support Hours</h4>
            <p>Live Chat: 24/7</p>
            <p>Phone: Mon-Fri, 8AM-6PM</p>
            <p>Email: 24/7 (response within 24h)</p>
          </div>
          
          <div className="footer-section">
            <h4>🔗 Quick Links</h4>
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/community">Community Guidelines</a>
              <a href="/safety">Safety Tips</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2024 CampusMart - Making Campus Life Better Together</p>
          <p>Version 2.1.0 • Built for Students</p>
        </div>
      </footer>
      <div className="bottom-nav-spacer"></div>
    </div>
  );
};

export default HelpCenter;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabase';
import '../components/HelpCenter.css';
import { FaHeadset, FaStar, FaInfoCircle, FaRocket, FaLink, FaQuestion, FaPlayCircle } from 'react-icons/fa';

const HelpCenter = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const faqs = [
    {
      question: '💡 How do I sign up and get started?',
      answer:
        'Tap "Sign Up" → Choose Google or Phone. Complete your profile with basic info. You’re ready to go!',
    },
    {
      question: '📱 How do I change my phone number?',
      answer:
        'Go to Settings → Security → Change Phone Number. You’ll verify the new number via OTP.',
    },
    {
      question: '🔐 I forgot my password!',
      answer:
        'Don’t panic. On login screen → tap "Forgot Password" → Follow recovery using phone/email.',
    },
    {
      question: '📞 How can I contact support?',
      answer:
        'Use the live chat below for instant help or email support@omniflow.com.',
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(index === openIndex ? null : index);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('feedback').insert([
        {
          rating,
          message: feedback,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      toast.success('💌 Thank you for your feedback!');
      setRating(0);
      setFeedback('');
    } catch (err) {
      toast.error('❌ Failed to submit feedback');
    }
  };

  return (
    <div className="help-center">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="help-title">
        🛟 OmniFlow Help Med Bay
      </motion.h1>
      <p className="help-subtitle">The only place you need to navigate, learn and master this app.</p>

      <section className="faq-section">
        {faqs.map((item, index) => (
          <div key={index} className="faq-item">
            <button className="faq-question" onClick={() => toggleFAQ(index)}>
              <FaQuestion className="icon" /> {item.question}
              <span>{openIndex === index ? '−' : '+'}</span>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.p
                  className="faq-answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  {item.answer}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      <section className="visual-guide">
        <h2><FaPlayCircle /> Visual App Guide</h2>
        <p>Need a walkthrough? Watch our quick onboarding video.</p>
        <button className="guide-button" onClick={() => setShowGuide(true)}>Open Guide</button>
        {showGuide && (
          <div className="guide-modal">
            <div className="modal-content">
              <iframe
                width="100%"
                height="315"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="App Guide"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <button onClick={() => setShowGuide(false)}>Close</button>
            </div>
          </div>
        )}
      </section>

      <section className="live-chat">
        <h2><FaHeadset /> Live Chat</h2>
        <p>Get instant help from our team.</p>
        <button className="chat-button" onClick={() => setIsChatOpen(!isChatOpen)}>
          {isChatOpen ? 'Close Chat' : 'Start Live Chat'}
        </button>
        {isChatOpen && (
          <div className="chat-box">
            <p>This is a placeholder for future real-time support chat integration.</p>
          </div>
        )}
      </section>

      <section className="feedback-form">
        <h2><FaStar /> Rate Your Experience</h2>
        <form onSubmit={submitFeedback}>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= rating ? 'star filled' : 'star'}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what’s on your mind..."
            required
          />
          <button type="submit" className="submit-feedback">Send Feedback</button>
        </form>
      </section>

      <section className="navigation-hints">
        <h2><FaRocket /> Navigate the App</h2>
        <div className="quick-nav">
          <a href="/dashboard"><FaLink /> Go to Dashboard</a>
          <a href="/wallet"><FaLink /> Manage Wallet</a>
          <a href="/store"><FaLink /> Open Store</a>
          <a href="/settings"><FaLink /> Account Settings</a>
        </div>
      </section>

      <footer className="policy-links">
        <a href="/privacy-policy"><FaInfoCircle /> Privacy Policy</a>
        <a href="/terms"><FaInfoCircle /> Terms & Conditions</a>
      </footer>
    </div>
  );
};

export default HelpCenter;

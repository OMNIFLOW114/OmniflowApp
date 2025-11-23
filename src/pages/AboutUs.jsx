// src/pages/AboutUs.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  FaRocket, 
  FaUsers, 
  FaHandshake, 
  FaShippingFast,
  FaGraduationCap,
  FaMoneyBillWave,
  FaShieldAlt,
  FaStar,
  FaChartLine,
  FaAward,
  FaHeart,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaTwitter,
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaDownload,
  FaStore,
  FaUniversity,
  FaGlobeAfrica,
  FaArrowRight,
  FaCheckCircle,
  FaCrown,
  FaLightbulb,
  FaRegSmile
} from 'react-icons/fa';
import './AboutUs.css';

const AboutUs = () => {
  // SEO Data
  const seoData = {
    title: "Kirangi John Njeru - Founder & CEO of OmniFlow Marketplace Kenya",
    description: "Meet Kirangi John Njeru, JKUAT Economics student and Founder of OmniFlow - Kenya's student-powered e-commerce marketplace. Lipa Mdogo Mdogo, zero commission stores, same-day delivery.",
    keywords: "Kirangi John Njeru, OmniFlow CEO, JKUAT student entrepreneur, Kenyan e-commerce, Lipa Mdogo Mdogo, student marketplace Kenya",
    canonical: "https://omniflowapp.co.ke/about",
    image: "https://omniflowapp.co.ke/images/kirangi-john-njeru.jpg"
  };

  // Structured Data for Google
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Kirangi John Njeru",
    "jobTitle": "Founder & CEO",
    "worksFor": {
      "@type": "Organization",
      "name": "OmniFlow Technologies",
      "url": "https://omniflowapp.co.ke"
    },
    "description": "Founder and CEO of OmniFlow Marketplace Kenya. BSc Economics student at Jomo Kenyatta University of Agriculture and Technology (JKUAT). Building Kenya's student-powered e-commerce revolution.",
    "alumniOf": {
      "@type": "EducationalOrganization",
      "name": "Jomo Kenyatta University of Agriculture and Technology"
    },
    "birthDate": "2003",
    "birthPlace": {
      "@type": "Place",
      "name": "Kenya"
    },
    "email": "omniflow718@gmail.com",
    "telephone": "+254745456476",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "Kenya"
    },
    "sameAs": [
      "https://twitter.com/search?q=omniflow%20marketplace%20kenya",
      "https://www.instagram.com/explore/tags/omniflowkenya/",
      "https://www.facebook.com/search/top?q=omniflow%20marketplace%20kenya"
    ]
  };

  // Company Structured Data
  const companyStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "OmniFlow Technologies",
    "alternateName": "OmniFlow Marketplace Kenya",
    "url": "https://omniflowapp.co.ke",
    "logo": "https://omniflowapp.co.ke/logo.png",
    "description": "Kenya's student-powered e-commerce marketplace. Built by students for students and local shops. Features Lipa Mdogo Mdogo, zero commission stores, and same-day delivery.",
    "founder": {
      "@type": "Person",
      "name": "Kirangi John Njeru"
    },
    "foundingDate": "2025-10-10",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "Kenya"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+254-745-456-476",
      "contactType": "customer service",
      "email": "omniflow718@gmail.com",
      "areaServed": "KE",
      "availableLanguage": ["English", "Swahili"]
    },
    "sameAs": [
      "https://twitter.com/search?q=omniflow%20marketplace%20kenya",
      "https://www.instagram.com/explore/tags/omniflowkenya/",
      "https://www.facebook.com/search/top?q=omniflow%20marketplace%20kenya"
    ]
  };

  // Enhanced animations
  const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  // Rest of your component code remains the same...
  const viralStats = [
    { number: '1,000', label: 'FREE Stores', sublabel: 'for pioneers', icon: <FaCrown />, color: '#FFD700' },
    { number: '50K', label: 'Target Users', sublabel: 'by March 2026', icon: <FaUsers />, color: '#00D4AA' },
    { number: '20%', label: 'Market Share', sublabel: '$922M opportunity', icon: <FaChartLine />, color: '#6366F1' },
    { number: '0%', label: 'Commission', sublabel: 'for first sellers', icon: <FaMoneyBillWave />, color: '#10B981' }
  ];

  const killerFeatures = [
    {
      icon: <FaMoneyBillWave />,
      title: 'Lipa Mdogo Mdogo',
      description: 'Break barriers with our revolutionary buy-now-pay-later system',
      gradient: 'from-yellow-400 to-orange-500',
      emoji: '💸'
    },
    {
      icon: <FaUniversity />,
      title: 'Student Power',
      description: 'Exclusive marketplace built by students, for students',
      gradient: 'from-blue-400 to-cyan-500',
      emoji: '🎓'
    },
    {
      icon: <FaShippingFast />,
      title: 'Lightning Fast',
      description: 'Same-day delivery across major Kenyan cities',
      gradient: 'from-green-400 to-emerald-500',
      emoji: '⚡'
    },
    {
      icon: <FaShieldAlt />,
      title: 'OmniCash Wallet',
      description: 'Secure digital wallet for seamless transactions',
      gradient: 'from-purple-400 to-pink-500',
      emoji: '🔒'
    }
  ];

  const founderStory = {
    name: 'Kirangi John Njeru',
    title: 'The Student Changing Kenyan E-Commerce',
    role: 'Founder & CEO',
    education: 'BSc Economics Student @ JKUAT',
    achievement: 'Bootstrapping Kenya\'s fastest-growing marketplace while studying',
    mission: 'Making millionaires out of students and small business owners',
    stats: [
      { value: '22', label: 'Years Old' },
      { value: 'JKUAT', label: 'Campus' },
      { value: '100%', label: 'Kenyan Made' }
    ]
  };

  const socialProof = [
    { text: "Finally, an app that gets Kenyan students!", source: "University Student" },
    { text: "Lipa Mdogo Mdogo changed my business", source: "Small Shop Owner" },
    { text: "The future of Kenyan e-commerce is here", source: "Tech Investor" }
  ];

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="author" content="Kirangi John Njeru" />
        <link rel="canonical" href={seoData.canonical} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={seoData.canonical} />
        <meta property="og:image" content={seoData.image} />
        <meta property="og:site_name" content="OmniFlow Marketplace Kenya" />
        <meta property="og:locale" content="en_KE" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content={seoData.image} />
        <meta name="twitter:creator" content="@omniflowkenya" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(companyStructuredData)}
        </script>
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="geo.region" content="KE" />
        <meta name="geo.placename" content="Nairobi" />
        <meta name="geo.position" content="-1.286389;36.817223" />
        <meta name="ICBM" content="-1.286389, 36.817223" />
      </Helmet>

      <div className="omni-about-page">
        {/* Hero Section - Now with proper semantic HTML */}
        <header className="hero-viral" role="banner">
          <div className="hero-bg-glow"></div>
          <div className="container">
            <motion.div
              className="hero-content"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div
                className="viral-badge"
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
              >
                <FaRocket className="badge-rocket" />
                <span>KENYA'S E-COMMERCE REVOLUTION STARTS HERE</span>
              </motion.div>

              <motion.h1
                className="hero-title-viral"
                variants={fadeInUp}
              >
                From <span className="text-gradient">Campus Dreams</span> 
                <br />
                to <span className="text-gradient">Marketplace Empire</span>
              </motion.h1>

              <motion.p
                className="hero-subtitle-viral"
                variants={fadeInUp}
              >
                OmniFlow isn't just an app - it's a movement. Built by a JKUAT student 
                who turned classroom frustrations into Kenya's next unicorn startup. 
                Join the revolution that's making e-commerce work for EVERY Kenyan.
              </motion.p>

              <motion.div
                className="hero-actions-viral"
                variants={fadeInUp}
              >
                <motion.a
                  href="https://omniflowapp.co.ke/download"
                  className="btn-viral btn-download"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(255, 215, 0, 0.3)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaDownload />
                  <span>Join The Revolution - FREE</span>
                  <FaArrowRight />
                </motion.a>
                
                <motion.button
                  className="btn-viral btn-seller"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaStore />
                  <span>Start Selling - 0% Commission</span>
                </motion.button>
              </motion.div>

              {/* Viral Stats */}
              <motion.div
                className="viral-stats-grid"
                variants={staggerContainer}
              >
                {viralStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    className="stat-card-viral"
                    whileHover={{ 
                      y: -8,
                      transition: { duration: 0.3 }
                    }}
                    variants={fadeInUp}
                  >
                    <div 
                      className="stat-icon-wrapper"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <div style={{ color: stat.color }}>{stat.icon}</div>
                    </div>
                    <div className="stat-number" style={{ color: stat.color }}>
                      {stat.number}
                    </div>
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-sublabel">{stat.sublabel}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </header>

        {/* The Problem & Solution - Enhanced with semantic HTML */}
        <section className="story-section-viral" aria-labelledby="founder-story">
          <div className="container">
            <div className="story-grid">
              <motion.div
                className="problem-side"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="section-badge">THE PROBLEM</div>
                <h2>E-commerce was broken for Kenyans</h2>
                <div className="pain-points">
                  {[
                    "Too expensive for students & small shops",
                    "Complicated platforms nobody understands", 
                    "No flexibility in payments",
                    "Foreign apps that don't get our hustle"
                  ].map((point, index) => (
                    <motion.div
                      key={point}
                      className="pain-point"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="pain-icon">💔</div>
                      <span>{point}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="solution-side"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="section-badge success">THE SOLUTION</div>
                <h2 id="founder-story">OmniFlow was born in a JKUAT lecture hall</h2>
                <motion.div
                  className="founder-story-card"
                  whileHover={{ scale: 1.02 }}
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <div className="founder-avatar">
                    <img 
                      src="/images/kirangi-john-njeru.jpg" 
                      alt="Kirangi John Njeru - Founder & CEO of OmniFlow Marketplace Kenya"
                      itemProp="image"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="avatar-badge">CEO</div>
                  </div>
                  <div className="founder-content">
                    <h3 itemProp="name">{founderStory.name}</h3>
                    <p className="founder-title" itemProp="jobTitle">{founderStory.role}</p>
                    <p className="founder-education" itemProp="alumniOf">{founderStory.education}</p>
                    <p className="founder-mission" itemProp="description">{founderStory.mission}</p>
                    
                    <div className="founder-stats">
                      {founderStory.stats.map((stat, index) => (
                        <div key={stat.label} className="founder-stat">
                          <div className="stat-value">{stat.value}</div>
                          <div className="stat-label">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Hidden SEO-rich content */}
                    <div style={{ display: 'none' }} itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                      <span itemProp="addressLocality">Nairobi</span>
                      <span itemProp="addressCountry">Kenya</span>
                    </div>
                    <div style={{ display: 'none' }} itemProp="worksFor" itemScope itemType="https://schema.org/Organization">
                      <span itemProp="name">OmniFlow Technologies</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Rest of your sections remain the same but with proper heading hierarchy */}
        <section className="features-viral" aria-labelledby="features-heading">
          <div className="container">
            <motion.div
              className="section-header-viral"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="section-badge">WHY WE'RE DIFFERENT</div>
              <h2 id="features-heading">Features that will make you say <span className="text-gradient">"Finally!"</span></h2>
            </motion.div>

            <div className="features-grid-viral">
              {killerFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="feature-card-viral"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.7 }}
                  whileHover={{ 
                    y: -10,
                    transition: { duration: 0.3 }
                  }}
                  viewport={{ once: true }}
                >
                  <div className={`feature-icon-viral ${feature.gradient}`}>
                    {feature.icon}
                    <div className="feature-emoji">{feature.emoji}</div>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <motion.div
                    className="feature-cta"
                    whileHover={{ x: 5 }}
                  >
                    <span>Learn more</span>
                    <FaArrowRight />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="social-proof-section" aria-labelledby="testimonials-heading">
          <div className="container">
            <motion.div
              className="social-proof-content"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 id="testimonials-heading">Kenya is talking about OmniFlow</h2>
              <div className="testimonials-grid">
                {socialProof.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.source}
                    className="testimonial-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.6 }}
                    viewport={{ once: true }}
                    itemScope
                    itemType="https://schema.org/Review"
                  >
                    <div className="testimonial-text" itemProp="reviewBody">"{testimonial.text}"</div>
                    <div className="testimonial-source" itemProp="author">— {testimonial.source}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="mission-viral" aria-labelledby="mission-vision-heading">
          <div className="mission-bg"></div>
          <div className="container">
            <div className="mission-grid-viral">
              <motion.div
                className="mission-card-viral"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <FaRocket className="mission-icon-viral" />
                <h3>Our Mission</h3>
                <p>
                  To tear down every barrier stopping Kenyans from buying and selling online. 
                  We're making e-commerce so simple, affordable, and accessible that even a 
                  student with a smartphone can build an empire.
                </p>
                <div className="mission-highlights">
                  <div className="highlight">
                    <FaCheckCircle />
                    <span>Lipa Mdogo Mdogo for everyone</span>
                  </div>
                  <div className="highlight">
                    <FaCheckCircle />
                    <span>Zero commission for pioneers</span>
                  </div>
                  <div className="highlight">
                    <FaCheckCircle />
                    <span>Lightning-fast delivery</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="vision-card-viral"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <FaStar className="vision-icon-viral" />
                <h3>Our Vision</h3>
                <p>
                  To become Kenya's #1 e-commerce marketplace by 2027, creating more 
                  young millionaires than any other platform in history. We're not just 
                  building an app - we're building the future of Kenyan entrepreneurship.
                </p>
                <div className="vision-targets">
                  <div className="target">
                    <div className="target-number">#1</div>
                    <div className="target-text">in Kenya by 2027</div>
                  </div>
                  <div className="target">
                    <div className="target-number">1M+</div>
                    <div className="target-text">young entrepreneurs</div>
                  </div>
                  <div className="target">
                    <div className="target-number">$1B+</div>
                    <div className="target-text">in transactions</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta" aria-labelledby="cta-heading">
          <div className="cta-bg-glow"></div>
          <div className="container">
            <motion.div
              className="cta-content-viral"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 id="cta-heading">Ready to join the revolution?</h2>
              <p>
                Don't just watch from the sidelines. Be part of the story that's changing 
                Kenyan e-commerce forever. Your empire starts with one click.
              </p>
              
              <div className="cta-buttons-final">
                <motion.a
                  href="https://omniflowapp.co.ke/download"
                  className="btn-viral btn-cta-primary"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 25px 50px rgba(255, 215, 0, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaDownload />
                  <span>Download FREE App</span>
                  <div className="pulse-dot"></div>
                </motion.a>

                <motion.button
                  className="btn-viral btn-cta-secondary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaStore />
                  <span>Start Selling - 0% Fees</span>
                </motion.button>
              </div>

              <div className="cta-guarantee">
                <FaCheckCircle />
                <span>Join 1,000+ pioneers building the future</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="viral-footer" role="contentinfo">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand">
                <FaRocket className="footer-logo" />
                <span className="footer-brand-name">OmniFlow</span>
                <p className="footer-tagline">Kenya's Student-Powered Revolution</p>
              </div>
              
              <div className="footer-contact">
                <h4>Get In Touch</h4>
                <div className="contact-info">
                  <a href="mailto:omniflow718@gmail.com">
                    <FaEnvelope />
                    omniflow718@gmail.com
                  </a>
                  <a href="tel:+254745456476">
                    <FaPhone />
                    +254 745 456 476
                  </a>
                  <div className="location">
                    <FaMapMarkerAlt />
                    Nairobi, Kenya
                  </div>
                </div>
              </div>

              <div className="footer-social">
                <h4>Follow the Journey</h4>
                <div className="social-links-viral">
                  {[
                    { icon: <FaTwitter />, url: 'https://twitter.com/search?q=omniflow%20marketplace%20kenya' },
                    { icon: <FaInstagram />, url: 'https://www.instagram.com/explore/tags/omniflowkenya/' },
                    { icon: <FaTiktok />, url: 'https://www.tiktok.com/search?q=omniflow%20marketplace%20kenya' },
                    { icon: <FaFacebook />, url: 'https://www.facebook.com/search/top?q=omniflow%20marketplace%20kenya' }
                  ].map((social, index) => (
                    <motion.a
                      key={index}
                      href={social.url}
                      className="social-link-viral"
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {social.icon}
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>© 2025 OmniFlow Technologies. Built with ❤️ in Nairobi, Kenya 🇰🇪</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AboutUs;
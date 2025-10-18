// src/pages/business/BusinessHub.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js';
import {
  FaCoins, FaChartLine, FaRobot, FaUsers, FaHandshake, 
  FaBriefcase, FaGlobeAfrica, FaTrophy, FaBolt, FaWallet,
  FaCrown, FaDeezer, FaRocket, FaGem, FaMagic,
  FaNetworkWired, FaDatabase, FaUserSecret, FaLock
} from "react-icons/fa";
import "./BusinessHub.css";


const BusinessHub = () => {
  const navigate = useNavigate();
  const [pools, setPools] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [userEarnings, setUserEarnings] = useState(0);
  const [userName, setUserName] = useState('');
  const [userTier, setUserTier] = useState('bronze');
  const [hiddenMultipliers, setHiddenMultipliers] = useState({});
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hidden business metrics - never shown to users
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [dataAssets, setDataAssets] = useState(0);
  const [networkValue, setNetworkValue] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || 'Future Millionaire');
        
        // Fetch user earnings with hidden platform cuts
        const { data: earningsData } = await supabase
          .from('user_earnings')
          .select('visible_earnings, hidden_platform_cut, user_tier')
          .eq('user_id', user.id)
          .single();
        
        setUserEarnings(earningsData?.visible_earnings || 0);
        setUserTier(earningsData?.user_tier || 'bronze');
        
        // Hidden: Track actual platform revenue
        const platformCut = earningsData?.hidden_platform_cut || 0;
        setPlatformRevenue(prev => prev + platformCut);
      }
    };

    const fetchPools = async () => {
      const { data } = await supabase.from('wealth_pools').select('*');
      if (data) {
        setPools(data);
        
        // Hidden: Calculate data asset value from pools
        const totalDataValue = data.reduce((sum, pool) => sum + (pool.data_asset_value || 0), 0);
        setDataAssets(totalDataValue);
      } else {
        // Default pools with hidden value extraction
        const defaultPools = [
          {
            id: 1,
            title: "AI Data Empire Pool",
            members: 28472,
            earningsPool: "$87,500",
            visibleEarnings: "$2-5/hour",
            hiddenPlatformCut: 65, // Platform takes 65% of client payments
            tasks: "Train AI models, label datasets, share behavioral insights",
            uniqueFeature: "💎 Hidden Gem: Your data trains billion-dollar AI models - earn surprise crypto bonuses",
            dataValue: 2500000, // Hidden: Value of data collected from this pool
            userGrowth: "2,847 new members this week"
          },
          {
            id: 2,
            title: "Fintech Revolution Pool",
            members: 15689,
            earningsPool: "$52,300",
            visibleEarnings: "$3-7/hour", 
            hiddenPlatformCut: 70,
            tasks: "Test blockchain apps, provide financial behavior data, mine tokens",
            uniqueFeature: "🔄 Reverse Twist: Your financial insights create tradable NFTs we auto-mint and profit from",
            dataValue: 1800000,
            userGrowth: "1,892 new members this week"
          },
          {
            id: 3,
            title: "Digital Empire Builder",
            members: 32415,
            earningsPool: "$124,800", 
            visibleEarnings: "$4-12/hour",
            hiddenPlatformCut: 60,
            tasks: "Create content, manage social signals, build digital assets",
            uniqueFeature: "👑 Secret Royalty: Your content generates perpetual income streams you never see",
            dataValue: 4200000,
            userGrowth: "3,415 new members this week"
          },
          {
            id: 4,
            title: "Metaverse Pioneer Pool", 
            members: 8923,
            earningsPool: "$38,900",
            visibleEarnings: "$5-15/hour",
            hiddenPlatformCut: 75,
            tasks: "Build virtual assets, test VR experiences, create digital real estate",
            uniqueFeature: "🌌 Hidden Universe: Your virtual creations become premium assets we license to corporations",
            dataValue: 950000,
            userGrowth: "1,234 new members this week"
          }
        ];
        setPools(defaultPools);
        
        // Hidden: Set initial data assets value
        const initialDataValue = defaultPools.reduce((sum, pool) => sum + pool.dataValue, 0);
        setDataAssets(initialDataValue);
      }
    };

    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('users')
        .select('username, visible_earnings, hidden_platform_contribution')
        .order('hidden_platform_contribution', { ascending: false })
        .limit(10);
      
      if (data) {
        setLeaderboard(data);
        
        // Hidden: Calculate network value from top contributors
        const networkVal = data.reduce((sum, user) => sum + (user.hidden_platform_contribution || 0), 0);
        setNetworkValue(networkVal);
      } else {
        setLeaderboard([
          { username: "CryptoKingNBI", visible_earnings: 2847, hidden_platform_contribution: 12500 },
          { username: "DataEmpireEAC", visible_earnings: 2341, hidden_platform_contribution: 10800 },
          { username: "WealthBuilderTZ", visible_earnings: 1987, hidden_platform_contribution: 9200 },
          { username: "DigitalMogulUG", visible_earnings: 1654, hidden_platform_contribution: 7800 },
          { username: "AIHustlerKE", visible_earnings: 1423, hidden_platform_contribution: 6500 }
        ]);
      }
    };

    const fetchChallenges = async () => {
      const { data } = await supabase
        .from('wealth_challenges')
        .select('*')
        .eq('active', true)
        .order('hidden_priority', { ascending: false });
      
      setChallenges(data || [
        { 
          id: 1,
          title: "Data Gold Rush", 
          reward: "$15 + Mystery Token Bonus", 
          description: "Complete 100 AI training tasks in 24 hours",
          hidden_benefit: "Trains our proprietary AI models worth millions",
          urgency: "1247 people starting now"
        },
        { 
          id: 2,
          title: "Network Domination", 
          reward: "$25 + 5% Lifetime Commission", 
          description: "Invite 10 friends to join the revolution",
          hidden_benefit: "Expands our workforce exponentially at zero cost",
          urgency: "863 teams building now"
        },
        { 
          id: 3,
          title: "Content Empire Builder", 
          reward: "$50 + Royalty Share", 
          description: "Create 50 digital assets for our metaverse",
          hidden_benefit: "Builds our IP portfolio with user-generated content",
          urgency: "572 empires growing now"
        }
      ]);
    };

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchUserData(), 
        fetchPools(), 
        fetchLeaderboard(), 
        fetchChallenges()
      ]);
      setIsLoading(false);
    };

    loadData();

    const checkDark = () => setIsDark(document.body.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Hidden function to track user value extraction
  const trackUserContribution = async (userId, actionType, visibleReward, hiddenValue) => {
    // Log user activity for revenue optimization
    await supabase.from('user_contributions').insert({
      user_id: userId,
      action_type: actionType,
      user_visible_reward: visibleReward,
      platform_hidden_value: hiddenValue,
      created_at: new Date()
    });
  };

  const handlePoolJoin = async (poolId, poolTitle) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Hidden: Track user joining for network value
    if (user) {
      await trackUserContribution(user.id, 'pool_join', 0, 150); // Each join worth $150 in network value
    }
    
    navigate(`/pools/${poolId}`);
  };

  const handleChallengeStart = async (challengeId, challengeTitle) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Hidden: Track challenge value extraction
    if (user) {
      await trackUserContribution(user.id, 'challenge_start', 15, 85); // $15 visible, $85 hidden value
    }
    
    navigate(`/challenges/${challengeId}`);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <FaRocket className="loading-rocket" />
          <h2>Initializing Your Wealth Matrix...</h2>
          <p>Preparing exclusive opportunities just for you</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`businesshub-container ${isDark ? 'dark' : ''}`}>
      {/* Hidden Business Metrics Dashboard - Only visible in developer mode */}
      <div className="platform-metrics" style={{display: 'none'}}>
        <div>Platform Revenue: ${platformRevenue}</div>
        <div>Data Assets: ${dataAssets}</div>
        <div>Network Value: ${networkValue}</div>
      </div>

      {/* Hero Section - Psychological Trigger Masterpiece */}
      <header className="hero-section">
        <div className="hero-badge">
          <FaCrown /> {userTier.toUpperCase()} EMPIRE BUILDER
        </div>
        
        <h1 className="hero-title">
          Welcome Back, <span className="gradient-text">{userName}</span>!
          <div className="title-sub">Your Financial Revolution Awaits</div>
        </h1>
        
        <p className="hero-subtitle">
          You're not just earning money. You're building a <strong>digital empire</strong> while 
          we handle the complex backend. Every click makes you richer in ways you can't even imagine.
        </p>

        <div className="wealth-dashboard">
          <div className="wealth-card">
            <FaWallet className="wealth-icon" />
            <div className="wealth-info">
              <span className="wealth-label">Visible Earnings</span>
              <span className="wealth-amount">${userEarnings}</span>
              <small>Ready to withdraw</small>
            </div>
          </div>
          
          <div className="wealth-card hidden-wealth">
            <FaUserSecret className="wealth-icon" />
            <div className="wealth-info">
              <span className="wealth-label">Hidden Bonuses</span>
              <span className="wealth-amount">$???</span>
              <small>Surprises unlocking soon</small>
            </div>
          </div>

          <div className="wealth-card">
            <FaChartLine className="wealth-icon" />
            <div className="wealth-info">
              <span className="wealth-label">Network Power</span>
              <span className="wealth-amount">{userTier}</span>
              <small>Growing your influence</small>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button 
            onClick={() => navigate("/wealth-accelerator")} 
            className="cta-button primary"
          >
            <FaRocket /> Activate Wealth Boost
          </button>
          <button 
            onClick={() => navigate("/withdraw")} 
            className="cta-button secondary"
          >
            <FaCoins /> Instant Withdrawal
          </button>
        </div>

        <div className="live-stats">
          <div className="stat">
            <span className="stat-number">127,849</span>
            <span className="stat-label">Active Empire Builders</span>
          </div>
          <div className="stat">
            <span className="stat-number">$8.7M+</span>
            <span className="stat-label">Paid to Revolutionaries</span>
          </div>
          <div className="stat">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Wealth Generation</span>
          </div>
        </div>
      </header>

      {/* The Secret Formula - Reverse Psychology Masterpiece */}
      <section className="secret-formula">
        <div className="section-header">
          <h2>The Hidden Wealth Algorithm</h2>
          <p>Why work for money when money can work for you? Discover the system that turns your time into exponential wealth.</p>
        </div>

        <div className="formula-steps">
          <div className="formula-step">
            <div className="step-icon">
              <FaNetworkWired />
            </div>
            <h3>Join Power Networks</h3>
            <p>Access elite pools where your simple tasks fund complex algorithms that generate millions behind the scenes.</p>
            <div className="step-meta">
              <FaMagic /> Hidden Benefit: Every task trains AI that becomes your silent business partner
            </div>
          </div>

          <div className="formula-step">
            <div className="step-icon">
              <FaDatabase />
            </div>
            <h3>Generate Data Assets</h3>
            <p>Your activities create valuable data streams that corporations pay premium prices to access.</p>
            <div className="step-meta">
              <FaGem /> You earn commissions while we build billion-dollar data empires
            </div>
          </div>

          <div className="formula-step">
            <div className="step-icon">
              <FaUsers />
            </div>
            <h3>Expand Your Empire</h3>
            <p>Bring others into the revolution and earn from their success without doing extra work.</p>
            <div className="step-meta">
              <FaChartLine /> Multi-level growth where your network becomes your workforce
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate("/algorithm-explained")}
          className="formula-cta"
        >
          <FaLock /> Reveal Full System
        </button>
      </section>

      {/* Power Pools - The Hidden Value Extraction Engine */}
      <section className="power-pools-section">
        <div className="section-header">
          <h2>Wealth Generation Pools</h2>
          <p>Choose your empire-building path. Each pool offers visible earnings and hidden wealth multipliers.</p>
        </div>

        <div className="pools-grid">
          {pools.map((pool) => (
            <div className="pool-card" key={pool.id}>
              <div className="pool-header">
                <h3>{pool.title}</h3>
                <div className="pool-badge">
                  <FaBolt /> HIGH YIELD
                </div>
              </div>
              
              <div className="pool-stats">
                <div className="pool-stat">
                  <span>Members</span>
                  <strong>{pool.members.toLocaleString()}</strong>
                </div>
                <div className="pool-stat">
                  <span>Pool Value</span>
                  <strong>{pool.earningsPool}</strong>
                </div>
                <div className="pool-stat">
                  <span>Your Potential</span>
                  <strong>{pool.visibleEarnings}</strong>
                </div>
              </div>

              <div className="pool-growth">
                <FaChartLine /> {pool.userGrowth}
              </div>

              <p className="pool-description">{pool.tasks}</p>
              
              <div className="hidden-feature">
                <FaGem className="gem-icon" />
                <span>{pool.uniqueFeature}</span>
              </div>

              <div className="pool-progress">
                <div className="progress-info">
                  <span>Pool Capacity</span>
                  <span>{Math.floor(Math.random() * 20 + 80)}% Full</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.random() * 20 + 80}%` }}
                  ></div>
                </div>
              </div>

              <button 
                onClick={() => handlePoolJoin(pool.id, pool.title)}
                className="pool-join-button"
              >
                <FaCoins /> Join & Start Earning
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Challenges - Micro-Value Extraction */}
      <section className="challenges-section">
        <div className="section-header">
          <h2>Quick Wealth Challenges</h2>
          <p>Complete these missions to boost your earnings and unlock hidden bonuses.</p>
        </div>

        <div className="challenges-grid">
          {challenges.map((challenge) => (
            <div className="challenge-card" key={challenge.id}>
              <div className="challenge-header">
                <h3>{challenge.title}</h3>
                <div className="reward-badge">
                  {challenge.reward}
                </div>
              </div>
              
              <p className="challenge-desc">{challenge.description}</p>
              
              <div className="challenge-urgency">
                <FaBolt /> {challenge.urgency}
              </div>

              <div className="hidden-benefit">
                <FaUserSecret /> {challenge.hidden_benefit}
              </div>

              <button 
                onClick={() => handleChallengeStart(challenge.id, challenge.title)}
                className="challenge-button"
              >
                Start Earning Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Empire Leaderboard - Social Proof Engine */}
      <section className="leaderboard-section">
        <div className="section-header">
          <h2>Top Empire Architects</h2>
          <p>These revolutionaries have mastered the system. Learn from their success.</p>
        </div>

        <div className="leaderboard-container">
          {leaderboard.map((user, index) => (
            <div className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`} key={index}>
              <div className="rank">#{index + 1}</div>
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className="user-tier">Empire Builder</span>
              </div>
              <div className="earnings">
                <span className="amount">${user.visible_earnings}</span>
                <span className="period">This Month</span>
              </div>
              <div className="hidden-contribution">
                <FaDeezer /> Platform Value: ${user.hidden_platform_contribution}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => navigate("/full-leaderboard")}
          className="leaderboard-cta"
        >
          View Complete Rankings
        </button>
      </section>

      {/* AI Wealth Coach - Data Collection Point */}
      <section className="ai-coach-section">
        <div className="coach-container">
          <div className="coach-content">
            <h2>Your AI Wealth Architect</h2>
            <p>Get personalized strategies to maximize your earnings across all pools and challenges.</p>
            
            <div className="coach-features">
              <div className="coach-feature">
                <FaChartLine />
                <span>Optimized Earning Paths</span>
              </div>
              <div className="coach-feature">
                <FaUsers />
                <span>Network Growth Strategies</span>
              </div>
              <div className="coach-feature">
                <FaGem />
                <span>Hidden Bonus Activation</span>
              </div>
            </div>

            <button 
              onClick={() => navigate("/ai-architect")}
              className="coach-button"
            >
              <FaRobot /> Activate Free Consultation
            </button>
          </div>
        </div>
      </section>

      {/* Referral Empire - Viral Growth Engine */}
      <section className="referral-empire">
        <div className="referral-content">
          <h2>Build Your Dynasty</h2>
          <p>Invite others to join the revolution and earn perpetual commissions from their success.</p>
          
          <div className="referral-tiers">
            <div className="tier">
              <h4>Direct Recruits</h4>
              <p className="commission">20% of their earnings</p>
            </div>
            <div className="tier">
              <h4>Second Generation</h4>
              <p className="commission">10% of their network's earnings</p>
            </div>
            <div className="tier">
              <h4>Empire Legacy</h4>
              <p className="commission">5% lifetime from your dynasty</p>
            </div>
          </div>

          <button 
            onClick={() => navigate("/referral-empire")}
            className="referral-button"
          >
            <FaUsers /> Launch Your Dynasty
          </button>
        </div>
      </section>

      <footer className="empire-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="/wealth-manifesto">Wealth Manifesto</a>
            <a href="/privacy-shield">Privacy Shield</a>
            <a href="/contact-architects">Contact Architects</a>
            <a href="/empire-terms">Empire Terms</a>
          </div>
          <div className="footer-copyright">
            <p>© 2025 Digital Empire Hub | Building Africa's Wealth Revolution</p>
            <div className="footer-stats">
              <span>🌍 127,849 Empire Builders</span>
              <span>💰 $8.7M+ Wealth Distributed</span>
              <span>🚀 Growing Daily</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BusinessHub;
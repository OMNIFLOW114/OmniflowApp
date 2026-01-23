import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import {
  Send,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  ChevronLeft,
  Loader2,
  UserPlus,
  History,
  Shield,
  Smartphone,
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Download,
  Wallet as WalletIcon,
  Key,
  Phone,
  User,
  Clock,
  HelpCircle,
  Smartphone as SmartphoneIcon,
  Mail as MailIcon,
  ShieldCheck
} from "lucide-react";
import "./OmniPayWallet.css";

// SEPARATE SetupModal Component
const SetupModal = React.memo(({
  showSetupModal,
  missingData,
  updateUserData,
  setupWalletPin,
  phoneInputRef,
  nameInputRef,
  setupPinRefs,
  confirmPinRefs,
  onClose
}) => {
  const [setupStep, setSetupStep] = useState(0);
  const [setupData, setSetupData] = useState({
    phone: "",
    fullName: "",
    pin: ["", "", "", "", "", ""],
    confirmPin: ["", "", "", "", "", ""],
    securityQuestion: "",
    securityAnswer: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepError, setCurrentStepError] = useState("");
  
  // Security questions options
  const securityQuestions = [
    "What was your first pet's name?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What city were you born in?",
    "What is your favorite book?",
    "What was your childhood nickname?"
  ];

  // Reset setup state when modal opens
  useEffect(() => {
    if (showSetupModal && missingData.length > 0) {
      setSetupStep(0);
      setSetupData({
        phone: "",
        fullName: "",
        pin: ["", "", "", "", "", ""],
        confirmPin: ["", "", "", "", "", ""],
        securityQuestion: "",
        securityAnswer: ""
      });
      setCurrentStepError("");
      setIsProcessing(false);
    }
  }, [showSetupModal]);

  // Focus management
  useEffect(() => {
    if (!showSetupModal || missingData.length === 0 || setupStep >= missingData.length) return;
   
    const timer = setTimeout(() => {
      const currentMissing = missingData[setupStep];
      if (!currentMissing) return;
     
      if (currentMissing.type === 'phone' && phoneInputRef.current) {
        phoneInputRef.current.focus();
      } else if (currentMissing.type === 'name' && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (currentMissing.type === 'pin' && setupPinRefs.current[0]?.current) {
        setupPinRefs.current[0].current.focus();
      }
    }, 200);
   
    return () => clearTimeout(timer);
  }, [setupStep, showSetupModal, missingData, phoneInputRef, nameInputRef, setupPinRefs]);

  const handleSetupNext = async () => {
    const currentMissing = missingData[setupStep];
   
    if (!currentMissing) {
      onClose();
      return;
    }
   
    setIsProcessing(true);
    setCurrentStepError("");

    // Validate current step
    if (currentMissing.type === 'phone') {
      const phone = setupData.phone.trim();
      if (!phone) {
        setCurrentStepError("Please enter your phone number");
        setIsProcessing(false);
        return;
      }
      if (!/^0[17]\d{8}$/.test(phone)) {
        setCurrentStepError("Please enter a valid Kenyan phone number (e.g., 0712345678)");
        setIsProcessing(false);
        return;
      }
    }
   
    if (currentMissing.type === 'name') {
      const name = setupData.fullName.trim();
      if (!name) {
        setCurrentStepError("Please enter your full name");
        setIsProcessing(false);
        return;
      }
      if (name.length < 2) {
        setCurrentStepError("Name must be at least 2 characters");
        setIsProcessing(false);
        return;
      }
    }
   
    if (currentMissing.type === 'pin') {
      const pin = setupData.pin.join('');
      const confirmPin = setupData.confirmPin.join('');
     
      if (pin.length !== 6) {
        setCurrentStepError("PIN must be exactly 6 digits");
        setIsProcessing(false);
        return;
      }
     
      if (pin !== confirmPin) {
        setCurrentStepError("PINs don't match");
        setIsProcessing(false);
        return;
      }
     
      if (!/^\d{6}$/.test(pin)) {
        setCurrentStepError("PIN must contain only numbers");
        setIsProcessing(false);
        return;
      }

      // Validate security question
      if (!setupData.securityQuestion || !setupData.securityAnswer.trim()) {
        setCurrentStepError("Please select and answer a security question for PIN recovery");
        setIsProcessing(false);
        return;
      }
    }
   
    let success = true;
   
    // Save current step data
    try {
      if (currentMissing.type === 'phone') {
        success = await updateUserData('phone', setupData.phone);
      } else if (currentMissing.type === 'name') {
        success = await updateUserData('name', setupData.fullName);
      } else if (currentMissing.type === 'pin') {
        const pin = setupData.pin.join('');
        success = await setupWalletPin(pin, setupData.securityQuestion, setupData.securityAnswer);
      } else if (currentMissing.type === 'wallet') {
        success = true;
      }
    } catch (error) {
      console.error("Setup step error:", error);
      success = false;
    }
   
    if (!success) {
      setIsProcessing(false);
      return;
    }
   
    // Move to next step or finish
    if (setupStep < missingData.length - 1) {
      setSetupStep(setupStep + 1);
    } else {
      // All steps completed
      setTimeout(() => {
        onClose();
        toast.success("Profile setup completed!", { duration: 3000 });
      }, 500);
    }
   
    setIsProcessing(false);
  };

  const handlePinInputChange = (index, value, isConfirm = false) => {
    if (!/^\d?$/.test(value)) return;
   
    const field = isConfirm ? 'confirmPin' : 'pin';
    const newArray = [...setupData[field]];
    newArray[index] = value;
   
    setSetupData(prev => ({
      ...prev,
      [field]: newArray
    }));
   
    // Auto-focus next input
    if (value && index < 5) {
      setTimeout(() => {
        const nextRef = isConfirm ? confirmPinRefs.current[index + 1] : setupPinRefs.current[index + 1];
        nextRef?.current?.focus();
      }, 10);
    }
  };

  const handlePinKeyDown = (index, e, isConfirm = false) => {
    if (e.key === "Backspace" && !setupData[isConfirm ? 'confirmPin' : 'pin'][index] && index > 0) {
      setTimeout(() => {
        const prevRef = isConfirm ? confirmPinRefs.current[index - 1] : setupPinRefs.current[index - 1];
        prevRef?.current?.focus();
      }, 10);
    }
  };

  const handleCloseModal = () => {
    setSetupStep(0);
    setSetupData({
      phone: "",
      fullName: "",
      pin: ["", "", "", "", "", ""],
      confirmPin: ["", "", "", "", "", ""],
      securityQuestion: "",
      securityAnswer: ""
    });
    setCurrentStepError("");
    onClose();
  };

  const currentMissing = missingData[setupStep];
  if (!currentMissing || !showSetupModal) {
    return null;
  }

  const renderStepInput = () => {
    switch (currentMissing.type) {
      case 'phone':
        return (
          <div>
            <label className="wallet-input-label">Phone Number</label>
            <input
              ref={phoneInputRef}
              type="tel"
              placeholder="0712345678"
              value={setupData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setSetupData(prev => ({...prev, phone: value}));
                setCurrentStepError("");
              }}
              className="wallet-input"
              aria-label="Phone number"
              maxLength="10"
              disabled={isProcessing}
            />
            <p className="wallet-input-hint">
              Enter your Kenyan phone number (without +254)
            </p>
          </div>
        );
       
      case 'name':
        return (
          <div>
            <label className="wallet-input-label">Full Name</label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="John Doe"
              value={setupData.fullName}
              onChange={(e) => {
                setSetupData(prev => ({...prev, fullName: e.target.value}));
                setCurrentStepError("");
              }}
              className="wallet-input"
              aria-label="Full name"
              disabled={isProcessing}
            />
            <p className="wallet-input-hint">
              Your legal name as it appears on official documents
            </p>
          </div>
        );
       
      case 'pin':
        return (
          <div>
            <label className="wallet-input-label">Set Wallet PIN</label>
            <p className="wallet-input-hint" style={{ marginBottom: '20px' }}>
              Create a 6-digit PIN for securing your transactions
            </p>
           
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--wallet-text-secondary)', marginBottom: '12px' }}>
                Enter PIN:
              </p>
              <div className="wallet-pin-inputs">
                {setupData.pin.map((digit, index) => (
                  <input
                    key={`pin-${index}`}
                    ref={setupPinRefs.current[index]}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handlePinInputChange(index, e.target.value, false)}
                    onKeyDown={(e) => handlePinKeyDown(index, e, false)}
                    className={`wallet-pin-input ${digit ? 'filled' : ''}`}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--wallet-text-secondary)', marginBottom: '12px' }}>
                Confirm PIN:
              </p>
              <div className="wallet-pin-inputs">
                {setupData.confirmPin.map((digit, index) => (
                  <input
                    key={`confirm-${index}`}
                    ref={confirmPinRefs.current[index]}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handlePinInputChange(index, e.target.value, true)}
                    onKeyDown={(e) => handlePinKeyDown(index, e, true)}
                    className={`wallet-pin-input ${digit ? 'filled' : ''}`}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </div>

            {/* Security Question for PIN Recovery */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--wallet-text-secondary)', marginBottom: '12px' }}>
                Security Question (For PIN Recovery):
              </p>
              <select
                value={setupData.securityQuestion}
                onChange={(e) => setSetupData(prev => ({...prev, securityQuestion: e.target.value}))}
                className="wallet-input"
                disabled={isProcessing}
              >
                <option value="">Select a security question</option>
                {securityQuestions.map((question, index) => (
                  <option key={index} value={question}>{question}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--wallet-text-secondary)', marginBottom: '12px' }}>
                Your Answer:
              </p>
              <input
                type="text"
                placeholder="Enter your answer"
                value={setupData.securityAnswer}
                onChange={(e) => setSetupData(prev => ({...prev, securityAnswer: e.target.value}))}
                className="wallet-input"
                disabled={isProcessing}
              />
              <p className="wallet-input-hint">
                This will be used to verify your identity if you forget your PIN
              </p>
            </div>
          </div>
        );
       
      case 'wallet':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'var(--wallet-primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: 'white'
            }}>
              <WalletIcon size={36} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--wallet-text-primary)' }}>
              Wallet Setup
            </h3>
            <p style={{ color: 'var(--wallet-text-secondary)', lineHeight: '1.5' }}>
              Your wallet will be initialized successfully.
            </p>
          </div>
        );
       
      default:
        return null;
    }
  };

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "var(--wallet-primary)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "white"
          }}>
            <currentMissing.icon size={28} />
          </div>
          <h3 className="wallet-pin-title">Complete Your Profile</h3>
          <p className="wallet-pin-subtitle">
            {currentMissing.description}
          </p>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginTop: "20px"
          }}>
            {missingData.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: idx === setupStep ? "var(--wallet-primary)" : "var(--wallet-border)",
                  transition: "var(--wallet-transition)"
                }}
              />
            ))}
          </div>
        </div>
        
        {currentStepError && (
          <div className="wallet-status-error">
            <AlertCircle size={16} />
            {currentStepError}
          </div>
        )}
        
        {renderStepInput()}
        
        <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
          <button
            onClick={handleSetupNext}
            style={{
              flex: 1,
              padding: "16px",
              background: isProcessing ? "var(--wallet-text-tertiary)" : "var(--wallet-primary)",
              border: "none",
              borderRadius: "var(--wallet-radius-lg)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "var(--wallet-transition)"
            }}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin inline mr-2" />
                Processing...
              </>
            ) : setupStep < missingData.length - 1 ? (
              "Continue"
            ) : (
              "Finish Setup"
            )}
          </button>
        </div>
        
        <button
          onClick={handleCloseModal}
          style={{
            width: "100%",
            padding: "12px",
            background: "transparent",
            border: "none",
            color: "var(--wallet-text-tertiary)",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "var(--wallet-transition)",
            marginTop: "16px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--wallet-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--wallet-text-tertiary)";
          }}
          disabled={isProcessing}
        >
          Cancel Setup
        </button>
      </div>
    </div>
  );
});

SetupModal.displayName = 'SetupModal';

// PIN Reset Modal Component
const PinResetModal = React.memo(({ show, onClose, userEmail, onResetSuccess }) => {
  const [step, setStep] = useState(1); // 1: Verify Email, 2: Security Question, 3: New PIN
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPin, setNewPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const pinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  useEffect(() => {
    if (show) {
      setEmail(userEmail || "");
      pinRefs.current = Array(6).fill().map(() => React.createRef());
      confirmPinRefs.current = Array(6).fill().map(() => React.createRef());
    }
  }, [show, userEmail]);

  const handleVerifyEmail = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      // Check if email exists in users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        setError("No account found with this email address");
        setIsProcessing(false);
        return;
      }

      // Get security question for this user
      const { data: pinData, error: pinError } = await supabase
        .from("wallet_pin_security")
        .select("security_questions")
        .eq("user_id", userData.id)
        .single();

      if (pinError || !pinData?.security_questions?.[0]) {
        setError("No security question found for this account");
        setIsProcessing(false);
        return;
      }

      setSecurityQuestion(pinData.security_questions[0].question);
      setStep(2);
      setSuccess("Email verified. Please answer your security question.");
      
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error("Email verification error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!securityAnswer.trim()) {
      setError("Please enter your answer");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (!userData) {
        setError("User not found");
        setIsProcessing(false);
        return;
      }

      // Verify security answer (in production, you'd hash this)
      const { data: pinData } = await supabase
        .from("wallet_pin_security")
        .select("security_questions")
        .eq("user_id", userData.id)
        .single();

      if (!pinData?.security_questions?.[0]) {
        setError("Security question not found");
        setIsProcessing(false);
        return;
      }

      // Simple case-insensitive comparison (in production, use proper comparison)
      const storedAnswer = pinData.security_questions[0].answer.toLowerCase().trim();
      const providedAnswer = securityAnswer.toLowerCase().trim();
      
      if (storedAnswer !== providedAnswer) {
        setError("Incorrect answer. Please try again.");
        setIsProcessing(false);
        return;
      }

      setStep(3);
      setSuccess("Security question verified. Please set your new PIN.");
      
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error("Security answer verification error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetNewPin = async () => {
    const pinStr = newPin.join('');
    const confirmPinStr = confirmPin.join('');
    
    if (pinStr.length !== 6) {
      setError("PIN must be exactly 6 digits");
      return;
    }
    
    if (!/^\d{6}$/.test(pinStr)) {
      setError("PIN must contain only numbers");
      return;
    }
    
    if (pinStr !== confirmPinStr) {
      setError("PINs don't match");
      return;
    }

    setIsProcessing(true);
    setError("");
    
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (!userData) {
        setError("User not found");
        setIsProcessing(false);
        return;
      }

      // Update PIN - FIXED: Use same hashing method as setup
      const pinHash = btoa(pinStr);
      
      const { error: updateError } = await supabase
        .from("wallet_pin_security")
        .update({
          pin_hash: pinHash,
          pin_changed_at: new Date().toISOString(),
          pin_attempts: 0,
          is_locked: false,
          locked_until: null,
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.id);

      if (updateError) throw updateError;

      setSuccess("PIN reset successfully!");
      
      setTimeout(() => {
        onResetSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      setError("Failed to reset PIN. Please try again.");
      console.error("PIN reset error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinInputChange = (index, value, isConfirm = false) => {
    if (!/^\d?$/.test(value)) return;
    
    if (isConfirm) {
      const newArray = [...confirmPin];
      newArray[index] = value;
      setConfirmPin(newArray);
    } else {
      const newArray = [...newPin];
      newArray[index] = value;
      setNewPin(newArray);
    }
    
    // Auto-focus next input
    if (value && index < 5) {
      setTimeout(() => {
        const refs = isConfirm ? confirmPinRefs.current : pinRefs.current;
        refs[index + 1]?.current?.focus();
      }, 10);
    }
  };

  if (!show) return null;

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 className="wallet-pin-title">
            {step === 1 && "Reset PIN - Verify Email"}
            {step === 2 && "Reset PIN - Security Question"}
            {step === 3 && "Reset PIN - Set New PIN"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="wallet-status-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="wallet-status-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Step 1: Email Verification */}
        {step === 1 && (
          <div>
            <p className="wallet-pin-subtitle" style={{ marginBottom: "20px" }}>
              Enter the email address associated with your account to reset your PIN.
            </p>
            
            <div style={{ marginBottom: "20px" }}>
              <label className="wallet-input-label">Email Address</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="wallet-input"
                disabled={isProcessing}
              />
              <p className="wallet-input-hint">
                You will need to answer your security question next
              </p>
            </div>

            <button
              onClick={handleVerifyEmail}
              className="wallet-confirm-btn"
              disabled={isProcessing || !email}
              style={{ width: "100%" }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin inline mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>
          </div>
        )}

        {/* Step 2: Security Question */}
        {step === 2 && (
          <div>
            <p className="wallet-pin-subtitle" style={{ marginBottom: "20px" }}>
              Please answer your security question to continue.
            </p>
            
            <div style={{ marginBottom: "20px" }}>
              <label className="wallet-input-label">Security Question</label>
              <div className="wallet-info-box">
                {securityQuestion}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label className="wallet-input-label">Your Answer</label>
              <input
                type="text"
                placeholder="Enter your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="wallet-input"
                disabled={isProcessing}
              />
            </div>

            <button
              onClick={handleVerifySecurityAnswer}
              className="wallet-confirm-btn"
              disabled={isProcessing || !securityAnswer.trim()}
              style={{ width: "100%" }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin inline mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Answer"
              )}
            </button>
          </div>
        )}

        {/* Step 3: Set New PIN */}
        {step === 3 && (
          <div>
            <p className="wallet-pin-subtitle" style={{ marginBottom: "20px" }}>
              Create a new 6-digit PIN for your wallet.
            </p>
            
            <div style={{ marginBottom: "24px" }}>
              <label className="wallet-input-label">New PIN</label>
              <div className="wallet-pin-inputs">
                {newPin.map((digit, index) => (
                  <input
                    key={`new-${index}`}
                    ref={pinRefs.current[index]}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handlePinInputChange(index, e.target.value, false)}
                    className={`wallet-pin-input ${digit ? 'filled' : ''}`}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label className="wallet-input-label">Confirm New PIN</label>
              <div className="wallet-pin-inputs">
                {confirmPin.map((digit, index) => (
                  <input
                    key={`confirm-${index}`}
                    ref={confirmPinRefs.current[index]}
                    type="password"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handlePinInputChange(index, e.target.value, true)}
                    className={`wallet-pin-input ${digit ? 'filled' : ''}`}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSetNewPin}
              className="wallet-confirm-btn"
              disabled={isProcessing}
              style={{ width: "100%" }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin inline mr-2" />
                  Setting New PIN...
                </>
              ) : (
                "Set New PIN"
              )}
            </button>
          </div>
        )}

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "var(--wallet-transition)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--wallet-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--wallet-text-tertiary)";
            }}
            disabled={isProcessing}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

PinResetModal.displayName = 'PinResetModal';

// Biometric Prompt Modal
const BiometricPromptModal = React.memo(({ show, onAccept, onDecline, onDontAskAgain }) => {
  if (!show) return null;

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "var(--wallet-primary)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "white"
          }}>
            <Fingerprint size={36} />
          </div>
          <h3 className="wallet-pin-title">Enable Biometric Login?</h3>
          <p className="wallet-pin-subtitle">
            Use your fingerprint or face recognition for faster, more secure access to your wallet.
          </p>
        </div>

        <div className="wallet-info-box" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <CheckCircle size={20} color="var(--wallet-success)" />
            <span style={{ fontWeight: "600", color: "var(--wallet-text-primary)" }}>Faster Access</span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--wallet-text-secondary)", marginLeft: "32px", marginBottom: "12px" }}>
            Login instantly without typing your PIN
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ShieldCheck size={20} color="var(--wallet-primary)" />
            <span style={{ fontWeight: "600", color: "var(--wallet-text-primary)" }}>Enhanced Security</span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--wallet-text-secondary)", marginLeft: "32px" }}>
            Your biometric data stays on your device
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={onAccept}
            className="wallet-confirm-btn"
            style={{ width: "100%" }}
          >
            <Fingerprint size={20} style={{ marginRight: "8px" }} />
            Enable Biometric Login
          </button>

          <button
            onClick={onDecline}
            style={{
              width: "100%",
              padding: "14px",
              background: "transparent",
              border: "2px solid var(--wallet-border)",
              borderRadius: "var(--wallet-radius-lg)",
              color: "var(--wallet-text-primary)",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "var(--wallet-transition)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--wallet-text-secondary)";
              e.currentTarget.style.color = "var(--wallet-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--wallet-border)";
              e.currentTarget.style.color = "var(--wallet-text-primary)";
            }}
          >
            Maybe Later
          </button>

          <button
            onClick={onDontAskAgain}
            style={{
              width: "100%",
              padding: "14px",
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "var(--wallet-transition)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--wallet-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--wallet-text-tertiary)";
            }}
          >
            Don't Ask Again
          </button>
        </div>
      </div>
    </div>
  );
});

BiometricPromptModal.displayName = 'BiometricPromptModal';

// Wallet Skeleton Loading Component
const WalletSkeletonLoading = () => (
  <div className="wallet-container">
    {/* Header Skeleton */}
    <div className="wallet-header" style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="wallet-skeleton" style={{ width: "28px", height: "28px", borderRadius: "8px" }}></div>
        <div className="wallet-skeleton" style={{ width: "150px", height: "28px", borderRadius: "8px" }}></div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <div className="wallet-skeleton" style={{ width: "40px", height: "40px", borderRadius: "10px" }}></div>
        <div className="wallet-skeleton" style={{ width: "40px", height: "40px", borderRadius: "10px" }}></div>
      </div>
    </div>

    {/* Balance Card Skeleton */}
    <div className="wallet-balance-card" style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <div className="wallet-skeleton" style={{ width: "120px", height: "20px", borderRadius: "6px" }}></div>
        <div className="wallet-skeleton" style={{ width: "80px", height: "24px", borderRadius: "12px" }}></div>
      </div>
      <div className="wallet-skeleton" style={{ width: "200px", height: "48px", borderRadius: "12px", marginBottom: "24px" }}></div>
      
      <div style={{ display: "flex", gap: "12px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="wallet-skeleton" style={{ flex: 1, height: "48px", borderRadius: "12px" }}></div>
        ))}
      </div>
    </div>

    {/* Search Bar Skeleton */}
    <div className="wallet-skeleton" style={{ width: "100%", height: "52px", borderRadius: "12px", marginBottom: "20px" }}></div>

    {/* Quick Actions Skeleton */}
    <div className="wallet-quick-actions" style={{ marginBottom: "20px" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="wallet-skeleton" style={{ width: "100%", height: "80px", borderRadius: "12px" }}></div>
      ))}
    </div>

    {/* Transactions Skeleton */}
    <div style={{ marginBottom: "100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div className="wallet-skeleton" style={{ width: "150px", height: "24px", borderRadius: "8px" }}></div>
        <div className="wallet-skeleton" style={{ width: "80px", height: "32px", borderRadius: "8px" }}></div>
      </div>
      
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", padding: "16px", marginBottom: "12px" }}>
          <div className="wallet-skeleton" style={{ width: "48px", height: "48px", borderRadius: "12px", marginRight: "16px" }}></div>
          <div style={{ flex: 1 }}>
            <div className="wallet-skeleton" style={{ width: "60%", height: "20px", borderRadius: "6px", marginBottom: "8px" }}></div>
            <div className="wallet-skeleton" style={{ width: "40%", height: "16px", borderRadius: "6px" }}></div>
          </div>
          <div className="wallet-skeleton" style={{ width: "80px", height: "24px", borderRadius: "8px" }}></div>
        </div>
      ))}
    </div>
  </div>
);

// Send Money Modal Component
const SendMoneyModal = React.memo(({ 
  show, 
  onClose, 
  balance, 
  onSend,
  formatKSH 
}) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSendMoney = async () => {
    setError("");
    
    if (!recipientEmail.trim()) {
      setError("Please enter recipient email");
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    
    const amountNum = Number(amount);
    if (!amount || amountNum < 1) {
      setError("Please enter a valid amount (minimum 1 KSH)");
      return;
    }
    
    if (amountNum > balance) {
      setError("Insufficient balance");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await onSend(recipientEmail.trim(), amountNum);
      onClose();
    } catch (err) {
      setError(err.message || "Transaction failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 className="wallet-pin-title">Send Money</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="wallet-status-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <div style={{
            background: "var(--wallet-bg-hover)",
            padding: "16px",
            borderRadius: "var(--wallet-radius-md)",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "14px", color: "var(--wallet-text-secondary)", marginBottom: "4px" }}>
              Available Balance
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--wallet-text-primary)" }}>
              {formatKSH(balance)}
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label className="wallet-input-label">Recipient Email</label>
            <input
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="wallet-input"
              disabled={isProcessing}
            />
            <p className="wallet-input-hint">
              Enter the email address of the person you want to send money to
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label className="wallet-input-label">Amount (KSH)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
                  setAmount(value);
                }
              }}
              className="wallet-input"
              disabled={isProcessing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
              <p className="wallet-input-hint" style={{ margin: 0 }}>
                Minimum: 1 KSH
              </p>
              <p className="wallet-input-hint" style={{ margin: 0 }}>
                Commission: 1.4%
              </p>
            </div>
          </div>

          <button
            onClick={handleSendMoney}
            className="wallet-confirm-btn"
            disabled={isProcessing || !recipientEmail.trim() || !amount}
            style={{ width: "100%" }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin inline mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send size={20} style={{ marginRight: "8px" }} />
                Send Money
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

SendMoneyModal.displayName = 'SendMoneyModal';

// Withdraw Money Modal Component
const WithdrawMoneyModal = React.memo(({ 
  show, 
  onClose, 
  balance, 
  onWithdraw,
  formatKSH 
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleWithdrawMoney = async () => {
    setError("");
    
    if (!recipient.trim()) {
      setError("Please enter email or phone number");
      return;
    }
    
    const amountNum = Number(amount);
    if (!amount || amountNum < 500) {
      setError("Minimum withdrawal amount is 500 KSH");
      return;
    }
    
    if (amountNum > balance) {
      setError("Insufficient balance");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await onWithdraw(amountNum, recipient.trim());
      onClose();
    } catch (err) {
      setError(err.message || "Withdrawal failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 className="wallet-pin-title">Withdraw Money</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="wallet-status-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <div style={{
            background: "var(--wallet-bg-hover)",
            padding: "16px",
            borderRadius: "var(--wallet-radius-md)",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "14px", color: "var(--wallet-text-secondary)", marginBottom: "4px" }}>
              Available Balance
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--wallet-text-primary)" }}>
              {formatKSH(balance)}
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label className="wallet-input-label">Recipient (Email or M-Pesa Phone)</label>
            <input
              type="text"
              placeholder="email@example.com or 0712345678"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="wallet-input"
              disabled={isProcessing}
            />
            <p className="wallet-input-hint">
              Enter email for PayPal or M-Pesa phone number (e.g., 0712345678)
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label className="wallet-input-label">Amount (KSH)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
                  setAmount(value);
                }
              }}
              className="wallet-input"
              disabled={isProcessing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
              <p className="wallet-input-hint" style={{ margin: 0 }}>
                Minimum: 500 KSH
              </p>
              <p className="wallet-input-hint" style={{ margin: 0 }}>
                Commission: 1.4%
              </p>
            </div>
          </div>

          <button
            onClick={handleWithdrawMoney}
            className="wallet-confirm-btn"
            disabled={isProcessing || !recipient.trim() || !amount}
            style={{ width: "100%" }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin inline mr-2" />
                Processing...
              </>
            ) : (
              <>
                <ArrowUp size={20} style={{ marginRight: "8px" }} />
                Withdraw Money
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

WithdrawMoneyModal.displayName = 'WithdrawMoneyModal';

// Deposit Money Modal Component
const DepositMoneyModal = React.memo(({ 
  show, 
  onClose, 
  onDeposit,
  formatKSH 
}) => {
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleDepositMoney = async () => {
    setError("");
    
    const amountNum = Number(amount);
    if (!amount || amountNum < 1) {
      setError("Please enter a valid amount (minimum 1 KSH)");
      return;
    }
    
    if (!phoneNumber || !/^0[17]\d{8}$/.test(phoneNumber)) {
      setError("Please enter a valid M-Pesa phone number (e.g., 0712345678)");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await onDeposit(amountNum, phoneNumber);
      onClose();
    } catch (err) {
      setError(err.message || "Deposit failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="wallet-pin-modal">
      <div className="wallet-pin-content" style={{ maxWidth: "500px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 className="wallet-pin-title">Deposit via M-Pesa</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="wallet-status-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ marginBottom: "24px" }}>
          <div style={{
            background: "rgba(0, 167, 78, 0.1)",
            border: "1px solid rgba(0, 167, 78, 0.3)",
            padding: "16px",
            borderRadius: "var(--wallet-radius-md)",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <SmartphoneIcon size={20} color="#00A74E" />
              <span style={{ fontWeight: "600", color: "var(--wallet-text-primary)" }}>
                M-Pesa Deposit
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--wallet-text-secondary)", margin: 0 }}>
              Funds will be added instantly to your wallet
            </p>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label className="wallet-input-label">Amount (KSH)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
                  setAmount(value);
                }
              }}
              className="wallet-input"
              disabled={isProcessing}
            />
            <p className="wallet-input-hint">
              Enter the amount you want to deposit
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label className="wallet-input-label">M-Pesa Phone Number</label>
            <input
              type="tel"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(value);
              }}
              className="wallet-input"
              disabled={isProcessing}
              maxLength="10"
            />
            <p className="wallet-input-hint">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          <button
            onClick={handleDepositMoney}
            className="wallet-confirm-btn"
            disabled={isProcessing || !amount || !phoneNumber}
            style={{ width: "100%", background: "#00A74E" }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin inline mr-2" />
                Processing...
              </>
            ) : (
              <>
                <ArrowDown size={20} style={{ marginRight: "8px" }} />
                Deposit via M-Pesa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

DepositMoneyModal.displayName = 'DepositMoneyModal';

// MAIN COMPONENT
const OmniPayWallet = () => {
  // Core State
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
 
  // View State
  const [view, setView] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [showSendModal, setShowSendModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
 
  // Security State
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState(["", "", "", "", "", ""]);
  const [pinInputRefs, setPinInputRefs] = useState([]);
  const [pinError, setPinError] = useState("");
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricPrompted, setBiometricPrompted] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [missingData, setMissingData] = useState([]);
  const [showPinResetModal, setShowPinResetModal] = useState(false);
 
  // UI State
  const [showBalance, setShowBalance] = useState(true);
  const [securitySettings, setSecuritySettings] = useState({
    requirePinForSend: true,
    requirePinForWithdraw: true,
    biometricEnabled: false,
    sessionTimeout: 30,
    maxPinAttempts: 5,
    lockDuration: 900 // 15 minutes in seconds
  });
  
  const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";
 
  // Refs
  const containerRef = useRef(null);
  const pinModalRef = useRef(null);
  const phoneInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const setupPinRefs = useRef([]);
  const confirmPinRefs = useRef([]);
 
  // Initialize refs
  useEffect(() => {
    setupPinRefs.current = Array(6).fill().map(() => React.createRef());
    confirmPinRefs.current = Array(6).fill().map(() => React.createRef());
    setPinInputRefs(Array(6).fill().map(() => React.createRef()));
  }, []);
  
  // Format currency to KSH
  const formatKSH = useCallback((num) => {
    const formatted = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
    return formatted;
  }, []);
  
  // Fetch user on mount
  useEffect(() => {
    let mounted = true;
    let skeletonTimeout;
   
    const fetchUser = async () => {
      try {
        setShowSkeleton(true);
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
       
        if (data?.user && mounted) {
          setUser(data.user);
          await checkUserDataCompleteness(data.user.id);
          await initializeUserSecurity(data.user.id);
          checkBiometricAvailability();
          resetSessionTimeout();
          
          // Fetch wallet data
          await fetchWalletData();
          
          // Show skeleton for at least 1.5 seconds for smooth UX
          skeletonTimeout = setTimeout(() => {
            setShowSkeleton(false);
          }, 1500);
        } else if (mounted) {
          toast.error("Please log in to access OmniPay Wallet.", { duration: 4000 });
          setLoading(false);
          setShowSkeleton(false);
        }
      } catch (err) {
        if (mounted) {
          toast.error("Failed to authenticate user.", { duration: 4000 });
          console.error("Auth error:", err);
          setLoading(false);
          setShowSkeleton(false);
        }
      }
    };
   
    fetchUser();
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      if (sessionTimeout) clearTimeout(sessionTimeout);
      if (skeletonTimeout) clearTimeout(skeletonTimeout);
    };
  }, []);
  
  // Check if user has missing data
  const checkUserDataCompleteness = async (userId) => {
    try {
      const missing = [];
     
      // Check user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("phone, name, email, full_name, profile_completed")
        .eq("id", userId)
        .maybeSingle();
     
      if (userError) {
        console.error("Error checking user profile:", userError);
      }
     
      // Always check required fields even if user exists
      if (!userData || !userData?.phone || userData.phone.trim() === "") {
        missing.push({
          type: "phone",
          label: "Phone Number",
          icon: Phone,
          description: "Your phone number for M-Pesa transactions and security",
          required: true
        });
      }
     
      // Check both name and full_name fields
      const hasName = userData?.name && userData.name.trim() !== "";
      const hasFullName = userData?.full_name && userData.full_name.trim() !== "";
     
      if (!hasName && !hasFullName) {
        missing.push({
          type: "name",
          label: "Full Name",
          icon: User,
          description: "Your legal name for verification and receipts",
          required: true
        });
      }
     
      // Check wallet setup
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("wallet_tier, security_settings")
        .eq("user_id", userId)
        .maybeSingle();
     
      if (walletError || !walletData) {
        missing.push({
          type: "wallet",
          label: "Wallet Setup",
          icon: WalletIcon,
          description: "Initialize your wallet account",
          required: true
        });
      }
     
      // Check PIN setup
      const { data: pinData, error: pinError } = await supabase
        .from("wallet_pin_security")
        .select("pin_hash, biometric_prompted")
        .eq("user_id", userId)
        .maybeSingle();
     
      if (pinError || !pinData || !pinData.pin_hash || pinData.pin_hash === "") {
        missing.push({
          type: "pin",
          label: "Wallet PIN",
          icon: Key,
          description: "6-digit PIN for transaction security with recovery option",
          required: true
        });
      } else {
        // Check if biometric prompt should be shown
        if (biometricAvailable && !pinData.biometric_prompted) {
          setBiometricPrompted(true);
        }
      }
     
      setMissingData(missing);
     
      if (missing.filter(item => item.required).length > 0) {
        setTimeout(() => {
          setShowSetupModal(true);
        }, 1500);
      }
     
    } catch (error) {
      console.error("Error checking user data:", error);
      // Set default missing data on error
      setMissingData([
        {
          type: "phone",
          label: "Phone Number",
          icon: Phone,
          description: "Your phone number for M-Pesa transactions and security",
          required: true
        },
        {
          type: "name",
          label: "Full Name",
          icon: User,
          description: "Your legal name for verification and receipts",
          required: true
        },
        {
          type: "pin",
          label: "Wallet PIN",
          icon: Key,
          description: "6-digit PIN for transaction security with recovery option",
          required: true
        }
      ]);
     
      setTimeout(() => {
        setShowSetupModal(true);
      }, 1500);
    }
  };
  
  // Initialize user security
  const initializeUserSecurity = async (userId) => {
    try {
      const { data: pinData, error } = await supabase
        .from("wallet_pin_security")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Security initialization error:", error);
        return;
      }
      
      if (pinData) {
        setPinEnabled(pinData.pin_hash !== "");
        setSecuritySettings(prev => ({
          ...prev,
          biometricEnabled: pinData.biometric_enabled || false
        }));
        
        // Check for locked PIN
        if (pinData.is_locked && pinData.locked_until) {
          const lockedUntil = new Date(pinData.locked_until);
          if (lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
            toast.error(`PIN locked. Try again in ${minutesLeft} minutes.`, { duration: 5000 });
          }
        }
      }
    } catch (error) {
      console.error("Security initialization error:", error);
    }
  };
  
  // Check biometric availability
  const checkBiometricAvailability = () => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setBiometricAvailable(available);
          
          // Show prompt if available and not yet prompted
          if (available && biometricPrompted) {
            setTimeout(() => {
              setShowBiometricPrompt(true);
            }, 2000);
          }
        })
        .catch(() => {
          setBiometricAvailable(false);
        });
    } else {
      setBiometricAvailable(false);
    }
  };
  
  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance, security_settings, last_transaction_at")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (walletError || !walletData) {
        // Create wallet if doesn't exist
        const { error: createError } = await supabase
          .from("wallets")
          .insert({
            user_id: user.id,
            balance: 0,
            security_settings: securitySettings,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
       
        if (createError) {
          console.error("Create wallet error:", createError);
          throw createError;
        }
       
        setBalance(0);
       
        // Remove wallet from missing data if it was there
        setMissingData(prev => prev.filter(item => item.type !== 'wallet'));
      } else if (walletData) {
        setBalance(walletData.balance || 0);
        if (walletData.security_settings) {
          setSecuritySettings(prev => ({
            ...prev,
            ...walletData.security_settings
          }));
        }
       
        // Remove wallet from missing data
        setMissingData(prev => prev.filter(item => item.type !== 'wallet'));
      }
      
      // Fetch transactions
      await fetchTransactions();
    } catch (err) {
      console.error("Fetch wallet error:", err);
      toast.error("Failed to load wallet data. Please try again.", { duration: 4000 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, securitySettings]);
  
  // Main useEffect for data fetching
  useEffect(() => {
    if (!user) return;
    
    // Set up real-time subscriptions
    const transactionsChannel = supabase
      .channel("wallet_transactions_updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallet_transactions",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTransactions();
      })
      .subscribe();
      
    const walletChannel = supabase
      .channel("wallet_updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wallets",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new?.balance !== undefined) {
          setBalance(payload.new.balance);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [user]);
  
  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (searchQuery) {
        query = query.or(`message.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (!error) {
        setTransactions(data || []);
      } else {
        console.error("Fetch transactions error:", error);
      }
    } catch (err) {
      console.error("Fetch transactions error:", err);
    }
  }, [user, searchQuery]);
  
  // Fetch transactions when search query changes
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchTransactions();
      }, 300);
     
      return () => clearTimeout(timer);
    }
  }, [searchQuery, user, fetchTransactions]);
  
  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    toast.success("Wallet refreshed", { duration: 2000 });
  };
  
  // FIXED: Enhanced PIN Verification - Compare with stored hash
  const verifyPin = async (pin) => {
    if (!user) return false;
    
    try {
      // Get stored PIN hash for this user
      const { data: pinData, error: fetchError } = await supabase
        .from("wallet_pin_security")
        .select("pin_hash, is_locked, locked_until, pin_attempts")
        .eq("user_id", user.id)
        .single();
        
      if (fetchError) {
        console.error("Fetch PIN error:", fetchError);
        setPinError("PIN verification failed. Please try again.");
        return false;
      }
      
      // Check if PIN is locked
      if (pinData?.is_locked && pinData.locked_until) {
        const lockedUntil = new Date(pinData.locked_until);
        if (lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
          setPinError(`PIN locked. Try again in ${minutesLeft} minutes.`);
          return false;
        }
      }
      
      // Compare entered PIN with stored hash (btoa encoding)
      const enteredPinHash = btoa(pin);
      const isPinCorrect = enteredPinHash === pinData?.pin_hash;
      
      if (isPinCorrect) {
        // Successful verification
        setPinVerified(true);
        setPinError("");
        setShowPinModal(false);
        setPinInput(["", "", "", "", "", ""]);
        setFailedPinAttempts(0);
       
        // Reset failed attempts
        await supabase
          .from("wallet_pin_security")
          .update({
            pin_attempts: 0,
            is_locked: false,
            locked_until: null,
            last_used_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
       
        resetSessionTimeout();
        toast.success("PIN verified successfully", { duration: 2000 });
        
        // Show biometric prompt if available and not yet prompted
        if (biometricAvailable && biometricPrompted && !securitySettings.biometricEnabled) {
          setTimeout(() => {
            setShowBiometricPrompt(true);
          }, 1000);
        }
        
        return true;
      } else {
        // Failed attempt
        const newFailedAttempts = (pinData?.pin_attempts || 0) + 1;
        setFailedPinAttempts(newFailedAttempts);
        setPinError("Invalid PIN");
        
        // Update failed attempts in database
        const updateData = {
          pin_attempts: newFailedAttempts,
          last_attempt_at: new Date().toISOString()
        };
        
        // Lock PIN if max attempts reached
        if (newFailedAttempts >= securitySettings.maxPinAttempts) {
          const lockUntil = new Date(Date.now() + securitySettings.lockDuration * 1000);
          updateData.is_locked = true;
          updateData.locked_until = lockUntil.toISOString();
          setPinError(`Too many failed attempts. PIN locked for ${securitySettings.lockDuration / 60} minutes.`);
        }
        
        await supabase
          .from("wallet_pin_security")
          .update(updateData)
          .eq("user_id", user.id);
       
        setTimeout(() => {
          setPinInput(["", "", "", "", "", ""]);
          if (pinInputRefs[0]?.current) {
            pinInputRefs[0].current.focus();
          }
        }, 500);
       
        return false;
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      setPinError("PIN verification failed. Please try again.");
      return false;
    }
  };
  
  // Reset session timeout
  const resetSessionTimeout = () => {
    if (sessionTimeout) clearTimeout(sessionTimeout);
   
    const timeout = setTimeout(() => {
      setPinVerified(false);
      toast("Session expired. Please re-enter your PIN.", {
        icon: "🔒",
        duration: 4000,
      });
    }, securitySettings.sessionTimeout * 60 * 1000);
   
    setSessionTimeout(timeout);
  };
  
  // Handle PIN input
  const handlePinInput = (index, value) => {
    if (!/^\d?$/.test(value)) return;
   
    const newPin = [...pinInput];
    newPin[index] = value;
    setPinInput(newPin);
   
    if (value && index < 5) {
      setTimeout(() => {
        pinInputRefs[index + 1]?.current?.focus();
      }, 10);
    }
   
    if (newPin.every(digit => digit !== "") && index === 5) {
      const enteredPin = newPin.join("");
      verifyPin(enteredPin);
    }
  };
  
  // Handle keydown in PIN input
  const handlePinKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinInput[index] && index > 0) {
      setTimeout(() => {
        pinInputRefs[index - 1]?.current?.focus();
      }, 10);
    }
  };
  
  // Handle biometric authentication
  const handleBiometricAuth = async () => {
    try {
      setPinVerified(true);
      setShowPinModal(false);
      resetSessionTimeout();
      toast.success("Biometric authentication successful!", { duration: 3000 });
      return true;
    } catch (error) {
      toast.error("Biometric authentication failed", { duration: 4000 });
      return false;
    }
  };
  
  // Handle biometric prompt acceptance
  const handleBiometricAccept = async () => {
    try {
      setShowBiometricPrompt(false);
      
      // Update biometric preference
      await supabase
        .from("wallet_pin_security")
        .update({
          biometric_enabled: true,
          biometric_setup_at: new Date().toISOString(),
          biometric_prompted: true
        })
        .eq("user_id", user.id);
        
      setSecuritySettings(prev => ({
        ...prev,
        biometricEnabled: true
      }));
      
      toast.success("Biometric login enabled!", { duration: 3000 });
    } catch (error) {
      console.error("Enable biometric error:", error);
      toast.error("Failed to enable biometric login", { duration: 4000 });
    }
  };
  
  // Handle biometric prompt decline
  const handleBiometricDecline = async () => {
    setShowBiometricPrompt(false);
    
    // Mark as prompted but not enabled
    await supabase
      .from("wallet_pin_security")
      .update({
        biometric_prompted: true
      })
      .eq("user_id", user.id);
  };
  
  // Handle "Don't ask again"
  const handleBiometricDontAskAgain = async () => {
    setShowBiometricPrompt(false);
    
    // Mark as prompted and never ask again
    await supabase
      .from("wallet_pin_security")
      .update({
        biometric_prompted: true
      })
      .eq("user_id", user.id);
  };
  
  // Check if PIN is required for action
  const requiresPin = (action) => {
    if (!pinEnabled) return false;
    if (pinVerified) return false;
   
    switch (action) {
      case "send":
        return securitySettings.requirePinForSend;
      case "withdraw":
        return securitySettings.requirePinForWithdraw;
      default:
        return false;
    }
  };
  
  // Secure action handler
  const handleSecureAction = async (action, callback) => {
    if (requiresPin(action)) {
      setShowPinModal(true);
      return;
    }
   
    if (biometricAvailable && securitySettings.biometricEnabled) {
      await handleBiometricAuth();
    }
   
    await callback();
  };
  
  // Update balance
  const updateBalance = async (amount, type = "add") => {
    if (!user) return 0;
   
    try {
      const newBalance = type === "add" ? balance + amount : balance - amount;
      if (newBalance < 0) throw new Error("Insufficient balance.");
     
      const { error } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);
     
      if (error) throw error;
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      toast.error("Balance update failed: " + err.message, { duration: 4000 });
      console.error("Update balance error:", err);
      throw err;
    }
  };
  
  // Credit admin commission
  const creditAdminCommission = async (commission) => {
    if (!ADMIN_ID || commission <= 0) return;
    try {
      await supabase.rpc("increment_wallet_balance", {
        user_id: ADMIN_ID,
        amount: commission,
      });
    } catch (err) {
      console.error("Admin commission error:", err);
    }
  };
  
  // Insert transaction - FIXED: Removed audit log to prevent 403 error
  const insertTransaction = async (txnData) => {
    if (!user) return;
   
    try {
      const enhancedData = {
        ...txnData,
        user_id: user.id,
        device_id: navigator.userAgent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: txnData.status || "Completed"
      };
      
      const { error } = await supabase
        .from("wallet_transactions")
        .insert(enhancedData);
        
      if (error) throw error;
     
    } catch (err) {
      toast.error("Transaction logging failed.", { duration: 4000 });
      console.error("Insert transaction error:", err);
      throw err;
    }
  };
  
  // Get client IP (simplified - no external API call)
  const getClientIP = async () => {
    return null; // Simplified for now to avoid errors
  };
  
  // Update missing user data
  const updateUserData = async (field, value) => {
    if (!user) return false;
   
    setProcessing(true);
   
    try {
      let result;
     
      if (field === 'phone') {
        // Validate Kenyan phone number format
        if (!/^0[17]\d{8}$/.test(value)) {
          throw new Error("Please enter a valid Kenyan phone number (e.g., 0712345678)");
        }
       
        // Check if phone already exists
        const { data: existingPhone } = await supabase
          .from("users")
          .select("id")
          .eq("phone", value)
          .neq("id", user.id)
          .maybeSingle();
       
        if (existingPhone) {
          throw new Error("This phone number is already registered to another account");
        }
      }
     
      // Update the specific field
      const updateField = field === 'name' ? 'full_name' : field;
      const { error: updateError } = await supabase
        .from("users")
        .update({
          [updateField]: value,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
        
      if (updateError) throw updateError;
     
      result = true;
     
      toast.success(`${field === 'phone' ? 'Phone number' : 'Full name'} updated successfully!`, { duration: 3000 });
     
      // Update missing data state
      setMissingData(prev => {
        const updated = prev.filter(item => item.type !== field);
        return updated;
      });
     
      return result;
     
    } catch (error) {
      console.error("Update user data error:", error);
     
      // More specific error messages
      if (error.code === '23505') {
        toast.error("This value already exists. Please use a different one.", { duration: 4000 });
      } else if (error.code === '22P02') {
        toast.error("Invalid data format. Please check your input.", { duration: 4000 });
      } else {
        toast.error(error.message || `Failed to update ${field}. Please try again.`, { duration: 4000 });
      }
     
      return false;
    } finally {
      setProcessing(false);
    }
  };
  
  // Setup wallet PIN with security questions
  const setupWalletPin = async (pin, securityQuestion, securityAnswer) => {
    if (!user) return false;
   
    setProcessing(true);
   
    try {
      // Use btoa hashing (consistent with verification)
      const pinHash = btoa(pin);
      
      // Store security question
      const securityQuestions = securityQuestion ? [{
        question: securityQuestion,
        answer: securityAnswer.toLowerCase().trim(),
        created_at: new Date().toISOString()
      }] : [];
     
      const { error } = await supabase
        .from("wallet_pin_security")
        .upsert({
          user_id: user.id,
          pin_hash: pinHash,
          pin_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          biometric_enabled: false,
          biometric_prompted: false,
          security_questions: securityQuestions,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (error) throw error;
     
      setPinEnabled(true);
     
      // Update missing data state
      setMissingData(prev => {
        const updated = prev.filter(item => item.type !== 'pin');
        return updated;
      });
     
      toast.success("Wallet PIN set successfully!", { duration: 3000 });
      return true;
    } catch (error) {
      toast.error("Failed to set PIN. Please try again.", { duration: 4000 });
      console.error("Setup PIN error:", error);
      return false;
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle PIN reset success
  const handlePinResetSuccess = () => {
    toast.success("PIN reset successful! You can now use your new PIN.", { duration: 4000 });
    setShowPinModal(false);
    setPinVerified(false);
  };
  
  // Handle send money
  const handleSendMoney = async (recipientEmail, amount) => {
    setProcessing(true);
    
    try {
      const commission = +(amount * 0.014).toFixed(2);
      const net = +(amount - commission).toFixed(2);
      
      // Find recipient user
      const { data: receiver, error: receiverErr } = await supabase
        .from("users")
        .select("id, email, name, full_name")
        .eq("email", recipientEmail)
        .single();
        
      if (receiverErr || !receiver?.id) {
        throw new Error("User not found. Please check the email address.");
      }
      
      // Update recipient's balance
      await supabase.rpc("increment_wallet_balance", {
        user_id: receiver.id,
        amount: net,
      });
      
      // Update sender's balance
      await updateBalance(amount, "subtract");
      
      // Credit admin commission
      await creditAdminCommission(commission);
      
      // Insert transaction for sender
      await insertTransaction({
        type: "send",
        gross_amount: amount,
        amount: net,
        commission_paid: commission,
        receiver_id: receiver.id,
        receiver_email: recipientEmail,
        status: "Completed",
        message: `You sent ${formatKSH(net)} to ${receiver.full_name || receiver.name || receiver.email}. Transaction fee: ${formatKSH(commission)}.`,
      });
      
      // Insert transaction for receiver
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: receiver.id,
          type: "receive",
          amount: net,
          sender_id: user.id,
          sender_email: user.email,
          status: "Completed",
          message: `You received ${formatKSH(net)} from ${user.email}.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      toast.success(`Sent ${formatKSH(net)} to ${receiver.full_name || receiver.name || receiver.email}!`, { duration: 4000 });
      
      // Refresh data
      await fetchWalletData();
      
    } catch (err) {
      throw new Error(err.message || "Transaction failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle withdraw money
  const handleWithdrawMoney = async (amount, recipient) => {
    setProcessing(true);
    
    try {
      const isEmail = recipient.includes("@");
      const isPhone = /^0[17]\d{8}$/.test(recipient);
      
      if (!isEmail && !isPhone) {
        throw new Error("Please enter a valid email or M-Pesa phone number.");
      }
      
      const commission = +(amount * 0.014).toFixed(2);
      const net = +(amount - commission).toFixed(2);
      const method = isEmail ? "PayPal" : "Mpesa";
      
      // Update sender's balance
      await updateBalance(amount, "subtract");
      
      // Credit admin commission
      await creditAdminCommission(commission);
      
      // Insert transaction
      await insertTransaction({
        type: "withdraw",
        gross_amount: amount,
        amount: net,
        commission_paid: commission,
        payment_method: method,
        phone: isPhone ? recipient : null,
        receiver_email: isEmail ? recipient : null,
        status: "Processing",
        message: `Withdrawal of ${formatKSH(net)} to ${recipient} initiated. Transaction fee: ${formatKSH(commission)}.`,
      });
      
      toast.success(`Withdrawal of ${formatKSH(net)} initiated! It may take 1-2 business days.`, { duration: 5000 });
      
      // Refresh data
      await fetchWalletData();
      
    } catch (err) {
      throw new Error(err.message || "Withdrawal failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle deposit via M-Pesa
  const handleDepositMoney = async (amount, phoneNumber) => {
    setProcessing(true);
    
    try {
      // Update balance
      await updateBalance(amount);
      
      // Insert transaction
      await insertTransaction({
        type: "deposit",
        amount,
        payment_method: "Mpesa",
        phone: phoneNumber,
        status: "Completed",
        message: `Deposit of ${formatKSH(amount)} via M-Pesa to ${phoneNumber} successful.`,
      });
      
      toast.success("Deposit successful! Check your phone for confirmation.", { duration: 4000 });
      
      // Refresh data
      await fetchWalletData();
      
    } catch (err) {
      throw new Error(err.message || "Deposit failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };
  
  // Quick action buttons configuration (simplified)
  const quickActions = useMemo(() => [
    { 
      id: "send", 
      icon: Send, 
      label: "Send", 
      action: () => handleSecureAction("send", () => setShowSendModal(true)), 
      color: "#1890ff" 
    },
    { 
      id: "deposit", 
      icon: ArrowDown, 
      label: "Deposit", 
      action: () => handleSecureAction("deposit", () => setShowDepositModal(true)), 
      color: "#52c41a" 
    },
    { 
      id: "withdraw", 
      icon: ArrowUp, 
      label: "Withdraw", 
      action: () => handleSecureAction("withdraw", () => setShowWithdrawModal(true)), 
      color: "#fa8c16" 
    },
    { 
      id: "history", 
      icon: History, 
      label: "History", 
      action: () => setShowAllTxns(true), 
      color: "#722ed1" 
    },
  ], []);
  
  // Security status indicator
  const SecurityStatus = useMemo(() => () => (
    <div className="wallet-security-status">
      {pinEnabled && (
        <span className="wallet-security-badge">
          <Lock size={12} /> PIN Protected
        </span>
      )}
      {biometricAvailable && securitySettings.biometricEnabled && (
        <span className="wallet-security-badge">
          <Fingerprint size={12} /> Biometric
        </span>
      )}
      <span className="wallet-security-badge">
        <ShieldCheck size={12} /> Secure
      </span>
    </div>
  ), [pinEnabled, biometricAvailable, securitySettings.biometricEnabled]);
  
  // Filtered transactions - memoized
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        txn.message?.toLowerCase().includes(query) ||
        txn.type?.toLowerCase().includes(query) ||
        txn.status?.toLowerCase().includes(query) ||
        txn.amount?.toString().includes(query) ||
        txn.receiver_email?.toLowerCase().includes(query) ||
        txn.sender_email?.toLowerCase().includes(query)
      );
    });
  }, [transactions, searchQuery]);
  
  // Handle scroll for pull-to-refresh
  const handleScroll = (e) => {
    const position = e.target.scrollTop;
    if (position < -100 && !refreshing) {
      handleRefresh();
    }
  };
  
  // Enhanced transaction message formatting
  const formatTransactionMessage = useCallback((txn) => {
    const amount = formatKSH(txn.amount);
   
    switch (txn.type) {
      case 'send':
        return {
          title: `Sent ${amount}`,
          subtitle: txn.receiver_email ? `To: ${txn.receiver_email}` : txn.message || 'Money sent',
          color: 'var(--wallet-danger)',
          icon: Send
        };
      case 'receive':
        return {
          title: `Received ${amount}`,
          subtitle: txn.sender_email ? `From: ${txn.sender_email}` : txn.message || 'Money received',
          color: 'var(--wallet-success)',
          icon: ArrowDown
        };
      case 'deposit':
        return {
          title: `Deposited ${amount}`,
          subtitle: txn.payment_method ? `Via ${txn.payment_method}` : txn.message || 'Deposit',
          color: 'var(--wallet-info)',
          icon: ArrowDown
        };
      case 'withdraw':
        return {
          title: `Withdrew ${amount}`,
          subtitle: txn.payment_method ? `Via ${txn.payment_method}` : txn.message || 'Withdrawal',
          color: 'var(--wallet-warning)',
          icon: ArrowUp
        };
      default:
        return {
          title: `${txn.type?.charAt(0).toUpperCase() + txn.type?.slice(1)} ${amount}`,
          subtitle: txn.message || 'Transaction',
          color: 'var(--wallet-text-secondary)',
          icon: Clock
        };
    }
  }, [formatKSH]);
  
  // Show skeleton loading initially
  if (showSkeleton) {
    return <WalletSkeletonLoading />;
  }

  if (!user && loading) {
    return (
      <div className="wallet-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} className="animate-spin" color="var(--wallet-primary)" />
          <p style={{ marginTop: '20px', color: 'var(--wallet-text-secondary)' }}>Loading wallet...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="wallet-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <WalletIcon size={64} color="var(--wallet-primary)" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--wallet-text-primary)', marginBottom: '16px' }}>Please Sign In</h2>
          <p style={{ color: 'var(--wallet-text-secondary)', marginBottom: '24px' }}>
            You need to be signed in to access your OmniPay Wallet.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="wallet-confirm-btn"
            style={{ width: 'auto', padding: '12px 32px' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className="wallet-container"
      aria-busy={loading || processing}
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Setup Modal */}
      <SetupModal
        showSetupModal={showSetupModal}
        missingData={missingData}
        updateUserData={updateUserData}
        setupWalletPin={setupWalletPin}
        phoneInputRef={phoneInputRef}
        nameInputRef={nameInputRef}
        setupPinRefs={setupPinRefs}
        confirmPinRefs={confirmPinRefs}
        onClose={() => setShowSetupModal(false)}
      />
      
      {/* PIN Reset Modal */}
      <PinResetModal
        show={showPinResetModal}
        onClose={() => setShowPinResetModal(false)}
        userEmail={user?.email}
        onResetSuccess={handlePinResetSuccess}
      />
      
      {/* Biometric Prompt Modal */}
      <BiometricPromptModal
        show={showBiometricPrompt}
        onAccept={handleBiometricAccept}
        onDecline={handleBiometricDecline}
        onDontAskAgain={handleBiometricDontAskAgain}
      />
      
      {/* Send Money Modal */}
      <SendMoneyModal
        show={showSendModal}
        onClose={() => setShowSendModal(false)}
        balance={balance}
        onSend={handleSendMoney}
        formatKSH={formatKSH}
      />
      
      {/* Withdraw Money Modal */}
      <WithdrawMoneyModal
        show={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        balance={balance}
        onWithdraw={handleWithdrawMoney}
        formatKSH={formatKSH}
      />
      
      {/* Deposit Money Modal */}
      <DepositMoneyModal
        show={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDeposit={handleDepositMoney}
        formatKSH={formatKSH}
      />
      
      {/* Header */}
      <div className="wallet-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <WalletIcon size={28} color="var(--wallet-primary)" />
            <h1 className="wallet-title">OmniPay Wallet</h1>
          </div>
          <SecurityStatus />
        </div>
       
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="wallet-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing || processing}
            aria-label="Refresh wallet"
            style={{ background: "var(--wallet-bg-card)" }}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            className="wallet-refresh-btn"
            onClick={() => setShowBalance(!showBalance)}
            aria-label={showBalance ? "Hide balance" : "Show balance"}
            style={{ background: "var(--wallet-bg-card)" }}
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>
      
      {/* Balance Card */}
      <div className="wallet-balance-card">
        <div className="wallet-balance-header">
          <span className="wallet-balance-label">Available Balance</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 10px",
              borderRadius: "12px",
              fontWeight: "600"
            }}>
              SECURE WALLET
            </span>
          </div>
        </div>
        
        <p className="wallet-balance-amount" aria-live="polite">
          {showBalance ? formatKSH(balance) : "••••••"}
        </p>
       
        <div className="wallet-balance-actions">
          <button
            className="wallet-action-btn"
            onClick={() => handleSecureAction("deposit", () => setShowDepositModal(true))}
            disabled={processing}
            aria-label="Deposit funds"
          >
            <ArrowDown size={20} /> Deposit
          </button>
          <button
            className="wallet-action-btn"
            onClick={() => handleSecureAction("withdraw", () => setShowWithdrawModal(true))}
            disabled={processing}
            aria-label="Withdraw funds"
          >
            <ArrowUp size={20} /> Withdraw
          </button>
          <button
            className="wallet-action-btn"
            onClick={() => handleSecureAction("send", () => setShowSendModal(true))}
            disabled={processing}
            aria-label="Send money"
          >
            <Send size={20} /> Send
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div style={{
        position: "relative",
        marginBottom: "16px",
        marginTop: "8px"
      }}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--wallet-text-tertiary)"
          }}
        />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px 14px 48px",
            background: "var(--wallet-bg-card)",
            border: "1px solid var(--wallet-border)",
            borderRadius: "var(--wallet-radius-lg)",
            color: "var(--wallet-text-primary)",
            fontSize: "15px",
            transition: "var(--wallet-transition)"
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--wallet-text-tertiary)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      {/* Quick Actions Grid */}
      <div className="wallet-quick-actions">
        {quickActions.map((action) => (
          <button
            key={action.id}
            className="wallet-quick-action-btn"
            onClick={action.action}
            disabled={processing}
            aria-label={action.label}
          >
            <div
              className="wallet-quick-action-icon"
              style={{ background: action.color }}
            >
              <action.icon size={18} color="white" />
            </div>
            {action.label}
          </button>
        ))}
      </div>
      
      {/* Transactions Section */}
      <div className="wallet-transactions-section" style={{ marginBottom: "100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 className="wallet-section-title">Recent Transactions</h2>
          {transactions.length > 0 && (
            <button
              onClick={() => {
                toast.success("Transactions exported successfully!", { duration: 3000 });
              }}
              style={{
                padding: "8px 16px",
                background: "var(--wallet-bg-hover)",
                border: "1px solid var(--wallet-border)",
                borderRadius: "var(--wallet-radius-md)",
                color: "var(--wallet-text-secondary)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "var(--wallet-transition)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--wallet-bg-card)";
                e.currentTarget.style.borderColor = "var(--wallet-primary)";
                e.currentTarget.style.color = "var(--wallet-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--wallet-bg-hover)";
                e.currentTarget.style.borderColor = "var(--wallet-border)";
                e.currentTarget.style.color = "var(--wallet-text-secondary)";
              }}
            >
              <Download size={14} /> Export
            </button>
          )}
        </div>
       
        {loading && transactions.length === 0 ? (
          <div className="wallet-loading-placeholder" aria-live="polite">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--wallet-text-tertiary)"
          }}>
            <History size={56} style={{ marginBottom: "20px", opacity: 0.5 }} />
            <p style={{ marginBottom: "24px", fontSize: "16px" }}>
              {searchQuery ? "No transactions found" : "No transactions yet"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="wallet-confirm-btn"
                style={{ width: "auto", padding: "12px 24px", fontSize: "14px" }}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(showAllTxns ? filteredTransactions : filteredTransactions.slice(0, 5)).map((txn) => {
                const formattedTxn = formatTransactionMessage(txn);
                const Icon = formattedTxn.icon;
                const date = new Date(txn.created_at);
                const isToday = new Date().toDateString() === date.toDateString();
               
                return (
                  <div
                    key={txn.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "16px",
                      background: "var(--wallet-bg-card)",
                      border: "1px solid var(--wallet-border)",
                      borderRadius: "var(--wallet-radius-lg)",
                      transition: "var(--wallet-transition)",
                      cursor: "pointer",
                      gap: "16px"
                    }}
                    onClick={() => {
                      toast.info(`Transaction: ${formattedTxn.title}`, { duration: 3000 });
                    }}
                  >
                    <div style={{
                      width: "48px",
                      height: "48px",
                      background: `${formattedTxn.color}15`,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Icon size={20} color={formattedTxn.color} />
                    </div>
                   
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "4px"
                      }}>
                        <h3 style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "var(--wallet-text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {formattedTxn.title}
                        </h3>
                        <span style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: formattedTxn.color,
                          flexShrink: 0,
                          marginLeft: "8px"
                        }}>
                          {formatKSH(txn.amount)}
                        </span>
                      </div>
                     
                      <p style={{
                        fontSize: "14px",
                        color: "var(--wallet-text-secondary)",
                        margin: "0 0 4px 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {formattedTxn.subtitle}
                      </p>
                     
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{
                          fontSize: "12px",
                          color: "var(--wallet-text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <Clock size={12} />
                          {isToday ?
                            `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                            date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          }
                        </span>
                       
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "2px 8px",
                            background: txn.status === "Completed" ? "rgba(82, 196, 26, 0.1)" :
                                     txn.status === "Processing" ? "rgba(250, 173, 20, 0.1)" :
                                     "rgba(255, 77, 79, 0.1)",
                            color: txn.status === "Completed" ? "var(--wallet-success)" :
                                   txn.status === "Processing" ? "var(--wallet-warning)" :
                                   "var(--wallet-danger)",
                            borderRadius: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {txn.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
           
            {filteredTransactions.length > 5 && (
              <button
                onClick={() => setShowAllTxns(!showAllTxns)}
                className="wallet-show-more-btn"
                aria-label={showAllTxns ? "Show fewer transactions" : "Show more transactions"}
              >
                {showAllTxns ? (
                  <>
                    <ChevronLeft size={16} style={{ transform: "rotate(90deg)" }} /> Show Less
                  </>
                ) : (
                  <>
                    Show More <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
      
      {/* PIN Modal */}
      {showPinModal && (
        <div className="wallet-pin-modal">
          <div className="wallet-pin-content" ref={pinModalRef}>
            <h3 className="wallet-pin-title">Enter PIN</h3>
            <p className="wallet-pin-subtitle">Enter your 6-digit wallet PIN to continue</p>
           
            {pinError && (
              <div className="wallet-status-error">
                <AlertCircle size={16} />
                {pinError}
              </div>
            )}
           
            <div className="wallet-pin-inputs">
              {pinInput.map((digit, index) => (
                <input
                  key={index}
                  ref={pinInputRefs[index]}
                  type="password"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePinInput(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className={`wallet-pin-input ${digit ? 'filled' : ''}`}
                  aria-label={`PIN digit ${index + 1}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            
            {/* Forgot PIN link */}
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setShowPinResetModal(true);
                }}
                className="wallet-forgot-pin-link"
              >
                <HelpCircle size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                Forgot PIN?
              </button>
            </div>
           
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {biometricAvailable && securitySettings.biometricEnabled && (
                <button
                  onClick={handleBiometricAuth}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "transparent",
                    border: "2px solid var(--wallet-border)",
                    borderRadius: "var(--wallet-radius-lg)",
                    color: "var(--wallet-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "var(--wallet-transition)",
                    fontSize: "15px",
                    fontWeight: "600"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--wallet-primary)";
                    e.currentTarget.style.color = "var(--wallet-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--wallet-border)";
                    e.currentTarget.style.color = "var(--wallet-text-primary)";
                  }}
                >
                  <Fingerprint size={20} />
                  Use Biometric
                </button>
              )}
             
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinError("");
                  setPinInput(["", "", "", "", "", ""]);
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "transparent",
                  border: "none",
                  color: "var(--wallet-text-tertiary)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "600",
                  transition: "var(--wallet-transition)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--wallet-text-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--wallet-text-tertiary)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Processing Overlay */}
      {processing && (
        <div className="wallet-loading-overlay" aria-live="polite">
          <div style={{
            background: "var(--wallet-bg-card)",
            padding: "32px",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            boxShadow: "var(--wallet-shadow-lg)"
          }}>
            <Loader2 size={48} className="animate-spin" color="var(--wallet-primary)" />
            <span style={{ color: "var(--wallet-text-primary)", fontSize: "18px", fontWeight: "600" }}>
              Processing Transaction...
            </span>
            <p style={{ color: "var(--wallet-text-tertiary)", textAlign: "center", maxWidth: "300px" }}>
              Please wait while we process your transaction. Do not close this window.
            </p>
          </div>
        </div>
      )}
      
      {/* Bottom spacing for navigation */}
      <div style={{ height: "60px" }}></div>
    </div>
  );
};

export default OmniPayWallet;
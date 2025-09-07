import React, { useState, useEffect } from "react";
import { motion } from "framer-motion"; // For smooth animation
import './Card.css'; // Styling for the card component

const Card = () => {
  const [flipped, setFlipped] = useState(false);

  const cardData = {
    cardNumber: "**** **** **** 3456", // Masked card number
    cardholder: "John Doe", // Cardholder name
    expiry: "12/25", // Expiry date
    cvc: "***", // CVC for back side
  };

  // Auto-flip after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setFlipped(true); // Flip the card after 30 seconds
    }, 30000);

    return () => clearTimeout(timer); // Clean up the timer
  }, []);

  return (
    <motion.div
      className={`card-container ${flipped ? "flipped" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="card">
        {/* Front of the card */}
        <div className="card-front">
          <div className="card-header">
            <span className="card-logo">VISA</span>
            <span className="card-chip">💳</span>
          </div>
          <div className="card-number">
            <span>{cardData.cardNumber}</span>
          </div>
          <div className="card-details">
            <div className="cardholder">
              <span>{cardData.cardholder}</span>
            </div>
            <div className="card-expiry">
              <span>{cardData.expiry}</span>
            </div>
          </div>
        </div>

        {/* Back of the card */}
        <div className="card-back">
          <div className="card-bar"></div>
          <div className="card-cvc">
            <span>CVC: {cardData.cvc}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;

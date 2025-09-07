import React from "react";
import "./Messages.css"; // Reuse same styles for consistency

const MessageOptionsModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="message-modal-overlay" onClick={onClose}>
      <div
        className="message-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg mb-2">Message Options</h2>
        <p className="text-sm text-gray-400 mb-4">{message.content}</p>

        {/* Future features could go here */}
        <button className="message-modal-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default MessageOptionsModal;

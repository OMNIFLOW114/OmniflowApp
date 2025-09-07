import React, { useState } from "react";
import { motion } from "framer-motion";

const AIBuddy = () => {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendToBuddy = async () => {
    setLoading(true);
    const reply = await callGroq(`You're a helpful and friendly AI Buddy.
    A student says: "${message}". Reply like a caring friend who knows how to motivate, support, and give helpful thoughts.`);
    setResponse(reply);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-pink-50 to-yellow-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-pink-600 mb-4">🧠 Talk to your AI Buddy</h1>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-4 border rounded mb-4"
          rows={4}
          placeholder="What's on your mind today?"
        />
        <button
          onClick={sendToBuddy}
          className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600"
        >
          Talk to Buddy
        </button>

        {loading && <p className="text-pink-400 mt-3 animate-pulse">Typing response...</p>}

        {response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-white p-6 rounded-xl shadow"
          >
            <p className="whitespace-pre-wrap">{response}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIBuddy;

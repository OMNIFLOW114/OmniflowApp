// src/pages/student/flashcards/CreateFlashcards.jsx
import React, { useState } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { motion } from "framer-motion";

const CreateFlashcards = () => {
  const { currentUser } = useAuth();
  const [topic, setTopic] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!topic || !front || !back) {
      setMessage("⚠️ Please fill in all fields.");
      return;
    }

    try {
      const topicRef = doc(db, "users", currentUser.uid, "flashcards", topic);
      const docSnap = await getDoc(topicRef);

      const newCard = { front, back };

      if (docSnap.exists()) {
        // 🔁 Append to existing array
        await updateDoc(topicRef, {
          cards: arrayUnion(newCard),
        });
      } else {
        // 🆕 Create new topic document with initial card
        await setDoc(topicRef, {
          topic,
          cards: [newCard],
          createdAt: serverTimestamp(),
        });
      }

      setMessage("✅ Flashcard added!");
      setFront("");
      setBack("");
    } catch (error) {
      console.error("Error saving flashcard:", error);
      setMessage("❌ Failed to save. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-blue-50 p-6 text-gray-800">
      <div className="max-w-xl mx-auto text-center mb-10">
        <h1 className="text-3xl font-bold text-violet-700 mb-2">✍️ Create Flashcards</h1>
        <p className="text-gray-600">Organize by topic. Build your own study deck!</p>
      </div>

      <motion.div
        className="bg-white p-6 rounded-xl shadow-xl max-w-xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <input
          type="text"
          placeholder="Topic (e.g., Physics)"
          className="w-full mb-4 p-3 border rounded"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <textarea
          placeholder="Front of card (Question)"
          className="w-full mb-4 p-3 border rounded"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={3}
        />
        <textarea
          placeholder="Back of card (Answer)"
          className="w-full mb-4 p-3 border rounded"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
        />

        <button
          onClick={handleSave}
          className="w-full bg-violet-600 text-white py-3 rounded hover:bg-violet-700 transition"
        >
          Save Flashcard
        </button>

        {message && (
          <p className="mt-4 text-sm text-center text-violet-700 font-medium">
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default CreateFlashcards;

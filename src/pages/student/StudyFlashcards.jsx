// src/pages/student/flashcards/StudyFlashcards.jsx
import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { FaRandom, FaArrowLeft, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { useAuth } from "@/AuthContext";

const StudyFlashcards = () => {
  const { currentUser } = useAuth();
  const [flashcards, setFlashcards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      const snapshot = await getDocs(collection(db, "users", currentUser.uid, "flashcards"));
      let allCards = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.cards)) {
          data.cards.forEach((card) => {
            allCards.push({ ...card, topic: data.topic || "General" });
          });
        }
      });

      setFlashcards(allCards);
    };

    if (currentUser) {
      fetchCards();
    }
  }, [currentUser]);

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    setIndex((prev) => (prev + 1 < flashcards.length ? prev + 1 : 0));
    setFlipped(false);
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flashcards.length - 1));
    setFlipped(false);
  };

  const handleShuffle = () => {
    const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffledCards);
    setIndex(0);
    setFlipped(false);
    setShuffled(true);
  };

  const currentCard = flashcards[index];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50 py-10 px-4 text-center text-gray-800">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">📚 Study Flashcards</h1>

      {flashcards.length === 0 ? (
        <p className="text-gray-500">No flashcards found. Create some first.</p>
      ) : (
        <>
          <motion.div
            className="relative w-full max-w-sm mx-auto h-64 bg-white rounded-xl shadow-lg flex items-center justify-center text-xl font-semibold cursor-pointer"
            onClick={handleFlip}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ perspective: 1000 }}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center px-6 py-4 rounded-xl"
              style={{
                backfaceVisibility: "hidden",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {flipped ? currentCard.back : currentCard.front}
            </motion.div>
          </motion.div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handlePrev}
              className="bg-gray-200 hover:bg-gray-300 p-3 rounded-full"
            >
              <FaArrowLeft />
            </button>
            <button
              onClick={handleShuffle}
              className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full"
            >
              <FaRandom />
            </button>
            <button
              onClick={handleNext}
              className="bg-gray-200 hover:bg-gray-300 p-3 rounded-full"
            >
              <FaArrowRight />
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Card {index + 1} of {flashcards.length} <br />
            <span className="text-xs italic text-violet-500">Topic: {currentCard.topic}</span>
            {shuffled && <span className="ml-2 text-green-500">🔀 Shuffled</span>}
          </div>

          <div className="mt-6 flex justify-center items-center text-green-600 font-semibold">
            <FaCheckCircle className="mr-2" />
            XP rewards and progress tracking coming soon!
          </div>
        </>
      )}
    </div>
  );
};

export default StudyFlashcards;

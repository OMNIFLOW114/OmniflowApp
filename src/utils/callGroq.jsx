// src/utils/callGroq.js
export const callGroq = async (prompt) => {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // or "gpt-3.5-turbo" if preferred
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "❌ No response from Groq AI.";
  } catch (err) {
    console.error("Groq API Error:", err);
    return "❌ Failed to connect to Groq AI.";
  }
};

const functions = require("firebase-functions");
const { Configuration, OpenAIApi } = require("openai");
const cors = require("cors")({ origin: true });

// Set up OpenAI API with the API key from Firebase config
const configuration = new Configuration({
  apiKey: functions.config().openai.key,
});
const openai = new OpenAIApi(configuration);

// Cloud Function to generate a bio
exports.generateBio = functions.https.onRequest(async (req, res) => {
  // Allow requests from any origin
  cors(req, res, async () => {
    try {
      // Destructure the incoming request body to get the necessary fields
      const { fullName, jobTitle, company, skills, interests } = req.body;

      // Validate the required fields
      if (!fullName || !jobTitle || !company || !skills || !interests) {
        return res.status(400).send({ error: "Missing required fields." });
      }

      // Create a prompt for OpenAI's GPT model
      const prompt = `Write a short professional bio for a person named ${fullName}, who works as a ${jobTitle} at ${company}, with skills in ${skills}. Their interests include ${interests}. Make it friendly and inspiring.`;

      // Generate the bio using OpenAI's GPT-3.5 model
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });

      // Extract the generated bio and send it in the response
      const bio = completion.data.choices[0].message.content.trim();
      return res.status(200).send({ bio });
    } catch (error) {
      console.error("Error generating bio:", error);
      return res.status(500).send({ error: error.message });
    }
  });
});

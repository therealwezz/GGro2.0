const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('../frontend'));

app.get('/health', (req, res) => {
  res.json({
    status: 'PlantDoc server running'
  });
});

const SYSTEM_PROMPT = `
You are PlantDoc, an expert agricultural AI assistant.

You specialize in:
- Plant disease diagnosis
- Crop health analysis
- Fungus detection
- Pest identification
- Nutrient deficiency diagnosis
- Agricultural recommendations

Focus especially on crops commonly grown in Cameroon and Sub-Saharan Africa.

IMPORTANT:

Return ONLY valid JSON.

{
  "disease": {
    "name": "",
    "confidence": 0,
    "description": "",
    "causedBy": "",
    "affectedParts": [],
    "severity": ""
  },
  "symptoms": [],
  "treatment": {
    "chemical": [],
    "organic": [],
    "prevention": []
  },
  "medications": [
    {
      "name": "",
      "activeIngredient": "",
      "type": "",
      "dosage": "",
      "frequency": ""
    }
  ],
  "urgency": "",
  "urgencyMessage": "",
  "searchTerms": []
}
`;

app.post('/api/analyze', async (req, res) => {
  try {

    const { messages, mode } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request format'
      });
    }

    let contents = [];

    const firstMessage = messages[0];

    if (
      (mode === 'camera' || mode === 'image') &&
      firstMessage.content
    ) {

      const imagePart = firstMessage.content.find(
        p => p.type === 'image'
      );

      const textPart = firstMessage.content.find(
        p => p.type === 'text'
      );

      if (!imagePart) {
        return res.status(400).json({
          error: 'No image found'
        });
      }

      contents = [
        {
          text: SYSTEM_PROMPT
        },
        {
          inlineData: {
            mimeType: imagePart.source.media_type,
            data: imagePart.source.data
          }
        },
        {
          text: textPart?.text || 'Analyze this plant.'
        }
      ];

    } else {

      contents = [
        {
          text:
            SYSTEM_PROMPT +
            '\n\n' +
            firstMessage.content
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents
    });

    const text = response.text || '';

    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {

      console.error('Gemini output:');
      console.error(text);

      return res.status(500).json({
        error:
          'Gemini returned invalid JSON. Check server logs.'
      });
    }

    res.json(parsed);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});


// ── FOLLOW-UP CHAT ENDPOINT ───────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    // Build Gemini contents from chat history
    // First message is our context-primer (user role), second is assistant ack,
    // then the rest is the real conversation
    const systemContext = messages[0]?.content || '';
    const conversation = messages.slice(2); // skip context + ack

    // Build a single string: system context + turn-by-turn dialogue
    let prompt = `You are Gro, a friendly and knowledgeable plant disease AI assistant for Cameroonian farmers.
${systemContext}

Conversation so far:
`;
    for (const msg of conversation) {
      const role = msg.role === 'user' ? 'Farmer' : 'Gro AI';
      prompt += `${role}: ${msg.content}\n`;
    }
    prompt += 'Gro AI:';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
    });

    const reply = (response.text || '').trim();
    res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `PlantDoc server running on port ${PORT}`
  );
});
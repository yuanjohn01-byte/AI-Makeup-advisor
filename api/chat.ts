import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  console.log("Chat API triggered");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatHistory = [], currentInput, language = 'en' } = req.body;

  if (!currentInput) {
    console.error("Missing currentInput in request body");
    return res.status(400).json({ error: 'Missing input' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Reverting to the original model name
    const modelName = "gemini-3-flash-preview";
    console.log(`Using model: ${modelName}`);

    const targetLang = language === 'zh' ? 'Chinese' : 'English';

    const systemInstruction = `
      You are a supportive, high-energy "Makeup Bestie". 
      ALWAYS RESPOND IN: ${targetLang}.
      
      YOUR MISSION: 
      Collect two key pieces of information from the user:
      1. Makeup Style (e.g., Natural, Bold, Vintage, K-Pop).
      2. Environment/Occasion (e.g., Office, Date, Party, Wedding).

      BEHAVIOR:
      - If Style is missing, ask about their desired look.
      - If Environment is missing, ask where they are going.
      - If both are present, confirm their choice and tell them you are ready for the face scan.
      - ALWAYS keep the conversation helpful and focused.

      MANDATORY: RESPONSE MUST BE A SINGLE VALID JSON OBJECT.
      JSON Structure:
      {
        "reply_text": "Your friendly message in ${targetLang}",
        "extracted_concerns": ["concise_tag_in_en"],
        "extracted_style": ["one_main_style_in_en"],
        "extracted_environment": "one_main_env_in_en or null",
        "is_ready": true/false
      }
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply_text: { type: Type.STRING },
        extracted_concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
        extracted_style: { type: Type.ARRAY, items: { type: Type.STRING } },
        extracted_environment: { type: Type.STRING, nullable: true },
        is_ready: { type: Type.BOOLEAN }
      },
      required: ["reply_text", "extracted_concerns", "extracted_style", "is_ready"]
    };

    const historyPrompt = chatHistory.length > 0 
      ? `History:\n${chatHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\nUser: ${currentInput}`
      : `User: ${currentInput}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: historyPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (!response.text) {
      console.error("Gemini API returned an empty response text");
      throw new Error("Empty response from AI model");
    }

    console.log("Successfully received chat response from Gemini");
    return res.status(200).json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Chat API Error Details:", {
      message: error.message,
      stack: error.stack,
      status: error.status,
      details: error.details
    });
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

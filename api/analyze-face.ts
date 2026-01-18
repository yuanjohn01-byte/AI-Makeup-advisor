import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  console.log("Analyze Face API triggered");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image, subjectiveConcerns = [], makeupGoals = [], language = 'en' } = req.body;

  if (!base64Image) {
    console.error("Missing base64Image in request");
    return res.status(400).json({ error: 'Missing image data' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Reverting to the original model name as requested
    const modelName = "gemini-3-flash-preview";
    console.log(`Using model: ${modelName}`);
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        faceShape: { type: Type.STRING },
        skinTone: { type: Type.STRING },
        eyeShape: { type: Type.STRING },
        summary: { type: Type.STRING },
        scores: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              A: { type: Type.NUMBER },
              fullMark: { type: Type.NUMBER },
            }
          }
        }
      }
    };

    const targetLang = language === 'zh' ? 'Chinese' : 'English';
    const concernsStr = subjectiveConcerns.length > 0 ? subjectiveConcerns.join(", ") : "None";
    const goalsStr = makeupGoals.length > 0 ? makeupGoals.join(", ") : "Natural enhancement";

    const prompt = `
      TASK: Perform a professional makeup analysis of this face.
      RESPOND IN: ${targetLang}.
      
      CONTEXT:
      - Subjective Concerns: ${concernsStr}.
      - Makeup Goals: ${goalsStr}.

      INSTRUCTIONS:
      1. Identify objective face shape, skin tone, eye shape.
      2. Provide a 2-3 sentence 'summary'. The summary MUST start by referencing their goals. Be supportive.
      3. Provide 5 scores (0-100) for Skin Texture, Symmetry, Eye Brightness, Lip Color, Contour Definition. Use ${targetLang} labels for the scores.
    `;
    
    const cleanImage = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanImage } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (!response.text) {
      console.error("Gemini API returned an empty response text");
      throw new Error("Empty response from AI model");
    }

    console.log("Successfully received response from Gemini");
    return res.status(200).json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Analysis API Error Details:", {
      message: error.message,
      stack: error.stack,
      status: error.status,
      details: error.details
    });
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

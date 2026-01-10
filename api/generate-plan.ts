import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { style, faceAnalysis, language = 'en' } = req.body;

  if (!style || !faceAnalysis) {
    return res.status(400).json({ error: 'Missing style or face analysis data' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";
    const targetLang = language === 'zh' ? 'Chinese' : 'English';

    const prompt = `
      You are a professional makeup artist and shopping consultant. 
      Create a 4-step makeup breakdown for a user with ${faceAnalysis.faceShape} face and ${faceAnalysis.skinTone} skin tone.
      
      RESPOND IN: ${targetLang}.
      Style: "${style.name}".
      
      CRITICAL INSTRUCTION FOR PRODUCTS:
      1. For each step, use Google Search to find a REAL, CURRENTLY AVAILABLE makeup product.
      2. PRIORITIZE products from official brand websites, or major reputable retailers:
         - Global: Sephora, Ulta, Cult Beauty, Nordstrom.
         - China: Tmall (天猫官方旗舰店), JD (京东自营), Little Red Book (小红书).
      3. YOU MUST PROVIDE A VALID, CLICKABLE URL. Do not hallucinate or guess URLs. If a specific product URL is hard to find, provide the official brand store search results URL for that product.
      4. Ensure the shade/color recommended matches the user's ${faceAnalysis.skinTone} skin tone.
      
      Provide:
      1. The Brand Name.
      2. The Specific Product Name.
      3. THE RECOMMENDED SHADE/COLOR SERIES (e.g. "Shade: #101", "Color: Velvet Rose").
      4. A valid URL to view/buy the product.
    `;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING, enum: ['Face', 'Brows', 'Eyes', 'Lips'] },
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          brand: { type: Type.STRING },
          productRecommendation: { type: Type.STRING },
          shade: { type: Type.STRING },
          productUrl: { type: Type.STRING },
          colorHex: { type: Type.STRING },
        },
        required: ["area", "title", "instruction", "brand", "productRecommendation", "shade", "productUrl", "colorHex"]
      }
    };

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    return res.status(200).json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Plan API failed:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

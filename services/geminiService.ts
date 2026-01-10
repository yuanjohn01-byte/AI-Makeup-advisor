
import { GoogleGenAI, Type } from "@google/genai";
import { FaceAnalysis, BreakdownStep, MakeupStyle, Language } from "../types";

const getAiClient = () => {
  // 从全局配置读取 API Key（config.js 中定义）
  const apiKey = (window as any).__APP_CONFIG__?.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured. Please check config.js file.');
  }
  
  return new GoogleGenAI({ apiKey });
};

export const analyzeFace = async (
  base64Image: string, 
  subjectiveConcerns: string[] = [], 
  makeupGoals: string[] = [],
  language: Language = 'en'
): Promise<FaceAnalysis> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";
    
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
      model,
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

    return JSON.parse(response.text) as FaceAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateMakeupPlan = async (style: MakeupStyle, faceAnalysis: FaceAnalysis, language: Language = 'en'): Promise<BreakdownStep[]> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";
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
          shade: { type: Type.STRING }, // Captured shade info
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

    return JSON.parse(response.text) as BreakdownStep[];
  } catch (error) {
    console.error("Plan generation failed:", error);
    return [];
  }
};

export const generateStyledImage = async (userImageBase64: string, styleImageBase64: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const model = "gemini-3-pro-image-preview"; 
        const prompt = "Digital Makeup Transfer. Apply the reference style to the source face. Preserve identity.";

        const cleanUser = userImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        const cleanStyle = styleImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanUser } },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanStyle } }
                ]
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated.");
    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
    }
};

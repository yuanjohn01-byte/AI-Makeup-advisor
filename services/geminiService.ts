import { FaceAnalysis, BreakdownStep, MakeupStyle, Language } from "../types";

/**
 * Service to interact with our backend API (Vercel Serverless Functions)
 * This ensures the API keys are kept secret and requests can bypass local network restrictions.
 */

export const analyzeFace = async (
  base64Image: string, 
  subjectiveConcerns: string[] = [], 
  makeupGoals: string[] = [],
  language: Language = 'en'
): Promise<FaceAnalysis> => {
  try {
    const response = await fetch('/api/analyze-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Image,
        subjectiveConcerns,
        makeupGoals,
        language
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze face');
    }

    return await response.json();
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateMakeupPlan = async (
  style: MakeupStyle, 
  faceAnalysis: FaceAnalysis, 
  language: Language = 'en'
): Promise<BreakdownStep[]> => {
  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style,
        faceAnalysis,
        language
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate makeup plan');
    }

    return await response.json();
  } catch (error) {
    console.error("Plan generation failed:", error);
    return [];
  }
};

export const generateStyledImage = async (
  userImageBase64: string, 
  styleImageBase64: string
): Promise<string> => {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userImageBase64,
        styleImageBase64
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate styled image');
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

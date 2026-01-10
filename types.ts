
export type Language = 'en' | 'zh';

export enum AppStep {
  CONSULTATION = 'CONSULTATION',
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  STYLE_SELECTION = 'STYLE_SELECTION',
  TRANSFORMATION = 'TRANSFORMATION',
  BREAKDOWN = 'BREAKDOWN',
  PROFILE = 'PROFILE'
}

export interface MakeupStyle {
  id: string;
  name: string;
  imageUrl: string;
  tags: string[];
  description: string;
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface FaceFeatures {
  left_eye: BoundingBox;
  right_eye: BoundingBox;
  left_eyebrow: BoundingBox;
  right_eyebrow: BoundingBox;
  lips: BoundingBox;
}

export interface FaceAnalysis {
  faceShape: string;
  skinTone: string;
  eyeShape: string;
  summary: string;
  scores: { subject: string; A: number; fullMark: number }[];
  features?: FaceFeatures;
}

export interface BreakdownStep {
  area: 'Eyes' | 'Lips' | 'Face' | 'Brows';
  title: string;
  instruction: string;
  brand: string;
  productRecommendation: string;
  shade: string; // Added field
  productUrl: string;
  colorHex: string;
}

export interface UserSession {
  rawPhoto: string | null;
  selectedStyle: MakeupStyle | null;
  processedPhoto: string | null;
  analysis: FaceAnalysis | null;
  breakdown: BreakdownStep[];
}

export interface TryOnHistory {
  id: string;
  processed_image_url: string;
  style_name: string;
  created_at: string;
}

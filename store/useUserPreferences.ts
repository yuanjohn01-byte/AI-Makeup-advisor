
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 检测浏览器语言，默认中文
const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'zh';
  const browserLang = navigator.language || (navigator as any).userLanguage;
  // 如果浏览器是中文，返回 'zh'，否则返回 'en'
  return browserLang?.startsWith('zh') ? 'zh' : 'en';
};

interface UserPreferencesState {
  language: Language;
  subjectiveConcerns: string[];
  makeupGoals: string[];
  makeupEnvironment: string | null;
  chatHistory: ChatMessage[];
  
  // Actions
  setLanguage: (lang: Language) => void;
  addConcern: (concern: string) => void;
  removeConcern: (concern: string) => void;
  setGoals: (goals: string[]) => void;
  setEnvironment: (env: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  resetPreferences: () => void;
}

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      language: detectBrowserLanguage(),
      subjectiveConcerns: [],
      makeupGoals: [],
      makeupEnvironment: null,
      chatHistory: [],

      setLanguage: (lang) => set({ language: lang }),

      addConcern: (concern) => 
        set((state) => ({
          subjectiveConcerns: state.subjectiveConcerns.includes(concern) 
            ? state.subjectiveConcerns 
            : [...state.subjectiveConcerns, concern]
        })),

      removeConcern: (concern) =>
        set((state) => ({
          subjectiveConcerns: state.subjectiveConcerns.filter((c) => c !== concern)
        })),

      setGoals: (goals) => set({ makeupGoals: goals }),
      
      setEnvironment: (env) => set({ makeupEnvironment: env }),

      addChatMessage: (message) =>
        set((state) => ({
          chatHistory: [...state.chatHistory, message]
        })),

      clearChat: () => set({ chatHistory: [] }),

      resetPreferences: () => set({
        subjectiveConcerns: [],
        makeupGoals: [],
        makeupEnvironment: null,
        chatHistory: []
      }),
    }),
    {
      name: 'user-preferences', // localStorage key
      partialize: (state) => ({ language: state.language }), // 只持久化语言设置
    }
  )
);

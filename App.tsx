
import React, { useState, useEffect } from 'react';
import { AppStep, UserSession, MakeupStyle, FaceAnalysis } from './types';
import { InputGatekeeper } from './components/InputGatekeeper';
import { TabA_StyleSelector } from './components/TabA_StyleSelector';
import { TabB_Transformation } from './components/TabB_Transformation';
import { TabC_Breakdown } from './components/TabC_Breakdown';
import { TabD_Profile } from './components/TabD_Profile';
import { ConsultationChat } from './components/ConsultationChat';
import { Login } from './components/Login';
import { Navigation } from './components/Navigation';
import { analyzeFace, generateMakeupPlan, generateStyledImage } from './services/geminiService';
import { detectLandmarks, initFaceLandmarker } from './services/faceLandmarkService';
import { useUserPreferences } from './store/useUserPreferences';
import { supabase } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';
import { translations } from './i18n';

const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-cache' });
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        throw new Error("Could not load style image.");
    }
};

const App: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [step, setStep] = useState<AppStep>(AppStep.CONSULTATION);
  const [session, setSession] = useState<UserSession>({
    rawPhoto: null, selectedStyle: null, processedPhoto: null, analysis: null, breakdown: []
  });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { language, subjectiveConcerns, makeupGoals, resetPreferences } = useUserPreferences();
  const t = translations[language];

  useEffect(() => {
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    initFaceLandmarker().catch(() => {});

    return () => subscription.unsubscribe();
  }, []);

  const handleRestart = () => {
    if (confirm(translations[language].profile.restart + "?")) {
      resetPreferences();
      setSession({
        rawPhoto: null, selectedStyle: null, processedPhoto: null, analysis: null, breakdown: []
      });
      setStep(AppStep.CONSULTATION);
    }
  };

  const handleCapture = async (imageSrc: string) => {
    setSession(prev => ({ ...prev, rawPhoto: imageSrc }));
    setStep(AppStep.ANALYZING);
    setLoading(true);
    setLoadingMessage(t.analysis.analyzing);
    try {
      const [analysisResult, landmarksResult] = await Promise.all([
          analyzeFace(imageSrc, subjectiveConcerns, makeupGoals, language),
          detectLandmarks(imageSrc)
      ]);
      const fullAnalysis: FaceAnalysis = { ...analysisResult, features: landmarksResult };
      setSession(prev => ({ ...prev, analysis: fullAnalysis }));
      setStep(AppStep.STYLE_SELECTION);
    } catch (e) {
      setStep(AppStep.INPUT);
    } finally {
      setLoading(false);
    }
  };

  const handleStyleSelect = async (style: MakeupStyle) => {
    if (!session.analysis || !session.rawPhoto) return;
    setLoading(true);
    setLoadingMessage(t.transformation.drag_tip);
    try {
      const cleanUrl = style.imageUrl.split('?')[0]; 
      const styleImageBase64 = await urlToBase64(cleanUrl + `?t=${Date.now()}`);
      const [breakdown, processedPhoto] = await Promise.all([
          generateMakeupPlan(style, session.analysis, language),
          generateStyledImage(session.rawPhoto, styleImageBase64)
      ]);

      setSession(prev => ({ ...prev, selectedStyle: style, breakdown, processedPhoto }));
      setStep(AppStep.TRANSFORMATION);
    } catch (e) {
      alert("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLook = async () => {
    if (!session.processedPhoto || !session.selectedStyle) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('tryon_history').insert({
      user_id: user.id,
      processed_image_url: session.processedPhoto,
      style_name: session.selectedStyle.name
    });

    if (error) throw error;
  };

  const canNavigate = !!session.rawPhoto && !!session.selectedStyle && !!session.processedPhoto;

  // 未登录时显示登录页面（登录页面内置语言选择）
  if (!sessionUser) {
    return (
      <div className="h-screen w-full bg-white font-sans">
        <Login />
      </div>
    );
  }

  // 已登录，显示主应用（语言切换在个人设置页面）
  return (
    <div className="h-screen w-full bg-white flex flex-col font-sans text-gray-900">
      <div className="flex-1 overflow-hidden relative">
        {step === AppStep.CONSULTATION && <ConsultationChat onProceed={() => setStep(AppStep.INPUT)} />}
        {step === AppStep.INPUT && <InputGatekeeper onCapture={handleCapture} />}
        {step === AppStep.ANALYZING && (
           <div className="h-full flex flex-col items-center justify-center space-y-4 bg-rose-50">
             <div className="relative">
                <img src={session.rawPhoto || ''} className="w-32 h-32 rounded-full object-cover border-4 border-white opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-rose-600 animate-spin" />
                </div>
             </div>
             <p className="text-lg font-medium text-rose-900 animate-pulse">{t.analysis.loading}</p>
           </div>
        )}
        {step === AppStep.STYLE_SELECTION && <TabA_StyleSelector analysis={session.analysis} onSelectStyle={handleStyleSelect} onRetake={() => setStep(AppStep.INPUT)} />}
        {step === AppStep.TRANSFORMATION && session.rawPhoto && session.processedPhoto && (
          <TabB_Transformation 
            beforeImage={session.rawPhoto} 
            afterImage={session.processedPhoto} 
            onSave={handleSaveLook}
          />
        )}
        {step === AppStep.BREAKDOWN && session.processedPhoto && <TabC_Breakdown steps={session.breakdown} resultImage={session.processedPhoto} features={session.analysis?.features} />}
        {step === AppStep.PROFILE && <TabD_Profile analysis={session.analysis} onRestart={handleRestart} />}
        
        {loading && step !== AppStep.ANALYZING && (
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white px-6 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <p className="text-lg font-semibold">{loadingMessage}</p>
           </div>
        )}
      </div>
      <Navigation currentStep={step} setStep={setStep} canNavigate={canNavigate} />
    </div>
  );
};

export default App;

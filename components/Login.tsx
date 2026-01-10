
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUserPreferences } from '../store/useUserPreferences';
import { translations } from '../i18n';
import { Mail, Lock, Sparkles, Loader2, ArrowRight, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { language, setLanguage } = useUserPreferences();
  const t = translations[language].login;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center relative">
      {/* 语言选择器 - 右上角 */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-gray-50 rounded-full p-1 border border-gray-100">
        <button 
          onClick={() => setLanguage('zh')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${language === 'zh' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
        >
          中文
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${language === 'en' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
        >
          EN
        </button>
      </div>

      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Sparkles className="w-10 h-10 text-rose-500" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
      <p className="text-gray-500 mb-8 max-w-xs">{t.desc}</p>

      <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.email}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.password}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? t.sign_up : t.sign_in)}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="w-full max-w-sm my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">{language === 'zh' ? '或者' : 'OR'}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button 
        onClick={handleGoogleLogin}
        className="w-full max-w-sm py-4 bg-white border-2 border-gray-100 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-50"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
        {t.google}
      </button>

      <button 
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-8 text-sm font-medium text-rose-500"
      >
        {isSignUp ? t.has_account : t.no_account}
      </button>
    </div>
  );
};

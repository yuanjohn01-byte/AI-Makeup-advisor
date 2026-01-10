
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUserPreferences } from '../store/useUserPreferences';
import { FaceAnalysis, TryOnHistory } from '../types';
import { translations } from '../i18n';
import { User, Heart, Sparkles, LogOut, ChevronRight, RotateCcw, Loader2, Camera, Globe } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  analysis: FaceAnalysis | null;
  onRestart: () => void;
}

export const TabD_Profile: React.FC<Props> = ({ analysis, onRestart }) => {
  const { language, setLanguage, subjectiveConcerns, makeupGoals } = useUserPreferences();
  const t = translations[language].profile;
  const [history, setHistory] = useState<TryOnHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userProfile, setUserProfile] = useState<{username: string, avatar_url: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
    fetchHistory();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setUserProfile(data);
    else {
      // Create initial profile if doesn't exist
      await supabase.from('profiles').insert({ id: user.id, username: user.email?.split('@')[0] });
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('tryon_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) return alert("Upload failed");

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // 3. Update DB
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    setUserProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-24 no-scrollbar">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm border-b border-rose-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl" />
        
        <div className="relative flex flex-col items-center text-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-rose-100 p-1 mb-4 shadow-inner bg-white overflow-hidden">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center">
                  <User size={40} className="text-white" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-0 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{userProfile?.username || t.greeting}</h2>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* Radar Analysis */}
        {analysis && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Sparkles size={18} className="text-rose-500" />
                {t.preferences}
              </h3>
            </div>
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysis.scores}>
                  <PolarGrid stroke="#fecdd3" />
                  <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: '#9ca3af'}} />
                  <Radar name="Score" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Try-on History Gallery */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Heart size={18} className="text-rose-500" />
            {t.history}
          </h3>
          
          {loadingHistory ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-rose-300" /></div>
          ) : history.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {history.map((item) => (
                <div key={item.id} className="aspect-square rounded-xl overflow-hidden relative group">
                  <img src={item.processed_image_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold text-center p-1">
                    {item.style_name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">{t.no_preferences}</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* 语言切换 */}
          <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{language === 'zh' ? '语言设置' : 'Language'}</p>
                  <p className="text-[10px] text-gray-400">{language === 'zh' ? '切换界面语言' : 'Switch interface language'}</p>
                </div>
              </div>
              <div className="flex bg-gray-100 rounded-full p-1">
                <button 
                  onClick={() => setLanguage('zh')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${language === 'zh' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400'}`}
                >
                  中文
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${language === 'en' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400'}`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={onRestart}
            className="w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{t.restart}</p>
                <p className="text-[10px] text-gray-400">{t.restart_desc}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button 
            onClick={handleSignOut}
            className="w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                <LogOut size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{t.sign_out}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

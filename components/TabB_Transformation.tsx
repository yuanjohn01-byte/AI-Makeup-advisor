
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Loader2, CheckCircle2, Bookmark } from 'lucide-react';
import { useUserPreferences } from '../store/useUserPreferences';
import { translations } from '../i18n';

interface Props {
  beforeImage: string;
  afterImage: string;
  onSave: () => Promise<void>;
}

export const TabB_Transformation: React.FC<Props> = ({ beforeImage, afterImage, onSave }) => {
  const { language } = useUserPreferences();
  const t = translations[language].transformation;
  
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleSaveClick = async () => {
    if (isSaving || hasSaved) return;
    setIsSaving(true);
    try {
      await onSave();
      setHasSaved(true);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div className="h-full bg-gray-900 flex flex-col relative">
       {/* Instruction Overlay */}
       <div className="absolute top-16 left-0 w-full z-10 text-center pointer-events-none">
          <span className="bg-black/60 text-white/90 px-4 py-1.5 rounded-full text-xs backdrop-blur-md border border-white/10">
            {t.drag_tip}
          </span>
       </div>

      <div 
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden select-none cursor-col-resize touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ width: `${sliderPosition}%` }}>
          <img 
            src={beforeImage} 
            alt="Before" 
            className="absolute top-0 left-0 h-full max-w-none object-cover"
            style={{ width: containerRef.current ? containerRef.current.clientWidth : '100vw' }}
            draggable={false}
          />
        </div>

        <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 backdrop-blur-sm cursor-ew-resize" style={{ left: `${sliderPosition}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full border border-white/40 flex items-center justify-center text-white shadow-2xl">
            <ArrowLeftRight size={20} />
          </div>
        </div>
      </div>

      {/* FLOATING ACTION AREA: Right-Bottom above the global Nav */}
      <div className="absolute bottom-24 right-6 flex flex-col items-end gap-3 z-30">
          {/* Match Score Bubble */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex flex-col items-center min-w-[80px]">
             <span className="text-[9px] text-white/60 uppercase font-bold tracking-widest mb-0.5">{t.match_score}</span>
             <p className="font-black text-rose-400 text-lg leading-none">94%</p>
          </div>

          {/* Floating Save Button */}
          <button 
            onClick={handleSaveClick}
            disabled={isSaving || hasSaved}
            className={`flex items-center justify-center gap-2 h-14 min-w-[120px] px-6 rounded-full font-bold text-sm shadow-2xl transition-all active:scale-95 border border-white/20 backdrop-blur-md ${
              hasSaved 
                ? 'bg-green-500/90 text-white shadow-green-500/20' 
                : 'bg-rose-500/90 text-white shadow-rose-500/30 hover:bg-rose-600'
            }`}
          >
            {isSaving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : hasSaved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
            <span>{hasSaved ? t.saved : t.save}</span>
          </button>
      </div>
      
      {/* Visual background padding for navigation compatibility */}
      <div className="h-16 bg-transparent pointer-events-none" />
    </div>
  );
};

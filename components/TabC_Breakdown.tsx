
import React, { useEffect, useRef, useState } from 'react';
import { BreakdownStep, FaceFeatures, BoundingBox } from '../types';
import { ShoppingBag, Star, Loader2, ExternalLink, Palette } from 'lucide-react';
import { translations } from '../i18n';
import { useUserPreferences } from '../store/useUserPreferences';

interface Props {
  steps: BreakdownStep[];
  resultImage: string;
  features?: FaceFeatures;
}

const SmartCrop: React.FC<{
  imageSrc: string;
  box?: BoundingBox;
  area: string;
}> = ({ imageSrc, box, area }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!box || !canvasRef.current || !imageSrc) return;
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const scaleX = image.width / 1000;
      const scaleY = image.height / 1000;
      let x = box.xmin * scaleX;
      let y = box.ymin * scaleY;
      let w = (box.xmax - box.xmin) * scaleX;
      let h = (box.ymax - box.ymin) * scaleY;
      
      // 优化 Padding：针对不同区域使用不同的内边距比例
      let pX = 0.5; // 默认 50%
      let pY = 0.6; // 默认 60%
      
      if (area === 'Lips') { pX = 0.8; pY = 1.2; } // 嘴唇需要更多横向空间
      if (area === 'Eyes') { pX = 0.4; pY = 0.8; } // 眼睛需要更多纵向空间
      if (area === 'Brows') { pX = 0.3; pY = 0.8; } 

      const paddingX = w * pX;
      const paddingY = h * pY;
      
      x = Math.max(0, x - paddingX);
      y = Math.max(0, y - paddingY);
      w = Math.min(image.width - x, w + (paddingX * 2));
      h = Math.min(image.height - y, h + (paddingY * 2));
      
      // 确保 Canvas 比例美观 (例如接近 16:9 或 4:3)
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
      setCroppedUrl(canvas.toDataURL());
    };
  }, [imageSrc, box, area]);

  if (area === 'Face') {
     return (
        <div className="h-48 w-full overflow-hidden relative group rounded-t-2xl">
            <img src={imageSrc} className="w-full h-full object-cover object-center" alt={area} />
        </div>
     );
  }

  return (
    <div className="h-48 w-full overflow-hidden relative group rounded-t-2xl bg-gray-100">
      <canvas ref={canvasRef} className="hidden" />
      {croppedUrl ? (
        <img src={croppedUrl} alt={area} className="w-full h-full object-cover animate-in fade-in duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-300" />
        </div>
      )}
       <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm shadow-sm z-10 font-bold uppercase tracking-wider">
          AI Focus: {area}
       </div>
    </div>
  );
};

export const TabC_Breakdown: React.FC<Props> = ({ steps, resultImage, features }) => {
  const { language } = useUserPreferences();
  const t = translations[language].breakdown;

  const getFeatureBox = (area: string): BoundingBox | undefined => {
    if (!features) return undefined;
    switch (area) {
      case 'Eyes': return (features as any).eyes;
      case 'Brows': return (features as any).brows;
      case 'Lips': return features.lips;
      default: return undefined;
    }
  };

  const handleBuyNow = (url: string) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-24 no-scrollbar">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
        <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
      </div>

      <div className="flex flex-col gap-6 px-4 relative">
        <div className="absolute left-8 top-4 bottom-20 w-0.5 bg-gray-200 z-0" />

        {steps.map((step, index) => {
          const featureBox = getFeatureBox(step.area);

          return (
            <div key={index} className="relative z-10 pl-8">
              <div className="absolute left-[-5px] top-0 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">
                {index + 1}
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <SmartCrop imageSrc={resultImage} area={step.area} box={featureBox} />

                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    {step.title}
                    <span className="w-4 h-4 rounded-full inline-block border border-gray-100 shadow-sm" style={{ backgroundColor: step.colorHex }}></span>
                  </h3>
                  <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                    {step.instruction}
                  </p>

                  <div className="mt-5 space-y-3">
                    {/* Detailed Product Card */}
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{step.brand}</span>
                                <p className="text-sm font-bold text-gray-800 leading-tight">{step.productRecommendation}</p>
                            </div>
                            <button 
                                onClick={() => handleBuyNow(step.productUrl)}
                                className="bg-rose-500 p-2.5 rounded-full text-white shadow-lg border border-rose-400 hover:bg-rose-600 transition-all active:scale-90"
                            >
                                <ShoppingBag size={16} />
                            </button>
                        </div>

                        {/* SHADE INFO SECTION */}
                        <div className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-rose-100/30">
                            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-rose-100 text-rose-500 shrink-0">
                                <Palette size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-rose-400 font-bold uppercase">{t.shade}</p>
                                <p className="text-xs font-semibold text-gray-700 truncate">{step.shade}</p>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="relative pl-8 pb-8">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-2 mb-2 text-yellow-400">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-sm">{t.pro_tip}</span>
                </div>
                <p className="text-sm text-gray-200">
                    {t.pro_tip_desc}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

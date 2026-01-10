
import React, { useRef, useState, useEffect } from 'react';
import { Camera, AlertCircle, RefreshCw, Upload, ChevronLeft } from 'lucide-react';
import { useUserPreferences } from '../store/useUserPreferences';
import { translations } from '../i18n';

interface Props {
  onCapture: (imageSrc: string) => void;
}

export const InputGatekeeper: React.FC<Props> = ({ onCapture }) => {
  const { language } = useUserPreferences();
  const t = translations[language].input;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [mode, setMode] = useState<'selection' | 'camera'>('selection');

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError(t.camera_guide);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const checkQuality = (ctx: CanvasRenderingContext2D, width: number, height: number): { pass: boolean; reason?: string } => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let brightness = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    brightness /= (data.length / 4);

    if (brightness < 40) return { pass: false, reason: "Too dark" };
    if (brightness > 230) return { pass: false, reason: "Too bright" };
    
    return { pass: true };
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsChecking(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const check = checkQuality(ctx, canvas.width, canvas.height);
      
      setTimeout(() => {
        setIsChecking(false);
        if (check.pass) {
            const dataUrl = canvas.toDataURL('image/jpeg');
            onCapture(dataUrl);
            stopCamera();
        } else {
            setError(`${t.quality_fail}: ${check.reason}`);
        }
      }, 800);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsChecking(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const maxDim = 1280;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w *= scale;
        h *= scale;
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.drawImage(img, 0, 0, w, h);
         const check = checkQuality(ctx, w, h);
         
         setIsChecking(false);
         if (check.pass) {
             const dataUrl = canvas.toDataURL('image/jpeg');
             onCapture(dataUrl);
         } else {
             setError(`${t.quality_fail}: ${check.reason}`);
         }
      }
    };
    img.src = URL.createObjectURL(file);
  };

  if (mode === 'selection') {
    return (
      <div className="relative h-full w-full bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
           <div className="space-y-2">
             <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Camera className="w-10 h-10 text-rose-500" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
             <p className="text-gray-500">{t.desc}</p>
           </div>

           <div className="space-y-4">
             <button 
               onClick={() => setMode('camera')}
               className="w-full py-4 bg-rose-500 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors"
             >
               <Camera size={20} />
               {t.open_camera}
             </button>
             
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-400">{t.or}</span>
                </div>
             </div>

             <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
             >
               {isChecking ? <RefreshCw className="animate-spin" size={20}/> : <Upload size={20} />}
               {t.upload}
             </button>
             <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
           </div>

           <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 text-left">
              <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle size={14}/> {t.tips_title}</p>
              <ul className="list-disc list-inside space-y-1 text-xs opacity-80">
                <li>{t.tip1}</li>
                <li>{t.tip2}</li>
                <li>{t.tip3}</li>
              </ul>
           </div>
           
           {error && (
             <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2 justify-center">
               <AlertCircle size={16} />
               {error}
             </div>
           )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black flex flex-col items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" />
        <button onClick={() => setMode('selection')} className="absolute top-6 left-6 z-30 bg-black/40 text-white p-2 rounded-full backdrop-blur-md">
          <ChevronLeft size={24} />
        </button>
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
             <div className="w-[70%] h-[55%] border-2 border-dashed border-rose-300 rounded-[50%] opacity-80 shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="absolute bottom-10 z-20 w-full flex flex-col items-center gap-4 px-6">
            <div className="text-white text-center bg-black/50 p-2 rounded-lg text-sm backdrop-blur-sm">
                <p>{t.camera_guide}</p>
            </div>
            <button onClick={capturePhoto} disabled={isChecking} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-all">
                {isChecking ? <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /> : <div className="w-16 h-16 bg-white rounded-full" />}
            </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

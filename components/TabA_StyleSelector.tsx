import React, { useEffect, useState } from 'react';
import { FaceAnalysis, MakeupStyle } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Check, Loader2, AlertCircle, RefreshCw, Sparkles, Filter, Camera } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useUserPreferences } from '../store/useUserPreferences';
import { translations } from '../i18n';

interface Props {
  analysis: FaceAnalysis | null;
  onSelectStyle: (style: MakeupStyle) => void;
  onRetake: () => void;
}

// 映射表：将 AI 的英文分析结果 映射到 数据库的中文标签
// 根据你的数据库内容进行了优化
const TAG_MAPPING: Record<string, string[]> = {
    // Face Shapes (确保覆盖你 DB 里的中文写法)
    'Oval': ['鹅蛋脸', '椭圆脸', 'Oval'],
    'Round': ['圆脸', '圆形脸', 'Round'],
    'Square': ['方脸', '方形脸', '国字脸', 'Square'],
    'Heart': ['心形脸', '倒三角', 'Heart'],
    'Long': ['长脸', 'Long'],
    'Diamond': ['菱形脸', '钻石脸', 'Diamond'],
    
    // Skin Tones (映射 DB 里的 Light, Medium, Tan)
    // 注意：我们将 Light/Fair 互通，以增加匹配成功率
    'Fair': ['白皙', '冷白', 'Light', 'Fair'],
    'Light': ['白皙', '自然偏白', 'Light', 'Fair'],
    'Medium': ['自然色', '黄皮', 'Medium', 'Natural'],
    'Tan': ['小麦色', '健康色', 'Tan', 'Deep'],
    'Deep': ['黑皮', '深肤色', 'Deep'],
    'Warm': ['暖皮', '黄皮', 'Warm', 'Medium'],
    'Cool': ['冷皮', '粉调', 'Cool', 'Light'],
    'Neutral': ['自然色', '中性皮', 'Neutral', 'Medium'],

    // Eye Shapes (作为辅助匹配)
    'Almond': ['杏眼', 'Almond', 'DoubleMonolid'], // 假设杏眼兼容双眼皮
    'Round Eyes': ['圆眼', 'Round'],
    'Monolid': ['单眼皮', 'Monolid'],
    'Hooded': ['内双', '肿眼泡', 'Hooded', 'InnerDouble'],
};

const FALLBACK_STYLES: MakeupStyle[] = [
  { id: '1', name: 'Peach Fuzz', imageUrl: 'https://images.unsplash.com/photo-1512413914633-b5043f4041ea?q=80&w=600&auto=format&fit=crop', tags: ['鹅蛋脸', 'Oval', 'Warm', 'Almond'], description: 'Soft peach tones for daily wear.' },
  { id: '2', name: 'Vintage Red', imageUrl: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=600&auto=format&fit=crop', tags: ['圆脸', 'Round', 'Fair', 'Classic'], description: 'Timeless red lip with subtle eyes.' },
  { id: '3', name: 'Smokey Glam', imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop', tags: ['方脸', 'Square', 'Cool', 'Hooded'], description: 'Intense eye drama.' },
  { id: '4', name: 'Nude Glow', imageUrl: 'https://images.unsplash.com/photo-1506956191951-7a88da4435e5?q=80&w=600&auto=format&fit=crop', tags: ['菱形脸', 'Diamond', 'Medium', 'Monolid'], description: 'Sun-kissed natural radiance.' },
];

export const TabA_StyleSelector: React.FC<Props> = ({ analysis, onSelectStyle, onRetake }) => {
  const { language } = useUserPreferences();
  const t = translations[language];
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchingStyles, setMatchingStyles] = useState<MakeupStyle[]>([]);
  const [displayedStyles, setDisplayedStyles] = useState<MakeupStyle[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchLevel, setMatchLevel] = useState<'strict' | 'relaxed' | 'none'>('none');

  useEffect(() => {
    if (analysis) {
        fetchAndFilterStyles();
    }
  }, [analysis]);

  // Handle Refresh / Pagination
  const handleRefresh = () => {
    if (matchingStyles.length === 0) return;
    
    // Increment index by 2, wrap around if needed
    let nextIndex = displayIndex + 2;
    if (nextIndex >= matchingStyles.length) {
        nextIndex = 0; // Loop back to start
    }
    
    setDisplayIndex(nextIndex);
    updateDisplayedStyles(matchingStyles, nextIndex);
  };

  const updateDisplayedStyles = (styles: MakeupStyle[], index: number) => {
      // Slice exactly 2 items
      const nextBatch = styles.slice(index, index + 2);
      if (nextBatch.length === 1 && styles.length > 1) {
          nextBatch.push(styles[0]);
      }
      setDisplayedStyles(nextBatch);
  };

  const getKeywords = (term: string) => {
      return TAG_MAPPING[term] || [term];
  };

  const fetchAndFilterStyles = async () => {
    if (!analysis) return;

    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch data from Supabase (reading all columns)
      // Removing 'created_at' sort as it might not exist, defaulting to natural order or ID
      const { data, error } = await supabase
        .from('makeup_styles')
        .select('*');

      if (error) {
          console.error("Supabase Error:", error);
          throw error;
      }

      let allStyles: MakeupStyle[] = [];

      if (data && data.length > 0) {
        allStyles = data.map((item: any) => {
            // CRITICAL: Construct the matching tags from your specific DB columns
            // This fixes the issue where 'tags' column was missing or empty
            const derivedTags = [
                item.faceshape,   // e.g. "圆脸"
                item.color_tone,  // e.g. "Light"
                item.eyelid,      // e.g. "DoubleMonolid"
                item.style,       // e.g. "中式复古"
                item.environment  // e.g. "Daily"
            ].filter(tag => tag && typeof tag === 'string'); // Filter out nulls

            return {
                id: item.id?.toString() || Math.random().toString(),
                name: item.style || item.name || 'Unnamed Style', // Use 'style' as name if available
                imageUrl: item.image_url || item.imageUrl || item.image || 'https://via.placeholder.com/600x800?text=No+Image',
                tags: derivedTags,
                description: item.description || ''
            };
        });
      } else {
        allStyles = FALLBACK_STYLES;
      }

      // --- MATCHING LOGIC ---
      const faceKeywords = getKeywords(analysis.faceShape);
      const skinKeywords = getKeywords(analysis.skinTone);
      
      console.log("Searching for:", { face: faceKeywords, skin: skinKeywords });

      // 1. Strict Match: Face Shape AND Skin Tone
      // Checks if the derived tags include ANY of the keywords
      const strictMatches = allStyles.filter(style => {
          if (!style.tags) return false;
          
          const hasFace = style.tags.some(tag => 
              faceKeywords.some(k => tag.toLowerCase().includes(k.toLowerCase()))
          );
          
          const hasSkin = style.tags.some(tag => 
              skinKeywords.some(k => tag.toLowerCase().includes(k.toLowerCase()))
          );
          
          return hasFace && hasSkin;
      });

      let finalStyles = [];
      
      if (strictMatches.length >= 1) {
          finalStyles = strictMatches;
          setMatchLevel('strict');
      } else {
          // 2. Relaxed Match: Face Shape ONLY
          const faceMatches = allStyles.filter(style => {
              if (!style.tags) return false;
              return style.tags.some(tag => 
                  faceKeywords.some(k => tag.toLowerCase().includes(k.toLowerCase()))
              );
          });

          if (faceMatches.length >= 1) {
              finalStyles = faceMatches;
              setMatchLevel('relaxed');
          } else {
              // 3. Fallback: Show all
              finalStyles = allStyles;
              setMatchLevel('none');
          }
      }

      console.log(`Filtered: ${finalStyles.length} styles (Level: ${matchLevel})`);
      
      setMatchingStyles(finalStyles);
      setDisplayIndex(0);
      updateDisplayedStyles(finalStyles, 0);

    } catch (err: any) {
      console.error("Error fetching styles:", err.message);
      setError("Could not connect to style database.");
      setMatchingStyles(FALLBACK_STYLES);
      updateDisplayedStyles(FALLBACK_STYLES, 0);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="text-gray-500">{t.analysis.analyzing}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24 bg-gray-50 no-scrollbar">
      {/* Analysis Section */}
      <div className="bg-white p-6 rounded-b-3xl shadow-sm mb-6">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-800">{t.analysis.title}</h2>
            <button 
                onClick={onRetake}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-rose-500 transition-colors bg-gray-100 px-3 py-1.5 rounded-full"
            >
                <Camera size={14} />
                {t.analysis.retake}
            </button>
        </div>
        
        {/* Short Text Summary */}
        <div className="mb-4 bg-rose-50 p-3 rounded-xl border border-rose-100">
             <div className="flex items-start gap-2">
                 <Sparkles className="w-4 h-4 text-rose-500 mt-1 shrink-0" />
                 <p className="text-sm text-gray-700 italic leading-relaxed">
                    {analysis.summary || `Based on our scan, you have a lovely ${analysis.faceShape} face with ${analysis.skinTone} undertones.`}
                 </p>
             </div>
        </div>

        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 justify-center">
           <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full border border-gray-200">{analysis.faceShape}</span>
           <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full border border-gray-200">{analysis.skinTone}</span>
           <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full border border-gray-200">{analysis.eyeShape}</span>
        </div>
        
        <div className="h-48 w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysis.scores}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
              <Radar name="Feature Score" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Style Recommendations */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
              <h3 className="font-semibold text-gray-800">{t.selector.choose}</h3>
              {matchLevel === 'strict' && <span className="text-[10px] text-green-600 flex items-center gap-1"><Check size={10}/> {t.selector.perfect_match}</span>}
              {matchLevel === 'relaxed' && <span className="text-[10px] text-orange-500">{t.selector.relaxed_match}</span>}
              {matchLevel === 'none' && <span className="text-[10px] text-gray-400">{t.selector.no_match}</span>}
          </div>
          <button 
            onClick={handleRefresh} 
            className="text-xs text-rose-600 font-medium flex items-center gap-1 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-full"
          >
            <RefreshCw size={12} /> {t.selector.refresh}
          </button>
        </div>

        {error && (
            <div className="mb-4 bg-orange-50 text-orange-600 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
            </div>
        )}

        {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-rose-300" />
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4 pb-4">
            {displayedStyles.map((style) => (
                <div 
                key={style.id} 
                onClick={() => { setSelectedId(style.id); onSelectStyle(style); }}
                className={`group relative rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all duration-300 ${selectedId === style.id ? 'ring-4 ring-rose-500 scale-[0.98]' : 'hover:shadow-md'}`}
                >
                <div className="aspect-[3/4] w-full">
                    <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                    <p className="text-white font-bold text-sm leading-tight">{style.name}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                    {/* Display filtered tags nicely */}
                    {style.tags
                        .filter(t => TAG_MAPPING[analysis.faceShape]?.some(k => t.includes(k)) || TAG_MAPPING[analysis.skinTone]?.some(k => t.includes(k)))
                        .slice(0, 3)
                        .map((tag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm border bg-rose-500/80 text-white border-rose-400">
                            {tag}
                        </span>
                    ))}
                    </div>
                </div>
                
                {selectedId === style.id && (
                    <div className="absolute top-3 right-3 bg-rose-500 text-white rounded-full p-1.5 shadow-lg animate-in zoom-in duration-200">
                    <Check size={14} strokeWidth={3} />
                    </div>
                )}
                </div>
            ))}
            
            {displayedStyles.length === 0 && !loading && (
                <div className="col-span-2 text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-2">
                    <Filter className="w-8 h-8 opacity-20" />
                    {language === 'zh' ? '暂无匹配您特征的风格。' : 'No styles match your specific features yet.'}
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
};
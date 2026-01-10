
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, MessageCircle, CheckCircle2, Circle } from 'lucide-react';
import { useUserPreferences, ChatMessage } from '../store/useUserPreferences';
import { translations } from '../i18n';

interface Props {
  onProceed: () => void;
}

export const ConsultationChat: React.FC<Props> = ({ onProceed }) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    chatHistory, 
    addChatMessage, 
    addConcern, 
    setGoals,
    setEnvironment,
    makeupGoals,
    makeupEnvironment,
    language
  } = useUserPreferences();

  const t = translations[language].chat;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isSending]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const currentInput = input.trim();
    const userMsg: ChatMessage = { role: 'user', content: currentInput };
    addChatMessage(userMsg);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory,
          currentInput,
          language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to AI bestie');
      }

      const data = await response.json();
      
      // Update store with extracted info
      if (data.extracted_concerns) data.extracted_concerns.forEach((c: string) => addConcern(c));
      if (data.extracted_style) setGoals(Array.from(new Set([...makeupGoals, ...data.extracted_style])));
      if (data.extracted_environment) setEnvironment(data.extracted_environment);

      addChatMessage({ role: 'assistant', content: data.reply_text });
    } catch (error) {
      console.error("Chat failed:", error);
      addChatMessage({ role: 'assistant', content: t.glitch });
    } finally {
      setIsSending(false);
    }
  };

  // Requirements met: at least one style goal and an environment OR at least 3 messages for safety
  const hasStyle = makeupGoals.length > 0;
  const hasEnv = makeupEnvironment !== null;
  const canProceed = (hasStyle && hasEnv) || chatHistory.length >= 4;

  return (
    <div className="flex flex-col h-full bg-rose-50/30">
      {/* Header with Progress Indicators */}
      <div className="p-4 bg-white border-b border-rose-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Sparkles className="text-rose-500 w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{t.bestie_name}</h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t.status}</span>
              </div>
            </div>
          </div>
          
          {/* Visual Progress Pills */}
          <div className="flex gap-2">
            <div className={`px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${hasStyle ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              {hasStyle ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'zh' ? '风格' : 'Style'}</span>
            </div>
            <div className={`px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${hasEnv ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              {hasEnv ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span className="text-[9px] font-bold uppercase tracking-tighter">{language === 'zh' ? '场景' : 'Env'}</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 px-8">
            <MessageCircle size={48} className="text-rose-200" />
            <p className="text-sm text-gray-500 italic">"{t.initial_tip}"</p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-gray-700 border border-rose-100 rounded-tl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white border border-rose-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
              <span className="text-xs text-gray-400 italic">{t.thinking}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-rose-100 space-y-3">
        <div className="flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.placeholder}
            className="flex-1 bg-gray-50 border-none rounded-full px-4 py-2 text-sm text-gray-700 outline-none"
            disabled={isSending}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md"
          >
            <Send size={18} />
          </button>
        </div>

        <button 
          onClick={onProceed}
          disabled={!canProceed || isSending}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${canProceed ? 'bg-gradient-to-r from-rose-400 to-rose-600 text-white shadow-lg scale-[1.02]' : 'bg-gray-100 text-gray-400'}`}
        >
          <Sparkles size={18} />
          {canProceed ? t.ready_btn : t.min_msgs}
        </button>
      </div>
    </div>
  );
};

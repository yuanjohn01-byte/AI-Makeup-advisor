
import React from 'react';
import { AppStep } from '../types';
import { Aperture, Sparkles, Layers, User } from 'lucide-react';
import { useUserPreferences } from '../store/useUserPreferences';
import { translations } from '../i18n';

interface Props {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  canNavigate: boolean;
}

export const Navigation: React.FC<Props> = ({ currentStep, setStep, canNavigate }) => {
  const { language } = useUserPreferences();
  const t = translations[language].nav;

  if (currentStep === AppStep.INPUT || currentStep === AppStep.ANALYZING || currentStep === AppStep.CONSULTATION) return null;

  const tabs = [
    { id: AppStep.STYLE_SELECTION, icon: Aperture, label: t.style },
    { id: AppStep.TRANSFORMATION, icon: Sparkles, label: t.try_on },
    { id: AppStep.BREAKDOWN, icon: Layers, label: t.guide },
    { id: AppStep.PROFILE, icon: User, label: t.me },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-safe shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = currentStep === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => canNavigate && setStep(tab.id)}
              disabled={!canNavigate}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-rose-500' : 'text-gray-400'
              } ${!canNavigate ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

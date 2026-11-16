import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isVoiceMuted, toggleVoiceMuted } from '../utils';

interface VoiceAssistantToggleProps {
  variant?: 'pill' | 'icon' | 'compact';
  className?: string;
}

export const VoiceAssistantToggle: React.FC<VoiceAssistantToggleProps> = ({
  variant = 'icon',
  className = ''
}) => {
  const [muted, setMuted] = useState<boolean>(() => isVoiceMuted());

  useEffect(() => {
    const handleVoiceChange = () => {
      setMuted(isVoiceMuted());
    };
    window.addEventListener('erp_voice_toggle', handleVoiceChange);
    return () => {
      window.removeEventListener('erp_voice_toggle', handleVoiceChange);
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = toggleVoiceMuted();
    setMuted(newMuted);
  };

  const tooltip = muted 
    ? 'Звуковые сигналы и озвучка выключены (нажмите, чтобы включить)' 
    : 'Звуковые сигналы и озвучка включены (нажмите, чтобы выключить)';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={tooltip}
        className={`px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
          muted
            ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            : 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900'
        } ${className}`}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
        <span>{muted ? 'Без звука' : 'Звук'}</span>
      </button>
    );
  }

  // Default clean icon button variant
  return (
    <button
      type="button"
      onClick={handleToggle}
      title={tooltip}
      aria-label={tooltip}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
        muted
          ? 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 border border-slate-200 shadow-2xs'
          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-2xs'
      } ${className}`}
    >
      {muted ? (
        <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
      ) : (
        <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
      )}
    </button>
  );
};


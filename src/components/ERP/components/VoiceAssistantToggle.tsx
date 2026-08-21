import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isVoiceMuted, toggleVoiceMuted } from '../utils';

interface VoiceAssistantToggleProps {
  variant?: 'pill' | 'icon' | 'compact';
  className?: string;
}

export const VoiceAssistantToggle: React.FC<VoiceAssistantToggleProps> = ({
  variant = 'pill',
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

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={muted ? 'Голосовой ассистент отключен (нажмите, чтобы включить)' : 'Голосовой ассистент включен (нажмите, чтобы отключить)'}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          muted
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 border border-slate-200'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200'
        } ${className}`}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={muted ? 'Голосовой ассистент отключен' : 'Голосовой ассистент включен'}
        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
          muted
            ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            : 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900'
        } ${className}`}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
        <span>{muted ? 'Голос ВЫКЛ' : 'Голос ВКЛ'}</span>
      </button>
    );
  }

  // Default 'pill' variant
  return (
    <button
      type="button"
      onClick={handleToggle}
      title={muted ? 'Голосовой озвучка отключена (нажмите для включения)' : 'Голосовая озвучка («Готовая деталь» и др.) включена'}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
        muted
          ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
      } ${className}`}
    >
      {muted ? (
        <>
          <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Голосовой ассистент: <strong className="text-slate-700">ВЫКЛ</strong></span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Голосовой ассистент: <strong className="text-indigo-900">ВКЛ</strong></span>
        </>
      )}
    </button>
  );
};

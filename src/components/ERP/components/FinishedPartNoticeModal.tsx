import React, { useState, useEffect } from 'react';
import { CheckCircle2, Sparkles, Volume2, X } from 'lucide-react';

interface FinishedPartNoticeModalProps {
  isOpen: boolean;
  labelNumber: string;
  partName: string;
  materialName?: string;
  durationSeconds?: number; // default e.g. 5
  onClose: () => void;
}

export const FinishedPartNoticeModal: React.FC<FinishedPartNoticeModalProps> = ({
  isOpen,
  labelNumber,
  partName,
  materialName,
  durationSeconds = 5,
  onClose
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(durationSeconds);

  useEffect(() => {
    if (!isOpen) return;

    setRemainingTime(durationSeconds);
    const totalMs = durationSeconds * 1000;
    const intervalMs = 100;
    let elapsedMs = 0;

    const timer = setInterval(() => {
      elapsedMs += intervalMs;
      const left = Math.max(0, durationSeconds - elapsedMs / 1000);
      setRemainingTime(left);

      if (elapsedMs >= totalMs) {
        clearInterval(timer);
        onClose();
      }
    }, intervalMs);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, durationSeconds, onClose]);

  if (!isOpen) return null;

  const progressPercent = Math.max(0, Math.min(100, (remainingTime / durationSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 border-2 border-emerald-400/80 shadow-2xl space-y-6 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-emerald-200 transition-colors"
          title="Закрыть (Ок)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                ГОТОВАЯ ДЕТАЛЬ
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                Голос: «Готовая деталь»
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
              Отложить деталь в отдельную пачку!
            </h2>
          </div>
        </div>

        {/* Main Content Info Box */}
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
          <div className="text-xs text-emerald-300 uppercase font-bold tracking-wider">
            Информация о детали №{labelNumber}
          </div>
          <div className="text-lg font-black text-emerald-100">
            {partName}
          </div>
          {materialName && (
            <div className="text-xs text-emerald-300 font-mono">
              Материал: {materialName}
            </div>
          )}
          <div className="pt-2 text-xs text-emerald-200 leading-relaxed border-t border-emerald-800/80 mt-2">
            ✨ <strong className="text-white">Деталь не требует присадки!</strong> Она полностью готова на этапе кромления. Пожалуйста, отложите её отдельно от деталей, идущих на присадку/ЧПУ.
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-mono font-bold">
            <span>Автоматическое скрытие...</span>
            <span>{remainingTime.toFixed(1)} сек.</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-emerald-900">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>ОК — Деталь отложена в пачку</span>
          </button>
        </div>
      </div>
    </div>
  );
};

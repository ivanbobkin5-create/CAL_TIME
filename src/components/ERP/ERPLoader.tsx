import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Factory, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  Server, 
  Gauge, 
  Workflow,
  Sparkles
} from 'lucide-react';

interface ERPLoaderProps {
  companyName: string;
  logoUrl?: string;
  onFinish?: () => void;
  minDurationMs?: number;
  isDataReady?: boolean;
}

export const ERPLoader: React.FC<ERPLoaderProps> = ({ 
  companyName, 
  logoUrl,
  onFinish,
  minDurationMs = 250,
  isDataReady = true
}) => {
  const [progress, setProgress] = useState(25);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    { title: "Инициализация ядра ERP", desc: "Загрузка конфигурации цехов и участков" },
    { title: "Синхронизация станков и линий", desc: "Раскрой, Кромление, Присадка ЧПУ, Сборка" },
    { title: "Загрузка очередей и графиков смен", desc: "Календарное планирование заказов" },
    { title: "Проверка прав доступа и профиля", desc: "Модули зарплат, отчетов и выработки" },
    { title: "Готово к работе", desc: "Вход в систему управления производством..." }
  ];

  useEffect(() => {
    let timer: any = null;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (!isDataReady) {
          // Advance steadily up to 90% while waiting for backend
          if (prev < 90) {
            const next = prev + Math.floor(Math.random() * 12) + 8;
            const bounded = Math.min(90, next);
            const stepIdx = Math.min(steps.length - 2, Math.floor((bounded / 100) * steps.length));
            setCurrentStepIndex(stepIdx);
            return bounded;
          }
          return prev;
        } else {
          // Data is ready, swiftly reach 100%
          if (prev < 100) {
            const next = prev + 25;
            if (next >= 100) {
              setCurrentStepIndex(steps.length - 1);
              if (!timer) {
                timer = setTimeout(() => {
                  if (onFinish) onFinish();
                }, 80);
              }
              return 100;
            }
            const stepIdx = Math.min(steps.length - 1, Math.floor((next / 100) * steps.length));
            setCurrentStepIndex(stepIdx);
            return next;
          } else {
            if (!timer) {
              timer = setTimeout(() => {
                if (onFinish) onFinish();
              }, 50);
            }
          }
          return 100;
        }
      });
    }, 25);

    return () => {
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [isDataReady, onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none">
      {/* Background Tech Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Center Animated Logo Card */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6">
        <div className="relative mb-8">
          {/* Outer rotating neon rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-3xl border border-dashed border-blue-500/30 flex items-center justify-center"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-2xl border border-indigo-500/40"
          />
          {/* Inner core company logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 border border-blue-400/40 overflow-hidden p-2"
            >
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={companyName || "Логотип компании"} 
                  className="w-full h-full object-contain filter drop-shadow" 
                />
              ) : (
                <div className="flex items-center justify-center text-white">
                  <Factory className="w-10 h-10 text-white drop-shadow-md stroke-[2]" />
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Titles */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-1 flex items-center justify-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Система управления производством
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
            {companyName || "Мебельное производство"}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Автоматизация цехов • Планирование • Зарплаты • Учет
          </p>
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
          {/* Current Step Label */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Activity className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {steps[currentStepIndex]?.title}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {steps[currentStepIndex]?.desc}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4 font-mono font-bold text-sm text-blue-400">
              {progress}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-6 text-[11px] text-slate-500 font-mono text-center">
        Система управления производством © {new Date().getFullYear()}
      </div>
    </div>
  );
};

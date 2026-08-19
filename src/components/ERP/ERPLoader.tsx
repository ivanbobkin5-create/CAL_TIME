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
  onFinish?: () => void;
  minDurationMs?: number;
}

export const ERPLoader: React.FC<ERPLoaderProps> = ({ 
  companyName, 
  onFinish,
  minDurationMs = 2200 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    { title: "Инициализация ядра ERP Enterprise", desc: "Загрузка конфигурации цехов и участков" },
    { title: "Синхронизация станков и линий", desc: "Раскрой, Кромление, Присадка ЧПУ, Сборка" },
    { title: "Загрузка очередей и графиков смен", desc: "Календарное планирование заказов" },
    { title: "Проверка прав доступа и аналитики", desc: "Модули зарплат, отчетов и выработки" },
    { title: "Готово к работе", desc: "Вход в панель управления производством..." }
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      setProgress(pct);

      const stepIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
      setCurrentStepIndex(stepIdx);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 300);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none">
      {/* Background Tech Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Industrial Badge */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md text-[11px] font-mono tracking-widest text-slate-400 uppercase"
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>ERP // INDUSTRIAL MANAGEMENT SYSTEM</span>
        <span className="text-slate-600">|</span>
        <span className="text-blue-400 font-bold">ENTERPRISE v2.4</span>
      </motion.div>

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
          {/* Inner core icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 border border-blue-400/40"
            >
              <Factory className="w-10 h-10 text-white" />
            </motion.div>
          </div>
        </div>

        {/* Titles */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80 mb-4">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* System Telemetry Chips */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
              <Server className="w-3 h-3 text-emerald-400" />
              <span className="truncate">База: Онлайн</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span className="truncate">Шлюз: TLS 1.3</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
              <Gauge className="w-3 h-3 text-indigo-400" />
              <span className="truncate">Пинг: 18ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-6 text-[11px] text-slate-600 font-mono text-center">
        Платформа управления мебельным бизнесом © {new Date().getFullYear()}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Factory, Building2, Palette, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Bitrix24OnboardingModalProps {
  companyName?: string;
  onSave: (selectedType: string, workFormat: 'own' | 'contract') => Promise<void>;
}

export const Bitrix24OnboardingModal: React.FC<Bitrix24OnboardingModalProps> = ({
  companyName,
  onSave,
}) => {
  const [selectedType, setSelectedType] = useState<'Мебельное производство' | 'Салон' | 'Дизайнер'>('Мебельное производство');
  const [salonSubFormat, setSalonSubFormat] = useState<'retail_only' | 'partner_orders'>('retail_only');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prodFormat = selectedType === 'Мебельное производство' ? 'own' : (salonSubFormat === 'partner_orders' ? 'contract' : 'own');
      await onSave(selectedType, prodFormat);
    } catch (err) {
      console.error("Onboarding save error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 border border-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Добро пожаловать в «Мебельный калькулятор»!
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
            {companyName ? `Компания «${companyName}»` : 'Укажите профиль вашей деятельности'}, чтобы мы настроили идеальный интерфейс для вашей работы:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Type Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Тип вашей компании:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedType('Мебельное производство')}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer",
                  selectedType === 'Мебельное производство'
                    ? "border-blue-600 bg-blue-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl shrink-0", selectedType === 'Мебельное производство' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")}>
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Мебельное производство / Цех</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Собственный цех, расчет материалов, раскрой и сдельщина</p>
                  </div>
                </div>
                {selectedType === 'Мебельное производство' && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('Салон')}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer",
                  selectedType === 'Салон'
                    ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl shrink-0", selectedType === 'Салон' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Салон мебели / Салон-магазин</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Продажи мебели розничным клиентам и прием заказов</p>
                  </div>
                </div>
                {selectedType === 'Салон' && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('Дизайнер')}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer",
                  selectedType === 'Дизайнер'
                    ? "border-purple-600 bg-purple-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl shrink-0", selectedType === 'Дизайнер' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600")}>
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Дизайнер / Студия дизайна</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Проектирование мебели и спецификации для клиентов</p>
                  </div>
                </div>
                {selectedType === 'Дизайнер' && <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Additional Sub-options for Salon or Designer */}
          {(selectedType === 'Салон' || selectedType === 'Дизайнер') && (
            <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-fadeIn">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Формат работы:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={cn(
                  "p-3 rounded-xl border text-xs font-bold flex items-start gap-2 cursor-pointer transition-all",
                  salonSubFormat === 'retail_only' ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-slate-50 border-slate-200 text-slate-700"
                )}>
                  <input
                    type="radio"
                    name="subformat"
                    checked={salonSubFormat === 'retail_only'}
                    onChange={() => setSalonSubFormat('retail_only')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span>Только продажи</span>
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Торгуем своими силами, заказываем вне сервиса</span>
                  </div>
                </label>

                <label className={cn(
                  "p-3 rounded-xl border text-xs font-bold flex items-start gap-2 cursor-pointer transition-all",
                  salonSubFormat === 'partner_orders' ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-slate-50 border-slate-200 text-slate-700"
                )}>
                  <input
                    type="radio"
                    name="subformat"
                    checked={salonSubFormat === 'partner_orders'}
                    onChange={() => setSalonSubFormat('partner_orders')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span>Продажи и заказы</span>
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">Планируем отправлять заказы фабрикам в приложении</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Начать работу <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

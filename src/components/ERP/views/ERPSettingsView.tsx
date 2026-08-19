import React, { useState } from 'react';
import { 
  Settings, 
  Factory, 
  Layers, 
  Scissors, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Check,
  FileText
} from 'lucide-react';
import { ERPCompanySettings, MachineEquipment } from '../types';

interface ERPSettingsViewProps {
  settings: ERPCompanySettings;
  onSaveSettings: (settings: ERPCompanySettings) => void;
}

export const ERPSettingsView: React.FC<ERPSettingsViewProps> = ({
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<ERPCompanySettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-blue-600" /> Конфигурация цеха
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Настройки ERP системы производства
          </h2>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {isSaved ? 'Сохранено!' : 'Сохранить настройки'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Piecework Tariffs Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Тарифы сдельной выработки мастеров</h3>
          <p className="text-xs text-slate-400 mb-6">Расценки за операции для автоматического расчета зарплат</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-600" />
                Распил ЛДСП (₽ за м²)
              </label>
              <input
                type="number"
                value={formData.cuttingRatePerM2 || 65}
                onChange={(e) => setFormData({ ...formData, cuttingRatePerM2: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Кромление ПВХ (₽ за п.м.)
              </label>
              <input
                type="number"
                value={formData.edgingRatePerM || 35}
                onChange={(e) => setFormData({ ...formData, edgingRatePerM: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Factory className="w-4 h-4 text-purple-600" />
                Присадка ЧПУ (₽ за отверстие)
              </label>
              <input
                type="number"
                value={formData.cncHoleRate || 8}
                onChange={(e) => setFormData({ ...formData, cncHoleRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Сборка модуля (₽ за корпус)
              </label>
              <input
                type="number"
                value={formData.assemblyModuleRate || 350}
                onChange={(e) => setFormData({ ...formData, assemblyModuleRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Контроль ОТК и упаковка (₽ за заказ)
              </label>
              <input
                type="number"
                value={formData.qcRatePerOrder || 500}
                onChange={(e) => setFormData({ ...formData, qcRatePerOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Production Stages / Departments Toggle Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Участки производства (стадии технологического конвейера)</h3>
          <p className="text-xs text-slate-400 mb-6">Включайте или отключайте участки производства — именно они являются стадиями на Канбан-доске и в планировании</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'queue', label: 'Очередь запуска' },
              { id: 'cutting', label: 'Участок раскроя' },
              { id: 'edging', label: 'Участок кромления' },
              { id: 'cnc', label: 'Участок присадки ЧПУ' },
              { id: 'facades', label: 'Фасадный участок' },
              { id: 'assembly', label: 'Участок сборки' },
              { id: 'qc', label: 'Контроль ОТК' },
              { id: 'packing', label: 'Участок упаковки' },
              { id: 'ready', label: 'Готово к отгрузке' }
            ].map(st => {
              const enabledList = formData.enabledStages || ['queue', 'cutting', 'edging', 'cnc', 'facades', 'assembly', 'qc', 'packing', 'ready'];
              const isChecked = enabledList.includes(st.id as any);

              const toggleStage = () => {
                let updated: any[];
                if (isChecked) {
                  if (enabledList.length <= 1) return; // keep at least 1 stage
                  updated = enabledList.filter(s => s !== st.id);
                } else {
                  updated = [...enabledList, st.id];
                }
                setFormData({ ...formData, enabledStages: updated });
              };

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={toggleStage}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50/80 border-blue-300 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="font-bold text-xs">{st.label}</span>
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note Rules Mapping Table (Таблица соответствия примечаний) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-0.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Таблица соответствия примечаний (Спец-операции)
              </h3>
              <p className="text-xs text-slate-400">
                Автоматическое вывод инструкций мастерам при совпадении примечания в бирке (например: "4-8-36" → "Требуется паз, см. чертеж")
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const currentRules = formData.noteRules || [
                  { id: '1', pattern: '4-8-36', instruction: 'Данной детали требуется паз, см. чертеж', color: 'amber' },
                  { id: '2', pattern: 'паз', instruction: 'Требуется выборка паза под заднюю стенку / ХДФ', color: 'blue' },
                  { id: '3', pattern: 'петл', instruction: 'Присадка под петли на сверлильно-присадочном станке', color: 'purple' }
                ];
                const newRule = {
                  id: String(Date.now()),
                  pattern: '',
                  instruction: '',
                  color: 'amber'
                };
                setFormData({ ...formData, noteRules: [...currentRules, newRule] });
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Добавить правило
            </button>
          </div>

          <div className="space-y-3">
            {(!formData.noteRules || formData.noteRules.length === 0) ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Нет настроенных правил примечаний. Нажмите "Добавить правило" выше.
              </div>
            ) : (
              formData.noteRules.map((rule, rIdx) => (
                <div key={rule.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <div className="w-full md:w-1/4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Код / Команда в бирке</label>
                    <input
                      type="text"
                      placeholder="например: 4-8-36 или паз"
                      value={rule.pattern}
                      onChange={(e) => {
                        const updated = [...(formData.noteRules || [])];
                        updated[rIdx].pattern = e.target.value;
                        setFormData({ ...formData, noteRules: updated });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Инструкция для оператора</label>
                    <input
                      type="text"
                      placeholder="например: Данной детали требуется паз, см. чертеж"
                      value={rule.instruction}
                      onChange={(e) => {
                        const updated = [...(formData.noteRules || [])];
                        updated[rIdx].instruction = e.target.value;
                        setFormData({ ...formData, noteRules: updated });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="w-full md:w-36">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Цвет подсветки</label>
                    <select
                      value={rule.color || 'amber'}
                      onChange={(e) => {
                        const updated = [...(formData.noteRules || [])];
                        updated[rIdx].color = e.target.value;
                        setFormData({ ...formData, noteRules: updated });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="amber">Янтарный (Опасно/Внимание)</option>
                      <option value="blue">Синий (Инфо/Паз)</option>
                      <option value="purple">Фиолетовый (ЧПУ)</option>
                      <option value="emerald">Зеленый (ОК)</option>
                      <option value="rose">Красный (Срочно)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = (formData.noteRules || []).filter((_, i) => i !== rIdx);
                      setFormData({ ...formData, noteRules: updated });
                    }}
                    className="self-end md:self-center p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer mt-2 md:mt-4"
                    title="Удалить правило"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Work Shifts & Timings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Режим работы и смены</h3>
          <p className="text-xs text-slate-400 mb-6">График сменности и нормативы времени</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Начало смены</label>
              <input
                type="time"
                value={formData.workDayStart || '08:00'}
                onChange={(e) => setFormData({ ...formData, workDayStart: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Конец смены</label>
              <input
                type="time"
                value={formData.workDayEnd || '20:00'}
                onChange={(e) => setFormData({ ...formData, workDayEnd: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Длительность смены (часов)</label>
              <input
                type="number"
                value={formData.defaultShiftDurationHours || 12}
                onChange={(e) => setFormData({ ...formData, defaultShiftDurationHours: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

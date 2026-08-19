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
  Check
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

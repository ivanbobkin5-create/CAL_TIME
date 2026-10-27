import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Check, 
  Coins, 
  Sparkles, 
  Calendar, 
  Info, 
  Trash2, 
  Wrench,
  CheckCircle2,
  Search
} from 'lucide-react';
import { 
  InstallationTask, 
  PerformedExtraWork, 
  InstallationActSettings, 
  ExtraWorkItem 
} from '../types';
import { getEffectiveTariffVersion } from '../utils/installationActUtils';

interface ExtraWorksMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: InstallationTask;
  actSettings?: InstallationActSettings;
  onUpdateTask: (updated: InstallationTask) => void;
}

export const ExtraWorksMobileModal: React.FC<ExtraWorksMobileModalProps> = ({
  isOpen,
  onClose,
  task,
  actSettings,
  onUpdateTask
}) => {
  if (!isOpen) return null;

  // Get effective tariff version based on task contract date or creation date
  const effectiveTariff = getEffectiveTariffVersion(actSettings, task.contractDate || task.createdAt);

  // Existing performed extra works map
  const [performedMap, setPerformedMap] = useState<Record<string, PerformedExtraWork>>(() => {
    const map: Record<string, PerformedExtraWork> = {};
    if (task.performedExtraWorks) {
      task.performedExtraWorks.forEach(p => {
        map[p.workId] = p;
      });
    }
    return map;
  });

  // Custom Extra Works added manually on site
  const [customWorks, setCustomWorks] = useState<PerformedExtraWork[]>(() => {
    if (!task.performedExtraWorks) return [];
    const standardIds = effectiveTariff.items.map(i => i.id);
    return task.performedExtraWorks.filter(p => !standardIds.includes(p.workId));
  });

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(500);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tariff items by search query
  const filteredTariffItems = useMemo(() => {
    if (!searchQuery.trim()) return effectiveTariff.items;
    const q = searchQuery.toLowerCase().trim();
    return effectiveTariff.items.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.category && item.category.toLowerCase().includes(q))
    );
  }, [effectiveTariff.items, searchQuery]);

  // Auto-save whenever performedMap or customWorks change
  const saveChanges = (newMap: Record<string, PerformedExtraWork>, newCustom: PerformedExtraWork[]) => {
    const standardPerformed = Object.values(newMap).filter(p => p.quantity > 0);
    const allPerformed = [...standardPerformed, ...newCustom.filter(c => c.quantity > 0)];
    
    const extraWorksTotal = allPerformed.reduce((sum, item) => sum + item.totalPrice, 0);

    const updatedTask: InstallationTask = {
      ...task,
      appliedTariffVersionId: effectiveTariff.id,
      performedExtraWorks: allPerformed,
      extraWorksTotal,
      updatedAt: new Date().toISOString()
    };

    onUpdateTask(updatedTask);

    // Save background backup in localStorage for extra safety against network reload
    try {
      localStorage.setItem(`installer_extraworks_backup_${task.id}`, JSON.stringify(allPerformed));
    } catch (e) {}
  };

  const handleUpdateQuantity = (item: ExtraWorkItem, delta: number) => {
    const existing = performedMap[item.id];
    const currentQty = existing ? existing.quantity : 0;
    const newQty = Math.max(0, currentQty + delta);

    const updatedMap = { ...performedMap };

    if (newQty > 0) {
      updatedMap[item.id] = {
        id: existing ? existing.id : `pew-${Date.now()}-${item.id}`,
        workId: item.id,
        name: item.name,
        unit: item.unit,
        price: item.price,
        quantity: newQty,
        totalPrice: newQty * item.price
      };
    } else {
      delete updatedMap[item.id];
    }

    setPerformedMap(updatedMap);
    saveChanges(updatedMap, customWorks);
  };

  const handleAddCustomWork = () => {
    if (!customName.trim() || customPrice <= 0) return;

    const newCustomItem: PerformedExtraWork = {
      id: `pew-custom-${Date.now()}`,
      workId: `custom-${Date.now()}`,
      name: customName.trim(),
      unit: 'услуга',
      price: customPrice,
      quantity: 1,
      totalPrice: customPrice
    };

    const updatedCustom = [...customWorks, newCustomItem];
    setCustomWorks(updatedCustom);
    setCustomName('');
    setShowAddCustom(false);

    saveChanges(performedMap, updatedCustom);
  };

  const handleDeleteCustomWork = (customId: string) => {
    const updatedCustom = customWorks.filter(c => c.id !== customId);
    setCustomWorks(updatedCustom);
    saveChanges(performedMap, updatedCustom);
  };

  // Grand Total calculation
  const totalExtraWorksSum = React.useMemo(() => {
    const standardSum = Object.values(performedMap).reduce((s, p) => s + p.totalPrice, 0);
    const customSum = customWorks.reduce((s, c) => s + c.totalPrice, 0);
    return standardSum + customSum;
  }, [performedMap, customWorks]);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Заказ №{task.orderNumber}
              </div>
              <h3 className="font-black text-white text-base">
                Дополнительные работы
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tariff Version Indicator */}
        <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-950 shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{effectiveTariff.versionName}</span>
          </div>
          <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-lg font-bold">
            Прайс на дату договора
          </span>
        </div>

        {/* Search Bar for Extra Works */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск услуги по названию..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Work Items Checklist (Scrollable) */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Отметьте выполненные доп. работы:
          </div>

          {filteredTariffItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              По запросу «{searchQuery}» работы не найдены
            </div>
          ) : (
            filteredTariffItems.map(item => {
            const performed = performedMap[item.id];
            const qty = performed ? performed.quantity : 0;
            const isSelected = qty > 0;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 leading-snug">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                    <span className="font-bold text-amber-700">{(item.price || 0).toLocaleString('ru-RU')} ₽</span>
                    <span>/ {item.unit}</span>
                  </div>
                </div>

                {/* Counter Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item, -1)}
                    disabled={qty <= 0}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black transition-all ${
                      qty > 0 
                        ? 'bg-amber-200 hover:bg-amber-300 text-amber-950 cursor-pointer' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className={`w-7 text-center font-mono font-black text-sm ${qty > 0 ? 'text-amber-900' : 'text-slate-400'}`}>
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item, 1)}
                    className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-black transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }))}

          {/* Custom Works Section */}
          {customWorks.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Индивидуальные доп. работы на объекте:
              </div>
              {customWorks.map(custom => (
                <div key={custom.id} className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-purple-950">{custom.name}</div>
                    <div className="text-[11px] text-purple-700 font-medium">{(custom.price || 0).toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomWork(custom.id)}
                    className="p-1.5 rounded-xl text-purple-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Work Form Toggle */}
          {!showAddCustom ? (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-dashed border-slate-300"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Добавить нестандартную работу</span>
            </button>
          ) : (
            <div className="p-3.5 bg-slate-100 rounded-2xl space-y-3 border border-slate-300">
              <div className="font-bold text-xs text-slate-800">Новая нестандартная работа:</div>
              <input
                type="text"
                placeholder="Наименование работы"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Цена (₽)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomWork}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                >
                  Добавить
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Sum & Save Confirmation */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Итого за доп. работы:
            </div>
            <div className="font-mono font-black text-xl text-amber-400">
              {totalExtraWorksSum.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Сохранено (Авто)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

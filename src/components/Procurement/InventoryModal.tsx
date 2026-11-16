import React, { useState } from 'react';
import { 
  X, 
  Search, 
  ClipboardCheck, 
  AlertTriangle, 
  Check, 
  Package, 
  MapPin, 
  Layers, 
  RotateCcw,
  Save,
  CheckCircle2
} from 'lucide-react';
import { MaterialResidual, ERPEmployee } from '../ERP/types';

interface InventoryModalProps {
  residuals: MaterialResidual[];
  currentUser?: ERPEmployee | any | null;
  onClose: () => void;
  onApplyInventory: (adjusted: MaterialResidual[], auditLog?: any) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  residuals,
  currentUser,
  onClose,
  onApplyInventory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inventoryState, setInventoryState] = useState<Record<string, {
    countedQty: number;
    status: 'available' | 'disposed' | 'used';
    storageCell: string;
    notes: string;
  }>>(() => {
    const initial: Record<string, {
      countedQty: number;
      status: 'available' | 'disposed' | 'used';
      storageCell: string;
      notes: string;
    }> = {};
    residuals.forEach(item => {
      initial[item.id] = {
        countedQty: item.quantity,
        status: item.status || 'available',
        storageCell: item.storageCell || '',
        notes: item.notes || ''
      };
    });
    return initial;
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const categories = Array.from(new Set(residuals.map(r => r.category || 'Другое')));

  const filteredResiduals = residuals.filter(item => {
    const state = inventoryState[item.id];
    if (!state) return false;

    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.materialName.toLowerCase().includes(q);
      const matchCategory = (item.category || '').toLowerCase().includes(q);
      const matchCell = (state.storageCell || '').toLowerCase().includes(q);
      const matchOrder = (item.orderNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchCategory && !matchCell && !matchOrder) return false;
    }

    return true;
  });

  const handleQtyChange = (id: string, val: number) => {
    setInventoryState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        countedQty: Math.max(0, val)
      }
    }));
  };

  const handleStatusChange = (id: string, status: 'available' | 'disposed' | 'used') => {
    setInventoryState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status
      }
    }));
  };

  const handleStorageCellChange = (id: string, storageCell: string) => {
    setInventoryState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        storageCell
      }
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setInventoryState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        notes
      }
    }));
  };

  // Calculate variances
  const variances = residuals.map(item => {
    const st = inventoryState[item.id];
    const diff = st.countedQty - item.quantity;
    const statusChanged = st.status !== item.status;
    return {
      item,
      expected: item.quantity,
      actual: st.countedQty,
      diff,
      statusChanged,
      hasDiscrepancy: diff !== 0 || statusChanged
    };
  });

  const totalDiscrepancies = variances.filter(v => v.hasDiscrepancy).length;

  const handleSave = () => {
    const updatedResiduals: MaterialResidual[] = residuals.map(item => {
      const st = inventoryState[item.id];
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const isDisposed = st.status === 'disposed' && item.status !== 'disposed';
      return {
        ...item,
        quantity: st.countedQty,
        status: st.status,
        storageCell: st.storageCell,
        notes: st.notes,
        ...(isDisposed ? {
          disposedAt: nowStr,
          disposedByEmployeeName: currentUser?.name || currentUser?.email || 'Инвентаризация'
        } : {})
      };
    });

    const auditLog = {
      date: new Date().toISOString(),
      employee: currentUser?.name || currentUser?.email || 'Сотрудник склада',
      totalItems: residuals.length,
      discrepanciesCount: totalDiscrepancies,
      variances: variances.filter(v => v.hasDiscrepancy).map(v => ({
        id: v.item.id,
        materialName: v.item.materialName,
        expected: v.expected,
        actual: v.actual,
        diff: v.diff,
        status: inventoryState[v.item.id].status,
        notes: inventoryState[v.item.id].notes
      }))
    };

    setIsSubmitted(true);
    setTimeout(() => {
      onApplyInventory(updatedResiduals, auditLog);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Инвентаризация склада
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Сверка фактических остатков материалов с системным учетом • {currentUser?.name || 'Начальник склада'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS & STATS */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по названию, ячейке, заказу..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Все категории ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 flex items-center gap-1.5 shadow-xs">
              <Package className="w-4 h-4 text-slate-400" />
              <span>Всего позиций: <strong className="text-slate-900">{residuals.length}</strong></span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-xs ${
              totalDiscrepancies > 0 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {totalDiscrepancies > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Check className="w-4 h-4 text-emerald-500" />
              )}
              <span>Расхождений: <strong className="text-sm">{totalDiscrepancies}</strong></span>
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredResiduals.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Package className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
              <p className="font-medium text-sm">Позиций для инвентаризации не найдено</p>
              <p className="text-xs">Попробуйте изменить параметры поиска или фильтр категорий</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Материал / Детали</th>
                    <th className="p-3.5">Категория / Заказ</th>
                    <th className="p-3.5">Ячейка</th>
                    <th className="p-3.5 text-center">Учетное (шт)</th>
                    <th className="p-3.5 text-center">Факт (шт)</th>
                    <th className="p-3.5 text-center">Отклонение</th>
                    <th className="p-3.5">Статус</th>
                    <th className="p-3.5 pr-4">Примечание</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResiduals.map(item => {
                    const st = inventoryState[item.id] || {
                      countedQty: item.quantity,
                      status: item.status || 'available',
                      storageCell: item.storageCell || '',
                      notes: item.notes || ''
                    };
                    const diff = st.countedQty - item.quantity;
                    const hasDiscrepancy = diff !== 0 || st.status !== item.status;

                    return (
                      <tr 
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          hasDiscrepancy ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {/* Name */}
                        <td className="p-3.5 pl-4">
                          <div className="font-semibold text-slate-900 text-sm">{item.materialName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            {item.thicknessMm && <span>{item.thicknessMm}мм</span>}
                            {item.lengthMm && item.widthMm && (
                              <span>{item.lengthMm}x{item.widthMm}мм</span>
                            )}
                            {item.decor && <span className="text-indigo-600 font-medium">{item.decor}</span>}
                          </div>
                        </td>

                        {/* Category & Order */}
                        <td className="p-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                          {item.orderNumber && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <span className="text-slate-400">№:</span> {item.orderNumber}
                            </div>
                          )}
                        </td>

                        {/* Storage Cell */}
                        <td className="p-3.5">
                          <div className="relative">
                            <input
                              type="text"
                              value={st.storageCell}
                              onChange={e => handleStorageCellChange(item.id, e.target.value)}
                              placeholder="Ячейка..."
                              className="w-28 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                            />
                          </div>
                        </td>

                        {/* Expected */}
                        <td className="p-3.5 text-center font-semibold text-slate-600">
                          {item.quantity}
                        </td>

                        {/* Actual input */}
                        <td className="p-3.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={st.countedQty}
                            onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                            className={`w-20 px-2 py-1 text-center font-bold text-sm border rounded-lg focus:outline-none ${
                              diff !== 0
                                ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                                : 'border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20'
                            }`}
                          />
                        </td>

                        {/* Variance */}
                        <td className="p-3.5 text-center font-bold text-xs">
                          {diff === 0 ? (
                            <span className="text-slate-400">0</span>
                          ) : diff > 0 ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{diff}
                            </span>
                          ) : (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {diff}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <select
                            value={st.status}
                            onChange={e => handleStatusChange(item.id, e.target.value as any)}
                            className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="available">В наличии</option>
                            <option value="used">Использован</option>
                            <option value="disposed">Утилизирован</option>
                          </select>
                        </td>

                        {/* Notes */}
                        <td className="p-3.5 pr-4">
                          <input
                            type="text"
                            value={st.notes}
                            onChange={e => handleNotesChange(item.id, e.target.value)}
                            placeholder="Причина расхождения..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {totalDiscrepancies > 0 ? (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Внимание: Найдено {totalDiscrepancies} позиций с расхождениями остатков.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Все учетные данные совпадают с фактическими.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>

            <button
              onClick={handleSave}
              disabled={isSubmitted}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitted ? (
                <>
                  <Check className="w-4 h-4 animate-bounce" />
                  Применение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Провести инвентаризацию
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

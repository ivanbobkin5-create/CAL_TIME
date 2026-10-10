import React, { useState } from 'react';
import { 
  X, Layers, CheckCircle2, AlertTriangle, Save, RefreshCw, Plus, Search, Filter, ArrowRight
} from 'lucide-react';
import { MaterialResidual } from '../ERP/types';
import { cn } from '../../lib/utils';

interface InventoryItemCount {
  residualId: string;
  name: string;
  category: string;
  systemQty: number;
  actualQty: number;
  discrepancy: number; // actual - system
  notes?: string;
}

interface InventoryModalProps {
  residuals: MaterialResidual[];
  currentUser: any;
  onClose: () => void;
  onApplyInventory: (adjustedResiduals: MaterialResidual[], auditLog: any) => void;
  showAlert?: (title: string, msg: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  residuals,
  currentUser,
  onClose,
  onApplyInventory,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const [itemCounts, setItemCounts] = useState<InventoryItemCount[]>(() => {
    return residuals.map(r => ({
      residualId: r.id,
      name: r.name,
      category: r.category || 'ЛДСП',
      systemQty: Number(r.quantity || 1),
      actualQty: Number(r.quantity || 1),
      discrepancy: 0,
      notes: ''
    }));
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActualQtyChange = (residualId: string, val: number) => {
    setItemCounts(prev => prev.map(item => {
      if (item.residualId === residualId) {
        const actual = Math.max(0, val);
        return {
          ...item,
          actualQty: actual,
          discrepancy: actual - item.systemQty
        };
      }
      return item;
    }));
  };

  const handleNotesChange = (residualId: string, notes: string) => {
    setItemCounts(prev => prev.map(item => {
      if (item.residualId === residualId) {
        return { ...item, notes };
      }
      return item;
    }));
  };

  const filteredItems = itemCounts.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDiscrepancies = itemCounts.filter(i => i.discrepancy !== 0).length;

  const handleSaveInventory = () => {
    setIsSubmitting(true);

    const updatedResiduals = residuals.map(r => {
      const counted = itemCounts.find(c => c.residualId === r.id);
      if (counted) {
        return {
          ...r,
          quantity: counted.actualQty,
          notes: counted.notes || r.notes
        };
      }
      return r;
    });

    const auditLog = {
      id: `inv_${Date.now()}`,
      createdAt: new Date().toISOString(),
      conductedBy: currentUser?.employeeName || currentUser?.name || currentUser?.displayName || 'Начальник склада',
      itemsCount: itemCounts.length,
      discrepanciesCount: totalDiscrepancies,
      items: itemCounts.filter(i => i.discrepancy !== 0)
    };

    onApplyInventory(updatedResiduals, auditLog);
    setIsSubmitting(false);
    showAlert('Инвентаризация завершена', `Акт инвентаризации зарегистрирован. Изменено остатков: ${totalDiscrepancies} поз.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Проведение инвентаризации склада</h3>
              <p className="text-xs text-slate-300">Сверка фактических остатков с учетными данными и автоматическое оприходование/списание</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск номенклатуры или категории..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          <div className="text-xs font-bold text-slate-700 flex items-center gap-3 shrink-0">
            <span>Всего поз.: <strong>{itemCounts.length}</strong></span>
            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", totalDiscrepancies > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
              Расхождений: {totalDiscrepancies}
            </span>
          </div>
        </div>

        {/* Inventory Audit Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
            {filteredItems.map((item) => (
              <div key={item.residualId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
                
                {/* Item Details */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Категория: <strong className="text-slate-800">{item.category}</strong></span>
                    <span>Учет остатка в базе: <strong className="text-indigo-700 font-mono">{item.systemQty} шт.</strong></span>
                  </div>
                </div>

                {/* Actual Count Entry & Discrepancy */}
                <div className="flex items-center gap-4 shrink-0">
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Фактический пересчет
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.actualQty}
                      onChange={(e) => handleActualQtyChange(item.residualId, parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-center focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  {/* Discrepancy Badge */}
                  <div className="w-28 text-right">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Отклонение</span>
                    <span className={cn(
                      "font-black text-xs",
                      item.discrepancy === 0 ? "text-slate-400" :
                      item.discrepancy > 0 ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"
                    )}>
                      {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy} шт.
                    </span>
                  </div>

                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Отмена
          </button>

          <button
            onClick={handleSaveInventory}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Завершить инвентаризацию и применить актом</span>
          </button>
        </div>

      </div>
    </div>
  );
};

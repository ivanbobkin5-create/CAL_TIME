import React, { useState, useMemo } from 'react';
import { 
  X, 
  Boxes, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  Tag, 
  RefreshCw,
  Check,
  AlertCircle,
  Building2,
  PackageCheck
} from 'lucide-react';
import { WarehouseItem } from '../views/WarehouseView';
import { cn } from '../../../lib/utils';

interface ImportCalculatorCatalogModalProps {
  companyId: string;
  catalogProducts?: any[];
  catalogMaterials?: Record<string, string[]>;
  existingWarehouseItems: WarehouseItem[];
  onClose: () => void;
  onImportComplete: (importedItems: WarehouseItem[]) => void;
  currentUser?: any;
}

export const detectWarehouseCategory = (name: string, rawCat?: string): string => {
  const text = `${name} ${rawCat || ''}`.toLowerCase();

  if (/фасад|эмаль|шпон|пленка|пильн|заказн/i.test(text)) {
    return 'Фасады';
  }
  if (/столешниц|стеновая|фартук|кедр|слотекс|компакт|камень/i.test(text)) {
    return 'Столешницы';
  }
  if (/кромка|пвх|абс|кант|лента/i.test(text)) {
    return 'Кромка';
  }
  if (/лдсп|дсп|плита/i.test(text)) {
    return 'ЛДСП';
  }
  if (/мдф|хдф|двп|оргалит/i.test(text)) {
    return 'МДФ';
  }
  if (/конфирмат|евровинт|эксцентрик|шкант|саморез|стяжка|уголок|винт|болт|гайка|футорка|полкодержател|метиз|крепеж/i.test(text)) {
    return 'Метизы и крепеж';
  }
  if (/клей|герметик|скотч|очистител|воск|химия/i.test(text)) {
    return 'Химия и клей';
  }
  if (/профиль|gola|гола|цоколь|рейка|штанга|рассеиватель|led|подсветк/i.test(text)) {
    return 'Профили и цоколи';
  }
  if (/петл|направляющ|ручк|опор|ножк|подъемник|сушк|лоток|корзин|бутылочниц|демпфер|blum|hettich|boyard|hafele|firmax|фурнитур/i.test(text)) {
    return 'Фурнитура';
  }

  return 'Другое';
};

export const ImportCalculatorCatalogModal: React.FC<ImportCalculatorCatalogModalProps> = ({
  companyId,
  catalogProducts = [],
  catalogMaterials = {},
  existingWarehouseItems = [],
  onClose,
  onImportComplete,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все категории');
  const [statusFilter, setStatusFilter] = useState<'new_only' | 'all' | 'existing'>('new_only');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract all catalog items from catalogProducts & catalogMaterials
  const candidateItems = useMemo(() => {
    const list: Array<{
      id: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      price: number;
      supplier: string;
      isAlreadyInWarehouse: boolean;
      existingWarehouseItem?: WarehouseItem;
      source: 'product' | 'material';
    }> = [];

    const existingNameSet = new Set(
      existingWarehouseItems.map(w => w.name.toLowerCase().trim())
    );
    const existingSkuSet = new Set(
      existingWarehouseItems.map(w => (w.sku || '').toLowerCase().trim()).filter(Boolean)
    );

    // 1. Process catalogProducts
    catalogProducts.forEach((p, idx) => {
      const name = (p.name || p.title || `Товар #${p.id || idx}`).trim();
      if (!name) return;

      const rawSku = p.sku || p.article || p.code || (Array.isArray(p.accountingSkus) ? p.accountingSkus[0] : '') || '';
      const sku = rawSku ? String(rawSku).trim() : `CALC-${p.id || idx}`;
      const category = detectWarehouseCategory(name, p.category || p.customCategory);
      const price = Number(p.purchasePrice || p.price || p.cost) || 0;
      const unit = p.unit || (category === 'ЛДСП' || category === 'МДФ' ? 'лист' : category === 'Кромка' ? 'м.п.' : 'шт');
      const supplier = p.supplier || p.brand || p.manufacturer || '';

      const isAlready = existingNameSet.has(name.toLowerCase()) || (rawSku && existingSkuSet.has(rawSku.toLowerCase()));
      const existingMatch = existingWarehouseItems.find(
        w => w.name.toLowerCase() === name.toLowerCase() || (rawSku && w.sku?.toLowerCase() === rawSku.toLowerCase())
      );

      list.push({
        id: `calc_prod_${p.id || idx}`,
        sku,
        name,
        category,
        unit,
        price,
        supplier,
        isAlreadyInWarehouse: isAlready,
        existingWarehouseItem: existingMatch,
        source: 'product'
      });
    });

    // 2. Process catalogMaterials (brands and decors)
    Object.entries(catalogMaterials).forEach(([brand, decors]) => {
      if (!Array.isArray(decors)) return;
      decors.forEach((decor, dIdx) => {
        if (!decor || typeof decor !== 'string') return;
        const cleanDecor = decor.trim();
        const fullName = `${brand} ${cleanDecor}`;
        
        const category = detectWarehouseCategory(fullName);
        const unit = category === 'ЛДСП' || category === 'МДФ' ? 'лист' : category === 'Кромка' ? 'м.п.' : 'шт';
        const sku = `MAT-${brand.substring(0, 3).toUpperCase()}-${cleanDecor.replace(/\s+/g, '').substring(0, 8).toUpperCase()}`;

        const isAlready = existingNameSet.has(fullName.toLowerCase());
        const existingMatch = existingWarehouseItems.find(w => w.name.toLowerCase() === fullName.toLowerCase());

        list.push({
          id: `calc_mat_${brand}_${dIdx}`,
          sku,
          name: fullName,
          category,
          unit,
          price: 0,
          supplier: brand,
          isAlreadyInWarehouse: isAlready,
          existingWarehouseItem: existingMatch,
          source: 'material'
        });
      });
    });

    return list;
  }, [catalogProducts, catalogMaterials, existingWarehouseItems]);

  // Selected item IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default select all new items
    const newIds = new Set<string>();
    candidateItems.forEach(i => {
      if (!i.isAlreadyInWarehouse) newIds.add(i.id);
    });
    return newIds;
  });

  // Filtered candidate items
  const filteredCandidates = useMemo(() => {
    return candidateItems.filter(item => {
      // Status filter
      if (statusFilter === 'new_only' && item.isAlreadyInWarehouse) return false;
      if (statusFilter === 'existing' && !item.isAlreadyInWarehouse) return false;

      // Category filter
      if (selectedCategory !== 'Все категории' && item.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [candidateItems, statusFilter, selectedCategory, searchQuery]);

  const newItemsCount = useMemo(() => candidateItems.filter(i => !i.isAlreadyInWarehouse).length, [candidateItems]);
  const existingItemsCount = useMemo(() => candidateItems.filter(i => i.isAlreadyInWarehouse).length, [candidateItems]);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmImport = async () => {
    const itemsToImport = candidateItems.filter(i => selectedIds.has(i.id));
    if (itemsToImport.length === 0) {
      alert("Выберите хотя бы один товар для добавления на склад");
      return;
    }

    setIsSubmitting(true);
    try {
      const newWarehouseItems: WarehouseItem[] = itemsToImport.map(item => ({
        id: `wh-item-calc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: 10, // Initial default stock
        reservedQty: 0,
        availableQty: 10,
        minThreshold: 5,
        price: item.price,
        supplier: item.supplier,
        storageCell: 'Стеллаж A-1',
        notes: 'Импортировано из Мебельного калькулятора',
        isResidual: false,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Администратор'
      }));

      // Send to backend via bulk endpoint
      const res = await fetch(`/api/companies/${companyId}/warehouse-items/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newWarehouseItems })
      });

      if (!res.ok) {
        // Fallback: send individual POST requests if bulk endpoint is unavailable
        await Promise.all(
          newWarehouseItems.map(whItem => 
            fetch(`/api/companies/${companyId}/warehouse-items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(whItem)
            }).catch(() => null)
          )
        );
      }

      onImportComplete(newWarehouseItems);
      onClose();
    } catch (err: any) {
      console.error("Error importing catalog items into warehouse:", err);
      alert("Произошла ошибка при сохранении товаров на склад");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">Импорт номенклатуры из Мебельного калькулятора</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {candidateItems.length} позиций в Калькуляторе
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Просмотр и синхронизация созданных товаров, материалов, фурнитуры и декоров со складом ТМЦ
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Stats Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Новых для склада: <strong>{newItemsCount}</strong></span>
            </div>

            <div className="flex items-center gap-2 bg-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl">
              <PackageCheck className="w-4 h-4 text-slate-500" />
              <span>Уже присутствуют на складе: <strong>{existingItemsCount}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('new_only')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === 'new_only' 
                  ? "bg-amber-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              Только новые ({newItemsCount})
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === 'all' 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              Все ({candidateItems.length})
            </button>
          </div>
        </div>

        {/* Content & Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Поиск по наименованию, артикулу, бренду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-hidden focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {[
                'Все категории',
                'ЛДСП',
                'МДФ',
                'Кромка',
                'Фурнитура',
                'Столешницы',
                'Фасады',
                'Метизы и крепеж'
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Candidates Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={filteredCandidates.length > 0 && filteredCandidates.every(c => selectedIds.has(c.id))}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-32">Артикул / SKU</th>
                    <th className="p-3">Наименование номенклатуры</th>
                    <th className="p-3 w-36">Категория склада</th>
                    <th className="p-3 w-24 text-center">Ед. изм.</th>
                    <th className="p-3 w-28 text-right">Закупочная цена</th>
                    <th className="p-3 w-32">Поставщик / Бренд</th>
                    <th className="p-3 w-36 text-center">Статус склада</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredCandidates.length > 0 ? filteredCandidates.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr 
                        key={item.id} 
                        className={cn(
                          "hover:bg-slate-50/80 transition-colors",
                          isSelected && "bg-amber-50/30",
                          item.isAlreadyInWarehouse && "opacity-75"
                        )}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItem(item.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono text-[10px] font-bold text-slate-600">
                          {item.sku}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 leading-snug">{item.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Источник: {item.source === 'product' ? 'Товары калькулятора' : 'Декоры и бренды'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {item.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {item.price > 0 ? `${item.price.toLocaleString('ru-RU')} ₽` : '—'}
                        </td>
                        <td className="p-3 text-slate-600 font-bold truncate max-w-[130px]">
                          {item.supplier || '—'}
                        </td>
                        <td className="p-3 text-center">
                          {item.isAlreadyInWarehouse ? (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>На складе</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>Новый товар</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        Товары по заданным фильтрам не найдены
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Закрыть
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-bold">
              Выбрано для добавления: <strong>{selectedIds.size}</strong> поз.
            </span>

            <button
              onClick={handleConfirmImport}
              disabled={isSubmitting || selectedIds.size === 0}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Добавить выбранные на склад ТМЦ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

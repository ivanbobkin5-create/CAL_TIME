import React, { useState } from 'react';
import { 
  X, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Plus, RefreshCw, Layers, ArrowRight, Check, Tag
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BazisItem {
  id: string;
  article: string;
  name: string;
  quantity: number;
  unit: string;
  rawCategory?: string;
  matchedCategoryId?: string;
  matchedCategoryName?: string;
  matchedWarehouseItemId?: string;
  matchedWarehouseItemName?: string;
  status: 'matched' | 'unmatched' | 'created_new';
}

interface BazisImportModalProps {
  categories: Array<{ id: string; name: string; keywords: string[] }>;
  warehouseItems: Array<{ id: string; name: string; article?: string; category?: string; stock?: number }>;
  onClose: () => void;
  onImportComplete: (items: BazisItem[]) => void;
  showAlert?: (title: string, msg: string) => void;
}

export const BazisImportModal: React.FC<BazisImportModalProps> = ({
  categories,
  warehouseItems,
  onClose,
  onImportComplete,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<BazisItem[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [selectedWarehouseMatch, setSelectedWarehouseMatch] = useState<Record<string, string>>({});

  // Auto-categorize item based on category keywords
  const detectCategory = (name: string, rawCat?: string) => {
    const text = `${name} ${rawCat || ''}`.toLowerCase();
    for (const cat of categories) {
      if (cat.keywords && cat.keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return cat;
      }
    }
    // Fallback to ЛДСП or first category
    return categories.find(c => c.name.includes('ЛДСП')) || categories[0] || { id: 'cat_default', name: 'ЛДСП/Кромка/ХДФ' };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsAnalyzing(true);

    // Simulate reading Bazis XLSM / XLSX file structure
    setTimeout(() => {
      const fileName = uploadedFile.name.toLowerCase();
      // Generate sample parsed Bazis items from file name or structure
      const sampleItems: BazisItem[] = [
        {
          id: 'bzs_1',
          article: 'LDSP-18-WHT',
          name: 'ЛДСП 16мм Белый Влагостойкий (2800х2070)',
          quantity: 4,
          unit: 'лист',
          rawCategory: 'Плитные материалы',
          status: 'unmatched'
        },
        {
          id: 'bzs_2',
          article: 'EDG-04-WHT',
          name: 'Кромка ПВХ 19х0.4 мм Белая гладкая',
          quantity: 45,
          unit: 'м.п.',
          rawCategory: 'Кромка',
          status: 'unmatched'
        },
        {
          id: 'bzs_3',
          article: 'HINGE-CLIP-110',
          name: 'Петля Blum Clip Top 110° с доводчиком',
          quantity: 12,
          unit: 'шт',
          rawCategory: 'Фурнитура',
          status: 'unmatched'
        },
        {
          id: 'bzs_4',
          article: 'FCD-MDF-PAINT',
          name: 'Фасад МДФ Эмаль Бежевый матовый',
          quantity: 6,
          unit: 'кв.м',
          rawCategory: 'Фасады',
          status: 'unmatched'
        }
      ];

      // Auto-match with existing warehouse catalog
      const itemsWithMatches = sampleItems.map(item => {
        const cat = detectCategory(item.name, item.rawCategory);
        const exactMatch = warehouseItems.find(w => 
          (w.article && w.article.toLowerCase() === item.article.toLowerCase()) ||
          w.name.toLowerCase() === item.name.toLowerCase()
        );

        return {
          ...item,
          matchedCategoryId: cat.id,
          matchedCategoryName: cat.name,
          matchedWarehouseItemId: exactMatch?.id,
          matchedWarehouseItemName: exactMatch?.name,
          status: exactMatch ? ('matched' as const) : ('unmatched' as const)
        };
      });

      setParsedItems(itemsWithMatches);
      setIsAnalyzing(false);
      setStep('mapping');
    }, 1200);
  };

  const handleManualMatch = (itemId: string, warehouseItemId: string) => {
    const targetW = warehouseItems.find(w => w.id === warehouseItemId);
    setParsedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          matchedWarehouseItemId: warehouseItemId || undefined,
          matchedWarehouseItemName: targetW?.name || undefined,
          status: warehouseItemId ? 'matched' : 'unmatched'
        };
      }
      return item;
    }));
  };

  const handleCategoryChange = (itemId: string, categoryId: string) => {
    const targetCat = categories.find(c => c.id === categoryId);
    setParsedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          matchedCategoryId: categoryId,
          matchedCategoryName: targetCat?.name || item.matchedCategoryName
        };
      }
      return item;
    }));
  };

  const handleCreateNew = (itemId: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'created_new'
        };
      }
      return item;
    }));
  };

  const handleConfirmImport = () => {
    onImportComplete(parsedItems);
    showAlert('Успех', `Загружено ${parsedItems.length} позиций из спецификации Базис Мебельщик`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Импорт файла из Базис Мебельщик</h3>
              <p className="text-xs text-slate-300">Анализ артикулов, сопоставление со складом и авторазнос по категориям</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {step === 'upload' ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4 hover:border-indigo-400 transition-all bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Выберите спецификацию Базис (XLSM / XLSX / XLS)</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Система автоматически распознает артикулы, наименования, количества и сопоставит товары со складскими остатками.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Прикрепить спецификацию xlsm</span>
                <input 
                  type="file" 
                  accept=".xlsm,.xlsx,.xls,.csv" 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
              </label>

              {isAnalyzing && (
                <div className="pt-4 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Анализируем структуры артикулов и категорий...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Распознано позиций из Базис: <strong>{parsedItems.length}</strong></span>
                </div>
                <div className="text-indigo-600 font-medium">
                  Файл: {file?.name}
                </div>
              </div>

              {/* Items List & Mapping */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Сопоставление товаров и категорий закупки
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {parsedItems.map((item) => (
                    <div key={item.id} className="p-4 bg-white hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left Item Details */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                            {item.article || 'Без артикула'}
                          </span>
                          <span className="text-xs font-black text-slate-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Количество в Базис: <strong className="text-slate-800">{item.quantity} {item.unit}</strong></span>
                          <span>Исходная категория: <strong className="text-slate-800">{item.rawCategory || 'Не указано'}</strong></span>
                        </div>
                      </div>

                      {/* Right Controls: Category & Warehouse Matching */}
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        
                        {/* Target Procurement Category */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Категория закупки
                          </label>
                          <select
                            value={item.matchedCategoryId}
                            onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-600"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Match with Warehouse Item */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Товар на складе
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.matchedWarehouseItemId || ''}
                              onChange={(e) => handleManualMatch(item.id, e.target.value)}
                              className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-600 max-w-[200px] truncate"
                            >
                              <option value="">-- Создать новый товар --</option>
                              {warehouseItems.map(w => (
                                <option key={w.id} value={w.id}>
                                  {w.name} {w.article ? `(${w.article})` : ''}
                                </option>
                              ))}
                            </select>

                            {!item.matchedWarehouseItemId && (
                              <button
                                onClick={() => handleCreateNew(item.id)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                  item.status === 'created_new' 
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
                                )}
                                title="Создать как новую номенклатуру"
                              >
                                + Новый
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="pl-2">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                            item.status === 'matched' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            item.status === 'created_new' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                            "bg-amber-100 text-amber-800 border border-amber-200"
                          )}>
                            {item.status === 'matched' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {item.status === 'matched' ? 'Сопоставлен' : item.status === 'created_new' ? 'Новый' : 'Требует выбора'}
                          </span>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (step === 'mapping') setStep('upload');
              else onClose();
            }}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            {step === 'mapping' ? 'Назад' : 'Отмена'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Подтвердить и внести в Снабжение</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

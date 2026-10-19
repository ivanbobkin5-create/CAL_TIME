import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Layers, 
  Search, 
  Trash2, 
  Download, 
  Printer, 
  Package, 
  Check, 
  Tag, 
  FileText,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cn } from '../../lib/utils';

export interface BazisSpecItem {
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
  price?: number;
  totalAmount?: number;
  status: 'matched' | 'unmatched' | 'created_new';
  procurementStatus?: 'Не заказано' | 'Заказано' | 'Поступило' | 'Нет в проекте';
}

export interface OrderBazisData {
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
  totalItemsCount: number;
  totalQuantity: number;
  items: BazisSpecItem[];
}

interface OrderBazisSpecificationModalProps {
  order: any;
  categories: Array<{ id: string; name: string; keywords: string[] }>;
  warehouseItems: Array<{ id: string; name: string; article?: string; category?: string; stock?: number }>;
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaveBazisData: (orderId: string, bazisData: OrderBazisData | null, updatedProcurementStatus?: any) => Promise<void>;
  showAlert?: (title: string, msg: string) => void;
}

export const OrderBazisSpecificationModal: React.FC<OrderBazisSpecificationModalProps> = ({
  order,
  categories,
  warehouseItems,
  suppliers,
  onClose,
  onSaveBazisData,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const existingBazis: OrderBazisData | null = order?.bazisData || null;

  const [bazisData, setBazisData] = useState<OrderBazisData | null>(existingBazis);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTabCategory, setActiveTabCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'view' | 'upload'>((existingBazis && existingBazis.items?.length > 0) ? 'view' : 'upload');

  // Auto-detect category based on item name and raw category
  const detectCategoryName = (name: string, rawCat?: string): string => {
    const text = `${name} ${rawCat || ''}`.toLowerCase();

    // 1. Facades
    if (/фасад|мдф эмаль|шпон|акрил|массив|пленка пвх|фасадн/i.test(text)) {
      if (/пильн|лдсп фасад|пилить/i.test(text)) return 'Фасады пильные';
      return 'Фасады заказные';
    }

    // 2. Sheet / Edge materials (ЛДСП, Кромка, ХДФ)
    if (/лдсп|дсп|мдф|хдф|двп|оргалит|кромка|пвх|лента|опилки|плита/i.test(text)) {
      return 'ЛДСП/Кромка/ХДФ';
    }

    // 3. Countertops & Wall Panels
    if (/столешница|стеновая|фартук|кедр|слотекс|скинали/i.test(text)) {
      if (/камень|компакт|акрил|кварц|гранит|мрамор/i.test(text)) {
        return 'Столешницы и стеновые камень/компактплиты';
      }
      return 'Столешницы и стеновые';
    }

    // 4. Glass & Mirrors
    if (/зеркало|стекло|дверь купе|профиль купе|шпросс/i.test(text)) {
      return 'Зеркала/Двери/Стекла';
    }

    // 5. Hardware / Fittings
    for (const cat of categories) {
      if (cat.keywords && cat.keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return cat.name;
      }
    }

    return 'Фурнитура';
  };

  // Helper to parse uploaded Excel / CSV / TXT Bazis file
  const parseFileContent = async (uploadedFile: File) => {
    setIsAnalyzing(true);
    setFile(uploadedFile);

    try {
      const ext = uploadedFile.name.split('.').pop()?.toLowerCase() || '';
      let rawRows: any[][] = [];

      if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext)) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Combine rows from relevant sheets (or main sheet)
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const sheetData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          if (sheetData && sheetData.length > 0) {
            rawRows = rawRows.concat(sheetData);
          }
        }
      } else {
        // CSV or Text fallback
        const text = await uploadedFile.text();
        const parsed = Papa.parse<any[]>(text, { header: false, skipEmptyLines: true });
        rawRows = parsed.data || [];
      }

      if (!rawRows || rawRows.length === 0) {
        throw new Error("Не удалось прочитать строки из файла. Проверьте формат .xlsm/.xlsx");
      }

      // Extract items from table rows
      const extractedItems: BazisSpecItem[] = [];
      let headerFound = false;
      let nameCol = -1;
      let artCol = -1;
      let qtyCol = -1;
      let unitCol = -1;
      let catCol = -1;
      let priceCol = -1;

      for (let r = 0; r < Math.min(rawRows.length, 50); r++) {
        const row = rawRows[r];
        if (!row || !Array.isArray(row)) continue;
        const strRow = row.map(c => String(c || '').trim().toLowerCase());

        strRow.forEach((cell, idx) => {
          if (nameCol === -1 && (cell.includes('наименов') || cell.includes('номенклатур') || cell.includes('материал') || cell.includes('фурнитура') || cell === 'товар' || cell === 'изделие')) {
            nameCol = idx;
          }
          if (artCol === -1 && (cell.includes('артикул') || cell === 'код' || cell === 'обозначение' || cell === 'арт')) {
            artCol = idx;
          }
          if (qtyCol === -1 && (cell.includes('кол') || cell.includes('потреб') || cell.includes('расход') || cell === 'шт' || cell === 'qty')) {
            qtyCol = idx;
          }
          if (unitCol === -1 && (cell.includes('ед') || cell.includes('изм') || cell === 'unit')) {
            unitCol = idx;
          }
          if (catCol === -1 && (cell.includes('категор') || cell.includes('групп') || cell.includes('раздел'))) {
            catCol = idx;
          }
          if (priceCol === -1 && (cell.includes('цена') || cell.includes('стоим') || cell.includes('сумма'))) {
            priceCol = idx;
          }
        });

        if (nameCol !== -1 || artCol !== -1 || qtyCol !== -1) {
          headerFound = true;
          // Process data rows below header
          for (let dr = r + 1; dr < rawRows.length; dr++) {
            const dataRow = rawRows[dr];
            if (!dataRow || !Array.isArray(dataRow)) continue;

            const nameVal = nameCol !== -1 ? String(dataRow[nameCol] || '').trim() : '';
            const artVal = artCol !== -1 ? String(dataRow[artCol] || '').trim() : '';
            const rawQty = qtyCol !== -1 ? dataRow[qtyCol] : '';
            const unitVal = unitCol !== -1 ? String(dataRow[unitCol] || '').trim() : 'шт';
            const catVal = catCol !== -1 ? String(dataRow[catCol] || '').trim() : '';
            const rawPrice = priceCol !== -1 ? dataRow[priceCol] : '';

            // Clean quantity number
            const parsedQty = parseFloat(String(rawQty).replace(',', '.')) || 0;
            const parsedPrice = parseFloat(String(rawPrice).replace(',', '.')) || 0;

            if (!nameVal && !artVal) continue;
            // Ignore rows where quantity <= 0 (technical headers / column names / empty counts)
            if (parsedQty <= 0) continue;

            // Exclude summary and technical column headers
            if (/^(итого|всего|страница|page|подпись|составил|проверил|лист|заказчик|руководитель|наименование|название|номенклатура|значение|обозначение|тип|параметр|кол-во|количество|ед\.?\s*изм\.?|цена|сумма|артикул)\b/i.test(nameVal || artVal)) {
              continue;
            }

            const itemName = nameVal || artVal;
            if (itemName.length < 2) continue;

            const categoryName = detectCategoryName(itemName, catVal);
            const targetCatObj = categories.find(c => c.name === categoryName) || categories[0];

            // Match with warehouse catalog by Article/SKU or Name
            const targetArtLower = artVal.toLowerCase().trim();
            const targetNameLower = itemName.toLowerCase().trim();

            const exactWarehouseMatch = warehouseItems.find(w => {
              const wArt = (w.article || (w as any).sku || '').toLowerCase().trim();
              const wName = (w.name || '').toLowerCase().trim();

              if (targetArtLower && wArt && targetArtLower === wArt) return true;
              if (targetNameLower && wName && (wName === targetNameLower || wName.includes(targetNameLower) || targetNameLower.includes(wName))) return true;
              return false;
            });

            extractedItems.push({
              id: `spec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              article: artVal,
              name: itemName,
              quantity: parsedQty,
              unit: unitVal || 'шт',
              rawCategory: catVal || 'Базис-Спецификация',
              matchedCategoryId: targetCatObj?.id,
              matchedCategoryName: categoryName,
              matchedWarehouseItemId: exactWarehouseMatch?.id,
              matchedWarehouseItemName: exactWarehouseMatch?.name,
              price: parsedPrice || 0,
              totalAmount: parsedQty * (parsedPrice || 0),
              status: exactWarehouseMatch ? 'matched' : 'unmatched',
              procurementStatus: 'Не заказано'
            });
          }
          break;
        }
      }

      // Fallback if no specific table columns found: extract reasonable non-empty rows
      if (extractedItems.length === 0) {
        rawRows.slice(1).forEach((row, idx) => {
          if (!row || !Array.isArray(row)) return;
          const nonEmpties = row.map(c => String(c || '').trim()).filter(Boolean);
          if (nonEmpties.length >= 2) {
            const name = nonEmpties[0];
            const qty = parseFloat(nonEmpties.find(c => /^\d+([.,]\d+)?$/.test(c)) || '1') || 1;
            const catName = detectCategoryName(name);

            extractedItems.push({
              id: `spec_fallback_${idx}`,
              article: '',
              name,
              quantity: qty,
              unit: 'шт',
              rawCategory: 'Базис XLSM',
              matchedCategoryName: catName,
              status: 'unmatched',
              procurementStatus: 'Не заказано'
            });
          }
        });
      }

      if (extractedItems.length === 0) {
        throw new Error("Файл не содержит распознанных позиций материалов или фурнитуры");
      }

      const totalQty = extractedItems.reduce((sum, item) => sum + item.quantity, 0);

      const newBazisData: OrderBazisData = {
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        totalItemsCount: extractedItems.length,
        totalQuantity: totalQty,
        items: extractedItems
      };

      setBazisData(newBazisData);
      setSelectedItemIds(extractedItems.map(i => i.id));
      setViewMode('view');
    } catch (err: any) {
      console.error("Error parsing Bazis file:", err);
      showAlert("Ошибка чтения файла", err.message || "Не удалось распарсить спецификацию Базис XLSM");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      parseFileContent(uploadedFile);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bazisData?.items?.length || 0 };
    (bazisData?.items || []).forEach(i => {
      const cat = i.matchedCategoryName || 'Фурнитура';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [bazisData]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!bazisData?.items) return [];

    return bazisData.items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.article.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.rawCategory && item.rawCategory.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTabCategory === 'all') return true;
      return item.matchedCategoryName === activeTabCategory;
    });
  }, [bazisData, searchQuery, activeTabCategory]);

  // Distribute Bazis Specification Items to Procurement Status
  const handleDistributeToProcurement = async () => {
    if (!bazisData || !bazisData.items || bazisData.items.length === 0) return;

    setIsSaving(true);
    try {
      const currentProcurement = { ...(order.procurementStatus || {}) };

      // Group selected items by target category name
      const itemsToDistribute = bazisData.items.filter(i => selectedItemIds.length === 0 || selectedItemIds.includes(i.id));

      itemsToDistribute.forEach(specItem => {
        const catName = specItem.matchedCategoryName || 'Фурнитура';
        const existingCatData = currentProcurement[catName] || { amount: 0, items: [] };
        const catItems = [...(existingCatData.items || [])];

        // Check if item already exists in this category
        const existingIndex = catItems.findIndex((ci: any) => 
          ci.name?.toLowerCase() === specItem.name.toLowerCase() ||
          (ci.article && specItem.article && ci.article.toLowerCase() === specItem.article.toLowerCase())
        );

        const calculatedAmount = specItem.totalAmount || Math.round((specItem.quantity || 1) * 1200);

        if (existingIndex !== -1) {
          // Update existing procurement item
          catItems[existingIndex] = {
            ...catItems[existingIndex],
            qty: specItem.quantity,
            quantity: specItem.quantity,
            unit: specItem.unit,
            article: specItem.article || catItems[existingIndex].article || '',
            actualAmount: Math.max(catItems[existingIndex].actualAmount || 0, calculatedAmount),
            updatedAt: new Date().toISOString()
          };
        } else {
          // Add new procurement item
          catItems.push({
            id: `proc_bzs_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            status: specItem.procurementStatus || 'Заказано',
            quantity: specItem.quantity,
            qty: specItem.quantity,
            unit: specItem.unit,
            productName: specItem.name,
            name: specItem.name,
            article: specItem.article || '',
            actualAmount: calculatedAmount,
            updatedAt: new Date().toISOString()
          });
        }

        const newCatActualTotal = catItems.reduce((sum, i) => sum + (Number(i.actualAmount) || 0), 0);

        currentProcurement[catName] = {
          ...existingCatData,
          amount: Math.max(existingCatData.amount || 0, newCatActualTotal),
          items: catItems,
          actualAmount: newCatActualTotal,
          status: existingCatData.status === 'Поступило' ? 'Поступило' : 'Заказано',
          updatedAt: new Date().toISOString()
        };
      });

      await onSaveBazisData(order.id, bazisData, currentProcurement);
      showAlert("Успешно перенесено", `Спецификация из ${itemsToDistribute.length} позиций перенесена в категории Снабжения заказа!`);
      onClose();
    } catch (err: any) {
      console.error("Error saving distributed procurement data:", err);
      showAlert("Ошибка сохранения", err.message || "Не удалось сохранить спецификацию");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!bazisData) return;
    setIsSaving(true);
    try {
      await onSaveBazisData(order.id, bazisData);
      showAlert("Сохранено", "Спецификация Базис прикреплена к заказу");
      onClose();
    } catch (err: any) {
      console.error("Error saving Bazis specification:", err);
      showAlert("Ошибка", "Не удалось сохранить спецификацию");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSpecification = async () => {
    if (!window.confirm("Удалить прикрепленную спецификацию Базис из этого заказа?")) return;
    setIsSaving(true);
    try {
      await onSaveBazisData(order.id, null);
      setBazisData(null);
      setViewMode('upload');
      showAlert("Удалено", "Спецификация Базис откреплена от заказа");
    } catch (err: any) {
      console.error("Error deleting specification:", err);
      showAlert("Ошибка", "Не удалось удалить спецификацию");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">Спецификация Базис (XLSM)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Заказ / Сделка # {order.b24DealId || order.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {order.name || 'Заказ без названия'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bazisData && (
              <button
                onClick={() => setViewMode(v => v === 'upload' ? 'view' : 'upload')}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{viewMode === 'upload' ? 'К списку' : 'Загрузить новый XLSM'}</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Upload Dropzone View */}
          {viewMode === 'upload' ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-4 hover:border-indigo-400 transition-all bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Прикрепите спецификацию Базис (XLSM / XLSX / CSV)</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">
                  Загрузите выгрузку из Базис-Мебельщик (.xlsm, .xlsx, .csv). Система автоматически распознает список требуемых материалов, плитных материалов, кромки, фурнитуры и крепежа для данного заказа.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Выбрать спецификацию xlsm / xlsx</span>
                  <input 
                    type="file" 
                    accept=".xlsm,.xlsx,.xls,.csv,.txt" 
                    onChange={handleFileUploadInput}
                    className="hidden" 
                  />
                </label>
              </div>

              {isAnalyzing && (
                <div className="pt-4 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Чтение структуры строк, артикулов и материалов...</span>
                </div>
              )}

              {bazisData && (
                <div className="pt-6 border-t border-slate-200 flex items-center justify-center gap-3">
                  <span className="text-xs text-slate-500">Текущая спецификация: <strong>{bazisData.fileName}</strong> ({bazisData.totalItemsCount} поз.)</span>
                  <button
                    onClick={() => setViewMode('view')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Вернуться к просмотру
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Specification Viewer & Interactive Material List */
            <div className="space-y-6">

              {/* Stats & File Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-2xl flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white">{bazisData?.fileName}</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold">
                        {bazisData?.uploadedAt ? new Date(bazisData.uploadedAt).toLocaleDateString() : 'Сегодня'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-300 font-medium">
                      <span>Всего позиций: <strong className="text-white">{bazisData?.totalItemsCount}</strong></span>
                      <span>Общее количество: <strong className="text-white">{bazisData?.totalQuantity}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setViewMode('upload')}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Заменить файл</span>
                  </button>

                  <button
                    onClick={handleDeleteSpecification}
                    disabled={isSaving}
                    className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded-xl text-xs border border-rose-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Удалить прикрепленную спецификацию"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Открепить</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Поиск по названию, артикулу, категории..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-hidden focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setActiveTabCategory('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      activeTabCategory === 'all' 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Все ({categoryCounts.all || 0})
                  </button>

                  {[
                    "ЛДСП/Кромка/ХДФ",
                    "Фурнитура",
                    "Фасады заказные",
                    "Столешницы и стеновые"
                  ].map(catName => (
                    <button
                      key={catName}
                      onClick={() => setActiveTabCategory(catName)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        activeTabCategory === catName 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {catName} ({categoryCounts[catName] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Specification Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedItemIds.length === (bazisData?.items?.length || 0)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedItemIds((bazisData?.items || []).map(i => i.id));
                              else setSelectedItemIds([]);
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 w-28">Артикул</th>
                        <th className="p-3">Наименование материала / фурнитуры</th>
                        <th className="p-3 w-40">Категория снабжения</th>
                        <th className="p-3 w-28 text-center">Кол-во</th>
                        <th className="p-3 w-44">Склад / Наличие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredItems.length > 0 ? filteredItems.map((item, idx) => {
                        const isSelected = selectedItemIds.includes(item.id);
                        return (
                          <tr key={item.id || idx} className={cn("hover:bg-slate-50/80 transition-colors", isSelected && "bg-indigo-50/30")}>
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedItemIds(prev => [...prev, item.id]);
                                  else setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                {item.article || '—'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 leading-snug">{item.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Исх. раздел: {item.rawCategory || 'Базис'}</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                                {item.matchedCategoryName || 'Фурнитура'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                {item.quantity} {item.unit}
                              </span>
                            </td>
                            <td className="p-3">
                              {item.matchedWarehouseItemName ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{item.matchedWarehouseItemName}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 inline-block">
                                  Нет в остатках
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                            Позиции не найдены
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Закрыть
          </button>

          {viewMode === 'view' && bazisData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveOnly}
                disabled={isSaving}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Сохранить прикрепление
              </button>

              <button
                onClick={handleDistributeToProcurement}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Разнести позиции в категории Снабжения</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

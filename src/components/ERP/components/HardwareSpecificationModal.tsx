import React, { useState } from 'react';
import { 
  X, 
  Box, 
  FileText, 
  Search, 
  Printer, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  Sparkles, 
  Layers, 
  Tag, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { ProductionOrder, OrderHardwareItem } from '../types';
import { parseHardwareFile } from '../utils/kittingParser';

interface HardwareSpecificationModalProps {
  order: ProductionOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
}

export const HardwareSpecificationModal: React.FC<HardwareSpecificationModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateOrder
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hardwareData = order.hardwareData;
  const items = hardwareData?.items || [];
  const categories = hardwareData?.categoriesSummary || [];

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const parsed = await parseHardwareFile(file);
      if (parsed.items.length === 0) {
        setUploadError('В файле не найдено строк с фурнитурой или неподдерживаемый формат.');
        setIsUploading(false);
        return;
      }

      onUpdateOrder({
        ...order,
        hardwareData: {
          fileName: parsed.fileName,
          uploadedAt: parsed.uploadedAt,
          items: parsed.items,
          totalItemsCount: parsed.totalItemsCount,
          totalQuantity: parsed.totalQuantity,
          categoriesSummary: parsed.categoriesSummary
        }
      });
    } catch (err: any) {
      console.error(err);
      setUploadError('Ошибка разбора файла ведомости: ' + (err?.message || 'проверьте формат'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearHardware = () => {
    if (!window.confirm('Удалить прикрепленную комплектовочную ведомость для этого заказа?')) return;
    onUpdateOrder({
      ...order,
      hardwareData: undefined
    });
  };

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || (item.category || 'Разное / Крепеж') === selectedCategory;
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.article && item.article.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalPacked = items.reduce((acc, it) => acc + (it.packedQuantity || 0), 0);
  const totalRequired = hardwareData?.totalQuantity || 0;
  const packedPct = totalRequired > 0 ? Math.min(100, Math.round((totalPacked / totalRequired) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-black">
                  № {order.orderNumber}
                </span>
                <span className="text-xs text-slate-400 truncate">{order.clientName}</span>
              </div>
              <h2 className="text-lg font-black text-white truncate mt-0.5">
                Комплектовочная ведомость (Фурнитура и крепеж)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Распечатать ведомость"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Summary Banner */}
          {hardwareData ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span className="font-black text-slate-900 text-sm">{hardwareData.fileName}</span>
                  <span className="text-xs text-slate-400 font-mono">({hardwareData.uploadedAt})</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-4">
                  <span>Позиций: <strong className="text-slate-900 font-mono">{hardwareData.totalItemsCount}</strong></span>
                  <span>Всего единиц: <strong className="text-slate-900 font-mono">{hardwareData.totalQuantity} шт.</strong></span>
                  <span>Упаковано: <strong className="text-emerald-700 font-mono">{totalPacked} шт. ({packedPct}%)</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-2 rounded-xl bg-white hover:bg-cyan-50 border border-slate-200 text-cyan-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Заменить файл</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  onClick={handleClearHardware}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-500 transition-colors cursor-pointer"
                  title="Удалить ведомость"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-cyan-50/50 border-2 border-dashed border-cyan-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Комплектовочная ведомость не загружена</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Загрузите файл Excel (.xlsx, .xls) или спецификацию Базис-Мебельщик / bCAD с перечнем фурнитуры, крепежа и комплектующих.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Выбрать файл спецификации</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}

          {uploadError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Categories and Filter */}
          {hardwareData && items.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Поиск фурнитуры, артикула, бренда..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Все ({items.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.category}
                      onClick={() => setSelectedCategory(cat.category)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        selectedCategory === cat.category
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{cat.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        selectedCategory === cat.category ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">№</th>
                        <th className="py-3 px-4 w-28">Артикул</th>
                        <th className="py-3 px-4">Наименование фурнитуры</th>
                        <th className="py-3 px-4 w-36">Категория</th>
                        <th className="py-3 px-4 w-24 text-right">Кол-во</th>
                        <th className="py-3 px-4 w-28 text-center">Статус</th>
                        <th className="py-3 px-4 w-44">Примечание</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item, index) => {
                        const isFullyPacked = item.packedQuantity >= item.quantity;
                        const isPartiallyPacked = item.packedQuantity > 0 && !isFullyPacked;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 text-[11px]">
                              {item.article || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {item.category || 'Разное'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                              {item.quantity} <span className="text-[10px] font-normal text-slate-500">{item.unit || 'шт'}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isFullyPacked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> Упаковано
                                </span>
                              ) : isPartiallyPacked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
                                  {item.packedQuantity}/{item.quantity}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  В очереди
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {item.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {filteredItems.length} из {items.length} позиций фурнитуры
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Plus, Check, Box, X, Filter, Sparkles, ShoppingBag } from 'lucide-react';

interface WarehouseCatalogPickerModalProps {
  isOpen: boolean;
  catalogProducts?: any[];
  warehouseLocations?: Record<string, string>;
  onClose: () => void;
  onAssignItemCell: (itemName: string, article: string | undefined, category: string | undefined, cell: string) => void;
}

export const WarehouseCatalogPickerModal: React.FC<WarehouseCatalogPickerModalProps> = ({
  isOpen,
  catalogProducts = [],
  warehouseLocations = {},
  onClose,
  onAssignItemCell
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected item state for assigning cell
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [cellInput, setCellInput] = useState('');

  // Manual tab state
  const [manualName, setManualName] = useState('');
  const [manualArticle, setManualArticle] = useState('');
  const [manualCategory, setManualCategory] = useState('Петли и доводчики');
  const [manualCell, setManualCell] = useState('');

  // Success feedback message state
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Derive unique categories from catalogProducts
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogProducts.forEach((p) => {
      const cat = p.category || p.customCategory || p.type || 'Разное';
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [catalogProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const nameMatch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const articleMatch = (p.article || '').toLowerCase().includes(searchQuery.toLowerCase());
      const brandMatch = (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSearch = !searchQuery.trim() || nameMatch || articleMatch || brandMatch;

      const pCategory = p.category || p.customCategory || p.type || 'Разное';
      const matchesCat = categoryFilter === 'all' || pCategory === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [catalogProducts, searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const handleSelectProductToAssign = (product: any) => {
    const key = `${product.article || ''}:::${(product.name || '').toLowerCase().trim()}`;
    const existingCell = warehouseLocations[key] || '';
    setSelectedProduct(product);
    setCellInput(existingCell);
  };

  const handleConfirmAssignCell = () => {
    if (!selectedProduct) return;
    const cleanCell = cellInput.trim().toUpperCase();
    if (!cleanCell) return;

    onAssignItemCell(
      selectedProduct.name,
      selectedProduct.article || undefined,
      selectedProduct.category || selectedProduct.customCategory || 'Разное / Крепеж',
      cleanCell
    );

    setFeedbackMsg(`Товар "${selectedProduct.name}" успешно закреплен за ячейкой ${cleanCell}!`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    setSelectedProduct(null);
    setCellInput('');
  };

  const handleSaveManualItem = () => {
    if (!manualName.trim()) return;
    const cleanCell = manualCell.trim().toUpperCase();

    onAssignItemCell(
      manualName.trim(),
      manualArticle.trim() || undefined,
      manualCategory,
      cleanCell
    );

    setFeedbackMsg(`Номенклатура "${manualName.trim()}" сохранена в ячейку ${cleanCell || 'БЕЗ ЯЧЕЙКИ'}!`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    setManualName('');
    setManualArticle('');
    setManualCell('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">
                Добавить номенклатуру в ячейки склада
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Выберите товар из каталога/калькулятора вашей компании или введите произвольную позицию вручную
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switchers */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Из каталога компании ({catalogProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Ручной ввод новой позиции</span>
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-white shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: CATALOG PICKER */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              
              {/* Search & Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по наименованию, артикулу, бренду (Blum, Boyard, Egger)..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 sm:w-56"
                >
                  <option value="all">Все категории ({catalogProducts.length})</option>
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Cell Assignment Box if a product is selected */}
              {selectedProduct && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-2 border-emerald-400 shadow-xl space-y-3 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                        Выбранный товар из каталога
                      </div>
                      <div className="font-black text-sm text-white mt-0.5">
                        {selectedProduct.name} {selectedProduct.brand ? `(${selectedProduct.brand})` : ''}
                      </div>
                      {selectedProduct.article && (
                        <div className="text-xs text-emerald-200 font-mono mt-0.5">
                          Артикул: {selectedProduct.article}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-emerald-800">
                    <div className="flex-1 relative">
                      <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cellInput}
                        onChange={(e) => setCellInput(e.target.value)}
                        placeholder="Укажите ячейку хранения (например: A-12, Стеллаж 3)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/60 font-mono font-black text-xs text-emerald-300 uppercase outline-none focus:ring-2 focus:ring-emerald-400"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmAssignCell}
                      disabled={!cellInput.trim()}
                      className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
                    >
                      Закрепить в ячейке {cellInput.trim().toUpperCase() || '...'}
                    </button>
                  </div>
                </div>
              )}

              {/* Products List / Grid */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Box className="w-8 h-8 mx-auto text-slate-300" />
                    <div className="text-xs font-bold text-slate-600">
                      Товары не найдены
                    </div>
                    <p className="text-[11px]">
                      Попробуйте изменить поисковый запрос или переключитесь на «Ручной ввод»
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <th className="py-2.5 px-4">Наименование / Бренд</th>
                        <th className="py-2.5 px-4 w-32">Артикул</th>
                        <th className="py-2.5 px-4 w-36">Текущая ячейка</th>
                        <th className="py-2.5 px-4 w-32 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((prod) => {
                        const itemKey = `${prod.article || ''}:::${(prod.name || '').toLowerCase().trim()}`;
                        const currentCell = warehouseLocations[itemKey];

                        return (
                          <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 text-xs">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                {prod.brand && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-bold">
                                    {prod.brand}
                                  </span>
                                )}
                                <span>{prod.category || prod.customCategory || 'Разное'}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                              {prod.article ? (
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                                  {prod.article}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic font-normal">—</span>
                              )}
                            </td>

                            <td className="py-2.5 px-4 font-mono">
                              {currentCell ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300 inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  {currentCell}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-normal italic">
                                  Не назначена
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleSelectProductToAssign(prod)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Выбрать
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL INPUT */}
          {activeTab === 'manual' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Введите характеристики позиций вручную</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Наименование товара *
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="например, Петля Blum Clip Top 110°"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Артикул
                  </label>
                  <input
                    type="text"
                    value={manualArticle}
                    onChange={(e) => setManualArticle(e.target.value)}
                    placeholder="например, 71T3550"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Категория
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Петли и доводчики">Петли и доводчики</option>
                    <option value="Направляющие и ящики">Направляющие и ящики</option>
                    <option value="Подъемные механизмы">Подъемные механизмы</option>
                    <option value="Крепеж и метизы">Крепеж и метизы</option>
                    <option value="Ручки и крючки">Ручки и крючки</option>
                    <option value="Опоры и стяжки">Опоры и стяжки</option>
                    <option value="Разное / Крепеж">Разное / Крепеж</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Ячейка на складе
                  </label>
                  <input
                    type="text"
                    value={manualCell}
                    onChange={(e) => setManualCell(e.target.value)}
                    placeholder="например, A-12, Стеллаж 3"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-black text-xs text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveManualItem}
                  disabled={!manualName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Сохранить номенклатуру
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            Готово / Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

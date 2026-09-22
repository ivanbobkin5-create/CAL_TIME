import React, { useState } from "react";
import { Check, Search, Package, Wrench, Layers, CheckCircle2, AlertCircle, X } from "lucide-react";

export interface BazisHardwareImportItem {
  id: string;
  name: string;
  article?: string;
  rawPartName?: string;
  qty: number;
  unit?: string;
  category?: "hardware" | "fastener" | "worktop" | "other" | string;
  categoryType?: string;
  price?: number;
  selected?: boolean;
  checked?: boolean;
  isFastener?: boolean;
  matchedProduct?: any;
}

interface BazisHardwareImportModalProps {
  data: {
    isOpen: boolean;
    fileName: string;
    items: any[];
    sourceType?: string;
  };
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  catalogProducts?: any[];
}

export const BazisHardwareImportModal: React.FC<BazisHardwareImportModalProps> = ({
  data,
  onClose,
  onConfirm,
}) => {
  const [items, setItems] = useState<BazisHardwareImportItem[]>(() =>
    data.items.map((it: any) => ({
      ...it,
      selected: it.selected !== undefined ? it.selected : (it.checked !== undefined ? it.checked : true),
      category: it.category || (it.isFastener ? "fastener" : "hardware"),
      categoryType: it.categoryType || (it.isFastener ? "Метизы" : "Фурнитура"),
      price: it.price || 0,
      unit: it.unit || "шт",
      article: it.article || "",
      rawPartName: it.rawPartName || it.name,
    }))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateQty = (id: string, qty: number) => {
    const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: validQty } : item))
    );
  };

  const selectAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.article && item.article.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.rawPartName && item.rawPartName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeCategoryFilter === "all") return true;
    if (activeCategoryFilter === "matched") return !!item.matchedProduct;
    if (activeCategoryFilter === "hardware") return item.category === "hardware";
    if (activeCategoryFilter === "fastener") return item.category === "fastener";
    if (activeCategoryFilter === "worktop") return item.category === "worktop";
    return true;
  });

  const selectedCount = items.filter((it) => it.selected).length;
  const matchedCount = items.filter((it) => !!it.matchedProduct).length;
  const hardwareCount = items.filter((it) => it.category === "hardware").length;
  const fastenerCount = items.filter((it) => it.category === "fastener").length;
  const worktopCount = items.filter((it) => itemIsWorktop(it)).length;

  function itemIsWorktop(it: BazisHardwareImportItem) {
    return it.category === "worktop" || it.categoryType === "Столешницы";
  }

  return (
    <div
      id="bazis-hardware-modal-overlay"
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="bazis-hardware-modal-container"
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Импорт фурнитуры и комплектующих</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Файл: <span className="font-semibold text-gray-700">{data.fileName}</span> • Найдено позиций:{" "}
                <span className="font-bold text-amber-700">{items.length}</span>
                {matchedCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-bold">
                    Сопоставлено с каталогом: {matchedCount}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            id="bazis-hardware-modal-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-2xs transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategoryFilter === "all"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Все ({items.length})
            </button>
            {hardwareCount > 0 && (
              <button
                onClick={() => setActiveCategoryFilter("hardware")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategoryFilter === "hardware"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Фурнитура ({hardwareCount})
              </button>
            )}
            {fastenerCount > 0 && (
              <button
                onClick={() => setActiveCategoryFilter("fastener")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategoryFilter === "fastener"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Метизы ({fastenerCount})
              </button>
            )}
            {worktopCount > 0 && (
              <button
                onClick={() => setActiveCategoryFilter("worktop")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategoryFilter === "worktop"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Столешницы ({worktopCount})
              </button>
            )}
            {matchedCount > 0 && (
              <button
                onClick={() => setActiveCategoryFilter("matched")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategoryFilter === "matched"
                    ? "bg-green-600 text-white shadow-xs"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                В каталоге ({matchedCount})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или артикулу..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => selectAll(true)}
              className="text-[11px] font-bold text-amber-700 hover:underline px-2 py-1 whitespace-nowrap cursor-pointer"
            >
              Выбрать все
            </button>
            <button
              onClick={() => selectAll(false)}
              className="text-[11px] font-bold text-gray-500 hover:underline px-2 py-1 whitespace-nowrap cursor-pointer"
            >
              Снять все
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 bg-gray-50/40">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Позиции не найдены
            </div>
          ) : (
            filteredItems.map((item) => {
              const isMatched = !!item.matchedProduct;
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.selected
                      ? "bg-white border-amber-300 shadow-xs"
                      : "bg-gray-100/60 border-gray-200 opacity-60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                      item.selected ? "bg-amber-600 border-amber-600" : "border-gray-300 bg-white"
                    }`}
                  >
                    {item.selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 truncate max-w-[320px] sm:max-w-[450px]">
                        {item.name}
                      </span>
                      {item.article && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono font-medium text-gray-600">
                          арт. {item.article}
                        </span>
                      )}
                      {item.rawPartName && item.rawPartName !== item.name && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-medium text-amber-700">
                          {item.rawPartName}
                        </span>
                      )}
                      {isMatched && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          В каталоге
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                      <span>Категория: {item.categoryType || (item.category === "fastener" ? "Метизы" : "Фурнитура")}</span>
                      {item.price > 0 && <span>Цена: {item.price.toLocaleString()} ₽</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <label className="text-[11px] text-gray-400 font-medium hidden sm:inline">Кол-во:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-gray-600 min-w-[28px]">
                      {item.unit || "шт"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
          <div className="text-xs text-gray-600">
            Выбрано позиций: <span className="font-bold text-gray-900">{selectedCount}</span> из{" "}
            <span className="font-bold text-gray-900">{items.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="bazis-hardware-modal-cancel-btn"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              id="bazis-hardware-modal-confirm-btn"
              disabled={selectedCount === 0}
              onClick={() => {
                const selected = items.filter((it) => it.selected);
                onConfirm(selected);
              }}
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                selectedCount === 0
                  ? "bg-gray-300 shadow-none cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
              }`}
            >
              <Check className="w-4 h-4" />
              Добавить в проект ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from "react";
import { Search, X, Plus, Check, Package, Layers, Tag, DollarSign, Filter } from "lucide-react";

export interface KitItem {
  productId: string | number;
  name: string;
  article?: string;
  category?: string;
  qty: number;
  unit?: string;
  purchasePrice: number;
  price: number;
  image?: string;
  manufacturer?: string;
  brand?: string;
}

interface ProductKitPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: any[];
  currentKitItems: KitItem[];
  onAddProductToKit: (product: any, qty: number) => void;
  excludeProductId?: string | number;
}

export const ProductKitPickerModal: React.FC<ProductKitPickerModalProps> = ({
  isOpen,
  onClose,
  catalogProducts,
  currentKitItems,
  onAddProductToKit,
  excludeProductId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Все");
  const [pickerQuantities, setPickerQuantities] = useState<Record<string, number>>({});

  const existingItemMap = useMemo(() => {
    const map = new Map<string, number>();
    currentKitItems.forEach((it) => {
      map.set(String(it.productId), it.qty);
    });
    return map;
  }, [currentKitItems]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["Все", ...Array.from(cats).sort()];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      if (!p) return false;
      // Do not allow adding self to kit to avoid circular reference
      if (excludeProductId && String(p.id) === String(excludeProductId)) return false;

      // Category filter
      if (selectedCategory !== "Все" && p.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (p.name || "").toLowerCase();
        const art = (p.article || "").toLowerCase();
        const mfg = (p.manufacturer || p.brand || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        if (!name.includes(q) && !art.includes(q) && !mfg.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [catalogProducts, excludeProductId, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-full max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">
                Выбор товаров в комплект
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Выберите товары из каталога и укажите их количество для включения в состав
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск товара по названию, артикулу, бренду..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.slice(0, 15).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-700">Товары не найдены</p>
              <p className="text-xs text-gray-400 mt-1">
                Попробуйте изменить поисковый запрос или выбрать другую категорию
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const pIdStr = String(p.id);
              const alreadyInKitQty = existingItemMap.get(pIdStr) || 0;
              const currentInputQty = pickerQuantities[pIdStr] || 1;
              const imgUrl = p.images?.[0] || p.image || "";
              const purchasePrice = Number(p.purchasePrice || p.price || 0);
              const sellingPrice = Number(p.price || p.purchasePrice || 0);

              return (
                <div
                  key={p.id}
                  className="py-3 px-3 hover:bg-indigo-50/40 rounded-2xl transition-colors flex items-center justify-between gap-4 group"
                >
                  {/* Left: Image and details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {p.name}
                        </span>
                        {p.isKit && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded uppercase">
                            Комплект
                          </span>
                        )}
                        {alreadyInKitQty > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> В комплекте ({alreadyInKitQty} {p.unit || "шт"})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600">
                          {p.category || "Без категории"}
                        </span>
                        {p.article && (
                          <span className="text-[11px] text-gray-400">
                            Арт: <strong className="text-gray-600">{p.article}</strong>
                          </span>
                        )}
                        {p.manufacturer && (
                          <span className="text-[11px] text-gray-400">
                            • {p.manufacturer}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Prices */}
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <span className="text-sm font-black text-gray-900">
                      {sellingPrice.toLocaleString("ru-RU")} ₽
                    </span>
                    <span className="text-[10px] text-gray-400">
                      закуп: {purchasePrice.toLocaleString("ru-RU")} ₽ / {p.unit || "шт"}
                    </span>
                  </div>

                  {/* Right: Quantity and Add Button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center border border-gray-200 rounded-xl bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() =>
                          setPickerQuantities((prev) => ({
                            ...prev,
                            [pIdStr]: Math.max(1, (prev[pIdStr] || 1) - 1),
                          }))
                        }
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={currentInputQty}
                        onChange={(e) => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setPickerQuantities((prev) => ({ ...prev, [pIdStr]: v }));
                        }}
                        className="w-9 text-center text-xs font-black text-gray-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPickerQuantities((prev) => ({
                            ...prev,
                            [pIdStr]: (prev[pIdStr] || 1) + 1,
                          }))
                        }
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddProductToKit(p, currentInputQty);
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-100 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{alreadyInKitQty > 0 ? "Добавить еще" : "В комплект"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-medium">
            Всего позиций в комплекте: <strong className="text-indigo-600 font-black">{currentKitItems.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

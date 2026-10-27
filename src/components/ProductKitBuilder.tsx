import React, { useState, useEffect, useMemo } from "react";
import { Layers, Plus, Trash2, Package, Sparkles, DollarSign, Calculator, RefreshCw, AlertCircle, Percent } from "lucide-react";
import { ProductKitPickerModal, KitItem } from "./ProductKitPickerModal";

interface ProductKitBuilderProps {
  isKit: boolean;
  onToggleIsKit: (isKit: boolean) => void;
  kitItems: KitItem[];
  onChangeKitItems: (items: KitItem[]) => void;
  catalogProducts: any[];
  excludeProductId?: string | number;
  autoSyncPrices: boolean;
  onToggleAutoSyncPrices: (autoSync: boolean) => void;
  onUpdatePrices: (purchasePrice: number, price: number) => void;
  currentPurchasePrice?: number;
  currentPrice?: number;
}

export const ProductKitBuilder: React.FC<ProductKitBuilderProps> = ({
  isKit,
  onToggleIsKit,
  kitItems = [],
  onChangeKitItems,
  catalogProducts = [],
  excludeProductId,
  autoSyncPrices = true,
  onToggleAutoSyncPrices,
  onUpdatePrices,
  currentPurchasePrice = 0,
  currentPrice = 0,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [kitDiscountPercent, setKitDiscountPercent] = useState<number>(0);

  // Calculate totals
  const kitTotals = useMemo(() => {
    let totalPurchase = 0;
    let totalSelling = 0;
    let totalQuantity = 0;

    kitItems.forEach((item) => {
      const q = Math.max(1, Number(item.qty) || 1);
      const pur = Number(item.purchasePrice || 0);
      const sel = Number(item.price || item.purchasePrice || 0);

      totalPurchase += pur * q;
      totalSelling += sel * q;
      totalQuantity += q;
    });

    const discountMultiplier = kitDiscountPercent > 0 ? (1 - kitDiscountPercent / 100) : 1;
    const discountedSelling = Math.round(totalSelling * discountMultiplier);

    return {
      totalPurchase: Math.round(totalPurchase),
      totalSelling: Math.round(totalSelling),
      discountedSelling,
      totalQuantity,
      positionsCount: kitItems.length,
    };
  }, [kitItems, kitDiscountPercent]);

  // Synchronize prices when autoSyncPrices is enabled or kit items change
  useEffect(() => {
    if (isKit && autoSyncPrices && kitItems.length > 0) {
      if (
        kitTotals.totalPurchase !== currentPurchasePrice ||
        kitTotals.discountedSelling !== currentPrice
      ) {
        onUpdatePrices(kitTotals.totalPurchase, kitTotals.discountedSelling);
      }
    }
  }, [isKit, autoSyncPrices, kitTotals, currentPurchasePrice, currentPrice, onUpdatePrices, kitItems.length]);

  const handleAddProductToKit = (product: any, qty: number = 1) => {
    const pIdStr = String(product.id);
    const existingIndex = kitItems.findIndex((it) => String(it.productId) === pIdStr);

    if (existingIndex >= 0) {
      const updated = [...kitItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: updated[existingIndex].qty + qty,
      };
      onChangeKitItems(updated);
    } else {
      const newItem: KitItem = {
        productId: product.id,
        name: product.name || "Товар",
        article: product.article || product.manufacturerArticle || "",
        category: product.category || "",
        qty: Math.max(1, qty),
        unit: product.unit || "шт",
        purchasePrice: Number(product.purchasePrice || product.price || 0),
        price: Number(product.price || product.purchasePrice || 0),
        image: product.images?.[0] || product.image || "",
        manufacturer: product.manufacturer || product.brand || "",
      };
      onChangeKitItems([...kitItems, newItem]);
    }
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const val = Math.max(1, newQty);
    const updated = [...kitItems];
    updated[index] = { ...updated[index], qty: val };
    onChangeKitItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = kitItems.filter((_, i) => i !== index);
    onChangeKitItems(updated);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-pink-50/30 border border-indigo-100 rounded-3xl p-6 space-y-6 shadow-sm">
      {/* Header with Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-gray-900 tracking-tight">
                Комплект товаров (набор)
              </h4>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-full tracking-wider">
                Составной товар
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Создайте единый товар из двух или более позиций каталога с автоматическим расчетом цены
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer select-none self-start sm:self-auto">
          <input
            type="checkbox"
            checked={isKit}
            onChange={(e) => onToggleIsKit(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-xs font-bold text-gray-700">
            {isKit ? "Это комплект" : "Обычный товар"}
          </span>
        </label>
      </div>

      {/* Kit Configuration Body */}
      {isKit && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                Состав комплекта:
              </span>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg border border-indigo-100">
                {kitItems.length} поз. ({kitTotals.totalQuantity} шт.)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить товар в комплект</span>
              </button>
            </div>
          </div>

          {/* Kit Items Table / List */}
          {kitItems.length === 0 ? (
            <div className="p-10 bg-white/60 border-2 border-dashed border-indigo-200/80 rounded-2xl text-center space-y-3">
              <Package className="w-12 h-12 text-indigo-300 mx-auto" />
              <div>
                <h5 className="text-sm font-bold text-gray-800">
                  В комплекте пока нет товаров
                </h5>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Нажмите кнопку ниже, чтобы выбрать 2 или более товаров из вашего каталога (петли, направляющие, ручки, крепеж и т.д.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Выбрать товары из каталога
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-indigo-100/80 overflow-hidden shadow-sm divide-y divide-gray-100">
                {kitItems.map((item, idx) => {
                  const linePurchase = (Number(item.purchasePrice) || 0) * (Number(item.qty) || 1);
                  const lineSelling = (Number(item.price) || Number(item.purchasePrice) || 0) * (Number(item.qty) || 1);

                  return (
                    <div
                      key={String(item.productId) + "_" + idx}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-indigo-50/30 transition-colors"
                    >
                      {/* Item info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-gray-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-gray-900 block truncate">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600">
                              {item.category || "Товар"}
                            </span>
                            {item.article && (
                              <span className="text-gray-400">
                                Арт: <strong className="text-gray-600">{item.article}</strong>
                              </span>
                            )}
                            {item.manufacturer && (
                              <span className="text-gray-400">
                                • {item.manufacturer}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.qty - 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateItemQty(idx, parseInt(e.target.value) || 1)
                            }
                            className="w-10 text-center text-xs font-black text-gray-800 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.qty + 1)}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">
                          {item.unit || "шт"}
                        </span>
                      </div>

                      {/* Line Prices */}
                      <div className="text-right flex flex-col items-end flex-shrink-0 w-28">
                        <span className="text-xs font-black text-gray-900">
                          {lineSelling.toLocaleString("ru-RU")} ₽
                        </span>
                        <span className="text-[10px] text-gray-400">
                          закуп: {linePurchase.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                        title="Удалить из комплекта"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Summary and Price Synchronization Card */}
              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                      Себестоимость состава
                    </span>
                    <span className="text-lg font-black text-gray-900">
                      {kitTotals.totalPurchase.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block">
                      Сумма розницы компонентов
                    </span>
                    <span className="text-lg font-black text-indigo-950">
                      {kitTotals.totalSelling.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                      Итоговая цена комплекта
                    </span>
                    <span className="text-lg font-black text-emerald-900">
                      {kitTotals.discountedSelling.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoSyncPrices}
                      onChange={(e) => onToggleAutoSyncPrices(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-700">
                      Автоматически синхронизировать цену товара со стоимостью комплекта
                    </span>
                  </label>

                  {!autoSyncPrices && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePrices(kitTotals.totalPurchase, kitTotals.discountedSelling)
                      }
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Применить сумму комплекта</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Kit Picker Modal */}
      <ProductKitPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalogProducts={catalogProducts}
        currentKitItems={kitItems}
        onAddProductToKit={handleAddProductToKit}
        excludeProductId={excludeProductId}
      />
    </div>
  );
};

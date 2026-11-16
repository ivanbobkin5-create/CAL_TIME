import React, { useState, useEffect } from "react";
import { Lock, Calendar, X, AlertTriangle, CheckCircle2, Unlock } from "lucide-react";

export const isSaleBlocked = (product: any): boolean => {
  if (!product || !product.saleBlocked) return false;
  if (product.saleBlockedUntil) {
    const today = new Date().toISOString().split("T")[0];
    if (product.saleBlockedUntil <= today) {
      return false; // Автоматически разблокировано, так как срок истёк
    }
  }
  return true;
};

export const formatBlockedUntil = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

interface BlockSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSave: (
    productId: string | number,
    updates: {
      saleBlocked: boolean;
      saleBlockedUntil?: string | null;
      saleBlockedReason?: string | null;
    }
  ) => void;
}

export const BlockSaleModal: React.FC<BlockSaleModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  if (!isOpen || !product) return null;

  const currentlyBlocked = isSaleBlocked(product);

  const [blockMode, setBlockMode] = useState<"indefinite" | "until_date">(
    product?.saleBlockedUntil ? "until_date" : "indefinite"
  );
  const [saleBlockedUntil, setSaleBlockedUntil] = useState<string>(
    product?.saleBlockedUntil || ""
  );
  const [saleBlockedReason, setSaleBlockedReason] = useState<string>(
    product?.saleBlockedReason || ""
  );

  useEffect(() => {
    if (product) {
      setBlockMode(product.saleBlockedUntil ? "until_date" : "indefinite");
      setSaleBlockedUntil(product.saleBlockedUntil || "");
      setSaleBlockedReason(product.saleBlockedReason || "");
    }
  }, [product]);

  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setSaleBlockedUntil(d.toISOString().split("T")[0]);
    setBlockMode("until_date");
  };

  const setEndOfMonth = () => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setSaleBlockedUntil(lastDay.toISOString().split("T")[0]);
    setBlockMode("until_date");
  };

  const handleApplyBlock = () => {
    const updates = {
      saleBlocked: true,
      saleBlockedUntil: blockMode === "until_date" ? (saleBlockedUntil || null) : null,
      saleBlockedReason: saleBlockedReason.trim() || null,
    };
    onSave(product.id, updates);
    onClose();
  };

  const handleUnblock = () => {
    const updates = {
      saleBlocked: false,
      saleBlockedUntil: null,
      saleBlockedReason: null,
    };
    onSave(product.id, updates);
    onClose();
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Блокировка продаж</h3>
              <p className="text-xs text-amber-100 font-medium">Настройка ограничений заказа для товара</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Brief Info */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center gap-3">
            {product.imageUrl || product.image ? (
              <img
                src={product.imageUrl || product.image}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h4>
              <p className="text-xs text-gray-500 truncate">
                {product.article ? `Арт: ${product.article}` : `Категория: ${product.category || "Без категории"}`}
              </p>
            </div>
          </div>

          {/* Current Status */}
          {currentlyBlocked ? (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Продажа сейчас ЗАБЛОКИРОВАНА</p>
                {product.saleBlockedUntil ? (
                  <p>
                    Действует до:{" "}
                    <span className="font-bold text-amber-900">
                      {formatBlockedUntil(product.saleBlockedUntil)}
                    </span>
                  </p>
                ) : (
                  <p>Режим: Бессрочная блокировка</p>
                )}
                {product.saleBlockedReason && (
                  <p className="text-amber-800 italic">Причина: «{product.saleBlockedReason}»</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Товар сейчас доступен для продажи без ограничений</span>
            </div>
          )}

          {/* Blocking Options */}
          <div className="space-y-4 pt-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Режим блокировки
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBlockMode("indefinite")}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex items-center gap-2 ${
                  blockMode === "indefinite"
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-bold">Бессрочно</div>
                  <div className="text-[10px] text-gray-500 font-normal">До ручного снятия</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBlockMode("until_date")}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex items-center gap-2 ${
                  blockMode === "until_date"
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Calendar className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-bold">До даты</div>
                  <div className="text-[10px] text-gray-500 font-normal">Авто-разблокировка</div>
                </div>
              </button>
            </div>

            {/* Date selection if until_date */}
            {blockMode === "until_date" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200/80 animate-in fade-in duration-150">
                <label className="block text-xs font-medium text-gray-700">
                  Заблокировать до указанной даты (включительно):
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={saleBlockedUntil}
                  onChange={(e) => setSaleBlockedUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />

                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500 font-medium">Быстрый выбор срока:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => addDays(3)}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-md font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      +3 дня
                    </button>
                    <button
                      type="button"
                      onClick={() => addDays(7)}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-md font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      +7 дней
                    </button>
                    <button
                      type="button"
                      onClick={() => addDays(14)}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-md font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      +14 дней
                    </button>
                    <button
                      type="button"
                      onClick={() => addDays(30)}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-md font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      +30 дней
                    </button>
                    <button
                      type="button"
                      onClick={setEndOfMonth}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-md font-medium text-gray-700 transition-all cursor-pointer"
                    >
                      Конец месяца
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reason input */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Причина блокировки / Примечание (опционально):
              </label>
              <input
                type="text"
                placeholder="Например: Нет в наличии у поставщика до новой поставки"
                value={saleBlockedReason}
                onChange={(e) => setSaleBlockedReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          {currentlyBlocked ? (
            <button
              type="button"
              onClick={handleUnblock}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Разблокировать сейчас</span>
            </button>
          ) : (
            <span className="text-xs text-gray-500 font-medium">Выберите условия</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApplyBlock}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Сохранить блокировку</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

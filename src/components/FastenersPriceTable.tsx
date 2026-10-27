import React, { useState, useMemo } from "react";
import { Plus, Trash2, Search, Wrench, Sparkles, Check, HelpCircle, Layers } from "lucide-react";
import { cn } from "../lib/utils";

export interface FastenersPriceTableProps {
  catalogProducts: any[];
  onSaveProduct?: (product: any) => Promise<void> | void;
  onDeleteProduct?: (productId: string | number) => Promise<void> | void;
  canEdit: boolean;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

// Preset standard furniture fasteners with built-in matching synonyms
const STANDARD_FASTENERS_PRESETS = [
  {
    name: "Конфирмат 7х50",
    article: "CONF-750",
    matchingArticles: "00-00101, КНФ-750, BAZ-CONF",
    matchingNames: "Евровинт, Евровинт 7х50, Конфирмат, Винт мебельный 7х50, Винт конфирматный",
    purchasePrice: 2.5,
    price: 5.0,
    unit: "шт",
  },
  {
    name: "Эксцентриковая стяжка (Rastex / Minifix 15)",
    article: "EXC-15",
    matchingArticles: "00-00102, МФ-15, VB-35",
    matchingNames: "Минификс, Растекс, Эксцентрик, Эксцентрик 15, Стяжка эксцентриковая, Minifix",
    purchasePrice: 15.0,
    price: 25.0,
    unit: "шт",
  },
  {
    name: "Шток эксцентрика",
    article: "EXC-PIN",
    matchingArticles: "00-00103, ШТ-ЭКС",
    matchingNames: "Шток, Дюбель эксцентрика, Шток стяжки, Шток минификса",
    purchasePrice: 8.0,
    price: 15.0,
    unit: "шт",
  },
  {
    name: "Шкант деревянный 8х30",
    article: "SHK-830",
    matchingArticles: "00-00104, ШК-830",
    matchingNames: "Шкант, Шкант 8х30, Шкант 8*30, Шкант буковый",
    purchasePrice: 1.2,
    price: 3.0,
    unit: "шт",
  },
  {
    name: "Саморез 3.5х16",
    article: "SCR-3516",
    matchingArticles: "00-00105, СМ-3516",
    matchingNames: "Саморез 3.5х16, Саморез 3,5х16, Шуруп 3.5х16, Саморез 3.5*16",
    purchasePrice: 0.8,
    price: 2.0,
    unit: "шт",
  },
  {
    name: "Саморез 4х30",
    article: "SCR-4030",
    matchingArticles: "00-00106, СМ-4030",
    matchingNames: "Саморез 4х30, Саморез 4,0х30, Шуруп 4х30, Саморез 4*30",
    purchasePrice: 1.5,
    price: 3.5,
    unit: "шт",
  },
  {
    name: "Полкодержатель врезной D5",
    article: "POLK-D5",
    matchingArticles: "00-00107, ПЛК-5",
    matchingNames: "Полкодержатель, Полкодержатель D5, Полкодержатель 5мм, Полкодержатель цилиндрический",
    purchasePrice: 3.0,
    price: 6.0,
    unit: "шт",
  },
  {
    name: "Опора регулируемая М8",
    article: "LEG-M8",
    matchingArticles: "00-00108, ОП-М8",
    matchingNames: "Опора М8, Ножка М8, Винт регулировочный М8, Опора регулировочная М8",
    purchasePrice: 20.0,
    price: 35.0,
    unit: "шт",
  },
];

export const FastenersPriceTable: React.FC<FastenersPriceTableProps> = ({
  catalogProducts = [],
  onSaveProduct,
  onDeleteProduct,
  canEdit,
  showAlert,
  showConfirm,
}) => {
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter fasteners in catalog (category === "Метизы")
  const fasteners = useMemo(() => {
    return catalogProducts.filter((p) => p.category === "Метизы");
  }, [catalogProducts]);

  const filteredFasteners = useMemo(() => {
    if (!search.trim()) return fasteners;
    const q = search.toLowerCase().trim();
    return fasteners.filter((f) => {
      const name = String(f.name || "").toLowerCase();
      const art = String(f.article || "").toLowerCase();
      const matchArts = String(f.matchingArticles || f.accountingSkus || "").toLowerCase();
      const matchNames = String(f.matchingNames || f.synonyms || "").toLowerCase();
      return (
        name.includes(q) ||
        art.includes(q) ||
        matchArts.includes(q) ||
        matchNames.includes(q)
      );
    });
  }, [fasteners, search]);

  const handleCreateFastener = async () => {
    if (!onSaveProduct) {
      showAlert("Внимание", "Функция сохранения товаров недоступна");
      return;
    }
    const newId = `metiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newFastener = {
      id: newId,
      category: "Метизы",
      name: "Новый метиз",
      article: `MET-${Math.floor(100 + Math.random() * 900)}`,
      matchingArticles: "",
      matchingNames: "",
      purchasePrice: 0,
      price: 0,
      unit: "шт",
      brand: "Метизы",
      type: "Метиз",
      updatedAt: new Date().toISOString(),
      status: "approved",
    };
    setSavingId(newId);
    try {
      await onSaveProduct(newFastener);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const handleFillStandardPresets = () => {
    if (!onSaveProduct) return;
    showConfirm(
      "Заполнить типовые метизы",
      "Добавить стандартные мебельные метизы (Конфирматы, Эксцентрики, Шканты, Саморезы, Полкодержатели) с уже настроенными синонимами для распознавания из Базис/1С?",
      async () => {
        try {
          const existingNames = new Set(fasteners.map((f) => String(f.name || "").toLowerCase().trim()));
          let addedCount = 0;

          for (const preset of STANDARD_FASTENERS_PRESETS) {
            if (!existingNames.has(preset.name.toLowerCase().trim())) {
              const newId = `metiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const item = {
                id: newId,
                category: "Метизы",
                name: preset.name,
                article: preset.article,
                matchingArticles: preset.matchingArticles,
                matchingNames: preset.matchingNames,
                purchasePrice: preset.purchasePrice,
                price: preset.price,
                unit: preset.unit,
                brand: "Метизы",
                type: "Метиз",
                updatedAt: new Date().toISOString(),
                status: "approved",
              };
              await onSaveProduct(item);
              addedCount++;
            }
          }

          if (addedCount > 0) {
            showAlert("Готово", `Успешно добавлено типовых метизов: ${addedCount}`);
          } else {
            showAlert("Информация", "Все типовые метизы уже присутствуют в прайс-листе.");
          }
        } catch (err: any) {
          showAlert("Ошибка", "Не удалось добавить метизы: " + (err.message || String(err)));
        }
      }
    );
  };

  const handleUpdateField = async (fastener: any, field: string, value: any) => {
    if (!onSaveProduct) return;
    const updated = {
      ...fastener,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    setSavingId(fastener.id);
    try {
      await onSaveProduct(updated);
    } catch (err) {
      console.error("Error updating fastener field:", err);
    } finally {
      setTimeout(() => setSavingId(null), 300);
    }
  };

  const handleDeleteFastener = (fastener: any) => {
    if (!onDeleteProduct) return;
    showConfirm(
      "Удалить метиз",
      `Вы действительно хотите удалить метиз "${fastener.name}"?`,
      async () => {
        try {
          await onDeleteProduct(fastener.id);
        } catch (err: any) {
          showAlert("Ошибка", "Не удалось удалить метиз: " + err.message);
        }
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100/80">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-bold text-gray-800 text-base">Таблица метизов и крепежа</h5>
              <span className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                {fasteners.length} поз.
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Управляйте ценами закупки, артикулами и синонимами для автоматического распознавания метизов из отчетов Базис/1С
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFillStandardPresets}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Заполнить типовые метизы</span>
            </button>

            <button
              type="button"
              onClick={handleCreateFastener}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить метиз</span>
            </button>
          </div>
        )}
      </div>

      {/* Info Hint Banner */}
      <div className="flex items-start gap-2.5 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-900">
        <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p>
            <strong>Как работает распознавание:</strong> укажите в колонке <em>«Артикулы сопоставления (Базис/1С)»</em> артикулы через запятую (например, <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">00-0012, БАЗ-105</code>) и в колонке <em>«Сопоставление по наименованию (синонимы)»</em> синонимы (например, <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">Евровинт, Конфирмат 7х50</code>).
          </p>
          <p className="text-amber-800/80 text-[11px]">
            При импорте спецификации Базис система автоматически сопоставит метиз с карточкой в прайс-листе и подставит установленную цену закупки!
          </p>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию, артикулу или синониму..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>
      </div>

      {/* Editable Table */}
      <div className="overflow-x-auto border border-gray-200/80 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-3.5 w-60">Наименование метиза</th>
              <th className="py-3 px-3 w-36">Артикул</th>
              <th className="py-3 px-3 min-w-[200px]">Артикулы сопоставления (Базис/1С)</th>
              <th className="py-3 px-3 min-w-[220px]">Сопоставление по наименованию (синонимы)</th>
              <th className="py-3 px-3 w-32 text-right">Закупка (₽)</th>
              <th className="py-3 px-3 w-32 text-right">Продажа (₽)</th>
              <th className="py-3 px-3 w-24 text-center">Ед. изм.</th>
              {canEdit && <th className="py-3 px-3 w-16 text-center">Действия</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
            {filteredFasteners.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="py-10 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Wrench className="w-8 h-8 text-gray-300" />
                    <span className="font-semibold text-gray-500">Метизы не найдены</span>
                    <span className="text-[11px] text-gray-400">
                      {fasteners.length === 0
                        ? 'Нажмите «Заполнить типовые метизы» или «Добавить метиз», чтобы наполнить прайс-лист'
                        : 'По вашему поисковому запросу ничего не найдено'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFasteners.map((item) => {
                const isItemSaving = savingId === item.id;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-2.5 px-3.5">
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={item.name || ""}
                        onBlur={(e) => {
                          if (e.target.value !== item.name) {
                            handleUpdateField(item, "name", e.target.value);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-transparent hover:border-gray-200 focus:border-amber-500 rounded-lg text-xs font-bold text-gray-900 outline-none bg-transparent focus:bg-white transition-all"
                        placeholder="Название метиза..."
                      />
                    </td>

                    {/* Internal Article */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={item.article || ""}
                        onBlur={(e) => {
                          if (e.target.value !== item.article) {
                            handleUpdateField(item, "article", e.target.value);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-transparent hover:border-gray-200 focus:border-amber-500 rounded-lg text-xs font-mono font-medium text-gray-700 outline-none bg-transparent focus:bg-white transition-all"
                        placeholder="Артикул..."
                      />
                    </td>

                    {/* Matching Articles (Bazis / 1C) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={item.matchingArticles || (Array.isArray(item.accountingSkus) ? item.accountingSkus.join(", ") : item.accountingSkus || "")}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const currentVal = item.matchingArticles || (Array.isArray(item.accountingSkus) ? item.accountingSkus.join(", ") : item.accountingSkus || "");
                          if (val !== currentVal) {
                            handleUpdateField(item, "matchingArticles", val);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-transparent hover:border-amber-200 focus:border-amber-500 rounded-lg text-xs font-medium text-amber-900 outline-none bg-amber-50/20 focus:bg-white transition-all"
                        placeholder="Напр: 00-124, БАЗ-750..."
                        title="Укажите артикулы из Базис/1С через запятую"
                      />
                    </td>

                    {/* Matching Names / Synonyms */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={item.matchingNames || (Array.isArray(item.synonyms) ? item.synonyms.join(", ") : item.synonyms || "")}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const currentVal = item.matchingNames || (Array.isArray(item.synonyms) ? item.synonyms.join(", ") : item.synonyms || "");
                          if (val !== currentVal) {
                            handleUpdateField(item, "matchingNames", val);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-transparent hover:border-blue-200 focus:border-blue-500 rounded-lg text-xs font-medium text-blue-900 outline-none bg-blue-50/20 focus:bg-white transition-all"
                        placeholder="Напр: Евровинт, Винт мебельный..."
                        title="Укажите синонимы наименования через запятую"
                      />
                    </td>

                    {/* Purchase Price */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative inline-flex items-center justify-end w-28">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={!canEdit}
                          defaultValue={item.purchasePrice !== undefined ? item.purchasePrice : item.price || 0}
                          onBlur={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            if (p !== (item.purchasePrice || 0)) {
                              handleUpdateField(item, "purchasePrice", p);
                            }
                          }}
                          className="w-full text-right pr-6 pl-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-amber-500 rounded-lg text-xs font-bold text-amber-800 outline-none bg-transparent focus:bg-white transition-all"
                        />
                        <span className="absolute right-2 text-[11px] font-bold text-gray-400 pointer-events-none">
                          ₽
                        </span>
                      </div>
                    </td>

                    {/* Selling / Retail Price */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative inline-flex items-center justify-end w-28">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          disabled={!canEdit}
                          defaultValue={item.price || 0}
                          onBlur={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            if (p !== (item.price || 0)) {
                              handleUpdateField(item, "price", p);
                            }
                          }}
                          className="w-full text-right pr-6 pl-2 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-xs font-bold text-blue-800 outline-none bg-transparent focus:bg-white transition-all"
                        />
                        <span className="absolute right-2 text-[11px] font-bold text-gray-400 pointer-events-none">
                          ₽
                        </span>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={item.unit || "шт"}
                        onBlur={(e) => {
                          const u = e.target.value.trim() || "шт";
                          if (u !== item.unit) {
                            handleUpdateField(item, "unit", u);
                          }
                        }}
                        className="w-16 text-center px-1.5 py-1 border border-transparent hover:border-gray-200 focus:border-gray-400 rounded-md text-[11px] font-bold text-gray-600 outline-none bg-gray-50 focus:bg-white transition-all"
                      />
                    </td>

                    {/* Delete Action */}
                    {canEdit && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteFastener(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Удалить метиз"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Calendar, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  HandCoins, 
  Layers, 
  TrendingUp, 
  Truck,
  Building2,
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Supplier } from '../../types';

export const CATEGORIES = [
  "Фасады заказные",
  "Фасады пильные",
  "ЛДСП/Кромка/ХФД",
  "Фурнитура",
  "Зеркала/Двери/Стекла",
  "Столешницы и стеновые",
  "Столешницы и стеновые камень/компактплиты"
];

interface ProcurementItem {
  id: string;
  status: string;
  actualAmount: number;
  supplierId?: string;
  invoiceNumber?: string;
  arrivalDate?: string;
  isCredit?: boolean;
  receivedQty?: number;
  qty?: number;
  updatedAt?: string;
}

interface CategoryStatus {
  amount: number; // budget
  status: string;
  actualAmount: number;
  items: ProcurementItem[];
  updatedAt?: string;
}

interface B24DealProcurementViewProps {
  dealId: number | string;
  dealTitle?: string;
  companyData: any;
  suppliers: Supplier[];
  db: any;
  doc: any;
  setDoc: any;
  updateDoc: any;
  onSnapshot: any;
}

export const B24DealProcurementView: React.FC<B24DealProcurementViewProps> = ({
  dealId,
  dealTitle = 'Сделка',
  companyData,
  suppliers = [],
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot
}) => {
  const orderId = `b24_${dealId}`;
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    [CATEGORIES[0]]: true,
    [CATEGORIES[1]]: true,
    [CATEGORIES[2]]: true,
    [CATEGORIES[3]]: true,
    [CATEGORIES[4]]: true,
    [CATEGORIES[5]]: true,
    [CATEGORIES[6]]: true,
  });

  // 1. Listen in real-time to the deal's procurement document in Firestore
  useEffect(() => {
    if (!companyData?.id || !dealId) return;

    const docRef = doc(db, 'companies', companyData.id, 'projectSets', orderId);
    const unsub = onSnapshot(docRef, (snap: any) => {
      if (snap.exists()) {
        setOrderData({ id: snap.id, ...snap.data() });
      } else {
        setOrderData(null);
      }
      setLoading(false);
    }, (err: any) => {
      console.warn("Error listening to deal procurement doc:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [companyData?.id, dealId, db, doc, onSnapshot, orderId]);

  // 2. Fetch fresh deal budget fields directly from Bitrix24
  const syncWithBitrix24 = async () => {
    if (!companyData?.bitrix24?.webhookUrl || !dealId) {
      alert("Не указан вебхук Битрикс24 в настройках компании.");
      return;
    }

    setIsSyncing(true);
    try {
      const mappings = companyData.bitrix24.fieldMappings || {};
      const categoryMapping: Record<string, string> = {
        "Фасады заказные": mappings.expenseCustomFacades,
        "Фасады пильные": mappings.expenseFacades,
        "ЛДСП/Кромка/ХФД": mappings.expenseLDSP,
        "Фурнитура": mappings.expenseHardware,
        "Зеркала/Двери/Стекла": mappings.expenseMirrors,
        "Столешницы и стеновые": mappings.expenseCountertops,
        "Столешницы и стеновые камень/компактплиты": mappings.expenseStoneCountertops,
      };

      const selectFields = [
        "ID", "TITLE", "STAGE_ID", "CLOSEDATE", "BEGINDATE",
        ...(Object.values(mappings).filter(Boolean) as string[])
      ];

      const res = await fetch("/api/bitrix24/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: companyData.bitrix24.webhookUrl,
          method: "crm.deal.get",
          params: { id: dealId }
        })
      });

      const data = await res.json();
      const deal = data.result;
      if (!deal) {
        throw new Error("Сделка не найдена в Битрикс24.");
      }

      // Read readyDate
      let readyDateValue = '';
      if (mappings.readyDate && deal[mappings.readyDate]) {
        readyDateValue = deal[mappings.readyDate];
      } else {
        readyDateValue = deal.CLOSEDATE || deal.BEGINDATE || '';
      }

      const existingProcStatus = orderData?.procurementStatus || {};
      const newProcStatus: Record<string, CategoryStatus> = {};

      CATEGORIES.forEach(cat => {
        const b24Field = categoryMapping[cat];
        const budgetAmount = b24Field && deal[b24Field] ? Math.floor(Number(deal[b24Field]) || 0) : (existingProcStatus[cat]?.amount || 0);
        const existingCat = existingProcStatus[cat] || {};
        const items = existingCat.items || [];
        const totalActual = items.reduce((sum: number, i: any) => sum + (Number(i.actualAmount) || 0), 0);

        let primaryStatus = existingCat.status || 'Не заказано';
        if (items.length > 0) {
          const hasOrdered = items.some((i: any) => i.status === 'Заказано');
          const hasReceived = items.every((i: any) => i.status === 'Поступило' || i.status === 'Нет в проекте');
          if (hasReceived) primaryStatus = 'Поступило';
          else if (hasOrdered) primaryStatus = 'Заказано';
        }

        newProcStatus[cat] = {
          amount: budgetAmount,
          items: items,
          status: primaryStatus,
          actualAmount: totalActual,
          updatedAt: existingCat.updatedAt || new Date().toISOString()
        };
      });

      const docRef = doc(db, 'companies', companyData.id, 'projectSets', orderId);
      await setDoc(docRef, {
        name: deal.TITLE || dealTitle,
        readyDate: readyDateValue,
        b24DealId: deal.ID,
        b24DealStageId: deal.STAGE_ID,
        procurementStatus: newProcStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (e: any) {
      console.error("Deal procurement sync error:", e);
      alert(e.message || "Ошибка обновления сделки из Битрикс24");
    } finally {
      setIsSyncing(false);
    }
  };

  // If document doesn't exist yet, auto-sync it on first load
  useEffect(() => {
    if (!loading && !orderData && companyData?.bitrix24?.webhookUrl && dealId) {
      syncWithBitrix24();
    }
  }, [loading, orderData, companyData?.bitrix24?.webhookUrl, dealId]);

  // 3. Helper to update a category in Firestore
  const updateCategoryData = async (category: string, newItems: ProcurementItem[], newBudget?: number) => {
    if (!companyData?.id) return;

    const currentProc = orderData?.procurementStatus || {};
    const catData = currentProc[category] || { amount: 0, items: [] };
    const budgetAmount = newBudget !== undefined ? newBudget : (catData.amount || 0);

    const actualTotal = newItems.reduce((sum, i) => sum + (Number(i.actualAmount) || 0), 0);
    const hasOrdered = newItems.some(i => i.status === 'Заказано');
    const hasReceived = newItems.length > 0 && newItems.every(i => i.status === 'Поступило' || i.status === 'Нет в проекте');
    const hasNotInProject = newItems.some(i => i.status === 'Нет в проекте');

    let primaryStatus = 'Не заказано';
    if (hasReceived) primaryStatus = 'Поступило';
    else if (hasOrdered) primaryStatus = 'Заказано';
    else if (hasNotInProject && newItems.length === 1) primaryStatus = 'Нет в проекте';
    else if (newItems.length > 0) primaryStatus = newItems[0].status;

    const updatedCat: CategoryStatus = {
      amount: budgetAmount,
      items: newItems,
      status: primaryStatus,
      actualAmount: actualTotal,
      updatedAt: new Date().toISOString()
    };

    const updatedProcStatus = {
      ...currentProc,
      [category]: updatedCat
    };

    // Optimistic local update
    setOrderData((prev: any) => ({
      ...(prev || {}),
      id: orderId,
      name: prev?.name || dealTitle,
      b24DealId: dealId,
      procurementStatus: updatedProcStatus
    }));

    const docRef = doc(db, 'companies', companyData.id, 'projectSets', orderId);
    await setDoc(docRef, {
      name: orderData?.name || dealTitle,
      b24DealId: dealId,
      procurementStatus: updatedProcStatus,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  // Add item
  const handleAddItem = (category: string) => {
    const catData = orderData?.procurementStatus?.[category] || { items: [] };
    const currentItems: ProcurementItem[] = catData.items || [];
    const newItem: ProcurementItem = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'Заказано',
      actualAmount: 0,
      supplierId: suppliers[0]?.id || '',
      invoiceNumber: '',
      arrivalDate: '',
      isCredit: false,
      updatedAt: new Date().toISOString()
    };
    updateCategoryData(category, [...currentItems, newItem]);
  };

  // Update item field
  const handleUpdateItem = (category: string, itemIndex: number, field: keyof ProcurementItem, value: any) => {
    const catData = orderData?.procurementStatus?.[category] || { items: [] };
    const items: ProcurementItem[] = [...(catData.items || [])];
    if (!items[itemIndex]) return;

    items[itemIndex] = {
      ...items[itemIndex],
      [field]: value,
      updatedAt: new Date().toISOString()
    };

    updateCategoryData(category, items);
  };

  // Remove item
  const handleRemoveItem = (category: string, itemIndex: number) => {
    const catData = orderData?.procurementStatus?.[category] || { items: [] };
    const items = (catData.items || []).filter((_: any, idx: number) => idx !== itemIndex);
    updateCategoryData(category, items);
  };

  // Change category budget manually
  const handleChangeBudget = (category: string, amount: number) => {
    const catData = orderData?.procurementStatus?.[category] || { items: [] };
    updateCategoryData(category, catData.items || [], amount);
  };

  // Overall statistics
  const stats = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;
    let categoriesInProject = 0;
    let categoriesPurchased = 0;
    let categoriesReceived = 0;

    const status = orderData?.procurementStatus || {};
    CATEGORIES.forEach(cat => {
      const data = status[cat] || { amount: 0, items: [] };
      const budget = data.amount || 0;
      const items: ProcurementItem[] = data.items || [];
      const actual = items.reduce((sum, i) => sum + (Number(i.actualAmount) || 0), 0);

      totalBudget += budget;
      totalActual += actual;

      if (budget > 0 || items.length > 0) {
        categoriesInProject++;
        const isPurchased = items.length > 0 && items.some(i => i.status === 'Заказано' || i.status === 'Поступило');
        const isReceived = items.length > 0 && items.every(i => i.status === 'Поступило' || i.status === 'Нет в проекте');

        if (isReceived) {
          categoriesPurchased++;
          categoriesReceived++;
        } else if (isPurchased) {
          categoriesPurchased++;
        }
      }
    });

    const purchasePercent = categoriesInProject > 0 ? Math.round((categoriesPurchased / categoriesInProject) * 100) : 0;
    const arrivalPercent = categoriesInProject > 0 ? Math.round((categoriesReceived / categoriesInProject) * 100) : 0;

    return {
      totalBudget,
      totalActual,
      purchasePercent,
      arrivalPercent,
      isCompleted: categoriesInProject > 0 && categoriesReceived === categoriesInProject
    };
  }, [orderData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Поступило':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Заказано':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Нет в проекте':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percent >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percent > 0) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-gray-500 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Live Status & Sync */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Снабжение по Сделке #{dealId}
                </span>
                {stats.isCompleted ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Завершено
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                    В работе
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">
                {orderData?.name || dealTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={syncWithBitrix24}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs",
                isSyncing 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md"
              )}
              title="Загрузить бюджеты и актуализировать данные из полей сделки Битрикс24"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Синхронизация..." : "Обновить из CRM"}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              План (Бюджет)
            </span>
            <span className="text-lg font-black text-gray-900 font-mono mt-1 block">
              {stats.totalBudget.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Факт (Закупки)
            </span>
            <span className={cn(
              "text-lg font-black font-mono mt-1 block",
              stats.totalActual > stats.totalBudget && stats.totalBudget > 0 ? "text-rose-600" : "text-blue-700"
            )}>
              {stats.totalActual.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Заказано
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-black border", getPercentColor(stats.purchasePercent))}>
                {stats.purchasePercent}%
              </span>
            </div>
          </div>

          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Поступило в цех
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-black border", getPercentColor(stats.arrivalPercent))}>
                {stats.arrivalPercent}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100/60 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Все изменения статусов, счетов и оплат синхронизируются в реальном времени с общим модулем снабжения в Мебельном калькуляторе на сайте.
          </span>
        </div>
      </div>

      {/* 2. Procurement Categories List */}
      <div className="space-y-4">
        {CATEGORIES.map(category => {
          const catData: CategoryStatus = orderData?.procurementStatus?.[category] || {
            amount: 0,
            status: 'Не заказано',
            actualAmount: 0,
            items: []
          };
          const items = catData.items || [];
          const isExpanded = expandedCategories[category] ?? true;

          return (
            <div 
              key={category} 
              className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all"
            >
              {/* Category Header */}
              <div 
                className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors select-none"
                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !isExpanded }))}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm truncate">
                      {category}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>План: <b className="text-gray-900">{catData.amount.toLocaleString('ru-RU')} ₽</b></span>
                      <span>•</span>
                      <span>Факт: <b className={catData.actualAmount > catData.amount && catData.amount > 0 ? "text-rose-600 font-bold" : "text-blue-700 font-bold"}>{catData.actualAmount.toLocaleString('ru-RU')} ₽</b></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn("px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider", getStatusColor(catData.status))}>
                    {catData.status}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItem(category);
                      if (!isExpanded) setExpandedCategories(prev => ({ ...prev, [category]: true }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-200"
                    title="Добавить счёт / позицию закупки"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Счёт / Заказ</span>
                  </button>
                </div>
              </div>

              {/* Items List (Expanded) */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-gray-100 space-y-3">
                  {items.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mt-3">
                      Пока нет позиций снабжения в этой категории. Нажмите «Счёт / Заказ», чтобы добавить закупку.
                    </div>
                  ) : (
                    <div className="space-y-2.5 mt-3">
                      {items.map((item, itemIdx) => (
                        <div 
                          key={item.id || itemIdx}
                          className="bg-gray-50/80 hover:bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Статус:</label>
                            <select
                              value={item.status || 'Не заказано'}
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'status', e.target.value)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl font-bold border text-xs outline-none cursor-pointer",
                                getStatusColor(item.status)
                              )}
                            >
                              <option value="Не заказано">Не заказано</option>
                              <option value="Заказано">Заказано</option>
                              <option value="Поступило">Поступило</option>
                              <option value="Нет в проекте">Нет в проекте</option>
                            </select>
                          </div>

                          {/* Actual Amount */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Сумма:</label>
                            <input
                              type="number"
                              value={item.actualAmount || ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'actualAmount', Number(e.target.value) || 0)}
                              className="w-24 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl font-mono font-bold text-gray-900 outline-none focus:border-blue-500"
                            />
                            <span className="font-bold text-gray-500">₽</span>
                          </div>

                          {/* Supplier */}
                          <div className="flex items-center gap-1.5 min-w-[150px]">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Поставщик:</label>
                            <select
                              value={item.supplierId || ''}
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'supplierId', e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 outline-none focus:border-blue-500"
                            >
                              <option value="">-- Не выбран --</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Invoice Number */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">№ Счёта:</label>
                            <input
                              type="text"
                              value={item.invoiceNumber || ''}
                              placeholder="№1234"
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'invoiceNumber', e.target.value)}
                              className="w-24 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Arrival Date */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Приход:</label>
                            <input
                              type="date"
                              value={item.arrivalDate || ''}
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'arrivalDate', e.target.value)}
                              className="px-2 py-1.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Credit Flag */}
                          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 select-none">
                            <input
                              type="checkbox"
                              checked={!!item.isCredit}
                              onChange={(e) => handleUpdateItem(category, itemIdx, 'isCredit', e.target.checked)}
                              className="w-3.5 h-3.5 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                            />
                            <span className={cn("text-[11px] font-bold", item.isCredit ? "text-rose-600" : "text-gray-500")}>
                              В долг
                            </span>
                          </label>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(category, itemIdx)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Удалить позицию"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

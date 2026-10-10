import React, { useState, useMemo } from 'react';
import { 
  X, Truck, CheckCircle2, ChevronDown, ChevronRight, Building2, Package, AlertCircle, Send, Check, Users
} from 'lucide-react';
import { Supplier } from '../../types';
import { cn } from '../../lib/utils';

export interface SupplyItem {
  id: string;
  orderId: string;
  orderName: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  article?: string;
  requestedQty: number;
  warehouseStock: number;
  reservedStock: number;
  availableStock: number;
  toPurchaseQty: number;
  needsPurchase: boolean;
  selectedSupplierId?: string;
  availableSupplierIds: string[];
}

export interface SupplyRequestData {
  id: string;
  requestNumber: string;
  createdAt: string;
  createdBy: string;
  orderIds: string[];
  orderNames: string[];
  status: 'draft' | 'submitted' | 'invoices_attached' | 'completed';
  items: SupplyItem[];
  supplierSplits: Array<{
    supplierId: string;
    supplierName: string;
    items: SupplyItem[];
  }>;
}

interface CreateSupplyRequestModalProps {
  orders: any[];
  categories: Array<{ id: string; name: string }>;
  suppliers: Supplier[];
  warehouseItems: Array<{ id: string; name: string; article?: string; stock?: number; reserved?: number }>;
  onClose: () => void;
  onSaveRequest: (request: SupplyRequestData) => void;
  showAlert?: (title: string, msg: string) => void;
}

export const CreateSupplyRequestModal: React.FC<CreateSupplyRequestModalProps> = ({
  orders,
  categories,
  suppliers,
  warehouseItems,
  onClose,
  onSaveRequest,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemSupplierChoice, setItemSupplierChoice] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select_deals' | 'select_items' | 'supplier_split'>('select_deals');

  // Toggle order selection
  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Selected orders data
  const activeOrders = useMemo(() => {
    return orders.filter(o => selectedOrderIds.includes(o.id));
  }, [orders, selectedOrderIds]);

  // Generate procurement items from selected orders
  const supplyItems = useMemo<SupplyItem[]>(() => {
    const list: SupplyItem[] = [];

    activeOrders.forEach(order => {
      const pStatus = order.procurementStatus || {};
      
      categories.forEach(cat => {
        const catData = pStatus[cat.name] || {};
        const items = catData.items || [];

        items.forEach((item: any, idx: number) => {
          const itemId = `sitem_${order.id}_${cat.id}_${idx}`;
          // Match warehouse stock
          const matchingW = warehouseItems.find(w => 
            (w.article && item.article && w.article.toLowerCase() === item.article.toLowerCase()) ||
            w.name.toLowerCase() === item.name?.toLowerCase()
          );

          const stock = matchingW?.stock || 0;
          const reserved = matchingW?.reserved || 0;
          const available = Math.max(0, stock - reserved);
          const qty = Number(item.qty || item.quantity || 1);
          const needsPurchase = available < qty;
          const toPurchaseQty = needsPurchase ? Math.max(1, qty - available) : 0;

          // Assign available suppliers
          const defaultSuppId = item.supplierId || (suppliers.length > 0 ? suppliers[0].id : 'sup_default');
          const availSupps = suppliers.map(s => s.id);

          list.push({
            id: itemId,
            orderId: order.id,
            orderName: order.name || `Заказ №${order.id.slice(0, 6)}`,
            categoryId: cat.id,
            categoryName: cat.name,
            productName: item.name || 'Товар',
            article: item.article || matchingW?.article,
            requestedQty: qty,
            warehouseStock: stock,
            reservedStock: reserved,
            availableStock: available,
            toPurchaseQty: toPurchaseQty,
            needsPurchase: needsPurchase,
            selectedSupplierId: itemSupplierChoice[itemId] || defaultSuppId,
            availableSupplierIds: availSupps
          });
        });
      });
    });

    return list;
  }, [activeOrders, categories, warehouseItems, itemSupplierChoice, suppliers]);

  // Pre-select items that need purchase
  React.useEffect(() => {
    const preselected = new Set<string>();
    supplyItems.forEach(item => {
      if (item.needsPurchase) {
        preselected.add(item.id);
      }
    });
    setSelectedItemIds(preselected);
  }, [supplyItems.length]);

  const toggleItemSelect = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleSupplierChoice = (itemId: string, supplierId: string) => {
    setItemSupplierChoice(prev => ({ ...prev, [itemId]: supplierId }));
  };

  // Group selected items by supplier
  const supplierSplits = useMemo(() => {
    const selectedItems = supplyItems.filter(i => selectedItemIds.has(i.id));
    const map: Record<string, SupplyItem[]> = {};

    selectedItems.forEach(item => {
      const suppId = item.selectedSupplierId || (suppliers.length > 0 ? suppliers[0].id : 'sup_default');
      if (!map[suppId]) map[suppId] = [];
      map[suppId].push(item);
    });

    return Object.entries(map).map(([supplierId, items]) => {
      const suppObj = suppliers.find(s => s.id === supplierId);
      return {
        supplierId,
        supplierName: suppObj?.name || 'Поставщик',
        items
      };
    });
  }, [supplyItems, selectedItemIds, suppliers]);

  const handleCreateRequest = () => {
    if (selectedItemIds.size === 0) {
      showAlert('Выберите товары', 'Выберите хотя бы один товар для включения в заявку на поставку.');
      return;
    }

    const selectedItemsList = supplyItems.filter(i => selectedItemIds.has(i.id));
    const newRequest: SupplyRequestData = {
      id: `sr_${Date.now()}`,
      requestNumber: `ЗП-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      createdBy: 'Снабженец',
      orderIds: selectedOrderIds,
      orderNames: activeOrders.map(o => o.name || o.id),
      status: 'submitted',
      items: selectedItemsList,
      supplierSplits
    };

    onSaveRequest(newRequest);
    showAlert('Успех', `Заявка на поставку ${newRequest.requestNumber} успешно сформирована! Поставщиков: ${supplierSplits.length}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Создание Заявки на поставку</h3>
              <p className="text-xs text-slate-300">Проверка остатков, сопоставление резервов и разбивка по поставщикам</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
          <div className={cn("flex items-center gap-2", step === 'select_deals' ? "text-indigo-600" : "text-slate-400")}>
            <span className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-[10px]">1</span>
            <span>1. Выбор сделок ({selectedOrderIds.length})</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className={cn("flex items-center gap-2", step === 'select_items' ? "text-indigo-600" : "text-slate-400")}>
            <span className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-[10px]">2</span>
            <span>2. Позиции и Остатки ({selectedItemIds.size})</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className={cn("flex items-center gap-2", step === 'supplier_split' ? "text-indigo-600" : "text-slate-400")}>
            <span className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-[10px]">3</span>
            <span>3. Разбивка по поставщикам ({supplierSplits.length})</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: Select Deals */}
          {step === 'select_deals' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Выберите сделки / заказы для формирования закупки
              </h4>

              {orders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Нет активных заказов для закупки</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {orders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => toggleOrder(order.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          isSelected 
                            ? "bg-indigo-50/60 border-indigo-500 shadow-xs ring-1 ring-indigo-500/20" 
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-extrabold text-xs text-slate-900 truncate">
                            {order.name || `Сделка #${order.id}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Готовность: {order.readyDate ? new Date(order.readyDate).toLocaleDateString('ru-RU') : 'Не указана'}
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Items & Warehouse Check */}
          {step === 'select_items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Проверка остатков и выбор позиций</h4>
                  <p className="text-xs text-slate-500">
                    Напротив каждого товара показан доступный остаток на складе. Если свободного остатка хватает, закупать не нужно.
                  </p>
                </div>
              </div>

              {/* Categories & Items Accordion */}
              <div className="space-y-3">
                {categories.map((cat) => {
                  const itemsInCat = supplyItems.filter(i => i.categoryId === cat.id);
                  if (itemsInCat.length === 0) return null;
                  const isExpanded = expandedCategories[cat.id] ?? true;

                  return (
                    <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      
                      {/* Category Header */}
                      <div 
                        onClick={() => toggleCategoryExpand(cat.id)}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-all flex items-center justify-between gap-3 cursor-pointer border-b border-slate-200"
                      >
                        <div className="flex items-center gap-2 font-extrabold text-xs text-slate-900">
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", !isExpanded && "-rotate-90")} />
                          <span>{cat.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700">
                            {itemsInCat.length} поз.
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100">
                          {itemsInCat.map((item) => {
                            const isChecked = selectedItemIds.has(item.id);

                            return (
                              <div key={item.id} className="p-3.5 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleItemSelect(item.id)}
                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                                  />

                                  <div className="space-y-0.5 min-w-0">
                                    <div className="font-extrabold text-xs text-slate-900 truncate">
                                      {item.productName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                      <span>Заказ: <strong className="text-slate-800">{item.orderName}</strong></span>
                                      <span>Требуется: <strong className="text-slate-800">{item.requestedQty} шт.</strong></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Stock Badge & Status */}
                                <div className="flex items-center gap-4 shrink-0 text-xs">
                                  <div className="text-right">
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Доступный остаток</span>
                                    <span className={cn(
                                      "font-black",
                                      item.availableStock >= item.requestedQty ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                      {item.availableStock} шт. {item.reservedStock > 0 && `(Резерв: ${item.reservedStock})`}
                                    </span>
                                  </div>

                                  {!item.needsPurchase ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      ✓ Достаточно на складе
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                      Закупка: {item.toPurchaseQty} шт.
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Supplier Splits */}
          {step === 'supplier_split' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-xs font-bold text-indigo-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Заявка будет разбита на <strong>{supplierSplits.length} поставщиков</strong></span>
              </div>

              {supplierSplits.map((split) => (
                <div key={split.supplierId} className="border border-slate-200 rounded-2xl overflow-hidden bg-white space-y-3 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>{split.supplierName}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                      {split.items.length} позиций
                    </span>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    {split.items.map((item) => (
                      <div key={item.id} className="pt-2 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-[11px] text-slate-500">Заказ: {item.orderName} | К закупке: {item.toPurchaseQty} шт.</div>
                        </div>

                        {/* Supplier Selector in case of multiple suppliers */}
                        {suppliers.length > 1 && (
                          <select
                            value={item.selectedSupplierId}
                            onChange={(e) => handleSupplierChoice(item.id, e.target.value)}
                            className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-600"
                          >
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (step === 'supplier_split') setStep('select_items');
              else if (step === 'select_items') setStep('select_deals');
              else onClose();
            }}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            {step === 'select_deals' ? 'Отмена' : 'Назад'}
          </button>

          {step === 'select_deals' && (
            <button
              onClick={() => {
                if (selectedOrderIds.length === 0) {
                  showAlert('Выберите сделки', 'Пожалуйста, выберите хотя бы одну сделку');
                  return;
                }
                setStep('select_items');
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Далее: Выбор позиций</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 'select_items' && (
            <button
              onClick={() => setStep('supplier_split')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Далее: Разбивка по поставщикам</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 'supplier_split' && (
            <button
              onClick={handleCreateRequest}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Сформировать Заявку на поставку</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

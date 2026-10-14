import React, { useState } from 'react';
import { 
  Truck, FileText, Paperclip, Upload, CheckCircle2, Clock, AlertCircle, ChevronRight, Plus, Building2, CreditCard, RefreshCw, X, Check, Save
} from 'lucide-react';
import { SupplyRequestData, SupplyItem } from './CreateSupplyRequestModal';
import { Supplier } from '../../types';
import { cn } from '../../lib/utils';

interface ParsedInvoice {
  fileName: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  items: Array<{
    name: string;
    article?: string;
    qty: number;
    price: number;
    total: number;
    matchedSupplyItemId?: string;
  }>;
}

interface SupplyRequestsViewProps {
  companyId: string;
  supplyRequests: SupplyRequestData[];
  suppliers: Supplier[];
  onSaveRequest: (request: SupplyRequestData) => void;
  onDeleteRequest: (requestId: string) => void;
  onOpenCreateModal: () => void;
  showAlert?: (title: string, msg: string) => void;
}

export const SupplyRequestsView: React.FC<SupplyRequestsViewProps> = ({
  companyId,
  supplyRequests,
  suppliers,
  onSaveRequest,
  onDeleteRequest,
  onOpenCreateModal,
  showAlert = (t, m) => alert(`${t}: ${m}`)
}) => {
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequestData | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);

  const handleAttachInvoice = (e: React.ChangeEvent<HTMLInputElement>, req: SupplyRequestData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoice(true);

    // Simulate parsing invoice file (PDF / Excel / Image)
    setTimeout(() => {
      const sampleParsed: ParsedInvoice = {
        fileName: file.name,
        supplierName: suppliers[0]?.name || 'ООО "Плитный Двор"',
        invoiceNumber: `СЧ-${Math.floor(100 + Math.random() * 900)}`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        totalAmount: req.items.reduce((sum, item) => sum + (item.toPurchaseQty * 1250), 0),
        items: req.items.map(item => ({
          name: item.productName,
          article: item.article,
          qty: item.toPurchaseQty || 1,
          price: 1250,
          total: (item.toPurchaseQty || 1) * 1250,
          matchedSupplyItemId: item.id
        }))
      };

      setParsedInvoice(sampleParsed);
      setIsUploadingInvoice(false);
    }, 1500);
  };

  const handleConfirmInvoice = () => {
    if (!selectedRequest || !parsedInvoice) return;

    const updatedRequest: SupplyRequestData = {
      ...selectedRequest,
      status: 'invoices_attached'
    };

    onSaveRequest(updatedRequest);
    setSelectedRequest(updatedRequest);
    setParsedInvoice(null);
    showAlert('Счет прикреплен', `Счет №${parsedInvoice.invoiceNumber} на сумму ${parsedInvoice.totalAmount.toLocaleString('ru-RU')} ₽ успешно занесен и распределен по сделкам.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <span>Заявки на поставку и обработка счетов</span>
          </h3>
          <p className="text-xs text-slate-500">
            Формирование консолидированных заявок, прикрепление счетов от поставщиков и автоматический учет расходов
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Создать заявку на поставку</span>
        </button>
      </div>

      {/* Requests List */}
      {supplyRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3 shadow-xs">
          <Truck className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-extrabold text-slate-800 text-base">Заявки на поставку пока не созданы</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Нажмите «Создать заявку на поставку», чтобы выбрать сделки, проверив остатки на складе и разбив закупку по поставщикам.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-sm hover:bg-indigo-700 transition-all cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Создать заявку</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {supplyRequests.map((req) => {
            return (
              <div 
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                      {req.requestNumber}
                    </span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                      req.status === 'completed' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      req.status === 'invoices_attached' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
                      "bg-amber-100 text-amber-800 border border-amber-200"
                    )}>
                      {req.status === 'invoices_attached' ? 'Счета прикреплены' : 'Отправлено'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Сделки: {req.orderNames?.join(', ') || 'Без наименования'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Позиций в закупке: <strong className="text-slate-800">{req.items.length} шт.</strong> | Поставщиков: <strong className="text-slate-800">{req.supplierSplits.length}</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(req.createdAt).toLocaleDateString('ru-RU')}</span>
                  <span className="font-bold text-indigo-600 flex items-center gap-1">
                    Подробнее <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Request Modal / Detail View */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Заявка на поставку {selectedRequest.requestNumber}</h3>
                  <p className="text-xs text-slate-300">Состояние закупки и прикрепление счетов поставщиков</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Attach Invoice Action */}
              <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>Прикрепить счет от поставщика (Excel / PDF / Изображение)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Система проанализирует счет, распознает товары, цены, количества и сопоставит с плановыми расходами.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingInvoice ? 'Анализируем счет...' : 'Прикрепить счет'}</span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                    onChange={(e) => handleAttachInvoice(e, selectedRequest)}
                    className="hidden"
                    disabled={isUploadingInvoice}
                  />
                </label>
              </div>

              {/* Parsed Invoice Preview Form */}
              {parsedInvoice && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Распознан счет №{parsedInvoice.invoiceNumber} от {parsedInvoice.supplierName}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700">
                      Сумма: {parsedInvoice.totalAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="space-y-2 divide-y divide-emerald-100">
                    {parsedInvoice.items.map((invItem, idx) => (
                      <div key={idx} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="font-bold text-slate-900">{invItem.name}</div>
                        <div className="flex items-center gap-3 text-slate-600 font-semibold">
                          <span>{invItem.qty} шт.</span>
                          <span>х {invItem.price.toLocaleString('ru-RU')} ₽</span>
                          <strong className="text-emerald-900">{invItem.total.toLocaleString('ru-RU')} ₽</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConfirmInvoice}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Подтвердить и внести в Снабжение</span>
                  </button>
                </div>
              )}

              {/* Supplier Splits & Items */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Состав заявки по поставщикам
                </h4>

                {selectedRequest.supplierSplits.map((split) => (
                  <div key={split.supplierId} className="border border-slate-200 rounded-2xl overflow-hidden bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{split.supplierName}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{split.items.length} поз.</span>
                    </div>

                    <div className="space-y-2 divide-y divide-slate-100">
                      {split.items.map((item) => (
                        <div key={item.id} className="pt-2 flex items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-extrabold text-slate-900">{item.productName}</span>
                            <span className="block text-[11px] text-slate-500">Заказ: {item.orderName} | Категория: {item.categoryName}</span>
                          </div>
                          <div className="font-black text-slate-800">
                            К закупке: {item.toPurchaseQty} шт.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

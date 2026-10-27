import React, { useRef } from 'react';
import { X, Printer, Truck, FileText, CheckCircle2 } from 'lucide-react';
import { ProductionOrder, ERPCompanySettings } from '../types';

interface ShippingTTNPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  settings?: ERPCompanySettings;
}

export const ShippingTTNPrintModal: React.FC<ShippingTTNPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  settings
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const tpl = settings?.shippingActTemplate || {};
  const companyTitle = tpl.companyTitle || 'Мебельное производство';
  const companyPhone = tpl.companyPhone || '+7 (495) 000-00-00';

  const driver = order.driverInfo || {};
  const driverName = driver.driverName || 'Водитель экспедитор';
  const carPlate = driver.carPlate || 'Не указан';
  const driverPhone = driver.phone || '';

  const delivery = order.deliveryData || {};
  const clientName = delivery.clientName || order.clientName || 'Физическое лицо';
  const clientPhone = delivery.clientPhone || (order as any).clientPhone || '';
  const deliveryAddress = delivery.address || 'Адрес доставки согласно договору';
  const packages = order.packages || [];
  const totalPackages = packages.length || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-300 space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Печатная форма: Транспортная накладная (ТТН)
              </h3>
              <p className="text-[11px] text-slate-500">
                Документ с подписью водителя о принятии груза к перевозке
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Печать (А4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Content Area */}
        <div className="overflow-y-auto flex-1 bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-inner text-slate-900 font-sans print:p-0 print:border-none print:shadow-none print:overflow-visible">
          <div ref={printAreaRef} className="space-y-6 max-w-[210mm] mx-auto text-xs leading-relaxed">
            
            {/* Header / Carrier Requisites */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                  {companyTitle}
                </h1>
                <div className="text-[11px] font-medium text-slate-600">Диспетчерская службы доставки: {companyPhone}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Путевой лист отгрузки</div>
                <div className="text-base font-black font-mono text-emerald-900">ТТН № {order.orderNumber}-Т</div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Дата погрузки: {new Date().toLocaleDateString('ru-RU')} г.
                </div>
              </div>
            </div>

            {/* TTN Title */}
            <div className="text-center py-2">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                ТРАНСПОРТНАЯ НАКЛАДНАЯ (РАСПОРЯЖЕНИЕ НА ДОСТАВКУ)
              </h2>
              <div className="text-[11px] text-slate-600 font-medium">к производственному заказу № {order.orderNumber}</div>
            </div>

            {/* Carrier & Vehicle Info */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-300 text-xs space-y-2">
              <div className="font-bold text-emerald-900 text-xs uppercase flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-700" /> Данные перевозчика и автотранспорта:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-medium text-slate-900 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Водитель-экспедитор:</span>
                  <strong className="text-sm font-bold">{driverName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Госномер ТС / Марка:</span>
                  <strong className="font-mono font-bold">{carPlate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Телефон водителя:</span>
                  <strong className="font-mono font-bold">{driverPhone || 'Не указан'}</strong>
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 text-xs space-y-2">
              <div className="font-bold text-slate-900 text-xs uppercase">Пункт назначения и грузополучатель:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-900">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Получатель (Заказчик):</span>
                  <div className="font-bold text-sm">{clientName}</div>
                  {clientPhone && <div className="font-mono text-slate-700">Тел.: {clientPhone}</div>}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Адрес разгрузки:</span>
                  <div className="font-bold">{deliveryAddress}</div>
                  {delivery.floor && <div className="text-slate-700">Этаж: {delivery.floor} {delivery.hasElevator ? '(с лифтом)' : '(без лифта)'}</div>}
                </div>
              </div>
            </div>

            {/* Cargo Description Table */}
            <div>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>Характеристика перевозимого груза:</span>
                <span className="font-mono font-bold text-emerald-900">Общее количество мест: {totalPackages} шт.</span>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-left">
                    <th className="border border-slate-900 p-2 w-12 text-center">№</th>
                    <th className="border border-slate-900 p-2">Наименование груза</th>
                    <th className="border border-slate-900 p-2 w-28 text-center">Кол-во мест</th>
                    <th className="border border-slate-900 p-2 w-36 text-center">Маркировка</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 p-2 text-center font-mono font-bold">1</td>
                    <td className="border border-slate-900 p-2 font-bold">
                      Мебельная продукция и фурнитура в упаковках по заказу № {order.orderNumber} ({order.projectName})
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-black text-sm">{totalPackages} упак.</td>
                    <td className="border border-slate-900 p-2 text-center font-mono">ORD-{order.orderNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Drivers obligation statement */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] text-slate-800 text-justify">
              <strong>Обязательства водителя:</strong> Водитель подтверждает принятие груза в количестве {totalPackages} мест в исправной упаковке. Перевозчик несет ответственность за сохранность упаковок при транспортировке до пункта назначения.
            </div>

            {/* Signatures Block */}
            <div className="pt-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                {/* Dispatched to Driver */}
                <div className="space-y-4">
                  <div className="font-bold text-slate-900 border-b border-slate-400 pb-1">
                    1. Груз к перевозке сдал (Склад / Цех):
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>Кладовщик: _____________________________</div>
                    <div>Подпись: __________________ Дата: _________</div>
                  </div>
                </div>

                {/* Driver Accepted */}
                <div className="space-y-4">
                  <div className="font-bold text-slate-900 border-b border-slate-400 pb-1">
                    2. Груз к перевозке принял (Водитель):
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>Водитель: <strong>{driverName}</strong></div>
                    <div>Подпись: __________________ Дата: _________</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-300">
                <div className="font-bold text-slate-900 mb-2">
                  3. Отметка о доставке и сдаче груза заказчику:
                </div>
                <div className="grid grid-cols-2 gap-8 text-[11px]">
                  <div>Груз доставлен без повреждений (Подпись водителя): _____________</div>
                  <div>Груз в количестве {totalPackages} мест получил (Подпись заказчика): _____________</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { X, Printer, QrCode, CheckCircle2, Shield, Truck, FileText } from 'lucide-react';
import { ProductionOrder, ERPCompanySettings } from '../types';

interface ShippingActPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  settings?: ERPCompanySettings;
}

export const ShippingActPrintModal: React.FC<ShippingActPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  settings
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const tpl = settings?.shippingActTemplate || {};
  const companyTitle = tpl.companyTitle || 'Мебельное производство';
  const companyInn = tpl.companyInn || '';
  const companyPhone = tpl.companyPhone || '+7 (495) 000-00-00';
  const actHeader = tpl.actHeaderTitle || `АКТ ПРИЕМА-ПЕРЕДАЧИ ТОВАРА № ${order.orderNumber}`;
  const introText = tpl.actTextIntro || 'Настоящий акт составлен о том, что Изготовитель (Поставщик) сдал, а Заказчик (Получатель) принял готовые изделия и упакованные места по договору/заказу в полном объеме.';
  const termsText = tpl.actTermsText || 'Заказчик подтверждает, что доставленные упаковки и комплектующие осмотрены, целостность упаковки не нарушена, количество мест соответствует передаточному документу. Претензий по внешнему виду и количеству упаковок нет.';
  const footerNotes = tpl.customFooterNotes || 'Спасибо за выбор нашей мебельной фабрики!';
  const showQr = tpl.showQrForAssembler !== false;

  const delivery = order.deliveryData || {};
  const assembly = order.assemblyData || {};
  const clientName = delivery.clientName || order.clientName || 'Физическое лицо';
  const clientPhone = delivery.clientPhone || (order as any).clientPhone || '';
  const deliveryAddress = delivery.address || 'Адрес доставки согласно договору';
  const packages = order.packages || [];
  const totalPackages = packages.length || 1;

  const orderQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(
    window.location.origin + '/?orderId=' + order.id
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-300 space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Печатная форма: Акт приема-передачи (А4)
              </h3>
              <p className="text-[11px] text-slate-500">
                Документ с QR-кодом для сборщика и строкой подписи заказчика
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center gap-2 cursor-pointer"
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
            
            {/* Header / Company Requisites */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                  {companyTitle}
                </h1>
                {companyInn && <div className="text-[11px] font-medium text-slate-600">ИНН / ОГРН: {companyInn}</div>}
                <div className="text-[11px] font-medium text-slate-600">Тел.: {companyPhone}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Производственный заказ</div>
                <div className="text-base font-black font-mono text-violet-900">№ {order.orderNumber}</div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Дата: {new Date().toLocaleDateString('ru-RU')} г.
                </div>
              </div>
            </div>

            {/* Act Title */}
            <div className="text-center py-2">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                {actHeader}
              </h2>
              <div className="text-[11px] text-slate-600 font-medium">К договору / заказу № {order.orderNumber} от {new Date(order.createdAt).toLocaleDateString('ru-RU')} г.</div>
            </div>

            {/* Client & Address Info Box */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs">
              <div>
                <span className="font-bold text-slate-500 block text-[10px] uppercase">Заказчик (Получатель):</span>
                <div className="font-bold text-slate-900 text-sm">{clientName}</div>
                {clientPhone && <div className="font-mono text-slate-700">Тел.: {clientPhone}</div>}
              </div>

              <div>
                <span className="font-bold text-slate-500 block text-[10px] uppercase">Адрес доставки:</span>
                <div className="font-bold text-slate-900">{deliveryAddress}</div>
                {delivery.floor && <div className="text-slate-700">Этаж: {delivery.floor} {delivery.hasElevator ? '(Лифт есть)' : '(Без лифта)'}</div>}
              </div>
            </div>

            {/* Intro text */}
            <div className="text-slate-800 text-justify">
              {introText}
            </div>

            {/* Places / Packages Breakdown Table */}
            <div>
              <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>Перечень переданных упаковочных мест:</span>
                <span className="font-mono text-slate-700">Всего мест к передаче: {totalPackages} шт.</span>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-left">
                    <th className="border border-slate-900 p-2 w-12 text-center">№</th>
                    <th className="border border-slate-900 p-2">Наименование места / Упаковки</th>
                    <th className="border border-slate-900 p-2 w-28 text-center">Штрихкод / Код</th>
                    <th className="border border-slate-900 p-2 w-24 text-center">Состав</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length > 0 ? (
                    packages.map((pkg, idx) => (
                      <tr key={pkg.id || idx}>
                        <td className="border border-slate-900 p-2 text-center font-mono font-bold">{idx + 1}</td>
                        <td className="border border-slate-900 p-2 font-bold">{pkg.name}</td>
                        <td className="border border-slate-900 p-2 text-center font-mono">{pkg.code}</td>
                        <td className="border border-slate-900 p-2 text-center">
                          {pkg.type === 'kitting' ? 'Комплектация' : `${pkg.parts.length} дет.`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border border-slate-900 p-2 text-center font-mono font-bold">1</td>
                      <td className="border border-slate-900 p-2 font-bold">Комплект мебельных деталей и фурнитуры заказу {order.orderNumber}</td>
                      <td className="border border-slate-900 p-2 text-center font-mono">ORD-{order.orderNumber}</td>
                      <td className="border border-slate-900 p-2 text-center">{order.partsCount || 1} дет.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cost Summary if specified */}
            {(delivery.deliveryPrice || delivery.assemblyPrice || order.deliveryData?.deliveryPrice || order.deliveryData?.assemblyPrice) && (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs">
                <div>
                  Доставка: <strong className="font-mono">{delivery.deliveryPrice ? `${Number(delivery.deliveryPrice).toLocaleString('ru-RU')} ₽` : 'Включена'}</strong>
                </div>
                <div>
                  Сборка мебели: <strong className="font-mono">{delivery.assemblyPrice || order.deliveryData?.assemblyPrice ? `${Number(delivery.assemblyPrice || order.deliveryData?.assemblyPrice).toLocaleString('ru-RU')} ₽` : 'По договору'}</strong>
                </div>
              </div>
            )}

            {/* Terms and Quality check statement */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] text-slate-800 text-justify italic">
              "{termsText}"
            </div>

            {/* Assembler QR Code Block */}
            {showQr && (
              <div className="p-3.5 bg-slate-50 border-2 border-dashed border-violet-300 rounded-2xl flex items-center gap-4">
                <img
                  src={orderQrUrl}
                  alt="QR Code for Assembler"
                  className="w-24 h-24 shrink-0 rounded-lg border border-slate-300 bg-white p-1"
                />
                <div className="space-y-1">
                  <div className="font-black text-violet-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-violet-600" />
                    <span>QR-код для мастера / сборщика мебели</span>
                  </div>
                  <div className="text-[11px] text-slate-700 leading-snug">
                    Сборщик может навести камеру смартфона на этот QR-код, чтобы открылись чертежи, карты присадки, спецификация фурнитуры и инструкция по сборке заказа <strong>№ {order.orderNumber}</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Block */}
            <div className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-8">
                {/* Dispatched */}
                <div className="space-y-4">
                  <div className="font-bold text-slate-900 border-b border-slate-400 pb-1">
                    Сдал (Изготовитель / Водитель-экспедитор):
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>ФИО: _____________________________________</div>
                    <div>Подпись: __________________ / М.П.</div>
                  </div>
                </div>

                {/* Received */}
                <div className="space-y-4">
                  <div className="font-bold text-slate-900 border-b border-slate-400 pb-1">
                    Принял в полном объеме (Заказчик):
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>ФИО: _____________________________________</div>
                    <div>Подпись: __________________ Дата: _________</div>
                  </div>
                </div>
              </div>

              {/* Custom Footer Notes */}
              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200 italic">
                {footerNotes}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

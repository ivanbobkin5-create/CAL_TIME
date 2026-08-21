import React, { useEffect, useState, useRef } from 'react';
import { Printer, X, Download, QrCode, Sparkles, Check, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import { OrderPackage, PackageLabelSettings, ProductionOrder } from '../types';

interface PackageLabelPrintModalProps {
  order: ProductionOrder;
  pkg: OrderPackage;
  totalPackagesCount?: number;
  settings?: PackageLabelSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PackageLabelPrintModal: React.FC<PackageLabelPrintModalProps> = ({
  order,
  pkg,
  totalPackagesCount = 1,
  settings,
  isOpen,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const widthMm = settings?.widthMm || 120;
  const heightMm = settings?.heightMm || 75;
  const showDetails = settings?.showDetailsList !== false;
  const showEmployee = settings?.showEmployeeName !== false;
  const showDateTime = settings?.showDateTime !== false;
  const showQr = settings?.showOrderQr !== false;
  const fontScale = settings?.fontSizeScale || 100;

  useEffect(() => {
    if (!isOpen || !pkg) return;

    // Generate QR code data URL (encodes the package code for scanning at shipping)
    const qrPayload = pkg.code || `PKG-${order.orderNumber}-${pkg.packageNumber}`;
    QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
  }, [isOpen, pkg, order.orderNumber]);

  if (!isOpen || !pkg) return null;

  const formattedDate = pkg.createdAt
    ? new Date(pkg.createdAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('ru-RU');

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  return (
    <div 
      id="package-label-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        id="package-label-modal-content"
        className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Печать термоэтикетки упаковки
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Формат: {widthMm} × {heightMm} мм (для термопринтеров этикеток)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono">
              Заказ {order.orderNumber}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-orange-100 text-orange-800">
              Место № {pkg.packageNumber} {totalPackagesCount > 1 ? `из ${totalPackagesCount}` : ''}
            </span>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Распечатать этикетку ({widthMm}×{heightMm} мм)</span>
          </button>
        </div>

        {/* Visual Printable Label Preview */}
        <div className="flex justify-center p-4 bg-slate-200/60 rounded-2xl border border-slate-300/80 overflow-x-auto">
          {/* Exact Label Container styled for print & preview */}
          <div
            ref={printContainerRef}
            id="printable-package-label"
            className="bg-white text-black font-sans border-2 border-slate-900 rounded-lg p-3 shadow-md flex flex-col justify-between select-none relative box-border"
            style={{
              width: `${widthMm * 3.78}px`, // ~3.78px per mm for 96DPI preview
              minHeight: `${heightMm * 3.78}px`,
              maxHeight: `${heightMm * 3.78}px`,
              fontSize: `${(11 * fontScale) / 100}px`
            }}
          >
            {/* Top Label Header */}
            <div>
              <div className="flex items-start justify-between border-b-2 border-black pb-1.5 mb-1.5">
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-700 leading-none">
                    МЕБЕЛЬНОЕ ПРОИЗВОДСТВО
                  </div>
                  <div className="text-sm font-black tracking-tight leading-tight mt-0.5">
                    ЗАКАЗ: {order.orderNumber}
                  </div>
                  <div className="text-[10px] font-bold text-slate-800 truncate max-w-[240px] leading-tight">
                    {order.clientName} {order.projectName ? `• ${order.projectName}` : ''}
                  </div>
                </div>

                {/* Big Package Badge */}
                <div className="text-right">
                  <div className="bg-black text-white px-2 py-0.5 rounded text-xs font-black font-mono inline-block">
                    МЕСТО {pkg.packageNumber}{totalPackagesCount > 1 ? ` / ${totalPackagesCount}` : ''}
                  </div>
                  <div className="text-[9px] font-mono text-slate-700 mt-0.5">
                    {pkg.type === 'kitting' ? 'КОМПЛЕКТАЦИЯ' : 'УПАКОВКА'}
                  </div>
                </div>
              </div>

              {/* Package Title */}
              <div className="bg-slate-100 px-2 py-1 rounded border border-slate-300 mb-1.5">
                <div className="text-[9px] font-bold text-slate-600 uppercase">Наименование места:</div>
                <div className="text-xs font-black text-black truncate leading-tight">
                  {pkg.name || `Место №${pkg.packageNumber}`}
                </div>
              </div>
            </div>

            {/* Middle Section: Parts structure or Kitting items + QR Code */}
            <div className="flex items-stretch gap-2 my-auto py-1 min-h-0 overflow-hidden">
              {/* Parts / Specification breakdown */}
              <div className="flex-1 min-w-0 pr-1 overflow-hidden">
                {pkg.type === 'kitting' ? (
                  <div className="h-full flex flex-col justify-center">
                    <div className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Состав фурнитуры / комплекта:</div>
                    <div className="text-[10px] font-medium text-slate-900 line-clamp-4 leading-snug whitespace-pre-wrap bg-slate-50 p-1 rounded border border-slate-200">
                      {pkg.customItemsNote || 'Фурнитура, крепеж, комплектующие'}
                    </div>
                  </div>
                ) : showDetails && pkg.parts && pkg.parts.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 uppercase mb-0.5">
                      <span>Вложенные детали:</span>
                      <span className="font-mono font-black">{pkg.parts.length} шт.</span>
                    </div>
                    <div className="max-h-[95px] overflow-hidden space-y-0.5 text-[9.5px]">
                      {pkg.parts.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-1 leading-tight border-b border-dotted border-slate-300 pb-0.5">
                          <span className="truncate max-w-[140px] font-semibold">
                            #{p.labelNumber} {p.name}
                          </span>
                          <span className="font-mono text-[9px] text-slate-600 shrink-0">
                            {p.length && p.width ? `${p.length}×${p.width}` : ''}
                          </span>
                        </div>
                      ))}
                      {pkg.parts.length > 5 && (
                        <div className="text-[8.5px] font-bold text-slate-600 italic">
                          + еще {pkg.parts.length - 5} дет. (всего {pkg.parts.length} шт)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-[10px] italic">
                    {pkg.parts?.length || 0} деталей упаковано
                  </div>
                )}
              </div>

              {/* QR Code */}
              {showQr && qrDataUrl && (
                <div className="flex flex-col items-center justify-center shrink-0 border-l border-slate-300 pl-2">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-16 h-16 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="text-[8px] font-mono font-bold text-center mt-0.5 max-w-[70px] truncate">
                    {pkg.code}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer: Operator Name, Date/Time & Barcode Number */}
            <div className="border-t-2 border-black pt-1 mt-1 flex items-center justify-between text-[8.5px] leading-tight">
              <div>
                {showEmployee && (
                  <div className="font-bold truncate max-w-[170px]">
                    Упаковщик: <span className="font-black">{pkg.createdByEmployeeName || 'Мастер цеха'}</span>
                  </div>
                )}
                {showDateTime && (
                  <div className="text-slate-600 font-mono">
                    Сформировано: {formattedDate}
                  </div>
                )}
              </div>

              <div className="text-right font-mono font-black text-[9px]">
                ERP-{order.orderNumber}-M{pkg.packageNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <div>
            Наклейка создана для термопринтера (120×75 мм). При печати выберите масштаб 100% без полей.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Global Print Styles for Perfect Thermal Label Output */}
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #package-label-modal-backdrop, #package-label-modal-content {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            position: static !important;
          }
          #printable-package-label, #printable-package-label * {
            visibility: visible !important;
          }
          #printable-package-label {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            min-height: ${heightMm}mm !important;
            max-height: ${heightMm}mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            border: 2px solid #000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            box-sizing: border-box !important;
            font-family: Arial, Helvetica, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
};

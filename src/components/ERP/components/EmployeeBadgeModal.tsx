import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  RefreshCw, 
  Download, 
  Check, 
  QrCode, 
  ShieldCheck, 
  User, 
  Factory, 
  Copy,
  Sparkles
} from 'lucide-react';
import { ERPEmployee } from '../types';

interface EmployeeBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: ERPEmployee;
  companyName?: string;
  companyId?: string;
  onUpdateEmployee?: (updated: ERPEmployee) => void;
}

export const EmployeeBadgeModal: React.FC<EmployeeBadgeModalProps> = ({
  isOpen,
  onClose,
  employee,
  companyName = 'Мебельное производство',
  companyId = '',
  onUpdateEmployee
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [badgeSize, setBadgeSize] = useState<'standard' | 'compact' | 'large'>('standard');
  const badgeCardRef = useRef<HTMLDivElement>(null);

  // Stable badge code calculation
  const currentBadgeCode = useMemo(() => {
    return employee.badgeCode || `EMP_${employee.id}`;
  }, [employee.badgeCode, employee.id]);

  const fullQrPayload = useMemo(() => {
    return `ERP_BADGE:${employee.id}:${companyId || 'company'}:${currentBadgeCode}`;
  }, [employee.id, companyId, currentBadgeCode]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    QRCode.toDataURL(fullQrPayload, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('QR generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fullQrPayload]);

  if (!isOpen) return null;

  const handleRegenerateKey = () => {
    setIsRegenerating(true);
    const newCode = `EMP_${employee.id}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const updatedEmployee: ERPEmployee = {
      ...employee,
      badgeCode: newCode,
      badgeIssuedAt: new Date().toISOString()
    };

    if (onUpdateEmployee) {
      onUpdateEmployee(updatedEmployee);
    }

    setTimeout(() => {
      setIsRegenerating(false);
    }, 400);
  };

  const handlePrint = () => {
    try {
      // Dynamic sizes for the printed badge
      const sizes = {
        compact: { width: '60mm', height: '90mm', padding: '4mm', qrSize: '36mm', nameSize: '16px', roleSize: '12px', deptSize: '10px' },
        standard: { width: '80mm', height: '120mm', padding: '6mm', qrSize: '48mm', nameSize: '20px', roleSize: '14px', deptSize: '12px' },
        large: { width: '100mm', height: '150mm', padding: '8mm', qrSize: '62mm', nameSize: '24px', roleSize: '17px', deptSize: '14px' }
      }[badgeSize];

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Бейдж сотрудника - ${employee.name}</title>
              <style>
                @page {
                  size: ${sizes.width} ${sizes.height};
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background: #ffffff;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .badge-card {
                  width: ${sizes.width};
                  height: ${sizes.height};
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: ${sizes.padding};
                  border: 1px dashed #000000;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  text-align: center;
                  position: relative;
                  overflow: hidden;
                }
                .company-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #000000;
                  padding-bottom: 2mm;
                  margin-bottom: 2mm;
                }
                .company-name {
                  font-size: 11px;
                  font-weight: 900;
                  text-transform: uppercase;
                  color: #000000;
                  letter-spacing: 0.5px;
                  text-align: left;
                }
                .badge-tag {
                  font-size: 9px;
                  font-weight: 900;
                  background: #000000;
                  color: #ffffff;
                  padding: 2px 7px;
                  border-radius: 2px;
                  letter-spacing: 0.5px;
                }
                .emp-info {
                  width: 100%;
                  margin: 2mm 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                }
                .emp-name {
                  font-size: ${sizes.nameSize};
                  font-weight: 900;
                  color: #000000;
                  text-transform: uppercase;
                  line-height: 1.15;
                  margin-bottom: 2mm;
                  word-wrap: break-word;
                  max-width: 100%;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }
                .emp-role {
                  font-size: ${sizes.roleSize};
                  font-weight: 800;
                  color: #000000;
                  line-height: 1.2;
                  margin-bottom: 1mm;
                }
                .emp-dept {
                  font-size: ${sizes.deptSize};
                  font-weight: 700;
                  color: #000000;
                  line-height: 1.2;
                }
                .qr-box {
                  background: #ffffff;
                  padding: 2mm;
                  border: 2px solid #000000;
                  border-radius: 4px;
                  margin-top: 2mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  width: 100%;
                }
                .qr-img {
                  width: ${sizes.qrSize};
                  height: ${sizes.qrSize};
                  object-fit: contain;
                }
                .qr-label {
                  font-size: 8px;
                  font-weight: 900;
                  color: #000000;
                  font-family: monospace;
                  letter-spacing: 0.5px;
                  margin-top: 1.5mm;
                }
              </style>
            </head>
            <body>
              <div class="badge-card">
                <div class="company-row">
                  <div class="company-name">${companyName || 'ПРОИЗВОДСТВО'}</div>
                  <div class="badge-tag">ПРОПУСК</div>
                </div>
                <div class="emp-info">
                  <div class="emp-name">${employee.name}</div>
                  <div class="emp-role">${roleTitle}</div>
                  <div class="emp-dept">${departmentTitle}</div>
                </div>
                <div class="qr-box">
                  <img class="qr-img" src="${qrDataUrl}" alt="QR" />
                  <div class="qr-label">КЛЮЧ БЫСТРОГО ВХОДА</div>
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.focus();
                  window.print();
                  setTimeout(function() {
                    window.frameElement?.parentNode?.removeChild(window.frameElement);
                  }, 1000);
                };
              </script>
            </body>
          </html>
        `);
        frameDoc.close();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Print error fallback:', e);
      window.print();
    }
  };

  const departmentNames: Record<string, string> = {
    cutting: 'Участок раскроя',
    edging: 'Участок кромкооблицовки',
    cnc: 'Участок ЧПУ присадки',
    facades: 'Участок фасадов',
    assembly: 'Участок сборки',
    qc: 'Контроль ОТК',
    packing: 'Участок упаковки',
    kitting: 'Участок комплектации',
    warehouse: 'Склад и отгрузка',
    management: 'Администрация цеха'
  };

  const departmentTitle = departmentNames[employee.department] || employee.department || 'Производственный цех';
  const roleTitle = employee.productionRole || employee.role || 'Сотрудник';

  // Preview dimensions for the modal
  const previewSizes = {
    compact: { width: '250px', padding: 'p-4', qrSize: 'w-32 h-32', nameSize: 'text-sm', roleSize: 'text-[11px]', deptSize: 'text-[10px]' },
    standard: { width: '310px', padding: 'p-5', qrSize: 'w-40 h-40', nameSize: 'text-base', roleSize: 'text-xs', deptSize: 'text-[11px]' },
    large: { width: '370px', padding: 'p-6', qrSize: 'w-48 h-48', nameSize: 'text-lg', roleSize: 'text-sm', deptSize: 'text-xs' }
  }[badgeSize];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Карточка сотрудника и QR-бейдж
              </h2>
              <p className="text-[11px] text-slate-500">
                Экологичный белый фон для экономии чернил при печати
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Controls (Size selection) */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <label className="block text-xs font-bold text-slate-700">Размер печатного бейджа:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'Компактный', desc: '60 × 90 мм' },
              { id: 'standard', label: 'Стандартный', desc: '80 × 120 мм' },
              { id: 'large', label: 'Большой', desc: '100 × 150 мм' }
            ].map(sz => (
              <button
                key={sz.id}
                type="button"
                onClick={() => setBadgeSize(sz.id as any)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  badgeSize === sz.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                    : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-100/50'
                }`}
              >
                <div className="text-xs">{sz.label}</div>
                <div className={`text-[9px] mt-0.5 ${badgeSize === sz.id ? 'text-indigo-200' : 'text-slate-400'}`}>{sz.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Badge Card Container (White Ink-Saving design) */}
        <div className="flex flex-col items-center justify-center py-1">
          <div
            id="printable-employee-badge"
            ref={badgeCardRef}
            style={{ width: previewSizes.width }}
            className={`bg-white text-slate-950 rounded-2xl ${previewSizes.padding} border-2 border-slate-950 shadow-lg relative overflow-hidden flex flex-col items-center justify-between text-center select-none transition-all duration-300`}
          >
            {/* Company Title */}
            <div className="w-full flex items-center justify-between border-b-2 border-slate-950 pb-2 mb-2">
              <span className="text-xs font-black tracking-wide text-slate-950 uppercase truncate max-w-[180px]">
                {companyName}
              </span>
              <span className="text-[9px] font-black bg-slate-950 text-white px-2 py-0.5 rounded">
                ПРОПУСК
              </span>
            </div>

            {/* Employee Name & Position */}
            <div className="my-2 w-full px-1 flex flex-col items-center justify-center">
              <h3 className={`${previewSizes.nameSize} font-black text-slate-950 tracking-tight leading-tight uppercase line-clamp-2 max-w-full break-words`}>
                {employee.name}
              </h3>
              <div className={`${previewSizes.roleSize} font-extrabold text-slate-950 mt-1`}>
                {roleTitle}
              </div>
              <div className={`${previewSizes.deptSize} font-bold text-slate-950 mt-0.5`}>
                {departmentTitle}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-2 rounded-xl border-2 border-slate-950 w-full flex flex-col items-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR бейдж ${employee.name}`} 
                  className={`${previewSizes.qrSize} object-contain rounded`}
                />
              ) : (
                <div className={`${previewSizes.qrSize} flex items-center justify-center bg-slate-50 text-slate-400`}>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}
              <div className="mt-1.5 text-[9px] font-mono font-black text-slate-950 tracking-wider uppercase">
                КЛЮЧ БЫСТРОГО ВХОДА
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handlePrint}
              className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Распечатать бейдж</span>
            </button>

            <button
              onClick={handleRegenerateKey}
              disabled={isRegenerating}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Обновить QR-код</span>
            </button>
          </div>

          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-950 space-y-1">
            <div className="font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              Оптимизация для экономии чернил:
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-900/80 font-medium">
              Бейдж переведен на белый цвет с контрастной черной рамкой и черным шрифтом. Это экономит до 95% тонера/чернил при распечатке на стандартных принтерах, обеспечивая идеальное считывание QR-кода аппаратными сканерами.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

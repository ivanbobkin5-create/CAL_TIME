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
        compact: { width: '60mm', height: '90mm', padding: '3mm', qrSize: '28mm', avatarSize: '13mm', nameSize: '11px', roleSize: '9px', deptSize: '8px', footerSize: '7px' },
        standard: { width: '80mm', height: '120mm', padding: '5mm', qrSize: '38mm', avatarSize: '18mm', nameSize: '14px', roleSize: '11px', deptSize: '9px', footerSize: '8px' },
        large: { width: '100mm', height: '150mm', padding: '7mm', qrSize: '48mm', avatarSize: '24mm', nameSize: '18px', roleSize: '14px', deptSize: '11px', footerSize: '10px' }
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
                  border: 1px dashed #94a3b8;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  text-align: center;
                  position: relative;
                  overflow: hidden;
                }
                .top-bar {
                  width: 100%;
                  height: 3px;
                  background: #000000;
                  position: absolute;
                  top: 0;
                  left: 0;
                }
                .company-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1.5px solid #000000;
                  padding-bottom: 2mm;
                  margin-top: 1mm;
                  margin-bottom: 3mm;
                }
                .company-name {
                  font-size: 10px;
                  font-weight: 900;
                  text-transform: uppercase;
                  color: #000000;
                  letter-spacing: 0.5px;
                }
                .badge-tag {
                  font-size: 8px;
                  font-weight: 800;
                  background: #000000;
                  color: #ffffff;
                  padding: 1px 6px;
                  border-radius: 2px;
                }
                .avatar {
                  width: ${sizes.avatarSize};
                  height: ${sizes.avatarSize};
                  border-radius: 2px;
                  background: #f1f5f9;
                  color: #000000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                  font-weight: 900;
                  margin-bottom: 2mm;
                  border: 1.5px solid #000000;
                }
                .emp-name {
                  font-size: ${sizes.nameSize};
                  font-weight: 900;
                  color: #000000;
                  text-transform: uppercase;
                  line-height: 1.2;
                  margin-bottom: 1mm;
                }
                .emp-role {
                  font-size: ${sizes.roleSize};
                  font-weight: 700;
                  color: #000000;
                  margin-bottom: 0.5mm;
                }
                .emp-dept {
                  font-size: ${sizes.deptSize};
                  color: #475569;
                  margin-bottom: 2.5mm;
                }
                .qr-box {
                  background: #ffffff;
                  padding: 1mm;
                  border: 1px solid #000000;
                  margin-bottom: 2.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .qr-img {
                  width: ${sizes.qrSize};
                  height: ${sizes.qrSize};
                  object-fit: contain;
                }
                .qr-label {
                  font-size: 7px;
                  font-weight: 800;
                  color: #000000;
                  font-family: monospace;
                  margin-top: 1mm;
                }
                .footer-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-top: 1.5px solid #000000;
                  padding-top: 2mm;
                  font-size: ${sizes.footerSize};
                  font-family: monospace;
                  color: #000000;
                }
              </style>
            </head>
            <body>
              <div class="badge-card">
                <div class="top-bar"></div>
                <div class="company-row">
                  <div class="company-name">${companyName || 'ПРОИЗВОДСТВО'}</div>
                  <div class="badge-tag">ПРОПУСК</div>
                </div>
                <div class="avatar">
                  ${employee.avatarUrl ? `<img src="${employee.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;" />` : (employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'СП')}
                </div>
                <div class="emp-name">${employee.name}</div>
                <div class="emp-role">${roleTitle}</div>
                <div class="emp-dept">${departmentTitle}</div>
                <div class="qr-box">
                  <img class="qr-img" src="${qrDataUrl}" alt="QR" />
                  <div class="qr-label">КЛЮЧ БЫСТРОГО ВХОДА</div>
                </div>
                <div class="footer-row">
                  <div>ID: <strong>${employee.id}</strong></div>
                  <div>✓ Авторизован</div>
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
    compact: { width: '250px', padding: 'p-4', qrSize: 'w-28 h-28', avatarSize: 'w-12 h-12 text-sm', nameSize: 'text-xs', roleSize: 'text-[9px]', deptSize: 'text-[8px]', footerSize: 'text-[8px]' },
    standard: { width: '310px', padding: 'p-5', qrSize: 'w-36 h-36', avatarSize: 'w-16 h-16 text-base', nameSize: 'text-sm', roleSize: 'text-[11px]', deptSize: 'text-[9px]', footerSize: 'text-[9px]' },
    large: { width: '370px', padding: 'p-6', qrSize: 'w-44 h-44', avatarSize: 'w-20 h-20 text-lg', nameSize: 'text-base', roleSize: 'text-xs', deptSize: 'text-[10px]', footerSize: 'text-[10px]' }
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
            className={`bg-white text-slate-950 rounded-2xl ${previewSizes.padding} border border-slate-300 shadow-lg relative overflow-hidden flex flex-col items-center text-center select-none transition-all duration-300`}
          >
            {/* Top Black Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-950" />

            {/* Company Title */}
            <div className="w-full flex items-center justify-between border-b border-slate-950 pb-2.5 mb-2.5">
              <span className="text-[10px] font-black tracking-wide text-slate-950 uppercase truncate max-w-[170px]">
                {companyName}
              </span>
              <span className="text-[8px] font-black bg-slate-950 text-white px-1.5 py-0.5 rounded">
                ПРОПУСК
              </span>
            </div>

            {/* Employee Photo / Avatar */}
            <div className="relative my-1">
              <div className={`${previewSizes.avatarSize} rounded-md bg-slate-100 text-slate-950 flex items-center justify-center font-black border border-slate-950 overflow-hidden`}>
                {employee.avatarUrl ? (
                  <img 
                    src={employee.avatarUrl} 
                    alt={employee.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'СП'
                )}
              </div>
            </div>

            {/* Employee Name & Position */}
            <div className="mt-2 mb-2 w-full px-1">
              <h3 className={`${previewSizes.nameSize} font-black text-slate-950 tracking-tight leading-tight uppercase`}>
                {employee.name}
              </h3>
              <div className={`${previewSizes.roleSize} font-bold text-slate-900 mt-0.5`}>
                {roleTitle}
              </div>
              <div className={`${previewSizes.deptSize} text-slate-500 font-medium`}>
                {departmentTitle}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-1.5 rounded-lg border border-slate-950 mb-2.5 flex flex-col items-center">
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
              <div className="mt-0.5 text-[8px] font-mono font-bold text-slate-950 tracking-wider">
                КЛЮЧ БЫСТРОГО ВХОДА
              </div>
            </div>

            {/* Badge Footer Info */}
            <div className="w-full border-t border-slate-950 pt-2 flex items-center justify-between text-[8px] font-mono text-slate-950">
              <div>
                ID: <strong>{employee.id}</strong>
              </div>
              <div className="flex items-center gap-1 font-bold">
                ✓ Авторизован
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

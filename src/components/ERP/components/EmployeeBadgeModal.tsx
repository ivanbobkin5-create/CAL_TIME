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
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
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
      const badgeEl = document.getElementById('printable-employee-badge');
      if (!badgeEl) {
        window.print();
        return;
      }

      // Create a hidden printing iframe to avoid parent iframe/visibility clipping issues
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
                  size: 85mm 135mm;
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: 4mm;
                  background: #ffffff;
                  display: flex;
                  justify-content: center;
                  align-items: flex-start;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .badge-card {
                  width: 77mm;
                  min-height: 125mm;
                  background: #0f172a !important;
                  color: #ffffff !important;
                  border-radius: 5mm;
                  padding: 4.5mm;
                  border: 2px solid #1e293b;
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
                  background: linear-gradient(90deg, #3b82f6, #6366f1, #06b6d4);
                  position: absolute;
                  top: 0;
                  left: 0;
                }
                .company-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid rgba(255,255,255,0.15);
                  padding-bottom: 2mm;
                  margin-top: 1mm;
                  margin-bottom: 3mm;
                }
                .company-name {
                  font-size: 10px;
                  font-weight: 900;
                  text-transform: uppercase;
                  color: #f1f5f9;
                  letter-spacing: 0.5px;
                }
                .badge-tag {
                  font-size: 8px;
                  font-weight: 800;
                  background: rgba(99, 102, 241, 0.3);
                  color: #a5b4fc;
                  padding: 1px 6px;
                  border-radius: 10px;
                  border: 1px solid rgba(99, 102, 241, 0.4);
                }
                .avatar {
                  width: 18mm;
                  height: 18mm;
                  border-radius: 4mm;
                  background: #3b82f6;
                  color: #ffffff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  font-weight: 900;
                  margin-bottom: 2mm;
                  border: 2px solid rgba(255,255,255,0.3);
                }
                .emp-name {
                  font-size: 13px;
                  font-weight: 900;
                  color: #ffffff;
                  text-transform: uppercase;
                  line-height: 1.2;
                  margin-bottom: 1mm;
                }
                .emp-role {
                  font-size: 10px;
                  font-weight: 700;
                  color: #818cf8;
                  margin-bottom: 0.5mm;
                }
                .emp-dept {
                  font-size: 8.5px;
                  color: #94a3b8;
                  margin-bottom: 2.5mm;
                }
                .qr-box {
                  background: #ffffff;
                  padding: 2mm;
                  border-radius: 3mm;
                  margin-bottom: 2.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .qr-img {
                  width: 38mm;
                  height: 38mm;
                  object-fit: contain;
                }
                .qr-label {
                  font-size: 7.5px;
                  font-weight: 800;
                  color: #334155;
                  font-family: monospace;
                  margin-top: 1mm;
                }
                .footer-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-top: 1px solid rgba(255,255,255,0.15);
                  padding-top: 2mm;
                  font-size: 8px;
                  font-family: monospace;
                  color: #94a3b8;
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
                  ${employee.avatarUrl ? `<img src="${employee.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4mm;" />` : (employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'СП')}
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
                  <div style="color:#34d399;">✓ Авторизован</div>
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fullQrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white">
      {/* Print styles */}
      <style>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-employee-badge, #printable-employee-badge * {
            visibility: visible !important;
          }
          #printable-employee-badge {
            position: absolute !important;
            left: 50% !important;
            top: 20mm !important;
            transform: translateX(-50%) !important;
            width: 85mm !important;
            max-width: 85mm !important;
            min-height: 130mm !important;
            height: auto !important;
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
            border-radius: 6mm !important;
            padding: 6mm !important;
            margin: 0 auto !important;
            background: #0f172a !important;
            color: #ffffff !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between no-print border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Карточка сотрудника и QR-бейдж
              </h2>
              <p className="text-xs text-slate-500">
                Персональный бейдж для быстрого входа без логина и пароля
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

        {/* Badge Card Container */}
        <div className="flex flex-col items-center justify-center py-2">
          <div
            id="printable-employee-badge"
            ref={badgeCardRef}
            className="w-full max-w-[340px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 border-2 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center text-center select-none"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />
            
            {/* Background subtle badge watermark */}
            <div className="absolute -right-8 -bottom-8 opacity-5 text-white pointer-events-none">
              <Factory className="w-48 h-48" />
            </div>

            {/* Company Title */}
            <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
                  ERP
                </div>
                <span className="text-[11px] font-black tracking-wide text-slate-200 uppercase truncate max-w-[170px]">
                  {companyName}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                ПРОПУСК
              </span>
            </div>

            {/* Employee Photo / Avatar */}
            <div className="relative my-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center text-xl font-black shadow-lg border-2 border-white/20">
                {employee.avatarUrl ? (
                  <img 
                    src={employee.avatarUrl} 
                    alt={employee.name} 
                    className="w-full h-full object-cover rounded-2xl" 
                  />
                ) : (
                  employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'СП'
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white" title="Активный сотрудник">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            {/* Employee Name & Position */}
            <div className="mt-2.5 mb-3 w-full px-2">
              <h3 className="text-base font-black text-white tracking-tight leading-tight uppercase">
                {employee.name}
              </h3>
              <div className="text-xs font-bold text-indigo-400 mt-0.5">
                {roleTitle}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {departmentTitle}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-2.5 rounded-2xl shadow-inner border-2 border-slate-200 mb-3 flex flex-col items-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR бейдж ${employee.name}`} 
                  className="w-40 h-40 object-contain rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-slate-50 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
              <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 tracking-wider">
                КЛЮЧ БЫСТРОГО ВХОДА
              </div>
            </div>

            {/* Badge Footer Info */}
            <div className="w-full border-t border-slate-800/80 pt-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <div>
                ID: <strong className="text-slate-200">{employee.id}</strong>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Авторизован</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print space-y-3 pt-2">
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

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Как работает быстрый вход:
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Сотрудник прикладывает этот QR-код к аппаратному сканеру на входе в цех или нажимает «Вход по бейджу» на экране логина. Система мгновенно распознает сотрудника без ввода почты и пароля.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

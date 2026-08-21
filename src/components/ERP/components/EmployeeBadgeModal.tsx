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
    window.print();
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
          body * {
            visibility: hidden;
          }
          #printable-employee-badge, #printable-employee-badge * {
            visibility: visible;
          }
          #printable-employee-badge {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 85mm !important;
            height: 120mm !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            padding: 5mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
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

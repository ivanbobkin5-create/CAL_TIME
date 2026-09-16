import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Wrench, 
  QrCode, 
  Sparkles, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { ERPEmployee } from '../types';

interface InstallerLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: ERPEmployee;
  aliasOrId?: string;
  companyName?: string;
}

export const InstallerLinkModal: React.FC<InstallerLinkModalProps> = ({
  isOpen,
  onClose,
  employee,
  aliasOrId = 'company',
  companyName = 'Мебельное производство'
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const fullInstallerUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/${aliasOrId}/erp/installer/${employee.id}`;
  }, [aliasOrId, employee.id]);

  useEffect(() => {
    if (!isOpen || !fullInstallerUrl) return;

    let isMounted = true;
    QRCode.toDataURL(fullInstallerUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#0e7490',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fullInstallerUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullInstallerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-cyan-600/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                Мобильное рабочее место
              </span>
              <h3 className="font-black text-slate-900 text-base">
                {employee.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-cyan-50/80 rounded-2xl border border-cyan-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold text-cyan-900 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-cyan-600" />
            <span>Персональная ссылка сборщика мебели</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            По этой ссылка сборщик заходит со своего смартфона без пароля, видит предложенные заказы, согласует дату и время выезда с клиентом и отмечает завершение монтажа.
          </p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-40 h-40 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Отсканируйте камерой смартфона для быстрого входа
            </div>
          </div>
        )}

        {/* Link Box & Copy */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Ссылка на мобильный кабинет:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullInstallerUrl}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none select-all"
            />

            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <a
            href={fullInstallerUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
            <span>Открыть страницу</span>
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

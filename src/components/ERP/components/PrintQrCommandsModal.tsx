import React, { useRef } from 'react';
import { X, Printer, QrCode, Sparkles } from 'lucide-react';

interface PrintQrCommandsModalProps {
  isOpen: boolean;
  qrCommands: Array<{ id: string; commandKey: string; name: string; description?: string }>;
  companyTitle?: string;
  onClose: () => void;
}

export const PrintQrCommandsModal: React.FC<PrintQrCommandsModalProps> = ({
  isOpen,
  qrCommands,
  companyTitle = 'Мебельное производство',
  onClose
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-300 space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Печать QR-команд управления цехом (А4)
              </h3>
              <p className="text-[11px] text-slate-500">
                Распечатайте и наклейте эти QR-коды возле рабочих столов и станков
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
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

        {/* Printable Content */}
        <div className="overflow-y-auto flex-1 bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-inner text-slate-900 font-sans print:p-0 print:border-none print:shadow-none">
          <div ref={printAreaRef} className="space-y-6 max-w-[210mm] mx-auto text-xs leading-relaxed">
            
            <div className="text-center pb-4 border-b-2 border-slate-900">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{companyTitle}</span>
              <h1 className="text-xl font-black text-slate-900 uppercase">
                БЫСТРЫЕ QR-КОМАНДЫ УПРАВЛЕНИЯ
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Сканируйте эти кодовые маркеры стандартным сканером штрихкодов без кликов мыши
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 print:grid-cols-2">
              {qrCommands.map((cmd) => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(cmd.commandKey)}`;

                return (
                  <div
                    key={cmd.id}
                    className="p-5 border-2 border-slate-900 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-between text-center space-y-3"
                  >
                    <div className="w-full">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                        {cmd.commandKey}
                      </span>
                      <h2 className="text-base font-black text-slate-900 mt-2 leading-tight">
                        {cmd.name}
                      </h2>
                      {cmd.description && (
                        <p className="text-[11px] text-slate-600 mt-1 font-medium">{cmd.description}</p>
                      )}
                    </div>

                    <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm">
                      <img
                        src={qrUrl}
                        alt={cmd.name}
                        className="w-36 h-36 object-contain"
                      />
                    </div>

                    <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                      Сканируйте для мгновенного действия
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

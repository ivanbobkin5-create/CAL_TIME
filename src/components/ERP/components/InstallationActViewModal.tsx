import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  Coins, 
  FileText, 
  Phone, 
  MapPin, 
  Calendar, 
  Check, 
  DollarSign, 
  Sparkles,
  Download
} from 'lucide-react';
import { 
  InstallationTask, 
  InstallationActSettings 
} from '../types';
import { generateActFullText, calculateWarrantyDate } from '../utils/installationActUtils';

interface InstallationActViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: InstallationTask;
  actSettings?: InstallationActSettings;
  companyName?: string;
  onConfirmComplete?: (notes: string, paymentReceived: boolean) => void;
  isReadOnly?: boolean;
}

export const InstallationActViewModal: React.FC<InstallationActViewModalProps> = ({
  isOpen,
  onClose,
  task,
  actSettings,
  companyName = 'Мебельное производство',
  onConfirmComplete,
  isReadOnly = false
}) => {
  if (!isOpen) return null;

  const [paymentReceived, setPaymentReceived] = useState<boolean>(task.paymentStatus === 'paid');
  const [notes, setNotes] = useState<string>(task.comment || '');

  const completedDate = task.completedDate || new Date().toISOString().split('T')[0];
  const warrantyYears = actSettings?.warrantyYears || 2;
  const warrantyUntilFormatted = calculateWarrantyDate(completedDate, warrantyYears);

  const assemblyPrice = task.assemblyPrice || 0;
  const extraWorksTotal = task.extraWorksTotal || 0;
  const grandTotal = assemblyPrice + extraWorksTotal;

  const actText = generateActFullText(task, actSettings, companyName);

  const handlePrint = () => {
    window.print();
  };

  const handleComplete = () => {
    if (onConfirmComplete) {
      onConfirmComplete(notes, paymentReceived);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden border border-slate-200 print:shadow-none print:border-none print:max-w-none print:w-full">
        
        {/* Top Header Bar (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Заказ №{task.orderNumber}
              </div>
              <h3 className="font-black text-white text-base">
                Акт приема-передачи выполненных работ
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Печать</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable) */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 text-xs leading-relaxed font-sans overflow-y-auto max-h-[75vh] print:max-h-none print:p-0">
          
          {/* Act Document Header */}
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {companyName}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
              {actSettings?.actHeaderTitle || 'АКТ ПРИЕМА-ПЕРЕДАЧИ ВЫПОЛНЕННЫХ РАБОТ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ'}
            </h2>
            <div className="text-xs font-mono font-bold text-slate-600">
              по Заказу № {task.orderNumber} от {completedDate}
            </div>
          </div>

          {/* Client & Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Заказчик:</span>
              <span className="font-bold text-slate-900 text-sm">{task.clientName}</span>
              {task.clientPhone && (
                <div className="text-slate-600 font-mono mt-0.5">{task.clientPhone}</div>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Адрес монтажа:</span>
              <span className="font-medium text-slate-900">{task.address || 'Не указан'}</span>
              {(task.floor || task.hasElevator) && (
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Этаж: {task.floor || '—'}, Лифт: {task.hasElevator ? 'Есть' : 'Нет'}
                </div>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Исполнитель / Сборщик:</span>
              <span className="font-bold text-slate-800">{task.installerEmployeeName || 'Сборщик мебели'}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Дата сдачи монтажа:</span>
              <span className="font-bold text-slate-900 font-mono">{completedDate}</span>
            </div>
          </div>

          {/* Preamble Intro Text */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
            {actText.introText}
          </div>

          {/* Completed Works Table */}
          <div className="space-y-2">
            <div className="font-black text-xs uppercase tracking-wider text-slate-700">
              Перечень выполненных работ и калькуляция:
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Вид выполненной работы</th>
                    <th className="p-3 w-20 text-center">Ед.</th>
                    <th className="p-3 w-20 text-center">Кол-во</th>
                    <th className="p-3 w-28 text-right">Цена (₽)</th>
                    <th className="p-3 w-28 text-right">Сумма (₽)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Primary Assembly */}
                  <tr className="bg-slate-50/50 font-medium">
                    <td className="p-3 font-bold text-slate-900">
                      Сборка и монтаж основного гарнитура (по договору)
                    </td>
                    <td className="p-3 text-center text-slate-500">услуга</td>
                    <td className="p-3 text-center font-mono">1</td>
                    <td className="p-3 text-right font-mono">{assemblyPrice.toLocaleString('ru-RU')} ₽</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{assemblyPrice.toLocaleString('ru-RU')} ₽</td>
                  </tr>

                  {/* Performed Extra Works */}
                  {task.performedExtraWorks && task.performedExtraWorks.map((ew, i) => (
                    <tr key={ew.id || i} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">
                        {ew.name}
                      </td>
                      <td className="p-3 text-center text-slate-500">{ew.unit}</td>
                      <td className="p-3 text-center font-mono font-bold">{ew.quantity}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{(ew.price || 0).toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900">{(ew.totalPrice || 0).toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td colSpan={4} className="p-3.5 text-right uppercase text-[11px] tracking-wider">
                      Итого к оплате за монтаж и доп. работы:
                    </td>
                    <td className="p-3.5 text-right font-mono text-base text-amber-400">
                      {(grandTotal || 0).toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Warranty Terms & Guarantee */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
            <div className="font-black text-xs flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Гарантийные обязательства</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium whitespace-pre-line">
              {actText.termsText}
            </p>
            <div className="text-[11px] font-bold text-emerald-800 pt-1 border-t border-emerald-200/80">
              Период гарантии: с {completedDate} по <span className="underline font-mono text-emerald-950">{actText.warrantyUntilFormatted}</span> ({warrantyYears} года)
            </div>
          </div>

          {/* Signatures Block */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
            <div className="space-y-4">
              <div className="font-bold text-slate-700">Исполнитель (Сборщик):</div>
              <div className="pt-8 border-b border-slate-400 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Подпись / ФИО</span>
                <span className="font-bold text-slate-900">{task.installerEmployeeName || '_________________'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="font-bold text-slate-700">Заказчик (Работу принял):</div>
              <div className="pt-8 border-b border-slate-400 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Подпись / ФИО</span>
                <span className="font-bold text-slate-900">{task.clientName}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Interactive Controls for Mobile Assembler */}
        {!isReadOnly && onConfirmComplete && (
          <div className="p-4 bg-slate-900 text-white space-y-3 shrink-0 print:hidden border-t border-slate-800">
            <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl cursor-pointer border border-slate-700">
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="w-5 h-5 text-emerald-500 rounded cursor-pointer accent-emerald-500"
              />
              <div className="text-xs">
                <div className="font-bold text-emerald-400">
                  Оплата в размере {(grandTotal || 0).toLocaleString('ru-RU')} ₽ получена от клиента
                </div>
                <div className="text-[10px] text-slate-400">
                  Отметьте для подтверждения кассового отчета
                </div>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Завершить монтаж и отправить Акт</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

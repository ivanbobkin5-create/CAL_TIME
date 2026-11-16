import React, { useState } from 'react';
import { AlertTriangle, X, Send, Camera, ShieldAlert } from 'lucide-react';
import { InstallationTask } from '../types';
import { InstallerPhotoUploader } from './InstallerPhotoUploader';

interface InstallerReclamationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: InstallationTask;
  onSubmitReclamationSignal: (reason: string, details: string, photos: string[]) => void;
  photoStorageTarget?: 'yandex_disk' | 'bitrix24' | 'both';
  yandexDiskToken?: string;
  yandexDiskRootFolder?: string;
  bitrixWebhookUrl?: string;
}

export const InstallerReclamationModal: React.FC<InstallerReclamationModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmitReclamationSignal,
  photoStorageTarget = 'yandex_disk',
  yandexDiskToken,
  yandexDiskRootFolder,
  bitrixWebhookUrl
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Пожалуйста, укажите причину рекламации или описание брака.');
      return;
    }

    setIsSubmitting(true);
    onSubmitReclamationSignal(reason.trim(), details.trim(), photos);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-rose-900 text-white p-4 flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-800/80 text-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Сигнал о рекламации</h3>
              <p className="text-[11px] text-rose-200">Заказ №{task.orderNumber} — {task.clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-800 text-rose-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Информация для сборщика:</span>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Сигнальный запрос передается напрямую руководству цеха и технологу. Статус задачи в ERP не отменяется автоматически — решение по переделке или штрафу принимает начальник производства.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Причина рекламации / Суть проблемы <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: Скол на левом фасаде кухни, повреждена кромка столешницы, нехватка петель Blum..."
              rows={3}
              required
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
            />
          </div>

          {/* Details / Module Numbers */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Детали, пакеты или модули с браком (если есть):
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Например: Модуль №4, деталь №12 (боковина)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
            />
          </div>

          {/* Photos Uploader */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <InstallerPhotoUploader
              photos={photos}
              maxPhotos={5}
              onPhotosChange={setPhotos}
              title="Фотографии дефекта / брака"
              orderNumber={task.orderNumber}
              photoStorageTarget={photoStorageTarget}
              yandexDiskToken={yandexDiskToken}
              yandexDiskRootFolder={yandexDiskRootFolder}
              bitrixWebhookUrl={bitrixWebhookUrl}
              bitrixTaskId={task.bitrixTaskId}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Передать рекламацию</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, ZoomIn, X, AlertCircle, UploadCloud, FolderPlus } from 'lucide-react';
import { PhotoGalleryModal } from './PhotoGalleryModal';

interface InstallerPhotoUploaderProps {
  photos: string[];
  maxPhotos?: number;
  readOnly?: boolean;
  onPhotosChange: (newPhotos: string[]) => void;
  title?: string;
  photoStorageTarget?: 'yandex_disk' | 'bitrix24' | 'both';
  yandexDiskToken?: string;
  yandexDiskRootFolder?: string;
  bitrixWebhookUrl?: string;
  bitrixTaskId?: string;
  orderNumber?: string;
}

export const InstallerPhotoUploader: React.FC<InstallerPhotoUploaderProps> = ({
  photos = [],
  maxPhotos = 10,
  readOnly = false,
  onPhotosChange,
  title = 'Фотографии монтажа',
  photoStorageTarget = 'yandex_disk',
  yandexDiskToken,
  yandexDiskRootFolder,
  bitrixWebhookUrl,
  bitrixTaskId,
  orderNumber
}) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      alert(`Вы можете прикрепить не более ${maxPhotos} фотографий. Доступно место для ${maxPhotos - photos.length} фото.`);
    }

    const availableSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    setIsCompressing(true);

    try {
      const newPhotoUrls: string[] = [];

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setUploadStatusText(`Сжатие фото ${i + 1} из ${filesToProcess.length}...`);
        const compressedBase64 = await compressImage(file);

        let yandexResultUrl: string | null = null;
        let bitrixUploaded = false;

        // 1. Upload to Yandex.Disk if token is present
        if ((photoStorageTarget === 'yandex_disk' || photoStorageTarget === 'both') && yandexDiskToken) {
          setUploadStatusText(`Загрузка на Яндекс.Диск (${i + 1}/${filesToProcess.length})...`);
          try {
            const cleanSubfolder = orderNumber ? `Заказ_${orderNumber.replace(/[^a-zA-Z0-9_\-\u0400-\u04FF]/g, '_')}` : 'Общие_Фото';
            const res = await fetch('/api/yandex-disk/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: yandexDiskToken,
                rootFolder: yandexDiskRootFolder || '/ERP_Фотоотчеты',
                subFolder: cleanSubfolder,
                fileName: `photo_${Date.now()}_${i + 1}.jpg`,
                fileBase64: compressedBase64
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.url) {
                yandexResultUrl = data.url;
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              console.warn('Yandex Disk upload warning:', errData.error || res.statusText);
            }
          } catch (cloudErr) {
            console.warn('Fallback due to cloud error:', cloudErr);
          }
        }

        // 2. Upload to Bitrix24 if webhook is present
        if ((photoStorageTarget === 'bitrix24' || photoStorageTarget === 'both') && bitrixWebhookUrl) {
          setUploadStatusText(`Отправка в Битрикс24 (${i + 1}/${filesToProcess.length})...`);
          try {
            const res = await fetch('/api/bitrix24/upload-task-photo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: bitrixWebhookUrl,
                orderNumber: orderNumber || 'БЕЗ_НОМЕРА',
                bitrixTaskId,
                fileName: `photo_${Date.now()}_${i + 1}.jpg`,
                fileBase64: compressedBase64
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                bitrixUploaded = true;
              }
            }
          } catch (b24Err) {
            console.warn('Bitrix24 upload error:', b24Err);
          }
        }

        // Prefer Yandex URL if uploaded, or fallback to compressed base64 for display in ERP
        const finalUrl = yandexResultUrl || compressedBase64;
        newPhotoUrls.push(finalUrl);
      }

      onPhotosChange([...photos, ...newPhotoUrls]);
    } catch (err) {
      console.error('Error processing photos:', err);
      alert('Ошибка при загрузке фото. Попробуйте еще раз.');
    } finally {
      setIsCompressing(false);
      setUploadStatusText('');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (readOnly) return;
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const openLightbox = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryOpen(true);
  };

  // Helper to compress images on device before converting to base64
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1440px
          const maxDim = 1440;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-indigo-600" />
          <span>{title} ({photos.length}/{maxPhotos})</span>
        </label>
        {isCompressing && (
          <span className="text-[10px] text-indigo-600 animate-pulse font-bold flex items-center gap-1">
            <UploadCloud className="w-3.5 h-3.5" />
            {uploadStatusText || 'Загрузка фото...'}
          </span>
        )}
      </div>

      {/* Grid of Attached Photos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
            <img 
              src={photo} 
              alt={`Фото ${idx + 1}`} 
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => openLightbox(idx)}
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
              <button
                type="button"
                onClick={() => openLightbox(idx)}
                className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                title="Увеличить (Слайдер)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[9px] font-mono">
              #{idx + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Two Action Buttons for Upload: 1. Camera, 2. Gallery from device */}
      {!readOnly && photos.length < maxPhotos && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* 1. Camera Snap Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isCompressing}
            className="py-2.5 px-3 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold shadow-2xs active:scale-98"
          >
            <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Сделать фото</span>
          </button>

          {/* 2. Gallery / Device files Button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isCompressing}
            className="py-2.5 px-3 rounded-2xl border-2 border-dashed border-cyan-300 hover:border-cyan-500 bg-cyan-50/50 hover:bg-cyan-50 text-cyan-800 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold shadow-2xs active:scale-98"
          >
            <ImageIcon className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="truncate">Из галереи</span>
          </button>

          {/* Hidden inputs */}
          <input 
            ref={cameraInputRef}
            type="file" 
            accept="image/*" 
            capture="environment" 
            multiple 
            onChange={handleFileChange}
            className="hidden" 
            disabled={isCompressing}
          />
          <input 
            ref={galleryInputRef}
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange}
            className="hidden" 
            disabled={isCompressing}
          />
        </div>
      )}

      {photos.length === 0 && readOnly && (
        <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          Фотографии не прикреплены
        </div>
      )}

      {/* Rich Photo Carousel Lightbox Modal */}
      <PhotoGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={photos}
        initialIndex={galleryInitialIndex}
        title={title}
        orderNumber={orderNumber}
      />
    </div>
  );
};

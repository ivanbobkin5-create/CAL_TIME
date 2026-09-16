import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, ZoomIn, X, AlertCircle } from 'lucide-react';

interface InstallerPhotoUploaderProps {
  photos: string[];
  maxPhotos?: number;
  readOnly?: boolean;
  onPhotosChange: (newPhotos: string[]) => void;
  title?: string;
}

export const InstallerPhotoUploader: React.FC<InstallerPhotoUploaderProps> = ({
  photos = [],
  maxPhotos = 10,
  readOnly = false,
  onPhotosChange,
  title = 'Фотографии монтажа'
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      alert(`Вы можете прикрепить не более ${maxPhotos} фотографий. Доступно место для ${maxPhotos - photos.length} фото.`);
    }

    const availableSlots = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    setIsCompressing(true);

    try {
      const newPhotoUrls: string[] = [];

      for (const file of filesToProcess) {
        const compressedBase64 = await compressImage(file);
        newPhotoUrls.push(compressedBase64);
      }

      onPhotosChange([...photos, ...newPhotoUrls]);
    } catch (err) {
      console.error('Error processing photos:', err);
      alert('Ошибка при загрузке фото. Попробуйте еще раз.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (readOnly) return;
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
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

          // Max dimension 1280px
          const maxDim = 1280;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-indigo-600" />
          <span>{title} ({photos.length}/{maxPhotos})</span>
        </label>
        {isCompressing && (
          <span className="text-[10px] text-indigo-600 animate-pulse font-bold">
            Обработка фото...
          </span>
        )}
      </div>

      {/* Grid of Photos */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
            <img 
              src={photo} 
              alt={`Фото ${idx + 1}`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
              <button
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white transition-colors cursor-pointer"
                title="Увеличить"
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

        {/* Upload Button Card */}
        {!readOnly && photos.length < maxPhotos && (
          <label className="aspect-square rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-indigo-600 p-2 text-center">
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold leading-tight">Добавить фото</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              multiple 
              onChange={handleFileChange}
              className="hidden" 
              disabled={isCompressing}
            />
          </label>
        )}
      </div>

      {photos.length === 0 && readOnly && (
        <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          Фотографии не прикреплены
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto} 
              alt="Увеличенное фото" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-700 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

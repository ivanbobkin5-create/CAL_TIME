import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  Maximize2,
  Minimize2,
  Image as ImageIcon
} from 'lucide-react';

interface PhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  title?: string;
  orderNumber?: string;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  title = 'Фотоотчет',
  orderNumber
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
    }
  }, [isOpen, initialIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Touch Swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext(); // swipe left -> next
      } else {
        handlePrev(); // swipe right -> prev
      }
    }
    setTouchStartX(null);
  };

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handleDownload = () => {
    if (!currentPhoto) return;
    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = `photo_${orderNumber || 'монтаж'}_${currentIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-fade-in select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Controls Header */}
      <div className="w-full max-w-5xl flex items-center justify-between text-white py-2 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-white">
              {title} {orderNumber ? `— Заказ №${orderNumber}` : ''}
            </h4>
            <div className="text-xs text-slate-400 font-mono font-bold">
              Фото {currentIndex + 1} из {photos.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Скачать фото"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open full in new tab */}
          <a
            href={currentPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Открыть оригинал"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Свернуть' : 'Во весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage with Nav Arrows */}
      <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0 my-2">
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-1 sm:left-4 z-20 p-3 sm:p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl transition-all hover:scale-110 cursor-pointer border border-white/10"
            title="Предыдущее фото (Стрелка влево)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Current Image */}
        <div className="w-full h-full flex items-center justify-center p-2">
          <img
            src={currentPhoto}
            alt={`Фото ${currentIndex + 1}`}
            className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl transition-all duration-200 border border-slate-800"
          />
        </div>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-1 sm:right-4 z-20 p-3 sm:p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl transition-all hover:scale-110 cursor-pointer border border-white/10"
            title="Следующее фото (Стрелка вправо)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {photos.length > 1 && (
        <div className="w-full max-w-5xl py-2 flex items-center justify-center gap-2 overflow-x-auto px-4 z-10">
          {photos.map((ph, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/30 opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={ph} alt={`Миниатюра ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/70 text-white text-[9px] font-mono rounded">
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

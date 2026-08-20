import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  X, 
  Flashlight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Layers,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';

interface MobileCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  subtitle?: string;
}

export const MobileCameraScannerModal: React.FC<MobileCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Сканирование камерой телефона',
  subtitle = 'Наведите камеру на QR-код или штрихкод бирки детали'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState<{ code: string; timestamp: string } | null>(null);
  const [scannedHistory, setScannedHistory] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'mobile-html5-camera-reader';
  const lastScannedTimeRef = useRef<number>(0);

  // Play audio on successful mobile scan
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      // Mobile vibration feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch (e) {
      // ignore
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return { width: Math.min(qrboxSize, 320), height: Math.min(Math.floor(qrboxSize * 0.8), 240) };
        },
        aspectRatio: 1.333
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          const now = Date.now();
          // Debounce same code within 1.5 seconds to avoid repeated triggers
          if (decodedText === lastScanned?.code && now - lastScannedTimeRef.current < 1500) {
            return;
          }

          lastScannedTimeRef.current = now;
          playBeep();
          
          const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastScanned({ code: decodedText, timestamp: timeStr });
          setScannedHistory(prev => [decodedText, ...prev.slice(0, 9)]);

          // Call the onScan callback
          onScan(decodedText);
        },
        (errorMessage) => {
          // Frame error (normal when no QR code in frame)
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const track = (html5QrCode as any).getRunningTrack?.() || (html5QrCode as any).localMediaStream?.getVideoTracks?.()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        }
      } catch (e) {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Не удалось запустить камеру';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Доступ к камере отклонен. Разрешите доступ к камере в настройках браузера.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setCameraError('Камера не найдена на этом устройстве.');
      } else {
        setCameraError(`Ошибка камеры: ${msg}`);
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await stopScanner();
    setTimeout(() => {
      startScanner();
    }, 150);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                  Live HD
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Закрыть сканер"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[280px] sm:min-h-[340px]">
          {/* HTML5 QR Container */}
          <div id={readerElementId} className="w-full h-full object-cover" />

          {/* Laser Scanning Line Animation */}
          {isScanning && !cameraError && (
            <div className="absolute inset-x-0 pointer-events-none flex flex-col items-center justify-center h-full">
              <div className="w-[80%] max-w-[280px] h-[180px] border-2 border-dashed border-indigo-400/80 rounded-2xl relative overflow-hidden shadow-[0_0_25px_rgba(99,102,241,0.3)]">
                {/* Red/Cyan Laser beam moving up and down */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#f43f5e] animate-pulse transition-all"
                  style={{
                    animation: 'laserScan 2s ease-in-out infinite alternate'
                  }}
                />
                <style>{`
                  @keyframes laserScan {
                    0% { top: 5%; }
                    100% { top: 95%; }
                  }
                `}</style>
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
              </div>
              <div className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[11px] font-bold text-slate-300 border border-white/10">
                Поместите штрихкод или QR детали в рамку
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 p-6 bg-slate-950/90 flex flex-col items-center justify-center text-center space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white max-w-xs">{cameraError}</div>
              <button
                onClick={startScanner}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Повторить попытку
              </button>
            </div>
          )}
        </div>

        {/* Camera Controls Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  torchOn 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Фонарик (вспышка)"
              >
                <Flashlight className="w-4 h-4" />
                <span className="text-[11px] hidden xs:inline">{torchOn ? 'Вспышка Вкл' : 'Вспышка'}</span>
              </button>
            )}

            <button
              onClick={toggleFacingMode}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Переключить камеру (задняя/передняя)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[11px] hidden xs:inline">{facingMode === 'environment' ? 'Задняя' : 'Фронтальная'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-800/50 text-slate-500'
              }`}
              title="Звук сканирования"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Режим</div>
            <div className="text-xs font-black text-indigo-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-current" /> Пакетный
            </div>
          </div>
        </div>

        {/* Live Scanned Feedback Area */}
        {lastScanned && (
          <div className="p-3 bg-emerald-950/60 border-t border-emerald-800/80 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0 truncate">
                <span className="text-emerald-300 font-bold">Распознано:</span>{' '}
                <strong className="text-white font-mono">{lastScanned.code}</strong>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono shrink-0">{lastScanned.timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  QrCode, 
  ArrowRight, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Sparkles,
  Info,
  Check,
  X,
  Lock,
  Zap,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';
import { ProductionOrder, OrderPackage, OrderPackagePart, ERPCompanySettings, ERPEmployee, ProductionStageId } from '../types';
import { PackageLabelPrintModal } from './PackageLabelPrintModal';
import { convertRuCharToEn, convertRuToEnLayout, normalizeBarcodeScan, matchDetailToScannedCode, processQRCommand } from '../utils';
import { isDetailReadyForPackaging, arePrecedingStagesCompleted, getPackagingReadinessStats } from '../utils/stageReadiness';
import { printPackageLabelDirect } from '../utils/packageLabelPrinter';

interface ERPPackagingTabProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | null;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onOpenScannerModal?: () => void;
}

export const ERPPackagingTab: React.FC<ERPPackagingTabProps> = ({
  order,
  settings,
  currentUser,
  onUpdateOrder,
  onUpdateOrderStatus,
  onOpenScannerModal
}) => {
  const [selectedPrintPkg, setSelectedPrintPkg] = useState<OrderPackage | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null);
  const [searchUnpacked, setSearchUnpacked] = useState<string>('');
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string>('all');
  
  // Current in-progress package state
  const existingPackages = order.packages || [];
  const maxPkgNum = existingPackages.reduce((max, p) => Math.max(max, p.packageNumber || 0), 0);
  const nextPkgNumber = Math.max(existingPackages.length, maxPkgNum) + 1;
  const [packageNameInput, setPackageNameInput] = useState<string>(`Место ${nextPkgNumber}`);
  const [currentBufferParts, setCurrentBufferParts] = useState<OrderPackagePart[]>([]);
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [autoPrintDirect, setAutoPrintDirect] = useState<boolean>(settings?.packageLabelSettings?.autoPrintOnCloseBox !== false);

  // Move Detail / Part Modal & Alert State
  const [movePartModal, setMovePartModal] = useState<{
    isOpen: boolean;
    sourcePkgId: string; // package.id or 'buffer'
    sourcePkgName: string;
    part: OrderPackagePart;
  } | null>(null);
  const [movePartTargetPkgId, setMovePartTargetPkgId] = useState<string>('');

  // Prominent alert for label reprinting
  const [reprintAlert, setReprintAlert] = useState<{
    isOpen: boolean;
    packages: OrderPackage[];
    message: string;
  } | null>(null);

  // Scan input & buffer for hardware barcodes
  const [scanInput, setScanInput] = useState<string>('');
  const scannerInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // All details from specification
  const allDetails = order.birkaData?.details || [];

  // Helper functions for packed quantity tracking per detail ID
  const getDetailPackedInPackagesCount = (detailId: string): number => {
    return existingPackages.reduce((sum, pkg) => {
      const pt = pkg.parts?.find(p => p.detailId === detailId);
      return sum + (pt ? (pt.quantity || 1) : 0);
    }, 0);
  };

  const getDetailBufferCount = (detailId: string): number => {
    const pt = currentBufferParts.find(p => p.detailId === detailId);
    return pt ? (pt.quantity || 1) : 0;
  };

  // Total piece counters
  const totalDetailsPieces = allDetails.reduce((sum, d) => sum + Math.max(1, d.quantity || 1), 0);
  const totalPackedPiecesInPackages = existingPackages.reduce((sum, pkg) => {
    return sum + (pkg.parts?.reduce((pSum, pt) => pSum + Math.max(1, pt.quantity || 1), 0) || 0);
  }, 0);
  const totalBufferPieces = currentBufferParts.reduce((sum, pt) => sum + Math.max(1, pt.quantity || 1), 0);
  const totalPackedPieces = totalPackedPiecesInPackages + totalBufferPieces;

  // Stage readiness calculations for Online Packaging
  const isPreviousStagesCompleted = arePrecedingStagesCompleted(order, settings);
  const readinessStats = getPackagingReadinessStats(order, settings);

  // Details with remaining unpacked pieces > 0
  const rawUnpackedDetails = allDetails
    .map(d => {
      const reqQty = Math.max(1, d.quantity || 1);
      const packedInPkgs = getDetailPackedInPackagesCount(d.id);
      const inBuffer = getDetailBufferCount(d.id);
      const remainingOutsideBuffer = Math.max(0, reqQty - packedInPkgs);
      const remainingUnpacked = Math.max(0, reqQty - packedInPkgs - inBuffer);
      return {
        ...d,
        reqQty,
        packedInPkgs,
        inBuffer,
        remainingOutsideBuffer,
        remainingUnpacked
      };
    })
    .filter(d => d.remainingUnpacked > 0);

  // Display all unpacked details
  const unpackedDetails = rawUnpackedDetails;

  // Materials list for filter
  const materialList = Array.from(new Set(allDetails.map(d => d.material || 'Без материала'))).filter(Boolean);

  // Filtered unpacked details for display
  const filteredUnpacked = unpackedDetails.filter(d => {
    const matMatches = selectedMaterialFilter === 'all' || (d.material || 'Без материала') === selectedMaterialFilter;
    const searchMatches = !searchUnpacked || 
      d.labelNumber.toLowerCase().includes(searchUnpacked.toLowerCase()) ||
      d.name.toLowerCase().includes(searchUnpacked.toLowerCase()) ||
      (d.barcode && d.barcode.toLowerCase().includes(searchUnpacked.toLowerCase()));
    return matMatches && searchMatches;
  });

  const isAllDetailsPacked = totalDetailsPieces > 0 && totalPackedPiecesInPackages >= totalDetailsPieces;

  // Feedback timer helper
  const showFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setScanFeedbackMsg({ text, type });
    setTimeout(() => {
      setScanFeedbackMsg(null);
    }, 4000);
  };

  // Add detail to current active package with quantity support
  const handleAddDetailToCurrentPackage = (detail: any, addQty: number = 1) => {
    if (!isDetailReadyForPackaging(detail, order, settings)) {
      showFeedback(`Деталь №${detail.labelNumber} ("${detail.name}") еще проходит кромление/присадку на пред. этапе и пока не готова к упаковке!`, 'error');
      return;
    }

    const reqQty = Math.max(1, detail.quantity || 1);
    const packedInPkgs = getDetailPackedInPackagesCount(detail.id);
    const inBuffer = getDetailBufferCount(detail.id);
    const remainingOutsideBuffer = Math.max(0, reqQty - packedInPkgs);

    if (remainingOutsideBuffer <= 0) {
      showFeedback(`Деталь №${detail.labelNumber} ("${detail.name}") уже полностью упакована (${packedInPkgs} из ${reqQty} шт.)!`, 'error');
      return;
    }

    if (inBuffer >= remainingOutsideBuffer) {
      showFeedback(`Все доступные детали №${detail.labelNumber} (${reqQty} шт.) уже добавлены в текущее место.`, 'info');
      return;
    }

    const qtyToAdd = Math.min(addQty, remainingOutsideBuffer - inBuffer);
    if (qtyToAdd <= 0) return;

    setCurrentBufferParts(prev => {
      const existingIndex = prev.findIndex(p => p.detailId === detail.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const item = updated[existingIndex];
        updated[existingIndex] = {
          ...item,
          quantity: (item.quantity || 1) + qtyToAdd
        };
        return updated;
      } else {
        const newPart: OrderPackagePart = {
          detailId: detail.id,
          labelNumber: detail.labelNumber,
          name: detail.name,
          material: detail.material,
          length: detail.length,
          width: detail.width,
          thickness: detail.thickness,
          quantity: qtyToAdd
        };
        return [...prev, newPart];
      }
    });

    const newBufferTotal = inBuffer + qtyToAdd;
    if (reqQty > 1) {
      showFeedback(`Деталь №${detail.labelNumber} (${newBufferTotal} из ${reqQty} шт. в месте) добавлена в ${packageNameInput}`, 'success');
    } else {
      showFeedback(`Деталь №${detail.labelNumber} ("${detail.name}") добавлена в ${packageNameInput}`, 'success');
    }
  };

  // Remove detail or decrement quantity from active buffer
  const handleRemoveFromBuffer = (detailId: string, removeAll: boolean = false) => {
    setCurrentBufferParts(prev => {
      const item = prev.find(p => p.detailId === detailId);
      if (!item) return prev;
      if (removeAll || (item.quantity || 1) <= 1) {
        return prev.filter(p => p.detailId !== detailId);
      } else {
        return prev.map(p => p.detailId === detailId ? { ...p, quantity: (p.quantity || 1) - 1 } : p);
      }
    });
  };

  // Add ALL currently filtered unpacked details to package
  const handleAddAllFilteredToBuffer = () => {
    if (filteredUnpacked.length === 0) return;
    filteredUnpacked.forEach(d => {
      handleAddDetailToCurrentPackage(d, d.remainingUnpacked);
    });
    showFeedback(`Добавлены все доступные детали в текущую упаковку`, 'success');
  };

  // Handle Scanning Barcode/QR of Detail to Pack or Command
  const handleScanCode = (code: string) => {
    setScanInput('');
    barcodeBufferRef.current = '';
    if (scannerInputRef.current) {
      scannerInputRef.current.value = '';
    }

    const cleanCode = code.trim().replace(/^#/, '');
    if (!cleanCode) return;

    // Check if it's a QR Command
    const cmdResult = processQRCommand(cleanCode, {
      onFinishPackage: () => {
        if (currentBufferParts.length > 0) {
          handleSealPackage(false);
        } else {
          showFeedback('В формируемой коробке пока нет деталей!', 'error');
        }
      }
    });

    if (cmdResult.isCommand) {
      showFeedback(cmdResult.message || 'Выполнена команда QR-кода', 'success');
      return;
    }

    const enCode = normalizeBarcodeScan(cleanCode);

    const template = settings?.birkaQrFormatTemplate;
    const orderNum = order.orderNumber || '';

    // Find detail matching using custom template & standard aliases
    const found = allDetails.find(d => {
      return matchDetailToScannedCode(cleanCode, d, template, orderNum, settings?.birkaQrMatchingMode);
    });

    if (!found) {
      showFeedback(`Деталь с кодом/номером "${cleanCode}" не найдена в заказе!`, 'error');
      return;
    }

    handleAddDetailToCurrentPackage(found);
  };

  // Global listener for barcode scanner
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showPrintModal) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
      const isScannerInput = target === scannerInputRef.current || activeEl === scannerInputRef.current;

      const isOtherInput = (target && (
        (target.tagName === 'INPUT' && target !== scannerInputRef.current) ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) || (activeEl && (
        (activeEl.tagName === 'INPUT' && activeEl !== scannerInputRef.current) ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      ));

      if (isOtherInput) return;

      if (e.key === 'F8') {
        e.preventDefault();
        if (currentBufferParts.length > 0) {
          handleSealPackage(false);
        } else {
          showFeedback('В формируемой коробке пока нет деталей! Отсканируйте деталь для упаковки.', 'error');
        }
        return;
      }

      if (e.key === 'Enter') {
        const rawCode = isScannerInput
          ? (scanInput.trim() || (scannerInputRef.current?.value || '').trim())
          : (barcodeBufferRef.current.trim() || scanInput.trim() || (scannerInputRef.current?.value || '').trim());
        const bufferedCode = normalizeBarcodeScan(rawCode);
        if (bufferedCode) {
          e.preventDefault();
          barcodeBufferRef.current = '';
          handleScanCode(bufferedCode);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isScannerInput) {
          return;
        }

        const now = Date.now();
        if (now - lastKeyTimeRef.current > 1200) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        barcodeBufferRef.current += e.key;

        setScanInput(barcodeBufferRef.current);
        scannerInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [showPrintModal, scanInput, currentBufferParts, existingPackages]);

  // Window event listener for global QR close box command
  useEffect(() => {
    const handleCloseBoxEvent = () => {
      if (currentBufferParts.length > 0) {
        handleSealPackage(false);
      } else {
        showFeedback('В формируемой коробке пока нет деталей! Отсканируйте деталь для упаковки.', 'error');
      }
    };

    window.addEventListener('erp_cmd_close_box', handleCloseBoxEvent);
    return () => window.removeEventListener('erp_cmd_close_box', handleCloseBoxEvent);
  }, [currentBufferParts, existingPackages, packageNameInput, order, currentUser, autoPrintDirect]);

  // Finish & Seal current package -> Add to order.packages and auto-print or open print modal
  const handleSealPackage = (forceOpenModal: boolean = false) => {
    if (currentBufferParts.length === 0) {
      showFeedback('Сначала добавьте или отсканируйте хотя бы одну деталь в упаковку!', 'error');
      return;
    }

    const pkgNum = existingPackages.length + 1;
    const cleanName = packageNameInput.trim() || `Место №${pkgNum}`;
    const newPkgId = `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const uniqueCode = `PKG-${order.orderNumber}-M${pkgNum}-${Date.now().toString().slice(-4)}`;

    const newPackage: OrderPackage = {
      id: newPkgId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageNumber: pkgNum,
      name: cleanName,
      type: 'details',
      code: uniqueCode,
      parts: [...currentBufferParts],
      createdAt: new Date().toISOString(),
      createdByEmployeeId: currentUser?.id,
      createdByEmployeeName: currentUser?.name || 'Мастер упаковки',
      isCompleted: true
    };

    const updatedPackages = [...existingPackages, newPackage];

    onUpdateOrder({
      ...order,
      packages: updatedPackages
    });

    // Reset buffer for next package
    setCurrentBufferParts([]);
    setPackageNameInput(`Место ${pkgNum + 1}`);

    if (autoPrintDirect && !forceOpenModal) {
      printPackageLabelDirect(order, newPackage, updatedPackages.length, settings?.packageLabelSettings);
      showFeedback(`📦 Место №${pkgNum} запечатано (${newPackage.parts.length} дет.). Этикетка отправлена на термопринтер! Готово к следующей коробке.`, 'success');
    } else {
      showFeedback(`Упаковка "${cleanName}" (${newPackage.parts.length} дет.) успешно создана!`, 'success');
      setSelectedPrintPkg(newPackage);
      setShowPrintModal(true);
    }
  };

  // Preview Draft Package label WITHOUT sealing/creating the package
  const handlePreviewDraftPackage = () => {
    if (currentBufferParts.length === 0) {
      showFeedback('В текущем формируемом месте нет деталей для предпросмотра!', 'error');
      return;
    }

    const pkgNum = existingPackages.length + 1;
    const cleanName = packageNameInput.trim() || `Место №${pkgNum}`;
    const draftPackage: OrderPackage = {
      id: 'preview-packaging-draft',
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageNumber: pkgNum,
      name: cleanName,
      type: 'details',
      code: `PKG-${order.orderNumber}-M${pkgNum}-ПРЕДПРОСМОТР`,
      parts: [...currentBufferParts],
      createdAt: new Date().toISOString(),
      createdByEmployeeId: currentUser?.id,
      createdByEmployeeName: currentUser?.name || 'Мастер упаковки',
      isCompleted: false
    };

    setSelectedPrintPkg(draftPackage);
    setShowPrintModal(true);
  };

  // Move Detail/Part between packages, buffer, or unpacked pool
  const handleMovePart = (
    sourcePkgId: string, // package.id or 'buffer'
    targetPkgId: string, // package.id or 'buffer' or 'unpacked'
    part: OrderPackagePart
  ) => {
    const affectedPackages: OrderPackage[] = [];
    let updatedPackages = [...existingPackages];

    // Case 1: Source is buffer
    if (sourcePkgId === 'buffer') {
      setCurrentBufferParts(prev => prev.filter(p => p.detailId !== part.detailId));

      if (targetPkgId !== 'unpacked' && targetPkgId !== 'buffer') {
        const targetPkg = updatedPackages.find(p => p.id === targetPkgId);
        if (targetPkg) {
          const updatedTargetPkg: OrderPackage = {
            ...targetPkg,
            parts: [...targetPkg.parts, part]
          };
          updatedPackages = updatedPackages.map(p => p.id === targetPkgId ? updatedTargetPkg : p);
          affectedPackages.push(updatedTargetPkg);
        }
      }
    } else {
      // Case 2: Source is an existing sealed package
      const sourcePkg = updatedPackages.find(p => p.id === sourcePkgId);
      if (!sourcePkg) return;

      const updatedSourcePkg: OrderPackage = {
        ...sourcePkg,
        parts: sourcePkg.parts.filter(p => p.detailId !== part.detailId)
      };
      updatedPackages = updatedPackages.map(p => p.id === sourcePkgId ? updatedSourcePkg : p);
      affectedPackages.push(updatedSourcePkg);

      if (targetPkgId === 'buffer') {
        setCurrentBufferParts(prev => [...prev, part]);
      } else if (targetPkgId === 'unpacked') {
        // Just removed from sourcePkg, naturally back in unpacked pool!
      } else {
        // Move to another existing package
        const targetPkg = updatedPackages.find(p => p.id === targetPkgId);
        if (targetPkg) {
          const updatedTargetPkg: OrderPackage = {
            ...targetPkg,
            parts: [...targetPkg.parts, part]
          };
          updatedPackages = updatedPackages.map(p => p.id === targetPkgId ? updatedTargetPkg : p);
          affectedPackages.push(updatedTargetPkg);
        }
      }
    }

    onUpdateOrder({
      ...order,
      packages: updatedPackages
    });

    setMovePartModal(null);

    // If affectedPackages contains any package, alert the employee to re-print & re-label!
    if (affectedPackages.length > 0) {
      const pkgNames = affectedPackages.map(p => `Место №${p.packageNumber} (${p.name})`).join(' и ');
      setReprintAlert({
        isOpen: true,
        packages: affectedPackages,
        message: `Содержимое упаковок (${pkgNames}) изменилось! Обязательно перепечатайте и переклейте этикетку на коробках.`
      });
    } else {
      showFeedback(`Деталь "${part.name}" перемещена.`, 'success');
    }
  };

  // Reset or explicitly start fresh package
  const handleResetOrNewPackage = () => {
    if (currentBufferParts.length > 0) {
      if (!window.confirm('В текущем формируемом месте есть вложенные детали. Очистить буфер и начать новое место?')) {
        return;
      }
    }
    setCurrentBufferParts([]);
    setPackageNameInput(`Место ${existingPackages.length + 1}`);
    showFeedback('Создана новая чистая упаковка. Сканируйте детали!', 'info');
  };

  // Delete / Unpack an existing package
  const handleUnpackPackage = (pkgId: string) => {
    if (!window.confirm('Распаковать данное место? Все вложенные детали вернутся в список неупакованных.')) {
      return;
    }

    const updatedPackages = existingPackages
      .filter(p => p.id !== pkgId)
      .map((p, idx) => ({ ...p, packageNumber: idx + 1 })); // re-index

    onUpdateOrder({
      ...order,
      packages: updatedPackages
    });

    showFeedback('Место распаковано, детали возвращены в пул.', 'info');
  };

  // Complete Packaging Stage -> Transfer to shipping
  const handleCompletePackagingStage = () => {
    if (!isPreviousStagesCompleted) {
      showFeedback(`Нельзя завершить участок упаковки! Не все детали прошли предыдущие этапы (кромление/присадка). Обработано на пред. этапах: ${readinessStats.readyCount} из ${readinessStats.totalCount} деталей.`, 'error');
      return;
    }

    if (!isAllDetailsPacked || rawUnpackedDetails.length > 0) {
      showFeedback(`Невозможно завершить участок: еще не упаковано ${rawUnpackedDetails.length} деталей!`, 'error');
      return;
    }

    onUpdateOrderStatus(order.id, 'shipping');
    showFeedback('Участок упаковки успешно завершен! Заказ передан на участок отгрузки.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Online Packaging Mode Notice Banner */}
      {!isPreviousStagesCompleted && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-5 border-2 border-indigo-400 shadow-xl space-y-3 relative overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6 text-indigo-300 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-white text-base">
                    Режим онлайн-упаковки активен
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-[10px] uppercase tracking-wide">
                    Кромление / Присадка в процессе
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                  Вы можете начать упаковку готовых деталей. Список доступных деталей пополняется автоматически в режиме онлайн по мере их сканирования и обработки на предыдущих этапах (кромка / присадка).
                </p>
              </div>
            </div>

            <div className="bg-indigo-950/80 border border-indigo-700/80 rounded-2xl px-4 py-2.5 shrink-0 text-center sm:text-right">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Готово к упаковке</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {readinessStats.readyCount} <span className="text-xs font-normal text-indigo-200">из {readinessStats.totalCount} дет.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Packaging Overview & Progress Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <Package className="w-4 h-4" /> Участок упаковки и формирования мест
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Формирование упаковок и печать QR-этикеток (120×75 мм)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Сканируйте бирки деталей для наполнения коробки/места, печатайте этикетку и клейте на упаковку.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-orange-50 border border-orange-200/80 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-orange-700 uppercase">Сформировано мест</div>
              <div className="text-xl font-black text-orange-950 font-mono">
                {existingPackages.length} <span className="text-xs font-normal text-orange-700">упак.</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Упаковано деталей</div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {totalPackedPiecesInPackages} / {totalDetailsPieces}
                <span className="text-xs font-bold ml-1.5 text-slate-500">
                  ({totalDetailsPieces > 0 ? Math.round((totalPackedPiecesInPackages / totalDetailsPieces) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className={`border rounded-2xl px-4 py-2.5 ${rawUnpackedDetails.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div className="text-[10px] font-bold uppercase">Осталось упаковать</div>
              <div className="text-xl font-black font-mono">
                {rawUnpackedDetails.reduce((sum, d) => sum + d.remainingUnpacked, 0)} <span className="text-xs font-normal">шт.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Прогресс упаковки заказа {order.orderNumber}</span>
            <span>{totalDetailsPieces > 0 ? Math.round((totalPackedPiecesInPackages / totalDetailsPieces) * 100) : 0}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
              style={{
                width: `${totalDetailsPieces > 0 ? (totalPackedPiecesInPackages / totalDetailsPieces) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Feedback Toast Notification */}
      {scanFeedbackMsg && (
        <div
          className={`p-4 rounded-2xl font-bold text-xs flex items-center justify-between gap-3 shadow-md animate-fade-in ${
            scanFeedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white'
              : scanFeedbackMsg.type === 'error'
              ? 'bg-rose-600 text-white animate-shake'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {scanFeedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : scanFeedbackMsg.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <Info className="w-5 h-5 shrink-0" />
            )}
            <span>{scanFeedbackMsg.text}</span>
          </div>
          <button onClick={() => setScanFeedbackMsg(null)} className="p-1 hover:bg-black/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Packaging Studio: Active Package Creator & Unpacked Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Package Buffer & Barcode Scanner (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Package Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-orange-200/80 shadow-md space-y-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-orange-600 text-white text-xs font-black flex items-center justify-center font-mono">
                  {nextPkgNumber}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    Формируемое место №{nextPkgNumber}
                  </h3>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Заказ №{order.orderNumber}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetOrNewPackage}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-900 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Очистить буфер и начать упаковку нового места"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600" />
                  <span>Новая коробка</span>
                </button>

                <span className="px-2.5 py-1.5 rounded-xl bg-orange-100 text-orange-800 text-[11px] font-black">
                  {currentBufferParts.length} дет.
                </span>
              </div>
            </div>

            {/* Direct Thermal Auto-print Quick Toggle */}
            <div className="p-2.5 bg-orange-50/70 border border-orange-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${autoPrintDirect ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-[11px]">
                    Прямая печать на термопринтер
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Печатать сразу по QR-команде «Закрыть коробку»
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoPrintDirect(!autoPrintDirect)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  autoPrintDirect 
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {autoPrintDirect ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>

            {/* Package Name Input with Quick Suggestion Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Название / описание места
              </label>
              <input
                type="text"
                value={packageNameInput}
                onChange={(e) => setPackageNameInput(e.target.value)}
                placeholder="например: Место 1 (Корпус низ Дуб Вотан)"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
              />

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {['Корпус', 'Фасады', 'Полки / Перегородки', 'Ящики', 'Крупногабарит', 'Цоколь и доборы'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setPackageNameInput(`Место ${nextPkgNumber} (${tag})`)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-orange-100 hover:text-orange-900 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Hardware Scanner / Keyboard Input Box */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5 font-bold text-orange-400">
                  <QrCode className="w-3.5 h-3.5" /> Сканер бирок деталей
                </span>
                {onOpenScannerModal && (
                  <button
                    type="button"
                    onClick={onOpenScannerModal}
                    className="px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                    title="Сканировать камерой"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Сканировать</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={scannerInputRef}
                  type="text"
                  lang="en"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={scanInput}
                  onChange={(e) => setScanInput(convertRuToEnLayout(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScanCode(scanInput);
                    }
                  }}
                  placeholder="Отсканируйте бирку или введите № детали..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleScanCode(scanInput)}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Вложить
                </button>
              </div>
            </div>

            {/* List of Details inside Current Buffer */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Вложенные детали в это место ({currentBufferParts.length})</span>
                {currentBufferParts.length > 0 && (
                  <button
                    onClick={() => setCurrentBufferParts([])}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Очистить всё
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {currentBufferParts.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    Коробка пуста. Сканируйте бирки или кликайте на детали справа для добавления в место.
                  </div>
                ) : (
                  currentBufferParts.map((part, idx) => (
                    <div
                      key={part.detailId || idx}
                      className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-100 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-orange-950">
                            {part.labelNumber}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {part.name}
                          </span>
                          {(part.quantity || 1) > 1 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-600 text-white font-mono font-black text-[10px]">
                              {part.quantity} шт.
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {part.length} × {part.width} × {part.thickness || 16} мм • {part.material || 'ЛДСП'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMovePartModal({
                              isOpen: true,
                              sourcePkgId: 'buffer',
                              sourcePkgName: `Формируемое место №${nextPkgNumber} (${packageNameInput})`,
                              part
                            });
                            // Default target: first existing package if available, else 'unpacked'
                            setMovePartTargetPkgId(existingPackages[0]?.id || 'unpacked');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-orange-100 hover:text-orange-800 transition-colors"
                          title="Переместить в другую упаковку"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveFromBuffer(part.detailId, false)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors"
                          title={(part.quantity || 1) > 1 ? "Убрать 1 шт. из места" : "Убрать из этого места"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Seal & Print Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleSealPackage(false)}
                disabled={currentBufferParts.length === 0}
                className="flex-1 w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Запечатать коробку и напечатать</span>
              </button>

              <button
                type="button"
                onClick={handlePreviewDraftPackage}
                disabled={currentBufferParts.length === 0}
                className="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 font-bold text-xs transition-colors cursor-pointer"
                title="Предпросмотр этикетки (без запечатывания)"
              >
                Предпросмотр
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Unpacked Parts Pool & Search (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <span>Неупакованные детали заказа</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-mono font-bold">
                    {unpackedDetails.length} шт.
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Нажмите на деталь, чтобы добавить её в текущее формируемое место.
                </p>
              </div>

              {filteredUnpacked.length > 0 && (
                <button
                  onClick={handleAddAllFilteredToBuffer}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-900 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600" />
                  <span>Добавить все показанные ({filteredUnpacked.length})</span>
                </button>
              )}
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUnpacked}
                  onChange={(e) => setSearchUnpacked(e.target.value)}
                  placeholder="Поиск по № детали, наименованию или штрихкоду..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {materialList.length > 1 && (
                <select
                  value={selectedMaterialFilter}
                  onChange={(e) => setSelectedMaterialFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="all">Все материалы ({unpackedDetails.length})</option>
                  {materialList.map(mat => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Unpacked Details List */}
            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {unpackedDetails.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="font-black text-sm">Все детали заказа упакованы!</div>
                  <div className="text-xs text-emerald-700">
                    Неупакованных позиций не осталось. Вы можете завершить участок упаковки ниже.
                  </div>
                </div>
              ) : filteredUnpacked.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  По заданному поисковому фильтру ничего не найдено.
                </div>
              ) : (
                filteredUnpacked.map(detail => {
                  const isReady = isDetailReadyForPackaging(detail, order, settings);
                  const reqQty = (detail as any).reqQty || detail.quantity || 1;
                  const remQty = (detail as any).remainingUnpacked || 1;

                  return (
                    <div
                      key={detail.id}
                      onClick={() => isReady && handleAddDetailToCurrentPackage(detail)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isReady
                          ? 'bg-white hover:bg-orange-50/70 border-slate-200/90 hover:border-orange-300 cursor-pointer group shadow-xs hover:shadow'
                          : 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl font-black font-mono text-xs flex items-center justify-center transition-colors shrink-0 ${
                          isReady ? 'bg-slate-100 group-hover:bg-orange-500 group-hover:text-white text-slate-800' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isReady ? detail.labelNumber : <Lock className="w-4 h-4 text-slate-400" />}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-xs truncate flex items-center gap-1.5 flex-wrap">
                            <span>{detail.name}</span>
                            {reqQty > 1 && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 font-mono font-black text-[10px] border border-orange-200">
                                Осталось: {remQty} из {reqQty} шт.
                              </span>
                            )}
                            {!isReady && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-200">
                                🔒 Не готова
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5 flex-wrap">
                            <span>{detail.labelNumber} • {detail.length} × {detail.width} × {detail.thickness || 16} мм</span>
                            <span>•</span>
                            <span className="text-slate-700 font-medium">{detail.material || 'ЛДСП'}</span>
                            {detail.notes && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[9px]">
                                {detail.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 shrink-0 ${
                          isReady ? 'bg-slate-100 group-hover:bg-orange-600 group-hover:text-white text-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isReady ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{isReady ? (reqQty > 1 ? 'Вложить (+1)' : 'Вложить') : 'Залочена'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Created Packages Section (All Finished Places) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span>Сформированные упаковки заказа ({existingPackages.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Все подготовленные места с QR-кодами, готовые к перемещению на склад и отгрузке.
            </p>
          </div>

          {existingPackages.length > 0 && (
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
              Всего упаковано: {totalPackedPiecesInPackages} деталей
            </div>
          )}
        </div>

        {existingPackages.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
            Пока не сформировано ни одной упаковки. Добавьте детали выше и нажмите "Завершить упаковку".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingPackages.map((pkg) => {
              const isExpanded = expandedPkgId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white font-black font-mono text-sm flex items-center justify-center shadow-sm">
                        M{pkg.packageNumber}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm leading-tight">
                          {pkg.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>{pkg.code}</span>
                          <span>•</span>
                          <span className="font-bold text-orange-700">
                            {pkg.parts.reduce((s, p) => s + (p.quantity || 1), 0)} деталей
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedPrintPkg(pkg);
                          setShowPrintModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        title="Распечатать этикетку 120х75 мм"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Этикетка</span>
                      </button>

                      <button
                        onClick={() => handleUnpackPackage(pkg.id)}
                        className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 transition-colors cursor-pointer"
                        title="Распаковать место"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Operator Info & Date */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/70">
                    <div>Упаковщик: <strong className="text-slate-700">{pkg.createdByEmployeeName || 'Мастер'}</strong></div>
                    <div>
                      {pkg.createdAt ? (!isNaN(new Date(pkg.createdAt).getTime()) ? new Date(pkg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : pkg.createdAt.slice(0, 5)) : ''}
                    </div>
                  </div>

                  {/* Expand / Collapse Parts & Hardware inside */}
                  <div className="pt-1">
                    <button
                      onClick={() => setExpandedPkgId(isExpanded ? null : pkg.id)}
                      className="w-full py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>
                        {isExpanded 
                          ? 'Скрыть состав места' 
                          : `Показать состав места (${pkg.parts.length} деталей${pkg.hardwareItems && pkg.hardwareItems.length > 0 ? `, ${pkg.hardwareItems.length} поз. фурнитуры/док.` : ''})`}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-slate-200 max-h-56 overflow-y-auto space-y-1.5 text-xs">
                        {/* Parts list */}
                        {pkg.parts.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Детали ЛДСП/МДФ:</div>
                            {pkg.parts.map((part, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-200/60 text-[11px]">
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-slate-800 truncate block">
                                    {part.labelNumber} {part.name}
                                    {(part.quantity || 1) > 1 && (
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 font-mono font-bold text-[10px]">
                                        ({part.quantity} шт.)
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-slate-500 text-[10px] block">
                                    {part.length}×{part.width} мм • {part.material || 'ЛДСП'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMovePartModal({
                                      isOpen: true,
                                      sourcePkgId: pkg.id,
                                      sourcePkgName: `Место №${pkg.packageNumber} (${pkg.name})`,
                                      part
                                    });
                                    // Default target: pick first other package, or 'buffer', or 'unpacked'
                                    const otherPkg = existingPackages.find(p => p.id !== pkg.id);
                                    setMovePartTargetPkgId(otherPkg ? otherPkg.id : 'buffer');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 text-orange-800 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                  title="Переместить деталь в другое место или в буфер"
                                >
                                  <ArrowRightLeft className="w-3 h-3 text-orange-600" />
                                  <span>Переместить</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hardware & Documents list */}
                        {pkg.hardwareItems && pkg.hardwareItems.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Фурнитура и документы в месте:</div>
                            {pkg.hardwareItems.map((hw, hIdx) => (
                              <div key={hIdx} className="flex items-center justify-between p-1.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px]">
                                <span className="font-bold text-indigo-950 truncate max-w-[200px]">
                                  {hw.name}
                                  {hw.article ? <span className="text-[10px] text-indigo-500 ml-1">({hw.article})</span> : null}
                                </span>
                                <span className="font-mono font-bold text-indigo-700 text-[11px] shrink-0">
                                  {hw.quantity} {hw.unit || 'шт'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage Finalization Action Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
            Завершение участка упаковки
          </div>
          <div className="text-base font-black">
            {isAllDetailsPacked ? (
              <span className="text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Все детали упакованы ({totalPackedPieces} из {totalDetailsPieces}) в {existingPackages.length} мест
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Осталось упаковать {unpackedDetails.length} деталей
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleCompletePackagingStage}
          disabled={!isAllDetailsPacked}
          className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Завершить упаковку и передать на отгрузку</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Move Detail Modal */}
      {movePartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                <span>Перемещение детали</span>
              </div>
              <button
                onClick={() => setMovePartModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-1">
              <div className="text-[10px] text-orange-600 font-bold uppercase">Деталь</div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {movePartModal.part.labelNumber} {movePartModal.part.name}
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                {movePartModal.part.length} × {movePartModal.part.width} × {movePartModal.part.thickness || 16} мм • {movePartModal.part.material || 'ЛДСП'}
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Текущее место: <strong className="text-slate-800">{movePartModal.sourcePkgName}</strong>
              </div>
            </div>

            {/* Target Destination Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Куда переместить деталь:
              </label>
              <select
                value={movePartTargetPkgId}
                onChange={(e) => setMovePartTargetPkgId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
              >
                <optgroup label="Сформированные упаковки">
                  {existingPackages
                    .filter(p => p.id !== movePartModal.sourcePkgId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        Место №{p.packageNumber}: {p.name} ({p.code}) — {p.parts.length} дет.
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Другие варианты">
                  <option value="buffer">В текущую формируемую коробку (Место №{nextPkgNumber})</option>
                  <option value="unpacked">Вернуть в список неупакованных деталей (распаковать)</option>
                </optgroup>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Если на коробке уже была напечатана и наклеена этикетка, после перемещения система предложит сразу распечатать обновленную этикетку с актуальным количеством и составом деталей.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMovePartModal(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleMovePart(
                  movePartModal.sourcePkgId,
                  movePartTargetPkgId,
                  movePartModal.part
                )}
                className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md shadow-orange-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Подтвердить перемещение</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label Reprint Alert Modal (Prompts employee to re-label modified boxes) */}
      {reprintAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-base">
                  ⚠️ Содержимое упаковки изменилось!
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {reprintAlert.message}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-950">
              Пожалуйста, распечатайте обновленную термоэтикетку и переклейте её на коробку, чтобы количество и список деталей на маркировке совпадали с фактическим содержимым!
            </div>

            {/* List of affected packages with instant 1-click print buttons */}
            <div className="space-y-2">
              {reprintAlert.packages.map(pkg => (
                <div
                  key={pkg.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-black text-slate-900">
                      Место №{pkg.packageNumber}: {pkg.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{pkg.code} • {pkg.parts.length} деталей</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (autoPrintDirect) {
                        printPackageLabelDirect(order, pkg, existingPackages.length, settings?.packageLabelSettings);
                        showFeedback(`🖨️ Новая этикетка для Места №${pkg.packageNumber} отправлена на печать!`, 'success');
                      } else {
                        setSelectedPrintPkg(pkg);
                        setShowPrintModal(true);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Перепечатать этикетку №{pkg.packageNumber}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReprintAlert(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Понятно, этикетка обновлена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal for Selected Package */}
      {selectedPrintPkg && (
        <PackageLabelPrintModal
          order={order}
          pkg={selectedPrintPkg}
          totalPackagesCount={existingPackages.length}
          settings={settings?.packageLabelSettings}
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrintPkg(null);
          }}
        />
      )}
    </div>
  );
};

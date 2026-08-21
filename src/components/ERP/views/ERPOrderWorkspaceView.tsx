import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  Printer, 
  Check, 
  ExternalLink, 
  Scan, 
  QrCode, 
  Scissors, 
  Layers, 
  Factory, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Volume2, 
  Tag, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  Play,
  RotateCcw,
  Box,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Trash2,
  Package,
  Wrench,
  Clock,
  Camera,
  Truck,
  UserCheck,
  UserX,
  ShieldAlert
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPCompanySettings, ERPNoteRule, ERPEmployee } from '../types';
import { parseBirkaFile, BirkaParseResult, BirkaDetail } from '../utils/birkaParser';
import { formatDeadlineDate, orderRequiresEdging, getNextRequiredStage, convertRuCharToEn, convertRuToEnLayout, normalizeBarcodeScan } from '../utils';
import { MobileCameraScannerModal } from '../components/MobileCameraScannerModal';
import { ERPPackagingTab } from '../components/ERPPackagingTab';
import { ERPKittingTab } from '../components/ERPKittingTab';
import { ERPShippingTab } from '../components/ERPShippingTab';

interface ERPOrderWorkspaceViewProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | any | null;
  isShiftActive?: boolean;
  onStartShift?: () => void;
  onLogout?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
  onBack: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  sourceSection?: string;
}

// Audio synthesizer for sound effects
const playSoundEffect = (type: 'success' | 'alert' | 'error' = 'success') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // ignore
  }
};

export const ERPOrderWorkspaceView: React.FC<ERPOrderWorkspaceViewProps> = ({
  order,
  settings,
  currentUser,
  isShiftActive = false,
  onStartShift,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  onBack,
  onUpdateOrder,
  onUpdateOrderStatus,
  sourceSection
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'packaging' | 'kitting' | 'shipping' | 'card'>('scanner');
  const [activeStageId, setActiveStageId] = useState<ProductionStageId>(order.currentStage || 'cutting');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Material & Scanning state
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [scanInput, setScanInput] = useState<string>('');
  const [searchPartsQuery, setSearchPartsQuery] = useState<string>('');
  const [operatorInstructionAlert, setOperatorInstructionAlert] = useState<{
    labelNumber: string;
    partName: string;
    instruction: string;
    color?: string;
  } | null>(null);

  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  const [stageAutoChangedMsg, setStageAutoChangedMsg] = useState<string | null>(null);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState<boolean>(false);
  const [showShiftRequiredModal, setShowShiftRequiredModal] = useState<boolean>(false);
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState<boolean>(false);

  const scannerInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const bufferTimeoutRef = useRef<any>(null);

  // Available Note Rules from settings
  const noteRules: ERPNoteRule[] = settings?.noteRules || [
    { id: '1', pattern: '4-8-36', instruction: 'Данной детали требуется паз, см. чертеж', color: 'amber' },
    { id: '2', pattern: 'паз', instruction: 'Требуется выборка паза под заднюю стенку / ХДФ', color: 'blue' },
    { id: '3', pattern: 'петл', instruction: 'Присадка под петли на сверлильно-присадочном станке', color: 'purple' }
  ];

  // Keep activeStageId synced with order stage if order changes externally
  useEffect(() => {
    if (order.currentStage && order.currentStage !== 'queue') {
      setActiveStageId(order.currentStage);
    }
  }, [order.currentStage]);

  // Initialize selected material when opening scanner
  useEffect(() => {
    if (order.birkaData?.materialGroups && order.birkaData.materialGroups.length > 0) {
      if (!selectedMaterial || !order.birkaData.materialGroups.some(m => m.materialName === selectedMaterial)) {
        setSelectedMaterial(order.birkaData.materialGroups[0].materialName);
      }
    }
  }, [order.birkaData, selectedMaterial]);

  // Auto-focus physical scanner input
  useEffect(() => {
    if (activeTab === 'scanner') {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedMaterial, activeStageId]);

  // Helper to match part note against note rules
  const getMatchedNoteRule = (notes?: string, partName?: string): ERPNoteRule | null => {
    if (!notes && !partName) return null;
    const textToMatch = `${notes || ''} ${partName || ''}`.toLowerCase();
    for (const rule of noteRules) {
      if (rule.pattern && textToMatch.includes(rule.pattern.toLowerCase())) {
        return rule;
      }
    }
    return null;
  };

  // Upload or Replace Birka File Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (order.birkaData) {
      const confirmReplace = window.confirm(`К заказу уже загружен файл "${order.birkaData.fileName}". Перезаписать спецификацию новыми данными?`);
      if (!confirmReplace) {
        e.target.value = '';
        return;
      }
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const parseRes = await parseBirkaFile(file);
      if (parseRes.details.length === 0) {
        throw new Error('Файл не содержит распознанных деталей или пуст');
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        totalAreaM2: parseRes.totalAreaM2,
        totalEdgeM: parseRes.totalEdgeMeters,
        partsCount: parseRes.totalPartsCount,
        birkaData: {
          fileName: parseRes.fileName,
          fileHash: parseRes.fileHash,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          details: parseRes.details,
          materialGroups: parseRes.materialGroups,
          allEdges: parseRes.allEdges
        }
      };

      onUpdateOrder(updatedOrder);
      playSoundEffect('success');
      if (parseRes.materialGroups.length > 0) {
        setSelectedMaterial(parseRes.materialGroups[0].materialName);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Ошибка чтения файла');
      playSoundEffect('error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Delete Birka File Handler
  const handleDeleteBirka = () => {
    if (!window.confirm('Вы уверены, что хотите удалить загруженную спецификацию бирок?')) return;
    const updatedOrder: ProductionOrder = {
      ...order,
      totalAreaM2: 0,
      totalEdgeM: 0,
      partsCount: 0,
      birkaData: undefined,
      stageScanningProgress: {}
    };
    onUpdateOrder(updatedOrder);
    playSoundEffect('alert');
  };

  // Stage scanning state for current active scanning stage
  const stageScanning = order.stageScanningProgress?.[activeStageId] || {};
  const currentMaterialScanning = stageScanning[selectedMaterial] || { scannedPartIds: [], isCompleted: false };
  const scannedPartIds = currentMaterialScanning.scannedPartIds || [];

  // Details for selected material
  const currentMaterialDetails = order.birkaData?.details.filter(d => 
    (d.material || 'Без указания материала') === selectedMaterial
  ) || [];

  // Check if part requires edge
  const partNeedsEdge = (p: BirkaDetail): boolean => {
    return !!(p.edgeL1 || p.edgeL2 || p.edgeW1 || p.edgeW2);
  };

  // Check if material is HDF/DVP
  const isHdfMaterial = (matName: string): boolean => {
    const lower = matName.toLowerCase();
    return lower.includes('хдф') || lower.includes('двп') || lower.includes('3мм') || lower.includes('3 мм');
  };

  // Check if material requires processing for active stage
  const materialRequiresStage = (matName: string, stageId: ProductionStageId, details: BirkaDetail[]): boolean => {
    if (stageId === 'cnc') {
      if (isHdfMaterial(matName)) return false;
    }
    if (stageId === 'edging') {
      const anyEdge = details.some(d => partNeedsEdge(d));
      if (!anyEdge) return false;
    }
    return true;
  };

  // Auto-complete check for materials that don't need edging or CNC
  useEffect(() => {
    if (!order.birkaData?.materialGroups) return;

    let needsStateUpdate = false;
    const updatedStageScanning = { ...(order.stageScanningProgress || {}) };
    if (!updatedStageScanning[activeStageId]) {
      updatedStageScanning[activeStageId] = {};
    }

    order.birkaData.materialGroups.forEach(mg => {
      const matName = mg.materialName;
      const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === matName) || [];
      const isReq = materialRequiresStage(matName, activeStageId, matDetails);

      const existingMatScan = updatedStageScanning[activeStageId][matName] || { scannedPartIds: [], isCompleted: false };

      if (!isReq && !existingMatScan.isCompleted) {
        const allPartIds = matDetails.map(d => d.id);
        updatedStageScanning[activeStageId][matName] = {
          scannedPartIds: allPartIds,
          isCompleted: true
        };
        needsStateUpdate = true;
      }
    });

    if (needsStateUpdate) {
      onUpdateOrder({
        ...order,
        stageScanningProgress: updatedStageScanning
      });
    }
  }, [activeStageId, order.birkaData]);

  // Handle Scanning or Marking a Part
  const handleScanCode = (codeToScan: string) => {
    // 1. Immediately reset input and buffer so subsequent scans never concatenate (no doubling/сдвойка)
    setScanInput('');
    barcodeBufferRef.current = '';
    if (scannerInputRef.current) {
      scannerInputRef.current.value = '';
    }

    // 2. Protect scanning: If shift is not active, block scanning and prompt identity verification
    if (!isShiftActive) {
      setShowShiftRequiredModal(true);
      setIsIdentityConfirmed(false);
      playSoundEffect('alert');
      return;
    }

    setScanErrorMsg(null);
    const cleanCode = codeToScan.trim().replace(/^#/, '');
    if (!cleanCode) {
      scannerInputRef.current?.focus();
      return;
    }

    const enCode = normalizeBarcodeScan(cleanCode);

    let targetMaterial = selectedMaterial;
    let targetDetails = currentMaterialDetails;

    // Helper matcher function (matches against clean code, English layout normalized code, labelNumber, id, barcode, or name)
    const matchesPart = (d: BirkaDetail) => {
      const dLabel = d.labelNumber.toLowerCase();
      const dId = d.id.toLowerCase();
      const dBarcode = (d.barcode || '').toLowerCase();
      const dName = d.name.toLowerCase();
      const targetLower = cleanCode.toLowerCase();
      const enLower = enCode.toLowerCase();

      return dLabel === targetLower || dLabel === enLower ||
             dId === targetLower || dId === enLower ||
             (dBarcode && (dBarcode === targetLower || dBarcode === enLower)) ||
             dName === targetLower || dName === enLower ||
             (cleanCode.length >= 4 && dBarcode.includes(enLower)) ||
             (cleanCode.length >= 4 && dId.includes(enLower));
    };

    // Find part matching in current material
    let foundPart = currentMaterialDetails.find(matchesPart);

    // If not found in current material, check if part exists in another material group of this order
    if (!foundPart && order.birkaData?.details) {
      const partInOtherMat = order.birkaData.details.find(matchesPart);

      if (partInOtherMat) {
        const matName = partInOtherMat.material || 'Без указания материала';
        targetMaterial = matName;
        setSelectedMaterial(matName);
        foundPart = partInOtherMat;
        targetDetails = order.birkaData.details.filter(d => (d.material || 'Без указания материала') === matName);
      }
    }

    if (!foundPart) {
      setScanErrorMsg(`Деталь с кодом/номером "${cleanCode}" не найдена в этом заказе`);
      playSoundEffect('error');
      setScanInput('');
      if (scannerInputRef.current) {
        scannerInputRef.current.value = '';
        scannerInputRef.current.focus();
      }
      return;
    }

    const currentMatScannedIds = order.stageScanningProgress?.[activeStageId]?.[targetMaterial]?.scannedPartIds || [];

    if (currentMatScannedIds.includes(foundPart.id)) {
      setScanErrorMsg(`Деталь №${foundPart.labelNumber} ("${foundPart.name}") уже отсканирована`);
      playSoundEffect('alert');
      setScanInput('');
      if (scannerInputRef.current) {
        scannerInputRef.current.value = '';
        scannerInputRef.current.focus();
      }
      return;
    }

    // --- AUTO-STAGE TRANSITION ---
    // If order is currently in an earlier stage (e.g. 'queue' or before activeStageId),
    // update order.currentStage to activeStageId automatically!
    let nextStageToApply = order.currentStage;
    if (order.currentStage !== activeStageId) {
      nextStageToApply = activeStageId;
      onUpdateOrderStatus(order.id, activeStageId);
      const stageNameText = stageNames[activeStageId] || activeStageId;
      setStageAutoChangedMsg(`Статус заказа автоматически изменен на "${stageNameText}"!`);
      setTimeout(() => setStageAutoChangedMsg(null), 5000);
    }

    // Mark detail as scanned
    const newScannedIds = [...currentMatScannedIds, foundPart.id];
    const isAllScanned = newScannedIds.length >= targetDetails.length;

    const updatedStageScanning = { ...(order.stageScanningProgress || {}) };
    if (!updatedStageScanning[activeStageId]) {
      updatedStageScanning[activeStageId] = {};
    }
    updatedStageScanning[activeStageId][targetMaterial] = {
      scannedPartIds: newScannedIds,
      isCompleted: isAllScanned
    };

    onUpdateOrder({
      ...order,
      currentStage: nextStageToApply,
      stageScanningProgress: updatedStageScanning
    });

    // Check note rules or part notes text
    const hasNoteText = !!foundPart.notes && foundPart.notes.trim().length > 0;
    const matchedRule = getMatchedNoteRule(foundPart.notes, foundPart.name);

    if (hasNoteText || matchedRule) {
      playSoundEffect('alert');
      const instructionText = hasNoteText 
        ? `ПРИМЕЧАНИЕ К ДЕТАЛИ: "${foundPart.notes}". Пожалуйста, ОТЛОЖИТЕ эту деталь В ОТДЕЛЬНУЮ СТОПКУ!`
        : matchedRule?.instruction || 'Обратите внимание на инструкцию к этой детали';
      
      setOperatorInstructionAlert({
        labelNumber: foundPart.labelNumber,
        partName: foundPart.name,
        instruction: instructionText,
        color: matchedRule?.color || 'rose'
      });
    } else {
      playSoundEffect('success');
    }

    setScanInput('');
    if (scannerInputRef.current) {
      scannerInputRef.current.value = '';
      scannerInputRef.current.focus();
    }
  };

  // Global Barcode & QR Scanner Listener (Capture keystrokes anywhere on the page without requiring cursor in input)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if camera scanner is active
      if (showCameraScannerModal) {
        return;
      }

      // Check if user is typing in another active input/textarea (like search query or custom field)
      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;
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

      if (isOtherInput) {
        return;
      }

      // When Enter arrives (hardware scanners send Enter at end of transmission)
      if (e.key === 'Enter') {
        const rawCode = barcodeBufferRef.current.trim() || scanInput.trim() || (scannerInputRef.current?.value || '').trim();
        const bufferedCode = normalizeBarcodeScan(rawCode);
        if (bufferedCode) {
          e.preventDefault();
          barcodeBufferRef.current = '';
          handleScanCode(bufferedCode);
        }
        return;
      }

      // Capture single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const now = Date.now();
        // If more than 1.2s passed and input was not focused, start fresh buffer
        if (now - lastKeyTimeRef.current > 1200 && document.activeElement !== scannerInputRef.current) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;

        const enChar = convertRuCharToEn(e.key);
        barcodeBufferRef.current += enChar;

        // If scannerInput is not focused, focus it and mirror the buffer
        if (document.activeElement !== scannerInputRef.current) {
          setScanInput(barcodeBufferRef.current);
          scannerInputRef.current?.focus();
        }

        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
        }
        bufferTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    };
  }, [
    showCameraScannerModal, 
    scanInput, 
    selectedMaterial, 
    currentMaterialDetails, 
    order, 
    activeStageId, 
    scannedPartIds
  ]);

  // Toggle single detail scanned status manually
  const toggleDetailScanned = (detail: BirkaDetail) => {
    const isScanned = scannedPartIds.includes(detail.id);
    let newScannedIds: string[] = [];
    if (isScanned) {
      newScannedIds = scannedPartIds.filter(id => id !== detail.id);
    } else {
      newScannedIds = [...scannedPartIds, detail.id];
    }

    // --- AUTO-STAGE TRANSITION ---
    let nextStageToApply = order.currentStage;
    if (!isScanned && order.currentStage !== activeStageId) {
      nextStageToApply = activeStageId;
      onUpdateOrderStatus(order.id, activeStageId);
      const stageNameText = stageNames[activeStageId] || activeStageId;
      setStageAutoChangedMsg(`Статус заказа автоматически изменен на "${stageNameText}"!`);
      setTimeout(() => setStageAutoChangedMsg(null), 5000);
    }

    const isAllScanned = newScannedIds.length >= currentMaterialDetails.length;
    const updatedStageScanning = { ...(order.stageScanningProgress || {}) };
    if (!updatedStageScanning[activeStageId]) {
      updatedStageScanning[activeStageId] = {};
    }
    updatedStageScanning[activeStageId][selectedMaterial] = {
      scannedPartIds: newScannedIds,
      isCompleted: isAllScanned
    };

    onUpdateOrder({
      ...order,
      currentStage: nextStageToApply,
      stageScanningProgress: updatedStageScanning
    });

    if (!isScanned) {
      const hasNoteText = !!detail.notes && detail.notes.trim().length > 0;
      const matchedRule = getMatchedNoteRule(detail.notes, detail.name);

      if (hasNoteText || matchedRule) {
        playSoundEffect('alert');
        const instructionText = hasNoteText 
          ? `ПРИМЕЧАНИЕ К ДЕТАЛИ: "${detail.notes}". Пожалуйста, ОТЛОЖИТЕ эту деталь В ОТДЕЛЬНУЮ СТОПКУ!`
          : matchedRule?.instruction || 'Обратите внимание на инструкцию к этой детали';

        setOperatorInstructionAlert({
          labelNumber: detail.labelNumber,
          partName: detail.name,
          instruction: instructionText,
          color: matchedRule?.color || 'rose'
        });
      } else {
        playSoundEffect('success');
      }
    }
  };

  // Total stage completion status
  const allMaterialGroups = order.birkaData?.materialGroups || [];
  const isAllStageMaterialsCompleted = allMaterialGroups.length > 0 && allMaterialGroups.every(mg => {
    const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === mg.materialName) || [];
    const isReq = materialRequiresStage(mg.materialName, activeStageId, matDetails);
    if (!isReq) return true;

    const matScan = order.stageScanningProgress?.[activeStageId]?.[mg.materialName];
    return matScan?.isCompleted || (matScan?.scannedPartIds?.length || 0) >= matDetails.length;
  });

  const stageNames: Record<ProductionStageId, string> = {
    queue: 'Очередь запуска',
    cutting: 'Участок раскроя (Распил)',
    edging: 'Участок кромкооблицовки',
    cnc: 'Участок присадки ЧПУ',
    facades: 'Фасадный участок',
    assembly: 'Участок сборки',
    kitting: 'Участок комплектовки',
    qc: 'Контроль ОТК',
    packing: 'Участок упаковки',
    ready: 'Готово к отгрузке',
    shipping: 'Отгрузка водителю'
  };

  const nextStageMap: Record<ProductionStageId, ProductionStageId | null> = {
    queue: 'cutting',
    cutting: 'edging',
    edging: 'cnc',
    cnc: 'facades',
    facades: 'assembly',
    assembly: 'kitting',
    kitting: 'qc',
    qc: 'packing',
    packing: 'ready',
    ready: 'shipping',
    shipping: null
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Workspace Header Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Назад</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black font-mono shadow-sm">
                Заказ {order.orderNumber}
              </span>

              <span className="px-2.5 py-1 rounded-xl bg-indigo-900/90 text-indigo-200 border border-indigo-700/80 text-xs font-bold">
                {stageNames[order.currentStage] || order.currentStage}
              </span>

              {order.birkaData ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Спецификация загружена ({order.birkaData.fileName})
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-amber-950/90 text-amber-300 border border-amber-800 text-[11px] font-bold">
                  Спецификация не загружена
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300 truncate">
              Заказчик: <strong className="text-white">{order.clientName}</strong> • Проект: <strong className="text-white">{order.projectName}</strong>
            </div>
          </div>
        </div>

        {/* Header Right Stage Selector Dropdown & Stage Transfer */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden xl:block">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Текущая стадия в ERP</div>
            <select
              value={order.currentStage}
              onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as ProductionStageId)}
              className="bg-slate-800 text-white font-bold text-xs py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {Object.entries(stageNames).map(([sId, sName]) => (
                <option key={sId} value={sId}>{sName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Печать</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto Stage Change Banner */}
      {stageAutoChangedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-3 shadow-lg animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{stageAutoChangedMsg}</span>
        </div>
      )}

      {/* Workspace Main Tab Switcher Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-sm flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px] ${
            activeTab === 'scanner'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" /> 
          <span>Цех / Стадии</span>
          {isAllStageMaterialsCompleted && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('packaging')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px] ${
            activeTab === 'packaging'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> 
          <span>Упаковка и этикетки</span>
          {(order.packages?.filter(p => p.type === 'details').length || 0) > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'packaging' ? 'bg-orange-800 text-white' : 'bg-orange-100 text-orange-800'
            }`}>
              {order.packages?.filter(p => p.type === 'details').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('kitting')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px] ${
            activeTab === 'kitting'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Box className="w-4 h-4" /> 
          <span>Комплектация</span>
          {(order.packages?.filter(p => p.type === 'kitting').length || 0) > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'kitting' ? 'bg-cyan-800 text-white' : 'bg-cyan-100 text-cyan-800'
            }`}>
              {order.packages?.filter(p => p.type === 'kitting').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('shipping')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px] ${
            activeTab === 'shipping'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> 
          <span>Отгрузка водителю</span>
          {order.status === 'shipped' && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              Архив
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[140px] ${
            activeTab === 'card'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> 
          <span>Маршрутная карта</span>
        </button>
      </div>

      {/* TAB 1: QR SCANNER & STAGE EXECUTION */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* Top Bar: Select Production Stage for Scanning (Shown for Planning / Manager, hidden or focused for craftsmen on production station) */}
          {sourceSection !== 'production' ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Сканирование деталей на участке
                  </h3>
                  <p className="text-xs text-slate-500">
                    Выберите рабочий участок и материал. Сканируйте QR/штрихкод с бирки сканером.
                  </p>
                </div>
              </div>

              {/* Stage Selector Pills (Filtered by enabledStages) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {(['cutting', 'edging', 'cnc', 'facades', 'assembly', 'kitting', 'qc', 'packing', 'shipping'] as ProductionStageId[])
                  .filter(stId => !settings?.enabledStages || settings.enabledStages.length === 0 || settings.enabledStages.includes(stId))
                  .map(stId => {
                    const isEdgingSkipped = stId === 'edging' && !orderRequiresEdging(order);
                    return (
                      <button
                        key={stId}
                        onClick={() => {
                          setActiveStageId(stId);
                          if (stId === 'packing') {
                            setActiveTab('packaging');
                          } else if (stId === 'kitting') {
                            setActiveTab('kitting');
                          } else if (stId === 'shipping') {
                            setActiveTab('shipping');
                          }
                          if (isEdgingSkipped) {
                            setScanErrorMsg('Внимание: В данном заказе нет обработки кромкой (0 м. кромки). Этап кромкооблицовки автоматически пропущен.');
                          } else {
                            setScanErrorMsg(null);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeStageId === stId
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : isEdgingSkipped
                            ? 'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{stageNames[stId]}</span>
                        {isEdgingSkipped && (
                          <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                            Пропущен (0м)
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Текущий рабочий участок</div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {stageNames[activeStageId] || activeStageId}
                  </h3>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-indigo-600" />
                <span>Режим выполнения участка</span>
              </div>
            </div>
          )}

          {/* Quick Action: Start Cutting if Order is in Queue */}
          {order.currentStage === 'queue' && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-5 border border-blue-700/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold shrink-0">
                  <Scissors className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Заказ готов к запуску в производство
                  </h4>
                  <p className="text-xs text-blue-200">
                    Как только сотрудником начинается выполнение работ на участке распила, нажмите «Приступить к распилу» для смены стадии заказа.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onUpdateOrderStatus(order.id, 'cutting');
                  setActiveStageId('cutting');
                  playSoundEffect('success');
                  setStageAutoChangedMsg('Стадия заказа изменена на «Распил»!');
                  setTimeout(() => setStageAutoChangedMsg(null), 5000);
                }}
                className="px-5 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Приступить к распилу</span>
              </button>
            </div>
          )}

          {!order.birkaData ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Спецификация бирок ещё не загружена
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Файл бирок загружается один раз на этапе формирования плана производства. Перейдите во вкладку «Спецификация бирок» или загрузите файл (.bir, .csv, .zip) напрямую к заказу.
              </p>
              <button
                onClick={() => setActiveTab('card')}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Перейти к спецификации заказа
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Material Selection & Physical Scanner Input */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Material Selection Box */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-600" /> Выберите материал
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {order.birkaData.materialGroups.length} мат.
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {order.birkaData.materialGroups.map((mg) => {
                      const matName = mg.materialName;
                      const matDetails = order.birkaData?.details.filter(d => (d.material || 'Без указания материала') === matName) || [];
                      const isReq = materialRequiresStage(matName, activeStageId, matDetails);
                      
                      const matScan = order.stageScanningProgress?.[activeStageId]?.[matName];
                      const scannedCount = matScan?.scannedPartIds?.length || 0;
                      const isCompleted = matScan?.isCompleted || (isReq && scannedCount >= matDetails.length);
                      const isSelected = selectedMaterial === matName;

                      return (
                        <button
                          key={matName}
                          onClick={() => {
                            setSelectedMaterial(matName);
                            setScanErrorMsg(null);
                          }}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                              : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {matName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {!isReq ? (
                                <span className="text-slate-400 font-semibold">Не требуется на этой стадии</span>
                              ) : (
                                <span>Прогресс: {scannedCount} из {matDetails.length} шт.</span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {!isReq ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                                —
                              </span>
                            ) : isCompleted ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-800 text-[10px] font-black font-mono">
                                {scannedCount}/{matDetails.length}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scanner Input Panel */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <QrCode className="w-4 h-4" /> Поле сканера QR / Штрихкода
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCameraScannerModal(true)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                        title="Включить сканирование камерой телефона"
                      >
                        <Camera className="w-3.5 h-3.5" /> Камера телефона
                      </button>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Сканер готов к приему кодов" />
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleScanCode(scanInput); }}>
                    <div className="relative">
                      <input
                        ref={scannerInputRef}
                        type="text"
                        lang="en"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Отсканируйте код или введите № детали..."
                        value={scanInput}
                        onChange={(e) => setScanInput(convertRuToEnLayout(e.target.value))}
                        className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-mono font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Ввод
                      </button>
                    </div>
                  </form>

                  {/* Mobile Camera Big Launch Button */}
                  <button
                    type="button"
                    onClick={() => setShowCameraScannerModal(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600/30 via-indigo-600/40 to-indigo-700/30 hover:from-indigo-600/50 hover:to-indigo-700/50 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>Сканировать камерой телефона (QR / Штрихкод)</span>
                  </button>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Поддерживает сканирование номера позиции с бирки (например <code className="text-indigo-300 font-bold">12</code>, <code className="text-indigo-300 font-bold">#15</code> или штрихкод).
                  </p>

                  {/* Scan Error Alert */}
                  {scanErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{scanErrorMsg}</span>
                    </div>
                  )}

                  {/* Stage Transfer Button */}
                  <div className="pt-2">
                    <button
                      disabled={!isAllStageMaterialsCompleted}
                      onClick={() => {
                        const nextSt = getNextRequiredStage(order, activeStageId);
                        if (nextSt) {
                          const todayStr = new Date().toLocaleDateString('ru-RU');
                          const stageProgress = order.stageScanningProgress?.[activeStageId] || {};
                          let completedPartsOnStage = 0;
                          Object.values(stageProgress).forEach((m: any) => {
                            completedPartsOnStage += (m.scannedPartIds?.length || 0);
                          });
                          if (completedPartsOnStage === 0) completedPartsOnStage = order.partsCount || 1;

                          const newLog = {
                            id: `log-${Date.now()}`,
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            employeeId: order.responsibleEmployeeId || 'emp-current',
                            employeeName: order.responsibleEmployeeName || 'Иван Иванов (Мастер цеха)',
                            stageId: activeStageId,
                            startTime: todayStr,
                            endTime: todayStr,
                            scannedPartsCount: completedPartsOnStage,
                            scannedAreaM2: order.totalAreaM2 || 0,
                            scannedEdgeM: activeStageId === 'edging' ? order.totalEdgeM : 0,
                            status: 'completed' as const
                          };

                          const updatedLogs = [...(order.workLogs || []), newLog];

                          onUpdateOrder({
                            ...order,
                            currentStage: nextSt,
                            workLogs: updatedLogs
                          });

                          onUpdateOrderStatus(order.id, nextSt);
                          setActiveStageId(nextSt);
                          playSoundEffect('success');
                          const stageNameText = stageNames[nextSt] || nextSt;
                          setStageAutoChangedMsg(`Заказ переведен на следующую стадию: "${stageNameText}"!`);
                          setTimeout(() => setStageAutoChangedMsg(null), 5000);
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Передать заказ на следующую стадию</span>
                    </button>
                    {!isAllStageMaterialsCompleted && (
                      <p className="text-[10px] text-slate-400 text-center mt-2">
                        Кнопка станет активной после 100% обработки деталей текущего участка.
                      </p>
                    )}
                  </div>
                </div>

                {/* Operator Special Instruction Modal Alert */}
                {operatorInstructionAlert && (
                  <div className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-400 shadow-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Инструкция к детали №{operatorInstructionAlert.labelNumber}
                      </div>
                      <button
                        onClick={() => setOperatorInstructionAlert(null)}
                        className="p-1 rounded-lg text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="font-extrabold text-sm text-amber-950">
                      «{operatorInstructionAlert.partName}»
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-amber-300 text-xs font-bold text-slate-800">
                      {operatorInstructionAlert.instruction}
                    </div>

                    <button
                      onClick={() => setOperatorInstructionAlert(null)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Подтверждаю, ознакомлен
                    </button>
                  </div>
                )}

              </div>

              {/* Right Column: Parts List & Interactive Progress */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      Детали материала: <span className="text-indigo-600">{selectedMaterial || 'Не выбран'}</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Нажмите на деталь для ручной отметки выполнения.
                    </p>
                  </div>

                  {/* Search inside parts list */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Поиск по № или названию..."
                      value={searchPartsQuery}
                      onChange={(e) => setSearchPartsQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Parts Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50">
                        <th className="py-2.5 px-3">Статус</th>
                        <th className="py-2.5 px-3">№ позиции</th>
                        <th className="py-2.5 px-3">Наименование</th>
                        <th className="py-2.5 px-3">Размер (мм)</th>
                        <th className="py-2.5 px-3">Кромка</th>
                        <th className="py-2.5 px-3">Спец-операция</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {currentMaterialDetails
                        .filter(d => 
                          !searchPartsQuery || 
                          d.labelNumber.toLowerCase().includes(searchPartsQuery.toLowerCase()) ||
                          d.name.toLowerCase().includes(searchPartsQuery.toLowerCase())
                        )
                        .map((detail) => {
                          const isScanned = scannedPartIds.includes(detail.id);
                          const matchedRule = getMatchedNoteRule(detail.notes, detail.name);

                          return (
                            <tr
                              key={detail.id}
                              onClick={() => toggleDetailScanned(detail)}
                              className={`transition-colors cursor-pointer hover:bg-indigo-50/50 ${
                                isScanned ? 'bg-emerald-50/60' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                  isScanned 
                                    ? 'bg-emerald-500 text-white shadow-sm' 
                                    : 'border-2 border-slate-300 text-transparent hover:border-indigo-500'
                                }`}>
                                  ✓
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                                {detail.labelNumber}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {detail.name}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {detail.length} × {detail.width} × {detail.thickness}
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-slate-500">
                                {partNeedsEdge(detail) ? 'Да' : '—'}
                              </td>

                              <td className="py-2.5 px-3">
                                {matchedRule ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    {matchedRule.pattern}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: SPECIFICATION & TECH CARD DETAILS */}
      {activeTab === 'card' && (
        <div className="space-y-6">
          {/* Birka Upload / Re-upload Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">
                  {order.birkaData ? `Загруженный файл: ${order.birkaData.fileName}` : 'Загрузить файл бирок (.bir, .csv, .tsv, .dbf, .zip)'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.birkaData 
                    ? `Загружено: ${order.birkaData.uploadedAt}. Можно загрузить новый файл для перезаписи.` 
                    : 'Загрузка автоматически рассчитает площади материалов, метраж кромки и спецификацию деталей.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>{order.birkaData ? 'Перезагрузить спецификацию' : 'Загрузить файл'}</span>
                <input
                  type="file"
                  accept=".bir,.brx,.csv,.tsv,.dbf,.zip"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {order.birkaData && (
                <button
                  onClick={handleDeleteBirka}
                  title="Удалить спецификацию"
                  className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {uploadError}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                Площадь деталей
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {order.totalAreaM2 > 0 ? `${order.totalAreaM2.toFixed(1)} м²` : '0 м²'}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                Кромка ПВХ
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {order.totalEdgeM > 0 ? `${order.totalEdgeM} п.м.` : '0 п.м.'}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                Всего деталей
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {order.partsCount > 0 ? `${order.partsCount} шт.` : '0 шт.'}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                Материалы
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {order.birkaData?.materialGroups ? `${order.birkaData.materialGroups.length} наим.` : '0'}
              </div>
            </div>
          </div>

          {/* Materials & Edge Specifications */}
          {order.birkaData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <h4 className="font-black text-slate-900 text-sm">
                Распределение материалов и листов раскроя
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.birkaData.materialGroups.map((mg) => (
                  <div key={mg.materialName} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="font-bold text-xs text-slate-900">
                      {mg.materialName}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Площадь: <strong>{mg.totalAreaM2.toFixed(2)} м²</strong></span>
                      <span>Деталей: <strong>{mg.totalQuantity} шт.</strong></span>
                      <span>Листов (~2.8×2.07): <strong>{mg.estimatedSheets || 0} шт.</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Specification Parts Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm">
                    Полный список деталей заказа ({order.birkaData.details.length} шт.)
                  </h4>

                  <div className="relative min-w-[240px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Фильтр по названию или материалу..."
                      value={searchPartsQuery}
                      onChange={(e) => setSearchPartsQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50">
                        <th className="py-2.5 px-3">№ детали</th>
                        <th className="py-2.5 px-3">Наименование</th>
                        <th className="py-2.5 px-3">Материал</th>
                        <th className="py-2.5 px-3">Длина × Ширина × Тощ.</th>
                        <th className="py-2.5 px-3">Кромки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {order.birkaData.details
                        .filter(d => 
                          !searchPartsQuery || 
                          d.labelNumber.toLowerCase().includes(searchPartsQuery.toLowerCase()) ||
                          d.name.toLowerCase().includes(searchPartsQuery.toLowerCase()) ||
                          d.material.toLowerCase().includes(searchPartsQuery.toLowerCase())
                        )
                        .map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                              {d.labelNumber}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {d.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {d.material}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {d.length} × {d.width} × {d.thickness} мм
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {[d.edgeL1, d.edgeL2, d.edgeW1, d.edgeW2].filter(Boolean).join(', ') || '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 2: PACKAGING & LABELS */}
      {activeTab === 'packaging' && (
        <ERPPackagingTab
          order={order}
          settings={settings}
          currentUser={currentUser}
          onUpdateOrder={onUpdateOrder}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onOpenScannerModal={() => setShowCameraScannerModal(true)}
        />
      )}

      {/* TAB 3: KITTING */}
      {activeTab === 'kitting' && (
        <ERPKittingTab
          order={order}
          settings={settings}
          currentUser={currentUser}
          onUpdateOrder={onUpdateOrder}
          onUpdateOrderStatus={onUpdateOrderStatus}
        />
      )}

      {/* TAB 4: SHIPPING & VEHICLE DISPATCH */}
      {activeTab === 'shipping' && (
        <ERPShippingTab
          order={order}
          settings={settings}
          currentUser={currentUser}
          onUpdateOrder={onUpdateOrder}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onOpenScannerModal={() => setShowCameraScannerModal(true)}
        />
      )}

      {/* Operator Instruction Alert Modal */}
      {operatorInstructionAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border-4 border-amber-500 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-10 h-10 animate-pulse text-amber-600" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
                🚨 Внимание оператору участка!
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Деталь №{operatorInstructionAlert.labelNumber} ({operatorInstructionAlert.partName})
              </h3>
              <p className="text-sm font-extrabold text-amber-900 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                {operatorInstructionAlert.instruction}
              </p>
            </div>

            <button
              onClick={() => setOperatorInstructionAlert(null)}
              className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm transition-all shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              Понятно, деталь отложена в отдельную стопку
            </button>
          </div>
        </div>
      )}

      {/* Mobile Camera Scanner Modal */}
      <MobileCameraScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        onScan={(code) => {
          handleScanCode(code);
        }}
        title={`Сканер камеры (${order.orderNumber})`}
        subtitle="Наведите камеру на QR-код или штрихкод бирки детали"
      />

      {/* SHIFT VALIDATION & OPERATOR CONFIRMATION MODAL */}
      {showShiftRequiredModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
                🛑 Смена не начата
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Необходимо начать рабочую смену
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Для сканирования деталей и учета выработки на производственном участке требуется активная рабочая смена.
              </p>
            </div>

            {/* Operator Identity Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Текущий пользователь системы:
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                  {currentUser?.displayName?.[0] || currentUser?.name?.[0] || 'О'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">
                    {currentUser?.displayName || currentUser?.name || 'Оператор цеха'}
                  </div>
                  <div className="text-xs text-indigo-600 font-bold truncate">
                    {currentUser?.productionRole || currentUser?.role || 'Сотрудник производства'}
                  </div>
                  {currentUser?.email && (
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {currentUser.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Question */}
            <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 text-xs text-slate-700">
              Вы действительно <strong>{currentUser?.displayName || currentUser?.name || 'этот сотрудник'}</strong>?
            </div>

            {/* Confirmation Action Buttons */}
            {!isIdentityConfirmed ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftRequiredModal(false);
                    onLogout?.();
                  }}
                  className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>Нет, сменить</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsIdentityConfirmed(true)}
                  className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Да, это я</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartShift?.();
                    setShowShiftRequiredModal(false);
                    setIsIdentityConfirmed(false);
                    playSoundEffect('success');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Начать смену и продолжить работу</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsIdentityConfirmed(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium py-1 cursor-pointer"
                >
                  Назад к подтверждению
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

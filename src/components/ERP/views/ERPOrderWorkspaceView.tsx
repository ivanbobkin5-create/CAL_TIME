import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Tag, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  Play,
  RotateCcw,
  Box,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Package,
  Wrench,
  Clock,
  Camera,
  Truck,
  ShieldCheck,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowRight,
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPCompanySettings, ERPNoteRule, ERPEmployee, MaterialResidual } from '../types';
import { parseBirkaFile, BirkaParseResult, BirkaDetail, consolidateDetails } from '../utils/birkaParser';
import { formatDeadlineDate, orderRequiresEdging, getNextRequiredStage, getStageNameRussian, convertRuCharToEn, convertRuToEnLayout, normalizeBarcodeScan, speakText, matchDetailToScannedCode, cleanRawScannedString, processQRCommand, cleanOrderNumber, extractBitrixDealId, getBitrixDealUrl, getSmartOrderDisplay, comparePositionNumbers } from '../utils';
import { CuttingOffcutsModal } from '../components/CuttingOffcutsModal';
import { EdgingRemainsModal } from '../components/EdgingRemainsModal';
import { detailRequiresPrisadka, getDetailAvailabilityForStage, getScannedCountForDetail, isDetailFullyScanned } from '../utils/stageReadiness';
import { FinishedPartNoticeModal } from '../components/FinishedPartNoticeModal';
import { MobileCameraScannerModal } from '../components/MobileCameraScannerModal';
import { ReportDefectModal } from '../components/ReportDefectModal';
import { PartEdgeDiagram } from '../components/PartEdgeDiagram';
import { ERPPackagingTab } from '../components/ERPPackagingTab';
import { ERPKittingTab } from '../components/ERPKittingTab';
import { ERPShippingTab } from '../components/ERPShippingTab';

interface ERPOrderWorkspaceViewProps {
  order: ProductionOrder;
  initialStageId?: ProductionStageId | null;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | any | null;
  employees?: ERPEmployee[];
  isShiftActive?: boolean;
  onStartShift?: () => void;
  onLogout?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
  onBack: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onAddEmployee?: (emp: Partial<ERPEmployee>) => void;
  onAddMaterialResiduals?: (residuals: MaterialResidual[]) => void;
  sourceSection?: string;
  catalogMaterials?: Record<string, string[]>;
  catalogProducts?: any[];
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

const STAGE_METADATA: Record<ProductionStageId, { name: string; shortName: string; icon: any; color: string; badge: string; desc: string }> = {
  queue: { name: 'Очередь запуска', shortName: 'Очередь', icon: Clock, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', desc: 'Заказ ожидает запуска в цех' },
  cutting: { name: 'Участок раскроя (Распил)', shortName: 'Распил', icon: Scissors, color: 'text-blue-600', badge: 'bg-blue-600 text-white', desc: 'Распил плитных материалов по картам раскроя' },
  edging: { name: 'Участок кромкооблицовки', shortName: 'Кромка', icon: Layers, color: 'text-indigo-600', badge: 'bg-indigo-600 text-white', desc: 'Облицовка кромок деталей и снятие свесов' },
  cnc: { name: 'Участок присадки / ЧПУ', shortName: 'Присадка / ЧПУ', icon: Factory, color: 'text-purple-600', badge: 'bg-purple-600 text-white', desc: 'Сверление отверстий, фрезеровка пазов' },
  facades: { name: 'Фасадный участок / Покраска', shortName: 'Фасады', icon: Wrench, color: 'text-amber-600', badge: 'bg-amber-600 text-white', desc: 'Фрезеровка и облицовка фасадов' },
  assembly: { name: 'Участок сборки модулей', shortName: 'Сборка', icon: Wrench, color: 'text-teal-600', badge: 'bg-teal-600 text-white', desc: 'Контрольная сборка корпусов и подгонка' },
  kitting: { name: 'Участок комплектовки', shortName: 'Комплектовка', icon: Box, color: 'text-cyan-600', badge: 'bg-cyan-600 text-white', desc: 'Формирование коробок фурнитуры и крепежа' },
  qc: { name: 'Контроль качества (ОТК)', shortName: 'ОТК', icon: ShieldCheck, color: 'text-emerald-600', badge: 'bg-emerald-600 text-white', desc: 'Проверка геометрии и качества перед упаковкой' },
  packing: { name: 'Участок упаковки и маркировки', shortName: 'Упаковка', icon: Package, color: 'text-orange-600', badge: 'bg-orange-600 text-white', desc: 'Формирование упаковочных мест и печать этикеток' },
  ready: { name: 'Готово к отгрузке', shortName: 'Склад ГП', icon: CheckCircle2, color: 'text-emerald-600', badge: 'bg-emerald-600 text-white', desc: 'Заказ упакован и ожидает погрузки' },
  shipping: { name: 'Склад и отгрузка водителю', shortName: 'Отгрузка', icon: Truck, color: 'text-violet-600', badge: 'bg-violet-600 text-white', desc: 'Погрузка мест в автомобиль и акт приема-передачи' }
};

export const ERPOrderWorkspaceView: React.FC<ERPOrderWorkspaceViewProps> = ({
  order,
  initialStageId,
  settings,
  currentUser,
  employees = [],
  isShiftActive = false,
  onStartShift,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  onBack,
  onUpdateOrder,
  onUpdateOrderStatus,
  onAddEmployee,
  onAddMaterialResiduals,
  sourceSection,
  catalogMaterials = {},
  catalogProducts = []
}) => {
  const empName = currentUser?.employeeName || currentUser?.name || currentUser?.displayName || 'Сотрудник';
  const empId = currentUser?.employeeId || currentUser?.id || currentUser?.uid || 'unknown';
  const empRole = currentUser?.role || currentUser?.productionRole || 'Сотрудник цеха';

  // Real-time Presence Heartbeat
  useEffect(() => {
    if (!order?.id || !empName) return;

    const sendHeartbeat = async () => {
      try {
        const compId = window.location.pathname.split('/')[2] || 'default';
        await fetch(`/api/erp/${compId}/orders/${order.id}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: empId,
            employeeName: empName,
            role: empRole,
            stageId: initialStageId || order.currentStage || 'cutting'
          })
        });
      } catch (e) {
        console.warn("Workspace presence heartbeat failed:", e);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3500);
    return () => clearInterval(interval);
  }, [order?.id, empName, empId, empRole, initialStageId, order.currentStage]);
  // Current active stage for this workstation (strict focus on current stage)
  const currentStage: ProductionStageId = initialStageId || order.currentStage || 'cutting';
  const stageMeta = STAGE_METADATA[currentStage] || STAGE_METADATA.cutting;
  const StageIcon = stageMeta.icon;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals for material residuals on stage completion
  const [showOffcutsModal, setShowOffcutsModal] = useState<boolean>(false);
  const [showEdgingRemainsModal, setShowEdgingRemainsModal] = useState<boolean>(false);
  const [showForceCompleteModal, setShowForceCompleteModal] = useState<boolean>(false);
  const [forceCompleteReason, setForceCompleteReason] = useState<string>('');

  // Material & Scanning state for cutting / edging / cnc / assembly
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [scanInput, setScanInput] = useState<string>('');
  const [searchPartsQuery, setSearchPartsQuery] = useState<string>('');
  const [operatorInstructionAlert, setOperatorInstructionAlert] = useState<{
    labelNumber: string;
    partName: string;
    instruction: string;
    color?: string;
  } | null>(null);

  const [finishedPartNotice, setFinishedPartNotice] = useState<{
    isOpen: boolean;
    labelNumber: string;
    partName: string;
    materialName?: string;
  } | null>(null);

  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState<boolean>(false);
  const [showShiftRequiredModal, setShowShiftRequiredModal] = useState<boolean>(false);
  const [defectTargetDetail, setDefectTargetDetail] = useState<any | null>(null);
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState<boolean>(false);
  const [positionSortOrder, setPositionSortOrder] = useState<'asc' | 'desc'>('asc');

  const scannerInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const bufferTimeoutRef = useRef<any>(null);

  // Local optimistic order state for zero-latency scanning updates
  const [localOrder, setLocalOrder] = useState<ProductionOrder>(order);
  const localOrderRef = useRef<ProductionOrder>(order);
  localOrderRef.current = localOrder;

  // Visual instant feedback for scanned details
  const [recentlyScannedPartId, setRecentlyScannedPartId] = useState<string | null>(null);
  const [scannedPartFlashInfo, setScannedPartFlashInfo] = useState<{
    id: string;
    labelNumber: string;
    name: string;
    count: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    setLocalOrder(prev => {
      if (prev.id !== order.id) {
        localOrderRef.current = order;
        return order;
      }

      const mergedProgress = { ...(order.stageScanningProgress || {}) };
      const prevProgress = prev.stageScanningProgress || {};

      Object.keys(prevProgress).forEach(stg => {
        if (!mergedProgress[stg]) mergedProgress[stg] = {};
        Object.keys(prevProgress[stg]).forEach(mat => {
          const prevIds = prevProgress[stg][mat]?.scannedPartIds || [];
          const newIds = mergedProgress[stg]?.[mat]?.scannedPartIds || [];
          const combined = Array.from(new Set([...newIds, ...prevIds]));
          mergedProgress[stg][mat] = {
            scannedPartIds: combined,
            isCompleted: (combined.length > 0) || prevProgress[stg][mat]?.isCompleted || mergedProgress[stg]?.[mat]?.isCompleted
          };
        });
      });

      const updated = {
        ...order,
        stageScanningProgress: mergedProgress
      };
      localOrderRef.current = updated;
      return updated;
    });
  }, [order]);

  // Available Note Rules from settings
  const noteRules: ERPNoteRule[] = settings?.noteRules || [
    { id: '1', pattern: '4-8-36', instruction: 'Данной детали требуется паз, см. чертеж', color: 'amber' },
    { id: '2', pattern: 'паз', instruction: 'Требуется выборка паза под заднюю стенку / ХДФ', color: 'blue' },
    { id: '3', pattern: 'петл', instruction: 'Присадка под петли на сверлильно-присадочном станке', color: 'purple' }
  ];

  // Initialize selected material when opening scanner
  useEffect(() => {
    if (localOrder.birkaData?.materialGroups && localOrder.birkaData.materialGroups.length > 0) {
      if (!selectedMaterial || !localOrder.birkaData.materialGroups.some(m => m.materialName === selectedMaterial)) {
        setSelectedMaterial(localOrder.birkaData.materialGroups[0].materialName);
      }
    }
  }, [localOrder.birkaData, selectedMaterial]);

  // Auto-focus physical scanner input
  useEffect(() => {
    if (currentStage !== 'kitting' && currentStage !== 'packing' && currentStage !== 'shipping') {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedMaterial, currentStage]);

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

    if (localOrder.birkaData) {
      const confirmReplace = window.confirm(`К заказу уже загружен файл "${localOrder.birkaData.fileName}". Перезаписать спецификацию новыми данными?`);
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
        ...localOrder,
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

      setLocalOrder(updatedOrder);
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

  // Stage scanning state for current active scanning stage
  const stageScanning = localOrder.stageScanningProgress?.[currentStage] || {};

  // All scanned part IDs across all materials for the current stage
  const allScannedPartIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(stageScanning).forEach(matGroup => {
      if (matGroup && Array.isArray(matGroup.scannedPartIds)) {
        matGroup.scannedPartIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [stageScanning]);

  // All scanned entry IDs (including multi-piece instance suffixes)
  const allStageScannedIds = useMemo(() => {
    const list: string[] = [];
    Object.values(stageScanning).forEach(matGroup => {
      if (matGroup && Array.isArray(matGroup.scannedPartIds)) {
        list.push(...matGroup.scannedPartIds);
      }
    });
    return list;
  }, [stageScanning]);

  const currentMaterialScanning = stageScanning[selectedMaterial] || { scannedPartIds: [], isCompleted: false };
  const scannedPartIds = currentMaterialScanning.scannedPartIds || [];

  // Check if part requires edge
  const partNeedsEdge = (p: BirkaDetail): boolean => {
    return !!(p.edgeL1 || p.edgeL2 || p.edgeW1 || p.edgeW2);
  };

  // Consolidated details for the order
  const consolidatedOrderDetails = useMemo(() => {
    return consolidateDetails(localOrder.birkaData?.details || []);
  }, [localOrder.birkaData]);

  // Details for selected material
  const allMaterialDetails = useMemo(() => {
    return consolidatedOrderDetails.filter(d => 
      (d.material || 'Без указания материала') === selectedMaterial
    );
  }, [consolidatedOrderDetails, selectedMaterial]);

  // All details of selected material are available across all processing stages
  const currentMaterialDetails = allMaterialDetails;

  // Filtered and sorted details for display
  const sortedAndFilteredDetails = useMemo(() => {
    const filtered = currentMaterialDetails.filter(d => {
      if (!searchPartsQuery) return true;
      const q = searchPartsQuery.toLowerCase();
      const birkaOrder = (d.orderNumber || order.orderNumber || '').toLowerCase();
      const fullQr = `${birkaOrder}_${d.labelNumber}`.toLowerCase();
      return d.name.toLowerCase().includes(q) ||
             d.labelNumber.toLowerCase().includes(q) ||
             (d.orderNumber && d.orderNumber.toLowerCase().includes(q)) ||
             d.id.toLowerCase().includes(q) ||
             fullQr.includes(q) ||
             (d.barcode && d.barcode.toLowerCase().includes(q)) ||
             (d.notes && d.notes.toLowerCase().includes(q));
    });

    return [...filtered].sort((a, b) => {
      const cmp = comparePositionNumbers(a.labelNumber, b.labelNumber);
      return positionSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [currentMaterialDetails, searchPartsQuery, order.orderNumber, positionSortOrder]);

  // Handle Scanning or Marking a Part
  const handleScanCode = (codeToScan: string) => {
    // Reset inputs immediately
    setScanInput('');
    barcodeBufferRef.current = '';
    if (scannerInputRef.current) {
      scannerInputRef.current.value = '';
    }

    setScanErrorMsg(null);
    setScanSuccessMsg(null);

    const cleanCode = cleanRawScannedString(codeToScan);
    if (!cleanCode) {
      scannerInputRef.current?.focus();
      return;
    }

    // Check QR Command first
    const cmdResult = processQRCommand(cleanCode, {
      onStartShift: () => {
        setShowShiftRequiredModal(false);
        if (onStartShift) onStartShift();
        window.dispatchEvent(new CustomEvent('erp_cmd_start_shift'));
        setScanSuccessMsg('🟢 Смена успешно начата!');
      },
      onEndShift: () => {
        setShowShiftRequiredModal(false);
        window.dispatchEvent(new CustomEvent('erp_cmd_end_shift'));
        setScanSuccessMsg('📊 Открыт отчет: Итоги рабочей смены');
      },
      onFinishPackage: () => {
        if (currentStage === 'packing' || currentStage === 'kitting') {
          window.dispatchEvent(new CustomEvent('erp_cmd_close_box'));
          setScanSuccessMsg('📦 Команда: Закрыть коробку / место');
          speakText('Команда: Закрыть коробку');
        } else {
          setScanErrorMsg('⚠️ Команда «Закрыть место» работает только на участках Комплектовки и Упаковки');
          speakText('Команда закрытия места доступна только на упаковке и комплектовке');
          playSoundEffect('error');
        }
      },
      onNextStage: () => {
        if (isStageFullyScanned) {
          setScanSuccessMsg(`✅ Команда «Завершить этап»: этап ${stageMeta.shortName} успешно завершен!`);
          speakText(`Этап ${stageMeta.shortName} завершен`);
          handleCompleteCurrentStageAndExit();
        } else {
          setScanErrorMsg(`⚠️ Не все детали отсканированы (${totalStageScannedParts}/${totalOrderParts}). Подтвердите завершение.`);
          speakText('Не все детали отсканированы. Требуется подтверждение');
          setShowForceCompleteModal(true);
        }
      },
      onPrintAct: () => {
        setScanSuccessMsg('🖨️ Запуск печати акта сдачи...');
        window.print();
      }
    });

    if (cmdResult.isCommand) {
      setScanSuccessMsg(cmdResult.message || 'Выполнена команда QR-кода');
      playSoundEffect('success');
      scannerInputRef.current?.focus();
      return;
    }

    const currentOrder = localOrderRef.current;
    const template = settings?.birkaQrFormatTemplate;
    const orderNum = currentOrder.orderNumber || '';
    const allOrderDetails = consolidateDetails(currentOrder.birkaData?.details || []);

    if (allOrderDetails.length === 0) {
      setScanErrorMsg(`В заказе отсутствуют детали спецификации бирок`);
      playSoundEffect('error');
      return;
    }

    // 1. Find ALL details in the order that match the scanned code
    let matchingParts = allOrderDetails.filter((d: BirkaDetail) => {
      return matchDetailToScannedCode(cleanCode, d, template, orderNum, settings?.birkaQrMatchingMode);
    });

    // 2. Fallback: token-based matching if no direct matches found
    if (matchingParts.length === 0) {
      const tokens = cleanCode.split(/[_|/\\;:,\-\s]+/).map(t => t.trim()).filter(Boolean);
      for (const tok of tokens) {
        const tokenMatches = allOrderDetails.filter(d => matchDetailToScannedCode(tok, d, template, orderNum, settings?.birkaQrMatchingMode));
        if (tokenMatches.length > 0) {
          matchingParts.push(...tokenMatches);
          break;
        }
      }
    }

    if (matchingParts.length === 0) {
      setScanErrorMsg(`Код "${cleanCode}" не совпал ни с одной деталью в заказе`);
      playSoundEffect('error');
      return;
    }

    // Get current stage scanning progress
    const stageProg = currentOrder.stageScanningProgress?.[currentStage] || {};
    const currentStageAllScannedList: string[] = [];
    Object.values(stageProg).forEach(matGroup => {
      if (matGroup && Array.isArray(matGroup.scannedPartIds)) {
        currentStageAllScannedList.push(...matGroup.scannedPartIds);
      }
    });

    // Prioritize an unscanned or partially scanned part!
    let foundPart = matchingParts.find(d => {
      const scannedQty = getScannedCountForDetail(currentStageAllScannedList, d.id);
      const reqQty = Math.max(1, d.quantity || 1);
      return scannedQty < reqQty;
    });

    if (!foundPart) {
      // If all matching instances are already scanned, pick the first one for the alert
      foundPart = matchingParts[0];
    }

    const targetMaterial = foundPart.material || 'Без указания материала';

    // Auto-switch material tab if needed
    if (selectedMaterial !== targetMaterial) {
      setSelectedMaterial(targetMaterial);
    }

    const targetMaterialDetails = allOrderDetails.filter(d => (d.material || 'Без указания материала') === targetMaterial);
    const effectiveStageDetails = targetMaterialDetails;

    // Check if detail is unlocked/available for this stage in live mode
    const availability = getDetailAvailabilityForStage(foundPart, currentOrder, currentStage, settings);
    if (!availability.isAvailable) {
      playSoundEffect('alert');
      speakText('Деталь не готова');
      setScanSuccessMsg(`⛔ Деталь №${foundPart.labelNumber} («${foundPart.name}») заблокирована! ${availability.blockingReason}`);
      return;
    }

    const currentMatScannedIds = stageProg[targetMaterial]?.scannedPartIds || [];
    const currentPartScannedCount = getScannedCountForDetail(currentMatScannedIds, foundPart.id);
    const reqPartQty = Math.max(1, foundPart.quantity || 1);

    if (currentPartScannedCount >= reqPartQty) {
      setScanSuccessMsg(`Деталь №${foundPart.labelNumber} («${foundPart.name}») уже полностью отсканирована (все ${reqPartQty} шт.)`);
      playSoundEffect('alert');
      return;
    }

    // Mark +1 piece instance as scanned
    const nextInstanceNumber = currentPartScannedCount + 1;
    const newEntryId = nextInstanceNumber === 1 ? foundPart.id : `${foundPart.id}#${nextInstanceNumber}`;
    const newScannedIds = [...currentMatScannedIds, newEntryId];

    const isAllScanned = effectiveStageDetails.every(d => isDetailFullyScanned(newScannedIds, d));

    const updatedStageScanning = { ...(currentOrder.stageScanningProgress || {}) };
    if (!updatedStageScanning[currentStage]) {
      updatedStageScanning[currentStage] = {};
    }
    updatedStageScanning[currentStage][targetMaterial] = {
      scannedPartIds: newScannedIds,
      isCompleted: isAllScanned
    };

    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      currentStage: currentStage,
      stageScanningProgress: updatedStageScanning
    };

    localOrderRef.current = updatedOrder;
    setLocalOrder(updatedOrder);
    onUpdateOrder(updatedOrder);

    // Instant flash visual notification and scroll into view
    setRecentlyScannedPartId(foundPart.id);
    setScannedPartFlashInfo({
      id: foundPart.id,
      labelNumber: foundPart.labelNumber,
      name: foundPart.name,
      count: nextInstanceNumber,
      total: reqPartQty
    });

    setTimeout(() => {
      const el = document.getElementById(`part-row-${foundPart.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    setTimeout(() => {
      setRecentlyScannedPartId(prev => prev === foundPart.id ? null : prev);
      setScannedPartFlashInfo(prev => prev?.id === foundPart.id ? null : prev);
    }, 4500);

    if (nextInstanceNumber >= reqPartQty) {
      setScanSuccessMsg(`✅ Деталь №${foundPart.labelNumber} «${foundPart.name}» полностью отсканирована (${nextInstanceNumber} из ${reqPartQty} шт.)!`);
    } else {
      setScanSuccessMsg(`✅ Отсканирована деталь №${foundPart.labelNumber} «${foundPart.name}» (${nextInstanceNumber} из ${reqPartQty} шт.)`);
    }
    playSoundEffect('success');

    // Check if edging stage detail requires no drilling -> speak and show finished part alert
    if (currentStage === 'edging') {
      const needsPrisadka = detailRequiresPrisadka(foundPart, settings);
      if (!needsPrisadka) {
        speakText('Готовая деталь');
        setFinishedPartNotice({
          isOpen: true,
          labelNumber: foundPart.labelNumber,
          partName: foundPart.name,
          materialName: targetMaterial
        });
      }
    }

    const hasNoteText = !!foundPart.notes && foundPart.notes.trim().length > 0;
    const matchedRule = getMatchedNoteRule(foundPart.notes, foundPart.name);

    if (hasNoteText || matchedRule) {
      const instructionText = hasNoteText 
        ? `ПРИМЕЧАНИЕ К ДЕТАЛИ: "${foundPart.notes}". Обратите внимание на обработку!`
        : matchedRule?.instruction || 'Обратите внимание на инструкцию к этой детали';

      setOperatorInstructionAlert({
        labelNumber: foundPart.labelNumber,
        partName: foundPart.name,
        instruction: instructionText,
        color: matchedRule?.color || 'rose'
      });
    }
  };

  // Global Barcode & QR Scanner Listener
  useEffect(() => {
    if (currentStage === 'kitting' || currentStage === 'packing' || currentStage === 'shipping') {
      return;
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showCameraScannerModal) return;

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

      if (e.key === 'Enter') {
        const rawCode = isScannerInput
          ? (scannerInputRef.current?.value || scanInput).trim()
          : (barcodeBufferRef.current || scannerInputRef.current?.value || scanInput).trim();
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
        if (now - lastKeyTimeRef.current > 1000) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;

        barcodeBufferRef.current += e.key;

        setScanInput(barcodeBufferRef.current);

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
  }, [showCameraScannerModal, scanInput, selectedMaterial, currentMaterialDetails, currentStage]);

  // Toggle single detail scanned status manually
  const toggleDetailScanned = (detail: BirkaDetail) => {
    const currentOrder = localOrderRef.current;
    const mat = detail.material || selectedMaterial || 'Без указания материала';
    const matScanning = currentOrder.stageScanningProgress?.[currentStage]?.[mat] || { scannedPartIds: [], isCompleted: false };
    const matScannedIds = matScanning.scannedPartIds || [];

    const currentCount = getScannedCountForDetail(matScannedIds, detail.id);
    const reqQty = Math.max(1, detail.quantity || 1);

    let newScannedIds: string[] = [];
    if (currentCount >= reqQty) {
      // Reset this detail (remove all scanned instances)
      newScannedIds = matScannedIds.filter(id => id !== detail.id && !id.startsWith(detail.id + '#') && !id.startsWith(detail.id + '_inst_'));
      setScanSuccessMsg(`ℹ️ Сброшена отметка детали №${detail.labelNumber} «${detail.name}»`);
    } else {
      const availability = getDetailAvailabilityForStage(detail, currentOrder, currentStage, settings);
      if (!availability.isAvailable) {
        playSoundEffect('alert');
        speakText('Деталь не готова');
        setScanSuccessMsg(`⛔ Деталь №${detail.labelNumber} («${detail.name}») заблокирована! ${availability.blockingReason}`);
        return;
      }
      const nextCount = currentCount + 1;
      const newId = nextCount === 1 ? detail.id : `${detail.id}#${nextCount}`;
      newScannedIds = [...matScannedIds, newId];

      if (nextCount >= reqQty) {
        setScanSuccessMsg(`✅ Деталь №${detail.labelNumber} «${detail.name}» полностью отмечена (${nextCount} из ${reqQty} шт.)`);
      } else {
        setScanSuccessMsg(`✅ Отмечена деталь №${detail.labelNumber} «${detail.name}» (${nextCount} из ${reqQty} шт.)`);
      }
      playSoundEffect('success');
    }

    const allMatDetails = consolidateDetails(currentOrder.birkaData?.details || []).filter(d => (d.material || 'Без указания материала') === mat);
    const effectiveMatDetails = allMatDetails;

    const isAllScanned = effectiveMatDetails.length > 0
      ? effectiveMatDetails.every(d => isDetailFullyScanned(newScannedIds, d))
      : newScannedIds.length >= allMatDetails.length;

    const updatedStageScanning = { ...(currentOrder.stageScanningProgress || {}) };
    if (!updatedStageScanning[currentStage]) {
      updatedStageScanning[currentStage] = {};
    }
    updatedStageScanning[currentStage][mat] = {
      scannedPartIds: newScannedIds,
      isCompleted: isAllScanned
    };

    const updatedOrder: ProductionOrder = {
      ...currentOrder,
      currentStage: currentStage,
      stageScanningProgress: updatedStageScanning
    };

    localOrderRef.current = updatedOrder;
    setLocalOrder(updatedOrder);
    onUpdateOrder(updatedOrder);

    if (currentCount < reqQty) {
      setRecentlyScannedPartId(detail.id);
      setScannedPartFlashInfo({
        id: detail.id,
        labelNumber: detail.labelNumber,
        name: detail.name,
        count: currentCount + 1,
        total: reqQty
      });

      setTimeout(() => {
        const el = document.getElementById(`part-row-${detail.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      setTimeout(() => {
        setRecentlyScannedPartId(prev => prev === detail.id ? null : prev);
        setScannedPartFlashInfo(prev => prev?.id === detail.id ? null : prev);
      }, 4500);
    }

    if (currentCount < reqQty && currentStage === 'edging') {
      const needsPrisadka = detailRequiresPrisadka(detail, settings);
      if (!needsPrisadka) {
        speakText('Готовая деталь');
        setFinishedPartNotice({
          isOpen: true,
          labelNumber: detail.labelNumber,
          partName: detail.name,
          materialName: mat
        });
      }
    }
  };

  // Finalize stage completion logic (regular or forced)
  const finalizeStageCompletion = (isForced: boolean = false, forcedReasonText?: string) => {
    const nextSt = getNextRequiredStage(order, currentStage);
    const nowIso = new Date().toISOString();
    const stageProgress = order.stageScanningProgress?.[currentStage] || {};
    let completedPartsOnStage = 0;
    Object.values(stageProgress).forEach((m: any) => {
      completedPartsOnStage += (m.scannedPartIds?.length || 0);
    });
    if (completedPartsOnStage === 0) completedPartsOnStage = order.partsCount || 1;

    const newLog = {
      id: `log-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      employeeId: empId !== 'unknown' ? empId : (order.responsibleEmployeeId || 'emp-current'),
      employeeName: empName !== 'Сотрудник' ? empName : (order.responsibleEmployeeName || 'Сотрудник цеха'),
      stageId: currentStage,
      startTime: nowIso,
      endTime: nowIso,
      scannedPartsCount: completedPartsOnStage,
      scannedAreaM2: order.totalAreaM2 || 0,
      scannedEdgeM: currentStage === 'edging' ? order.totalEdgeM : 0,
      status: 'completed' as const
    };

    const updatedLogs = [...(order.workLogs || []), newLog];

    // Compute unscanned parts if forced
    const updatedForcedStageCompletions = { ...(order.forcedStageCompletions || {}) };
    if (isForced) {
      const allOrderDetails = consolidateDetails(order.birkaData?.details || []);
      const stageRelevantDetails = allOrderDetails;
      
      const unscannedIds = stageRelevantDetails
        .filter(d => !allScannedPartIds.has(d.id))
        .map(d => d.id);

      updatedForcedStageCompletions[currentStage] = {
        forcedByEmployeeName: empName !== 'Сотрудник' ? empName : (order.responsibleEmployeeName || 'Сотрудник участка'),
        forcedByEmployeeId: empId !== 'unknown' ? empId : undefined,
        forcedAt: new Date().toLocaleString('ru-RU'),
        unscannedPartIds: unscannedIds,
        reason: forcedReasonText || 'Принудительное завершение без сканирования всех деталей'
      };
    }

    if (nextSt) {
      onUpdateOrder({
        ...order,
        currentStage: nextSt,
        workLogs: updatedLogs,
        forcedStageCompletions: updatedForcedStageCompletions
      });
      onUpdateOrderStatus(order.id, nextSt);
    } else {
      onUpdateOrder({
        ...order,
        status: 'completed',
        workLogs: updatedLogs,
        forcedStageCompletions: updatedForcedStageCompletions
      });
    }

    playSoundEffect('success');
    // Exit back to production stations list
    onBack();
  };

  // Complete current stage & return user to production view
  const handleCompleteCurrentStageAndExit = () => {
    if (!isStageFullyScanned && (currentStage === 'cutting' || currentStage === 'edging' || currentStage === 'cnc' || currentStage === 'assembly')) {
      playSoundEffect('alert');
      setScanErrorMsg(`Нельзя завершить этап штатно: отсканировано ${totalStageScannedParts} из ${totalOrderParts} деталей. Используйте «Всё равно завершить этап» для принудительного перехода.`);
      return;
    }

    if (currentStage === 'cutting') {
      setShowOffcutsModal(true);
      return;
    }
    if (currentStage === 'edging') {
      setShowEdgingRemainsModal(true);
      return;
    }
    finalizeStageCompletion(false);
  };

  const handleConfirmForceComplete = () => {
    setShowForceCompleteModal(false);
    if (currentStage === 'cutting') {
      setShowOffcutsModal(true);
      return;
    }
    if (currentStage === 'edging') {
      setShowEdgingRemainsModal(true);
      return;
    }
    finalizeStageCompletion(true, forceCompleteReason);
  };

  const handleOffcutsSubmitted = (offcuts: MaterialResidual[]) => {
    if (offcuts.length > 0 && onAddMaterialResiduals) {
      onAddMaterialResiduals(offcuts);
    }
    setShowOffcutsModal(false);
    finalizeStageCompletion(!isStageFullyScanned, forceCompleteReason);
  };

  const handleEdgingRemainsSubmitted = (edges: MaterialResidual[]) => {
    if (edges.length > 0 && onAddMaterialResiduals) {
      onAddMaterialResiduals(edges);
    }
    setShowEdgingRemainsModal(false);
    finalizeStageCompletion(!isStageFullyScanned, forceCompleteReason);
  };

  // Total stage completion status
  const allMaterialGroups = order.birkaData?.materialGroups || [];
  const stageEffectiveDetails = useMemo(() => {
    return consolidatedOrderDetails;
  }, [consolidatedOrderDetails]);

  const totalOrderParts = useMemo(() => {
    if (stageEffectiveDetails.length > 0) {
      return stageEffectiveDetails.reduce((sum, d) => sum + (d.quantity || 1), 0);
    }
    return order.partsCount || 1;
  }, [stageEffectiveDetails, order.partsCount]);

  const totalStageScannedParts = useMemo(() => {
    if (currentStage === 'packing') {
      const packedCount = (order.packages || []).reduce((sum, pkg) => {
        return sum + (pkg.parts?.reduce((pSum, pt) => pSum + Math.max(1, pt.quantity || 1), 0) || 0);
      }, 0);
      return Math.min(packedCount, totalOrderParts);
    }
    if (currentStage === 'kitting') {
      const kittingPkgs = (order.packages || []).filter(p => p.type === 'kitting');
      if (kittingPkgs.length > 0) return totalOrderParts;
      return 0;
    }
    if (currentStage === 'shipping') {
      const pkgs = order.packages || [];
      if (pkgs.length === 0) return totalOrderParts;
      const shipped = pkgs.filter(p => p.isShipped);
      if (shipped.length >= pkgs.length) return totalOrderParts;
      return Math.round((shipped.length / pkgs.length) * totalOrderParts);
    }
    if (stageEffectiveDetails.length === 0) return allStageScannedIds.length;
    return stageEffectiveDetails.reduce((sum, d) => {
      const count = getScannedCountForDetail(allStageScannedIds, d.id);
      return sum + Math.min(count, d.quantity || 1);
    }, 0);
  }, [currentStage, stageEffectiveDetails, allStageScannedIds, order.packages, totalOrderParts]);

  const isStageFullyScanned = totalStageScannedParts >= totalOrderParts && totalOrderParts > 0;
  const missingPartsCount = Math.max(0, totalOrderParts - totalStageScannedParts);

  // Listen to erp_cmd_next_stage event triggered by QR scanner
  useEffect(() => {
    const handleNextStageEvent = () => {
      if (isStageFullyScanned) {
        setScanSuccessMsg(`✅ Команда «Завершить этап»: этап ${stageMeta.shortName} успешно завершен!`);
        speakText(`Этап ${stageMeta.shortName} завершен`);
        handleCompleteCurrentStageAndExit();
      } else {
        setScanErrorMsg(`⚠️ Не все детали отсканированы (${totalStageScannedParts}/${totalOrderParts}). Подтвердите завершение.`);
        speakText('Не все детали отсканированы. Требуется подтверждение');
        setShowForceCompleteModal(true);
      }
    };

    window.addEventListener('erp_cmd_next_stage', handleNextStageEvent);
    return () => {
      window.removeEventListener('erp_cmd_next_stage', handleNextStageEvent);
    };
  }, [isStageFullyScanned, stageMeta.shortName, totalStageScannedParts, totalOrderParts]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Bar: Dedicated Workstation Focus */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border border-slate-700 shadow-sm hover:text-white"
            title="Вернуться к списку заказов на участке"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Назад в цех</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm ${stageMeta.badge}`}>
                <StageIcon className="w-4 h-4" />
                <span>{stageMeta.name}</span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-slate-800 text-white text-xs font-black font-mono border border-slate-700">
                Заказ {cleanOrderNumber(order.orderNumber, order.id)}
              </span>

              <a
                href={getBitrixDealUrl(order, settings)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  const dealUrl = getBitrixDealUrl(order, settings);
                  if (dealUrl === '#') {
                    e.preventDefault();
                    const dealId = extractBitrixDealId(order);
                    const val = prompt('Введите URL или ID сделки в Битрикс24:', dealId || '');
                    if (val) {
                      const url = val.startsWith('http') ? val : `https://b24.ru/crm/deal/details/${val}/`;
                      const updated = {
                        ...order,
                        bitrixUrl: url,
                        bitrixDealId: val
                      };
                      setLocalOrder(updated);
                      onUpdateOrder(updated);
                      window.open(url, '_blank');
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="Открыть сделку в Битрикс24"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>B24</span>
              </a>

              {order.birkaData && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" /> {order.birkaData.fileName}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300">
              {(() => {
                const { clientName: clientNameClean, projectName: projectNameClean } = getSmartOrderDisplay(order);
                return (
                  <>
                    Клиент: <strong className="text-white font-bold">{clientNameClean || projectNameClean || 'Частный заказчик'}</strong>
                  </>
                );
              })()}
              {order.plannedCuttingDate && (
                <> • План сдачи: <strong className="text-amber-400">{order.plannedCuttingDate}</strong></>
              )}
            </div>

            {/* Active workers indicator in workspace */}
            {(() => {
              const activeOthers = (order.activeWorkers || []).filter(w => 
                w.employeeName.trim().toLowerCase() !== empName.trim().toLowerCase()
              );
              if (activeOthers.length === 0) return null;
              return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 font-medium select-none animate-pulse mt-2 max-w-fit">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Над заказом сейчас работают:</span>
                  <div className="flex items-center gap-1.5 flex-wrap text-white">
                    {activeOthers.map((w, idx) => (
                      <span key={idx} className="font-extrabold text-emerald-100 bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-800">
                        {w.employeeName} {w.role ? `(${w.role})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Actions: Finish Stage & Return to Production */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 self-end md:self-auto">
          {/* Main regular Finish Stage button (enabled when 100% or warning if not) */}
          <button
            onClick={handleCompleteCurrentStageAndExit}
            disabled={!isStageFullyScanned}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isStageFullyScanned 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40 animate-pulse' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
            title={isStageFullyScanned ? "Все детали отмечены. Завершить этап и передать дальше" : `Не все детали отмечены (${totalStageScannedParts}/${totalOrderParts})`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Завершить {stageMeta.shortName} и передать</span>
          </button>

          {/* Small Force Complete Button if not all parts scanned */}
          {!isStageFullyScanned && (
            <button
              onClick={() => setShowForceCompleteModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 font-bold text-[11px] border border-rose-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="Принудительно передать заказ дальше. Неотмеченные детали будут подсвечены на следующем этапе"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Всё равно завершить этап ({missingPartsCount} не отсканировано)</span>
            </button>
          )}
        </div>
      </div>

      {/* SPECIALIZED WORKSTATION VIEW SWITCHING */}

      {/* 1. KITTING WORKSTATION (Участок комплектовки фурнитуры и крепежа) */}
      {currentStage === 'kitting' && (
        <div className="space-y-6">
          <ERPKittingTab 
            order={order}
            settings={settings}
            currentUser={currentUser}
            onUpdateOrder={onUpdateOrder}
            onUpdateOrderStatus={onUpdateOrderStatus}
          />

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Комплектация фурнитуры завершена?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                После формирования всех коробок нажмите кнопку для передачи заказа на упаковку / склад.
              </p>
            </div>
            <button
              onClick={handleCompleteCurrentStageAndExit}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Завершить комплектовку и вернуться в цех</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. PACKING WORKSTATION (Участок упаковки мест и этикеток) */}
      {currentStage === 'packing' && (
        <div className="space-y-6">
          <ERPPackagingTab 
            order={order}
            settings={settings}
            currentUser={currentUser}
            onUpdateOrder={onUpdateOrder}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onOpenScannerModal={() => setShowCameraScannerModal(true)}
          />

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Все места упакованы и промаркированы?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Заказ будет переведен в готовность к отгрузке, а вы вернетесь к выбору следующего заказа.
              </p>
            </div>
            <button
              onClick={handleCompleteCurrentStageAndExit}
              className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Завершить упаковку и вернуться в цех</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SHIPPING WORKSTATION (Склад и отгрузка водителю) */}
      {currentStage === 'shipping' && (
        <div className="space-y-6">
          <ERPShippingTab 
            order={order}
            settings={settings}
            currentUser={currentUser}
            employees={employees}
            onUpdateOrder={onUpdateOrder}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onOpenScannerModal={() => setShowCameraScannerModal(true)}
            onAddEmployee={onAddEmployee}
          />
        </div>
      )}

      {/* 4. MACHINE & FABRICATION WORKSTATIONS (Распил, Кромка, Присадка ЧПУ, Фасады, Сборка, ОТК) */}
      {currentStage !== 'kitting' && currentStage !== 'packing' && currentStage !== 'shipping' && (
        <div className="space-y-6">
          {/* Missing Birka File Warning & Direct Upload */}
          {!order.birkaData ? (
            <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-indigo-200 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">
                  Загрузите файл спецификации бирок
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Для сканирования деталей на станке прикрепите выгрузку из Базис-Раскрой, bCAD, К3 или Excel.
                </p>
              </div>

              <div className="flex justify-center">
                <label className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Обработка файла...' : 'Выбрать файл спецификации (.xlsx, .csv, .txt)'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (4 cols): Materials Selector & Scanner Controls */}
              <div className="lg:col-span-4 space-y-4">
                {/* Material Groups Pills */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Материалы заказа
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Всего: {totalStageScannedParts} / {totalOrderParts} шт.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.birkaData.materialGroups.map((mg) => {
                      const matName = mg.materialName;
                      const matDetails = consolidateDetails(order.birkaData?.details || []).filter(d => (d.material || 'Без указания материала') === matName);

                      const isSelected = selectedMaterial === matName;
                      const matTotalPieces = matDetails.reduce((sum, d) => sum + (d.quantity || 1), 0);
                      const matScannedPieces = matDetails.reduce((sum, d) => {
                        const count = getScannedCountForDetail(allStageScannedIds, d.id);
                        return sum + Math.min(count, d.quantity || 1);
                      }, 0);
                      const isComplete = matTotalPieces > 0 && matScannedPieces >= matTotalPieces;

                      return (
                        <button
                          key={matName}
                          onClick={() => {
                            setSelectedMaterial(matName);
                            scannerInputRef.current?.focus();
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-slate-900 truncate">
                              {matName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{matScannedPieces} из {matTotalPieces} шт. ({matDetails.length} поз.)</span>
                              <span>•</span>
                              <span>{mg.totalAreaM2} м²</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                              isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {matScannedPieces}/{matTotalPieces}
                            </span>
                            {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
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
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                        title="Включить сканирование камерой телефона или планшета"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Сканировать</span>
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
                        onChange={(e) => setScanInput(e.target.value)}
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

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Поддерживает сканирование QR-кода бирки (например <code className="text-emerald-300 font-bold">{order.orderNumber || '00-0000-00'}_20.02</code>), штрихкода или номера позиции детали (<code className="text-indigo-300 font-bold">20.02</code>).
                  </p>

                  {/* Scan Success Alert */}
                  {scanSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{scanSuccessMsg}</span>
                    </div>
                  )}

                  {/* Scan Error Alert */}
                  {scanErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{scanErrorMsg}</span>
                    </div>
                  )}

                  {/* Finish Station Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleCompleteCurrentStageAndExit}
                      className="w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Завершить {stageMeta.shortName} и вернуться в цех</span>
                    </button>
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

              {/* Right Column (8 cols): Parts List & Interactive Progress */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
                {/* Instant Scanned Part Flash Banner */}
                {scannedPartFlashInfo && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-xl border-2 border-emerald-300 animate-in fade-in zoom-in-95 duration-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-md animate-bounce shrink-0">
                        <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                          Мгновенная отметка детали
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          Деталь №{scannedPartFlashInfo.labelNumber} «{scannedPartFlashInfo.name}»
                          <span className="ml-2 font-mono text-xs bg-emerald-800/90 px-2 py-0.5 rounded-lg border border-emerald-400/40">
                            {scannedPartFlashInfo.count} из {scannedPartFlashInfo.total} шт.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-black">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ОТМЕЧЕНО В СПИСКЕ</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      Детали материала: <span className="text-blue-600">{selectedMaterial || 'Не выбран'}</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Нажмите на строку детали для ручной отметки выполнения.
                    </p>
                  </div>

                  {/* Search and Sort controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPositionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Нажмите для смены порядка сортировки по № позиции"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                      <span>№ {positionSortOrder === 'asc' ? '1 → 9' : '9 → 1'}</span>
                    </button>
                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Поиск по № или названию..."
                        value={searchPartsQuery}
                        onChange={(e) => setSearchPartsQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Parts Table */}
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50">
                        <th className="py-2.5 px-3">Статус</th>
                        <th 
                          onClick={() => setPositionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="py-2.5 px-3 cursor-pointer select-none hover:bg-slate-100 text-slate-800 transition-colors"
                          title="Кликните для переключения сортировки по № позиции (от меньшего или от большего)"
                        >
                          <div className="flex items-center gap-1">
                            <span>№ позиции</span>
                            <span className="text-blue-600 font-extrabold text-xs">
                              {positionSortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          </div>
                        </th>
                        <th className="py-2.5 px-3">Наименование</th>
                        <th className="py-2.5 px-3 text-center">Кол-во</th>
                        <th className="py-2.5 px-3">Размер (мм)</th>
                        <th className="py-2.5 px-3">Кромка</th>
                        <th className="py-2.5 px-3">Отверстия</th>
                        <th className="py-2.5 px-3">Примечания</th>
                        <th className="py-2.5 px-3 text-center">Брак</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {sortedAndFilteredDetails
                        .map((detail) => {
                          const reqQty = Math.max(1, detail.quantity || 1);
                          const scannedQty = getScannedCountForDetail(allStageScannedIds, detail.id);
                          const isFullyScanned = scannedQty >= reqQty;
                          const isPartiallyScanned = scannedQty > 0 && scannedQty < reqQty;

                          const matchedRule = getMatchedNoteRule(detail.notes, detail.name);
                          const birkaOrder = detail.orderNumber || order.orderNumber || '';
                          const expectedQr = detail.barcode || (birkaOrder ? `${birkaOrder}_${detail.labelNumber}` : detail.labelNumber);

                          // Check if this detail was forced/unscanned in a previous stage
                          let previousForcedInfo: { stageName: string; employeeName: string; forcedAt: string; reason?: string } | null = null;
                          if (order.forcedStageCompletions) {
                            for (const [stgId, info] of Object.entries(order.forcedStageCompletions)) {
                              if (stgId !== currentStage && info.unscannedPartIds?.includes(detail.id)) {
                                const stgShort = getStageNameRussian(stgId);
                                previousForcedInfo = {
                                  stageName: stgShort,
                                  employeeName: info.forcedByEmployeeName,
                                  forcedAt: info.forcedAt,
                                  reason: info.reason
                                };
                                break;
                              }
                            }
                          }

                          const availability = getDetailAvailabilityForStage(detail, localOrder, currentStage, settings);
                          const isLocked = !availability.isAvailable;
                          const isRecentlyScanned = detail.id === recentlyScannedPartId;

                          return (
                            <tr
                              key={detail.id}
                              id={`part-row-${detail.id}`}
                              onClick={() => toggleDetailScanned(detail)}
                              className={`transition-all duration-300 ${
                                isRecentlyScanned
                                  ? 'bg-emerald-200/90 border-2 border-emerald-500 ring-4 ring-emerald-400/60 shadow-xl scale-[1.01] font-extrabold text-emerald-950 animate-pulse cursor-pointer'
                                  : isLocked
                                  ? 'bg-slate-100/70 hover:bg-slate-100 opacity-60 cursor-not-allowed text-slate-500'
                                  : previousForcedInfo
                                  ? 'bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-500 cursor-pointer'
                                  : isFullyScanned
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100/80 cursor-pointer'
                                  : isPartiallyScanned
                                  ? 'bg-amber-50/70 hover:bg-amber-100/80 cursor-pointer'
                                  : 'hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              {/* Status Checkbox */}
                              <td className="py-2.5 px-3">
                                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                  isRecentlyScanned
                                    ? 'bg-emerald-600 border-2 border-emerald-400 text-white shadow-md animate-bounce scale-110'
                                    : isLocked
                                    ? 'border-slate-300 bg-slate-200 text-slate-400'
                                    : isFullyScanned
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : isPartiallyScanned
                                    ? 'bg-amber-500 border-amber-500 text-white font-bold text-[10px] shadow-xs'
                                    : previousForcedInfo
                                    ? 'border-rose-400 bg-white'
                                    : 'border-slate-300 bg-white hover:border-slate-400'
                                }`}>
                                  {isRecentlyScanned ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : isLocked ? (
                                    <Lock className="w-3 h-3 text-slate-400" />
                                  ) : isFullyScanned ? (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  ) : isPartiallyScanned ? (
                                    <span>{scannedQty}/{reqQty}</span>
                                  ) : null}
                                </div>
                              </td>

                              {/* Label Number */}
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{detail.labelNumber}</span>
                                  {isRecentlyScanned && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs animate-bounce">
                                      <CheckCircle2 className="w-3 h-3" />
                                      ОТМЕЧЕНО СЕЙЧАС
                                    </span>
                                  )}
                                  {isLocked && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold border border-slate-300">
                                      <Lock className="w-2.5 h-2.5" />
                                      Залочена
                                    </span>
                                  )}
                                  {previousForcedInfo && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse" title={`Пропущена на этапе «${previousForcedInfo.stageName}»`}>
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      ВНИМАНИЕ
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Part Name + Warning Note */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800 flex flex-col">
                                  <span>{detail.name}</span>
                                  {isLocked && availability.blockingReason && (
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70 max-w-max">
                                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                                      {availability.blockingReason}
                                    </span>
                                  )}
                                  {previousForcedInfo && (
                                    <div className="mt-1 text-[11px] font-normal leading-tight text-rose-700 bg-rose-100/80 p-1.5 rounded-lg border border-rose-300/80 max-w-sm">
                                      <div className="font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                        <span>На предыдущем этапе ({previousForcedInfo.stageName}) процесс был завершен принудительно без этой детали!</span>
                                      </div>
                                      <div className="mt-0.5 text-[10.5px] text-rose-900 font-semibold">
                                        Информацию о детали можно получить у: <span className="underline font-bold text-rose-950">{previousForcedInfo.employeeName}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Quantity Column */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                                  isFullyScanned 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : isPartiallyScanned 
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' 
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {scannedQty} / {reqQty} шт.
                                </span>
                              </td>

                              {/* Dimensions */}
                              <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                {detail.length} × {detail.width}
                              </td>

                              {/* Edge Visual Scheme */}
                              <td className="py-2.5 px-3">
                                <PartEdgeDiagram detail={detail} compact={false} />
                              </td>

                              {/* Hole Info */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {detail.holesEnd !== undefined || detail.holesFace !== undefined || detail.holesCount !== undefined ? (
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      (detail.holesEnd || 0) > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      Торец: {detail.holesEnd ?? 0}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      (detail.holesFace || 0) > 0 ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      Пласть: {detail.holesFace ?? 0}
                                    </span>
                                  </div>
                                ) : detailRequiresPrisadka(detail, settings) ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[10px] font-bold border border-purple-200">
                                    Присадка
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">0 отв.</span>
                                )}
                              </td>

                              {/* Notes */}
                              <td className="py-2.5 px-3">
                                {matchedRule ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                                    {matchedRule.pattern}
                                  </span>
                                ) : detail.notes ? (
                                  <span className="text-slate-600 text-[11px] truncate max-w-[120px] block" title={detail.notes}>
                                    {detail.notes}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">—</span>
                                )}
                              </td>

                              {/* Defect Button */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDefectTargetDetail(detail);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                                  title="Зафиксировать брак и направить на переделку"
                                >
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  <span>Брак</span>
                                </button>
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

      {/* Camera Scanner Modal */}
      <MobileCameraScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        onScan={(code) => {
          setShowCameraScannerModal(false);
          handleScanCode(code);
        }}
        title={`Сканирование камерой (${stageMeta.shortName})`}
        subtitle="Наведите камеру смартфона на QR-код или штрихкод бирки детали"
      />

      {/* Finished Part Separate Pack Notice Modal */}
      {finishedPartNotice?.isOpen && (
        <FinishedPartNoticeModal
          isOpen={finishedPartNotice.isOpen}
          labelNumber={finishedPartNotice.labelNumber}
          partName={finishedPartNotice.partName}
          materialName={finishedPartNotice.materialName}
          durationSeconds={settings?.finishedPartNoticeDuration ?? 5}
          onClose={() => setFinishedPartNotice(null)}
        />
      )}

      {/* Cutting Stage Offcuts Prompt Modal */}
      <CuttingOffcutsModal
        isOpen={showOffcutsModal}
        order={order}
        currentUser={currentUser}
        employees={employees}
        onClose={() => setShowOffcutsModal(false)}
        onSubmit={handleOffcutsSubmitted}
      />

      {/* Edging Stage Edge Remains Prompt Modal */}
      <EdgingRemainsModal
        isOpen={showEdgingRemainsModal}
        order={order}
        currentUser={currentUser}
        employees={employees}
        catalogMaterials={catalogMaterials}
        catalogProducts={catalogProducts}
        onClose={() => setShowEdgingRemainsModal(false)}
        onSubmit={handleEdgingRemainsSubmitted}
      />

      {/* Force Complete Stage Confirmation Modal */}
      {showForceCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-scale-in space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Принудительно завершить этап {stageMeta.shortName}?
                </h3>
                <p className="text-xs text-slate-500">
                  Не все детали были отсканированы. Всего в заказе: <strong>{totalOrderParts}</strong>, отсканировано: <strong>{totalStageScannedParts}</strong>, пропущено: <strong className="text-rose-600">{missingPartsCount}</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Последствия принудительного завершения:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-800 text-[11.5px] leading-relaxed">
                <li>Заказ будет передан на следующий этап: <strong>{getStageNameRussian(getNextRequiredStage(order, currentStage))}</strong>.</li>
                <li>Все неотсканированные детали на следующем участке <strong>будут подсвечены красным цветом</strong>.</li>
                <li>Будет указано ваше имя (<strong className="underline">{empName !== 'Сотрудник' ? empName : (order.responsibleEmployeeName || 'Оператор')}</strong>) как сотрудника, завершившего этап принудительно.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Причина принудительного завершения (необязательно):
              </label>
              <input
                type="text"
                placeholder="Например: деталь на допиле, повреждена кромка, брак плиты..."
                value={forceCompleteReason}
                onChange={(e) => setForceCompleteReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForceCompleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
              >
                Отмена (вернуться к сканированию)
              </button>
              <button
                type="button"
                onClick={handleConfirmForceComplete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Всё равно завершить этап</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report Defect Modal */}
      {defectTargetDetail && (
        <ReportDefectModal
          isOpen={!!defectTargetDetail}
          order={localOrder}
          detail={defectTargetDetail}
          settings={settings}
          currentUser={currentUser}
          allOrders={[]}
          onClose={() => setDefectTargetDetail(null)}
          onDefectReported={(updatedMainOrder, defectTaskOrder) => {
            onUpdateOrder(updatedMainOrder);
            if (defectTaskOrder) {
              onUpdateOrder(defectTaskOrder);
            }
            setDefectTargetDetail(null);
            setScanSuccessMsg(`Зафиксирован брак детали ${defectTargetDetail.labelNumber}. Передано на переделку.`);
            playSoundEffect('alert');
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  QrCode, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Tag, 
  FileText, 
  HelpCircle, 
  Upload, 
  Search, 
  AlertCircle, 
  Layers, 
  Info, 
  CheckSquare, 
  Square,
  MapPin,
  Zap,
  RefreshCw,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { 
  ProductionOrder, 
  OrderPackage, 
  ERPCompanySettings, 
  ERPEmployee, 
  ProductionStageId, 
  OrderHardwareItem, 
  OrderPackageHardwareItem 
} from '../types';
import { PackageLabelPrintModal } from './PackageLabelPrintModal';
import { parseHardwareFile } from '../utils/kittingParser';
import { arePrecedingStagesCompleted, getPackagingReadinessStats } from '../utils/stageReadiness';
import { processQRCommand, normalizeBarcodeScan, convertRuCharToEn } from '../utils';
import { printPackageLabelDirect } from '../utils/packageLabelPrinter';

interface ERPKittingTabProps {
  order: ProductionOrder;
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | null;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onCompleteKitting?: () => void;
}

export const ERPKittingTab: React.FC<ERPKittingTabProps> = ({
  order,
  settings,
  currentUser,
  onUpdateOrder,
  onUpdateOrderStatus,
  onCompleteKitting
}) => {
  const existingPackages = order.packages || [];
  const kittingPackages = existingPackages.filter(p => p.type === 'kitting');
  const nextNumber = existingPackages.length + 1;

  // Selected hardware items to be put into the current box being prepared
  // Map of hardwareId -> quantity to put in this box
  const [draftBoxItems, setDraftBoxItems] = useState<Record<string, number>>({});
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [packageName, setPackageName] = useState<string>(`Место ${nextNumber} (Фурнитура)`);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const [selectedPrintPkg, setSelectedPrintPkg] = useState<OrderPackage | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [autoPrintDirect, setAutoPrintDirect] = useState<boolean>(settings?.packageLabelSettings?.autoPrintOnCloseBox !== false);

  // Move Hardware Item Modal & Alert State
  const [moveHardwareModal, setMoveHardwareModal] = useState<{
    isOpen: boolean;
    sourcePkgId: string; // package id or 'draft'
    sourcePkgName: string;
    hardwareId: string;
    hardwareName: string;
    hardwareArticle?: string;
    hardwareUnit?: string;
    currentQty: number;
  } | null>(null);
  const [moveHardwareQty, setMoveHardwareQty] = useState<number>(1);
  const [moveHardwareTargetPkgId, setMoveHardwareTargetPkgId] = useState<string>('');

  // Prominent Alert when box contents change requiring label reprint
  const [reprintAlert, setReprintAlert] = useState<{
    isOpen: boolean;
    packages: OrderPackage[];
    message: string;
  } | null>(null);

  const hardwareData = order.hardwareData;
  const hardwareItems = hardwareData?.items || [];
  const categories = hardwareData?.categoriesSummary || [];

  // Calculate packed quantities live from created packages if not yet synced
  const totalHardwareUnits = hardwareData?.totalQuantity || hardwareItems.reduce((a, b) => a + b.quantity, 0);
  const totalPackedUnits = hardwareItems.reduce((a, b) => a + (b.packedQuantity || 0), 0);
  const packedPct = totalHardwareUnits > 0 ? Math.min(100, Math.round((totalPackedUnits / totalHardwareUnits) * 100)) : 0;
  const allPacked = totalHardwareUnits > 0 && totalPackedUnits >= totalHardwareUnits;

  // Quick preset templates for manual / standard boxes
  const quickPresets = [
    'Фурнитура (Blum)',
    'Фурнитура (Boyard / Hettich)',
    'Петли и ответные планки',
    'Направляющие ящиков',
    'Крепеж, конфирматы, стяжки',
    'Ручки мебельные и опоры',
    'Профиль Gola / Т-образный',
    'Стекло / Зеркала / Витраж',
    'Подсветка, трансформатор, проводка',
    'Инструкция и паспорт изделия'
  ];

  // Handle uploading Kitting file directly on this stage if missing or replacing
  const handleUploadKittingFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const parsed = await parseHardwareFile(file, settings?.hardwareColumnMapping);
      if (parsed.items.length === 0) {
        setUploadError('В файле не найдено строк с фурнитурой или неподдерживаемый формат.');
        setIsUploading(false);
        return;
      }

      // Re-calculate already packed quantities if packages were already created earlier
      const itemsWithPacked = parsed.items.map(item => {
        let packed = 0;
        kittingPackages.forEach(pkg => {
          pkg.hardwareItems?.forEach(hi => {
            if (hi.name.toLowerCase() === item.name.toLowerCase() || (hi.article && hi.article === item.article)) {
              packed += hi.quantity;
            }
          });
        });
        return {
          ...item,
          packedQuantity: Math.min(item.quantity, packed)
        };
      });

      onUpdateOrder({
        ...order,
        hardwareData: {
          fileName: parsed.fileName,
          uploadedAt: parsed.uploadedAt,
          items: itemsWithPacked,
          totalItemsCount: itemsWithPacked.length,
          totalQuantity: parsed.totalQuantity,
          categoriesSummary: parsed.categoriesSummary
        }
      });

      setFeedbackMsg(`Комплектовочная ведомость "${parsed.fileName}" успешно загружена (${itemsWithPacked.length} поз.)!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
      setUploadError('Ошибка разбора ведомости: ' + (e?.message || 'проверьте файл'));
    } finally {
      setIsUploading(false);
    }
  };

  // Draft box items manipulation
  const handleAddItemToDraft = (item: OrderHardwareItem, qtyToAdd: number) => {
    const currentInDraft = draftBoxItems[item.id] || 0;
    const remainingToPack = Math.max(0, item.quantity - (item.packedQuantity || 0));
    const nextQty = Math.min(remainingToPack, currentInDraft + qtyToAdd);

    if (nextQty <= 0) {
      const copy = { ...draftBoxItems };
      delete copy[item.id];
      setDraftBoxItems(copy);
    } else {
      setDraftBoxItems({
        ...draftBoxItems,
        [item.id]: nextQty
      });
    }

    // Auto update name suggestion if default
    if (packageName.startsWith(`Место ${nextNumber}`)) {
      const topCategory = item.category || 'Фурнитура';
      setPackageName(`Место ${nextNumber} (${topCategory})`);
    }
  };

  const handleSetAllRemainingToDraft = (item: OrderHardwareItem) => {
    const remainingToPack = Math.max(0, item.quantity - (item.packedQuantity || 0));
    if (remainingToPack > 0) {
      setDraftBoxItems({
        ...draftBoxItems,
        [item.id]: remainingToPack
      });
    }
  };

  const handleSelectAllRemainingCategory = (categoryName?: string) => {
    const newDraft = { ...draftBoxItems };
    hardwareItems.forEach(item => {
      if (!categoryName || categoryName === 'all' || (item.category || 'Разное / Крепеж') === categoryName) {
        const rem = Math.max(0, item.quantity - (item.packedQuantity || 0));
        if (rem > 0) {
          newDraft[item.id] = rem;
        }
      }
    });
    setDraftBoxItems(newDraft);
  };

  const handleClearDraft = () => {
    setDraftBoxItems({});
    setPackageName(`Место ${nextNumber} (Фурнитура)`);
    setCustomNotes('');
  };

  // Create Package from draft or manual description
  const handleCreatePackage = (forceOpenModal: boolean = false) => {
    // Build structured hardware items list from draft
    const packedItemsList: OrderPackageHardwareItem[] = [];
    const formattedNotesLines: string[] = [];

    let totalDraftUnits = 0;
    Object.entries(draftBoxItems).forEach(([hwId, qty]) => {
      if (qty <= 0) return;
      const original = hardwareItems.find(h => h.id === hwId);
      if (original) {
        totalDraftUnits += qty;
        packedItemsList.push({
          hardwareId: original.id,
          article: original.article,
          name: original.name,
          quantity: qty,
          unit: original.unit || 'шт',
          category: original.category
        });
        formattedNotesLines.push(`• ${original.name}${original.article ? ` [${original.article}]` : ''} — ${qty} ${original.unit || 'шт'}`);
      }
    });

    // Add selected mandatory documents
    const mandatoryDocsList = settings?.requiredKittingDocuments || [
      { id: 'doc-1', name: 'Паспорт изделия и инструкция по сборке', enabled: true },
      { id: 'doc-2', name: 'Акт приема-передачи товара', enabled: true },
      { id: 'doc-3', name: 'Чертежи и схема разметки', enabled: true }
    ];

    Object.entries(selectedDocs).forEach(([docId, isChecked]) => {
      if (!isChecked) return;
      const doc = mandatoryDocsList.find(d => d.id === docId);
      if (doc) {
        packedItemsList.push({
          hardwareId: doc.id,
          article: 'ДОК',
          name: doc.name,
          quantity: 1,
          unit: 'компл',
          category: 'Документы'
        });
        formattedNotesLines.push(`• [Документ] ${doc.name} — 1 компл`);
      }
    });

    if (customNotes.trim()) {
      formattedNotesLines.push(`Примечание: ${customNotes.trim()}`);
    }

    if (packedItemsList.length === 0 && !customNotes.trim()) {
      setUploadError('Вложите в коробку фурнитуру! В формируемом месте еще нет ни одной позиции.');
      setFeedbackMsg('Вложите в коробку фурнитуру! В формируемом месте еще нет ни одной позиции.');
      setTimeout(() => {
        setUploadError(null);
        setFeedbackMsg(null);
      }, 4000);
      return;
    }

    const cleanName = packageName.trim() || `Место ${nextNumber} (Фурнитура)`;
    const newPkgId = `pkg-kit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const uniqueCode = `PKG-${order.orderNumber}-KIT-${nextNumber}-${Date.now().toString().slice(-4)}`;

    const itemsSummary = formattedNotesLines.join('\n') || customNotes.trim() || 'Комплект мебельной фурнитуры и крепежа';

    const newPackage: OrderPackage = {
      id: newPkgId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageNumber: nextNumber,
      name: cleanName,
      type: 'kitting',
      code: uniqueCode,
      parts: [],
      hardwareItems: packedItemsList.length > 0 ? packedItemsList : undefined,
      customItemsNote: itemsSummary,
      createdAt: new Date().toISOString(),
      createdByEmployeeId: currentUser?.id,
      createdByEmployeeName: currentUser?.name || 'Мастер комплектовки',
      isCompleted: true
    };

    const updatedPackages = [...existingPackages, newPackage];

    // Update packed quantities in order.hardwareData.items
    let updatedHardwareData = order.hardwareData;
    if (updatedHardwareData && packedItemsList.length > 0) {
      const updatedItems = updatedHardwareData.items.map(item => {
        const inThisBox = draftBoxItems[item.id] || 0;
        return {
          ...item,
          packedQuantity: Math.min(item.quantity, (item.packedQuantity || 0) + inThisBox)
        };
      });
      updatedHardwareData = {
        ...updatedHardwareData,
        items: updatedItems
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedStageDates = {
      ...(order.stagePlannedDates || {}),
      kitting: order.stagePlannedDates?.kitting || todayStr
    };

    onUpdateOrder({
      ...order,
      stagePlannedDates: updatedStageDates,
      packages: updatedPackages,
      hardwareData: updatedHardwareData
    });

    // Reset draft
    setDraftBoxItems({});
    setSelectedDocs({});
    setCustomNotes('');
    setPackageName(`Место ${updatedPackages.length + 1} (Фурнитура)`);

    if (autoPrintDirect && !forceOpenModal) {
      printPackageLabelDirect(order, newPackage, updatedPackages.length, settings?.packageLabelSettings);
      setFeedbackMsg(`📦 Место №${nextNumber} укомплектовано! Этикетка отправлена на термопринтер.`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg(`Упаковка "${cleanName}" сформирована!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      setSelectedPrintPkg(newPackage);
      setShowPrintModal(true);
    }
  };

  // Preview Draft Box label WITHOUT creating/sealing the box
  const handlePreviewDraftLabel = () => {
    const packedItemsList: OrderPackageHardwareItem[] = [];
    const formattedNotesLines: string[] = [];

    Object.entries(draftBoxItems).forEach(([hwId, qty]) => {
      if (qty <= 0) return;
      const original = hardwareItems.find(h => h.id === hwId);
      if (original) {
        packedItemsList.push({
          hardwareId: original.id,
          article: original.article,
          name: original.name,
          quantity: qty,
          unit: original.unit || 'шт',
          category: original.category
        });
        formattedNotesLines.push(`• ${original.name}${original.article ? ` [${original.article}]` : ''} — ${qty} ${original.unit || 'шт'}`);
      }
    });

    const mandatoryDocsList = settings?.requiredKittingDocuments || [
      { id: 'doc-1', name: 'Паспорт изделия и инструкция по сборке', enabled: true },
      { id: 'doc-2', name: 'Акт приема-передачи товара', enabled: true },
      { id: 'doc-3', name: 'Чертежи и схема разметки', enabled: true }
    ];

    Object.entries(selectedDocs).forEach(([docId, isChecked]) => {
      if (!isChecked) return;
      const doc = mandatoryDocsList.find(d => d.id === docId);
      if (doc) {
        packedItemsList.push({
          hardwareId: doc.id,
          article: 'ДОК',
          name: doc.name,
          quantity: 1,
          unit: 'компл',
          category: 'Документы'
        });
        formattedNotesLines.push(`• [Документ] ${doc.name} — 1 компл`);
      }
    });

    if (customNotes.trim()) {
      formattedNotesLines.push(`Примечание: ${customNotes.trim()}`);
    }

    if (packedItemsList.length === 0 && !customNotes.trim()) {
      setUploadError('В формируемой коробке пока нет позиций для предпросмотра!');
      setTimeout(() => setUploadError(null), 3500);
      return;
    }

    const cleanName = packageName.trim() || `Место ${nextNumber} (Фурнитура)`;
    const draftPackage: OrderPackage = {
      id: 'preview-kitting-draft',
      orderId: order.id,
      orderNumber: order.orderNumber,
      packageNumber: nextNumber,
      name: cleanName,
      type: 'kitting',
      code: `PKG-${order.orderNumber}-KIT-${nextNumber}-ПРЕДПРОСМОТР`,
      parts: [],
      hardwareItems: packedItemsList,
      customItemsNote: formattedNotesLines.join('\n') || customNotes.trim() || 'Комплект мебельной фурнитуры',
      createdAt: new Date().toISOString(),
      createdByEmployeeName: currentUser?.name || 'Мастер комплектовки',
      isCompleted: false
    };

    setSelectedPrintPkg(draftPackage);
    setShowPrintModal(true);
  };

  // Move Hardware Item between packages or draft/unpacked
  const handleMoveHardwareItem = (
    sourcePkgId: string, // package id or 'draft'
    targetPkgId: string, // package id or 'draft' or 'unpack'
    hardwareId: string,
    qtyToMove: number
  ) => {
    if (qtyToMove <= 0) return;

    const originalHw = hardwareItems.find(h => h.id === hardwareId);
    const hwName = originalHw?.name || 'Фурнитура';

    const affectedPackages: OrderPackage[] = [];
    let updatedPackages = [...existingPackages];
    let updatedHardwareData = order.hardwareData;

    // Case 1: Source is draft box
    if (sourcePkgId === 'draft') {
      const currentInDraft = draftBoxItems[hardwareId] || 0;
      const actualMove = Math.min(currentInDraft, qtyToMove);
      const nextDraft = { ...draftBoxItems };
      if (currentInDraft - actualMove <= 0) {
        delete nextDraft[hardwareId];
      } else {
        nextDraft[hardwareId] = currentInDraft - actualMove;
      }
      setDraftBoxItems(nextDraft);

      if (targetPkgId !== 'unpack' && targetPkgId !== 'draft') {
        // Move into existing package
        const targetPkg = updatedPackages.find(p => p.id === targetPkgId);
        if (targetPkg) {
          const existingItems = [...(targetPkg.hardwareItems || [])];
          const existingItemIdx = existingItems.findIndex(h => h.hardwareId === hardwareId);
          if (existingItemIdx >= 0) {
            existingItems[existingItemIdx] = {
              ...existingItems[existingItemIdx],
              quantity: existingItems[existingItemIdx].quantity + actualMove
            };
          } else {
            existingItems.push({
              hardwareId: hardwareId,
              article: originalHw?.article,
              name: hwName,
              quantity: actualMove,
              unit: originalHw?.unit || 'шт',
              category: originalHw?.category
            });
          }

          const lines = existingItems.map(h => `• ${h.name}${h.article ? ` [${h.article}]` : ''} — ${h.quantity} ${h.unit || 'шт'}`);
          const updatedTargetPkg: OrderPackage = {
            ...targetPkg,
            hardwareItems: existingItems,
            customItemsNote: lines.join('\n')
          };
          updatedPackages = updatedPackages.map(p => p.id === targetPkgId ? updatedTargetPkg : p);
          affectedPackages.push(updatedTargetPkg);

          // Update packed quantity in hardwareData
          if (updatedHardwareData) {
            const updatedItems = updatedHardwareData.items.map(item => {
              if (item.id === hardwareId) {
                return {
                  ...item,
                  packedQuantity: Math.min(item.quantity, (item.packedQuantity || 0) + actualMove)
                };
              }
              return item;
            });
            updatedHardwareData = { ...updatedHardwareData, items: updatedItems };
          }
        }
      }
    } else {
      // Case 2: Source is an existing package
      const sourcePkg = updatedPackages.find(p => p.id === sourcePkgId);
      if (!sourcePkg) return;

      const sourceItems = [...(sourcePkg.hardwareItems || [])];
      const sourceItemIdx = sourceItems.findIndex(h => h.hardwareId === hardwareId);
      if (sourceItemIdx < 0) return;

      const currentQtyInSource = sourceItems[sourceItemIdx].quantity;
      const actualMove = Math.min(currentQtyInSource, qtyToMove);

      if (currentQtyInSource - actualMove <= 0) {
        sourceItems.splice(sourceItemIdx, 1);
      } else {
        sourceItems[sourceItemIdx] = {
          ...sourceItems[sourceItemIdx],
          quantity: currentQtyInSource - actualMove
        };
      }

      const sourceLines = sourceItems.map(h => `• ${h.name}${h.article ? ` [${h.article}]` : ''} — ${h.quantity} ${h.unit || 'шт'}`);
      const updatedSourcePkg: OrderPackage = {
        ...sourcePkg,
        hardwareItems: sourceItems,
        customItemsNote: sourceLines.join('\n')
      };
      updatedPackages = updatedPackages.map(p => p.id === sourcePkgId ? updatedSourcePkg : p);
      affectedPackages.push(updatedSourcePkg);

      if (targetPkgId === 'draft') {
        // Move to draft
        setDraftBoxItems(prev => ({
          ...prev,
          [hardwareId]: (prev[hardwareId] || 0) + actualMove
        }));
        // Decrease packed in order.hardwareData because it's back in draft
        if (updatedHardwareData) {
          const updatedItems = updatedHardwareData.items.map(item => {
            if (item.id === hardwareId) {
              return {
                ...item,
                packedQuantity: Math.max(0, (item.packedQuantity || 0) - actualMove)
              };
            }
            return item;
          });
          updatedHardwareData = { ...updatedHardwareData, items: updatedItems };
        }
      } else if (targetPkgId === 'unpack') {
        // Return to unpacked
        if (updatedHardwareData) {
          const updatedItems = updatedHardwareData.items.map(item => {
            if (item.id === hardwareId) {
              return {
                ...item,
                packedQuantity: Math.max(0, (item.packedQuantity || 0) - actualMove)
              };
            }
            return item;
          });
          updatedHardwareData = { ...updatedHardwareData, items: updatedItems };
        }
      } else {
        // Move to another existing package
        const targetPkg = updatedPackages.find(p => p.id === targetPkgId);
        if (targetPkg) {
          const targetItems = [...(targetPkg.hardwareItems || [])];
          const targetItemIdx = targetItems.findIndex(h => h.hardwareId === hardwareId);
          if (targetItemIdx >= 0) {
            targetItems[targetItemIdx] = {
              ...targetItems[targetItemIdx],
              quantity: targetItems[targetItemIdx].quantity + actualMove
            };
          } else {
            targetItems.push({
              hardwareId: hardwareId,
              article: originalHw?.article,
              name: hwName,
              quantity: actualMove,
              unit: originalHw?.unit || 'шт',
              category: originalHw?.category
            });
          }
          const targetLines = targetItems.map(h => `• ${h.name}${h.article ? ` [${h.article}]` : ''} — ${h.quantity} ${h.unit || 'шт'}`);
          const updatedTargetPkg: OrderPackage = {
            ...targetPkg,
            hardwareItems: targetItems,
            customItemsNote: targetLines.join('\n')
          };
          updatedPackages = updatedPackages.map(p => p.id === targetPkgId ? updatedTargetPkg : p);
          affectedPackages.push(updatedTargetPkg);
        }
      }
    }

    onUpdateOrder({
      ...order,
      packages: updatedPackages,
      hardwareData: updatedHardwareData
    });

    setMoveHardwareModal(null);

    // If affectedPackages contains any package, alert the employee to re-print & re-label!
    if (affectedPackages.length > 0) {
      const pkgNames = affectedPackages.map(p => `Место №${p.packageNumber} (${p.name})`).join(' и ');
      setReprintAlert({
        isOpen: true,
        packages: affectedPackages,
        message: `Содержимое коробок (${pkgNames}) изменилось! Обязательно перепечатайте и переклейте этикетку.`
      });
    } else {
      setFeedbackMsg(`Позиция "${hwName}" перемещена в черновик.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };
  const handleResetOrNewPackage = () => {
    const draftCount = Object.values(draftBoxItems).reduce((a, b) => a + b, 0);
    if (draftCount > 0 || customNotes.trim()) {
      if (!window.confirm('В текущем формируемом месте есть выбранные позиции фурнитуры. Очистить и начать новое место?')) {
        return;
      }
    }
    setDraftBoxItems({});
    setSelectedDocs({});
    setCustomNotes('');
    setPackageName(`Место ${existingPackages.length + 1} (Фурнитура)`);
    setFeedbackMsg('Создано новое чистое место комплектации.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Close box on QR command / window event
  useEffect(() => {
    const handleCloseBoxEvent = () => {
      // If items exist in draft, create package
      const draftCount = Object.values(draftBoxItems).reduce((a, b) => a + b, 0);
      const hasCheckedDocs = Object.values(selectedDocs).some(Boolean);
      if (draftCount > 0 || hasCheckedDocs || customNotes.trim()) {
        handleCreatePackage();
      } else {
        setUploadError('Вложите в коробку фурнитуру! В формируемом месте еще нет ни одной позиции.');
        setFeedbackMsg('Вложите в коробку фурнитуру! В формируемом месте еще нет ни одной позиции.');
        setTimeout(() => {
          setUploadError(null);
          setFeedbackMsg(null);
        }, 4000);
      }
    };

    window.addEventListener('erp_cmd_close_box', handleCloseBoxEvent);
    return () => window.removeEventListener('erp_cmd_close_box', handleCloseBoxEvent);
  }, [draftBoxItems, customNotes, hardwareItems, existingPackages, nextNumber, selectedDocs, packageName, order, currentUser, autoPrintDirect]);

  // Global keydown listener for barcode scanners
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showPrintModal) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      const isInput = (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) || (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      ));

      if (isInput) return;

      if (e.key === 'Enter') {
        const rawCode = barcodeBufferRef.current.trim();
        const bufferedCode = normalizeBarcodeScan(rawCode);
        barcodeBufferRef.current = '';
        if (bufferedCode) {
          e.preventDefault();
          const cmd = processQRCommand(bufferedCode, {
            onFinishPackage: () => {
              window.dispatchEvent(new CustomEvent('erp_cmd_close_box'));
            }
          });
          if (cmd.isCommand) {
            setFeedbackMsg(cmd.message || 'Выполнена команда QR-кода');
            setTimeout(() => setFeedbackMsg(null), 3000);
          }
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const now = Date.now();
        if (now - lastKeyTimeRef.current > 1200) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        barcodeBufferRef.current += convertRuCharToEn(e.key);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [showPrintModal]);

  // Delete Package and restore hardware packed quantities
  const handleDeletePackage = (pkgId: string) => {
    const pkgToDelete = existingPackages.find(p => p.id === pkgId);
    if (!pkgToDelete) return;
    if (!window.confirm(`Удалить упаковку "${pkgToDelete.name}"?`)) return;

    // Restore packed quantities
    let updatedHardwareData = order.hardwareData;
    if (updatedHardwareData && pkgToDelete.hardwareItems && pkgToDelete.hardwareItems.length > 0) {
      const restoredItems = updatedHardwareData.items.map(item => {
        const found = pkgToDelete.hardwareItems?.find(hi => hi.hardwareId === item.id || hi.name.toLowerCase() === item.name.toLowerCase());
        const qtyToSubtract = found ? found.quantity : 0;
        return {
          ...item,
          packedQuantity: Math.max(0, (item.packedQuantity || 0) - qtyToSubtract)
        };
      });
      updatedHardwareData = {
        ...updatedHardwareData,
        items: restoredItems
      };
    }

    const updatedPackages = existingPackages
      .filter(p => p.id !== pkgId)
      .map((p, idx) => ({ ...p, packageNumber: idx + 1 }));

    onUpdateOrder({
      ...order,
      packages: updatedPackages,
      hardwareData: updatedHardwareData
    });
  };

  const handleCompleteKitting = () => {
    onUpdateOrderStatus(order.id, 'qc');
    setFeedbackMsg('Комплектация завершена! Заказ передан на ОТК / упаковку.');
    setTimeout(() => {
      setFeedbackMsg(null);
      if (onCompleteKitting) {
        onCompleteKitting();
      }
    }, 1000);
  };

  // Filter hardware list
  const filteredHardwareItems = hardwareItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || (item.category || 'Разное / Крепеж') === selectedCategory;
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      (item.article && item.article.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const draftTotalUnits = Object.values(draftBoxItems).reduce((a, b) => a + b, 0);
  const draftTotalPositions = Object.keys(draftBoxItems).length;

  const isPreviousStagesCompleted = arePrecedingStagesCompleted(order, settings);
  const readinessStats = getPackagingReadinessStats(order, settings);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Online Kitting Mode Notice Banner */}
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
                    Режим онлайн-комплектации активен
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-[10px] uppercase tracking-wide">
                    Кромление / Присадка в процессе
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                  Вы можете укомплектовывать фурнитуру и покупные метизы параллельно в режиме онлайн, пока детали корпуса проходят кромление и присадку.
                </p>
              </div>
            </div>

            <div className="bg-indigo-950/80 border border-indigo-700/80 rounded-2xl px-4 py-2.5 shrink-0 text-center sm:text-right">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Обработано на станках</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {readinessStats.readyCount} <span className="text-xs font-normal text-indigo-200">из {readinessStats.totalCount} дет.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
              <Box className="w-4 h-4" /> Участок комплектовки
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Комплектация фурнитуры, крепежа и нестандартных мест
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Формируйте коробки по комплектовочной ведомости, отмечайте уложенные позиции, печатайте термоэтикетки 120×75 мм с QR-кодами.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {hardwareData && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Прогресс комплектации</div>
                <div className="text-xl font-black text-slate-900 font-mono flex items-center gap-2">
                  <span>{packedPct}%</span>
                  <span className="text-xs font-normal text-slate-500 font-sans">
                    ({totalPackedUnits} из {totalHardwareUnits} ед.)
                  </span>
                </div>
              </div>
            )}

            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-cyan-700 uppercase">Сформировано коробок</div>
              <div className="text-xl font-black text-cyan-950 font-mono">
                {kittingPackages.length} <span className="text-xs font-normal text-cyan-700">упак.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar if hardware list exists */}
        {hardwareData && totalHardwareUnits > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                Ведомость: <strong className="text-slate-900">{hardwareData.fileName}</strong> ({hardwareItems.length} поз.)
              </span>
              <span className="font-mono font-bold text-cyan-700">
                {totalPackedUnits} / {totalHardwareUnits} шт. упаковано
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${allPacked ? 'bg-emerald-500' : 'bg-cyan-600'}`}
                style={{ width: `${packedPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback & Error Alerts */}
      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Fallback Notice when NO hardware manifest was uploaded during planning */}
      {!hardwareData && (
        <div className="p-6 rounded-3xl bg-amber-50/80 border-2 border-amber-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-amber-950 text-base">
                Комплектовочная ведомость фурнитуры не загружена
              </h3>
              <p className="text-xs text-amber-900 font-medium leading-relaxed max-w-3xl">
                На этапе планирования не был загружен файл комплектовочной ведомости, уточните у начальника производства где получить файл или если не требуется фурнитура просто завершите этап.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-amber-200/60 flex-wrap">
            <label className={`px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Обработка файла...' : '📂 Загрузить файл комплектовочной ведомости сейчас'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadKittingFile(f);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              onClick={handleCompleteKitting}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Фурнитура не требуется — Завершить этап</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Hardware Specification (Left 7 cols) + Box Forming & Created Packages (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Hardware Checklist */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <FileText className="w-5 h-5 text-cyan-600" />
                <span>Спецификация фурнитуры и комплектующих</span>
              </div>

              {hardwareData && (
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Заменить файл</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadKittingFile(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {hardwareData && hardwareItems.length > 0 ? (
              <div className="space-y-4">
                {/* Search & Category Tabs */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Поиск по названию, артикулу, бренду..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <button
                      onClick={() => handleSelectAllRemainingCategory(selectedCategory)}
                      className="px-3 py-2 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Выбрать все оставшиеся позиции этой категории в текущую коробку"
                    >
                      + Выбрать все
                    </button>
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Все ({hardwareItems.length})
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.category}
                        onClick={() => setSelectedCategory(cat.category)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                          selectedCategory === cat.category
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{cat.category}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                          selectedCategory === cat.category ? 'bg-white/20 text-white font-black' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Interactive List */}
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredHardwareItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      Позиций не найдено по заданным фильтрам.
                    </div>
                  ) : (
                    filteredHardwareItems.map(item => {
                      const packed = item.packedQuantity || 0;
                      const remaining = Math.max(0, item.quantity - packed);
                      const inDraft = draftBoxItems[item.id] || 0;
                      const isComplete = remaining === 0;

                      return (() => {
                        const itemKey = `${item.article || ''}:::${item.name.toLowerCase().trim()}`;
                        const storageCell = settings?.warehouseLocations?.[itemKey] || 
                          settings?.warehouseItemsCatalog?.find(c => `${c.article || ''}:::${c.name.toLowerCase().trim()}` === itemKey)?.storageCell;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isComplete 
                                ? 'bg-emerald-50/50 border-emerald-200/80 opacity-75'
                                : inDraft > 0
                                ? 'bg-cyan-50/80 border-cyan-300 ring-1 ring-cyan-400 shadow-xs'
                                : 'bg-slate-50 hover:bg-white border-slate-200/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.article && (
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono font-bold text-[10px]">
                                      {item.article}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {item.category || 'Фурнитура'}
                                  </span>

                                  {storageCell && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-950 border border-emerald-300/80 font-mono font-black text-[10px] flex items-center gap-1 shadow-2xs">
                                      <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                                      <span>Ячейка {storageCell}</span>
                                    </span>
                                  )}
                                </div>

                              <div className={`font-black text-xs sm:text-sm mt-0.5 ${isComplete ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                                {item.name}
                              </div>

                              {item.notes && (
                                <div className="text-[11px] text-slate-500 mt-0.5 italic">
                                  {item.notes}
                                </div>
                              )}

                              {/* Packed state summary */}
                              <div className="flex items-center gap-3 text-[11px] mt-1.5">
                                <span className="text-slate-500">
                                  Требуется: <strong className="text-slate-900 font-mono">{item.quantity} {item.unit || 'шт'}</strong>
                                </span>
                                <span className="text-slate-500">
                                  Упаковано: <strong className={`font-mono ${packed > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{packed}</strong>
                                </span>
                                {!isComplete && (
                                  <span className="text-cyan-700 font-bold">
                                    Остаток: <strong className="font-mono text-cyan-900">{remaining}</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Packing Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {isComplete ? (
                                <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Упаковано</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleAddItemToDraft(item, -1)}
                                    disabled={inDraft <= 0}
                                    className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>

                                  <span className="w-9 text-center font-mono font-black text-xs text-slate-900">
                                    {inDraft}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleAddItemToDraft(item, 1)}
                                    disabled={inDraft >= remaining}
                                    className="w-7 h-7 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 flex items-center justify-center text-white transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSetAllRemainingToDraft(item)}
                                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold transition-colors cursor-pointer ml-1"
                                    title="Положить весь остаток в эту коробку"
                                  >
                                    Все ({remaining})
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()})
                  )}
                </div>
              </div>
            ) : (
              /* If no manifest is uploaded yet, offer instant upload or text entry */
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Спецификация пока не подгружена</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                    Загрузите файл комплектовочной ведомости (.xlsx, .xls, .csv, .txt) для автоматического формирования чек-листа фурнитуры.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Загрузить комплектовочную ведомость</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadKittingFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Box Forming (Top) + Formed Packages List (Bottom) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Box Creator Box */}
          <div className="bg-white rounded-3xl p-6 border-2 border-cyan-300 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <Tag className="w-5 h-5 text-cyan-600" />
                <span>Формирование места №{nextNumber}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetOrNewPackage}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-cyan-100 text-slate-700 hover:text-cyan-900 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Очистить выбранное и начать новое место"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Новая коробка</span>
                </button>

                <span className="px-2.5 py-1.5 rounded-xl bg-cyan-100 text-cyan-800 text-xs font-black font-mono">
                  M{nextNumber}
                </span>
              </div>
            </div>

            {/* Direct Thermal Auto-print Quick Toggle */}
            <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${autoPrintDirect ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-[11px]">
                    Прямая печать на термопринтер
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Печатать сразу по кнопке или QR-команде «Закрыть коробку»
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoPrintDirect(!autoPrintDirect)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  autoPrintDirect 
                    ? 'bg-cyan-600 text-white shadow-sm' 
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {autoPrintDirect ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>

            {/* Selected Items in Draft Box Summary */}
            {draftTotalPositions > 0 && (
              <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-cyan-600" />
                    Вложено в эту коробку:
                  </span>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Очистить
                  </button>
                </div>

                <div className="text-xs font-mono font-black text-cyan-950">
                  {draftTotalPositions} позиций ({draftTotalUnits} ед. фурнитуры)
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-cyan-100">
                  {Object.entries(draftBoxItems).map(([id, qty]) => {
                    const it = hardwareItems.find(h => h.id === id);
                    if (!it) return null;
                    return (
                      <div key={id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{it.name}</span>
                        <strong className="font-mono text-cyan-800 shrink-0">{qty} {it.unit || 'шт'}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Package Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Наименование упаковки / коробки
              </label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="например: Место 2 (Фурнитура Blum)"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            {/* Mandatory Documents Checklist */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Вложить позиции документов:
                </span>
                <span className="text-[10px] font-semibold text-slate-400">из настроек ERP</span>
              </div>

              <div className="space-y-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                {(settings?.requiredKittingDocuments || [
                  { id: 'doc-1', name: 'Паспорт изделия и инструкция по сборке', enabled: true },
                  { id: 'doc-2', name: 'Акт приема-передачи товара', enabled: true },
                  { id: 'doc-3', name: 'Чертежи и схема разметки', enabled: true }
                ]).filter(d => d.enabled !== false).map(doc => {
                  const isChecked = !!selectedDocs[doc.id];
                  return (
                    <label key={doc.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-xl transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setSelectedDocs({ ...selectedDocs, [doc.id]: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {doc.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Быстрые шаблоны:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {quickPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPackageName(`Место ${nextNumber} (${preset})`)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-cyan-900 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes / Extra manual text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Дополнительное примечание к месту
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Укажите особые примечания или ручной список, если ведомость не загружена..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
              />
            </div>

            {/* Button Create and Print */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreatePackage(false)}
                className="flex-1 w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Запаковать место №{nextNumber} и напечатать</span>
              </button>

              <button
                type="button"
                onClick={handlePreviewDraftLabel}
                className="px-3 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                title="Предпросмотр этикетки перед печатью"
              >
                Предпросмотр
              </button>
            </div>
          </div>

          {/* Formed Packages List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Box className="w-5 h-5 text-cyan-600" />
              <span>Сформированные места ({kittingPackages.length})</span>
            </h3>

            {kittingPackages.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                Пока не сформировано ни одной коробки. Выберите позиции в чек-листе слева и нажмите «Запаковать».
              </div>
            ) : (
              <div className="space-y-3">
                {kittingPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-cyan-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                          M{pkg.packageNumber}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-xs sm:text-sm truncate">
                            {pkg.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {pkg.code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedPrintPkg(pkg);
                            setShowPrintModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-cyan-50 text-cyan-700 border border-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Печать термоэтикетки"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Печать</span>
                        </button>

                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-500 border border-slate-200 transition-colors cursor-pointer"
                          title="Удалить место (вернуть фурнитуру в остаток)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed Hardware Items with Move Button */}
                    {pkg.hardwareItems && pkg.hardwareItems.length > 0 ? (
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/80 max-h-40 overflow-y-auto">
                        {pkg.hardwareItems.map((item, itemIdx) => (
                          <div
                            key={item.hardwareId || itemIdx}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-xs border-b border-slate-100 last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                {item.article && <span>Арт: {item.article}</span>}
                                <span className="font-bold text-cyan-700">{item.quantity} {item.unit || 'шт'}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMoveHardwareModal({
                                  isOpen: true,
                                  sourcePkgId: pkg.id,
                                  sourcePkgName: `Место №${pkg.packageNumber} (${pkg.name})`,
                                  hardwareId: item.hardwareId,
                                  hardwareName: item.name,
                                  hardwareArticle: item.article,
                                  hardwareUnit: item.unit || 'шт',
                                  currentQty: item.quantity
                                });
                                setMoveHardwareQty(item.quantity);
                                // Default target box: pick first other package, or 'draft', or 'unpack'
                                const otherPkg = kittingPackages.find(p => p.id !== pkg.id);
                                setMoveHardwareTargetPkgId(otherPkg ? otherPkg.id : 'draft');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-cyan-100 text-cyan-800 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="Переместить позицию в другую коробку или вернуть в остаток"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-cyan-600" />
                              <span>Переместить</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      pkg.customItemsNote && (
                        <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 font-mono whitespace-pre-line max-h-28 overflow-y-auto leading-relaxed">
                          {pkg.customItemsNote}
                        </div>
                      )
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Сформировал: {pkg.createdByEmployeeName || 'Комплектовщик'}</span>
                      <span>{pkg.createdAt ? (!isNaN(new Date(pkg.createdAt).getTime()) ? new Date(pkg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : pkg.createdAt.slice(0, 5)) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Step Footer */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            Завершение участка комплектации
          </div>
          <div className="text-sm text-slate-300 font-medium">
            Сформировано {kittingPackages.length} коробок/мест с фурнитурой и комплектующими
          </div>
        </div>

        <button
          onClick={handleCompleteKitting}
          className="px-6 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Завершить комплектацию и передать далее</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Move Hardware Item Modal */}
      {moveHardwareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <ArrowRightLeft className="w-5 h-5 text-cyan-600" />
                <span>Перемещение фурнитуры</span>
              </div>
              <button
                onClick={() => setMoveHardwareModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Позиция</div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {moveHardwareModal.hardwareName}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>Из коробки: <strong className="text-slate-800">{moveHardwareModal.sourcePkgName}</strong></span>
                <span>Доступно: <strong className="text-cyan-700 font-mono font-bold">{moveHardwareModal.currentQty} {moveHardwareModal.hardwareUnit}</strong></span>
              </div>
            </div>

            {/* Quantity selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Количество для перемещения ({moveHardwareModal.hardwareUnit}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={moveHardwareModal.currentQty}
                  value={moveHardwareQty}
                  onChange={(e) => setMoveHardwareQty(Math.max(1, Math.min(moveHardwareModal.currentQty, parseInt(e.target.value) || 1)))}
                  className="w-24 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMoveHardwareQty(moveHardwareModal.currentQty)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-cyan-50 text-cyan-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Все ({moveHardwareModal.currentQty})
                </button>
              </div>
            </div>

            {/* Target Destination Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Куда переместить:
              </label>
              <select
                value={moveHardwareTargetPkgId}
                onChange={(e) => setMoveHardwareTargetPkgId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer"
              >
                <optgroup label="Существующие коробки с фурнитурой">
                  {kittingPackages
                    .filter(p => p.id !== moveHardwareModal.sourcePkgId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        Место №{p.packageNumber}: {p.name} ({p.code})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Другие варианты">
                  <option value="draft">В текущий черновик (Формируемое место №{nextNumber})</option>
                  <option value="unpack">Вернуть в неупакованный остаток (распаковать)</option>
                </optgroup>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Если на коробке уже была напечатана и наклеена этикетка, после перемещения система предложит сразу распечатать обновленную этикетку с актуальным составом!
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMoveHardwareModal(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleMoveHardwareItem(
                  moveHardwareModal.sourcePkgId,
                  moveHardwareTargetPkgId,
                  moveHardwareModal.hardwareId,
                  moveHardwareQty
                )}
                className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 flex items-center gap-2 cursor-pointer"
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
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-base">
                  ⚠️ Содержимое коробки изменилось!
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {reprintAlert.message}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-950">
              Пожалуйста, распечатайте обновленную термоэтикетку и переклейте её на коробку, чтобы комплектация соответствовала паспорту и составу!
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
                    <div className="text-[10px] text-slate-500 font-mono">{pkg.code}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (autoPrintDirect) {
                        printPackageLabelDirect(order, pkg, existingPackages.length, settings?.packageLabelSettings);
                        setFeedbackMsg(`🖨️ Новая этикетка для Места №${pkg.packageNumber} отправлена на печать!`);
                        setTimeout(() => setFeedbackMsg(null), 3000);
                      } else {
                        setSelectedPrintPkg(pkg);
                        setShowPrintModal(true);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

      {/* Print Modal */}
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

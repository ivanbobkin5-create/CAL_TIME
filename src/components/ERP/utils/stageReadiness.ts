import { ProductionOrder, ERPCompanySettings } from '../types';
import { consolidateDetails, BirkaDetail } from './birkaParser';

export interface BirkaDetailItem {
  id: string;
  labelNumber: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  material: string;
  quantity: number;
  edgeL1?: string;
  edgeL2?: string;
  edgeW1?: string;
  edgeW2?: string;
  notes?: string;
  barcode?: string;
}

/**
  * Get set of scanned detail IDs for a given stage across all material groups
  */
export function getScannedPartIdsForStage(order: ProductionOrder, stageId: string): Set<string> {
  const set = new Set<string>();
  if (!order || !order.stageScanningProgress) return set;

  const stageKeys = [stageId];
  if (stageId === 'raskroy' || stageId === 'cutting') stageKeys.push('raskroy', 'cutting');
  if (stageId === 'kromka' || stageId === 'edging') stageKeys.push('kromka', 'edging');
  if (stageId === 'prisadka' || stageId === 'cnc' || stageId === 'drilling') stageKeys.push('prisadka', 'cnc', 'drilling');
  if (stageId === 'packing' || stageId === 'packaging' || stageId === 'upakovka') stageKeys.push('packing', 'packaging', 'upakovka');

  stageKeys.forEach(key => {
    const stageProgress = order.stageScanningProgress?.[key];
    if (stageProgress) {
      Object.values(stageProgress).forEach(matData => {
        if (matData.scannedPartIds && Array.isArray(matData.scannedPartIds)) {
          matData.scannedPartIds.forEach(id => set.add(id));
        }
      });
    }
  });

  return set;
}

/**
 * Count how many instances of a specific detail were scanned in a list of IDs
 */
export function getScannedCountForDetail(scannedIds: string[] | undefined, detailId: string): number {
  if (!scannedIds || !Array.isArray(scannedIds) || scannedIds.length === 0) return 0;
  return scannedIds.filter(id => id === detailId || id.startsWith(detailId + '#') || id.startsWith(detailId + '_inst_')).length;
}

/**
 * Check if a detail is fully scanned based on its required quantity
 */
export function isDetailFullyScanned(scannedIds: string[] | undefined, detail: { id: string; quantity?: number }): boolean {
  const reqQty = Math.max(1, detail.quantity || 1);
  const scanned = getScannedCountForDetail(scannedIds, detail.id);
  return scanned >= reqQty;
}

/**
 * Count total scanned pieces across all materials for a stage
 */
export function getStageScannedPiecesCount(order: ProductionOrder, stageId: string, details?: { id: string; quantity?: number }[]): { scanned: number; total: number } {
  const rawDetails = details || order.birkaData?.details || [];
  const allDetails = consolidateDetails(rawDetails as BirkaDetail[]);
  const stageProgress = order.stageScanningProgress?.[stageId] || {};
  
  const allScannedList: string[] = [];
  Object.values(stageProgress).forEach(matGroup => {
    if (matGroup && Array.isArray(matGroup.scannedPartIds)) {
      allScannedList.push(...matGroup.scannedPartIds);
    }
  });

  let totalScanned = 0;
  let totalRequired = 0;

  for (const d of allDetails) {
    const qty = Math.max(1, d.quantity || 1);
    totalRequired += qty;
    const count = getScannedCountForDetail(allScannedList, d.id);
    totalScanned += Math.min(count, qty);
  }

  return { scanned: totalScanned, total: totalRequired };
}

/**
  * Check if a stage is enabled in company settings
  */
export function isStageEnabled(settings: ERPCompanySettings | undefined, stageId: string): boolean {
  if (!settings?.enabledStages) return true;
  return settings.enabledStages.includes(stageId as any);
}

/**
  * Check if detail requires drilling/prisadka
  */
export function detailRequiresPrisadka(
  detail: {
    name?: string;
    notes?: string;
    holesEnd?: number;
    holesFace?: number;
    holesCount?: number;
  },
  settings?: ERPCompanySettings
): boolean {
  // Если включено отключение фильтра присадки, то все детали попадают на присадку (без фильтрации)
  if (settings?.filterPrisadkaParts === false) {
    return true;
  }

  // Check global setting: is Nesting used on cutting stage? (Default is true)
  const useNestingPrisadka = settings?.useNestingPrisadkaOnCutting !== false;

  // 1. Explicit hole counts from birka specification
  if (detail.holesEnd !== undefined || detail.holesFace !== undefined || detail.holesCount !== undefined) {
    const hEnd = detail.holesEnd ?? 0;
    const hFace = detail.holesFace ?? 0;
    const hTotal = detail.holesCount ?? (hEnd + hFace);

    if (useNestingPrisadka) {
      // If Nesting is used during cutting, face holes are already done at cutting.
      // Part ONLY requires drilling if it has end holes (holesEnd > 0).
      if (detail.holesEnd !== undefined) {
        return hEnd > 0;
      }
      return hTotal > 0;
    } else {
      // If Nesting is NOT used on cutting, parts with ANY holes (end OR face) require drilling
      return hEnd > 0 || hFace > 0 || hTotal > 0;
    }
  }

  // 2. Parse hole info from notes if present
  const notes = (detail.notes || '').toLowerCase();
  const name = (detail.name || '').toLowerCase();

  // Parse patterns like "торец: 0", "торец 0", "торцевых: 0", "отв_торец: 0"
  const endHolesMatch = notes.match(/(?:торец|торцев\w*|отв\.?\s*тор\w*)\s*[:=]?\s*(\d+)/i);
  const faceHolesMatch = notes.match(/(?:пласть|пластев\w*|отв\.?\s*пласт\w*)\s*[:=]?\s*(\d+)/i);

  if (endHolesMatch || faceHolesMatch) {
    const hEnd = endHolesMatch ? parseInt(endHolesMatch[1], 10) : 0;
    const hFace = faceHolesMatch ? parseInt(faceHolesMatch[1], 10) : 0;

    if (useNestingPrisadka) {
      return hEnd > 0;
    } else {
      return hEnd > 0 || hFace > 0;
    }
  }

  // Explicit negative notes
  if (/без\s+присадк|без\s+сверл|присадк\w*\s*[:=]?\s*нет|0\s*отв/i.test(notes)) {
    return false;
  }
  if (useNestingPrisadka && (/без\s+торц|торец\s*[:=]?\s*0|0\s*в\s*торец/i.test(notes))) {
    return false;
  }

  // 3. Fallback text pattern matching
  if (/присадк|сверл|отверст|чпу|отв\.|паз/i.test(notes) || /присадк|чпу/i.test(name)) {
    return true;
  }

  if (settings?.noteRules) {
    for (const rule of settings.noteRules) {
      if (rule.pattern && (notes.includes(rule.pattern.toLowerCase()) || name.includes(rule.pattern.toLowerCase()))) {
        if (/присадк|сверл|отверст|чпу|отв\.|паз/i.test(rule.instruction || rule.pattern)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
  * Check if a specific detail is ready to be packed into a package
  */
export function isDetailReadyForPackaging(
  detail: BirkaDetailItem,
  order: ProductionOrder,
  settings?: ERPCompanySettings
): boolean {
  if (!order) return true;

  const raskroyScanned = getScannedPartIdsForStage(order, 'cutting');
  const kromkaScanned = getScannedPartIdsForStage(order, 'edging');
  const prisadkaScanned = getScannedPartIdsForStage(order, 'cnc');

  const raskroyList = Array.from(raskroyScanned);
  const kromkaList = Array.from(kromkaScanned);
  const prisadkaList = Array.from(prisadkaScanned);

  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const needsPrisadka = detailRequiresPrisadka(detail, settings);

  // Check if forced completion exists on stages
  const forcedCutting = order.forcedStageCompletions?.cutting || order.forcedStageCompletions?.raskroy;
  const forcedEdging = order.forcedStageCompletions?.edging || order.forcedStageCompletions?.kromka;
  const forcedCnc = order.forcedStageCompletions?.cnc || order.forcedStageCompletions?.prisadka;

  // 1. Raskroy / Cutting check
  if (isStageEnabled(settings, 'cutting') && isStageEnabled(settings, 'raskroy')) {
    const isCuttingForcedOk = forcedCutting && !forcedCutting.unscannedPartIds?.includes(detail.id);
    const isRaskroyDone = isCuttingForcedOk || raskroyScanned.has(detail.id) || isDetailFullyScanned(raskroyList, detail);
    if (!isRaskroyDone) return false;
  }

  // 2. Kromka / Edging check (if detail has edge banding)
  if (hasEdges && isStageEnabled(settings, 'edging') && isStageEnabled(settings, 'kromka')) {
    const isEdgingForcedOk = forcedEdging && !forcedEdging.unscannedPartIds?.includes(detail.id);
    const isKromkaDone = isEdgingForcedOk || kromkaScanned.has(detail.id) || isDetailFullyScanned(kromkaList, detail);
    if (!isKromkaDone) return false;
  }

  // 3. Prisadka / CNC check (if detail requires drilling)
  if (needsPrisadka && isStageEnabled(settings, 'cnc') && isStageEnabled(settings, 'prisadka')) {
    const isCncForcedOk = forcedCnc && !forcedCnc.unscannedPartIds?.includes(detail.id);
    const isPrisadkaDone = isCncForcedOk || prisadkaScanned.has(detail.id) || isDetailFullyScanned(prisadkaList, detail);
    if (!isPrisadkaDone) return false;
  }

  return true;
}

/**
  * Check if all preceding processing stages (raskroy, kromka, prisadka) are 100% completed for all details in the order
  */
export function arePrecedingStagesCompleted(order: ProductionOrder, settings?: ERPCompanySettings): boolean {
  const raw = order.birkaData?.details || [];
  const details = consolidateDetails(raw as BirkaDetail[]);
  if (details.length === 0) return true;

  for (const d of details) {
    if (!isDetailReadyForPackaging(d, order, settings)) {
      return false;
    }
  }

  return true;
}

/**
  * Count how many details are ready for packaging out of total details
  */
export function getPackagingReadinessStats(order: ProductionOrder, settings?: ERPCompanySettings): { readyCount: number; totalCount: number; isFullyReady: boolean } {
  const raw = order.birkaData?.details || [];
  const details = consolidateDetails(raw as BirkaDetail[]);
  if (details.length === 0) {
    return { readyCount: 0, totalCount: 0, isFullyReady: true };
  }

  let readyCount = 0;
  for (const d of details) {
    if (isDetailReadyForPackaging(d, order, settings)) {
      readyCount++;
    }
  }

  const isFullyReady = readyCount >= details.length;

  return {
    readyCount,
    totalCount: details.length,
    isFullyReady
  };
}

export interface DetailStageStatus {
  isAvailable: boolean; // Можно ли сканировать деталь на текущем участке
  isScannedOnCurrentStage: boolean; // Просканирована ли уже на текущем участке
  blockingReason?: string; // Причина блокировки
  requiredPrecedingStage?: string; // ID этапа, который еще не пройден
}

/**
 * Check if a specific detail is available to be scanned/processed at target stage in live mode
 */
export function getDetailAvailabilityForStage(
  detail: {
    id: string;
    edgeL1?: string;
    edgeL2?: string;
    edgeW1?: string;
    edgeW2?: string;
    notes?: string;
    name?: string;
    holesEnd?: number;
    holesFace?: number;
    holesCount?: number;
  },
  order: ProductionOrder,
  targetStageId: string,
  settings?: ERPCompanySettings
): DetailStageStatus {
  const normStage = (targetStageId === 'raskroy' || targetStageId === 'cutting') ? 'cutting'
    : (targetStageId === 'kromka' || targetStageId === 'edging') ? 'edging'
    : (targetStageId === 'prisadka' || targetStageId === 'cnc' || targetStageId === 'drilling') ? 'cnc'
    : (targetStageId === 'packing' || targetStageId === 'packaging') ? 'packing'
    : targetStageId;

  const isScannedOnCurrentStage = getScannedPartIdsForStage(order, normStage).has(detail.id);

  // If classic execution mode, all details are allowed to be scanned
  if (settings?.executionMode === 'classic') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 1. Raskroy (Cutting): always available
  if (normStage === 'cutting') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 2. Kitting (Комплектация фурнитуры): active immediately
  if (normStage === 'kitting') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  const raskroyScanned = getScannedPartIdsForStage(order, 'cutting');
  const kromkaScanned = getScannedPartIdsForStage(order, 'edging');
  const prisadkaScanned = getScannedPartIdsForStage(order, 'cnc');

  const raskroyList = Array.from(raskroyScanned);
  const kromkaList = Array.from(kromkaScanned);
  const prisadkaList = Array.from(prisadkaScanned);

  const forcedCutting = order.forcedStageCompletions?.cutting || order.forcedStageCompletions?.raskroy;
  const isCuttingForcedOk = forcedCutting && !forcedCutting.unscannedPartIds?.includes(detail.id);
  const isRaskroyDone = !isStageEnabled(settings, 'cutting') || !isStageEnabled(settings, 'raskroy') || isCuttingForcedOk || raskroyScanned.has(detail.id) || isDetailFullyScanned(raskroyList, detail);

  // 3. Kromka (Edging): requires Raskroy
  if (normStage === 'edging') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'cutting'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const forcedEdging = order.forcedStageCompletions?.edging || order.forcedStageCompletions?.kromka;
  const isEdgingForcedOk = forcedEdging && !forcedEdging.unscannedPartIds?.includes(detail.id);
  const isKromkaDone = !hasEdges || !isStageEnabled(settings, 'edging') || !isStageEnabled(settings, 'kromka') || isEdgingForcedOk || kromkaScanned.has(detail.id) || isDetailFullyScanned(kromkaList, detail);

  // 4. Prisadka / CNC: requires Raskroy AND Kromka (if detail has edge banding)
  if (normStage === 'cnc') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'cutting'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не прошла обработку на участке Кромка',
        requiredPrecedingStage: 'edging'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 5. Assembly (Сборка)
  const needsPrisadka = detailRequiresPrisadka(detail, settings);
  const forcedCnc = order.forcedStageCompletions?.cnc || order.forcedStageCompletions?.prisadka;
  const isCncForcedOk = forcedCnc && !forcedCnc.unscannedPartIds?.includes(detail.id);
  const isPrisadkaDone = !needsPrisadka || !isStageEnabled(settings, 'cnc') || !isStageEnabled(settings, 'prisadka') || isCncForcedOk || prisadkaScanned.has(detail.id) || isDetailFullyScanned(prisadkaList, detail);

  if (normStage === 'assembly') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает распила',
        requiredPrecedingStage: 'cutting'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает кромкооблицовки',
        requiredPrecedingStage: 'edging'
      };
    }
    if (!isPrisadkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает присадки (ЧПУ)',
        requiredPrecedingStage: 'cnc'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 6. Packing (Упаковка)
  if (normStage === 'packing') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает распила',
        requiredPrecedingStage: 'cutting'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает кромкооблицовки',
        requiredPrecedingStage: 'edging'
      };
    }
    if (!isPrisadkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает присадки (ЧПУ)',
        requiredPrecedingStage: 'cnc'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  return {
    isAvailable: true,
    isScannedOnCurrentStage
  };
}

export interface StageTaskReadiness {
  isLocked: boolean;
  statusText: string;
  readyPartsCount: number;
  totalPartsCount: number;
  blockingReason?: string;
}

/**
 * Get overall task readiness for an entire stage of an order (e.g. for display in Production View)
 */
export function getStageTaskReadinessInfo(
  order: ProductionOrder,
  stageId: string,
  settings?: ERPCompanySettings
): StageTaskReadiness {
  const rawDetails = order.birkaData?.details || [];
  const details = consolidateDetails(rawDetails as BirkaDetail[]);
  const totalPartsCount = details.length || order.partsCount || 0;

  // In classic mode, stage tasks are never locked
  if (settings?.executionMode === 'classic') {
    return {
      isLocked: false,
      statusText: 'Доступна в работу',
      readyPartsCount: totalPartsCount,
      totalPartsCount
    };
  }

  // Cutting (raskroy) and Kitting (kitting): always unlocked
  if (stageId === 'raskroy' || stageId === 'kitting' || stageId === 'cutting') {
    return {
      isLocked: false,
      statusText: 'Доступна в работу',
      readyPartsCount: totalPartsCount,
      totalPartsCount
    };
  }

  // Packing: accessible immediately, but shows stats
  if (stageId === 'packing') {
    let readyCount = 0;
    details.forEach(d => {
      if (getDetailAvailabilityForStage(d, order, 'packing', settings).isAvailable) {
        readyCount++;
      }
    });
    return {
      isLocked: false,
      statusText: readyCount === totalPartsCount ? '100% готов к упаковке' : `Готово ${readyCount} из ${totalPartsCount} деталей`,
      readyPartsCount: readyCount,
      totalPartsCount
    };
  }

  // Edging (kromka), Prisadka, Assembly: calculate how many details are ready
  let readyPartsCount = 0;
  details.forEach(d => {
    if (getDetailAvailabilityForStage(d, order, stageId, settings).isAvailable) {
      readyPartsCount++;
    }
  });

  const isLocked = details.length > 0 && readyPartsCount === 0;

  let blockingReason = undefined;
  if (isLocked) {
    if (stageId === 'kromka' || stageId === 'edging') {
      blockingReason = '0 деталей отсканировано на участке Распил';
    } else if (stageId === 'prisadka' || stageId === 'cnc') {
      blockingReason = '0 деталей готово после Распила и Кромки';
    } else {
      blockingReason = '0 деталей готово на предшествующих участках';
    }
  }

  return {
    isLocked,
    statusText: isLocked 
      ? `Заблокирована (${blockingReason})` 
      : `Доступна (${readyPartsCount} из ${totalPartsCount} деталей готово)`,
    readyPartsCount,
    totalPartsCount,
    blockingReason
  };
}

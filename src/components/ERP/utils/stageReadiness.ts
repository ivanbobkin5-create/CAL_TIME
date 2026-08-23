import { ProductionOrder, ERPCompanySettings } from '../types';

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
  const stageProgress = order.stageScanningProgress?.[stageId];
  if (stageProgress) {
    Object.values(stageProgress).forEach(matData => {
      if (matData.scannedPartIds && Array.isArray(matData.scannedPartIds)) {
        matData.scannedPartIds.forEach(id => set.add(id));
      }
    });
  }
  return set;
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
  const currentStage = order.currentStage;

  // If order is at or past packaging stage, all details are ready
  if (currentStage === 'packing' || currentStage === 'shipping' || (currentStage as string) === 'ready') {
    return true;
  }

  const raskroyScanned = getScannedPartIdsForStage(order, 'raskroy');
  const kromkaScanned = getScannedPartIdsForStage(order, 'kromka');
  const prisadkaScanned = getScannedPartIdsForStage(order, 'prisadka');

  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const needsPrisadka = detailRequiresPrisadka(detail, settings);

  // 1. Raskroy check
  if (isStageEnabled(settings, 'raskroy')) {
    const isRaskroyDone = raskroyScanned.has(detail.id);
    if (!isRaskroyDone) return false;
  }

  // 2. Kromka check (if detail has edge banding)
  if (hasEdges && isStageEnabled(settings, 'kromka')) {
    const isKromkaDone = kromkaScanned.has(detail.id);
    if (!isKromkaDone) return false;
  }

  // 3. Prisadka check (if detail requires drilling)
  if (needsPrisadka && isStageEnabled(settings, 'prisadka')) {
    const isPrisadkaDone = prisadkaScanned.has(detail.id);
    if (!isPrisadkaDone) return false;
  }

  return true;
}

/**
  * Check if all preceding processing stages (raskroy, kromka, prisadka) are 100% completed for all details in the order
  */
export function arePrecedingStagesCompleted(order: ProductionOrder, settings?: ERPCompanySettings): boolean {
  if (order.currentStage === 'packing' || order.currentStage === 'shipping' || (order.currentStage as string) === 'ready') {
    return true;
  }

  const details = order.birkaData?.details || [];
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
  const details = order.birkaData?.details || [];
  if (details.length === 0) {
    return { readyCount: 0, totalCount: 0, isFullyReady: true };
  }

  let readyCount = 0;
  for (const d of details) {
    if (isDetailReadyForPackaging(d, order, settings)) {
      readyCount++;
    }
  }

  const isFullyReady = readyCount >= details.length || order.currentStage === 'packing' || order.currentStage === 'shipping' || (order.currentStage as string) === 'ready';

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
  const isScannedOnCurrentStage = getScannedPartIdsForStage(order, targetStageId).has(detail.id);

  // If classic execution mode, all details are allowed to be scanned
  if (settings?.executionMode === 'classic') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 1. Raskroy (Cutting): always available
  if (targetStageId === 'raskroy') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 2. Kitting (Комплектация фурнитуры): active immediately
  if (targetStageId === 'kitting') {
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  const raskroyScanned = getScannedPartIdsForStage(order, 'raskroy');
  const kromkaScanned = getScannedPartIdsForStage(order, 'kromka');
  const prisadkaScanned = getScannedPartIdsForStage(order, 'prisadka');

  const isRaskroyDone = !isStageEnabled(settings, 'raskroy') || raskroyScanned.has(detail.id);

  // 3. Kromka (Edging): requires Raskroy
  if (targetStageId === 'kromka') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'raskroy'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const isKromkaDone = !hasEdges || !isStageEnabled(settings, 'kromka') || kromkaScanned.has(detail.id);

  // 4. Prisadka / CNC: requires Raskroy AND Kromka (if detail has edge banding)
  if (targetStageId === 'prisadka') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'raskroy'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не прошла обработку на участке Кромка',
        requiredPrecedingStage: 'kromka'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 5. Assembly (Сборка)
  const needsPrisadka = detailRequiresPrisadka(detail, settings);
  const isPrisadkaDone = !needsPrisadka || !isStageEnabled(settings, 'prisadka') || prisadkaScanned.has(detail.id);

  if (targetStageId === 'assembly') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает распила',
        requiredPrecedingStage: 'raskroy'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает кромкооблицовки',
        requiredPrecedingStage: 'kromka'
      };
    }
    if (!isPrisadkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает присадки (ЧПУ)',
        requiredPrecedingStage: 'prisadka'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 6. Packing (Упаковка)
  if (targetStageId === 'packing') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает распила',
        requiredPrecedingStage: 'raskroy'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает кромкооблицовки',
        requiredPrecedingStage: 'kromka'
      };
    }
    if (!isPrisadkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Ожидает присадки (ЧПУ)',
        requiredPrecedingStage: 'prisadka'
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
  const details = order.birkaData?.details || [];
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

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
  * Check if a stage is enabled in company settings (handles Russian and English stage ID aliases)
  */
export function isStageEnabled(settings: ERPCompanySettings | undefined, stageId: string): boolean {
  if (!settings?.enabledStages || !Array.isArray(settings.enabledStages)) return true;
  const aliases: Record<string, string[]> = {
    cutting: ['cutting', 'raskroy'],
    raskroy: ['cutting', 'raskroy'],
    edging: ['edging', 'kromka'],
    kromka: ['edging', 'kromka'],
    cnc: ['cnc', 'prisadka', 'drilling'],
    prisadka: ['cnc', 'prisadka', 'drilling'],
    drilling: ['cnc', 'prisadka', 'drilling'],
    assembly: ['assembly', 'sborka'],
    sborka: ['assembly', 'sborka'],
    facades: ['facades', 'fasady'],
    fasady: ['facades', 'fasady'],
    packing: ['packing', 'upakovka'],
    upakovka: ['packing', 'upakovka'],
    kitting: ['kitting', 'komplektovka'],
    shipping: ['shipping', 'otgruzka']
  };

  const list = aliases[stageId] || [stageId];
  return list.some(alias => settings.enabledStages!.includes(alias as any));
}

/**
 * Расчет количества отверстий детали в зависимости от настроек присадки (все / пласть / торец)
 */
export function getDetailDrillingHolesCount(
  detail: {
    holesEnd?: number;
    holesFace?: number;
    holesCount?: number;
    notes?: string;
  },
  settings?: ERPCompanySettings
): { total: number; face: number; edge: number; counted: number } {
  let hEnd = detail.holesEnd;
  let hFace = detail.holesFace;
  let hTotal = detail.holesCount;

  // Извлечение из примечаний если не заданы явно
  if (hEnd === undefined || hFace === undefined) {
    const notes = (detail.notes || '').toLowerCase();
    const endMatch = notes.match(/(?:торец|торцев\w*|отв\.?\s*тор\w*)\s*[:=]?\s*(\d+)/i);
    const faceMatch = notes.match(/(?:пласть|пластев\w*|отв\.?\s*пласт\w*)\s*[:=]?\s*(\d+)/i);
    const totalMatch = notes.match(/(?:всего|всех|отверстий|отв\.?)\s*[:=]?\s*(\d+)/i);

    if (hEnd === undefined && endMatch) hEnd = parseInt(endMatch[1], 10);
    if (hFace === undefined && faceMatch) hFace = parseInt(faceMatch[1], 10);
    if (hTotal === undefined && totalMatch) hTotal = parseInt(totalMatch[1], 10);
  }

  const edge = Math.max(0, hEnd ?? 0);
  const face = Math.max(0, hFace ?? 0);
  const total = hTotal !== undefined ? Math.max(0, hTotal) : (edge + face);

  // Режим подсчета: all, face_only, edge_only
  // Если не указан явно, смотрим на useNestingPrisadkaOnCutting (если нестинг, то только торец)
  let mode = settings?.drillingHolesCalculationMode;
  if (!mode) {
    mode = settings?.useNestingPrisadkaOnCutting !== false ? 'edge_only' : 'all';
  }

  let counted = total;
  if (mode === 'face_only') {
    counted = face;
  } else if (mode === 'edge_only') {
    counted = edge;
  } else {
    counted = (edge + face > 0) ? (edge + face) : total;
  }

  return { total, face, edge, counted };
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

  const holeData = getDetailDrillingHolesCount(detail, settings);

  // 1. Explicit hole counts from birka specification
  if (detail.holesEnd !== undefined || detail.holesFace !== undefined || detail.holesCount !== undefined) {
    return holeData.counted > 0;
  }

  // 2. Parse hole info from notes if present
  const notes = (detail.notes || '').toLowerCase();
  const name = (detail.name || '').toLowerCase();

  // Parse patterns like "торец: 0", "торец 0", "торцевых: 0", "отв_торец: 0"
  const endHolesMatch = notes.match(/(?:торец|торцев\w*|отв\.?\s*тор\w*)\s*[:=]?\s*(\d+)/i);
  const faceHolesMatch = notes.match(/(?:пласть|пластев\w*|отв\.?\s*пласт\w*)\s*[:=]?\s*(\d+)/i);

  if (endHolesMatch || faceHolesMatch) {
    return holeData.counted > 0;
  }

  // Explicit negative notes
  if (/без\s+присадк|без\s+сверл|присадк\w*\s*[:=]?\s*нет|0\s*отв/i.test(notes)) {
    return false;
  }

  const mode = settings?.drillingHolesCalculationMode || (settings?.useNestingPrisadkaOnCutting !== false ? 'edge_only' : 'all');
  if (mode === 'edge_only' && (/без\s+торц|торец\s*[:=]?\s*0|0\s*в\s*торец/i.test(notes))) {
    return false;
  }
  if (mode === 'face_only' && (/без\s+пласт|пласть\s*[:=]?\s*0|0\s*в\s*пласть/i.test(notes))) {
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

export interface DetailPackagingPieceStats {
  reqQty: number;
  readyPiecesCount: number;
  unreadyPiecesCount: number;
  isFullyReady: boolean;
  hasAnyReady: boolean;
  missingStages: { id: string; name: string; shortName: string; readyCount: number; totalCount: number }[];
  reason: string;
}

export interface DetailPackagingReadiness {
  isReady: boolean; // Полностью ли готовы ВСЕ штуки детали (readyPiecesCount >= reqQty)
  hasAnyReady: boolean; // Готова ли хотя бы одна штука
  readyPiecesCount: number; // Сколько штук готово (прошли все нужные участки)
  unreadyPiecesCount: number; // Сколько еще не готово
  reqQty: number; // Всего требуется штук
  missingStages: { id: string; name: string; shortName: string; readyCount: number; totalCount: number }[];
  reason: string;
}

/**
 * Get how many pieces of a specific detail are completed on a specific stage
 */
export function getDetailPieceCountForStage(
  order: ProductionOrder,
  stageId: string,
  detail: BirkaDetailItem,
  settings?: ERPCompanySettings
): number {
  const reqQty = Math.max(1, detail.quantity || 1);
  if (!order) return reqQty;

  // If stage is disabled in settings, all pieces are considered passed
  if (!isStageEnabled(settings, stageId)) {
    return reqQty;
  }

  // If detail does not require this stage
  if (stageId === 'edging' || stageId === 'kromka') {
    const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
    if (!hasEdges) return reqQty;
  }

  if (stageId === 'cnc' || stageId === 'prisadka') {
    const needsPrisadka = detailRequiresPrisadka(detail, settings);
    if (!needsPrisadka) return reqQty;
  }

  // Whole-stage completions
  const isStageCompleted =
    (order.stageProgress as any)?.[stageId]?.status === 'done' ||
    (stageId === 'cutting' && (order.stageProgress as any)?.raskroy?.status === 'done') ||
    (stageId === 'edging' && (order.stageProgress as any)?.kromka?.status === 'done') ||
    (stageId === 'cnc' && (order.stageProgress as any)?.prisadka?.status === 'done');

  if (isStageCompleted) {
    return reqQty;
  }

  // Forced completion for stage
  const forced =
    order.forcedStageCompletions?.[stageId] ||
    (stageId === 'cutting' ? order.forcedStageCompletions?.raskroy : undefined) ||
    (stageId === 'edging' ? order.forcedStageCompletions?.kromka : undefined) ||
    (stageId === 'cnc' ? order.forcedStageCompletions?.prisadka : undefined);

  if (forced && !forced.unscannedPartIds?.includes(detail.id)) {
    return reqQty;
  }

  // Count scanned pieces from stage scanning progress
  const scannedSet = getScannedPartIdsForStage(order, stageId);
  const scannedList = Array.from(scannedSet);
  const scannedCount = getScannedCountForDetail(scannedList, detail.id);

  return Math.min(reqQty, scannedCount);
}

/**
 * Get detailed piece-by-piece stats for packaging readiness
 */
export function getDetailPackagingPieceStats(
  detail: BirkaDetailItem,
  order: ProductionOrder,
  settings?: ERPCompanySettings
): DetailPackagingPieceStats {
  const reqQty = Math.max(1, detail.quantity || 1);
  if (!order) {
    return {
      reqQty,
      readyPiecesCount: reqQty,
      unreadyPiecesCount: 0,
      isFullyReady: true,
      hasAnyReady: true,
      missingStages: [],
      reason: ''
    };
  }

  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const needsPrisadka = detailRequiresPrisadka(detail, settings);

  const cuttingCount = getDetailPieceCountForStage(order, 'cutting', detail, settings);
  const edgingCount = getDetailPieceCountForStage(order, 'edging', detail, settings);
  const cncCount = getDetailPieceCountForStage(order, 'cnc', detail, settings);

  // Ready pieces are limited by the bottleneck among preceding stages
  const readyPiecesCount = Math.min(cuttingCount, edgingCount, cncCount);
  const unreadyPiecesCount = Math.max(0, reqQty - readyPiecesCount);
  const isFullyReady = readyPiecesCount >= reqQty;
  const hasAnyReady = readyPiecesCount > 0;

  const missingStages: { id: string; name: string; shortName: string; readyCount: number; totalCount: number }[] = [];

  if (cuttingCount < reqQty && isStageEnabled(settings, 'cutting')) {
    missingStages.push({ id: 'cutting', name: 'Раскрой (распил)', shortName: 'Распил', readyCount: cuttingCount, totalCount: reqQty });
  }

  if (hasEdges && edgingCount < reqQty && isStageEnabled(settings, 'edging')) {
    missingStages.push({ id: 'edging', name: 'Кромкооблицовка', shortName: 'Кромка', readyCount: edgingCount, totalCount: reqQty });
  }

  if (needsPrisadka && cncCount < reqQty && isStageEnabled(settings, 'cnc')) {
    missingStages.push({ id: 'cnc', name: 'Присадка (ЧПУ)', shortName: 'Присадка', readyCount: cncCount, totalCount: reqQty });
  }

  let reason = '';
  if (missingStages.length > 0) {
    reason = `Ожидает: ${missingStages.map(m => `${m.shortName} (${m.readyCount}/${m.totalCount} шт.)`).join(', ')}`;
  }

  return {
    reqQty,
    readyPiecesCount,
    unreadyPiecesCount,
    isFullyReady,
    hasAnyReady,
    missingStages,
    reason
  };
}

/**
 * Check if a specific detail is ready to be packed into a package with detailed missing stages
 * NOTE: isReady is TRUE only when ALL required pieces of this detail are ready (readyPiecesCount >= reqQty).
 * If 1 of 10 pieces is ready, isReady is FALSE, but hasAnyReady is TRUE and readyPiecesCount is 1.
 */
export function getDetailPackagingReadiness(
  detail: BirkaDetailItem,
  order: ProductionOrder,
  settings?: ERPCompanySettings
): DetailPackagingReadiness {
  const stats = getDetailPackagingPieceStats(detail, order, settings);
  return {
    isReady: stats.isFullyReady,
    hasAnyReady: stats.hasAnyReady,
    readyPiecesCount: stats.readyPiecesCount,
    unreadyPiecesCount: stats.unreadyPiecesCount,
    reqQty: stats.reqQty,
    missingStages: stats.missingStages,
    reason: stats.reason
  };
}

/**
 * Check if a specific detail is fully ready (all pieces completed on preceding stages)
 */
export function isDetailReadyForPackaging(
  detail: BirkaDetailItem,
  order: ProductionOrder,
  settings?: ERPCompanySettings
): boolean {
  return getDetailPackagingReadiness(detail, order, settings).isReady;
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
 * Count how many details and pieces are ready for packaging out of total
 */
export function getPackagingReadinessStats(order: ProductionOrder, settings?: ERPCompanySettings): {
  readyCount: number; // Полностью готовые позиции
  totalCount: number; // Всего позиций
  readyPiecesCount: number; // Готовые штуки
  totalPiecesCount: number; // Всего штук
  isFullyReady: boolean;
} {
  const raw = order.birkaData?.details || [];
  const details = consolidateDetails(raw as BirkaDetail[]);
  if (details.length === 0) {
    return { readyCount: 0, totalCount: 0, readyPiecesCount: 0, totalPiecesCount: 0, isFullyReady: true };
  }

  let readyCount = 0;
  let readyPiecesCount = 0;
  let totalPiecesCount = 0;

  for (const d of details) {
    const stats = getDetailPackagingPieceStats(d, order, settings);
    totalPiecesCount += stats.reqQty;
    readyPiecesCount += stats.readyPiecesCount;
    if (stats.isFullyReady) {
      readyCount++;
    }
  }

  const isFullyReady = readyPiecesCount >= totalPiecesCount;

  return {
    readyCount,
    totalCount: details.length,
    readyPiecesCount,
    totalPiecesCount,
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
    quantity?: number;
    labelNumber?: string;
    edgeL1?: string;
    edgeL2?: string;
    edgeW1?: string;
    edgeW2?: string;
    notes?: string;
    name?: string;
    holesEnd?: number;
    holesFace?: number;
    holesCount?: number;
    [key: string]: any;
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

  const reqQty = Math.max(1, detail.quantity || 1);
  const raskroyPieces = getDetailPieceCountForStage(order, 'cutting', detail as any, settings);
  const isRaskroyDone = raskroyPieces >= reqQty;

  const kromkaPieces = getDetailPieceCountForStage(order, 'edging', detail as any, settings);
  const hasEdges = !!(detail.edgeL1 || detail.edgeL2 || detail.edgeW1 || detail.edgeW2);
  const isKromkaDone = !hasEdges || kromkaPieces >= reqQty;

  const prisadkaPieces = getDetailPieceCountForStage(order, 'cnc', detail as any, settings);
  const needsPrisadka = detailRequiresPrisadka(detail as any, settings);
  const isPrisadkaDone = !needsPrisadka || prisadkaPieces >= reqQty;

  const kromkaScannedList = Array.from(getScannedPartIdsForStage(order, 'edging'));
  const currentEdgingScannedCount = getScannedCountForDetail(kromkaScannedList, detail.id);

  const prisadkaScannedList = Array.from(getScannedPartIdsForStage(order, 'cnc'));
  const currentPrisadkaScannedCount = getScannedCountForDetail(prisadkaScannedList, detail.id);

  // 3. Kromka (Edging): requires Raskroy
  if (normStage === 'edging') {
    if (raskroyPieces === 0) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'cutting'
      };
    }
    if (currentEdgingScannedCount >= raskroyPieces && raskroyPieces < reqQty) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: `На распиле готово только ${raskroyPieces} из ${reqQty} шт. Распилите следующую деталь перед кромлением.`,
        requiredPrecedingStage: 'cutting'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 4. Prisadka / CNC: requires Raskroy AND Kromka (if detail has edge banding)
  if (normStage === 'cnc') {
    if (raskroyPieces === 0) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не распилена на участке Распил',
        requiredPrecedingStage: 'cutting'
      };
    }
    if (hasEdges && kromkaPieces === 0) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: 'Деталь еще не прошла обработку на участке Кромка',
        requiredPrecedingStage: 'edging'
      };
    }
    const maxAvailableToPrisadka = hasEdges ? Math.min(raskroyPieces, kromkaPieces) : raskroyPieces;
    if (currentPrisadkaScannedCount >= maxAvailableToPrisadka && maxAvailableToPrisadka < reqQty) {
      const stageName = hasEdges && kromkaPieces <= raskroyPieces ? 'кромления' : 'распила';
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: `Ожидает завершения ${stageName} для следующей детали (${maxAvailableToPrisadka}/${reqQty} шт. готово)`,
        requiredPrecedingStage: hasEdges && kromkaPieces <= raskroyPieces ? 'edging' : 'cutting'
      };
    }
    return {
      isAvailable: true,
      isScannedOnCurrentStage
    };
  }

  // 5. Assembly (Сборка)
  if (normStage === 'assembly') {
    if (!isRaskroyDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: `Ожидает распила (${raskroyPieces}/${reqQty} шт.)`,
        requiredPrecedingStage: 'cutting'
      };
    }
    if (!isKromkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: `Ожидает кромкооблицовки (${kromkaPieces}/${reqQty} шт.)`,
        requiredPrecedingStage: 'edging'
      };
    }
    if (!isPrisadkaDone) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: `Ожидает присадки (ЧПУ) (${prisadkaPieces}/${reqQty} шт.)`,
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
    const packStats = getDetailPackagingPieceStats(detail as any, order, settings);
    if (packStats.readyPiecesCount === 0) {
      return {
        isAvailable: false,
        isScannedOnCurrentStage,
        blockingReason: packStats.reason || 'Ожидает предшествующие этапы',
        requiredPrecedingStage: packStats.missingStages[0]?.id
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

  // Packing: accessible immediately, but shows piece-accurate stats
  if (stageId === 'packing') {
    const packStats = getPackagingReadinessStats(order, settings);
    let statusText = '';
    if (packStats.totalPiecesCount === 0) {
      statusText = 'Доступна в работу';
    } else if (packStats.isFullyReady) {
      statusText = '100% готов к упаковке';
    } else if (packStats.readyPiecesCount === 0) {
      statusText = 'Ожидает готовности деталей на участках';
    } else {
      statusText = `Готово ${packStats.readyPiecesCount} из ${packStats.totalPiecesCount} шт.`;
    }

    return {
      isLocked: false,
      statusText,
      readyPartsCount: packStats.readyPiecesCount,
      totalPartsCount: packStats.totalPiecesCount || totalPartsCount
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

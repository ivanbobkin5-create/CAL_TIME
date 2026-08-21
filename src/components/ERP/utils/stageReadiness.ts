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
export function detailRequiresPrisadka(detail: { name?: string; notes?: string }, settings?: ERPCompanySettings): boolean {
  const notes = (detail.notes || '').toLowerCase();
  const name = (detail.name || '').toLowerCase();

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

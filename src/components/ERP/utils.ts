import { ProductionOrder, ProductionStageId } from './types';

export function formatDeadlineDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).trim();
  
  // Format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    if (months[monthIdx]) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }

  // Try standard JS Date parsing
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    // ignore
  }

  return cleanStr;
}

export function orderRequiresEdging(order: ProductionOrder): boolean {
  if (order.totalEdgeM && order.totalEdgeM > 0) return true;
  if (order.birkaData?.allEdges && order.birkaData.allEdges.length > 0) return true;
  if (order.birkaData?.details) {
    return order.birkaData.details.some(d => !!(d.edgeL1 || d.edgeL2 || d.edgeW1 || d.edgeW2));
  }
  return false;
}

export function getNextRequiredStage(
  order: ProductionOrder, 
  currentStage: ProductionStageId,
  enabledStages?: ProductionStageId[]
): ProductionStageId | null {
  const hasEdge = orderRequiresEdging(order);
  const stagesSequence: ProductionStageId[] = ['queue', 'cutting', 'edging', 'cnc', 'facades', 'assembly', 'kitting', 'qc', 'packing', 'ready'];
  
  // Filter sequence by enabled stages
  const activeSequence = enabledStages && enabledStages.length > 0
    ? stagesSequence.filter(s => s === 'queue' || s === 'ready' || enabledStages.includes(s))
    : stagesSequence;

  const currentIndex = activeSequence.indexOf(currentStage);
  if (currentIndex === -1) {
    return activeSequence.includes('cutting') ? 'cutting' : (activeSequence[1] || 'ready');
  }

  for (let i = currentIndex + 1; i < activeSequence.length; i++) {
    const nextSt = activeSequence[i];
    if (nextSt === 'edging' && !hasEdge) {
      // Skip edging stage because order has 0 edge meters!
      continue;
    }
    return nextSt;
  }
  return null;
}


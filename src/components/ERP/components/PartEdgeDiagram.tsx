import React from 'react';
import { BirkaDetail } from '../utils/birkaParser';

interface PartEdgeDiagramProps {
  detail: Partial<BirkaDetail> & {
    length?: number;
    width?: number;
    edgeL1?: string;
    edgeL2?: string;
    edgeW1?: string;
    edgeW2?: string;
  };
  compact?: boolean;
  showDimensions?: boolean;
}

// Extract edge thickness or short tag (e.g., "2", "0.4", "1", "ПВХ 2")
export function getEdgeShortTag(edgeStr?: string): { tag: string; isThick: boolean; raw: string } | null {
  if (!edgeStr || edgeStr === '-' || edgeStr === '—' || edgeStr === '0' || edgeStr.toLowerCase() === 'нет') {
    return null;
  }
  const clean = edgeStr.trim();
  const numMatch = clean.match(/(\d+[.,]\d+|\d+)/);
  let tag = clean;
  let isThick = false;
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(',', '.'));
    isThick = val >= 1.5;
    tag = `${numMatch[1]}`;
  } else if (clean.length > 5) {
    tag = clean.slice(0, 4);
  }
  return { tag, isThick, raw: clean };
}

export const PartEdgeDiagram: React.FC<PartEdgeDiagramProps> = ({
  detail,
  compact = false,
  showDimensions = true
}) => {
  const eL1 = getEdgeShortTag(detail.edgeL1);
  const eL2 = getEdgeShortTag(detail.edgeL2);
  const eW1 = getEdgeShortTag(detail.edgeW1);
  const eW2 = getEdgeShortTag(detail.edgeW2);

  const hasAnyEdge = !!(eL1 || eL2 || eW1 || eW2);

  const len = detail.length || 0;
  const wid = detail.width || 0;

  // Compute aspect ratio box (constrained to nice bounding box)
  const isHorizontal = len >= wid;
  const boxWidth = compact ? (isHorizontal ? 56 : 42) : (isHorizontal ? 74 : 54);
  const boxHeight = compact ? (isHorizontal ? 32 : 44) : (isHorizontal ? 40 : 54);

  // Helper for side styles
  const getSideClass = (edge: ReturnType<typeof getEdgeShortTag>, isLengthSide: boolean) => {
    if (!edge) {
      return 'bg-slate-200';
    }
    if (edge.isThick) {
      return 'bg-indigo-600 shadow-xs ring-1 ring-indigo-400/50';
    }
    return 'bg-blue-500';
  };

  const getFullTooltip = () => {
    if (!hasAnyEdge) return 'Без кромки';
    const lines = [];
    if (detail.edgeL1) lines.push(`L1 (верх, ${len}мм): ${detail.edgeL1}`);
    if (detail.edgeL2) lines.push(`L2 (низ, ${len}мм): ${detail.edgeL2}`);
    if (detail.edgeW1) lines.push(`W1 (лево, ${wid}мм): ${detail.edgeW1}`);
    if (detail.edgeW2) lines.push(`W2 (право, ${wid}мм): ${detail.edgeW2}`);
    return lines.join(' • ');
  };

  return (
    <div 
      className="inline-flex flex-col items-center justify-center select-none group relative py-0.5"
      title={getFullTooltip()}
    >
      <div 
        className="relative bg-slate-50 rounded border border-slate-200/90 flex items-center justify-center overflow-visible transition-all group-hover:border-slate-300"
        style={{ width: `${boxWidth}px`, height: `${boxHeight}px` }}
      >
        {/* L1: TOP side */}
        <div 
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t transition-colors ${getSideClass(eL1, true)}`}
        >
          {eL1 && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 text-[8px] font-black leading-none bg-indigo-900 text-white rounded shadow-xs whitespace-nowrap">
              L1:{eL1.tag}
            </span>
          )}
        </div>

        {/* L2: BOTTOM side */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-b transition-colors ${getSideClass(eL2, true)}`}
        >
          {eL2 && (
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 text-[8px] font-black leading-none bg-indigo-900 text-white rounded shadow-xs whitespace-nowrap">
              L2:{eL2.tag}
            </span>
          )}
        </div>

        {/* W1: LEFT side */}
        <div 
          className={`absolute top-0 bottom-0 left-0 w-[3px] rounded-l transition-colors ${getSideClass(eW1, false)}`}
        >
          {eW1 && (
            <span className="absolute top-1/2 -left-4 -translate-y-1/2 px-0.5 py-0.2 text-[7.5px] font-black leading-none bg-blue-800 text-white rounded shadow-xs whitespace-nowrap">
              {eW1.tag}
            </span>
          )}
        </div>

        {/* W2: RIGHT side */}
        <div 
          className={`absolute top-0 bottom-0 right-0 w-[3px] rounded-r transition-colors ${getSideClass(eW2, false)}`}
        >
          {eW2 && (
            <span className="absolute top-1/2 -right-4 -translate-y-1/2 px-0.5 py-0.2 text-[7.5px] font-black leading-none bg-blue-800 text-white rounded shadow-xs whitespace-nowrap">
              {eW2.tag}
            </span>
          )}
        </div>

        {/* Center Dimensions or No Edge indicator */}
        <div className="text-center px-1 pointer-events-none">
          {!hasAnyEdge ? (
            <span className="text-[9px] font-mono text-slate-400 font-bold block">
              без кромки
            </span>
          ) : showDimensions && len > 0 && wid > 0 ? (
            <span className="text-[8.5px] font-mono font-bold text-slate-700 leading-tight block">
              {len}×{wid}
            </span>
          ) : (
            <span className="text-[8px] font-bold text-indigo-700 leading-tight block">
              {[eL1 && 'L1', eL2 && 'L2', eW1 && 'W1', eW2 && 'W2'].filter(Boolean).join('+')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

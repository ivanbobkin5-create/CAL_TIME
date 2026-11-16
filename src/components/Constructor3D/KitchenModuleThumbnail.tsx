import React from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { KitchenModuleItem } from './constructorPresets';

export interface KitchenModuleThumbnailProps {
  template?: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>;
  tpl?: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>;
  facadeColor?: string;
  carcassColor?: string;
  onAdd?: () => void;
  onClickAdd?: (template: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export const KitchenModuleThumbnail: React.FC<KitchenModuleThumbnailProps> = ({
  template,
  tpl,
  facadeColor = '#E2E8F0',
  carcassColor = '#F1F5F9',
  onAdd,
  onClickAdd,
  onDragStart,
  onDragEnd,
}) => {
  const effectiveTpl = (template || tpl)!;
  const { fillingType, category, width, height, depth, name } = effectiveTpl;

  // Render specialized SVG miniature for each module filling type
  const renderModuleSvg = () => {
    const isUpper = category === 'upper' || category === 'anthresole';
    const isTall = category === 'tall';
    const fillCol = facadeColor;
    const bodyCol = carcassColor;

    switch (fillingType) {
      case 'doors_1':
      case 'upper_doors_1':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            {/* Plinth */}
            {!isUpper && <rect x="24" y="82" width="52" height="10" rx="1" fill="#475569" />}
            {/* Countertop */}
            {!isUpper && <rect x="18" y="16" width="64" height="6" rx="1.5" fill="#334155" />}
            {/* Carcass box */}
            <rect x="20" y={isUpper ? 18 : 22} width="60" height={isUpper ? 66 : 60} rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Door facade */}
            <rect x="22" y={isUpper ? 20 : 24} width="56" height={isUpper ? 62 : 56} rx="1.5" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Handle */}
            <rect x="70" y={isUpper ? 58 : 34} width="3" height="14" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'doors_2':
      case 'upper_doors_2':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            {!isUpper && <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />}
            {!isUpper && <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />}
            <rect x="18" y={isUpper ? 18 : 22} width="64" height={isUpper ? 66 : 60} rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Left door */}
            <rect x="20" y={isUpper ? 20 : 24} width="29" height={isUpper ? 62 : 56} rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="44" y={isUpper ? 58 : 34} width="2.5" height="14" rx="1" fill="#1E293B" />
            {/* Right door */}
            <rect x="51" y={isUpper ? 20 : 24} width="29" height={isUpper ? 62 : 56} rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="53.5" y={isUpper ? 58 : 34} width="2.5" height="14" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'drawers_2':
      case 'drawers_2_inner':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            <rect x="18" y="22" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Top deep drawer */}
            <rect x="20" y="24" width="60" height="27" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Inner hidden drawer dashed line if drawers_2_inner */}
            {fillingType === 'drawers_2_inner' && (
              <line x1="23" y1="32" x2="77" y2="32" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 2" />
            )}
            <rect x="41" y="36" width="18" height="3" rx="1" fill="#1E293B" />
            {/* Bottom deep drawer */}
            <rect x="20" y="53" width="60" height="27" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="41" y="64" width="18" height="3" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'drawers_3':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            <rect x="18" y="22" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Shallow drawer */}
            <rect x="20" y="24" width="60" height="16" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="43" y="30" width="14" height="2.5" rx="0.8" fill="#1E293B" />
            {/* Mid drawer */}
            <rect x="20" y="42" width="60" height="19" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="43" y="49" width="14" height="2.5" rx="0.8" fill="#1E293B" />
            {/* Bottom drawer */}
            <rect x="20" y="63" width="60" height="19" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="43" y="70" width="14" height="2.5" rx="0.8" fill="#1E293B" />
          </svg>
        );

      case 'drawers_4':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            <rect x="18" y="22" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {[0, 1, 2, 3].map((idx) => (
              <g key={idx}>
                <rect x="20" y={24 + idx * 14} width="60" height="12.5" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
                <rect x="44" y={29 + idx * 14} width="12" height="2" rx="0.5" fill="#1E293B" />
              </g>
            ))}
          </svg>
        );

      case 'sink':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="18" width="68" height="6" rx="1.5" fill="#334155" />
            {/* Stainless steel sink bowl cutout */}
            <rect x="28" y="14" width="44" height="6" rx="1" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
            {/* Arc faucet */}
            <path d="M 44 14 Q 44 4, 52 4 Q 56 4, 56 10" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="56" cy="11" r="1.5" fill="#0284C7" />
            {/* Cabinet body */}
            <rect x="18" y="24" width="64" height="58" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Double doors for sink */}
            <rect x="20" y="26" width="29" height="54" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="44" y="38" width="2.5" height="12" rx="1" fill="#1E293B" />
            <rect x="51" y="26" width="29" height="54" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="53.5" y="38" width="2.5" height="12" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'oven_cooktop':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            {/* Countertop with ceramic cooktop */}
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#1E293B" />
            <ellipse cx="38" cy="19" rx="8" ry="1.5" fill="#DC2626" />
            <ellipse cx="62" cy="19" rx="6" ry="1.2" fill="#DC2626" />
            {/* Carcass box */}
            <rect x="18" y="22" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Oven viewing glass */}
            <rect x="20" y="24" width="60" height="42" rx="1.5" fill="#090D16" stroke="#475569" strokeWidth="1.2" />
            {/* Inner oven light window */}
            <rect x="26" y="33" width="48" height="26" rx="1" fill="#1E293B" stroke="#334155" strokeWidth="0.8" />
            <rect x="27" y="27" width="46" height="3" rx="1" fill="#CBD5E1" />
            {/* Bottom drawer underneath oven */}
            <rect x="20" y="68" width="60" height="14" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="43" y="73" width="14" height="2.5" rx="0.8" fill="#1E293B" />
          </svg>
        );

      case 'bottle_rack':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="36" y="82" width="28" height="10" rx="1" fill="#475569" />
            <rect x="30" y="16" width="40" height="6" rx="1.5" fill="#334155" />
            <rect x="32" y="22" width="36" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="34" y="24" width="32" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Cargo pull-out wire lines */}
            <line x1="42" y1="36" x2="58" y2="36" stroke="#0284C7" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="42" y1="60" x2="58" y2="60" stroke="#0284C7" strokeWidth="2" strokeDasharray="3 2" />
            <rect x="48" y="28" width="4" height="8" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'dishwasher':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            {/* Built-in Dishwasher with facade */}
            <rect x="20" y="22" width="60" height="60" rx="1.5" fill="#64748B" stroke="#334155" strokeWidth="1" />
            <rect x="20" y="26" width="60" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Top horizontal handle */}
            <rect x="39" y="31" width="22" height="3" rx="1" fill="#1E293B" />
            {/* Stainless control strip */}
            <rect x="22" y="22.5" width="56" height="3.5" rx="0.5" fill="#0F172A" />
            <circle cx="28" cy="24.2" r="1.2" fill="#38BDF8" />
          </svg>
        );

      case 'freestanding_dw':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#1E293B" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            {/* Freestanding Dishwasher (no furniture facade, stainless steel body) */}
            <rect x="20" y="22" width="60" height="60" rx="1.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
            <rect x="22" y="24" width="56" height="10" rx="0.5" fill="#0F172A" />
            <circle cx="27" cy="29" r="1.5" fill="#38BDF8" />
            <rect x="38" y="38" width="24" height="3" rx="1" fill="#475569" />
          </svg>
        );

      case 'freestanding_washer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            {/* Freestanding Washing machine (no furniture facade, round drum window) */}
            <rect x="22" y="22" width="56" height="60" rx="1.5" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
            {/* Circular Glass Drum Window */}
            <circle cx="50" cy="54" r="17" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
            <circle cx="50" cy="54" r="12" fill="#38BDF8" opacity="0.6" />
            {/* Detergent dispenser drawer */}
            <rect x="25" y="25" width="14" height="8" rx="0.5" fill="#CBD5E1" />
            {/* Program Dial */}
            <circle cx="58" cy="29" r="3.5" fill="#1E293B" />
            {/* Display */}
            <rect x="66" y="26" width="9" height="5" rx="0.5" fill="#0284C7" />
          </svg>
        );

      case 'built_in_washer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="22" y="82" width="56" height="10" rx="1" fill="#475569" />
            <rect x="16" y="16" width="68" height="6" rx="1.5" fill="#334155" />
            {/* Built-in Washing Machine with furniture door facade */}
            <rect x="18" y="22" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="20" y="24" width="60" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="72" y="44" width="3" height="16" rx="1" fill="#1E293B" />
            {/* Inner washer hint dashed circle */}
            <circle cx="50" cy="52" r="14" fill="none" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
        );

      case 'corner_lower':
      case 'upper_corner':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            {!isUpper && <rect x="18" y="82" width="64" height="10" rx="1" fill="#475569" />}
            {!isUpper && <polygon points="12,18 88,18 82,24 18,24" fill="#334155" />}
            <rect x="16" y={isUpper ? 18 : 22} width="68" height={isUpper ? 66 : 60} rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Working door on left */}
            <rect x="18" y={isUpper ? 20 : 24} width="32" height={isUpper ? 62 : 56} rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="21" y={isUpper ? 58 : 34} width="2.5" height="14" rx="1" fill="#1E293B" />
            {/* Corner transition L-strip (50mm) */}
            <rect x="51" y={isUpper ? 20 : 24} width="6" height={isUpper ? 62 : 56} rx="0.5" fill={fillCol} stroke="#94A3B8" strokeWidth="1" />
            {/* Blind recessed carcass part */}
            <rect x="58" y={isUpper ? 21 : 25} width="24" height={isUpper ? 60 : 54} rx="1" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
          </svg>
        );

      case 'upper_lift_2':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="18" y="20" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Top flap */}
            <rect x="20" y="22" width="60" height="27" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Bottom flap */}
            <rect x="20" y="51" width="60" height="27" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            {/* Handle at bottom edge */}
            <rect x="42" y="70" width="16" height="3" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'upper_dryer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="18" y="20" width="64" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="20" y="22" width="29" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="44" y="54" width="2.5" height="14" rx="1" fill="#1E293B" />
            <rect x="51" y="22" width="29" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="53.5" y="54" width="2.5" height="14" rx="1" fill="#1E293B" />
            {/* Dryer wire emblem */}
            <path d="M 32 36 L 42 36 M 32 42 L 42 42 M 58 36 L 68 36 M 58 42 L 68 42" stroke="#0284C7" strokeWidth="1.5" />
          </svg>
        );

      case 'upper_hood':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="18" y="18" width="64" height="64" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="20" y="20" width="60" height="42" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="43" y="52" width="14" height="3" rx="1" fill="#1E293B" />
            {/* Telescopic hood canopy */}
            <rect x="20" y="64" width="60" height="16" rx="1" fill="#0F172A" />
            <rect x="24" y="68" width="52" height="8" rx="1" fill="#334155" stroke="#94A3B8" strokeWidth="0.8" />
          </svg>
        );

      case 'tall_fridge':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="26" y="90" width="48" height="6" rx="1" fill="#475569" />
            <rect x="24" y="10" width="52" height="80" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Top fridge door */}
            <rect x="26" y="12" width="48" height="46" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="68" y="38" width="3" height="16" rx="1" fill="#1E293B" />
            {/* Bottom freezer door */}
            <rect x="26" y="60" width="48" height="28" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="68" y="64" width="3" height="14" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'tall_oven_micro':
      case 'tall_oven_micro_1drawer':
      case 'tall_oven_micro_2drawers':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="26" y="90" width="48" height="6" rx="1" fill="#475569" />
            <rect x="24" y="10" width="52" height="80" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            {/* Top door */}
            <rect x="26" y="12" width="48" height="16" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="68" y="21" width="2.5" height="6" rx="0.8" fill="#1E293B" />
            {/* Microwave */}
            <rect x="26" y="30" width="48" height="18" rx="1" fill="#090D16" stroke="#475569" strokeWidth="1" />
            <rect x="30" y="33" width="30" height="12" rx="0.5" fill="#1E293B" />
            {/* Oven */}
            <rect x="26" y="50" width="48" height="22" rx="1" fill="#090D16" stroke="#475569" strokeWidth="1" />
            <rect x="30" y="54" width="40" height="14" rx="0.5" fill="#1E293B" />
            {/* Bottom drawers */}
            <rect x="26" y="74" width="48" height="14" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="42" y="77" width="16" height="2.5" rx="0.8" fill="#1E293B" />
          </svg>
        );

      case 'tall_pantry':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="28" y="90" width="44" height="6" rx="1" fill="#475569" />
            <rect x="26" y="10" width="48" height="80" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="28" y="12" width="44" height="76" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="66" y="46" width="3" height="20" rx="1" fill="#1E293B" />
          </svg>
        );

      case 'anthresole_1':
      case 'anthresole_2':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="16" y="32" width="68" height="36" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="18" y="34" width="64" height="32" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="42" y="58" width="16" height="3" rx="1" fill="#1E293B" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
            <rect x="20" y="20" width="60" height="60" rx="2" fill={bodyCol} stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="22" y="22" width="56" height="56" rx="1" fill={fillCol} stroke="#CBD5E1" strokeWidth="1" />
            <rect x="68" y="44" width="3" height="14" rx="1" fill="#1E293B" />
          </svg>
        );
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (onClickAdd) onClickAdd(effectiveTpl);
        else if (onAdd) onAdd();
      }}
      className="w-full aspect-square flex flex-col items-center justify-between p-2 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden select-none"
      title="Перетащите модуль на 3D стену или кликните для добавления"
    >
      {/* Visual 2.5D SVG Miniature */}
      <div className="w-full flex-1 flex items-center justify-center p-1 pointer-events-none">
        <div className="w-16 h-16 sm:w-20 sm:h-20 transition-transform group-hover:scale-105 duration-200">
          {renderModuleSvg()}
        </div>
      </div>

      {/* Module Info: Title & Dimensions */}
      <div className="w-full text-center shrink-0 pt-1 pointer-events-none">
        <div className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover:text-amber-900">
          {name}
        </div>
        <div className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-semibold text-slate-500 mt-0.5 group-hover:bg-amber-100 group-hover:text-amber-900">
          {width}×{height}
        </div>
      </div>

      {/* Quick Add Button on Hover */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Drag handle hint on Hover */}
      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
      </div>
    </div>
  );
};

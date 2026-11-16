import React from 'react';
import {
  Trash2,
  Sliders,
  RotateCcw,
  Copy,
  Move,
  ArrowLeftRight,
  FlipHorizontal2,
  X,
} from 'lucide-react';
import { KitchenModuleItem } from './constructorPresets';

export interface KitchenRadialMenuProps {
  module?: KitchenModuleItem;
  moduleName?: string;
  moduleWall?: 'left' | 'center' | 'right';
  position?: { x: number; y: number };
  x?: number;
  y?: number;
  onClose: () => void;
  onOpenInspector?: () => void;
  onOpenProperties?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotateWall: (direction?: any) => void;
  onMirror?: () => void;
  onStartMove?: () => void;
  onMoveInSpace?: () => void;
  onStartReplace?: () => void;
  onReplace?: () => void;
}

export const KitchenRadialMenu: React.FC<KitchenRadialMenuProps> = ({
  module,
  moduleName,
  moduleWall,
  position,
  x,
  y,
  onClose,
  onOpenInspector,
  onOpenProperties,
  onDelete,
  onDuplicate,
  onRotateWall,
  onMirror,
  onStartMove,
  onMoveInSpace,
  onStartReplace,
  onReplace,
}) => {
  const posX = position?.x ?? x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);
  const posY = position?.y ?? y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 200);
  const displayName = module?.name ?? moduleName ?? 'Модуль';
  const displayWall = module?.wall || moduleWall || 'center';
  const handleInspect = onOpenProperties || onOpenInspector || (() => {});
  const handleMove = onMoveInSpace || onStartMove || (() => {});
  const handleReplace = onReplace || onStartReplace || (() => {});
  const handleMirror = onMirror || (() => {});

  // 7 radial buttons positioned in a circle around center (radius ~90px)
  const radius = 90;
  const items = [
    {
      id: 'delete',
      label: 'Удалить',
      icon: Trash2,
      color: 'bg-rose-500 hover:bg-rose-600 text-white',
      action: onDelete,
      angle: -90, // Top
    },
    {
      id: 'replace',
      label: 'Заменить',
      icon: ArrowLeftRight,
      color: 'bg-amber-500 hover:bg-amber-600 text-slate-950',
      action: handleReplace,
      angle: -38, // Top-Right
    },
    {
      id: 'move',
      label: 'Переместить',
      icon: Move,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      action: handleMove,
      angle: 14, // Right
    },
    {
      id: 'inspector',
      label: 'Свойства',
      icon: Sliders,
      color: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      action: handleInspect,
      angle: 66, // Bottom-Right
    },
    {
      id: 'mirror',
      label: 'Отразить',
      icon: FlipHorizontal2,
      color: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      action: handleMirror,
      angle: 118, // Bottom-Left
    },
    {
      id: 'rotate',
      label: 'Стена',
      icon: RotateCcw,
      color: 'bg-purple-600 hover:bg-purple-500 text-white',
      action: () => onRotateWall('next'),
      angle: 170, // Left
    },
    {
      id: 'duplicate',
      label: 'Копия',
      icon: Copy,
      color: 'bg-slate-700 hover:bg-slate-600 text-white',
      action: onDuplicate,
      angle: 222, // Top-Left
    },
  ];

  // Clamp menu inside window bounds
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const clampedX = Math.max(130, Math.min(winW - 130, posX));
  const clampedY = Math.max(130, Math.min(winH - 130, posY));

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      onClick={onClose}
    >
      {/* Backdrop with faint blur */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-2xs" />

      {/* Radial Menu Container */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: clampedX, top: clampedY }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft pulsing halo */}
        <div className="absolute inset-0 -m-16 rounded-full bg-amber-500/10 animate-pulse pointer-events-none" />

        {/* Central Disc with Module Information & Close Button */}
        <div className="relative w-28 h-28 rounded-full bg-white/95 backdrop-blur-md border-2 border-amber-400 shadow-xl flex flex-col items-center justify-center p-2 text-center select-none z-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-xs"
            title="Закрыть меню"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[90px]">
            {displayName}
          </div>
          {module && (
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
              {module.width}×{module.height} мм
            </div>
          )}
          <div className="text-[9px] text-slate-400 mt-0.5">
            {displayWall === 'left' ? 'Слева' : displayWall === 'right' ? 'Справа' : 'Центр'}
          </div>
        </div>

        {/* Radial Action Buttons */}
        {items.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const bx = Math.round(Math.cos(rad) * radius);
          const by = Math.round(Math.sin(rad) * radius);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 group"
              style={{ left: `calc(50% + ${bx}px)`, top: `calc(50% + ${by}px)` }}
            >
              <button
                type="button"
                onClick={() => {
                  item.action();
                }}
                className={`w-11 h-11 rounded-full ${item.color} shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-115 active:scale-95 border-2 border-white`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
              <span className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold shadow-xs whitespace-nowrap pointer-events-none opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

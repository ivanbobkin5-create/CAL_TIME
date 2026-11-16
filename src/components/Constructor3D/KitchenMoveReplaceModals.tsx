import React from 'react';
import {
  X,
  Move,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { KitchenModuleItem, STANDARD_KITCHEN_MODULE_LIBRARY } from './constructorPresets';
import { KitchenModuleThumbnail } from './KitchenModuleThumbnail';
import { NumericInput } from './NumericInput';

interface KitchenMoveHudProps {
  module: KitchenModuleItem;
  onUpdate: (patch: Partial<KitchenModuleItem>) => void;
  onClose: () => void;
}

export const KitchenMoveHud: React.FC<KitchenMoveHudProps> = ({
  module,
  onUpdate,
  onClose,
}) => {
  const currentZ = module.positionZ || 0;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">
                Перемещение в пространстве: {module.name}
              </div>
              <div className="text-[10px] text-slate-400">
                Стена: {(module.wall || 'center') === 'left' ? 'Левая' : (module.wall || 'center') === 'right' ? 'Правая' : 'Центральная'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Axes Controls: X, Y, Z */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* Axis X (Along wall) */}
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Вдоль стены (X)
            </span>
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => onUpdate({ positionX: Math.max(0, module.positionX - 50) })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Сдвинуть влево (-50мм)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <NumericInput
                step={50}
                min={0}
                max={10000}
                value={module.positionX}
                onChange={(val) => onUpdate({ positionX: val })}
                className="w-16 text-center font-bold font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded py-0.5 text-xs"
              />
              <button
                type="button"
                onClick={() => onUpdate({ positionX: module.positionX + 50 })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Сдвинуть вправо (+50мм)"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Axis Y (Elevation from floor) */}
          <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Высота от пола (Y)
            </span>
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => onUpdate({ elevationY: Math.max(0, module.elevationY - 20) })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Опустить вниз (-20мм)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <NumericInput
                step={20}
                min={0}
                max={3000}
                value={module.elevationY}
                onChange={(val) => onUpdate({ elevationY: val })}
                className="w-16 text-center font-bold font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded py-0.5 text-xs"
              />
              <button
                type="button"
                onClick={() => onUpdate({ elevationY: module.elevationY + 20 })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Поднять вверх (+20мм)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Axis Z (Depth offset: Forward / Backward from wall into room) */}
          <div className="bg-slate-800/80 p-2 rounded-xl border border-emerald-500/40 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Вперед / Назад (Z)
            </span>
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => onUpdate({ positionZ: currentZ - 50 })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Сдвинуть назад к стене (-50мм)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <NumericInput
                step={50}
                min={-1000}
                max={4000}
                value={currentZ}
                onChange={(val) => onUpdate({ positionZ: val })}
                className="w-16 text-center font-bold font-mono text-emerald-400 bg-slate-900 border border-emerald-500/50 rounded py-0.5 text-xs"
              />
              <button
                type="button"
                onClick={() => onUpdate({ positionZ: currentZ + 50 })}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                title="Выдвинуть вперед в пространство (+50мм)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Z Depth Offset Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400">Быстрый отступ Z:</span>
          <button
            type="button"
            onClick={() => onUpdate({ positionZ: 0 })}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
              currentZ === 0
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            К стене (0 мм)
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ positionZ: 600 })}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
              currentZ === 600
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            +600 мм (Остров)
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ positionZ: 900 })}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
              currentZ === 900
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            +900 мм
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ positionZ: 1200 })}
            className={`px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
              currentZ === 1200
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            +1200 мм
          </button>
        </div>
      </div>
    </div>
  );
};

interface KitchenReplaceModalProps {
  module: KitchenModuleItem;
  facadeColor?: string;
  carcassColor?: string;
  onReplaceWithTemplate: (template: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>) => void;
  onClose: () => void;
}

export const KitchenReplaceModal: React.FC<KitchenReplaceModalProps> = ({
  module,
  facadeColor,
  carcassColor,
  onReplaceWithTemplate,
  onClose,
}) => {
  // Show modules matching category or width
  const matchingTemplates = STANDARD_KITCHEN_MODULE_LIBRARY.filter(
    (tpl) => tpl.category === module.category || tpl.width === module.width
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Заменить модуль «{module.name}»
              </div>
              <div className="text-xs text-slate-500">
                Выберите новый модуль из библиотеки — позиция и стена сохранятся
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Column Visual Grid of Modules */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {matchingTemplates.map((tpl) => {
              const adaptedTpl = { ...tpl, width: module.width };
              return (
                <KitchenModuleThumbnail
                  key={tpl.templateCode}
                  template={adaptedTpl}
                  facadeColor={facadeColor}
                  carcassColor={carcassColor}
                  onAdd={() => onReplaceWithTemplate(adaptedTpl)}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

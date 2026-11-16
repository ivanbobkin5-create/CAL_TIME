import React from 'react';
import {
  X,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  ArrowLeftToLine,
  ArrowRightToLine,
  Layers,
} from 'lucide-react';
import { KitchenModuleItem } from './constructorPresets';

export type ModuleAlignPlane =
  | 'left_edge'
  | 'right_edge'
  | 'center_x'
  | 'flush_right'
  | 'flush_left'
  | 'bottom_y'
  | 'top_y'
  | 'front_z';

interface KitchenAlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceModule: KitchenModuleItem | null;
  targetModules: KitchenModuleItem[];
  onApplyAlignment: (plane: ModuleAlignPlane) => void;
}

export const KitchenAlignmentModal: React.FC<KitchenAlignmentModalProps> = ({
  isOpen,
  onClose,
  referenceModule,
  targetModules,
  onApplyAlignment,
}) => {
  if (!isOpen || !referenceModule || targetModules.length === 0) return null;

  const options: Array<{
    id: ModuleAlignPlane;
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'left_edge',
      title: 'По левому краю (X)',
      subtitle: `Левая боковина в X = ${referenceModule.positionX} мм`,
      icon: AlignStartVertical,
    },
    {
      id: 'right_edge',
      title: 'По правому краю (X)',
      subtitle: `Правая боковина в X = ${referenceModule.positionX + referenceModule.width} мм`,
      icon: AlignEndVertical,
    },
    {
      id: 'center_x',
      title: 'По центру (ось X)',
      subtitle: 'Центры модулей на одной вертикальной оси (верх над низом)',
      icon: AlignCenterVertical,
    },
    {
      id: 'flush_right',
      title: 'Вплотную справа от первого',
      subtitle: `Прижать слева к правому торцу (${referenceModule.positionX + referenceModule.width} мм)`,
      icon: ArrowRightToLine,
    },
    {
      id: 'flush_left',
      title: 'Вплотную слева от первого',
      subtitle: `Прижать справа к левому торцу (${referenceModule.positionX} мм)`,
      icon: ArrowLeftToLine,
    },
    {
      id: 'bottom_y',
      title: 'По нижнему краю (высота Y)',
      subtitle: `Нижняя плоскость на высоте Y = ${referenceModule.elevationY} мм`,
      icon: AlignEndHorizontal,
    },
    {
      id: 'top_y',
      title: 'По верхнему краю (высота Y)',
      subtitle: `Верхняя плоскость по верху первого модуля`,
      icon: AlignStartHorizontal,
    },
    {
      id: 'front_z',
      title: 'По лицевой плоскости (глубина Z)',
      subtitle: 'Выровнять вынос вперед/назад вровень с первым модулем',
      icon: Layers,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Выравнивание выбранных модулей
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Модули, выбранные через <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Ctrl + Клик</kbd>, выровняются относительно первого модуля
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reference vs Targets info banner */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Опорный (1-й выбранный):</span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
              {referenceModule.name} ({referenceModule.width}×{referenceModule.height} мм, X={referenceModule.positionX})
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-600 font-medium shrink-0">Выравниваемые ({targetModules.length}):</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {targetModules.map((m) => (
                <span
                  key={m.id}
                  className="font-semibold text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 text-[11px]"
                >
                  {m.name} ({m.width} мм)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Plane selection grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onApplyAlignment(opt.id);
                  onClose();
                }}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-amber-950">
                    {opt.title}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    {opt.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

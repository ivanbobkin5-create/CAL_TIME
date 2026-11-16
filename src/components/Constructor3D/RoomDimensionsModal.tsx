import React, { useState } from 'react';
import { X, Maximize2, LayoutGrid, Check, Ruler } from 'lucide-react';
import { ConstructorSceneData } from './constructorPresets';
import { NumericInput } from './NumericInput';

export interface RoomDimensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: ConstructorSceneData;
  onApply: (params: {
    wallCenterLength: number;
    wallLeftLength?: number;
    wallRightLength?: number;
    roomHeight: number;
    layoutType: 'straight' | 'l_left' | 'l_right' | 'u_shape';
    plinthHeight: number;
    worktopThickness: number;
  }) => void;
}

export const RoomDimensionsModal: React.FC<RoomDimensionsModalProps> = ({
  isOpen,
  onClose,
  scene,
  onApply,
}) => {
  const k = scene.kitchen;

  const [layoutType, setLayoutType] = useState<'straight' | 'l_left' | 'l_right' | 'u_shape'>(
    k.layoutType || 'straight'
  );
  const [centerLen, setCenterLen] = useState<number>(k.wallCenterLength || 3000);
  const [leftLen, setLeftLen] = useState<number>(k.wallLeftLength || 2000);
  const [rightLen, setRightLen] = useState<number>(k.wallRightLength || 2000);
  const [roomH, setRoomH] = useState<number>(k.roomHeight || 2600);
  const [plinthH, setPlinthH] = useState<number>(k.plinthHeight || 100);
  const [wtThick, setWtThick] = useState<number>(scene.materials.worktopThickness || 38);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      layoutType,
      wallCenterLength: Math.max(1200, Math.min(10000, centerLen)),
      wallLeftLength:
        layoutType === 'l_left' || layoutType === 'u_shape'
          ? Math.max(1000, Math.min(8000, leftLen))
          : undefined,
      wallRightLength:
        layoutType === 'l_right' || layoutType === 'u_shape'
          ? Math.max(1000, Math.min(8000, rightLen))
          : undefined,
      roomHeight: Math.max(2000, Math.min(3600, roomH)),
      plinthHeight: plinthH,
      worktopThickness: wtThick,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-800 flex items-center justify-center border border-amber-300/40">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Габариты и планировка помещения
              </h3>
              <p className="text-xs text-slate-500">
                Задайте размеры кухни перед началом расстановки модулей
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Kitchen Layout Types */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Тип планировки гарнитура:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'straight', label: 'Прямая', desc: '1 стена' },
                { id: 'l_left', label: 'Г-образная', desc: 'Угол слева' },
                { id: 'l_right', label: 'Г-образная', desc: 'Угол справа' },
                { id: 'u_shape', label: 'П-образная', desc: '3 стены' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayoutType(item.id as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                    layoutType === item.id
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] opacity-75 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wall Dimensions with NumericInput (allows erasing without reset!) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Размеры стен кухни (мм):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                  Основная стена (центр)
                </label>
                <NumericInput
                  value={centerLen}
                  onChange={(val) => setCenterLen(val)}
                  min={1200}
                  max={10000}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                  placeholder="3000"
                />
              </div>

              {(layoutType === 'l_left' || layoutType === 'u_shape') && (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    Левая стена (угол)
                  </label>
                  <NumericInput
                    value={leftLen}
                    onChange={(val) => setLeftLen(val)}
                    min={1000}
                    max={8000}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                    placeholder="2000"
                  />
                </div>
              )}

              {(layoutType === 'l_right' || layoutType === 'u_shape') && (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    Правая стена (угол)
                  </label>
                  <NumericInput
                    value={rightLen}
                    onChange={(val) => setRightLen(val)}
                    min={1000}
                    max={8000}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                    placeholder="2000"
                  />
                </div>
              )}
            </div>

            {/* Room Height */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                <label className="block text-[11px] text-slate-700 font-semibold">
                  Высота помещения от пола до потолка:
                </label>
                <div className="text-[10px] text-slate-400">
                  Определяет допустимую высоту верхних шкафов и антресолей
                </div>
              </div>
              <div className="w-32">
                <NumericInput
                  value={roomH}
                  onChange={(val) => setRoomH(val)}
                  min={2000}
                  max={3600}
                  className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl text-center"
                  placeholder="2600"
                />
              </div>
            </div>
          </div>

          {/* Standards: Plinth & Worktop Thickness */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                Высота цоколя:
              </label>
              <select
                value={plinthH}
                onChange={(e) => setPlinthH(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
              >
                <option value={100}>100 мм (стандарт)</option>
                <option value={120}>120 мм</option>
                <option value={150}>150 мм</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                Толщина столешницы:
              </label>
              <select
                value={wtThick}
                onChange={(e) => setWtThick(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
              >
                <option value={38}>38 мм (влагостойкая)</option>
                <option value={28}>28 мм (стандарт)</option>
                <option value={20}>20 мм (компакт-ламинат / камень)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Применить габариты</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

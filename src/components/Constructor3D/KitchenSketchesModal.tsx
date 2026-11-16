import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Plus,
  Trash2,
  MessageSquarePlus,
  Ruler,
  Palette,
  Eye,
  Box,
  Layers,
} from 'lucide-react';
import {
  ConstructorSceneData,
  KitchenModuleItem,
  SketchCalloutItem,
  resolveEffectiveDrawerDepth,
} from './constructorPresets';

interface KitchenSketchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: ConstructorSceneData;
  onUpdateScene: (updater: (prev: ConstructorSceneData) => ConstructorSceneData) => void;
  onUpdateModuleNote: (modId: string, note: string) => void;
}

export type SketchViewMode = 'front' | 'color' | 'no_facades' | 'left' | 'right' | 'top';

export const KitchenSketchesModal: React.FC<KitchenSketchesModalProps> = ({
  isOpen,
  onClose,
  scene,
  onUpdateScene,
  onUpdateModuleNote,
}) => {
  const [viewMode, setViewMode] = useState<SketchViewMode>('front');
  const [activeWall, setActiveWall] = useState<'center' | 'left' | 'right'>('center');
  const [newCalloutText, setNewCalloutText] = useState('');
  const [selectedModForNote, setSelectedModForNote] = useState<string>('');
  const [draggingCalloutId, setDraggingCalloutId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const k = scene.kitchen;
  const mat = scene.materials;
  const plinthH = k.plinthHeight || 100;
  const wtThick = k.worktopThickness || 38;
  const isGlobalGola =
    mat.defaultHandleType === 'gola' || Boolean(k.isGolaProfile);
  const lowerBodyH = isGlobalGola ? 780 : 720;
  const backsplashH = 600;

  const wallLen =
    activeWall === 'left'
      ? k.wallLeftLength || 2000
      : activeWall === 'right'
        ? k.wallRightLength || 2000
        : k.wallCenterLength || 3000;
  const roomH = k.roomHeight || 2600;

  const wallModules = k.modules
    .filter((m) => (m.wall || 'center') === (viewMode === 'top' ? 'center' : activeWall))
    .sort((a, b) => a.positionX - b.positionX);

  const upperWallModules = wallModules.filter(
    (m) => m.category === 'upper' || m.category === 'anthresole'
  );
  const lowerWallModules = wallModules.filter(
    (m) => m.category === 'lower' || m.category === 'tall'
  );

  const callouts: SketchCalloutItem[] = k.sketchCallouts || [];

  const handleAddCallout = () => {
    if (!newCalloutText.trim()) return;
    const targetMod = k.modules.find((m) => m.id === selectedModForNote);
    const defaultX = targetMod ? targetMod.positionX + targetMod.width / 2 : wallLen / 2;
    const defaultY = targetMod
      ? (targetMod.category === 'lower' || targetMod.category === 'tall'
          ? plinthH + targetMod.elevationY
          : targetMod.elevationY) +
        targetMod.height / 2
      : roomH / 2;

    const item: SketchCalloutItem = {
      id: `call-${Date.now()}`,
      wall: viewMode === 'top' ? 'center' : activeWall,
      xMm: Math.round(defaultX),
      yMm: Math.round(defaultY),
      text: newCalloutText.trim(),
    };
    onUpdateScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        sketchCallouts: [...(prev.kitchen.sketchCallouts || []), item],
      },
    }));
    if (targetMod) {
      onUpdateModuleNote(targetMod.id, newCalloutText.trim());
    }
    setNewCalloutText('');
  };

  const handleDeleteCallout = (id: string) => {
    onUpdateScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        sketchCallouts: (prev.kitchen.sketchCallouts || []).filter((c) => c.id !== id),
      },
    }));
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Чертеж_${scene.projectName || 'Кухня'}_${viewMode}_${activeWall}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const win = window.open('', '_blank', 'width=1100,height=850');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Технический чертеж — ${scene.projectName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; color: #0f172a; background: #fff; }
            h2 { margin: 0 0 4px 0; font-size: 18px; }
            .meta { font-size: 11px; color: #475569; margin-bottom: 10px; }
            .notes { margin-top: 12px; font-size: 12px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
            svg { width: 100%; height: auto; max-height: 82vh; }
          </style>
        </head>
        <body>
          <h2>Чертеж эскиза кухни: ${scene.projectName} (${viewMode})</h2>
          <div class="meta">
            Стена: ${wallLen} мм • Выс. помещения: ${roomH} мм • Цоколь: ${plinthH} мм • Столешница: ${wtThick} мм
          </div>
          ${svgStr}
          <div class="notes">
            <strong>Примечание:</strong> ${k.technologistNotes || 'Ошибок не обнаружено.'}
          </div>
          <script>setTimeout(() => { window.print(); }, 300);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // SVG Drawing Offsets
  const padLeft = 260;
  const padRight = 200;
  const padTop = 150;
  const padBottom = 160;
  const svgW = wallLen + padLeft + padRight;
  const svgH = roomH + padTop + padBottom;

  const toSvgX = (xMm: number) => padLeft + xMm;
  const toSvgY = (yMmFromFloor: number) => padTop + (roomH - yMmFromFloor);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 md:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Чертежи и эскизы с габаритными цепочками — {scene.projectName}
              </h3>
              <p className="text-[11px] text-slate-400">
                Петли на отметках 100 мм от краев фасада, цветной вид, каркасы без фасадов и сноски
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Wall Selector if L/U kitchen */}
            {k.layoutType !== 'straight' && viewMode !== 'top' && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                {(
                  [
                    ...(k.layoutType === 'l_left' || k.layoutType === 'u_shape'
                      ? [{ id: 'left' as const, label: 'Левая стена' }]
                      : []),
                    { id: 'center' as const, label: 'Центральная' },
                    ...(k.layoutType === 'l_right' || k.layoutType === 'u_shape'
                      ? [{ id: 'right' as const, label: 'Правая стена' }]
                      : []),
                  ] as const
                ).map((wTab) => (
                  <button
                    key={wTab.id}
                    type="button"
                    onClick={() => setActiveWall(wTab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeWall === wTab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {wTab.label}
                  </button>
                ))}
              </div>
            )}

            {/* View Mode Mode Tabs */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              {(
                [
                  { id: 'front' as const, label: 'Развертка', icon: FileText },
                  { id: 'color' as const, label: 'В цвете', icon: Palette },
                  { id: 'no_facades' as const, label: 'Без фасадов', icon: Eye },
                  { id: 'left' as const, label: 'Слева', icon: Box },
                  { id: 'right' as const, label: 'Справа', icon: Box },
                  { id: 'top' as const, label: 'План сверху', icon: Layers },
                ]
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Скачать SVG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CAD Viewport + Right Side Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100">
          <div className="flex-1 p-3 md:p-5 overflow-auto flex items-center justify-center">
            {viewMode === 'top' ? (
              /* TOP PLAN VIEW SVG */
              <svg
                ref={svgRef}
                viewBox={`0 0 ${ (k.wallCenterLength || 3000) + 300 } 2400`}
                className="w-full h-full max-h-[74vh] bg-white rounded-2xl shadow-lg border border-slate-300"
              >
                <rect
                  x={150}
                  y={150}
                  width={k.wallCenterLength || 3000}
                  height={2000}
                  fill="#f8fafc"
                  stroke="#334155"
                  strokeWidth="4"
                />
                <text
                  x={150 + (k.wallCenterLength || 3000) / 2}
                  y={100}
                  textAnchor="middle"
                  fontSize="42"
                  fontWeight="bold"
                  fill="#0f172a"
                >
                  ПЛАН КУХНИ СВЕРХУ — Стена {k.wallCenterLength} мм
                </text>
                {k.modules
                  .filter((m) => m.category === 'lower' || m.category === 'tall')
                  .map((mod, idx) => {
                    const w = mod.width;
                    const d = mod.category === 'lower' ? 560 : mod.depth;
                    const wall = mod.wall || 'center';
                    let rx = 150 + mod.positionX;
                    let ry = 150;
                    let rw = w;
                    let rh = d;
                    if (wall === 'left') {
                      rx = 150;
                      ry = 150 + mod.positionX;
                      rw = d;
                      rh = w;
                    } else if (wall === 'right') {
                      rx = 150 + (k.wallCenterLength || 3000) - d;
                      ry = 150 + mod.positionX;
                      rw = d;
                      rh = w;
                    }
                    return (
                      <g key={mod.id}>
                        <rect
                          x={rx}
                          y={ry}
                          width={rw}
                          height={rh}
                          fill="#ffffff"
                          stroke="#0f172a"
                          strokeWidth="3.5"
                        />
                        <text
                          x={rx + rw / 2}
                          y={ry + rh / 2 - 8}
                          textAnchor="middle"
                          fontSize="26"
                          fontWeight="bold"
                          fill="#0f172a"
                        >
                          №{idx + 1}. {mod.name}
                        </text>
                        <text
                          x={rx + rw / 2}
                          y={ry + rh / 2 + 24}
                          textAnchor="middle"
                          fontSize="22"
                          fill="#334155"
                        >
                          {mod.width}×{mod.depth} мм
                        </text>
                      </g>
                    );
                  })}
              </svg>
            ) : viewMode === 'left' || viewMode === 'right' ? (
              /* SIDE ELEVATION PROFILE SVG (LEFT OR RIGHT) */
              <svg
                ref={svgRef}
                viewBox="0 0 1400 2800"
                className="w-full h-full max-h-[74vh] bg-white rounded-2xl shadow-lg border border-slate-300"
              >
                <defs>
                  <marker
                    id="arrowSide"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
                  </marker>
                </defs>
                {/* Wall line */}
                <line x1={300} y1={200} x2={300} y2={2600} stroke="#334155" strokeWidth="6" />
                {/* Floor line */}
                <line x1={100} y1={2500} x2={1200} y2={2500} stroke="#334155" strokeWidth="6" />

                <text x={350} y={150} fontSize="42" fontWeight="bold" fill="#0f172a">
                  БОКОВОЙ ПРОФИЛЬ (ВИД {viewMode === 'left' ? 'СЛЕВА' : 'СПРАВА'})
                </text>

                {/* Plinth */}
                <rect x={300} y={2500 - plinthH} width={560 - 80} height={plinthH} fill="#94a3b8" />
                <text x={300 + 150} y={2500 - plinthH / 2 + 8} fontSize="26" fontWeight="bold" fill="#ffffff" textAnchor="middle">
                  Цоколь {plinthH} мм
                </text>

                {/* Lower carcass 512 + gap */}
                <rect
                  x={300}
                  y={2500 - plinthH - lowerBodyH}
                  width={560}
                  height={lowerBodyH}
                  fill={mat.facadeLowerColor || '#ffffff'}
                  stroke="#0f172a"
                  strokeWidth="4"
                />
                <text x={580} y={2500 - plinthH - lowerBodyH / 2} fontSize="28" fontWeight="bold" fill="#0f172a">
                  Нижняя база: {lowerBodyH} мм (Гл. 560)
                </text>

                {/* Worktop 600 mm (+40 mm overhang) */}
                <rect
                  x={300}
                  y={2500 - plinthH - lowerBodyH - wtThick}
                  width={600}
                  height={wtThick}
                  fill={mat.worktopColor || '#e2e8f0'}
                  stroke="#0f172a"
                  strokeWidth="3.5"
                />
                <text x={920} y={2500 - plinthH - lowerBodyH - wtThick / 2 + 8} fontSize="26" fontWeight="bold" fill="#0f172a">
                  Столешница {wtThick} мм (свес +40 мм)
                </text>

                {/* Backsplash 600 mm */}
                <rect
                  x={300}
                  y={2500 - plinthH - lowerBodyH - wtThick - backsplashH}
                  width={16}
                  height={backsplashH}
                  fill="#cbd5e1"
                  stroke="#475569"
                  strokeWidth="2"
                />
                <text x={330} y={2500 - plinthH - lowerBodyH - wtThick - backsplashH / 2} fontSize="26" fill="#475569">
                  Стеновая панель / фартук {backsplashH} мм
                </text>

                {/* Upper cabinet 350 mm */}
                <rect
                  x={300}
                  y={2500 - plinthH - lowerBodyH - wtThick - backsplashH - 720}
                  width={350}
                  height={720}
                  fill={mat.facadeUpperColor || '#ffffff'}
                  stroke="#0f172a"
                  strokeWidth="4"
                />
                <text x={670} y={2500 - plinthH - lowerBodyH - wtThick - backsplashH - 360} fontSize="28" fontWeight="bold" fill="#0f172a">
                  Верхние шкафы: 720 мм (Гл. 350)
                </text>
              </svg>
            ) : (
              /* FRONT ELEVATION, COLOR VIEW OR NO_FACADES VIEW */
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgW} ${svgH}`}
                onMouseMove={(e) => {
                  if (!draggingCalloutId || !svgRef.current) return;
                  const svg = svgRef.current;
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX;
                  pt.y = e.clientY;
                  const ctm = svg.getScreenCTM();
                  if (!ctm) return;
                  const svgP = pt.matrixTransform(ctm.inverse());
                  const c = callouts.find((item) => item.id === draggingCalloutId);
                  if (!c) return;
                  const cx = toSvgX(c.xMm ?? wallLen / 2);
                  const cy = toSvgY(c.yMm ?? roomH / 2);
                  const newDx = Math.round(svgP.x - cx);
                  const newDy = Math.round(svgP.y - cy);
                  onUpdateScene((prev) => ({
                    ...prev,
                    kitchen: {
                      ...prev.kitchen,
                      sketchCallouts: (prev.kitchen.sketchCallouts || []).map((item) =>
                        item.id === draggingCalloutId ? { ...item, labelDx: newDx, labelDy: newDy } : item
                      ),
                    },
                  }));
                }}
                onMouseUp={() => setDraggingCalloutId(null)}
                className="w-full h-full max-h-[74vh] bg-white rounded-2xl shadow-lg border border-slate-300 select-none"
              >
                <defs>
                  <pattern id="cadWallGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#f1f5f9" strokeWidth="1.5" />
                  </pattern>
                  <marker
                    id="arrowRed"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
                  </marker>
                </defs>

                {/* Wall Background */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={wallLen}
                  height={roomH}
                  fill="url(#cadWallGrid)"
                  stroke="#334155"
                  strokeWidth="3"
                />

                {/* Backsplash in work area */}
                {k.hasBacksplash && (
                  <rect
                    x={padLeft}
                    y={toSvgY(plinthH + lowerBodyH + wtThick + backsplashH)}
                    width={wallLen}
                    height={backsplashH}
                    fill={viewMode === 'color' ? mat.backsplashColor || '#e2d8ce' : '#f8fafc'}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />
                )}

                {/* Unified Worktop line */}
                {k.hasUnifiedWorktop && (
                  <rect
                    x={padLeft}
                    y={toSvgY(plinthH + lowerBodyH + wtThick)}
                    width={wallLen}
                    height={wtThick}
                    fill={viewMode === 'color' ? mat.worktopColor || '#d1c4b8' : '#e2e8f0'}
                    stroke="#0f172a"
                    strokeWidth="2.5"
                  />
                )}

                {/* RENDER MODULES */}
                {wallModules.map((mod, idx) => {
                  const isLowerOrTall = mod.category === 'lower' || mod.category === 'tall';
                  const modH =
                    isGlobalGola && mod.category === 'lower' && mod.height === 720
                      ? 780
                      : mod.height;
                  const baseY =
                    mod.fillingType === 'dishwasher'
                      ? 0
                      : isLowerOrTall
                      ? plinthH + mod.elevationY
                      : mod.elevationY;
                  const drawH = mod.fillingType === 'dishwasher' ? plinthH + modH : modH;

                  const x = toSvgX(mod.positionX);
                  const y = toSvgY(baseY + drawH);
                  const w = mod.width;
                  const h = drawH;
                  const isLeftHinge = (mod.hingeSide || 'left') === 'left';

                  // Facade color calculation for 'color' mode
                  const modFacadeColor =
                    mod.customFacadeColor ||
                    (mod.category === 'lower' || mod.category === 'tall'
                      ? mat.facadeLowerColor || '#f5f6f8'
                      : mat.facadeUpperColor || '#ffffff');

                  return (
                    <g key={mod.id}>
                      {/* Outer carcass frame */}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={
                          viewMode === 'color'
                            ? modFacadeColor
                            : viewMode === 'no_facades'
                            ? '#ffffff'
                            : '#ffffff'
                        }
                        stroke="#0f172a"
                        strokeWidth="3.5"
                      />

                      {/* MODE: NO_FACADES (Показываем внутреннее устройство корпуса) */}
                      {viewMode === 'no_facades' ? (
                        <g>
                          {/* Carcass side walls 16 mm */}
                          <rect x={x} y={y} width="8" height={h} fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                          <rect x={x + w - 8} y={y} width="8" height={h} fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                          {/* Bottom & Roof 16 mm */}
                          <rect x={x + 8} y={y + h - 8} width={w - 16} height="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                          <rect x={x + 8} y={y} width={w - 16} height="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

                          {/* Inner Shelves */}
                          {mod.shelvesCount > 0 &&
                            Array.from({ length: mod.shelvesCount }).map((_, sIdx) => {
                              const shelfY = y + ((sIdx + 1) * h) / (mod.shelvesCount + 1);
                              return (
                                <g key={`shelf-${sIdx}`}>
                                  <rect
                                    x={x + 8}
                                    y={shelfY}
                                    width={w - 16}
                                    height="8"
                                    fill="#f1f5f9"
                                    stroke="#475569"
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={x + w / 2}
                                    y={shelfY - 4}
                                    fontSize="16"
                                    fill="#64748b"
                                    textAnchor="middle"
                                  >
                                    Полка №{sIdx + 1}
                                  </text>
                                </g>
                              );
                            })}

                          {/* Inner Drawers Boxes */}
                          {mod.drawersCount > 0 &&
                            Array.from({ length: mod.drawersCount }).map((_, dIdx) => {
                              const boxH = (h - 16) / mod.drawersCount;
                              const boxY = y + 8 + dIdx * boxH;
                              return (
                                <g key={`box-${dIdx}`}>
                                  <rect
                                    x={x + 16}
                                    y={boxY + 6}
                                    width={w - 32}
                                    height={boxH - 12}
                                    fill="#f8fafc"
                                    stroke="#0284c7"
                                    strokeWidth="2"
                                    strokeDasharray="6 4"
                                  />
                                  <text
                                    x={x + w / 2}
                                    y={boxY + boxH / 2 + 5}
                                    fontSize="18"
                                    fontWeight="bold"
                                    fill="#0284c7"
                                    textAnchor="middle"
                                  >
                                    Ящик {resolveEffectiveDrawerDepth(mod.depth, mod.drawerDepth, 500)} мм
                                  </text>
                                </g>
                              );
                            })}
                        </g>
                      ) : (
                        /* MODE: FRONT or COLOR (С фасадами) */
                        <g>
                          {mod.fillingType === 'freestanding_dw' ? (
                            <g>
                              <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
                              <rect x={x + 8} y={y + 8} width={w - 16} height="36" fill="#0f172a" rx="4" />
                              <circle cx={x + 24} cy={y + 26} r="6" fill="#38bdf8" />
                              <rect x={x + w / 2 - 50} y={y + 54} width="100" height="8" fill="#475569" rx="3" />
                            </g>
                          ) : mod.fillingType === 'freestanding_washer' ? (
                            <g>
                              <rect x={x} y={y} width="25" height={h} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
                              <rect x={x + w - 25} y={y} width="25" height={h} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
                              <rect x={x + 25} y={y + 4} width={w - 50} height={h - 8} fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
                              <circle cx={x + w / 2} cy={y + h * 0.55} r={Math.min(100, (w - 100) * 0.42)} fill="#0f172a" stroke="#334155" strokeWidth="4" />
                              <circle cx={x + w / 2} cy={y + h * 0.55} r={Math.min(80, (w - 100) * 0.34)} fill="#38bdf8" opacity="0.6" />
                              <rect x={x + 35} y={y + 16} width="90" height="40" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" rx="3" />
                              <circle cx={x + w / 2 + 50} cy={y + 36} r="14" fill="#0f172a" />
                            </g>
                          ) : mod.fillingType === 'corner_lower' || mod.fillingType === 'upper_corner' || mod.isCorner ? (
                            <g>
                              {(() => {
                                const blindOnRight = (mod.hingeSide || 'right') === 'right';
                                const defaultBlind = mod.category === 'upper' ? 350 : 560;
                                const blindW = Math.max(150, mod.cornerBlindWidth ?? defaultBlind);
                                const fillerW = mod.cornerFillerWidth ?? 50;
                                const facadeW = Math.max(100, w - blindW - fillerW);

                                const blindX = blindOnRight ? x + w - blindW : x;
                                const fillerX = blindOnRight ? x + w - blindW - fillerW : x + blindW;
                                const doorX = blindOnRight ? x : x + blindW + fillerW;

                                const mm100InSvg = (100 / (modH || 720)) * h;
                                const topHingeY = y + Math.max(16, mm100InSvg);
                                const botHingeY = y + h - Math.max(16, mm100InSvg);
                                const hingeXPos = blindOnRight ? doorX + 16 : doorX + facadeW - 16;

                                return (
                                  <>
                                    <rect x={blindX} y={y} width={blindW} height={h} fill="#f1f5f9" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
                                    <text x={blindX + blindW / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="18" fill="#64748b">
                                      Глухая {blindW}мм
                                    </text>
                                    <rect x={fillerX} y={y} width={fillerW} height={h} fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
                                    <rect x={doorX} y={y} width={facadeW} height={h} fill="none" stroke="#0f172a" strokeWidth="3" />
                                    <circle cx={hingeXPos} cy={topHingeY} r="10" fill="#0284c7" stroke="#0369a1" strokeWidth="2.5" />
                                    <circle cx={hingeXPos} cy={botHingeY} r="10" fill="#0284c7" stroke="#0369a1" strokeWidth="2.5" />
                                    <line
                                      x1={blindOnRight ? doorX + facadeW - 20 : doorX + 20}
                                      y1={y + h / 2 - 30}
                                      x2={blindOnRight ? doorX + facadeW - 20 : doorX + 20}
                                      y2={y + h / 2 + 30}
                                      stroke="#1e293b"
                                      strokeWidth="6"
                                      strokeLinecap="round"
                                    />
                                  </>
                                );
                              })()}
                            </g>
                          ) : (
                            <g>
                              {(mod.fillingType === 'doors_2' ||
                                mod.fillingType === 'upper_doors_2' ||
                                mod.fillingType === 'upper_dryer' ||
                                mod.fillingType === 'sink' ||
                                mod.fillingType === 'built_in_washer') && (
                                <line
                                  x1={x + w / 2}
                                  y1={y}
                                  x2={x + w / 2}
                                  y2={y + h}
                                  stroke="#334155"
                                  strokeWidth="2.5"
                                />
                              )}

                              {mod.drawersCount > 0 &&
                                Array.from({ length: mod.drawersCount }).map((_, dIdx) => {
                                  const singleH = h / mod.drawersCount;
                                  const dy = y + dIdx * singleH;
                                  return (
                                    <rect
                                      key={`dgap-${dIdx}`}
                                      x={x + 3}
                                      y={dy + 2}
                                      width={w - 6}
                                      height={singleH - 4}
                                      fill="none"
                                      stroke="#334155"
                                      strokeWidth="2"
                                    />
                                  );
                                })}

                              {mod.drawersCount === 0 && mod.fillingType !== 'dishwasher' && (
                                <g>
                                  {(() => {
                                    const mm100InSvg = (100 / (modH || 720)) * h;
                                    const topHingeY = y + Math.max(20, mm100InSvg);
                                    const botHingeY = y + h - Math.max(20, mm100InSvg);

                                    const renderHingePair = (cx: number, cy: number) => (
                                      <g key={`hinge-${cx}-${cy}`}>
                                        <circle cx={cx} cy={cy} r="16" fill="#0284c7" stroke="#0369a1" strokeWidth="3.5" />
                                        <circle cx={cx} cy={cy} r="6" fill="#ffffff" />
                                      </g>
                                    );

                                    if (
                                      mod.fillingType === 'doors_2' ||
                                      mod.fillingType === 'upper_doors_2' ||
                                      mod.fillingType === 'upper_dryer' ||
                                      mod.fillingType === 'sink'
                                    ) {
                                      return (
                                        <>
                                          {renderHingePair(x + 22, topHingeY)}
                                          {renderHingePair(x + 22, botHingeY)}
                                          {renderHingePair(x + w - 22, topHingeY)}
                                          {renderHingePair(x + w - 22, botHingeY)}
                                        </>
                                      );
                                    } else if (isLeftHinge) {
                                      return (
                                        <>
                                          {renderHingePair(x + 22, topHingeY)}
                                          {renderHingePair(x + 22, botHingeY)}
                                        </>
                                      );
                                    } else {
                                      return (
                                        <>
                                          {renderHingePair(x + w - 22, topHingeY)}
                                          {renderHingePair(x + w - 22, botHingeY)}
                                        </>
                                      );
                                    }
                                  })()}
                                </g>
                              )}

                              {mod.fillingType === 'dishwasher' ? (
                                <rect x={x + 35} y={y + 14} width={w - 70} height="7" fill="#1e293b" rx="2.5" />
                              ) : (
                                <line
                                  x1={isLeftHinge ? x + w - 20 : x + 20}
                                  y1={y + h / 2 - 30}
                                  x2={isLeftHinge ? x + w - 20 : x + 20}
                                  y2={y + h / 2 + 30}
                                  stroke="#1e293b"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                />
                              )}
                            </g>
                          )}

                          {/* Built-in Oven Model in Color/Front */}
                          {mod.hasOven && (
                            <g>
                              <rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} fill="#0f172a" />
                              <rect x={x + 22} y={y + 55} width={w - 44} height={h - 90} fill="#334155" rx="3" />
                              <line x1={x + 22} y1={y + 32} x2={x + w - 22} y2={y + 32} stroke="#94a3b8" strokeWidth="4" />
                            </g>
                          )}
                        </g>
                      )}

                      {/* Legs under lower modules */}
                      {isLowerOrTall && mod.fillingType !== 'dishwasher' && (
                        <g>
                          <rect x={x + 30} y={toSvgY(plinthH)} width={18} height={plinthH} fill="#334155" />
                          <rect x={x + w - 48} y={toSvgY(plinthH)} width={18} height={plinthH} fill="#334155" />
                        </g>
                      )}

                      {/* Module Number Label inside module */}
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        fontSize="32"
                        fontWeight="bold"
                        fill="#0f172a"
                      >
                        №{idx + 1} ({mod.width})
                      </text>
                    </g>
                  );
                })}

                {/* TOP DIMENSION CHAIN WITH LARGE NUMBERS AND SLASH TICKS */}
                {upperWallModules.length > 0 && (
                  <g>
                    <line
                      x1={toSvgX(upperWallModules[0].positionX)}
                      y1={padTop - 45}
                      x2={toSvgX(
                        upperWallModules[upperWallModules.length - 1].positionX +
                          upperWallModules[upperWallModules.length - 1].width
                      )}
                      y2={padTop - 45}
                      stroke="#0f172a"
                      strokeWidth="4"
                    />
                    {upperWallModules.map((m) => {
                      const mx = toSvgX(m.positionX);
                      const mw = m.width;
                      return (
                        <g key={`top-dim-${m.id}`}>
                          {/* Slash ticks / */}
                          <line x1={mx - 10} y1={padTop - 30} x2={mx + 10} y2={padTop - 60} stroke="#0f172a" strokeWidth="4" />
                          <line x1={mx + mw - 10} y1={padTop - 30} x2={mx + mw + 10} y2={padTop - 60} stroke="#0f172a" strokeWidth="4" />
                          <text
                            x={mx + mw / 2}
                            y={padTop - 62}
                            textAnchor="middle"
                            fontSize="52"
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {mw}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* BOTTOM DIMENSION CHAIN WITH LARGE NUMBERS AND SLASH TICKS */}
                {lowerWallModules.length > 0 && (
                  <g>
                    <line
                      x1={toSvgX(lowerWallModules[0].positionX)}
                      y1={padTop + roomH + 50}
                      x2={toSvgX(
                        lowerWallModules[lowerWallModules.length - 1].positionX +
                          lowerWallModules[lowerWallModules.length - 1].width
                      )}
                      y2={padTop + roomH + 50}
                      stroke="#0f172a"
                      strokeWidth="4"
                    />
                    {lowerWallModules.map((m) => {
                      const mx = toSvgX(m.positionX);
                      const mw = m.width;
                      return (
                        <g key={`bot-dim-${m.id}`}>
                          <line x1={mx - 10} y1={padTop + roomH + 35} x2={mx + 10} y2={padTop + roomH + 65} stroke="#0f172a" strokeWidth="4" />
                          <line x1={mx + mw - 10} y1={padTop + roomH + 35} x2={mx + mw + 10} y2={padTop + roomH + 65} stroke="#0f172a" strokeWidth="4" />
                          <text
                            x={mx + mw / 2}
                            y={padTop + roomH + 104}
                            textAnchor="middle"
                            fontSize="54"
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {mw}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* LEFT VERTICAL HEIGHT DIMENSION CHAIN WITH LARGE NUMBERS */}
                <g>
                  <line
                    x1={padLeft - 50}
                    y1={toSvgY(0)}
                    x2={padLeft - 50}
                    y2={toSvgY(plinthH + lowerBodyH + wtThick + backsplashH + 720)}
                    stroke="#0f172a"
                    strokeWidth="4"
                  />
                  {/* Plinth tick */}
                  <line x1={padLeft - 65} y1={toSvgY(plinthH)} x2={padLeft - 35} y2={toSvgY(plinthH)} stroke="#0f172a" strokeWidth="4" />
                  <text x={padLeft - 75} y={toSvgY(plinthH / 2) + 14} textAnchor="end" fontSize="44" fontWeight="bold" fill="#0f172a">
                    {plinthH}
                  </text>

                  {/* Lower body tick */}
                  <line x1={padLeft - 65} y1={toSvgY(plinthH + lowerBodyH)} x2={padLeft - 35} y2={toSvgY(plinthH + lowerBodyH)} stroke="#0f172a" strokeWidth="4" />
                  <text x={padLeft - 75} y={toSvgY(plinthH + lowerBodyH / 2) + 14} textAnchor="end" fontSize="48" fontWeight="bold" fill="#0f172a">
                    {lowerBodyH}
                  </text>

                  {/* Worktop tick */}
                  <line x1={padLeft - 65} y1={toSvgY(plinthH + lowerBodyH + wtThick)} x2={padLeft - 35} y2={toSvgY(plinthH + lowerBodyH + wtThick)} stroke="#0f172a" strokeWidth="4" />
                  <text x={padLeft - 75} y={toSvgY(plinthH + lowerBodyH + wtThick / 2) + 12} textAnchor="end" fontSize="38" fontWeight="bold" fill="#0f172a">
                    {wtThick}
                  </text>

                  {/* Backsplash tick */}
                  <line x1={padLeft - 65} y1={toSvgY(plinthH + lowerBodyH + wtThick + backsplashH)} x2={padLeft - 35} y2={toSvgY(plinthH + lowerBodyH + wtThick + backsplashH)} stroke="#0f172a" strokeWidth="4" />
                  <text x={padLeft - 75} y={toSvgY(plinthH + lowerBodyH + wtThick + backsplashH / 2) + 14} textAnchor="end" fontSize="48" fontWeight="bold" fill="#0f172a">
                    {backsplashH}
                  </text>
                </g>

                {/* Technologist Callout Pointer Arrows (Draggable) */}
                {callouts
                  .filter((c) => c.wall === activeWall)
                  .map((c, i) => {
                    const cx = toSvgX(c.xMm);
                    const cy = toSvgY(c.yMm);
                    const labelX = cx + (c.labelDx ?? 90);
                    const labelY = cy + (c.labelDy ?? -45);
                    const boxW = Math.max(260, c.text.length * 16 + 40);
                    return (
                      <g
                        key={c.id}
                        className="cursor-move select-none"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingCalloutId(c.id);
                        }}
                      >
                        <line
                          x1={labelX - 10}
                          y1={labelY + 16}
                          x2={cx}
                          y2={cy}
                          stroke="#dc2626"
                          strokeWidth="3.5"
                          markerEnd="url(#arrowRed)"
                        />
                        <rect
                          x={labelX - 5}
                          y={labelY - 24}
                          width={boxW}
                          height="52"
                          rx="10"
                          fill="#fef2f2"
                          stroke="#dc2626"
                          strokeWidth="3"
                          className="shadow-md"
                        />
                        <text x={labelX + 12} y={labelY + 10} fontSize="24" fontWeight="bold" fill="#991b1b">
                          [{i + 1}] {c.text}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            )}
          </div>

          {/* Right Control Sidebar: Add Callouts & Technologist Notes */}
          <div className="w-full lg:w-96 border-l border-slate-200 bg-white p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-amber-600" />
                <span>Добавить стрелку-сноску на чертеж</span>
              </div>
              <select
                value={selectedModForNote}
                onChange={(e) => setSelectedModForNote(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-semibold"
              >
                <option value="">По центру стены (общая сноска)</option>
                {wallModules.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    К модулю №{i + 1}: {m.name} ({m.width} мм)
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCalloutText}
                  onChange={(e) => setNewCalloutText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCallout()}
                  placeholder="Укажите замечание со стрелкой..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddCallout}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            {callouts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  Сноски со стрелками ({callouts.length})
                </div>
                {callouts.map((c, i) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-rose-950">
                      <b>[{i + 1}]</b> {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCallout(c.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* General Technologist Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Примечание к проекту:</span>
              </label>
              <textarea
                rows={4}
                value={k.technologistNotes || ''}
                onChange={(e) =>
                  onUpdateScene((prev) => ({
                    ...prev,
                    kitchen: {
                      ...prev.kitchen,
                      technologistNotes: e.target.value,
                    },
                  }))
                }
                placeholder="Впишите особенности замера, выводы коммуникаций, подрезки..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white font-medium"
              />
            </div>

            {/* Specification List */}
            <div className="space-y-1.5 flex-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Спецификация модулей ({wallModules.length})
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {wallModules.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1"
                  >
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>
                        №{idx + 1}. {m.name}
                      </span>
                      <span className="font-mono text-amber-800">
                        {m.width}×{m.height}×{m.depth}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={m.technologistNote || ''}
                      onChange={(e) => onUpdateModuleNote(m.id, e.target.value)}
                      placeholder="Пометка к модулю..."
                      className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

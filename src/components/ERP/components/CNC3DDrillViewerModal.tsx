import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  X, RotateCcw, ZoomIn, ZoomOut, Eye, Layers, FileCode, Upload,
  CheckCircle2, AlertCircle, Info, Sparkles, Sliders, Cpu, Compass, Maximize2
} from 'lucide-react';
import { CNCDrillPattern, CNCDrillHole, parseCNCFile, generatePatternForDetail } from '../utils/cncParser';

interface CNC3DDrillViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmComplete?: () => void; // 2nd scan or manual confirmation
  detail: any; // BirkaDetail or OrderDetail
  orderNumber?: string;
  orderTitle?: string;
  stageName?: string;
  cncFileText?: string;
  cncFileName?: string;
  onUploadCNCFile?: (file: File) => void;
}

export const CNC3DDrillViewerModal: React.FC<CNC3DDrillViewerModalProps> = ({
  isOpen,
  onClose,
  onConfirmComplete,
  detail,
  orderNumber = '',
  orderTitle = '',
  stageName = 'Присадка / ЧПУ',
  cncFileText,
  cncFileName,
  onUploadCNCFile
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [activeView, setActive3DView] = useState<'3d' | 'top' | 'bottom' | 'front' | 'side'>('3d');
  const [selectedHole, setSelectedHole] = useState<CNCDrillHole | null>(null);
  const [showRawCodeTab, setShowRawCodeTab] = useState(false);
  const [activeFaceFilter, setActiveFaceFilter] = useState<'all' | 'A' | 'B' | 'edges'>('all');

  // Compute or Parse Drill Pattern
  const pattern: CNCDrillPattern = useMemo(() => {
    if (!detail) return generatePatternForDetail({});
    if (cncFileText) {
      return parseCNCFile(cncFileText, cncFileName || `${detail.name}.nc`);
    }
    return generatePatternForDetail(detail);
  }, [detail, cncFileText, cncFileName]);

  // Handle Three.js 3D Canvas Initialization & Rendering
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Dark Slate Background
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    cameraRef.current = camera;

    // Position camera to fit the panel
    const maxDim = Math.max(pattern.length, pattern.width, pattern.thickness);
    camera.position.set(pattern.length * 0.5, pattern.width * 1.2, maxDim * 1.8);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(pattern.length / 2, pattern.width / 2, pattern.thickness / 2);
    controls.update();
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(pattern.length * 1.5, pattern.width * 2, pattern.thickness * 10);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-pattern.length, -pattern.width, -pattern.thickness * 5);
    scene.add(dirLight2);

    // 6. Grid Ground Helper
    const gridHelper = new THREE.GridHelper(Math.max(pattern.length, pattern.width) * 2.5, 40, 0x334155, 0x1e293b);
    gridHelper.position.set(pattern.length / 2, -5, pattern.width / 2);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // 7. Render LDSP / MDF Panel (Main Board)
    const panelGeo = new THREE.BoxGeometry(pattern.length, pattern.thickness, pattern.width);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xded5c6, // Realistic Birch / Light Wood
      roughness: 0.6,
      metalness: 0.1
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    panelMesh.position.set(pattern.length / 2, pattern.thickness / 2, pattern.width / 2);
    panelMesh.receiveShadow = true;
    panelMesh.castShadow = true;
    scene.add(panelMesh);

    // 8. Render Edging Side Strips (L1, L2, W1, W2) with distinct colors
    const edgeThickness = 2.0; // Visual thickness for 3D clarity
    const edgeColors = {
      L1: 0x10b981, // Emerald Green
      L2: 0x059669, // Dark Emerald
      W1: 0x3b82f6, // Blue
      W2: 0x2563eb  // Dark Blue
    };

    // Edge L1 (Front Length y=0)
    if (pattern.edges.L1?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(pattern.length, pattern.thickness + 0.2, edgeThickness);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.L1, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(pattern.length / 2, pattern.thickness / 2, -edgeThickness / 2);
      scene.add(eMesh);
    }
    // Edge L2 (Back Length y=width)
    if (pattern.edges.L2?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(pattern.length, pattern.thickness + 0.2, edgeThickness);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.L2, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(pattern.length / 2, pattern.thickness / 2, pattern.width + edgeThickness / 2);
      scene.add(eMesh);
    }
    // Edge W1 (Left Width x=0)
    if (pattern.edges.W1?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(edgeThickness, pattern.thickness + 0.2, pattern.width);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.W1, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(-edgeThickness / 2, pattern.thickness / 2, pattern.width / 2);
      scene.add(eMesh);
    }
    // Edge W2 (Right Width x=length)
    if (pattern.edges.W2?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(edgeThickness, pattern.thickness + 0.2, pattern.width);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.W2, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(pattern.length + edgeThickness / 2, pattern.thickness / 2, pattern.width / 2);
      scene.add(eMesh);
    }

    // 9. Render Holes in 3D
    const getHoleColor = (d: number, face: string) => {
      if (face === 'top' || face === 'bottom' || face === 'left' || face === 'right') return 0xef4444; // Red for Edge holes
      if (d <= 5) return 0x10b981;  // 5mm Green
      if (d <= 8) return 0x3b82f6;  // 8mm Blue
      if (d <= 15) return 0xf97316; // 15mm Orange
      return 0xa855f7;              // 35mm Purple
    };

    pattern.holes.forEach(hole => {
      const isSelected = selectedHole?.id === hole.id;
      const radius = Math.max(1.5, hole.diameter / 2);
      const depth = Math.min(pattern.thickness + 2, hole.z || 12);

      const holeGeo = new THREE.CylinderGeometry(radius, radius, depth, 24);
      const holeColor = isSelected ? 0xffea00 : getHoleColor(hole.diameter, hole.face);
      const holeMat = new THREE.MeshStandardMaterial({
        color: holeColor,
        roughness: 0.2,
        metalness: 0.3,
        emissive: isSelected ? 0x665200 : 0x000000
      });

      const holeMesh = new THREE.Mesh(holeGeo, holeMat);

      // Positioning according to face
      if (hole.face === 'B') {
        // Plast B (Bottom face)
        holeMesh.position.set(hole.x, -depth / 2 + 1, hole.y);
      } else if (hole.face === 'top') {
        // Top Edge (y = width)
        holeMesh.position.set(hole.x, pattern.thickness / 2, pattern.width - depth / 2);
        holeMesh.rotation.x = Math.PI / 2;
      } else if (hole.face === 'bottom') {
        // Bottom Edge (y = 0)
        holeMesh.position.set(hole.x, pattern.thickness / 2, depth / 2);
        holeMesh.rotation.x = Math.PI / 2;
      } else if (hole.face === 'left') {
        // Left Edge (x = 0)
        holeMesh.position.set(depth / 2, pattern.thickness / 2, hole.y);
        holeMesh.rotation.z = Math.PI / 2;
      } else if (hole.face === 'right') {
        // Right Edge (x = length)
        holeMesh.position.set(pattern.length - depth / 2, pattern.thickness / 2, hole.y);
        holeMesh.rotation.z = Math.PI / 2;
      } else {
        // Plast A (Top face - default)
        holeMesh.position.set(hole.x, pattern.thickness + depth / 2 - 1, hole.y);
      }

      scene.add(holeMesh);
    });

    // 10. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [isOpen, pattern, selectedHole]);

  // Projection View Preset Switcher
  const handleSetView = (view: '3d' | 'top' | 'bottom' | 'front' | 'side') => {
    setActive3DView(view);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const target = new THREE.Vector3(pattern.length / 2, pattern.thickness / 2, pattern.width / 2);
    controls.target.copy(target);

    const dist = Math.max(pattern.length, pattern.width) * 1.5;

    if (view === 'top') {
      camera.position.set(target.x, target.y + dist, target.z + 0.001);
    } else if (view === 'bottom') {
      camera.position.set(target.x, target.y - dist, target.z + 0.001);
    } else if (view === 'front') {
      camera.position.set(target.x, target.y, target.z + dist);
    } else if (view === 'side') {
      camera.position.set(target.x + dist, target.y, target.z);
    } else {
      camera.position.set(pattern.length * 0.5, pattern.width * 1.2, dist);
    }
    controls.update();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden text-white">

        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold border border-indigo-500/30">
                  {stageName}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold border border-amber-500/30">
                  1-й Скан: Схема Присадки
                </span>
                {orderNumber && (
                  <span className="text-xs text-slate-400 font-mono">
                    Заказ №{orderNumber}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                Деталь №{detail?.labelNumber || detail?.position || '1'} «{detail?.name || 'Панель'}»
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">

          {/* Left / Top 3D Canvas Area */}
          <div className="lg:col-span-3 flex flex-col bg-slate-950 relative min-h-[380px] lg:min-h-0">

            {/* 3D WebGL Canvas Mounting Container */}
            <div ref={mountRef} className="w-full flex-1 relative cursor-grab active:cursor-grabbing" />

            {/* Top Overlay Projection Switcher */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg">
              <button
                onClick={() => handleSetView('3d')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === '3d' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                3D Обзор
              </button>
              <button
                onClick={() => handleSetView('top')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'top' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Пласть A (Верх)
              </button>
              <button
                onClick={() => handleSetView('bottom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'bottom' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Пласть B (Низ)
              </button>
              <button
                onClick={() => handleSetView('front')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'front' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Торцы L
              </button>
            </div>

            {/* Bottom Overlay Edging Indicator Bar */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Габариты:</span>
                <span className="text-emerald-400 font-bold">{pattern.length} × {pattern.width} × {pattern.thickness} мм</span>
                <span className="text-slate-500">•</span>
                <span className="text-indigo-400 font-bold">Отверстий: {pattern.holes.length} шт</span>
              </div>

              {/* Edging Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-bold">Кромление:</span>
                {Object.entries(pattern.edges).map(([key, edge]) => (
                  <span
                    key={key}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
                      edge.hasEdge
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border-slate-700 line-through opacity-60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: edge.color }} />
                    <span>{key}: {edge.thickness}мм</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Pattern Details, Tools & Scan Guidance */}
          <div className="p-4 sm:p-6 bg-slate-900 border-l border-slate-800 flex flex-col gap-4 overflow-y-auto max-h-[500px] lg:max-h-none">

            {/* Instruction Notice for Operator */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                <Compass className="w-4 h-4" />
                <span>Инструкция сверловщика:</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-100/90">
                1. Ориентируйтесь по подсвеченным сторонам <strong>кромления (L1, L2, W1, W2)</strong> при укладке на стол станка.
                <br />
                2. Для зачета детали в списке отсканируйте бирку <strong>второй раз</strong> или нажмите зеленую кнопку внизу.
              </p>
            </div>

            {/* Drilling Diameter Legend */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Легенда сверлений (Диаметры):
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span>⌀5 мм (Конфирмат)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <span>⌀8 мм (Шкант)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <span>⌀15 мм (Эксцентрик)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                  <span>⌀35 мм (Петля)</span>
                </div>
              </div>
            </div>

            {/* Holes List / Selected Hole Card */}
            <div className="flex-1 space-y-2 min-h-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Список отверстий ({pattern.holes.length}):</span>
              </div>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {pattern.holes.map((hole, idx) => {
                  const isSel = selectedHole?.id === hole.id;
                  return (
                    <button
                      key={hole.id}
                      onClick={() => setSelectedHole(isSel ? null : hole)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-white">#{idx + 1} ⌀{hole.diameter}мм</span>
                        <span className="text-slate-400 text-[11px] block">X:{hole.x} Y:{hole.y} Z:{hole.z}мм</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-indigo-300 border border-slate-700">
                        Пласть {hole.face}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CNC File Upload / Status */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Файл УП ЧПУ:</span>
                <span className="text-indigo-400 font-mono text-[11px] truncate max-w-[140px]">
                  {cncFileName || `${detail?.name || 'деталь'}.nc`}
                </span>
              </div>

              {onUploadCNCFile && (
                <label className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Загрузить G-Код / .nc / .mpr</span>
                  <input
                    type="file"
                    accept="*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && onUploadCNCFile) onUploadCNCFile(f);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 2nd Scan / Confirm Completion Button */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  if (onConfirmComplete) onConfirmComplete();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Подтвердить и закрыть [2-й скан]</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

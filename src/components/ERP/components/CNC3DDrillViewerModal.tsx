import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  X, RotateCcw, ZoomIn, ZoomOut, Eye, Layers, FileCode, Upload,
  CheckCircle2, AlertCircle, Info, Sparkles, Sliders, Cpu, Compass, Maximize2, Filter
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
  showOnlyEdgeHolesDefault?: boolean;
  onUploadCNCFile?: (file: File) => void;
}

/**
 * Classifies whether a hole goes into the edge face (торец) or flat face (пласть A/B)
 */
export function classifyHoleFace(
  hole: CNCDrillHole,
  patternWidth: number,
  patternLength: number
): 'A' | 'B' | 'top' | 'bottom' | 'left' | 'right' {
  if (['top', 'bottom', 'left', 'right'].includes(hole.face)) {
    return hole.face as 'top' | 'bottom' | 'left' | 'right';
  }
  if (hole.face === ('L1' as any)) return 'bottom';
  if (hole.face === ('L2' as any)) return 'top';
  if (hole.face === ('W1' as any)) return 'left';
  if (hole.face === ('W2' as any)) return 'right';

  if (hole.toolId === 'T101' || hole.toolId === 'T105') return 'left';
  if (hole.toolId === 'T102' || hole.toolId === 'T106') return 'right';
  if (hole.toolId === 'T103') return 'top';
  if (hole.toolId === 'T104') return 'bottom';

  // Coordinate-based edge detection
  if (hole.y <= 5) return 'bottom'; // L1
  if (hole.y >= patternWidth - 5) return 'top'; // L2
  if (hole.x <= 5) return 'left'; // W1
  if (hole.x >= patternLength - 5) return 'right'; // W2

  return hole.face === 'B' ? 'B' : 'A';
}

interface Bazis2DBlueprintSvgProps {
  pattern: CNCDrillPattern;
  selectedHole: CNCDrillHole | null;
  onSelectHole: (hole: CNCDrillHole | null) => void;
}

export const Bazis2DBlueprintSvg: React.FC<Bazis2DBlueprintSvgProps> = ({
  pattern,
  selectedHole,
  onSelectHole
}) => {
  const pLength = pattern.length || 800;
  const pWidth = pattern.width || 400;
  const pThick = pattern.thickness || 16;

  // SVG Padding for Dimension Chains (L, W) and Edge Badges
  const padX = 120;
  const padY = 100;
  const svgW = pLength + padX * 2;
  const svgH = pWidth + padY * 2;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 p-2 sm:p-4 relative overflow-hidden select-none">
      <div className="flex-1 w-full h-full flex items-center justify-center min-h-[360px]">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full max-h-[580px] object-contain drop-shadow-2xl"
        >
          {/* Background CAD Grid & Arrow Markers */}
          <defs>
            <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          <rect width={svgW} height={svgH} fill="#0b1120" rx="16" />
          <rect width={svgW} height={svgH} fill="url(#cadGrid)" rx="16" />

          {/* Main Board Panel Rectangle (White CAD Board) */}
          <rect
            x={padX}
            y={padY}
            width={pLength}
            height={pWidth}
            fill="#f8fafc"
            stroke="#0f172a"
            strokeWidth="3.5"
            rx="2"
          />

          {/* Edging Lines (L1, L2, W1, W2) */}
          {/* L1 - Bottom Length (Front y=0) */}
          <line
            x1={padX} y1={padY + pWidth}
            x2={padX + pLength} y2={padY + pWidth}
            stroke={pattern.edges.L1?.hasEdge ? '#10b981' : '#64748b'}
            strokeWidth={pattern.edges.L1?.hasEdge ? 8 : 1.5}
            strokeDasharray={pattern.edges.L1?.hasEdge ? 'none' : '6,4'}
          />
          {/* L2 - Top Length (Back y=width) */}
          <line
            x1={padX} y1={padY}
            x2={padX + pLength} y2={padY}
            stroke={pattern.edges.L2?.hasEdge ? '#059669' : '#64748b'}
            strokeWidth={pattern.edges.L2?.hasEdge ? 8 : 1.5}
            strokeDasharray={pattern.edges.L2?.hasEdge ? 'none' : '6,4'}
          />
          {/* W1 - Left Width (x=0) */}
          <line
            x1={padX} y1={padY}
            x2={padX} y2={padY + pWidth}
            stroke={pattern.edges.W1?.hasEdge ? '#3b82f6' : '#64748b'}
            strokeWidth={pattern.edges.W1?.hasEdge ? 8 : 1.5}
            strokeDasharray={pattern.edges.W1?.hasEdge ? 'none' : '6,4'}
          />
          {/* W2 - Right Width (x=length) */}
          <line
            x1={padX + pLength} y1={padY}
            x2={padX + pLength} y2={padY + pWidth}
            stroke={pattern.edges.W2?.hasEdge ? '#2563eb' : '#64748b'}
            strokeWidth={pattern.edges.W2?.hasEdge ? 8 : 1.5}
            strokeDasharray={pattern.edges.W2?.hasEdge ? 'none' : '6,4'}
          />

          {/* Dimension Lines L (Length Top) */}
          <line x1={padX} y1={padY} x2={padX} y2={padY - 55} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={padX + pLength} y1={padY} x2={padX + pLength} y2={padY - 55} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={padX} y1={padY - 42} x2={padX + pLength} y2={padY - 42} stroke="#38bdf8" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={padX + pLength / 2} y={padY - 50} fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            L = {pLength} мм
          </text>

          {/* Dimension Lines W (Width Left) */}
          <line x1={padX} y1={padY} x2={padX - 55} y2={padY} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={padX} y1={padY + pWidth} x2={padX - 55} y2={padY + pWidth} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={padX - 42} y1={padY} x2={padX - 42} y2={padY + pWidth} stroke="#38bdf8" strokeWidth="1.5" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={padX - 52} y={padY + pWidth / 2} fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace" transform={`rotate(-90, ${padX - 52}, ${padY + pWidth / 2})`}>
            W = {pWidth} мм
          </text>

          {/* Reference Axis (0,0) Marker at Bottom-Left */}
          <g transform={`translate(${padX}, ${padY + pWidth})`}>
            <circle r="5" fill="#ef4444" />
            <text x="-16" y="22" fill="#ef4444" fontSize="12" fontWeight="extrabold" fontFamily="monospace">(0,0)</text>
          </g>

          {/* Render Holes (Plast A, Plast B, Edge Holes) */}
          {pattern.holes.map((hole) => {
            const isSel = selectedHole?.id === hole.id;
            const cx = padX + hole.x;
            const cy = padY + (pWidth - hole.y); // Invert Y for SVG
            const r = Math.max(4, Math.min(18, hole.diameter / 2 * 1.2));

            const actualFace = classifyHoleFace(hole, pWidth, pLength);
            const isEdge = ['top', 'bottom', 'left', 'right'].includes(actualFace);
            const isThrough = hole.z >= pThick || (hole.face === 'A' && hole.z >= pThick - 0.5);

            if (isEdge) {
              // Edge Hole (Сверление в торец): Entry point on edge border + Dashed drill line into edge face
              let ex = cx, ey = cy;
              let targetDx = 0, targetDy = 0;
              let edgeLabel = 'ТО Р Е Ц';
              const depthPx = Math.min(60, Math.max(25, (hole.z || 30) * 1.2));

              if (actualFace === 'bottom') { ey = padY + pWidth; targetDy = -depthPx; edgeLabel = 'ТО Р Е Ц L1'; }
              else if (actualFace === 'top') { ey = padY; targetDy = depthPx; edgeLabel = 'ТО Р Е Ц L2'; }
              else if (actualFace === 'left') { ex = padX; targetDx = depthPx; edgeLabel = 'ТО Р Е Ц W1'; }
              else if (actualFace === 'right') { ex = padX + pLength; targetDx = -depthPx; edgeLabel = 'ТО Р Е Ц W2'; }

              return (
                <g key={hole.id} onClick={() => onSelectHole(isSel ? null : hole)} className="cursor-pointer">
                  {/* Dashed drill depth line extending into the edge face */}
                  <line
                    x1={ex}
                    y1={ey}
                    x2={ex + targetDx}
                    y2={ey + targetDy}
                    stroke={isSel ? '#ffea00' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray="5,3"
                  />

                  {/* Outer Entry Ring Dot on Edge Border Line */}
                  <circle
                    cx={ex}
                    cy={ey}
                    r="6"
                    fill={isSel ? '#ffea00' : '#f43f5e'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* Selection Ring */}
                  {isSel && (
                    <circle cx={ex} cy={ey} r={14} fill="none" stroke="#ffea00" strokeWidth="2.5" strokeDasharray="3,3" className="animate-pulse" />
                  )}

                  {/* Unambiguous Badge for Edge Hole */}
                  <g transform={`translate(${ex + targetDx / 2}, ${ey + targetDy / 2})`}>
                    <rect
                      x="-38"
                      y="-11"
                      width="76"
                      height="22"
                      rx="6"
                      fill={isSel ? '#f59e0b' : '#be123c'}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {edgeLabel} ⌀{hole.diameter}x{hole.z}
                    </text>
                  </g>
                </g>
              );
            }

            const isFaceB = actualFace === 'B';

            return (
              <g key={hole.id} onClick={() => onSelectHole(isSel ? null : hole)} className="cursor-pointer">
                {/* Selection Highlight Ring */}
                {isSel && (
                  <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="#ffea00" strokeWidth="3" className="animate-pulse" />
                )}

                {/* Projection Lines to Reference Axes when selected */}
                {isSel && (
                  <>
                    <line x1={cx} y1={cy} x2={padX} y2={cy} stroke="#ffea00" strokeWidth="1.5" strokeDasharray="3,3" />
                    <line x1={cx} y1={cy} x2={cx} y2={padY + pWidth} stroke="#ffea00" strokeWidth="1.5" strokeDasharray="3,3" />
                    <text x={(padX + cx) / 2} y={cy - 6} fill="#ffea00" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      X={hole.x}
                    </text>
                    <text x={cx + 10} y={(cy + padY + pWidth) / 2} fill="#ffea00" fontSize="11" fontWeight="bold" fontFamily="monospace">
                      Y={hole.y}
                    </text>
                  </>
                )}

                {/* Hole Circle Body */}
                {isThrough ? (
                  // Through Hole (Сквозное): Double concentric dark ring
                  <>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r + 2}
                      fill={isSel ? '#ffea00' : '#1e293b'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r - 2}
                      fill="#090d16"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                  </>
                ) : (
                  // Blind Hole (Глухое)
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isFaceB ? 'none' : (isSel ? '#ffea00' : '#0284c7')}
                    stroke={isFaceB ? '#f59e0b' : '#0f172a'}
                    strokeWidth={isFaceB ? 2.5 : 1.5}
                    strokeDasharray={isFaceB ? '4,2' : 'none'}
                    opacity={isFaceB ? 0.9 : 0.95}
                  />
                )}

                {/* Center Crosshair + or x */}
                <line x1={cx - r / 1.6} y1={cy} x2={cx + r / 1.6} y2={cy} stroke={isThrough ? '#38bdf8' : (isFaceB ? '#f59e0b' : '#ffffff')} strokeWidth="1.2" />
                <line x1={cx} y1={cy - r / 1.6} x2={cx} y2={cy + r / 1.6} stroke={isThrough ? '#38bdf8' : (isFaceB ? '#f59e0b' : '#ffffff')} strokeWidth="1.2" />

                {/* Hole Diameter Label */}
                <text x={cx + r + 4} y={cy + 4} fill={isSel ? '#ffea00' : (isThrough ? '#0284c7' : '#0f172a')} fontSize="10" fontWeight="extrabold" fontFamily="monospace">
                  ⌀{hole.diameter}{isThrough ? ' (Сквозное)' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Blueprint Legend Bar */}
      <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-300 font-mono shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-600 border border-slate-900" />
            <span>Пласть А (Лицевая)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-transparent" />
            <span>Пласть B (Обратная)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-900 border-2 border-sky-400" />
            <span className="text-sky-300 font-bold">Сквозное</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">ТО Р Е Ц</span>
            <span className="text-rose-400 font-bold">В торец (L1, L2, W1, W2)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          💡 Нажмите на любое отверстие, чтобы подсветить координаты X, Y
        </div>
      </div>
    </div>
  );
};

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
  showOnlyEdgeHolesDefault = false,
  onUploadCNCFile
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [activeView, setActive3DView] = useState<'3d' | 'top' | 'bottom' | 'front' | 'side'>('3d');
  const [mainDisplayMode, setMainDisplayMode] = useState<'3d' | '2d_cad'>('3d');
  const [onlyEdgeHolesFilter, setOnlyEdgeHolesFilter] = useState<boolean>(showOnlyEdgeHolesDefault);
  const [selectedHole, setSelectedHole] = useState<CNCDrillHole | null>(null);

  // Compute or Parse Drill Pattern
  const pattern: CNCDrillPattern = useMemo(() => {
    if (!detail) return generatePatternForDetail({});
    if (cncFileText) {
      return parseCNCFile(cncFileText, cncFileName || `${detail.name}.nc`);
    }
    return generatePatternForDetail(detail);
  }, [detail, cncFileText, cncFileName]);

  // Filtered Drill Pattern (All vs Only Edge Holes)
  const displayPattern: CNCDrillPattern = useMemo(() => {
    if (!onlyEdgeHolesFilter) return pattern;

    const edgeHoles = pattern.holes.filter(h => {
      const face = classifyHoleFace(h, pattern.width, pattern.length);
      return ['top', 'bottom', 'left', 'right'].includes(face);
    });

    return {
      ...pattern,
      holes: edgeHoles
    };
  }, [pattern, onlyEdgeHolesFilter]);

  // Handle Three.js 3D Canvas Initialization & Rendering
  useEffect(() => {
    if (!isOpen || mainDisplayMode !== '3d' || !mountRef.current) return;

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
    const maxDim = Math.max(displayPattern.length, displayPattern.width, displayPattern.thickness);
    camera.position.set(displayPattern.length * 0.5, displayPattern.width * 1.2, maxDim * 1.8);

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
    controls.target.set(displayPattern.length / 2, displayPattern.thickness / 2, displayPattern.width / 2);
    controls.update();
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(displayPattern.length * 1.5, displayPattern.width * 2, displayPattern.thickness * 10);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-displayPattern.length, -displayPattern.width, -displayPattern.thickness * 5);
    scene.add(dirLight2);

    // 6. Grid Ground Helper (Flat on Floor X-Z plane under panel)
    const gridHelper = new THREE.GridHelper(Math.max(displayPattern.length, displayPattern.width) * 2.5, 40, 0x475569, 0x1e293b);
    gridHelper.position.set(displayPattern.length / 2, -1, displayPattern.width / 2);
    scene.add(gridHelper);

    // 7. Render LDSP / MDF Panel (Main Board - Clean Crisp White)
    const panelGeo = new THREE.BoxGeometry(displayPattern.length, displayPattern.thickness, displayPattern.width);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pure Crisp White Laminated Board
      roughness: 0.2,
      metalness: 0.05
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    panelMesh.position.set(displayPattern.length / 2, displayPattern.thickness / 2, displayPattern.width / 2);
    panelMesh.receiveShadow = true;
    panelMesh.castShadow = true;
    scene.add(panelMesh);

    // Add subtle dark CAD contour edges around white detail for sharp contrast
    const edgesGeo = new THREE.EdgesGeometry(panelGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
    panelMesh.add(edgesLine);

    // 8. Render Edging Side Strips (L1, L2, W1, W2) with distinct colors
    const edgeThickness = 2.0; // Visual thickness for 3D clarity
    const edgeColors = {
      L1: 0x10b981, // Emerald Green
      L2: 0x059669, // Dark Emerald
      W1: 0x3b82f6, // Blue
      W2: 0x2563eb  // Dark Blue
    };

    // Edge L1 (Front Length y=0)
    if (displayPattern.edges.L1?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(displayPattern.length, displayPattern.thickness + 0.2, edgeThickness);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.L1, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(displayPattern.length / 2, displayPattern.thickness / 2, -edgeThickness / 2);
      scene.add(eMesh);
    }
    // Edge L2 (Back Length y=width)
    if (displayPattern.edges.L2?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(displayPattern.length, displayPattern.thickness + 0.2, edgeThickness);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.L2, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(displayPattern.length / 2, displayPattern.thickness / 2, displayPattern.width + edgeThickness / 2);
      scene.add(eMesh);
    }
    // Edge W1 (Left Width x=0)
    if (displayPattern.edges.W1?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(edgeThickness, displayPattern.thickness + 0.2, displayPattern.width);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.W1, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(-edgeThickness / 2, displayPattern.thickness / 2, displayPattern.width / 2);
      scene.add(eMesh);
    }
    // Edge W2 (Right Width x=length)
    if (displayPattern.edges.W2?.hasEdge) {
      const eGeo = new THREE.BoxGeometry(edgeThickness, displayPattern.thickness + 0.2, displayPattern.width);
      const eMat = new THREE.MeshStandardMaterial({ color: edgeColors.W2, roughness: 0.3 });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(displayPattern.length + edgeThickness / 2, displayPattern.thickness / 2, displayPattern.width / 2);
      scene.add(eMesh);
    }

    // 9. Render Holes in 3D (Through-holes vs Blind holes vs Edge holes)
    const getHoleColor = (d: number, face: string) => {
      if (['top', 'bottom', 'left', 'right'].includes(face)) return 0xf43f5e; // Rose/Red for Edge holes
      if (d <= 5) return 0x10b981;  // 5mm Green
      if (d <= 8) return 0x3b82f6;  // 8mm Blue
      if (d <= 15) return 0xf97316; // 15mm Orange
      return 0xa855f7;              // 35mm Purple
    };

    displayPattern.holes.forEach(hole => {
      const isSelected = selectedHole?.id === hole.id;
      const radius = Math.max(1.5, hole.diameter / 2);
      const actualFace = classifyHoleFace(hole, displayPattern.width, displayPattern.length);

      // Check if hole is through (сквозное)
      const isThrough = hole.z >= displayPattern.thickness || (hole.face === 'A' && hole.z >= displayPattern.thickness - 0.5);

      if (['top', 'bottom', 'left', 'right'].includes(actualFace)) {
        // EDGE HOLE (В торец)
        const depth = Math.min(displayPattern.length, Math.max(15, hole.z || 30));
        const holeGeo = new THREE.CylinderGeometry(radius, radius, depth, 24);
        const holeMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xffea00 : 0xf43f5e,
          roughness: 0.2,
          metalness: 0.3,
          emissive: isSelected ? 0x665200 : 0x4c0519
        });
        const holeMesh = new THREE.Mesh(holeGeo, holeMat);

        if (actualFace === 'bottom') {
          // L1 (y=0 edge)
          holeMesh.position.set(hole.x, displayPattern.thickness / 2, depth / 2);
          holeMesh.rotation.x = Math.PI / 2;
        } else if (actualFace === 'top') {
          // L2 (y=width edge)
          holeMesh.position.set(hole.x, displayPattern.thickness / 2, displayPattern.width - depth / 2);
          holeMesh.rotation.x = Math.PI / 2;
        } else if (actualFace === 'left') {
          // W1 (x=0 edge)
          holeMesh.position.set(depth / 2, displayPattern.thickness / 2, hole.y);
          holeMesh.rotation.z = Math.PI / 2;
        } else if (actualFace === 'right') {
          // W2 (x=length edge)
          holeMesh.position.set(displayPattern.length - depth / 2, displayPattern.thickness / 2, hole.y);
          holeMesh.rotation.z = Math.PI / 2;
        }

        scene.add(holeMesh);

        // Bright Entry Marker Ring on the Outer Edge
        const ringGeo = new THREE.RingGeometry(radius + 0.5, radius + 2, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xffea00 : 0xf43f5e, side: THREE.DoubleSide });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);

        if (actualFace === 'bottom') {
          ringMesh.position.set(hole.x, displayPattern.thickness / 2, 0.1);
        } else if (actualFace === 'top') {
          ringMesh.position.set(hole.x, displayPattern.thickness / 2, displayPattern.width - 0.1);
        } else if (actualFace === 'left') {
          ringMesh.position.set(0.1, displayPattern.thickness / 2, hole.y);
          ringMesh.rotation.y = Math.PI / 2;
        } else if (actualFace === 'right') {
          ringMesh.position.set(displayPattern.length - 0.1, displayPattern.thickness / 2, hole.y);
          ringMesh.rotation.y = Math.PI / 2;
        }
        scene.add(ringMesh);

      } else if (isThrough) {
        // Through-Hole (Сквозное): Dark graphite interior cavity extending top-to-bottom
        const depth = displayPattern.thickness + 0.6;
        const holeGeo = new THREE.CylinderGeometry(radius, radius, depth, 24);
        const holeMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xffea00 : 0x090d16,
          roughness: 0.1,
          metalness: 0.5,
          emissive: isSelected ? 0x665200 : 0x000000
        });
        const holeMesh = new THREE.Mesh(holeGeo, holeMat);
        holeMesh.position.set(hole.x, displayPattern.thickness / 2, hole.y);
        scene.add(holeMesh);

        // Outer Top & Bottom Rim Rings for Through Hole
        const ringGeo = new THREE.RingGeometry(radius, radius + 1.2, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xffea00 : 0x38bdf8, side: THREE.DoubleSide });

        const topRing = new THREE.Mesh(ringGeo, ringMat);
        topRing.position.set(hole.x, displayPattern.thickness + 0.1, hole.y);
        topRing.rotation.x = Math.PI / 2;
        scene.add(topRing);

        const bottomRing = new THREE.Mesh(ringGeo, ringMat);
        bottomRing.position.set(hole.x, -0.1, hole.y);
        bottomRing.rotation.x = Math.PI / 2;
        scene.add(bottomRing);

      } else {
        // Blind Hole (Глухое) in Plast A or B
        const depth = Math.min(displayPattern.thickness - 0.5, hole.z || 12);
        const holeGeo = new THREE.CylinderGeometry(radius, radius, depth, 24);
        const holeColor = isSelected ? 0xffea00 : getHoleColor(hole.diameter, actualFace);
        const holeMat = new THREE.MeshStandardMaterial({
          color: holeColor,
          roughness: 0.2,
          metalness: 0.3,
          emissive: isSelected ? 0x665200 : 0x000000
        });

        const holeMesh = new THREE.Mesh(holeGeo, holeMat);

        if (actualFace === 'B') {
          holeMesh.position.set(hole.x, depth / 2, hole.y);
        } else {
          // Plast A (Top face)
          holeMesh.position.set(hole.x, displayPattern.thickness - depth / 2, hole.y);
        }

        scene.add(holeMesh);
      }
    });

    // 10. Efficient Event-Driven Render Loop (0% CPU when static)
    let animationFrameId: number | null = null;
    let isUserInteracting = false;

    const renderScene = () => {
      const needsDampingUpdate = controls.update();
      renderer.render(scene, camera);

      if (needsDampingUpdate || isUserInteracting) {
        animationFrameId = requestAnimationFrame(renderScene);
      } else {
        animationFrameId = null;
      }
    };

    const triggerRender = () => {
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(renderScene);
      }
    };

    controls.addEventListener('change', triggerRender);
    controls.addEventListener('start', () => { isUserInteracting = true; triggerRender(); });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    // Initial render
    renderScene();

    // Handle Window / Container Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth || 800;
      const h = mountRef.current.clientHeight || 500;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      triggerRender();
    };

    // Kick initial resize to guarantee non-black screen on mode switch
    const resizeTimeout = setTimeout(() => {
      handleResize();
    }, 50);

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', triggerRender);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [isOpen, displayPattern, selectedHole, mainDisplayMode]);

  // Projection View Preset Switcher
  const handleSetView = (view: '3d' | 'top' | 'bottom' | 'front' | 'side') => {
    setActive3DView(view);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const target = new THREE.Vector3(displayPattern.length / 2, displayPattern.thickness / 2, displayPattern.width / 2);
    controls.target.copy(target);

    const dist = Math.max(displayPattern.length, displayPattern.width) * 1.5;

    if (view === 'top') {
      camera.position.set(target.x, target.y + dist, target.z + 0.001);
    } else if (view === 'bottom') {
      camera.position.set(target.x, target.y - dist, target.z + 0.001);
    } else if (view === 'front') {
      camera.position.set(target.x, target.y, target.z + dist);
    } else if (view === 'side') {
      camera.position.set(target.x + dist, target.y, target.z);
    } else {
      camera.position.set(displayPattern.length * 0.5, displayPattern.width * 1.2, dist);
    }
    controls.update();
  };

  if (!isOpen) return null;

  // Count holes by category
  const allHolesCount = pattern.holes.length;
  const edgeHolesCount = pattern.holes.filter(h => ['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length))).length;

  // Filter Legend items to only show hole diameters that exist in this detail
  const presentLegendItems = useMemo(() => {
    const holes = displayPattern.holes || [];
    const items = [];

    if (holes.some(h => h.diameter <= 5 && !['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length)))) {
      items.push({ id: 'd5', label: '⌀5 мм (Конфирмат/Полкодержатель)', color: 'bg-emerald-500' });
    }
    if (holes.some(h => h.diameter > 5 && h.diameter <= 8 && !['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length)))) {
      items.push({ id: 'd8', label: '⌀8 мм (Шкант/Дюбель)', color: 'bg-blue-500' });
    }
    if (holes.some(h => h.diameter > 8 && h.diameter <= 15 && !['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length)))) {
      items.push({ id: 'd15', label: '⌀15 мм (Эксцентрик)', color: 'bg-amber-500' });
    }
    if (holes.some(h => h.diameter > 15 && !['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length)))) {
      items.push({ id: 'd35', label: '⌀35 мм (Петля)', color: 'bg-purple-500' });
    }
    if (holes.some(h => ['top', 'bottom', 'left', 'right'].includes(classifyHoleFace(h, pattern.width, pattern.length)))) {
      items.push({ id: 'dedge', label: 'Торцевое сверление (В торец)', color: 'bg-rose-500' });
    }

    return items;
  }, [displayPattern.holes, pattern.width, pattern.length]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-[98vw] xl:max-w-[1450px] 2xl:max-w-[1650px] max-h-[96vh] flex flex-col overflow-hidden text-white">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
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

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Filter Toggle Switcher: All Holes vs Only Edge Holes */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-800/90 border border-slate-700 font-mono text-xs">
              <button
                type="button"
                onClick={() => setOnlyEdgeHolesFilter(false)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  !onlyEdgeHolesFilter ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Все ({allHolesCount})
              </button>
              <button
                type="button"
                onClick={() => setOnlyEdgeHolesFilter(true)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  onlyEdgeHolesFilter ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Только торец ({edgeHolesCount})</span>
              </button>
            </div>

            {/* Mode Switcher: 3D Model vs 2D Bazis Drawing Scheme */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-800 border border-slate-700 font-mono text-xs">
              <button
                onClick={() => setMainDisplayMode('3d')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainDisplayMode === '3d' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🧊 3D Модель</span>
              </button>
              <button
                onClick={() => setMainDisplayMode('2d_cad')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainDisplayMode === '2d_cad' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📐 2D Чертеж (Базис)</span>
              </button>
            </div>

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
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

          {/* Left Canvas / Drawing Area */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col bg-slate-950 relative min-h-[420px] lg:min-h-0">

            {mainDisplayMode === '2d_cad' ? (
              /* 2D Bazis CAD Blueprint View */
              <div className="w-full flex-1 relative flex flex-col p-4 overflow-hidden">
                <Bazis2DBlueprintSvg
                  pattern={displayPattern}
                  selectedHole={selectedHole}
                  onSelectHole={setSelectedHole}
                />
              </div>
            ) : (
              /* 3D WebGL Canvas Mounting Container */
              <>
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
              </>
            )}

            {/* Bottom Overlay Edging Indicator Bar */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Габариты:</span>
                <span className="text-emerald-400 font-bold">{displayPattern.length} × {displayPattern.width} × {displayPattern.thickness} мм</span>
                <span className="text-slate-500">•</span>
                <span className="text-indigo-400 font-bold">Отверстий: {displayPattern.holes.length} шт</span>
              </div>

              {/* Edging Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-bold">Кромление:</span>
                {Object.entries(displayPattern.edges).map(([key, edge]) => (
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

          {/* Right Sidebar: Pattern Details & Hole List */}
          <div className="lg:col-span-5 xl:col-span-5 p-5 bg-slate-900 border-l border-slate-800 flex flex-col gap-4 overflow-hidden min-w-[340px] xl:min-w-[420px]">

            {/* Drilling Diameter Legend (Dynamic - ONLY shows diameters present in pattern) */}
            {presentLegendItems.length > 0 && (
              <div className="space-y-2 shrink-0">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Легенда отверстий:
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {presentLegendItems.map(item => (
                    <div key={item.id} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Holes List / Selected Hole Inspector */}
            <div className="flex-1 flex flex-col space-y-2 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                <span>Список отверстий ({displayPattern.holes.length}):</span>
                {onlyEdgeHolesFilter && (
                  <span className="text-purple-400 font-bold text-[11px]">Фильтр: Только торец</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1.5 space-y-2.5">
                {displayPattern.holes.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-400 text-xs italic">
                    {onlyEdgeHolesFilter ? 'Торцевые отверстия для данной детали отсутствуют' : 'Отверстия для данной детали не заданы'}
                  </div>
                ) : (
                  displayPattern.holes.map((hole, idx) => {
                    const isSel = selectedHole?.id === hole.id;
                    const actualFace = classifyHoleFace(hole, displayPattern.width, displayPattern.length);
                    const isEdge = ['top', 'bottom', 'left', 'right'].includes(actualFace);

                    return (
                      <button
                        key={hole.id}
                        onClick={() => setSelectedHole(isSel ? null : hole)}
                        className={`w-full text-left p-3.5 rounded-2xl border text-xs font-mono transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSel
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-800/70 border-slate-700/70 hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-xs whitespace-nowrap">#{idx + 1} ⌀{hole.diameter} мм</span>
                            <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">глубина {hole.z} мм</span>
                          </div>
                          <span className="text-slate-300 text-[11px] block font-mono whitespace-nowrap">
                            Координаты: X = {hole.x} мм, Y = {hole.y} мм
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 whitespace-nowrap ${
                          isEdge
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black'
                            : 'bg-slate-900 text-indigo-300 border-slate-700'
                        }`}>
                          {isEdge ? `В торец (${actualFace.toUpperCase()})` : `Пласть ${actualFace}`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* CNC File Upload / Status */}
            <div className="pt-2 border-t border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Файл УП ЧПУ:</span>
                <span className="text-indigo-400 font-mono text-[11px] truncate max-w-[180px]">
                  {cncFileName || `${detail?.name || 'деталь'}.nc`}
                </span>
              </div>

              {onUploadCNCFile && (
                <label className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer">
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
            <div className="pt-2 border-t border-slate-800 shrink-0">
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

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

  // SVG Padding for Dimension Chains, Leader Callouts and Edging Flags
  const padLeft = 140;
  const padRight = 140;
  const padTop = 110;
  const padBottom = 110;

  const svgW = pLength + padLeft + padRight;
  const svgH = pWidth + padTop + padBottom;

  // Panel corner SVG coordinates
  const panelX = padLeft;
  const panelY = padTop;

  // Extract and sort unique X and Y coordinates for Bazis cumulative dimension chains
  const holes = pattern.holes || [];

  // Group unique X coordinates (rounded to 0.5mm to eliminate floating noise)
  const xCoords = Array.from(new Set([0, ...holes.map(h => Math.round(h.x * 10) / 10), pLength]))
    .sort((a, b) => a - b);

  // Group unique Y coordinates
  const yCoords = Array.from(new Set([0, ...holes.map(h => Math.round(h.y * 10) / 10), pWidth]))
    .sort((a, b) => a - b);

  // Group holes by tool / type for leader callouts
  const holeGroups: Record<string, { label: string; count: number; hole: CNCDrillHole }> = {};
  holes.forEach(h => {
    const face = classifyHoleFace(h, pWidth, pLength);
    const key = `${h.diameter}_${h.z}_${face}`;
    let desc = `⌀${h.diameter}x${h.z}`;
    if (h.diameter === 8) desc += ' Евр';
    else if (h.diameter === 5) desc += ' Нап лиц';
    else if (h.diameter === 15) desc += ' Мин';
    else if (h.diameter === 35) desc += ' Пет';

    if (!holeGroups[key]) {
      holeGroups[key] = { label: desc, count: 0, hole: h };
    }
    holeGroups[key].count++;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 p-2 sm:p-4 relative overflow-hidden select-none">
      {/* CAD Drawing Sheet Frame */}
      <div className="flex-1 w-full h-full flex items-center justify-center min-h-[420px] bg-white rounded-2xl shadow-2xl p-2 border border-slate-300">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full max-h-[640px] object-contain"
          style={{ fontFamily: "'Courier New', Courier, monospace, sans-serif" }}
        >
          <defs>
            {/* Arrowhead marker for dimension lines */}
            <marker id="cadArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 10 5 L 0 8 z" fill="#0f172a" />
            </marker>
            <marker id="greenArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a" />
            </marker>
          </defs>

          {/* Paper Background */}
          <rect width={svgW} height={svgH} fill="#ffffff" rx="8" />

          {/* Outer ESKD Drawing Border */}
          <rect x="12" y="12" width={svgW - 24} height={svgH - 24} fill="none" stroke="#0f172a" strokeWidth="1.2" />

          {/* Main Board Panel Rectangle (Black Solid Outline) */}
          <rect
            x={panelX}
            y={panelY}
            width={pLength}
            height={pWidth}
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2.5"
          />

          {/* Edging Callout Flags (ГОСТ пвх 0,4 мм) */}
          {/* Top Edge (L2) */}
          {pattern.edges.L2?.hasEdge && (
            <g transform={`translate(${panelX + pLength * 0.65}, ${panelY})`}>
              <line x1="0" y1="0" x2="0" y2="-25" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="-25" x2="20" y2="-25" stroke="#0f172a" strokeWidth="1" />
              <rect x="20" y="-36" width="95" height="22" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <text x="26" y="-21" fill="#0f172a" fontSize="11" fontWeight="bold" fontStyle="italic">
                ⌢ пвх {pattern.edges.L2.thickness} мм
              </text>
            </g>
          )}

          {/* Bottom Edge (L1) */}
          {pattern.edges.L1?.hasEdge && (
            <g transform={`translate(${panelX + pLength * 0.45}, ${panelY + pWidth})`}>
              <line x1="0" y1="0" x2="0" y2="25" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="25" x2="20" y2="25" stroke="#0f172a" strokeWidth="1" />
              <rect x="20" y="14" width="95" height="22" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <text x="26" y="29" fill="#0f172a" fontSize="11" fontWeight="bold" fontStyle="italic">
                ⌢ пвх {pattern.edges.L1.thickness} мм
              </text>
            </g>
          )}

          {/* Left Edge (W1) */}
          {pattern.edges.W1?.hasEdge && (
            <g transform={`translate(${panelX}, ${panelY + pWidth * 0.5})`}>
              <line x1="0" y1="0" x2="-25" y2="0" stroke="#0f172a" strokeWidth="1" />
              <line x1="-25" y1="0" x2="-25" y2="-18" stroke="#0f172a" strokeWidth="1" />
              <rect x="-122" y="-29" width="95" height="22" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <text x="-116" y="-14" fill="#0f172a" fontSize="11" fontWeight="bold" fontStyle="italic">
                ⌢ пвх {pattern.edges.W1.thickness} мм
              </text>
            </g>
          )}

          {/* Right Edge (W2) */}
          {pattern.edges.W2?.hasEdge && (
            <g transform={`translate(${panelX + pLength}, ${panelY + pWidth * 0.5})`}>
              <line x1="0" y1="0" x2="25" y2="0" stroke="#0f172a" strokeWidth="1" />
              <line x1="25" y1="0" x2="25" y2="-18" stroke="#0f172a" strokeWidth="1" />
              <rect x="28" y="-29" width="95" height="22" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
              <text x="34" y="-14" fill="#0f172a" fontSize="11" fontWeight="bold" fontStyle="italic">
                ⌢ пвх {pattern.edges.W2.thickness} мм
              </text>
            </g>
          )}

          {/* Green ESKD Reference Coordinate System (0,0) at Bottom-Left */}
          <g transform={`translate(${panelX - 28}, ${panelY + pWidth + 28})`}>
            {/* X Axis Arrow */}
            <line x1="0" y1="0" x2="25" y2="0" stroke="#16a34a" strokeWidth="2" markerEnd="url(#greenArrow)" />
            <text x="29" y="4" fill="#16a34a" fontSize="12" fontWeight="bold">X</text>
            {/* Y Axis Arrow */}
            <line x1="0" y1="0" x2="0" y2="-25" stroke="#16a34a" strokeWidth="2" markerEnd="url(#greenArrow)" />
            <text x="-4" y="-28" fill="#16a34a" fontSize="12" fontWeight="bold">Y</text>
            {/* Origin Dot */}
            <circle cx="0" cy="0" r="3" fill="#16a34a" />
          </g>

          {/* Horizontal Dimension Chains (Top and Bottom) */}
          {/* Top Horizontal Chain */}
          {xCoords.map((xVal, idx) => {
            const svgX = panelX + xVal;
            const lineY = panelY - 32;
            const extY1 = panelY - 4;
            const extY2 = lineY - 10;

            return (
              <g key={`x-top-${idx}`}>
                {/* Vertical Extension Line */}
                <line x1={svgX} y1={extY1} x2={svgX} y2={extY2} stroke="#475569" strokeWidth="0.8" />

                {/* Dimension Text if non-zero */}
                {xVal > 0 && (
                  <text
                    x={svgX}
                    y={lineY - 5}
                    fill="#0f172a"
                    fontSize="11"
                    fontWeight="bold"
                    fontStyle="italic"
                    textAnchor="middle"
                  >
                    {xVal}{idx < xCoords.length - 1 ? '*' : ''}
                  </text>
                )}
              </g>
            );
          })}
          {/* Top Horizontal Dimension Main Line */}
          <line
            x1={panelX}
            y1={panelY - 32}
            x2={panelX + pLength}
            y2={panelY - 32}
            stroke="#0f172a"
            strokeWidth="1"
            markerStart="url(#cadArrow)"
            markerEnd="url(#cadArrow)"
          />

          {/* Bottom Horizontal Dimension Chain (Panel Length Total) */}
          <line
            x1={panelX}
            y1={panelY + pWidth + 32}
            x2={panelX + pLength}
            y2={panelY + pWidth + 32}
            stroke="#0f172a"
            strokeWidth="1"
            markerStart="url(#cadArrow)"
            markerEnd="url(#cadArrow)"
          />
          <line x1={panelX} y1={panelY + pWidth + 4} x2={panelX} y2={panelY + pWidth + 42} stroke="#475569" strokeWidth="0.8" />
          <line x1={panelX + pLength} y1={panelY + pWidth + 4} x2={panelX + pLength} y2={panelY + pWidth + 42} stroke="#475569" strokeWidth="0.8" />
          <text
            x={panelX + pLength / 2}
            y={panelY + pWidth + 46}
            fill="#0f172a"
            fontSize="12"
            fontWeight="bold"
            fontStyle="italic"
            textAnchor="middle"
          >
            {pLength}
          </text>

          {/* Vertical Dimension Chain (Left) */}
          {yCoords.map((yVal, idx) => {
            const svgY = panelY + (pWidth - yVal);
            const lineX = panelX - 42;
            const extX1 = panelX - 4;
            const extX2 = lineX - 10;

            return (
              <g key={`y-left-${idx}`}>
                {/* Horizontal Extension Line */}
                <line x1={extX1} y1={svgY} x2={extX2} y2={svgY} stroke="#475569" strokeWidth="0.8" />

                {/* Dimension Text */}
                {yVal > 0 && (
                  <text
                    x={lineX - 5}
                    y={svgY + 4}
                    fill="#0f172a"
                    fontSize="11"
                    fontWeight="bold"
                    fontStyle="italic"
                    textAnchor="end"
                  >
                    {yVal}{idx < yCoords.length - 1 ? '*' : ''}
                  </text>
                )}
              </g>
            );
          })}
          {/* Left Vertical Dimension Main Line */}
          <line
            x1={panelX - 42}
            y1={panelY}
            x2={panelX - 42}
            y2={panelY + pWidth}
            stroke="#0f172a"
            strokeWidth="1"
            markerStart="url(#cadArrow)"
            markerEnd="url(#cadArrow)"
          />

          {/* Right Vertical Total Height Dimension */}
          <line
            x1={panelX + pLength + 42}
            y1={panelY}
            x2={panelX + pLength + 42}
            y2={panelY + pWidth}
            stroke="#0f172a"
            strokeWidth="1"
            markerStart="url(#cadArrow)"
            markerEnd="url(#cadArrow)"
          />
          <line x1={panelX + pLength + 4} y1={panelY} x2={panelX + pLength + 52} y2={panelY} stroke="#475569" strokeWidth="0.8" />
          <line x1={panelX + pLength + 4} y1={panelY + pWidth} x2={panelX + pLength + 52} y2={panelY + pWidth} stroke="#475569" strokeWidth="0.8" />
          <text
            x={panelX + pLength + 58}
            y={panelY + pWidth / 2 + 4}
            fill="#0f172a"
            fontSize="12"
            fontWeight="bold"
            fontStyle="italic"
          >
            {pWidth}
          </text>

          {/* Render Holes with Numbers and Crosshairs */}
          {holes.map((hole, idx) => {
            const holeNum = idx + 1;
            const isSel = selectedHole?.id === hole.id;
            const cx = panelX + hole.x;
            const cy = panelY + (pWidth - hole.y);
            const r = Math.max(5, Math.min(16, (hole.diameter / 2) * 1.2));

            const actualFace = classifyHoleFace(hole, pWidth, pLength);
            const isEdge = ['top', 'bottom', 'left', 'right'].includes(actualFace);
            const isThrough = hole.z >= pThick || (hole.face === 'A' && hole.z >= pThick - 0.5);

            return (
              <g
                key={hole.id}
                onClick={() => onSelectHole(isSel ? null : hole)}
                className="cursor-pointer"
              >
                {/* Selection Highlight */}
                {isSel && (
                  <circle cx={cx} cy={cy} r={r + 8} fill="#fef08a" opacity="0.6" stroke="#eab308" strokeWidth="2" />
                )}

                {/* Hole Circle */}
                {isEdge ? (
                  // Edge Hole: Marker on edge with dash line
                  <g>
                    <circle cx={cx} cy={cy} r="5" fill={isSel ? '#eab308' : '#ef4444'} stroke="#0f172a" strokeWidth="1.5" />
                  </g>
                ) : isThrough ? (
                  // Through Hole: Concentric circle
                  <>
                    <circle cx={cx} cy={cy} r={r + 1.5} fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                    <circle cx={cx} cy={cy} r={r - 1.5} fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
                  </>
                ) : (
                  // Blind Hole: Single circle
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={actualFace === 'B' ? '#ffffff' : (isSel ? '#fef08a' : '#ffffff')}
                    stroke="#0f172a"
                    strokeWidth="1.8"
                    strokeDasharray={actualFace === 'B' ? '3,2' : 'none'}
                  />
                )}

                {/* Center Crosshair */}
                <line x1={cx - r - 3} y1={cy} x2={cx + r + 3} y2={cy} stroke="#0f172a" strokeWidth="0.8" />
                <line x1={cx} y1={cy - r - 3} x2={cx} y2={cy + r + 3} stroke="#0f172a" strokeWidth="0.8" />

                {/* Hole Number Badge (#1, #2, #3...) next to hole */}
                <text
                  x={cx + r + 3}
                  y={cy + r + 8}
                  fill="#0f172a"
                  fontSize="11"
                  fontWeight="bold"
                  fontStyle="italic"
                >
                  {holeNum}
                </text>
              </g>
            );
          })}

          {/* Leader Callouts for Hole Groups e.g. "6отв ⌀8 Евр", "⌀5x12 Нап лиц" */}
          {Object.values(holeGroups).slice(0, 4).map((grp, gIdx) => {
            const h = grp.hole;
            const hx = panelX + h.x;
            const hy = panelY + (pWidth - h.y);
            const targetX = hx > panelX + pLength / 2 ? panelX + pLength + 60 : panelX - 60;
            const targetY = panelY - 55 - gIdx * 24;

            return (
              <g key={`leader-${gIdx}`}>
                {/* Leader Line from hole to text */}
                <polyline
                  points={`${hx},${hy} ${hx + (hx > panelX + pLength / 2 ? 18 : -18)},${targetY + 6} ${targetX},${targetY + 6}`}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <circle cx={hx} cy={hy} r="2" fill="#0f172a" />

                {/* Leader Text */}
                <text
                  x={targetX + (hx > panelX + pLength / 2 ? -4 : 4)}
                  y={targetY + 4}
                  fill="#0f172a"
                  fontSize="11"
                  fontWeight="bold"
                  fontStyle="italic"
                  textAnchor={hx > panelX + pLength / 2 ? 'end' : 'start'}
                >
                  {grp.count > 1 ? `${grp.count}отв ` : ''}{grp.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Blueprint Legend Bar (ESKD / ГОСТ) */}
      <div className="mt-3 p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-200 font-mono shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-900 flex items-center justify-center font-bold text-[9px] text-slate-900">1</span>
            <span>Нумерация отверстий</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900" />
            <span>Пласть А (Сплошная)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-dashed border-slate-900" />
            <span>Пласть B (Пунктир)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-slate-900" />
            <span>Сквозное</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>В торец</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          📐 Спецификация чертежа ГОСТ / ЕСКД (Базис-Мебельщик)
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

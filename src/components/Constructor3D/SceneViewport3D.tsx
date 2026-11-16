import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ConstructorSceneData,
  KitchenModuleItem,
  WardrobeSection,
  RoomObstacleItem,
  HandleKind,
  HandleOrientation,
  HandlePlacement,
  computeKitchenWorktopCut,
  resolveEffectiveDrawerDepth,
} from './constructorPresets';

export interface DraggedLibraryPreviewItem {
  kind: 'module' | 'obstacle';
  name: string;
  width: number;
  height: number;
  depth: number;
  category?: 'lower' | 'upper' | 'tall' | 'anthresole';
  elevationY: number;
}

interface SceneViewport3DProps {
  scene: ConstructorSceneData;
  selectedId: string | null;
  multiSelectedIds?: string[];
  photorealMode?: boolean;
  onSelect: (
    id: string | null,
    kind: 'module' | 'section' | 'obstacle' | null,
    screenPos?: { x: number; y: number },
    ctrlKey?: boolean
  ) => void;
  onDoubleClickItem?: (id: string, kind: 'module' | 'section' | 'obstacle') => void;
  doorsOpen: boolean;
  xrayMode: boolean;
  cameraPreset: '3d' | 'front' | 'top' | 'left' | 'right';
  onMoveItem?: (
    id: string,
    kind: 'module' | 'obstacle',
    newPositionX: number,
    newElevationY?: number,
    newWall?: 'center' | 'left' | 'right',
    newPositionZ?: number
  ) => void;
  draggedLibraryItem?: DraggedLibraryPreviewItem | null;
  onDropLibraryItem?: (
    positionX: number,
    elevationY: number,
    wall: 'center' | 'left' | 'right'
  ) => void;
}

const MM_TO_M = 0.001; // 1000mm = 1.0 unit in Three.js

let GLOBAL_SUPPRESS_EDGES = false;

function createEdgeLines(geometry: THREE.BufferGeometry, color = 0x1e242b, opacity = 0.32) {
  const effectiveOpacity = GLOBAL_SUPPRESS_EDGES ? 0 : opacity;
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: effectiveOpacity,
      visible: effectiveOpacity > 0.001,
    })
  );
  // Prevent Three.js raycaster from matching LineSegments with large world-unit threshold
  line.userData.ignoreRaycast = true;
  line.raycast = () => {};
  return line;
}

function createBoxWithEdges(
  wMm: number,
  hMm: number,
  dMm: number,
  material: THREE.Material,
  edgeColor = 0x1e242b,
  edgeOpacity = 0.32,
  ignoreRaycast = false
): THREE.Group {
  const group = new THREE.Group();
  const geom = new THREE.BoxGeometry(
    Math.max(1, wMm) * MM_TO_M,
    Math.max(1, hMm) * MM_TO_M,
    Math.max(1, dMm) * MM_TO_M
  );
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (ignoreRaycast) {
    mesh.userData.ignoreRaycast = true;
  }
  group.add(mesh);
  if (!GLOBAL_SUPPRESS_EDGES && edgeOpacity > 0.001) {
    group.add(createEdgeLines(geom, edgeColor, edgeOpacity));
  }
  if (ignoreRaycast) {
    group.userData.ignoreRaycast = true;
  }
  return group;
}

/**
 * Places a local module/obstacle group (where X is 0..width along the wall and Z is 0..depth out from the wall)
 * onto the specified room wall ('center', 'left', 'right'), with optional depth offset into the room.
 */
function placeGroupOnWall(
  group: THREE.Object3D,
  wall: 'center' | 'left' | 'right',
  posAlongWallMm: number,
  itemWidthMm: number,
  startX: number,
  backWallZ: number,
  roomW: number,
  depthOffsetMm = 0
) {
  if (wall === 'left') {
    // Left wall runs along Z from backWallZ forward (+Z), facing +X into the room.
    // depthOffsetMm moves forward into the room (+X)
    group.position.set(
      (startX + depthOffsetMm) * MM_TO_M,
      0,
      (backWallZ + posAlongWallMm + itemWidthMm) * MM_TO_M
    );
    group.rotation.set(0, Math.PI / 2, 0);
  } else if (wall === 'right') {
    // Right wall runs along Z from backWallZ forward (+Z), facing -X into the room.
    // depthOffsetMm moves forward into the room (-X)
    group.position.set(
      (startX + roomW - depthOffsetMm) * MM_TO_M,
      0,
      (backWallZ + posAlongWallMm) * MM_TO_M
    );
    group.rotation.set(0, -Math.PI / 2, 0);
  } else {
    // Center wall runs along X from startX to startX + roomW, facing +Z.
    // depthOffsetMm moves forward into the room (+Z)
    group.position.set(
      (startX + posAlongWallMm) * MM_TO_M,
      0,
      (backWallZ + depthOffsetMm) * MM_TO_M
    );
    group.rotation.set(0, 0, 0);
  }
}

/**
 * Builds realistic 3D concealed hinges on carcass side panels and doors.
 */
function buildHinges3D(
  targetGroup: THREE.Group,
  t: number,
  modW: number,
  doorH: number,
  baseY: number,
  carcassFrontZ: number,
  hingeSide: 'left' | 'right',
  chromeMat: THREE.Material,
  darkMat: THREE.Material
) {
  const hingeCount = doorH > 1600 ? 4 : doorH > 900 ? 3 : 2;
  const offsets =
    hingeCount === 4
      ? [90, doorH * 0.38, doorH * 0.65, doorH - 90]
      : hingeCount === 3
        ? [90, doorH / 2, doorH - 90]
        : [90, doorH - 90];

  offsets.forEach((off) => {
    const hy = baseY + off;
    const isLeft = hingeSide === 'left';
    // Mounting cruciform plate on carcass side panel
    const plate = createBoxWithEdges(10, 28, 36, chromeMat, 0x475569, 0.4);
    plate.position.set(
      (isLeft ? t + 5 : modW - t - 5) * MM_TO_M,
      hy * MM_TO_M,
      (carcassFrontZ - 26) * MM_TO_M
    );
    // Articulated chrome hinge arm with adjusting screws
    const arm = createBoxWithEdges(8, 16, 24, chromeMat, 0x475569, 0.4);
    arm.position.set(
      (isLeft ? t + 10 : modW - t - 10) * MM_TO_M,
      hy * MM_TO_M,
      (carcassFrontZ - 10) * MM_TO_M
    );
    // Hinge round cup
    const cupGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.01, 14);
    const cup = new THREE.Mesh(cupGeom, darkMat);
    cup.rotation.x = Math.PI / 2;
    cup.position.set(
      (isLeft ? t + 16 : modW - t - 16) * MM_TO_M,
      hy * MM_TO_M,
      (carcassFrontZ + t / 2) * MM_TO_M
    );
    targetGroup.add(plate, arm, cup);
  });
}

/**
 * Builds pneumatic gas lift struts on anthresoles and lift-up doors.
 */
function buildGasLifts3D(
  targetGroup: THREE.Group,
  innerW: number,
  localCenterX: number,
  baseElevY: number,
  doorH: number,
  carcassCenterZ: number,
  doorsOpen: boolean,
  chromeMat: THREE.Material,
  darkMat: THREE.Material
) {
  [-1, 1].forEach((dir) => {
    const gasSideX = localCenterX + dir * (innerW / 2 - 12);
    const pivotY = baseElevY + doorH * 0.4;
    // Mounting bracket on carcass side
    const bracket = createBoxWithEdges(6, 24, 18, darkMat);
    bracket.position.set(
      gasSideX * MM_TO_M,
      (baseElevY + doorH * 0.25) * MM_TO_M,
      (carcassCenterZ - 20) * MM_TO_M
    );
    // Pneumatic cylinder (angled)
    const cylGeom = new THREE.CylinderGeometry(0.009, 0.009, 0.12, 12);
    const cylMesh = new THREE.Mesh(cylGeom, darkMat);
    cylMesh.rotation.x = doorsOpen ? -0.65 : -0.22;
    cylMesh.position.set(
      gasSideX * MM_TO_M,
      pivotY * MM_TO_M,
      carcassCenterZ * MM_TO_M
    );
    // Chrome piston rod extending to facade bracket
    const rodGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.09, 10);
    const rodMesh = new THREE.Mesh(rodGeom, chromeMat);
    rodMesh.rotation.x = cylMesh.rotation.x;
    rodMesh.position.set(
      gasSideX * MM_TO_M,
      (pivotY + 28) * MM_TO_M,
      (carcassCenterZ + 32) * MM_TO_M
    );
    targetGroup.add(bracket, cylMesh, rodMesh);
  });
}

/**
 * Builds a configurable 3D handle ('bar', 'edge', 'knob') or omits it ('push_to_open', 'overhang', 'gola', 'none'),
 * respecting orientation, placement, fine X/Y offsets, color, and ergonomic tall-cabinet positioning.
 */
function buildFacadeHandle3D(params: {
  targetGroup: THREE.Group;
  doorW: number;
  doorH: number;
  facadeThickness: number;
  doorCenterX: number; // mm in targetGroup coordinates
  doorCenterY: number; // mm in targetGroup coordinates
  doorFrontZ: number;  // mm in targetGroup coordinates (front surface of facade)
  defaultSide: 'left' | 'right' | 'center_top' | 'center_bottom' | 'center';
  mod: KitchenModuleItem;
  scene: ConstructorSceneData;
  doorVerticalZone?: 'standard' | 'full_tall' | 'upper_tall' | 'lower_tall';
}) {
  const {
    targetGroup,
    doorW,
    doorH,
    facadeThickness,
    doorCenterX,
    doorCenterY,
    doorFrontZ,
    defaultSide,
    mod,
    scene,
    doorVerticalZone = 'standard',
  } = params;

  const handleType: HandleKind =
    mod.handleType || scene.materials.defaultHandleType || 'bar';

  if (
    handleType === 'none' ||
    handleType === 'push_to_open' ||
    handleType === 'overhang' ||
    handleType === 'gola'
  ) {
    return;
  }

  const handleColorHex =
    mod.handleColor || scene.materials.defaultHandleColor || '#1E242B';
  const isLightChrome =
    handleColorHex.toLowerCase() === '#d0d7de' ||
    handleColorHex.toLowerCase() === '#cbd5e1' ||
    handleColorHex.toLowerCase() === '#d4af37';

  const handleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(handleColorHex),
    roughness: isLightChrome ? 0.25 : 0.42,
    metalness: isLightChrome ? 0.85 : 0.45,
  });

  const rawOrientation: HandleOrientation =
    mod.handleOrientation || scene.materials.defaultHandleOrientation || 'auto';
  const rawPlacement: HandlePlacement =
    mod.handlePlacement || scene.materials.defaultHandlePlacement || 'auto';

  const isDrawerOrLift =
    defaultSide === 'center_top' ||
    defaultSide === 'center_bottom' ||
    defaultSide === 'center';

  const isHorizontal =
    rawOrientation === 'horizontal' ||
    (rawOrientation === 'auto' &&
      (isDrawerOrLift || rawPlacement === 'center'));

  // Determine base X & Y in mm relative to door center (Strict 40 mm edge margin)
  let relX = 0; // -doorW/2 .. +doorW/2
  let relY = 0; // -doorH/2 .. +doorH/2

  const edgeMarginX = Math.max(25, Math.min(40, doorW / 2 - 20));
  const edgeMarginY = 40; // Exact 40 mm requirement from top/bottom edge

  // Horizontal X position
  if (rawPlacement === 'center' || isDrawerOrLift) {
    relX = 0;
  } else if (defaultSide === 'left') {
    relX = -doorW / 2 + edgeMarginX;
  } else if (defaultSide === 'right') {
    relX = doorW / 2 - edgeMarginX;
  }

  // Vertical Y position: 40 mm from edge
  if (rawPlacement === 'center' || rawPlacement === 'middle') {
    relY = 0;
  } else if (rawPlacement === 'top') {
    relY = doorH / 2 - edgeMarginY;
  } else if (rawPlacement === 'bottom') {
    relY = -doorH / 2 + edgeMarginY;
  } else {
    // Standard rule:
    // - Lower doors: 40 mm from top edge
    // - Upper doors, Anthresoles, and Refrigerator big upper door: 40 mm from bottom edge
    if (doorVerticalZone === 'full_tall' || doorVerticalZone === 'upper_tall' || mod.category === 'upper' || mod.category === 'anthresole') {
      // Upper door / Fridge big door: 40 mm from bottom edge of door
      relY = -doorH / 2 + edgeMarginY;
    } else if (doorVerticalZone === 'lower_tall' || mod.category === 'lower') {
      // Lower door: 40 mm from top edge of door
      relY = doorH / 2 - edgeMarginY;
    } else if (defaultSide === 'center_top') {
      relY = doorH > 200 ? doorH / 2 - edgeMarginY : 0;
    } else if (defaultSide === 'center_bottom') {
      relY = -doorH / 2 + edgeMarginY;
    } else {
      relY = doorH / 2 - edgeMarginY;
    }
  }

  // Apply user fine offsets (mm)
  const offsetX = mod.handleOffsetX || 0;
  const offsetY = mod.handleOffsetY || 0;
  const maxRelX = Math.max(10, doorW / 2 - 22);
  const maxRelY = Math.max(10, doorH / 2 - 22);
  relX = Math.max(-maxRelX, Math.min(maxRelX, relX + offsetX));
  relY = Math.max(-maxRelY, Math.min(maxRelY, relY + offsetY));

  const handleGroup = new THREE.Group();

  if (handleType === 'knob') {
    // Cylindrical knob
    const stemGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.014, 14);
    stemGeom.rotateX(Math.PI / 2);
    const stem = new THREE.Mesh(stemGeom, handleMat);
    stem.position.z = 0.007;
    handleGroup.add(stem);

    const capGeom = new THREE.CylinderGeometry(0.014, 0.012, 0.01, 20);
    capGeom.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeom, handleMat);
    cap.position.z = 0.016;
    handleGroup.add(cap);

    handleGroup.position.set(
      (doorCenterX + relX) * MM_TO_M,
      (doorCenterY + relY) * MM_TO_M,
      doorFrontZ * MM_TO_M
    );
  } else if (handleType === 'edge') {
    // Торцевая профильная ручка (mounts onto top/bottom or side edge of the facade)
    const profileLenMm = Math.min(Math.max(120, (isHorizontal ? doorW : doorH) * 0.45), 240);
    if (isHorizontal) {
      // Mount on top or bottom horizontal edge of the facade
      const mountOnBottom =
        mod.category === 'upper' ||
        mod.category === 'anthresole' ||
        doorVerticalZone === 'upper_tall' ||
        rawPlacement === 'bottom';
      const edgeY = mountOnBottom
        ? doorCenterY - doorH / 2 + 2
        : doorCenterY + doorH / 2 - 2;
      // Top/bottom plate + front lip
      const topPlate = new THREE.Mesh(
        new THREE.BoxGeometry(
          profileLenMm * MM_TO_M,
          0.003,
          (facadeThickness + 22) * MM_TO_M
        ),
        handleMat
      );
      topPlate.position.set(0, 0, (-facadeThickness / 2 + 11) * MM_TO_M);
      handleGroup.add(topPlate);

      const frontLip = new THREE.Mesh(
        new THREE.BoxGeometry(profileLenMm * MM_TO_M, 0.018, 0.004),
        handleMat
      );
      frontLip.position.set(
        0,
        mountOnBottom ? 0.007 : -0.007,
        0.02 * MM_TO_M * 1000
      );
      handleGroup.add(frontLip);

      handleGroup.position.set(
        (doorCenterX + Math.max(-doorW / 2 + profileLenMm / 2 + 8, Math.min(doorW / 2 - profileLenMm / 2 - 8, offsetX))) * MM_TO_M,
        edgeY * MM_TO_M,
        doorFrontZ * MM_TO_M
      );
    } else {
      // Mount on left or right vertical edge of the facade
      const mountOnLeft = defaultSide === 'left';
      const edgeX = mountOnLeft
        ? doorCenterX - doorW / 2 + 2
        : doorCenterX + doorW / 2 - 2;
      const sidePlate = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.003,
          profileLenMm * MM_TO_M,
          (facadeThickness + 22) * MM_TO_M
        ),
        handleMat
      );
      sidePlate.position.set(0, 0, (-facadeThickness / 2 + 11) * MM_TO_M);
      handleGroup.add(sidePlate);

      const frontLip = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, profileLenMm * MM_TO_M, 0.004),
        handleMat
      );
      frontLip.position.set(mountOnLeft ? 0.007 : -0.007, 0, 0.02);
      handleGroup.add(frontLip);

      handleGroup.position.set(
        edgeX * MM_TO_M,
        (doorCenterY + relY) * MM_TO_M,
        doorFrontZ * MM_TO_M
      );
    }
  } else {
    // Standard bar handle ('bar' — Ручка-скоба 160 мм)
    const barLengthM = Math.min(0.168, Math.max(0.096, ((isHorizontal ? doorW : doorH) - 40) * MM_TO_M));
    const legSpanM = Math.max(0.064, barLengthM - 0.028);

    const barGeom = isHorizontal
      ? new THREE.BoxGeometry(barLengthM, 0.01, 0.01)
      : new THREE.BoxGeometry(0.01, barLengthM, 0.01);
    const barMesh = new THREE.Mesh(barGeom, handleMat);
    barMesh.position.z = 0.022;
    handleGroup.add(barMesh);

    const legGeom = new THREE.BoxGeometry(0.008, 0.008, 0.022);
    const leg1 = new THREE.Mesh(legGeom, handleMat);
    const leg2 = new THREE.Mesh(legGeom, handleMat);
    if (isHorizontal) {
      leg1.position.set(-legSpanM / 2, 0, 0.011);
      leg2.position.set(legSpanM / 2, 0, 0.011);
    } else {
      leg1.position.set(0, -legSpanM / 2, 0.011);
      leg2.position.set(0, legSpanM / 2, 0.011);
    }
    handleGroup.add(leg1, leg2);

    handleGroup.position.set(
      (doorCenterX + relX) * MM_TO_M,
      (doorCenterY + relY) * MM_TO_M,
      doorFrontZ * MM_TO_M
    );
  }

  targetGroup.add(handleGroup);
}

export const SceneViewport3D: React.FC<SceneViewport3DProps> = ({
  scene,
  selectedId,
  multiSelectedIds = [],
  photorealMode = false,
  onSelect,
  onDoubleClickItem,
  doorsOpen,
  xrayMode,
  cameraPreset,
  onMoveItem,
  draggedLibraryItem,
  onDropLibraryItem,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const dragPreviewGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Toggle whether dragging directly on a module moves it or if modules are locked
  const [dragModulesEnabled, setDragModulesEnabled] = useState<boolean>(true);
  const [isDraggingItem, setIsDraggingItem] = useState<boolean>(false);

  // Interactive 3D Drag state for moving placed modules/obstacles across walls
  const dragStateRef = useRef<{
    active: boolean;
    hasMoved: boolean;
    id: string;
    kind: 'module' | 'obstacle';
    category?: 'lower' | 'upper' | 'tall' | 'anthresole';
    itemWidth: number;
    itemHeight: number;
    wall: 'center' | 'left' | 'right';
    grabOffsetAlongWallMm: number;
    currentPositionX: number;
    currentElevationY: number;
  } | null>(null);

  const onMoveItemRef = useRef(onMoveItem);
  useEffect(() => {
    onMoveItemRef.current = onMoveItem;
  }, [onMoveItem]);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const onDoubleClickItemRef = useRef(onDoubleClickItem);
  useEffect(() => {
    onDoubleClickItemRef.current = onDoubleClickItem;
  }, [onDoubleClickItem]);

  const clickTrackerRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const sceneDataRef = useRef(scene);
  useEffect(() => {
    sceneDataRef.current = scene;
  }, [scene]);

  // Configure raycaster so it never matches LineSegments with 1m threshold
  useEffect(() => {
    raycasterRef.current.params.Line = { threshold: 0.0001 };
    raycasterRef.current.params.Points = { threshold: 0.0001 };
  }, []);

  // Initialize Three.js WebGL scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 50);
    camera.position.set(2.4, 2.0, 3.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    // Studio IBL environment map for realistic PBR reflections in Photoreal mode
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    threeScene.environment = envTex;
    pmremGenerator.dispose();

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.05, 0);
    controls.minDistance = 0.8;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.03;
    controls.update();
    controlsRef.current = controls;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0xcbd5e1, 0.45);
    hemiLight.position.set(0, 4, 0);
    threeScene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
    dirLight.position.set(3.2, 4.8, 4.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    const d = 3.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    threeScene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    fillLight.position.set(-3.0, 2.2, 2.5);
    threeScene.add(fillLight);

    const contentGroup = new THREE.Group();
    threeScene.add(contentGroup);
    contentGroupRef.current = contentGroup;

    const dragPreviewGroup = new THREE.Group();
    dragPreviewGroup.visible = false;
    threeScene.add(dragPreviewGroup);
    dragPreviewGroupRef.current = dragPreviewGroup;

    let animFrameId = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(threeScene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Camera presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetY = scene.mode === 'wardrobe' ? (scene.wardrobe.height * MM_TO_M) / 2 : 1.15;
    controls.target.set(0, targetY, 0);

    if (cameraPreset === 'front') {
      camera.position.set(0, targetY, 4.2);
    } else if (cameraPreset === 'top') {
      camera.position.set(0, 4.8, 0.01);
    } else if (cameraPreset === 'left') {
      camera.position.set(-3.8, targetY + 0.3, 1.8);
    } else if (cameraPreset === 'right') {
      camera.position.set(3.8, targetY + 0.3, 1.8);
    } else {
      camera.position.set(2.3, targetY + 0.85, 3.7);
    }
    controls.update();
  }, [cameraPreset, scene.mode]);

  // Rebuild 3D meshes whenever scene, selection, doorsOpen, xrayMode, or photorealMode changes
  useEffect(() => {
    const group = contentGroupRef.current;
    if (!group) return;

    GLOBAL_SUPPRESS_EDGES = Boolean(photorealMode && !xrayMode);
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(photorealMode ? 0xe5e7eb : 0xf1f5f9);
      (sceneRef.current as any).environmentIntensity = photorealMode ? 0.85 : 0.35;
    }
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = photorealMode ? 1.15 : 1.06;
    }

    // Dispose old geometries & materials
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    group.clear();

    const matCfg = scene.materials;

    const makeMaterial = (
      hex: string,
      roughness = 0.5,
      metalness = 0.05,
      isHighlighted = false,
      forceOpacity?: number
    ) => {
      const transparent = xrayMode || (forceOpacity !== undefined && forceOpacity < 1);
      const opacity = forceOpacity !== undefined ? forceOpacity : xrayMode ? 0.22 : 1.0;
      const effectiveRoughness = photorealMode ? Math.max(0.14, roughness * 0.68) : roughness;
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: effectiveRoughness,
        metalness,
        transparent,
        opacity,
        depthWrite: !transparent,
        emissive:
          isHighlighted && !photorealMode ? new THREE.Color('#2563eb') : new THREE.Color('#000000'),
        emissiveIntensity: isHighlighted && !photorealMode ? 0.18 : 0,
      });
    };

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee9,
      roughness: 0.16,
      metalness: 0.9,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f19,
      roughness: 0.08,
      metalness: 0.35,
    });
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.04,
      metalness: 0.95,
    });

    // Room Floor & Reference Grid (marked ignoreRaycast so OrbitControls works everywhere on floor/walls)
    const roomW =
      scene.mode === 'wardrobe'
        ? Math.max(3000, scene.wardrobe.width + 1000)
        : scene.kitchen.wallCenterLength;
    const roomH =
      scene.mode === 'wardrobe'
        ? Math.max(2650, scene.wardrobe.height + 250)
        : scene.kitchen.roomHeight;
    const leftWallLen =
      scene.mode === 'kitchen' &&
      (scene.kitchen.layoutType === 'l_left' || scene.kitchen.layoutType === 'u_shape')
        ? scene.kitchen.wallLeftLength || 2000
        : 1200;
    const rightWallLen =
      scene.mode === 'kitchen' &&
      (scene.kitchen.layoutType === 'l_right' || scene.kitchen.layoutType === 'u_shape')
        ? scene.kitchen.wallRightLength || 2000
        : 1200;
    const roomD = Math.max(2400, leftWallLen + 400, rightWallLen + 400);

    const floorGeom = new THREE.PlaneGeometry((roomW + 1000) * MM_TO_M, roomD * MM_TO_M);
    const floorMat = new THREE.MeshStandardMaterial({
      color: photorealMode ? 0xd6d3d1 : 0xe2e8f0,
      roughness: photorealMode ? 0.45 : 0.85,
      metalness: photorealMode ? 0.06 : 0.02,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, -0.001, (roomD * MM_TO_M) / 2);
    floorMesh.receiveShadow = true;
    floorMesh.userData.ignoreRaycast = true;
    group.add(floorMesh);

    if (!photorealMode) {
      const grid = new THREE.GridHelper(
        Math.max(4, (roomW + 1000) * MM_TO_M),
        Math.round(Math.max(4, (roomW + 1000) * MM_TO_M) * 2),
        0x94a3b8,
        0xcbd5e1
      );
      grid.position.set(0, 0, (roomD * MM_TO_M) / 2);
      grid.userData.ignoreRaycast = true;
      grid.raycast = () => {};
      group.add(grid);
    }

    // Back Wall aligned flush along z = 0 (rear boundary of reference grid)
    const backWallZ = 0; // mm
    const startX = -roomW / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      metalness: 0.0,
    });
    const backWall = createBoxWithEdges(roomW + 200, roomH, 40, wallMat, 0x94a3b8, 0.25, true);
    backWall.position.set(0, (roomH / 2) * MM_TO_M, -0.02);
    group.add(backWall);

    // Left Wall if L-left or U-shape
    if (
      scene.mode === 'kitchen' &&
      (scene.kitchen.layoutType === 'l_left' || scene.kitchen.layoutType === 'u_shape')
    ) {
      const lLen = scene.kitchen.wallLeftLength || 2000;
      const leftWall = createBoxWithEdges(40, roomH, lLen, wallMat, 0x94a3b8, 0.25, true);
      leftWall.position.set(
        (startX - 20) * MM_TO_M,
        (roomH / 2) * MM_TO_M,
        (backWallZ + lLen / 2) * MM_TO_M
      );
      group.add(leftWall);
    }

    // Right Wall if L-right or U-shape
    if (
      scene.mode === 'kitchen' &&
      (scene.kitchen.layoutType === 'l_right' || scene.kitchen.layoutType === 'u_shape')
    ) {
      const rLen = scene.kitchen.wallRightLength || 2000;
      const rightWall = createBoxWithEdges(40, roomH, rLen, wallMat, 0x94a3b8, 0.25, true);
      rightWall.position.set(
        (startX + roomW + 20) * MM_TO_M,
        (roomH / 2) * MM_TO_M,
        (backWallZ + rLen / 2) * MM_TO_M
      );
      group.add(rightWall);
    }

    if (scene.mode === 'wardrobe') {
      // ============================================================
      // WARDROBE / DRESSING ROOM 3D BUILDER
      // ============================================================
      const w = scene.wardrobe;
      const t = w.thickness || 16;
      const wStartX = -w.width / 2;
      const wStartZ = backWallZ;

      const carcassMat = makeMaterial(matCfg.carcassColor, 0.5, 0.04, false);
      const facadeMat = makeMaterial(
        matCfg.facadeLowerColor,
        0.42,
        0.05,
        false,
        doorsOpen ? 0.25 : undefined
      );
      const hdfMaterial = makeMaterial('#E5E7EB', 0.8, 0.0);

      // Left outer side
      if (w.hasLeftSide) {
        const leftPanel = createBoxWithEdges(t, w.height, w.depth, carcassMat);
        leftPanel.position.set(
          (wStartX + t / 2) * MM_TO_M,
          (w.height / 2) * MM_TO_M,
          (wStartZ + w.depth / 2) * MM_TO_M
        );
        group.add(leftPanel);
      }

      // Right outer side
      if (w.hasRightSide) {
        const rightPanel = createBoxWithEdges(t, w.height, w.depth, carcassMat);
        rightPanel.position.set(
          (wStartX + w.width - t / 2) * MM_TO_M,
          (w.height / 2) * MM_TO_M,
          (wStartZ + w.depth / 2) * MM_TO_M
        );
        group.add(rightPanel);
      }

      const innerSpanW = w.width - (w.hasLeftSide ? t : 0) - (w.hasRightSide ? t : 0);
      const innerCenterX =
        wStartX + (w.hasLeftSide ? t : 0) + innerSpanW / 2;

      // Roof
      if (w.hasRoof) {
        const roof = createBoxWithEdges(innerSpanW, t, w.depth, carcassMat);
        roof.position.set(
          innerCenterX * MM_TO_M,
          (w.height - t / 2) * MM_TO_M,
          (wStartZ + w.depth / 2) * MM_TO_M
        );
        group.add(roof);
      }

      // Bottom & Plinth
      const bottomY = w.plinthHeight;
      if (w.hasBottom) {
        const bottom = createBoxWithEdges(innerSpanW, t, w.depth, carcassMat);
        bottom.position.set(
          innerCenterX * MM_TO_M,
          (bottomY + t / 2) * MM_TO_M,
          (wStartZ + w.depth / 2) * MM_TO_M
        );
        group.add(bottom);
      }

      if (w.plinthHeight > 0) {
        const plinth = createBoxWithEdges(innerSpanW, w.plinthHeight, t, carcassMat);
        plinth.position.set(
          innerCenterX * MM_TO_M,
          (w.plinthHeight / 2) * MM_TO_M,
          (wStartZ + w.depth - 35) * MM_TO_M
        );
        group.add(plinth);
      }

      // Back HDF
      if (w.hasBackHDF) {
        const hdf = createBoxWithEdges(w.width - 4, w.height - w.plinthHeight - 4, 3, hdfMaterial);
        hdf.position.set(
          0,
          (w.plinthHeight + (w.height - w.plinthHeight) / 2) * MM_TO_M,
          (wStartZ + 2) * MM_TO_M
        );
        group.add(hdf);
      }

      // Sections & Dividers
      let cursorX = wStartX + (w.hasLeftSide ? t : 0);
      const secBottomY = bottomY + (w.hasBottom ? t : 0);
      const secTopY = w.height - (w.hasRoof ? t : 0);
      const secH = Math.max(200, secTopY - secBottomY);
      const internalDepth = w.depth - (w.doorType === 'sliding' ? 95 : 15);

      w.sections.forEach((sec: WardrobeSection, idx: number) => {
        const isSelected = selectedId === sec.id;
        const secMat = makeMaterial(matCfg.carcassColor, 0.5, 0.04, isSelected);
        const secGroup = new THREE.Group();
        secGroup.userData = { selectableId: sec.id, selectableKind: 'section' };

        const secW = sec.width;
        const secCenterX = cursorX + secW / 2;

        // Selection highlight frame for section
        if (isSelected) {
          const hlGeom = new THREE.BoxGeometry(
            secW * MM_TO_M,
            secH * MM_TO_M,
            internalDepth * MM_TO_M
          );
          const hlEdges = createEdgeLines(hlGeom, 0x2563eb, 0.95);
          hlEdges.position.set(
            secCenterX * MM_TO_M,
            (secBottomY + secH / 2) * MM_TO_M,
            (wStartZ + internalDepth / 2) * MM_TO_M
          );
          secGroup.add(hlEdges);
        }

        // Drawers stack at bottom of section
        const drCount = sec.drawersCount || 0;
        const drH = sec.drawerHeight || 180;
        const totalDrawersHeight = drCount * drH;

        for (let d = 0; d < drCount; d++) {
          const dCenterY = secBottomY + d * drH + drH / 2;
          const pullOutOffset = doorsOpen ? 160 : 0;

          const drBox = createBoxWithEdges(
            secW - 6,
            drH - 6,
            internalDepth - 30,
            makeMaterial(matCfg.facadeLowerColor, 0.45, 0.05, isSelected)
          );
          drBox.position.set(
            secCenterX * MM_TO_M,
            dCenterY * MM_TO_M,
            (wStartZ + (internalDepth - 30) / 2 + 15 + pullOutOffset) * MM_TO_M
          );
          secGroup.add(drBox);

          // Handle on drawer
          const handle = createBoxWithEdges(128, 10, 18, darkMetalMat);
          handle.position.set(
            secCenterX * MM_TO_M,
            dCenterY * MM_TO_M,
            (wStartZ + internalDepth + pullOutOffset) * MM_TO_M
          );
          secGroup.add(handle);
        }

        if (drCount > 0) {
          const coverShelf = createBoxWithEdges(secW, t, internalDepth, secMat);
          coverShelf.position.set(
            secCenterX * MM_TO_M,
            (secBottomY + totalDrawersHeight + t / 2) * MM_TO_M,
            (wStartZ + internalDepth / 2) * MM_TO_M
          );
          secGroup.add(coverShelf);
        }

        // Remaining height for shelves & rods
        const availStartY = secBottomY + totalDrawersHeight + (drCount > 0 ? t : 0);
        const availH = Math.max(100, secTopY - availStartY);

        if (sec.shelvesCount > 0) {
          const step = availH / (sec.shelvesCount + 1);
          for (let s = 1; s <= sec.shelvesCount; s++) {
            const shelfY = availStartY + s * step;
            const shelf = createBoxWithEdges(secW, t, internalDepth, secMat);
            shelf.position.set(
              secCenterX * MM_TO_M,
              shelfY * MM_TO_M,
              (wStartZ + internalDepth / 2) * MM_TO_M
            );
            secGroup.add(shelf);
          }
        }

        // Top Rod / Pantograph
        if (sec.hasRodTop || sec.hasPantograph) {
          const rodY = secTopY - (sec.hasPantograph ? 340 : 280);
          const rodGeom = new THREE.CylinderGeometry(
            0.012,
            0.012,
            (secW - 8) * MM_TO_M,
            16
          );
          rodGeom.rotateZ(Math.PI / 2);
          const rodMesh = new THREE.Mesh(rodGeom, chromeMat);
          rodMesh.position.set(
            secCenterX * MM_TO_M,
            rodY * MM_TO_M,
            (wStartZ + internalDepth * 0.55) * MM_TO_M
          );
          secGroup.add(rodMesh);
        }

        // Mid Rod
        if (sec.hasRodMid) {
          const rodY = availStartY + availH * 0.46;
          const rodGeom = new THREE.CylinderGeometry(
            0.012,
            0.012,
            (secW - 8) * MM_TO_M,
            16
          );
          rodGeom.rotateZ(Math.PI / 2);
          const rodMesh = new THREE.Mesh(rodGeom, chromeMat);
          rodMesh.position.set(
            secCenterX * MM_TO_M,
            rodY * MM_TO_M,
            (wStartZ + internalDepth * 0.55) * MM_TO_M
          );
          secGroup.add(rodMesh);
        }

        // Shoe rack
        if (sec.hasShoeRack) {
          const rackY = availStartY + 140;
          const rack = createBoxWithEdges(secW - 16, 45, internalDepth - 60, chromeMat);
          rack.position.set(
            secCenterX * MM_TO_M,
            rackY * MM_TO_M,
            (wStartZ + internalDepth * 0.5) * MM_TO_M
          );
          rack.rotation.x = 0.18;
          secGroup.add(rack);
        }

        // Invisible clickable proxy for selecting section easily
        const hitGeom = new THREE.BoxGeometry(
          secW * MM_TO_M,
          secH * MM_TO_M,
          internalDepth * MM_TO_M
        );
        const hitMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const hitMesh = new THREE.Mesh(hitGeom, hitMat);
        hitMesh.position.set(
          secCenterX * MM_TO_M,
          (secBottomY + secH / 2) * MM_TO_M,
          (wStartZ + internalDepth / 2) * MM_TO_M
        );
        secGroup.add(hitMesh);

        group.add(secGroup);

        cursorX += secW;

        // Vertical partition after section (except last)
        if (idx < w.sections.length - 1) {
          const divider = createBoxWithEdges(t, secH, internalDepth, carcassMat);
          divider.position.set(
            (cursorX + t / 2) * MM_TO_M,
            (secBottomY + secH / 2) * MM_TO_M,
            (wStartZ + internalDepth / 2) * MM_TO_M
          );
          group.add(divider);
          cursorX += t;
        }
      });

      // Wardrobe Outer Doors (Swing or Sliding)
      if (w.doorType === 'swing' && !xrayMode) {
        let dCursorX = wStartX + (w.hasLeftSide ? t : 0);
        const doorH = w.height - w.plinthHeight - 4;
        const doorCenterY = w.plinthHeight + doorH / 2;

        w.sections.forEach((sec) => {
          const doorCount = sec.width > 620 ? 2 : 1;
          const singleW = (sec.width - 4) / doorCount;
          for (let d = 0; d < doorCount; d++) {
            const pivotGroup = new THREE.Group();
            const isLeftHinge = d === 0;
            const hingeX = isLeftHinge
              ? dCursorX + 2
              : dCursorX + sec.width - 2;
            pivotGroup.position.set(
              hingeX * MM_TO_M,
              doorCenterY * MM_TO_M,
              (wStartZ + w.depth + t / 2) * MM_TO_M
            );

            const doorPanel = createBoxWithEdges(singleW - 2, doorH, t, facadeMat);
            doorPanel.position.set(
              (isLeftHinge ? singleW / 2 : -singleW / 2) * MM_TO_M,
              0,
              0
            );
            pivotGroup.add(doorPanel);

            // Vertical long handle at ergonomic waist height
            const handle = createBoxWithEdges(10, 260, 18, darkMetalMat);
            handle.position.set(
              (isLeftHinge ? singleW - 35 : -singleW + 35) * MM_TO_M,
              -doorH * 0.08 * MM_TO_M,
              (t / 2 + 10) * MM_TO_M
            );
            pivotGroup.add(handle);

            if (doorsOpen) {
              pivotGroup.rotation.y = isLeftHinge ? -Math.PI * 0.42 : Math.PI * 0.42;
            }
            group.add(pivotGroup);
          }
          dCursorX += sec.width + t;
        });
      } else if (w.doorType === 'sliding' && !xrayMode) {
        const doorsCount = Math.max(2, w.slidingDoorsCount || 2);
        const doorW = (innerSpanW + (doorsCount - 1) * 26) / doorsCount;
        const doorH = secH - 16;
        const doorCenterY = secBottomY + secH / 2;

        for (let d = 0; d < doorsCount; d++) {
          const isMirror = Boolean(w.mirrorDoors?.[d]);
          const trackOffsetZ = d % 2 === 0 ? w.depth - 25 : w.depth - 55;
          const basePosX =
            wStartX +
            (w.hasLeftSide ? t : 0) +
            d * ((innerSpanW - doorW) / Math.max(1, doorsCount - 1)) +
            doorW / 2;
          const openShift = doorsOpen && d === 0 ? (innerSpanW / doorsCount) * 0.75 : 0;

          const dMat = isMirror ? mirrorMat : facadeMat;
          const doorGroup = createBoxWithEdges(doorW, doorH, 16, dMat, 0x475569, 0.7);
          doorGroup.position.set(
            (basePosX + openShift) * MM_TO_M,
            doorCenterY * MM_TO_M,
            (wStartZ + trackOffsetZ) * MM_TO_M
          );
          group.add(doorGroup);
        }
      }
    } else {
      // ============================================================
      // KITCHEN 3D BUILDER (Multi-Wall + 512mm Depth + Deep Sink + Handles)
      // ============================================================
      const k = scene.kitchen;
      const t = matCfg.carcassThickness || 16;
      const plinthH = k.plinthHeight || 100;
      const wtThick = k.worktopThickness || 38;
      const wallGap = k.wallGapMm ?? 45;        // 45 mm gap from wall to lower HDF
      const hdfThick = k.hdfThicknessMm ?? 3;   // 3 mm HDF
      const worktopDepth = k.worktopDepthMm ?? 600; // 600 mm worktop (gives 40mm overhang over 560mm carcass)
      const plinthSetback = k.plinthSetbackMm ?? 80; // 80 mm setback from front of lower modules

      // Backsplash on active walls
      if (k.hasBacksplash) {
        const bsHeight = Math.max(450, k.upperElevation - (plinthH + 720 + wtThick));
        const bsCenterY = plinthH + 720 + wtThick + bsHeight / 2;
        const bsMat = makeMaterial(matCfg.backsplashColor, 0.25, 0.08);

        const bsCenter = createBoxWithEdges(roomW, bsHeight, 8, bsMat, 0x94a3b8, 0.3, true);
        bsCenter.position.set(0, bsCenterY * MM_TO_M, (backWallZ + 4) * MM_TO_M);
        bsCenter.userData = { selectableId: 'backsplash', selectableKind: 'backsplash' };
        group.add(bsCenter);

        if (k.layoutType === 'l_left' || k.layoutType === 'u_shape') {
          const lLen = k.wallLeftLength || 2000;
          const bsLeft = createBoxWithEdges(8, bsHeight, lLen, bsMat, 0x94a3b8, 0.3, true);
          bsLeft.position.set(
            (startX + 4) * MM_TO_M,
            bsCenterY * MM_TO_M,
            (backWallZ + lLen / 2) * MM_TO_M
          );
          bsLeft.userData = { selectableId: 'backsplash', selectableKind: 'backsplash' };
          group.add(bsLeft);
        }

        if (k.layoutType === 'l_right' || k.layoutType === 'u_shape') {
          const rLen = k.wallRightLength || 2000;
          const bsRight = createBoxWithEdges(8, bsHeight, rLen, bsMat, 0x94a3b8, 0.3, true);
          bsRight.position.set(
            (startX + roomW - 4) * MM_TO_M,
            bsCenterY * MM_TO_M,
            (backWallZ + rLen / 2) * MM_TO_M
          );
          bsRight.userData = { selectableId: 'backsplash', selectableKind: 'backsplash' };
          group.add(bsRight);
        }
      }

      // Render Room Obstacles (Gas boiler, Radiator, Window, Door, Vent shaft, Partition Wall, Column)
      k.obstacles.forEach((obs: RoomObstacleItem) => {
        const isSelected = selectedId === obs.id;
        const obsGroup = new THREE.Group();
        obsGroup.userData = { selectableId: obs.id, selectableKind: 'obstacle' };

        const obsWall = obs.wall || 'center';
        const localCenterX = obs.width / 2;
        const centerY = obs.elevationY + obs.height / 2;
        const localCenterZ = obs.depth / 2;

        if (obs.type === 'gas_boiler') {
          const body = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#F8FAFC', 0.3, 0.1, isSelected)
          );
          body.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            localCenterZ * MM_TO_M
          );
          obsGroup.add(body);

          const panel = createBoxWithEdges(160, 70, 10, darkMetalMat);
          panel.position.set(
            localCenterX * MM_TO_M,
            (obs.elevationY + 120) * MM_TO_M,
            (obs.depth + 4) * MM_TO_M
          );
          obsGroup.add(panel);

          const pipeGeom = new THREE.CylinderGeometry(0.055, 0.055, 0.45, 16);
          const pipe = new THREE.Mesh(pipeGeom, chromeMat);
          pipe.position.set(
            localCenterX * MM_TO_M,
            (obs.elevationY + obs.height + 220) * MM_TO_M,
            localCenterZ * MM_TO_M
          );
          obsGroup.add(pipe);
        } else if (obs.type === 'window') {
          const frame = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#FFFFFF', 0.3, 0.05, isSelected)
          );
          frame.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            (obs.depth / 3) * MM_TO_M
          );
          obsGroup.add(frame);

          const glass = createBoxWithEdges(
            obs.width - 110,
            obs.height - 110,
            20,
            new THREE.MeshStandardMaterial({
              color: 0xbae6fd,
              roughness: 0.1,
              metalness: 0.2,
              transparent: true,
              opacity: 0.65,
            })
          );
          glass.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            (obs.depth / 2 + 8) * MM_TO_M
          );
          obsGroup.add(glass);
        } else if (obs.type === 'door') {
          const frame = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#E2E8F0', 0.5, 0.05, isSelected),
            0x94a3b8,
            0.5
          );
          frame.position.set(localCenterX * MM_TO_M, centerY * MM_TO_M, localCenterZ * MM_TO_M);
          const doorLeaf = createBoxWithEdges(
            obs.width - 80,
            obs.height - 40,
            40,
            makeMaterial('#F8FAFC', 0.4, 0.05, isSelected),
            0x94a3b8,
            0.4
          );
          doorLeaf.position.set(
            localCenterX * MM_TO_M,
            (obs.elevationY + (obs.height - 40) / 2) * MM_TO_M,
            (obs.depth / 2 + 6) * MM_TO_M
          );
          obsGroup.add(frame, doorLeaf);
        } else if (obs.type === 'vent_shaft') {
          const shaft = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#E2E8F0', 0.8, 0.02, isSelected),
            0x64748b,
            0.45
          );
          shaft.position.set(localCenterX * MM_TO_M, centerY * MM_TO_M, localCenterZ * MM_TO_M);
          const grille = createBoxWithEdges(180, 180, 8, darkMetalMat, 0x334155, 0.6);
          grille.position.set(
            localCenterX * MM_TO_M,
            (obs.elevationY + obs.height - 220) * MM_TO_M,
            (obs.depth + 4) * MM_TO_M
          );
          obsGroup.add(shaft, grille);
        } else if (obs.type === 'partition_wall') {
          const partWall = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#F1F5F9', 0.85, 0.02, isSelected),
            0x64748b,
            0.45
          );
          partWall.position.set(localCenterX * MM_TO_M, centerY * MM_TO_M, localCenterZ * MM_TO_M);
          obsGroup.add(partWall);
        } else if (obs.type === 'column') {
          const col = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#E2E8F0', 0.85, 0.02, isSelected),
            0x475569,
            0.45
          );
          col.position.set(localCenterX * MM_TO_M, centerY * MM_TO_M, localCenterZ * MM_TO_M);
          obsGroup.add(col);
        } else if (obs.type === 'radiator') {
          const rad = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#F1F5F9', 0.4, 0.2, isSelected)
          );
          rad.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            localCenterZ * MM_TO_M
          );
          obsGroup.add(rad);
        } else {
          const box = createBoxWithEdges(
            obs.width,
            obs.height,
            obs.depth,
            makeMaterial('#CBD5E1', 0.6, 0.1, isSelected)
          );
          box.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            localCenterZ * MM_TO_M
          );
          obsGroup.add(box);
        }

        placeGroupOnWall(
          obsGroup,
          obsWall,
          obs.positionX,
          obs.width,
          startX,
          backWallZ,
          roomW,
          obs.positionZ || 0
        );
        group.add(obsGroup);
      });

      // Render Kitchen Modules on Center, Left, or Right Wall
      k.modules.forEach((mod: KitchenModuleItem) => {
        const isPrimarySelected = selectedId === mod.id;
        const isMultiSelected = multiSelectedIds.includes(mod.id);
        const isSelected = isPrimarySelected || isMultiSelected;
        const modGroup = new THREE.Group();
        modGroup.userData = { selectableId: mod.id, selectableKind: 'module' };

        const modWall = mod.wall || 'center';
        const modW = mod.width;

        const activeHandleType: HandleKind =
          mod.handleType || scene.materials.defaultHandleType || 'bar';
        const isGola =
          activeHandleType === 'gola' ||
          scene.materials.defaultHandleType === 'gola' ||
          Boolean(k.isGolaProfile);

        // GOLA: lower carcass height is 780 mm (standard is 720 mm)
        const modH =
          isGola && mod.category === 'lower' && (mod.height === 720 || !mod.height)
            ? 780
            : mod.height;
        // Tall columns and deep anthresoles (560mm) become 578mm when GOLA is active
        const modD =
          isGola &&
          (mod.category === 'tall' || (mod.category === 'anthresole' && mod.depth >= 550)) &&
          mod.depth === 560
            ? 578
            : mod.depth;

        const baseElevY =
          mod.category === 'lower' || mod.category === 'tall'
            ? plinthH + mod.elevationY
            : mod.elevationY;

        // Multi-selection wireframe halo (when not in photoreal mode)
        if (isMultiSelected && !isPrimarySelected && !photorealMode) {
          const haloGeom = new THREE.BoxGeometry(
            (modW + 8) * MM_TO_M,
            (modH + 8) * MM_TO_M,
            (modD + 8) * MM_TO_M
          );
          const haloEdges = createEdgeLines(haloGeom, 0x0284c7, 0.95);
          haloEdges.position.set(
            (modW / 2) * MM_TO_M,
            (baseElevY + modH / 2) * MM_TO_M,
            (modD / 2) * MM_TO_M
          );
          modGroup.add(haloEdges);
        }

        // GOLA: lower wall gap is 63 mm (standard is 45 mm)
        const rearGapMm = mod.category === 'lower' ? (isGola ? 63 : wallGap) : 0;
        const rearHdfMm =
          mod.category === 'lower'
            ? hdfThick
            : mod.fillingType !== 'sink' && mod.fillingType !== 'dishwasher'
              ? hdfThick
              : 0;

        // Carcass sides start after rearGap + rearHdf for lower modules so total front is rearGap + rearHdf + modD (45+3+512 = 560mm, or 63+3+512 = 578mm for GOLA)
        const carcassStartZ =
          mod.category === 'lower' ? rearGapMm + rearHdfMm : 0;
        const carcassFrontZ = carcassStartZ + modD; // 560mm (or 578mm for GOLA)

        const localCenterX = modW / 2;
        const centerY = baseElevY + modH / 2;
        const carcassCenterZ = carcassStartZ + modD / 2;

        const isUpper = mod.category === 'upper' || mod.category === 'anthresole';
        const activeFacadeHex =
          mod.customFacadeColor ||
          (isUpper ? matCfg.facadeUpperColor : matCfg.facadeLowerColor);

        const carcassMat = makeMaterial(matCfg.carcassColor, 0.5, 0.04, isSelected);
        const facadeMat = makeMaterial(activeFacadeHex, 0.36, 0.06, isSelected);

        const overhangMm =
          activeHandleType === 'overhang' && isUpper
            ? mod.facadeOverhangMm ?? scene.materials.defaultFacadeOverhangMm ?? 20
            : 0;

        const innerW = Math.max(50, modW - 2 * t);

        // SPECIAL CASE: Floor-standing Built-in Dishwasher (ПМ) -> NO carcass walls, NO bottom, NO top rails, NO back HDF, NO furniture legs!
        if (mod.fillingType === 'dishwasher') {
          const dwTotalH = plinthH + modH - 4;
          const dwBodyD = modD - 20;
          const dwStartZ = carcassStartZ + 10;

          // Recessed lower base of dishwasher behind kitchen plinth
          const dwToeKick = createBoxWithEdges(
            modW - 8,
            plinthH,
            dwBodyD - 65,
            darkMetalMat,
            0x334155,
            0.4
          );
          dwToeKick.position.set(
            localCenterX * MM_TO_M,
            (plinthH / 2) * MM_TO_M,
            (dwStartZ + (dwBodyD - 65) / 2) * MM_TO_M
          );
          modGroup.add(dwToeKick);

          // Main metallic dishwasher housing body (standing from plinthH up to worktop)
          const dwHousing = createBoxWithEdges(
            modW - 6,
            modH - 6,
            dwBodyD,
            makeMaterial('#64748B', 0.32, 0.65, isSelected, xrayMode ? 0.45 : 1.0),
            0x334155,
            0.5
          );
          dwHousing.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + (modH - 6) / 2) * MM_TO_M,
            (dwStartZ + dwBodyD / 2) * MM_TO_M
          );
          modGroup.add(dwHousing);

          // Top edge stainless control panel strip with LED indicators
          const ctrlStrip = createBoxWithEdges(
            modW - 8,
            28,
            24,
            darkMetalMat,
            0x0f172a,
            0.5
          );
          ctrlStrip.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + modH - 16) * MM_TO_M,
            (carcassFrontZ - 10) * MM_TO_M
          );
          const ledDot = createBoxWithEdges(
            36,
            8,
            4,
            new THREE.MeshStandardMaterial({
              color: 0x38bdf8,
              emissive: 0x0284c7,
              emissiveIntensity: 0.8,
            })
          );
          ledDot.position.set(
            (localCenterX - modW * 0.28) * MM_TO_M,
            (baseElevY + modH - 14) * MM_TO_M,
            (carcassFrontZ + 2) * MM_TO_M
          );
          modGroup.add(ctrlStrip, ledDot);

          // Front furniture facade mounted on dishwasher door (pivots downwards from bottom when doorsOpen)
          const dwDoorPivot = new THREE.Group();
          const doorH = modH - 4;
          dwDoorPivot.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + 2) * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const dwFacade = createBoxWithEdges(modW - 4, doorH, t, facadeMat);
          dwFacade.position.set(0, (doorH / 2) * MM_TO_M, 0);
          dwDoorPivot.add(dwFacade);

          // Horizontal handle at the top of the dishwasher facade
          buildFacadeHandle3D({
            targetGroup: dwDoorPivot,
            doorW: modW - 4,
            doorH,
            facadeThickness: t,
            doorCenterX: 0,
            doorCenterY: doorH / 2,
            doorFrontZ: t / 2,
            defaultSide: 'center_top',
            mod: { ...mod, handleOrientation: 'horizontal' },
            scene,
          });

          if (doorsOpen) {
            dwDoorPivot.rotation.x = Math.PI * 0.28;
          }
          modGroup.add(dwDoorPivot);

          // Optional outer side facade cladding on dishwasher if it sits at the end of a run
          if (mod.cladLeftSide || mod.cladRightSide) {
            const cladH = mod.cladSideHeight || modH;
            const cladTopY = baseElevY + modH;
            const cladCenterY = cladTopY - cladH / 2;
            const cladD = mod.category === 'lower' ? carcassFrontZ + t : modD + t;
            if (mod.cladLeftSide) {
              const leftClad = createBoxWithEdges(t, cladH, cladD, facadeMat);
              leftClad.position.set(
                (-t / 2) * MM_TO_M,
                cladCenterY * MM_TO_M,
                (cladD / 2) * MM_TO_M
              );
              modGroup.add(leftClad);
            }
            if (mod.cladRightSide) {
              const rightClad = createBoxWithEdges(t, cladH, cladD, facadeMat);
              rightClad.position.set(
                (modW + t / 2) * MM_TO_M,
                cladCenterY * MM_TO_M,
                (cladD / 2) * MM_TO_M
              );
              modGroup.add(rightClad);
            }
          }

          placeGroupOnWall(
            modGroup,
            modWall,
            mod.positionX,
            modW,
            startX,
            backWallZ,
            roomW,
            mod.positionZ || 0
          );
          group.add(modGroup);
          return;
        }

        // Back HDF (3 mm)
        if (rearHdfMm > 0 && mod.fillingType !== 'sink' && !mod.hasSink) {
          const hdfMat = makeMaterial('#E2E8F0', 0.75, 0.02, isSelected);
          const hdfPanel = createBoxWithEdges(modW - 4, modH - 4, rearHdfMm, hdfMat);
          hdfPanel.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            (rearGapMm + rearHdfMm / 2) * MM_TO_M
          );
          modGroup.add(hdfPanel);
        }

        // Left & Right Carcass Sides
        const leftSide = createBoxWithEdges(t, modH, modD, carcassMat);
        leftSide.position.set(
          (t / 2) * MM_TO_M,
          centerY * MM_TO_M,
          carcassCenterZ * MM_TO_M
        );
        modGroup.add(leftSide);

        const rightSide = createBoxWithEdges(t, modH, modD, carcassMat);
        rightSide.position.set(
          (modW - t / 2) * MM_TO_M,
          centerY * MM_TO_M,
          carcassCenterZ * MM_TO_M
        );
        modGroup.add(rightSide);

        // Outer Side Facade Cladding («Облицевать боковину фасадом»)
        if (mod.cladLeftSide || mod.cladRightSide) {
          const cladH = mod.cladSideHeight || modH;
          const cladTopY = baseElevY + modH;
          const cladCenterY = cladTopY - cladH / 2;
          const cladD = mod.category === 'lower' ? carcassFrontZ + t : modD + t;
          if (mod.cladLeftSide) {
            const leftClad = createBoxWithEdges(t, cladH, cladD, facadeMat);
            leftClad.position.set(
              (-t / 2) * MM_TO_M,
              cladCenterY * MM_TO_M,
              (cladD / 2) * MM_TO_M
            );
            modGroup.add(leftClad);
          }
          if (mod.cladRightSide) {
            const rightClad = createBoxWithEdges(t, cladH, cladD, facadeMat);
            rightClad.position.set(
              (modW + t / 2) * MM_TO_M,
              cladCenterY * MM_TO_M,
              (cladD / 2) * MM_TO_M
            );
            modGroup.add(rightClad);
          }
        }

        // Bottom & Top/Ties
        const bottomPanel = createBoxWithEdges(innerW, t, modD, carcassMat);
        bottomPanel.position.set(
          localCenterX * MM_TO_M,
          (baseElevY + t / 2) * MM_TO_M,
          carcassCenterZ * MM_TO_M
        );
        modGroup.add(bottomPanel);

        const topPanel = createBoxWithEdges(
          innerW,
          t,
          mod.category === 'lower' ? 120 : modD,
          carcassMat
        );
        topPanel.position.set(
          localCenterX * MM_TO_M,
          (baseElevY + modH - t / 2) * MM_TO_M,
          (mod.category === 'lower'
            ? carcassFrontZ - 60
            : carcassCenterZ) * MM_TO_M
        );
        modGroup.add(topPanel);

        // Adjustable legs for lower & tall modules (front legs set back at carcassFrontZ - 85 so plinth stands IN FRONT of legs)
        if ((mod.category === 'lower' || mod.category === 'tall') && plinthH > 0) {
          const legGeom = new THREE.CylinderGeometry(0.016, 0.018, plinthH * MM_TO_M, 10);
          const legOffsets = [
            [45, carcassStartZ + 55],
            [modW - 45, carcassStartZ + 55],
            [45, carcassFrontZ - 85],
            [modW - 45, carcassFrontZ - 85],
          ];
          legOffsets.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, darkMetalMat);
            leg.position.set(lx * MM_TO_M, (plinthH / 2) * MM_TO_M, lz * MM_TO_M);
            modGroup.add(leg);
          });
        }

        // GOLA aluminum profile channels under worktop (L-profile), between drawers (C-profile), and vertical on tall columns
        if (isGola && !xrayMode) {
          const golaColorHex = mod.golaProfileColor || '#1E242B';
          const golaMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(golaColorHex),
            roughness: 0.3,
            metalness: 0.78,
          });
          if (mod.category === 'lower') {
            // Upper L-profile: recessed under worktop along top front of carcass
            const golaTop = createBoxWithEdges(modW - 2, 35, 26, golaMat, 0x0f172a, 0.4);
            golaTop.position.set(
              localCenterX * MM_TO_M,
              (baseElevY + modH - 17.5) * MM_TO_M,
              (carcassFrontZ - 13) * MM_TO_M
            );
            modGroup.add(golaTop);

            // Intermediate C-profile if 2 or 3 drawers
            if (mod.drawersCount >= 2) {
              const midY = baseElevY + modH * 0.52;
              const golaMid = createBoxWithEdges(modW - 2, 45, 26, golaMat, 0x0f172a, 0.4);
              golaMid.position.set(
                localCenterX * MM_TO_M,
                midY * MM_TO_M,
                (carcassFrontZ - 13) * MM_TO_M
              );
              modGroup.add(golaMid);
            }
          } else if (
            mod.category === 'tall' &&
            (mod.verticalGolaType === 'end' || mod.verticalGolaType === 'middle')
          ) {
            const isLeftHinge = (mod.hingeSide || 'left') === 'left';
            const vGolaW = mod.verticalGolaType === 'middle' ? 46 : 28;
            const vGolaX = isLeftHinge ? modW - vGolaW / 2 : vGolaW / 2;
            const vGolaBar = createBoxWithEdges(vGolaW, modH - 4, 26, golaMat, 0x0f172a, 0.4);
            vGolaBar.position.set(
              vGolaX * MM_TO_M,
              centerY * MM_TO_M,
              (carcassFrontZ - 10) * MM_TO_M
            );
            modGroup.add(vGolaBar);
          }
        }

        // Photorealistic warm under-cabinet LED light under upper modules
        if (photorealMode && mod.category === 'upper') {
          const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry((modW - 40) * MM_TO_M, 0.004, 0.018),
            new THREE.MeshStandardMaterial({
              color: 0xfffaeb,
              emissive: 0xfef08a,
              emissiveIntensity: 1.8,
            })
          );
          ledStrip.position.set(
            localCenterX * MM_TO_M,
            (baseElevY - 2) * MM_TO_M,
            (modD * 0.55) * MM_TO_M
          );
          modGroup.add(ledStrip);

          const underLight = new THREE.PointLight(0xfffbeb, 0.38, 0.95);
          underLight.position.set(
            localCenterX * MM_TO_M,
            (baseElevY - 40) * MM_TO_M,
            (modD * 0.55) * MM_TO_M
          );
          modGroup.add(underLight);
        }

        // Internal Shelves
        if (mod.shelvesCount > 0) {
          const step = modH / (mod.shelvesCount + 1);
          for (let s = 1; s <= mod.shelvesCount; s++) {
            const sh = createBoxWithEdges(innerW - 2, t, modD - 20, carcassMat);
            sh.position.set(
              localCenterX * MM_TO_M,
              (baseElevY + s * step) * MM_TO_M,
              (carcassStartZ + (modD - 20) / 2) * MM_TO_M
            );
            modGroup.add(sh);
          }
        }

        // 1) Dish dryer rack inside upper cabinet
        const hasDishDryer = mod.hasDishDryer || mod.fillingType === 'upper_dryer';
        if (hasDishDryer) {
          // Upper rack for plates (with chrome plate slots)
          const dryerTop = createBoxWithEdges(innerW - 4, 18, modD - 35, chromeMat, 0x64748b, 0.4);
          dryerTop.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + modH * 0.62) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );
          modGroup.add(dryerTop);

          const plateSlots = Math.min(10, Math.floor(innerW / 36));
          for (let p = 0; p < plateSlots; p++) {
            const px = localCenterX - ((plateSlots - 1) * 26) / 2 + p * 26;
            const plateGeom = new THREE.CylinderGeometry(0.075, 0.075, 0.005, 16);
            const plateMesh = new THREE.Mesh(plateGeom, makeMaterial('#FFFFFF', 0.2, 0.05));
            plateMesh.rotation.z = Math.PI / 2;
            plateMesh.position.set(
              px * MM_TO_M,
              (baseElevY + modH * 0.62 + 85) * MM_TO_M,
              carcassCenterZ * MM_TO_M
            );
            modGroup.add(plateMesh);
          }

          // Lower rack for cups/glasses
          const dryerBot = createBoxWithEdges(innerW - 4, 16, modD - 35, chromeMat, 0x64748b, 0.4);
          dryerBot.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + 110) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );
          // Removable drip tray (поддон)
          const dripTray = createBoxWithEdges(
            innerW - 8,
            8,
            modD - 30,
            makeMaterial('#F8FAFC', 0.2, 0.05),
            0x94a3b8,
            0.4
          );
          dripTray.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + 85) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );
          modGroup.add(dryerBot, dripTray);
        }

        // 2) Built-in Range Hood inside upper cabinet
        const hasHood = mod.hasHood || mod.fillingType === 'upper_hood';
        if (hasHood) {
          const hoodBodyH = 140;
          const hoodBodyW = innerW - 6;
          const hoodBodyD = modD - 20;

          const hoodBox = createBoxWithEdges(
            hoodBodyW,
            hoodBodyH,
            hoodBodyD,
            darkMetalMat,
            0x475569,
            0.5
          );
          hoodBox.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + hoodBodyH / 2 + 10) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );

          const filterPanel = createBoxWithEdges(
            hoodBodyW - 20,
            8,
            hoodBodyD - 20,
            chromeMat,
            0x94a3b8,
            0.6
          );
          filterPanel.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + 4) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );

          const ductGeom = new THREE.CylinderGeometry(
            0.062,
            0.062,
            Math.max(0.1, (modH - hoodBodyH) * MM_TO_M),
            16
          );
          const duct = new THREE.Mesh(ductGeom, chromeMat);
          duct.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + hoodBodyH + (modH - hoodBodyH) / 2) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );

          const hoodVisor = createBoxWithEdges(
            modW - 10,
            24,
            modD + 40,
            darkMetalMat,
            0x334155,
            0.6
          );
          hoodVisor.position.set(
            localCenterX * MM_TO_M,
            (baseElevY - 12) * MM_TO_M,
            (carcassStartZ + (modD + 40) / 2) * MM_TO_M
          );
          modGroup.add(hoodBox, filterPanel, duct, hoodVisor);
        }

        // 3) Facades, Hardware (Hinges, Gas Lifts, Slides) & Appliances
        const isLowerOven =
          mod.category === 'lower' && (mod.fillingType === 'oven_cooktop' || Boolean(mod.hasOven));
        const isBottleRack =
          mod.fillingType === 'bottle_rack' ||
          (mod.category === 'lower' && mod.width <= 200 && mod.drawersCount === 0);

        if (isBottleRack) {
          // Narrow Bottle Rack / Cargo mechanism
          const pullOut = doorsOpen ? 280 : 0;
          const basketW = Math.max(70, innerW - 14);
          const basketD = modD - 60;

          // Bottom slide runners
          const slideL = createBoxWithEdges(8, 22, basketD, chromeMat);
          slideL.position.set(
            (t + 10) * MM_TO_M,
            (baseElevY + t + 12) * MM_TO_M,
            (carcassStartZ + basketD / 2 + 25) * MM_TO_M
          );
          const slideR = createBoxWithEdges(8, 22, basketD, chromeMat);
          slideR.position.set(
            (modW - t - 10) * MM_TO_M,
            (baseElevY + t + 12) * MM_TO_M,
            (carcassStartZ + basketD / 2 + 25) * MM_TO_M
          );
          modGroup.add(slideL, slideR);

          // Lower bottle wire basket
          const botBasket = createBoxWithEdges(
            basketW,
            90,
            basketD,
            chromeMat,
            0x64748b,
            0.5
          );
          botBasket.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + t + 65) * MM_TO_M,
            (carcassStartZ + basketD / 2 + 30 + pullOut) * MM_TO_M
          );

          // Upper spices wire basket
          const topBasket = createBoxWithEdges(
            basketW,
            70,
            basketD,
            chromeMat,
            0x64748b,
            0.5
          );
          topBasket.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + modH * 0.58) * MM_TO_M,
            (carcassStartZ + basketD / 2 + 30 + pullOut) * MM_TO_M
          );

          // Front narrow facade panel
          const frontPlate = createBoxWithEdges(modW - 4, modH - 4, t, facadeMat);
          frontPlate.position.set(
            localCenterX * MM_TO_M,
            centerY * MM_TO_M,
            (carcassFrontZ + t / 2 + pullOut) * MM_TO_M
          );
          modGroup.add(botBasket, topBasket, frontPlate);

          buildFacadeHandle3D({
            targetGroup: modGroup,
            doorW: modW - 4,
            doorH: modH - 4,
            facadeThickness: t,
            doorCenterX: localCenterX,
            doorCenterY: centerY,
            doorFrontZ: carcassFrontZ + t + pullOut,
            defaultSide: 'center_top',
            mod,
            scene,
          });
        } else if (isLowerOven) {
          // Lower oven module: reinforced shelf + bottom drawer box & slides
          const ovenShelf = createBoxWithEdges(innerW, t, modD, carcassMat);
          ovenShelf.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + 120 + t / 2) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );
          modGroup.add(ovenShelf);

          const bottomFacadeH = 116;
          const dY = baseElevY + 2 + bottomFacadeH / 2;
          const pullOut = doorsOpen ? 140 : 0;
          const facadeZCenter = carcassFrontZ + t / 2 + pullOut;
          const drawerBoxD = modD - 60;
          const drawerBoxW = innerW - 14;

          // Slide rails
          const slideL = createBoxWithEdges(8, 20, drawerBoxD, chromeMat, 0x64748b, 0.4);
          slideL.position.set(
            (t + 5) * MM_TO_M,
            (dY - 10) * MM_TO_M,
            (carcassStartZ + drawerBoxD / 2 + 25) * MM_TO_M
          );
          const slideR = createBoxWithEdges(8, 20, drawerBoxD, chromeMat, 0x64748b, 0.4);
          slideR.position.set(
            (modW - t - 5) * MM_TO_M,
            (dY - 10) * MM_TO_M,
            (carcassStartZ + drawerBoxD / 2 + 25) * MM_TO_M
          );
          modGroup.add(slideL, slideR);

          // Drawer box
          const boxMat = makeMaterial('#CBD5E1', 0.45, 0.1, false, 1.0);
          const boxLeft = createBoxWithEdges(12, 75, drawerBoxD, boxMat, 0x475569, 0.65);
          boxLeft.position.set(
            (localCenterX - drawerBoxW / 2 + 6) * MM_TO_M,
            (dY - 5) * MM_TO_M,
            (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
          );
          const boxRight = createBoxWithEdges(12, 75, drawerBoxD, boxMat, 0x475569, 0.65);
          boxRight.position.set(
            (localCenterX + drawerBoxW / 2 - 6) * MM_TO_M,
            (dY - 5) * MM_TO_M,
            (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
          );
          const boxBack = createBoxWithEdges(drawerBoxW - 24, 75, 12, boxMat, 0x475569, 0.65);
          boxBack.position.set(
            localCenterX * MM_TO_M,
            (dY - 5) * MM_TO_M,
            (carcassFrontZ - drawerBoxD + 6 + pullOut) * MM_TO_M
          );
          const boxBottom = createBoxWithEdges(drawerBoxW, 6, drawerBoxD, boxMat, 0x475569, 0.65);
          boxBottom.position.set(
            localCenterX * MM_TO_M,
            (dY - 38) * MM_TO_M,
            (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
          );
          modGroup.add(boxLeft, boxRight, boxBack, boxBottom);

          const bottomFacade = createBoxWithEdges(modW - 4, bottomFacadeH, t, facadeMat);
          bottomFacade.position.set(
            localCenterX * MM_TO_M,
            dY * MM_TO_M,
            facadeZCenter * MM_TO_M
          );
          modGroup.add(bottomFacade);

          buildFacadeHandle3D({
            targetGroup: modGroup,
            doorW: modW - 4,
            doorH: bottomFacadeH,
            facadeThickness: t,
            doorCenterX: localCenterX,
            doorCenterY: dY,
            doorFrontZ: carcassFrontZ + t + pullOut,
            defaultSide: 'center',
            mod,
            scene,
          });
        } else if (mod.drawersCount > 0) {
          // Standard Drawers: Slide rails on carcass + full 3D Drawer Boxes with auto-clamped depth + optional Inner Hidden Drawer
          const drCount = mod.drawersCount;
          const availH = modH - 4;
          const singleH = (availH - (drCount - 1) * 3) / drCount;
          const effectiveDrDepth = resolveEffectiveDrawerDepth(modD, mod.drawerDepth, 500);
          const drawerBoxD = Math.min(modD - 25, effectiveDrDepth);
          const drawerBoxW = innerW - 14;
          const hasInnerTopDrawer =
            Boolean(mod.hasInnerDrawer) || mod.fillingType === 'drawers_2_inner';

          const sysType = mod.drawerSystemType || 'concealed';
          const sideBoxColor =
            sysType === 'tandembox'
              ? '#475569'
              : sysType === 'metabox'
                ? '#94A3B8'
                : '#CBD5E1';

          for (let d = 0; d < drCount; d++) {
            const isTopDrawerWithInner = d === drCount - 1 && hasInnerTopDrawer;
            let currentSingleH = singleH;
            let dY = baseElevY + 2 + d * (singleH + 3) + singleH / 2;
            if (drCount === 3) {
              if (d === 0) {
                currentSingleH = 356;
                dY = baseElevY + 2 + 356 / 2;
              } else if (d === 1) {
                currentSingleH = 176;
                dY = baseElevY + 2 + 356 + 3 + 176 / 2;
              } else {
                currentSingleH = 176;
                dY = baseElevY + 2 + 356 + 3 + 176 + 3 + 176 / 2;
              }
            }
            const pullOut = doorsOpen ? 210 - d * 25 : 0;
            const facadeZCenter = carcassFrontZ + t / 2 + pullOut;

            // Slide runner rails on inner carcass walls
            const slideRailL = createBoxWithEdges(8, 22, drawerBoxD, chromeMat, 0x475569, 0.65);
            slideRailL.position.set(
              (t + 5) * MM_TO_M,
              (dY - currentSingleH * 0.28) * MM_TO_M,
              (carcassFrontZ - drawerBoxD / 2) * MM_TO_M
            );
            const slideRailR = createBoxWithEdges(8, 22, drawerBoxD, chromeMat, 0x475569, 0.65);
            slideRailR.position.set(
              (modW - t - 5) * MM_TO_M,
              (dY - currentSingleH * 0.28) * MM_TO_M,
              (carcassFrontZ - drawerBoxD / 2) * MM_TO_M
            );
            modGroup.add(slideRailL, slideRailR);

            // Outer Drawer Box (if top drawer has an inner hidden drawer, the outer box is lower so the inner drawer fits above it)
            const boxSideH = isTopDrawerWithInner
              ? Math.min(95, currentSingleH * 0.36)
              : Math.min(145, Math.max(70, currentSingleH * 0.62));
            const boxMat = makeMaterial(sideBoxColor, 0.4, 0.18, false, 1.0);

            const boxLeft = createBoxWithEdges(12, boxSideH, drawerBoxD, boxMat, 0x475569, 0.65);
            boxLeft.position.set(
              (localCenterX - drawerBoxW / 2 + 6) * MM_TO_M,
              (dY - currentSingleH / 2 + boxSideH / 2 + 8) * MM_TO_M,
              (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
            );
            const boxRight = createBoxWithEdges(12, boxSideH, drawerBoxD, boxMat, 0x475569, 0.65);
            boxRight.position.set(
              (localCenterX + drawerBoxW / 2 - 6) * MM_TO_M,
              (dY - currentSingleH / 2 + boxSideH / 2 + 8) * MM_TO_M,
              (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
            );
            const boxBack = createBoxWithEdges(
              drawerBoxW - 24,
              boxSideH,
              12,
              boxMat,
              0x475569,
              0.65
            );
            boxBack.position.set(
              localCenterX * MM_TO_M,
              (dY - currentSingleH / 2 + boxSideH / 2 + 8) * MM_TO_M,
              (carcassFrontZ - drawerBoxD + 6 + pullOut) * MM_TO_M
            );
            const boxBottom = createBoxWithEdges(
              drawerBoxW,
              6,
              drawerBoxD,
              makeMaterial('#94A3B8', 0.6, 0.05, false, 1.0),
              0x475569,
              0.65
            );
            boxBottom.position.set(
              localCenterX * MM_TO_M,
              (dY - currentSingleH / 2 + 8) * MM_TO_M,
              (carcassFrontZ - drawerBoxD / 2 + pullOut) * MM_TO_M
            );
            modGroup.add(boxLeft, boxRight, boxBack, boxBottom);

            // Inner Hidden Drawer behind the top facade («Внутренний ящик за верхним фасадом», default depth 450 mm)
            if (isTopDrawerWithInner) {
              const innerDrDepth = resolveEffectiveDrawerDepth(
                modD,
                mod.innerDrawerDepth,
                450
              );
              const inBoxD = Math.min(modD - 35, innerDrDepth);
              const inPullOut = doorsOpen ? 105 : 0;
              const inBoxH = 82;
              const inY = dY + currentSingleH * 0.18;

              const inRailL = createBoxWithEdges(8, 18, inBoxD, chromeMat, 0x475569, 0.65);
              inRailL.position.set(
                (t + 5) * MM_TO_M,
                (inY - 18) * MM_TO_M,
                (carcassFrontZ - inBoxD / 2 - 18) * MM_TO_M
              );
              const inRailR = createBoxWithEdges(8, 18, inBoxD, chromeMat, 0x475569, 0.65);
              inRailR.position.set(
                (modW - t - 5) * MM_TO_M,
                (inY - 18) * MM_TO_M,
                (carcassFrontZ - inBoxD / 2 - 18) * MM_TO_M
              );
              modGroup.add(inRailL, inRailR);

              const inLeft = createBoxWithEdges(12, inBoxH, inBoxD, boxMat, 0x0284c7, 0.65);
              inLeft.position.set(
                (localCenterX - drawerBoxW / 2 + 6) * MM_TO_M,
                inY * MM_TO_M,
                (carcassFrontZ - inBoxD / 2 - 18 + inPullOut) * MM_TO_M
              );
              const inRight = createBoxWithEdges(12, inBoxH, inBoxD, boxMat, 0x0284c7, 0.65);
              inRight.position.set(
                (localCenterX + drawerBoxW / 2 - 6) * MM_TO_M,
                inY * MM_TO_M,
                (carcassFrontZ - inBoxD / 2 - 18 + inPullOut) * MM_TO_M
              );
              const inBack = createBoxWithEdges(
                drawerBoxW - 24,
                inBoxH,
                12,
                boxMat,
                0x0284c7,
                0.65
              );
              inBack.position.set(
                localCenterX * MM_TO_M,
                inY * MM_TO_M,
                (carcassFrontZ - inBoxD - 12 + inPullOut) * MM_TO_M
              );
              const inFront = createBoxWithEdges(
                drawerBoxW,
                inBoxH + 10,
                16,
                carcassMat,
                0x0284c7,
                0.75
              );
              inFront.position.set(
                localCenterX * MM_TO_M,
                inY * MM_TO_M,
                (carcassFrontZ - 18 + inPullOut) * MM_TO_M
              );
              const inBot = createBoxWithEdges(
                drawerBoxW,
                6,
                inBoxD,
                makeMaterial('#94A3B8', 0.6, 0.05, false, 1.0),
                0x0284c7,
                0.65
              );
              inBot.position.set(
                localCenterX * MM_TO_M,
                (inY - inBoxH / 2 + 3) * MM_TO_M,
                (carcassFrontZ - inBoxD / 2 - 18 + inPullOut) * MM_TO_M
              );
              modGroup.add(inLeft, inRight, inBack, inFront, inBot);
            }

            // Front Facade
            const drFacade = createBoxWithEdges(modW - 4, currentSingleH, t, facadeMat);
            drFacade.position.set(
              localCenterX * MM_TO_M,
              dY * MM_TO_M,
              facadeZCenter * MM_TO_M
            );
            modGroup.add(drFacade);

            buildFacadeHandle3D({
              targetGroup: modGroup,
              doorW: modW - 4,
              doorH: currentSingleH,
              facadeThickness: t,
              doorCenterX: localCenterX,
              doorCenterY: dY,
              doorFrontZ: carcassFrontZ + t + pullOut,
              defaultSide: 'center_top',
              mod,
              scene,
            });
          }
        } else if (mod.fillingType === 'upper_lift_2' || mod.category === 'anthresole') {
          // Lift cabinets & Anthresoles: Facades with Gas Lift Struts
          const liftCount = mod.fillingType === 'upper_lift_2' ? 2 : 1;
          const singleH = (modH - 4 - (liftCount - 1) * 3) / liftCount;

          for (let l = 0; l < liftCount; l++) {
            const extraOverhang = l === 0 ? overhangMm : 0;
            const effectiveDoorH = singleH + extraOverhang;
            const topPivotY = baseElevY + 2 + l * (singleH + 3) + singleH;

            const liftPivot = new THREE.Group();
            liftPivot.position.set(
              localCenterX * MM_TO_M,
              topPivotY * MM_TO_M,
              (carcassFrontZ + t / 2) * MM_TO_M
            );
            const doorPanel = createBoxWithEdges(modW - 4, effectiveDoorH, t, facadeMat);
            doorPanel.position.set(0, (-effectiveDoorH / 2) * MM_TO_M, 0);
            liftPivot.add(doorPanel);

            buildFacadeHandle3D({
              targetGroup: liftPivot,
              doorW: modW - 4,
              doorH: effectiveDoorH,
              facadeThickness: t,
              doorCenterX: 0,
              doorCenterY: -effectiveDoorH / 2,
              doorFrontZ: t / 2,
              defaultSide: 'center_bottom',
              mod,
              scene,
            });

            if (doorsOpen) {
              liftPivot.rotation.x = -Math.PI * 0.35;
            }
            modGroup.add(liftPivot);

            // Gas lift struts on left & right sides
            buildGasLifts3D(
              modGroup,
              innerW,
              localCenterX,
              topPivotY - effectiveDoorH,
              effectiveDoorH,
              carcassCenterZ,
              doorsOpen,
              chromeMat,
              darkMetalMat
            );
          }
        } else if (mod.fillingType === 'tall_fridge') {
          // Built-in Refrigerator Column with 3D Refrigerator unit inside
          const fridgeH = Math.min(1820, Math.max(1680, modH - 240));
          const fridgeW = innerW - 10;
          const fridgeD = modD - 35;
          const hingeOnLeft = (mod.hingeSide || 'right') === 'left';
          const handleSide = hingeOnLeft ? 'right' : 'left';

          // 1) Intermediate shelf above the refrigerator
          const fridgeTopShelf = createBoxWithEdges(innerW, t, modD - 10, carcassMat);
          fridgeTopShelf.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + t + fridgeH + 6 + t / 2) * MM_TO_M,
            carcassCenterZ * MM_TO_M
          );
          modGroup.add(fridgeTopShelf);

          // 2) 3D Refrigerator Appliance Body (semi-transparent so internal compartments are visible)
          const fridgeBody = createBoxWithEdges(
            fridgeW,
            fridgeH,
            fridgeD,
            makeMaterial('#F8FAFC', 0.25, 0.08, false, 0.35),
            0x64748b,
            0.55
          );
          fridgeBody.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + t + fridgeH / 2) * MM_TO_M,
            (carcassStartZ + fridgeD / 2 + 10) * MM_TO_M
          );
          modGroup.add(fridgeBody);

          // 3) Lower Freezer Compartment (height ~700mm) with 3 Drawer Bins
          const freezerH = 700;
          const binH = 185;
          for (let b = 0; b < 3; b++) {
            const binY = baseElevY + t + 25 + b * (binH + 20) + binH / 2;
            const binBox = createBoxWithEdges(
              fridgeW - 24,
              binH,
              fridgeD - 40,
              makeMaterial('#E0F2FE', 0.2, 0.1, false, 0.85),
              0x38bdf8,
              0.55
            );
            binBox.position.set(
              localCenterX * MM_TO_M,
              binY * MM_TO_M,
              (carcassStartZ + fridgeD / 2 + 18) * MM_TO_M
            );
            modGroup.add(binBox);
          }

          // 4) Upper Fresh Cooling Compartment: Glass Shelves, Crisper & LED Light
          const coolingZoneH = fridgeH - freezerH - 20;
          const glassShelfStep = coolingZoneH / 4;
          for (let gs = 1; gs <= 3; gs++) {
            const gy = baseElevY + t + freezerH + gs * glassShelfStep;
            const gShelf = createBoxWithEdges(
              fridgeW - 20,
              6,
              fridgeD - 45,
              makeMaterial('#E0F2FE', 0.1, 0.2, false, 0.65),
              0x0284c7,
              0.5
            );
            gShelf.position.set(
              localCenterX * MM_TO_M,
              gy * MM_TO_M,
              (carcassStartZ + fridgeD / 2 + 15) * MM_TO_M
            );
            const gTrim = createBoxWithEdges(fridgeW - 20, 10, 8, chromeMat);
            gTrim.position.set(
              localCenterX * MM_TO_M,
              gy * MM_TO_M,
              (carcassStartZ + fridgeD - 12) * MM_TO_M
            );
            modGroup.add(gShelf, gTrim);
          }

          // Bottom vegetable crisper drawer
          const crisperH = 130;
          const crisper = createBoxWithEdges(
            fridgeW - 22,
            crisperH,
            fridgeD - 40,
            makeMaterial('#E0F2FE', 0.2, 0.1, false, 0.8),
            0x38bdf8,
            0.5
          );
          crisper.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + t + freezerH + crisperH / 2) * MM_TO_M,
            (carcassStartZ + fridgeD / 2 + 18) * MM_TO_M
          );
          modGroup.add(crisper);

          // Top interior LED light bar
          const ledBar = createBoxWithEdges(fridgeW * 0.45, 12, 40, makeMaterial('#FEF9C3', 0.2, 0.05));
          ledBar.position.set(
            localCenterX * MM_TO_M,
            (baseElevY + t + fridgeH - 15) * MM_TO_M,
            (carcassStartZ + fridgeD / 2 + 10) * MM_TO_M
          );
          modGroup.add(ledBar);

          // 5) Facades: Lower Freezer Facade (716mm) + Upper Cooling Facade + Top Storage Facade
          const freezerDoorH = 716; // Perfectly aligns with adjacent lower kitchen modules!
          const coolingDoorH = Math.min(1080, fridgeH - freezerDoorH);
          const topCompartmentH = modH - freezerDoorH - coolingDoorH - 8;

          // Freezer Door
          const frzPivot = new THREE.Group();
          const frzHingeX = hingeOnLeft ? 2 : modW - 2;
          frzPivot.position.set(
            frzHingeX * MM_TO_M,
            (baseElevY + freezerDoorH / 2 + 2) * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const frzLocalX = hingeOnLeft ? (modW - 4) / 2 : -(modW - 4) / 2;
          const frzPanel = createBoxWithEdges(modW - 4, freezerDoorH, t, facadeMat);
          frzPanel.position.set(frzLocalX * MM_TO_M, 0, 0);
          frzPivot.add(frzPanel);

          buildFacadeHandle3D({
            targetGroup: frzPivot,
            doorW: modW - 4,
            doorH: freezerDoorH,
            facadeThickness: t,
            doorCenterX: frzLocalX,
            doorCenterY: 0,
            doorFrontZ: t / 2,
            defaultSide: handleSide,
            mod,
            scene,
            doorVerticalZone: 'lower_tall',
          });

          if (doorsOpen) {
            frzPivot.rotation.y = hingeOnLeft ? -Math.PI * 0.45 : Math.PI * 0.45;
          }
          modGroup.add(frzPivot);

          buildHinges3D(
            modGroup,
            t,
            modW,
            freezerDoorH,
            baseElevY + 2,
            carcassFrontZ,
            hingeOnLeft ? 'left' : 'right',
            chromeMat,
            darkMetalMat
          );

          // Single Unified Upper Refrigerator Door (covers cooling compartment AND top storage compartment with 1 handle)
          const upperDoorH = modH - freezerDoorH - 6;
          const coolPivot = new THREE.Group();
          coolPivot.position.set(
            frzHingeX * MM_TO_M,
            (baseElevY + freezerDoorH + 4 + upperDoorH / 2) * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const coolPanel = createBoxWithEdges(modW - 4, upperDoorH, t, facadeMat);
          coolPanel.position.set(frzLocalX * MM_TO_M, 0, 0);
          coolPivot.add(coolPanel);

          buildFacadeHandle3D({
            targetGroup: coolPivot,
            doorW: modW - 4,
            doorH: upperDoorH,
            facadeThickness: t,
            doorCenterX: frzLocalX,
            doorCenterY: 0,
            doorFrontZ: t / 2,
            defaultSide: handleSide,
            mod,
            scene,
            doorVerticalZone: 'full_tall',
          });

          if (doorsOpen) {
            coolPivot.rotation.y = hingeOnLeft ? -Math.PI * 0.45 : Math.PI * 0.45;
          }
          modGroup.add(coolPivot);

          buildHinges3D(
            modGroup,
            t,
            modW,
            upperDoorH,
            baseElevY + freezerDoorH + 4,
            carcassFrontZ,
            hingeOnLeft ? 'left' : 'right',
            chromeMat,
            darkMetalMat
          );
        } else if (mod.fillingType === 'tall_oven_micro') {
          // Tall column with Oven & Microwave in middle, doors at bottom & top
          const bottomDoorH = 680;
          const topDoorH = Math.max(300, modH - 680 - 980 - 8);
          const hingeOnLeft = (mod.hingeSide || 'right') === 'left';
          const handleSide = hingeOnLeft ? 'right' : 'left';
          const hingeX = hingeOnLeft ? 2 : modW - 2;
          const localDoorX = hingeOnLeft ? (modW - 4) / 2 : -(modW - 4) / 2;

          const botDoorCenterY = baseElevY + bottomDoorH / 2 + 2;
          const botPivot = new THREE.Group();
          botPivot.position.set(
            hingeX * MM_TO_M,
            botDoorCenterY * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const botDoor = createBoxWithEdges(modW - 4, bottomDoorH, t, facadeMat);
          botDoor.position.set(localDoorX * MM_TO_M, 0, 0);
          botPivot.add(botDoor);

          buildFacadeHandle3D({
            targetGroup: botPivot,
            doorW: modW - 4,
            doorH: bottomDoorH,
            facadeThickness: t,
            doorCenterX: localDoorX,
            doorCenterY: 0,
            doorFrontZ: t / 2,
            defaultSide: handleSide,
            mod,
            scene,
            doorVerticalZone: 'lower_tall',
          });

          if (doorsOpen) {
            botPivot.rotation.y = hingeOnLeft ? -Math.PI * 0.42 : Math.PI * 0.42;
          }
          modGroup.add(botPivot);

          buildHinges3D(
            modGroup,
            t,
            modW,
            bottomDoorH,
            baseElevY + 2,
            carcassFrontZ,
            hingeOnLeft ? 'left' : 'right',
            chromeMat,
            darkMetalMat
          );

          const topDoorCenterY = baseElevY + modH - topDoorH / 2 - 2;
          const topPivot = new THREE.Group();
          topPivot.position.set(
            hingeX * MM_TO_M,
            topDoorCenterY * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const topDoor = createBoxWithEdges(modW - 4, topDoorH, t, facadeMat);
          topDoor.position.set(localDoorX * MM_TO_M, 0, 0);
          topPivot.add(topDoor);

          buildFacadeHandle3D({
            targetGroup: topPivot,
            doorW: modW - 4,
            doorH: topDoorH,
            facadeThickness: t,
            doorCenterX: localDoorX,
            doorCenterY: 0,
            doorFrontZ: t / 2,
            defaultSide: handleSide,
            mod,
            scene,
            doorVerticalZone: 'upper_tall',
          });

          if (doorsOpen) {
            topPivot.rotation.y = hingeOnLeft ? -Math.PI * 0.42 : Math.PI * 0.42;
          }
          modGroup.add(topPivot);

          buildHinges3D(
            modGroup,
            t,
            modW,
            topDoorH,
            baseElevY + modH - topDoorH - 2,
            carcassFrontZ,
            hingeOnLeft ? 'left' : 'right',
            chromeMat,
            darkMetalMat
          );
        } else if (
          mod.fillingType === 'freestanding_dw'
        ) {
          const freeDwH = mod.height || 850;
          const freeDwW = mod.width;
          const freeDwD = modD - 10;
          const freeDwStartZ = carcassStartZ + 10;

          // Toe-kick
          const toeKick = createBoxWithEdges(freeDwW - 8, plinthH, freeDwD - 65, darkMetalMat, 0x334155, 0.4);
          toeKick.position.set(localCenterX * MM_TO_M, (plinthH / 2) * MM_TO_M, (freeDwStartZ + (freeDwD - 65) / 2) * MM_TO_M);
          modGroup.add(toeKick);

          // Stainless steel body
          const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 });
          const body = createBoxWithEdges(freeDwW - 4, freeDwH - plinthH, freeDwD, stainlessMat, 0x475569, 0.5);
          body.position.set(localCenterX * MM_TO_M, (plinthH + (freeDwH - plinthH) / 2) * MM_TO_M, (freeDwStartZ + freeDwD / 2) * MM_TO_M);
          modGroup.add(body);

          // Control panel
          const ctrlPanel = createBoxWithEdges(freeDwW - 10, 50, 12, darkMetalMat, 0x0f172a, 0.6);
          ctrlPanel.position.set(localCenterX * MM_TO_M, (freeDwH - 30) * MM_TO_M, (carcassFrontZ + 2) * MM_TO_M);
          const displayLed = createBoxWithEdges(40, 14, 4, new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9 }));
          displayLed.position.set((localCenterX - freeDwW * 0.25) * MM_TO_M, (freeDwH - 30) * MM_TO_M, (carcassFrontZ + 8) * MM_TO_M);
          modGroup.add(ctrlPanel, displayLed);

          const handleGrip = createBoxWithEdges(Math.min(180, freeDwW * 0.4), 12, 18, darkMetalMat);
          handleGrip.position.set(localCenterX * MM_TO_M, (freeDwH - 70) * MM_TO_M, (carcassFrontZ + 10) * MM_TO_M);
          modGroup.add(handleGrip);

          placeGroupOnWall(modGroup, modWall, mod.positionX, modW, startX, backWallZ, roomW, mod.positionZ || 0);
          if (mod.rotationY) modGroup.rotation.y += (mod.rotationY * Math.PI) / 180;
          group.add(modGroup);
          return;
        } else if (
          mod.fillingType === 'freestanding_washer'
        ) {
          const washerH = mod.height || 850;
          const appWidth = 600; // 600mm washer centered in 650mm opening (leaving 25mm gaps on left & right)
          const appD = 540;
          const appStartZ = carcassStartZ + 15;

          const washerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 });
          const body = createBoxWithEdges(appWidth, washerH - 10, appD, washerMat, 0x64748b, 0.45);
          body.position.set(localCenterX * MM_TO_M, ((washerH - 10) / 2) * MM_TO_M, (appStartZ + appD / 2) * MM_TO_M);
          modGroup.add(body);

          // Circular Drum Glass Window
          const drumGeom = new THREE.CylinderGeometry(0.17, 0.17, 0.025, 32);
          drumGeom.rotateX(Math.PI / 2);
          const drumBezel = new THREE.Mesh(drumGeom, darkMetalMat);
          drumBezel.position.set(localCenterX * MM_TO_M, (washerH * 0.45) * MM_TO_M, (appStartZ + appD + 10) * MM_TO_M);

          const glassInnerGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32);
          glassInnerGeom.rotateX(Math.PI / 2);
          const drumGlass = new THREE.Mesh(
            glassInnerGeom,
            new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              roughness: 0.1,
              metalness: 0.5,
              transparent: true,
              opacity: 0.75,
            })
          );
          drumGlass.position.set(localCenterX * MM_TO_M, (washerH * 0.45) * MM_TO_M, (appStartZ + appD + 12) * MM_TO_M);
          modGroup.add(drumBezel, drumGlass);

          // Detergent Drawer
          const detergentDrawer = createBoxWithEdges(140, 75, 12, makeMaterial('#E2E8F0', 0.4, 0.1), 0x475569, 0.5);
          detergentDrawer.position.set((localCenterX - 180) * MM_TO_M, (washerH - 65) * MM_TO_M, (appStartZ + appD + 5) * MM_TO_M);

          // Rotary Program Dial
          const dialGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.018, 24);
          dialGeom.rotateX(Math.PI / 2);
          const dialMesh = new THREE.Mesh(dialGeom, darkMetalMat);
          dialMesh.position.set((localCenterX + 110) * MM_TO_M, (washerH - 60) * MM_TO_M, (appStartZ + appD + 9) * MM_TO_M);

          // LED Display
          const ledDisplay = createBoxWithEdges(70, 28, 6, new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.8 }));
          ledDisplay.position.set((localCenterX + 200) * MM_TO_M, (washerH - 60) * MM_TO_M, (appStartZ + appD + 4) * MM_TO_M);
          modGroup.add(detergentDrawer, dialMesh, ledDisplay);

          // Lower Filter Door
          const filterDoor = createBoxWithEdges(80, 50, 8, darkMetalMat, 0x475569, 0.5);
          filterDoor.position.set((localCenterX + 180) * MM_TO_M, 40 * MM_TO_M, (appStartZ + appD + 4) * MM_TO_M);
          modGroup.add(filterDoor);

          placeGroupOnWall(modGroup, modWall, mod.positionX, modW, startX, backWallZ, roomW, mod.positionZ || 0);
          if (mod.rotationY) modGroup.rotation.y += (mod.rotationY * Math.PI) / 180;
          group.add(modGroup);
          return;
        } else if (
          mod.fillingType === 'corner_lower' ||
          mod.fillingType === 'upper_corner' ||
          mod.isCorner
        ) {
          // PRO100 Corner module with recessed carcass blind wall + configurable L-shaped corner transition strip (default 50mm = 16 + 34mm) + working door
          const blindOnRight = (mod.hingeSide || 'right') === 'right';
          const defaultBlindW = mod.category === 'upper' ? 350 : (isGola ? 578 : 560);
          const blindCarcassW = Math.max(
            180,
            Math.min(modW - 220, mod.cornerBlindWidth || defaultBlindW)
          );
          const fillerW = Math.max(16, Math.min(180, mod.cornerFillerWidth || 50));
          const totalBlindZoneW = blindCarcassW + fillerW;
          const doorW = Math.max(150, modW - totalBlindZoneW - 4);
          const doorH = modH - 4 + overhangMm;
          const doorCenterY = centerY - overhangMm / 2;

          // 1) Recessed Carcass Blind Panel (Глухая стенка 16 мм) flush with carcass front
          const blindCenterX = blindOnRight
            ? modW - blindCarcassW / 2 - 2
            : blindCarcassW / 2 + 2;
          const blindPanel = createBoxWithEdges(
            blindCarcassW,
            modH - 4,
            t,
            carcassMat
          );
          blindPanel.position.set(
            blindCenterX * MM_TO_M,
            centerY * MM_TO_M,
            (carcassFrontZ - t / 2) * MM_TO_M
          );
          modGroup.add(blindPanel);

          // Vertical spacer strip on the outer edge of the blind panel (matching PRO100.jpg)
          const outerEdgeSpacer = createBoxWithEdges(
            t,
            modH - 4,
            34,
            carcassMat
          );
          outerEdgeSpacer.position.set(
            (blindOnRight ? modW - t / 2 - 4 : t / 2 + 4) * MM_TO_M,
            centerY * MM_TO_M,
            (carcassFrontZ + 17) * MM_TO_M
          );
          modGroup.add(outerEdgeSpacer);

          // 2) L-shaped Corner Transition Strip (50 mm = 16 mm переходное ЛДСП/фасад + 34 мм торцевая планка)
          const fillerCenterX = blindOnRight
            ? modW - blindCarcassW - fillerW / 2
            : blindCarcassW + fillerW / 2;
          const fillerFrontStrip = createBoxWithEdges(fillerW, doorH, t, facadeMat);
          fillerFrontStrip.position.set(
            fillerCenterX * MM_TO_M,
            doorCenterY * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          modGroup.add(fillerFrontStrip);

          // Perpendicular return plank (34 mm) forming the 90-degree corner stop
          const returnPlankX = blindOnRight
            ? modW - blindCarcassW - t / 2
            : blindCarcassW + t / 2;
          const returnPlank = createBoxWithEdges(t, doorH, 34, carcassMat);
          returnPlank.position.set(
            returnPlankX * MM_TO_M,
            doorCenterY * MM_TO_M,
            (carcassFrontZ + 17) * MM_TO_M
          );
          modGroup.add(returnPlank);

          // 3) Working Door (hinged next to the corner transition strip, handle on the outer edge, matching PRO100.jpg)
          const doorPivot = new THREE.Group();
          const hingeX = blindOnRight
            ? modW - totalBlindZoneW - 2
            : totalBlindZoneW + 2;
          doorPivot.position.set(
            hingeX * MM_TO_M,
            doorCenterY * MM_TO_M,
            (carcassFrontZ + t / 2) * MM_TO_M
          );
          const doorPanel = createBoxWithEdges(doorW, doorH, t, facadeMat);
          const doorLocalCenterX = blindOnRight ? -doorW / 2 : doorW / 2;
          doorPanel.position.set(doorLocalCenterX * MM_TO_M, 0, 0);
          doorPivot.add(doorPanel);

          buildFacadeHandle3D({
            targetGroup: doorPivot,
            doorW,
            doorH,
            facadeThickness: t,
            doorCenterX: doorLocalCenterX,
            doorCenterY: 0,
            doorFrontZ: t / 2,
            defaultSide: blindOnRight ? 'left' : 'right',
            mod,
            scene,
          });

          if (doorsOpen) {
            doorPivot.rotation.y = blindOnRight ? Math.PI * 0.42 : -Math.PI * 0.42;
          }
          modGroup.add(doorPivot);

          buildHinges3D(
            doorPivot,
            t,
            doorW,
            doorH,
            0,
            t / 2,
            blindOnRight ? 'left' : 'right',
            chromeMat,
            darkMetalMat
          );
        } else {
          // Standard 1 or 2 swing doors
          const doorsCount =
            mod.fillingType === 'doors_2' ||
            mod.fillingType === 'upper_doors_2' ||
            mod.fillingType === 'upper_dryer' ||
            mod.fillingType === 'upper_hood' ||
            mod.width >= 600
              ? 2
              : 1;
          const singleW = (modW - 4 - (doorsCount - 1) * 3) / doorsCount;
          const doorH = modH - 4 + overhangMm;
          const doorCenterY = centerY - overhangMm / 2;

          for (let d = 0; d < doorsCount; d++) {
            const isLeftHinge =
              doorsCount === 1 ? (mod.hingeSide || 'left') === 'left' : d === 0;
            const pivot = new THREE.Group();
            const hingeX = isLeftHinge ? 2 : modW - 2;
            pivot.position.set(
              hingeX * MM_TO_M,
              doorCenterY * MM_TO_M,
              (carcassFrontZ + t / 2) * MM_TO_M
            );

            const doorLocalCenterX = isLeftHinge ? singleW / 2 : -singleW / 2;
            const doorPanel = createBoxWithEdges(singleW, doorH, t, facadeMat);
            doorPanel.position.set(doorLocalCenterX * MM_TO_M, 0, 0);
            pivot.add(doorPanel);

            buildFacadeHandle3D({
              targetGroup: pivot,
              doorW: singleW,
              doorH,
              facadeThickness: t,
              doorCenterX: doorLocalCenterX,
              doorCenterY: 0,
              doorFrontZ: t / 2,
              defaultSide: isLeftHinge ? 'right' : 'left',
              mod,
              scene,
              doorVerticalZone: mod.category === 'tall' ? 'full_tall' : 'standard',
            });

            if (doorsOpen) {
              pivot.rotation.y = isLeftHinge ? -Math.PI * 0.42 : Math.PI * 0.42;
            }
            modGroup.add(pivot);

            buildHinges3D(
              modGroup,
              t,
              modW,
              doorH,
              baseElevY + 2,
              carcassFrontZ,
              isLeftHinge ? 'left' : 'right',
              chromeMat,
              darkMetalMat
            );
          }
        }

        // Built-in Appliances on Module
        // 1) Realistic 3D Built-In Oven (Духовой шкаф)
        if (mod.hasOven) {
          const ovenY =
            mod.category === 'tall' ? baseElevY + 690 + 295 : baseElevY + 122 + 297;
          const ovenW = modW - 8;
          const ovenH = 592;
          const ovenGroup = new THREE.Group();
          ovenGroup.position.set(
            localCenterX * MM_TO_M,
            ovenY * MM_TO_M,
            (carcassFrontZ + 10) * MM_TO_M
          );

          // Outer stainless/dark bevel trim frame
          const ovenFrame = createBoxWithEdges(ovenW, ovenH, 18, darkMetalMat, 0x334155, 0.5);
          ovenGroup.add(ovenFrame);

          // Top control fascia panel (height 96mm)
          const fasciaY = ovenH / 2 - 48;
          const fascia = createBoxWithEdges(ovenW - 8, 92, 22, glassMat, 0x475569, 0.4);
          fascia.position.set(0, fasciaY * MM_TO_M, 0.002);
          ovenGroup.add(fascia);

          // Glowing digital clock & temperature LED display on fascia
          const ledScreen = createBoxWithEdges(
            110,
            34,
            24,
            new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              emissive: 0x38bdf8,
              emissiveIntensity: 0.45,
            })
          );
          ledScreen.position.set(0, fasciaY * MM_TO_M, 0.003);
          ovenGroup.add(ledScreen);

          // Two retractable rotary knobs on left and right of display
          [-115, 115].forEach((kx) => {
            const knob = new THREE.Mesh(
              new THREE.CylinderGeometry(0.016, 0.016, 0.018, 20),
              chromeMat
            );
            knob.rotation.x = Math.PI / 2;
            knob.position.set(kx * MM_TO_M, fasciaY * MM_TO_M, 0.016);
            ovenGroup.add(knob);
          });

          // Main oven door with triple-glazed dark window & visible warm interior cavity + baking rack
          const doorH = ovenH - 104;
          const doorY = -50;
          const ovenDoorOuter = createBoxWithEdges(ovenW - 8, doorH, 22, glassMat, 0x334155, 0.4);
          ovenDoorOuter.position.set(0, doorY * MM_TO_M, 0.002);
          ovenGroup.add(ovenDoorOuter);

          // Warm lit interior window cavity
          const innerWindow = createBoxWithEdges(
            ovenW - 110,
            doorH - 110,
            24,
            new THREE.MeshStandardMaterial({
              color: 0x27272a,
              emissive: 0xf59e0b,
              emissiveIntensity: 0.22,
              roughness: 0.1,
              metalness: 0.4,
            }),
            0x78350f,
            0.4
          );
          innerWindow.position.set(0, (doorY - 8) * MM_TO_M, 0.003);
          ovenGroup.add(innerWindow);

          // Chrome wire baking rack visible inside window
          const ovenRack = createBoxWithEdges(ovenW - 130, 6, 12, chromeMat);
          ovenRack.position.set(0, (doorY - 25) * MM_TO_M, 0.006);
          ovenGroup.add(ovenRack);

          // Sleek stainless steel oven handle on stands
          const handleLen = ovenW - 90;
          const handleBar = createBoxWithEdges(handleLen, 14, 14, chromeMat);
          handleBar.position.set(0, (doorY + doorH / 2 - 28) * MM_TO_M, 0.032);
          const standL = createBoxWithEdges(14, 14, 24, darkMetalMat);
          standL.position.set(
            (-handleLen / 2 + 24) * MM_TO_M,
            (doorY + doorH / 2 - 28) * MM_TO_M,
            0.018
          );
          const standR = createBoxWithEdges(14, 14, 24, darkMetalMat);
          standR.position.set(
            (handleLen / 2 - 24) * MM_TO_M,
            (doorY + doorH / 2 - 28) * MM_TO_M,
            0.018
          );
          ovenGroup.add(handleBar, standL, standR);

          modGroup.add(ovenGroup);
        }

        // 2) Realistic 3D Built-In Microwave (СВЧ в пенале)
        if (mod.hasMicrowave) {
          const mwY = baseElevY + 690 + 595 + 190;
          const mwW = modW - 8;
          const mwH = 380;
          const mwGroup = new THREE.Group();
          mwGroup.position.set(
            localCenterX * MM_TO_M,
            mwY * MM_TO_M,
            (carcassFrontZ + 10) * MM_TO_M
          );

          // Outer stainless/dark frame
          const mwFrame = createBoxWithEdges(mwW, mwH, 18, darkMetalMat, 0x334155, 0.5);
          mwGroup.add(mwFrame);

          // Left viewing door + right touch control column
          const ctrlW = 105;
          const doorW = mwW - ctrlW - 10;
          const mwDoor = createBoxWithEdges(doorW, mwH - 12, 22, glassMat, 0x475569, 0.4);
          mwDoor.position.set((-ctrlW / 2 - 2) * MM_TO_M, 0, 0.002);
          mwGroup.add(mwDoor);

          // Inner microwave window
          const mwWin = createBoxWithEdges(
            doorW - 70,
            mwH - 90,
            24,
            new THREE.MeshStandardMaterial({
              color: 0x1e293b,
              emissive: 0x38bdf8,
              emissiveIntensity: 0.14,
              roughness: 0.12,
            })
          );
          mwWin.position.set((-ctrlW / 2 - 2) * MM_TO_M, 0, 0.003);
          mwGroup.add(mwWin);

          // Right control panel with digital timer & rotary dial
          const mwCtrl = createBoxWithEdges(ctrlW, mwH - 12, 22, glassMat, 0x475569, 0.4);
          mwCtrl.position.set((mwW / 2 - ctrlW / 2 - 4) * MM_TO_M, 0, 0.002);
          mwGroup.add(mwCtrl);

          const mwLed = createBoxWithEdges(
            68,
            24,
            24,
            new THREE.MeshStandardMaterial({
              color: 0x0f172a,
              emissive: 0x38bdf8,
              emissiveIntensity: 0.5,
            })
          );
          mwLed.position.set((mwW / 2 - ctrlW / 2 - 4) * MM_TO_M, 95 * MM_TO_M, 0.003);
          mwGroup.add(mwLed);

          const mwDial = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.016, 18),
            chromeMat
          );
          mwDial.rotation.x = Math.PI / 2;
          mwDial.position.set((mwW / 2 - ctrlW / 2 - 4) * MM_TO_M, -45 * MM_TO_M, 0.015);
          mwGroup.add(mwDial);

          modGroup.add(mwGroup);
        }

        // 3) Cooktop (on top of worktop above module)
        if (mod.hasCooktop) {
          const ctY = plinthH + modH + wtThick + 5;
          const cooktop = createBoxWithEdges(560, 8, 490, glassMat);
          cooktop.position.set(
            localCenterX * MM_TO_M,
            ctY * MM_TO_M,
            (worktopDepth / 2 + 10) * MM_TO_M
          );
          modGroup.add(cooktop);

          const burnerPositions = [
            [-135, -105],
            [135, -105],
            [-135, 115],
            [135, 115],
          ];
          burnerPositions.forEach(([bx, bz]) => {
            const ringGeom = new THREE.CylinderGeometry(0.068, 0.068, 0.006, 20);
            const ring = new THREE.Mesh(
              ringGeom,
              new THREE.MeshStandardMaterial({
                color: 0xef4444,
                emissive: 0x991b1b,
                emissiveIntensity: 0.35,
              })
            );
            ring.position.set(
              (localCenterX + bx) * MM_TO_M,
              (ctY + 5) * MM_TO_M,
              (worktopDepth / 2 + 10 + bz) * MM_TO_M
            );
            modGroup.add(ring);
          });
        }

        // 4) Deep 3D Recessed Sink Bowl & High-Arch Faucet (on top of worktop)
        if (mod.hasSink) {
          const sinkTopY = plinthH + modH + wtThick;
          const sinkCenterZ = worktopDepth / 2 + 10;
          const sinkOuterW = Math.min(540, modW - 50);
          const sinkOuterD = 470;
          const bowlW = sinkOuterW - 70;
          const bowlD = 380;
          const bowlDepth = 185; // 185 mm deep recessed bowl!
          const rimW = (sinkOuterW - bowlW) / 2;
          const rimD = (sinkOuterD - bowlD) / 2;

          const sinkSteelMat = new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            roughness: 0.24,
            metalness: 0.82,
          });
          const sinkInnerWallMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.32,
            metalness: 0.78,
          });
          const sinkBottomMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.38,
            metalness: 0.72,
          });

          // Top perimeter rim (4 strips around the open bowl)
          const frontRim = createBoxWithEdges(sinkOuterW, 5, rimD, sinkSteelMat);
          frontRim.position.set(
            localCenterX * MM_TO_M,
            (sinkTopY + 2.5) * MM_TO_M,
            (sinkCenterZ + bowlD / 2 + rimD / 2) * MM_TO_M
          );
          const backRim = createBoxWithEdges(sinkOuterW, 5, rimD, sinkSteelMat);
          backRim.position.set(
            localCenterX * MM_TO_M,
            (sinkTopY + 2.5) * MM_TO_M,
            (sinkCenterZ - bowlD / 2 - rimD / 2) * MM_TO_M
          );
          const leftRim = createBoxWithEdges(rimW, 5, bowlD, sinkSteelMat);
          leftRim.position.set(
            (localCenterX - bowlW / 2 - rimW / 2) * MM_TO_M,
            (sinkTopY + 2.5) * MM_TO_M,
            sinkCenterZ * MM_TO_M
          );
          const rightRim = createBoxWithEdges(rimW, 5, bowlD, sinkSteelMat);
          rightRim.position.set(
            (localCenterX + bowlW / 2 + rimW / 2) * MM_TO_M,
            (sinkTopY + 2.5) * MM_TO_M,
            sinkCenterZ * MM_TO_M
          );
          modGroup.add(frontRim, backRim, leftRim, rightRim);

          // 4 Deep Vertical Bowl Walls descending 185mm into the cabinet
          const bowlWallCenterY = sinkTopY - bowlDepth / 2;
          const wallFront = createBoxWithEdges(bowlW, bowlDepth, 6, sinkInnerWallMat);
          wallFront.position.set(
            localCenterX * MM_TO_M,
            bowlWallCenterY * MM_TO_M,
            (sinkCenterZ + bowlD / 2 - 3) * MM_TO_M
          );
          const wallBack = createBoxWithEdges(bowlW, bowlDepth, 6, sinkInnerWallMat);
          wallBack.position.set(
            localCenterX * MM_TO_M,
            bowlWallCenterY * MM_TO_M,
            (sinkCenterZ - bowlD / 2 + 3) * MM_TO_M
          );
          const wallLeft = createBoxWithEdges(6, bowlDepth, bowlD - 12, sinkInnerWallMat);
          wallLeft.position.set(
            (localCenterX - bowlW / 2 + 3) * MM_TO_M,
            bowlWallCenterY * MM_TO_M,
            sinkCenterZ * MM_TO_M
          );
          const wallRight = createBoxWithEdges(6, bowlDepth, bowlD - 12, sinkInnerWallMat);
          wallRight.position.set(
            (localCenterX + bowlW / 2 - 3) * MM_TO_M,
            bowlWallCenterY * MM_TO_M,
            sinkCenterZ * MM_TO_M
          );
          modGroup.add(wallFront, wallBack, wallLeft, wallRight);

          // Recessed Bowl Bottom Plate + Chrome Drain Strainer Ring
          const bowlBottom = createBoxWithEdges(bowlW, 6, bowlD, sinkBottomMat);
          bowlBottom.position.set(
            localCenterX * MM_TO_M,
            (sinkTopY - bowlDepth) * MM_TO_M,
            sinkCenterZ * MM_TO_M
          );
          modGroup.add(bowlBottom);

          const drainRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.008, 20),
            chromeMat
          );
          drainRing.position.set(
            localCenterX * MM_TO_M,
            (sinkTopY - bowlDepth + 5) * MM_TO_M,
            (sinkCenterZ - 35) * MM_TO_M
          );
          const drainHole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16),
            darkMetalMat
          );
          drainHole.position.set(
            localCenterX * MM_TO_M,
            (sinkTopY - bowlDepth + 6) * MM_TO_M,
            (sinkCenterZ - 35) * MM_TO_M
          );
          modGroup.add(drainRing, drainHole);

          if (mod.hasFaucet !== false) {
            const faucetZ = sinkCenterZ - bowlD / 2 - rimD / 2;
            const stemGeom = new THREE.CylinderGeometry(0.014, 0.018, 0.25, 16);
            const stem = new THREE.Mesh(stemGeom, chromeMat);
            stem.position.set(
              localCenterX * MM_TO_M,
              (sinkTopY + 125) * MM_TO_M,
              faucetZ * MM_TO_M
            );
            const spoutGeom = new THREE.BoxGeometry(0.018, 0.018, 0.17);
            const spout = new THREE.Mesh(spoutGeom, chromeMat);
            spout.position.set(
              localCenterX * MM_TO_M,
              (sinkTopY + 240) * MM_TO_M,
              (faucetZ + 75) * MM_TO_M
            );
            const nozzleGeom = new THREE.CylinderGeometry(0.011, 0.011, 0.035, 12);
            const nozzle = new THREE.Mesh(nozzleGeom, chromeMat);
            nozzle.position.set(
              localCenterX * MM_TO_M,
              (sinkTopY + 225) * MM_TO_M,
              (faucetZ + 150) * MM_TO_M
            );
            modGroup.add(stem, spout, nozzle);
          }
        }

        // 5) Built-in Hood under upper cabinet
        if (mod.hasHood) {
          const hoodVisor = createBoxWithEdges(modW - 10, 36, modD + 110, chromeMat);
          hoodVisor.position.set(
            localCenterX * MM_TO_M,
            (baseElevY - 18) * MM_TO_M,
            (carcassStartZ + (modD + 110) / 2) * MM_TO_M
          );
          modGroup.add(hoodVisor);
        }

        placeGroupOnWall(modGroup, modWall, mod.positionX, modW, startX, backWallZ, roomW, mod.positionZ || 0);
        group.add(modGroup);
      });

      // Unified Worktop & Plinth across Center, Left, and Right walls
      // Seamless continuous worktop without visual cut lines between modules or around sink cutouts!
      const wtCutting = computeKitchenWorktopCut(scene);
      const wtMat = makeMaterial(matCfg.worktopColor, 0.3, 0.08);
      const plinthMat = makeMaterial(matCfg.facadeLowerColor, 0.42, 0.05);

      const isGlobalGola = scene.materials.defaultHandleType === 'gola' || Boolean(k.isGolaProfile);
      const lowerBodyH = isGlobalGola ? 780 : 720;
      const lowerWallGap = isGlobalGola ? 63 : wallGap;
      const wtCenterY = plinthH + lowerBodyH + wtThick / 2;

      // Plinth stands strictly IN FRONT of front adjustable legs (front legs are at carcassFrontZ - 85 = 475mm; plinth is at carcassFrontZ - 35 = 525mm)
      const lowerFrontFromWallMm = lowerWallGap + hdfThick + 512;
      const plinthZFromWallMm = lowerFrontFromWallMm - Math.min(35, plinthSetback);

      wtCutting.segments.forEach((seg) => {
        const wallGroup = new THREE.Group();
        wallGroup.userData.ignoreRaycast = true;

        // Find sink modules on this wall to leave a real cutout opening in the worktop mesh
        const sinkModsOnWall = k.modules
          .filter(
            (m) =>
              m.category === 'lower' &&
              m.hasSink &&
              (m.wall || 'center') === seg.wall &&
              m.positionX + m.width > seg.startMm &&
              m.positionX < seg.endMm
          )
          .sort((a, b) => a.positionX - b.positionX);

        let cursorMm = seg.startMm;
        sinkModsOnWall.forEach((sinkMod) => {
          const sinkOuterW = Math.min(540, sinkMod.width - 50);
          const bowlW = sinkOuterW - 70;
          const bowlD = 380;
          const holeStartMm = Math.max(
            seg.startMm,
            sinkMod.positionX + sinkMod.width / 2 - bowlW / 2
          );
          const holeEndMm = Math.min(
            seg.endMm,
            sinkMod.positionX + sinkMod.width / 2 + bowlW / 2
          );

          if (holeStartMm > cursorMm + 5) {
            const leftPieceLen = holeStartMm - cursorMm;
            // edgeOpacity = 0 so there are NO visual seams on the continuous worktop!
            const piece = createBoxWithEdges(
              leftPieceLen,
              wtThick,
              worktopDepth,
              wtMat,
              0x1e242b,
              0,
              true
            );
            piece.position.set(
              (cursorMm - seg.startMm + leftPieceLen / 2) * MM_TO_M,
              wtCenterY * MM_TO_M,
              (worktopDepth / 2) * MM_TO_M
            );
            wallGroup.add(piece);
          }

          // Front & Back worktop bridges around the sink cutout (edgeOpacity = 0 for seamless surface)
          const holeW = Math.max(50, holeEndMm - holeStartMm);
          const sinkCenterZ = worktopDepth / 2 + 10;
          const backBridgeD = Math.max(30, sinkCenterZ - bowlD / 2);
          const frontBridgeD = Math.max(30, worktopDepth - (sinkCenterZ + bowlD / 2));

          const backBridge = createBoxWithEdges(
            holeW,
            wtThick,
            backBridgeD,
            wtMat,
            0x1e242b,
            0,
            true
          );
          backBridge.position.set(
            (holeStartMm - seg.startMm + holeW / 2) * MM_TO_M,
            wtCenterY * MM_TO_M,
            (backBridgeD / 2) * MM_TO_M
          );
          const frontBridge = createBoxWithEdges(
            holeW,
            wtThick,
            frontBridgeD,
            wtMat,
            0x1e242b,
            0,
            true
          );
          frontBridge.position.set(
            (holeStartMm - seg.startMm + holeW / 2) * MM_TO_M,
            wtCenterY * MM_TO_M,
            (worktopDepth - frontBridgeD / 2) * MM_TO_M
          );
          wallGroup.add(backBridge, frontBridge);

          cursorMm = holeEndMm;
        });

        if (seg.endMm > cursorMm + 5) {
          const tailLen = seg.endMm - cursorMm;
          const tailPiece = createBoxWithEdges(
            tailLen,
            wtThick,
            worktopDepth,
            wtMat,
            0x1e242b,
            0,
            true
          );
          tailPiece.position.set(
            (cursorMm - seg.startMm + tailLen / 2) * MM_TO_M,
            wtCenterY * MM_TO_M,
            (worktopDepth / 2) * MM_TO_M
          );
          wallGroup.add(tailPiece);
        }

        // Single outer perimeter contour for the entire worktop run on this wall (zero internal module seams!)
        if (!photorealMode) {
          const outerWtContourGeom = new THREE.BoxGeometry(
            seg.netLengthMm * MM_TO_M,
            wtThick * MM_TO_M,
            worktopDepth * MM_TO_M
          );
          const outerWtEdges = createEdgeLines(outerWtContourGeom, 0x1e242b, 0.28);
          outerWtEdges.position.set(
            (seg.netLengthMm / 2) * MM_TO_M,
            wtCenterY * MM_TO_M,
            (worktopDepth / 2) * MM_TO_M
          );
          wallGroup.add(outerWtEdges);
        }

        // Plinth strip under lower modules on this wall (placed in front of adjustable legs)
        if (plinthH > 0) {
          const plinthBar = createBoxWithEdges(
            seg.netLengthMm,
            plinthH,
            t,
            plinthMat,
            0x1e242b,
            0.25,
            true
          );
          plinthBar.position.set(
            (seg.netLengthMm / 2) * MM_TO_M,
            (plinthH / 2) * MM_TO_M,
            plinthZFromWallMm * MM_TO_M
          );
          wallGroup.add(plinthBar);
        }

        placeGroupOnWall(
          wallGroup,
          seg.wall,
          seg.startMm,
          seg.netLengthMm,
          startX,
          backWallZ,
          roomW
        );
        group.add(wallGroup);
      });
    }
  }, [scene, selectedId, multiSelectedIds, doorsOpen, xrayMode, photorealMode]);

  /**
   * Computes which active wall ('center', 'left', 'right') and positionX (mm)
   * corresponds to a pointer coordinate (clientX, clientY), with collision clamping
   * against neighbor modules (unless Shift key is held) and flush snapping.
   */
  const computeWallPlacementFromPointer = (
    clientX: number,
    clientY: number,
    itemWidthMm: number,
    itemHeightMm: number,
    itemCategory?: 'lower' | 'upper' | 'tall' | 'anthresole',
    grabOffsetAlongWallMm?: number,
    excludeId?: string,
    currentPosX?: number,
    currentWall?: 'center' | 'left' | 'right',
    shiftKey?: boolean
  ): {
    wall: 'center' | 'left' | 'right';
    positionX: number;
    elevationY: number;
  } | null => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const s = sceneDataRef.current;
    if (!renderer || !camera) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycasterRef.current.setFromCamera(mouse, camera);

    const k = s.kitchen;
    const roomW = k.wallCenterLength;
    const startX = -roomW / 2;
    const backWallZ = 0;

    // Intersect with wall planes or floor plane
    const centerWallPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -(backWallZ + 280) * MM_TO_M
    );
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);

    const hitPt = new THREE.Vector3();
    let hasHit = raycasterRef.current.ray.intersectPlane(centerWallPlane, hitPt);
    if (!hasHit || Math.abs(hitPt.x) > 12 || Math.abs(hitPt.z) > 12) {
      hasHit = raycasterRef.current.ray.intersectPlane(floorPlane, hitPt);
    }
    if (!hasHit) return null;

    const worldXMm = hitPt.x / MM_TO_M;
    const worldZMm = hitPt.z / MM_TO_M;

    // Determine which active wall ('center', 'left', 'right') the pointer is closest to
    let chosenWall: 'center' | 'left' | 'right' = 'center';
    const hasLeftWall = k.layoutType === 'l_left' || k.layoutType === 'u_shape';
    const hasRightWall = k.layoutType === 'l_right' || k.layoutType === 'u_shape';

    const distToCenter = Math.abs(worldZMm - (backWallZ + 280));
    const distToLeft = hasLeftWall ? Math.abs(worldXMm - (startX + 280)) : Infinity;
    const distToRight = hasRightWall ? Math.abs(worldXMm - (startX + roomW - 280)) : Infinity;

    if (
      hasLeftWall &&
      worldZMm > backWallZ + 480 &&
      distToLeft < distToCenter &&
      distToLeft <= distToRight
    ) {
      chosenWall = 'left';
    } else if (
      hasRightWall &&
      worldZMm > backWallZ + 480 &&
      distToRight < distToCenter &&
      distToRight < distToLeft
    ) {
      chosenWall = 'right';
    }

    const wallLen =
      chosenWall === 'left'
        ? k.wallLeftLength || 2000
        : chosenWall === 'right'
          ? k.wallRightLength || 2000
          : k.wallCenterLength;

    const rawCoordAlongWall =
      chosenWall === 'center' ? worldXMm - startX : worldZMm - backWallZ;

    const offset = grabOffsetAlongWallMm !== undefined ? grabOffsetAlongWallMm : itemWidthMm / 2;
    let rawPosX = Math.round((rawCoordAlongWall - offset) / 5) * 5;
    rawPosX = Math.max(0, Math.min(Math.max(0, wallLen - itemWidthMm), rawPosX));

    // Snap to left/right room corners within 30mm
    if (rawPosX <= 30) rawPosX = 0;
    if (Math.abs(rawPosX - (wallLen - itemWidthMm)) <= 30) {
      rawPosX = Math.max(0, wallLen - itemWidthMm);
    }

    // Check tier overlap helper
    const tiersOverlap = (
      catA?: 'lower' | 'upper' | 'tall' | 'anthresole',
      catB?: 'lower' | 'upper' | 'tall' | 'anthresole'
    ) => {
      if (!catA || !catB) return false;
      if (catA === 'tall' || catB === 'tall') return true;
      return catA === catB;
    };

    const SNAP_THRESHOLD = 28;

    if (itemCategory) {
      // Gather all other modules on the same wall that share vertical space
      const otherMods = s.kitchen.modules.filter(
        (m) =>
          m.id !== excludeId &&
          (m.wall || 'center') === chosenWall &&
          tiersOverlap(itemCategory, m.category)
      );

      // 1) Magnetic snapping to neighbor edges
      otherMods.forEach((m) => {
        const rightEdge = m.positionX + m.width;
        const leftEdge = m.positionX - itemWidthMm;
        if (Math.abs(rawPosX - rightEdge) <= SNAP_THRESHOLD) {
          rawPosX = rightEdge;
        } else if (Math.abs(rawPosX - leftEdge) <= SNAP_THRESHOLD) {
          rawPosX = leftEdge;
        }
      });

      // 2) Collision barrier physics (unless Shift key is pressed)
      if (!shiftKey) {
        if (currentPosX !== undefined && (currentWall || 'center') === chosenWall) {
          let minAllowedX = 0;
          let maxAllowedX = Math.max(0, wallLen - itemWidthMm);

          otherMods.forEach((m) => {
            const mLeft = m.positionX;
            const mRight = m.positionX + m.width;
            // If neighbor was to the left of current module position, cannot pass left of mRight
            if (mRight <= currentPosX + 15) {
              minAllowedX = Math.max(minAllowedX, mRight);
            }
            // If neighbor was to the right of current module position, cannot pass right of mLeft - itemWidthMm
            if (mLeft >= currentPosX + itemWidthMm - 15) {
              maxAllowedX = Math.min(maxAllowedX, mLeft - itemWidthMm);
            }
          });

          if (minAllowedX <= maxAllowedX) {
            rawPosX = Math.max(minAllowedX, Math.min(maxAllowedX, rawPosX));
          }
        } else {
          // Dropping from library or switching wall: push out of any direct overlap if possible
          otherMods.forEach((m) => {
            const mLeft = m.positionX;
            const mRight = m.positionX + m.width;
            const overlaps = rawPosX < mRight && rawPosX + itemWidthMm > mLeft;
            if (overlaps) {
              const distToLeftSide = Math.abs(rawPosX + itemWidthMm - mLeft);
              const distToRightSide = Math.abs(mRight - rawPosX);
              if (distToLeftSide <= distToRightSide && mLeft - itemWidthMm >= 0) {
                rawPosX = mLeft - itemWidthMm;
              } else if (mRight + itemWidthMm <= wallLen) {
                rawPosX = mRight;
              }
            }
          });
        }
      }
    } else {
      // Obstacle magnetic snapping to room corners & other obstacles
      s.kitchen.obstacles.forEach((o) => {
        if (o.id === excludeId || (o.wall || 'center') !== chosenWall) return;
        const rightEdge = o.positionX + o.width;
        const leftEdge = o.positionX - itemWidthMm;
        if (Math.abs(rawPosX - rightEdge) <= SNAP_THRESHOLD) rawPosX = rightEdge;
        if (Math.abs(rawPosX - leftEdge) <= SNAP_THRESHOLD) rawPosX = leftEdge;
      });
    }

    rawPosX = Math.max(0, Math.min(Math.max(0, wallLen - itemWidthMm), rawPosX));

    let elevY = 0;
    if (itemCategory === 'upper') {
      elevY = k.upperElevation || 1460;
    } else if (itemCategory === 'anthresole') {
      elevY = (k.upperElevation || 1460) + 720;
    } else if (!itemCategory) {
      // Obstacle vertical elevation Y from raycast hit on wall plane
      const rawWorldY = hitPt.y / MM_TO_M - itemHeightMm / 2;
      let worldYMm = Math.max(0, Math.round(rawWorldY / 20) * 20);
      if (worldYMm <= 40) worldYMm = 0;
      if (Math.abs(worldYMm - (k.roomHeight - itemHeightMm)) <= 40) {
        worldYMm = Math.max(0, k.roomHeight - itemHeightMm);
      }
      elevY = Math.min(Math.max(0, k.roomHeight - itemHeightMm), worldYMm);
    }

    return { wall: chosenWall, positionX: rawPosX, elevationY: elevY };
  };

  /**
   * Raycasts ONLY against visible THREE.Mesh objects that belong to selectable modules/sections/obstacles.
   * Explicitly skips LineSegments, floor, walls, and worktops so empty-space dragging NEVER grabs a module!
   */
  const findSelectableFromPointer = (
    clientX: number,
    clientY: number
  ): {
    id: string;
    kind: 'module' | 'section' | 'obstacle';
    point: THREE.Vector3;
  } | null => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const group = contentGroupRef.current;
    if (!renderer || !camera || !group) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, camera);
    const intersects = raycasterRef.current.intersectObjects(group.children, true);

    for (const hit of intersects) {
      // CRITICAL: Only consider visible THREE.Mesh objects that are not marked ignoreRaycast
      if (
        !(hit.object instanceof THREE.Mesh) ||
        !hit.object.visible ||
        hit.object.userData?.ignoreRaycast
      ) {
        continue;
      }
      // Skip completely invisible section selection proxies if in kitchen mode
      const mat = hit.object.material as THREE.MeshBasicMaterial;
      if (mat && mat.opacity === 0 && sceneDataRef.current.mode === 'kitchen') {
        continue;
      }

      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (curr.userData?.ignoreRaycast) break;
        if (curr.userData && curr.userData.selectableId) {
          return {
            id: curr.userData.selectableId,
            kind: curr.userData.selectableKind,
            point: hit.point.clone(),
          };
        }
        curr = curr.parent;
      }
    }
    return null;
  };

  // Pointer down: only intercept if user presses directly on a selectable Kitchen Module/Obstacle mesh
  // AND dragModulesEnabled is true. Otherwise let OrbitControls handle camera rotation freely!
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    if (e.button !== 0) return;

    const s = sceneDataRef.current;
    if (s.mode !== 'kitchen' || !onMoveItemRef.current || !dragModulesEnabled) return;

    const found = findSelectableFromPointer(e.clientX, e.clientY);
    if (!found) {
      // Clicked on empty space, floor, walls, or worktop -> let OrbitControls rotate smoothly!
      return;
    }

    const hitId = found.id;
    const hitKind = found.kind;
    if (hitKind !== 'module' && hitKind !== 'obstacle') return;

    const roomW = s.kitchen.wallCenterLength;
    const startX = -roomW / 2;
    const backWallZ = 0;

    if (hitKind === 'module') {
      const mod = s.kitchen.modules.find((m) => m.id === hitId);
      if (!mod) return;
      const wall = mod.wall || 'center';
      const hitCoordAlongWall =
        wall === 'center'
          ? found.point.x / MM_TO_M - startX
          : found.point.z / MM_TO_M - backWallZ;

      dragStateRef.current = {
        active: true,
        hasMoved: false,
        id: hitId,
        kind: 'module',
        category: mod.category,
        itemWidth: mod.width,
        itemHeight: mod.height,
        wall,
        grabOffsetAlongWallMm: Math.max(0, Math.min(mod.width, hitCoordAlongWall - mod.positionX)),
        currentPositionX: mod.positionX,
        currentElevationY: mod.elevationY,
      };
    } else {
      const obs = s.kitchen.obstacles.find((o) => o.id === hitId);
      if (!obs) return;
      const wall = obs.wall || 'center';
      const hitCoordAlongWall =
        wall === 'center'
          ? found.point.x / MM_TO_M - startX
          : found.point.z / MM_TO_M - backWallZ;

      dragStateRef.current = {
        active: true,
        hasMoved: false,
        id: hitId,
        kind: 'obstacle',
        itemWidth: obs.width,
        itemHeight: obs.height,
        wall,
        grabOffsetAlongWallMm: Math.max(0, Math.min(obs.width, hitCoordAlongWall - obs.positionX)),
        currentPositionX: obs.positionX,
        currentElevationY: obs.elevationY,
      };
    }

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || !drag.active) return;

    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    if (!drag.hasMoved && dx < 5 && dy < 5) return;

    if (!drag.hasMoved) {
      drag.hasMoved = true;
      setIsDraggingItem(true);
      onSelectRef.current(drag.id, drag.kind);
    }

    const pos = computeWallPlacementFromPointer(
      e.clientX,
      e.clientY,
      drag.itemWidth,
      drag.itemHeight,
      drag.category,
      drag.grabOffsetAlongWallMm,
      drag.id,
      drag.currentPositionX,
      drag.wall,
      e.shiftKey
    );
    if (!pos) return;

    if (
      pos.positionX !== drag.currentPositionX ||
      pos.wall !== drag.wall ||
      (drag.kind === 'obstacle' && pos.elevationY !== drag.currentElevationY)
    ) {
      drag.currentPositionX = pos.positionX;
      drag.currentElevationY = pos.elevationY;
      drag.wall = pos.wall;
      onMoveItemRef.current?.(
        drag.id,
        drag.kind,
        pos.positionX,
        drag.kind === 'obstacle' ? pos.elevationY : undefined,
        pos.wall
      );
    }
  };

  const finishDragOrClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }

    const drag = dragStateRef.current;
    if (drag && drag.active) {
      const wasMoved = drag.hasMoved;
      const clickedId = drag.id;
      const clickedKind = drag.kind;
      dragStateRef.current = null;
      setIsDraggingItem(false);
      if (!wasMoved) {
        const now = Date.now();
        const isDouble =
          clickedId === clickTrackerRef.current.id && now - clickTrackerRef.current.time < 350;
        clickTrackerRef.current = { id: clickedId, time: now };
        if (isDouble) {
          onDoubleClickItemRef.current?.(clickedId, clickedKind);
        } else {
          onSelectRef.current(
            clickedId,
            clickedKind,
            { x: e.clientX, y: e.clientY },
            e.ctrlKey || e.metaKey
          );
        }
      }
      return;
    }

    // Standard click selection if pointer didn't move > 6px
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    if (dx > 6 || dy > 6) return;

    const found = findSelectableFromPointer(e.clientX, e.clientY);
    if (found) {
      const now = Date.now();
      const isDouble =
        found.id === clickTrackerRef.current.id && now - clickTrackerRef.current.time < 350;
      clickTrackerRef.current = { id: found.id, time: now };
      if (isDouble) {
        onDoubleClickItemRef.current?.(found.id, found.kind);
      } else {
        onSelectRef.current(
          found.id,
          found.kind,
          { x: e.clientX, y: e.clientY },
          e.ctrlKey || e.metaKey
        );
      }
    } else {
      clickTrackerRef.current = { id: '', time: 0 };
      onSelectRef.current(null, null);
    }
  };

  // HTML5 Drag & Drop from Left Sidebar Library onto 3D Canvas
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedLibraryItem || scene.mode !== 'kitchen') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const pos = computeWallPlacementFromPointer(
      e.clientX,
      e.clientY,
      draggedLibraryItem.width,
      draggedLibraryItem.height,
      draggedLibraryItem.category,
      undefined,
      undefined,
      undefined,
      undefined,
      e.shiftKey
    );
    const previewGroup = dragPreviewGroupRef.current;
    if (!previewGroup || !pos) return;

    const roomW = scene.kitchen.wallCenterLength;
    const startX = -roomW / 2;
    const backWallZ = 0;
    const plinthH = scene.kitchen.plinthHeight || 100;
    const wallGap = scene.kitchen.wallGapMm ?? 45;

    previewGroup.clear();
    const w = draggedLibraryItem.width;
    const h = draggedLibraryItem.height;
    const d = draggedLibraryItem.depth;
    const baseElevY =
      draggedLibraryItem.category === 'lower' || draggedLibraryItem.category === 'tall'
        ? plinthH + pos.elevationY
        : pos.elevationY;
    const zOffset = draggedLibraryItem.category === 'lower' ? wallGap + 3 : 0;

    const ghostGeom = new THREE.BoxGeometry(w * MM_TO_M, h * MM_TO_M, d * MM_TO_M);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.42,
      roughness: 0.3,
    });
    const ghostMesh = new THREE.Mesh(ghostGeom, ghostMat);
    ghostMesh.position.set(
      (w / 2) * MM_TO_M,
      (baseElevY + h / 2) * MM_TO_M,
      (zOffset + d / 2) * MM_TO_M
    );
    previewGroup.add(ghostMesh);

    const ghostEdges = createEdgeLines(ghostGeom, 0xd97706, 0.95);
    ghostEdges.position.copy(ghostMesh.position);
    previewGroup.add(ghostEdges);

    placeGroupOnWall(previewGroup, pos.wall, pos.positionX, w, startX, backWallZ, roomW);
    previewGroup.visible = true;
  };

  const handleDragLeave = () => {
    if (dragPreviewGroupRef.current) {
      dragPreviewGroupRef.current.visible = false;
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedLibraryItem || scene.mode !== 'kitchen') return;
    e.preventDefault();
    if (dragPreviewGroupRef.current) {
      dragPreviewGroupRef.current.visible = false;
    }
    const pos = computeWallPlacementFromPointer(
      e.clientX,
      e.clientY,
      draggedLibraryItem.width,
      draggedLibraryItem.height,
      draggedLibraryItem.category,
      undefined,
      undefined,
      undefined,
      undefined,
      e.shiftKey
    );
    if (pos && onDropLibraryItem) {
      onDropLibraryItem(pos.positionX, pos.elevationY, pos.wall);
    }
  };

  const handleDownloadPhotorealPng = () => {
    const renderer = rendererRef.current;
    const threeScene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !threeScene || !camera) return;
    renderer.render(threeScene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Визуализация_${scene.projectName || '3D'}.png`;
    a.click();
  };

  return (
    <div className="relative w-full h-full min-h-[520px] select-none overflow-hidden rounded-xl bg-slate-100">
      {/* Top-Right 3D Interaction Mode Pill */}
      {scene.mode === 'kitchen' && !photorealMode && (
        <div className="absolute top-14 right-3 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
          <button
            type="button"
            onClick={() => setDragModulesEnabled((v) => !v)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              dragModulesEnabled
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Включите, чтобы перетаскивать модули мышкой прямо в 3D сцене, или отключите для свободного вращения камеры по всей области"
          >
            {dragModulesEnabled ? 'Перемещение модулей: ВКЛ' : 'Перемещение модулей: ВЫКЛ'}
          </button>
          <span className="text-[11px] text-slate-500 hidden xl:inline">
            Ctrl+Клик — выделить несколько для выравнивания
          </span>
        </div>
      )}

      {/* Photorealistic Render Download Pill */}
      {photorealMode && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-amber-400/50 shadow-xl text-xs">
          <span className="text-amber-300 font-semibold">Студийный Фотореализм (PBR)</span>
          <button
            type="button"
            onClick={handleDownloadPhotorealPng}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
          >
            Скачать фото (PNG)
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragOrClick}
        onPointerCancel={finishDragOrClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full h-full min-h-[520px] ${
          isDraggingItem ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      />
    </div>
  );
};

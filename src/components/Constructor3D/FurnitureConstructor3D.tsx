import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Download,
  Calculator,
  Plus,
  Trash2,
  Copy,
  Layers,
  DoorOpen,
  Eye,
  Save,
  Code2,
  Check,
  Sparkles,
  Wrench,
  Palette,
  Sliders,
  Maximize2,
  Flame,
  BookmarkPlus,
  Send,
  X,
  ChevronRight,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  GripVertical,
  FileCode,
  Move,
  Ruler,
  Camera,
  FlipHorizontal2,
  AlignHorizontalJustifyCenter,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ConstructorSceneData,
  KitchenModuleItem,
  RoomObstacleItem,
  WardrobeSection,
  COLOR_DECOR_PRESETS,
  HANDLE_COLOR_PRESETS,
  HandleKind,
  HandleOrientation,
  HandlePlacement,
  DrawerSystemType,
  DRAWER_DEPTH_OPTIONS,
  DRAWER_SYSTEM_LABELS,
  getMaxAllowedDrawerDepth,
  resolveEffectiveDrawerDepth,
  STANDARD_KITCHEN_MODULE_LIBRARY,
  ROOM_OBSTACLE_LIBRARY,
  createDefaultConstructorScene,
  createDemoKitchenModules,
  generateSceneBOM,
  computeKitchenWorktopCut,
  ComputedKitchenWorktopCutting,
} from './constructorPresets';
import {
  downloadB3DFile,
  downloadBazisScriptFile,
  buildBazisRawDataFromPanels,
  ConstructorPanelItem,
  ConstructorHardwareItem,
} from '../../utils/b3dWriter';
import { SceneViewport3D, DraggedLibraryPreviewItem } from './SceneViewport3D';
import { KitchenModuleThumbnail } from './KitchenModuleThumbnail';
import { KitchenRadialMenu } from './KitchenRadialMenu';
import { KitchenMoveHud, KitchenReplaceModal } from './KitchenMoveReplaceModals';
import { NumericInput } from './NumericInput';
import { RoomDimensionsModal } from './RoomDimensionsModal';
import { KitchenAlignmentModal, ModuleAlignPlane } from './KitchenAlignmentModal';
import { KitchenSketchesModal } from './KitchenSketchesModal';
import { Constructor3DSettingsModal } from './Constructor3DSettingsModal';
import { ConstructorCompanySettings, DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS } from './constructorPresets';

interface FurnitureConstructor3DProps {
  companyId: string;
  companyName?: string;
  initialScene?: ConstructorSceneData | null;
  catalogProducts?: any[];
  catalogMaterials?: any;
  isWidgetMode?: boolean;
  onApplyToCalculator?: (payload: {
    rawData: any[][];
    panels: ConstructorPanelItem[];
    hardware: ConstructorHardwareItem[];
    scene: ConstructorSceneData;
    worktopCutting?: ComputedKitchenWorktopCutting;
  }) => void;
  onSaveProjectDirect?: (payload: {
    rawData: any[][];
    panels: ConstructorPanelItem[];
    hardware: ConstructorHardwareItem[];
    scene: ConstructorSceneData;
    worktopCutting?: ComputedKitchenWorktopCutting;
  }) => void;
  onAutoSaveProject?: (payload: {
    rawData: any[][];
    panels: ConstructorPanelItem[];
    hardware: ConstructorHardwareItem[];
    scene: ConstructorSceneData;
    worktopCutting?: ComputedKitchenWorktopCutting;
  }) => void;
  onClose?: () => void;
}

export const FurnitureConstructor3D: React.FC<FurnitureConstructor3DProps> = ({
  companyId,
  companyName = 'Мебель План',
  initialScene,
  catalogProducts = [],
  catalogMaterials: rawCatalogMaterials = [],
  isWidgetMode = false,
  onApplyToCalculator,
  onSaveProjectDirect,
  onAutoSaveProject,
  onClose,
}) => {
  const catalogMaterials = useMemo(() => {
    if (Array.isArray(rawCatalogMaterials)) return rawCatalogMaterials;
    if (rawCatalogMaterials && typeof rawCatalogMaterials === 'object') {
      const list: Array<{ name: string }> = [];
      Object.entries(rawCatalogMaterials).forEach(([brand, items]) => {
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const label = typeof it === 'string' ? `${brand} ${it}` : it?.name || '';
            if (label) list.push({ name: label });
          });
        }
      });
      return list;
    }
    return [];
  }, [rawCatalogMaterials]);
  const [scene, setScene] = useState<ConstructorSceneData>(() =>
    initialScene ? JSON.parse(JSON.stringify(initialScene)) : createDefaultConstructorScene()
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'module' | 'section' | 'obstacle' | null>(null);
  const [leftTab, setLeftTab] = useState<'modules' | 'materials' | 'obstacles' | 'bom'>('modules');
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [xrayMode, setXrayMode] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<'3d' | 'front' | 'top' | 'left' | 'right'>('3d');
  const [activeWallForAdd, setActiveWallForAdd] = useState<'center' | 'left' | 'right'>('center');

  // Room dimensions popup modal (opens on startup if no initialScene was provided)
  const [showRoomDimensionsModal, setShowRoomDimensionsModal] = useState<boolean>(
    () => !initialScene
  );

  // Custom company modules saved in DB
  const [companyCustomModules, setCompanyCustomModules] = useState<
    Array<Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>>
  >([]);
  const [savingCustomModule, setSavingCustomModule] = useState(false);

  // Widget modal & B2C Lead modal
  const [showWidgetCodeModal, setShowWidgetCodeModal] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [showWidgetSubmitModal, setShowWidgetSubmitModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [widgetSubmitting, setWidgetSubmitting] = useState(false);
  const [widgetSubmittedSuccess, setWidgetSubmittedSuccess] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Drag-and-drop from Left Sidebar into 3D Viewport
  const [draggedLibraryPayload, setDraggedLibraryPayload] = useState<
    | { kind: 'module'; tpl: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'> }
    | { kind: 'obstacle'; tpl: Omit<RoomObstacleItem, 'id' | 'wall' | 'positionX'> }
    | null
  >(null);

  // Drag-and-drop reordering on Bottom Module Strip
  const [draggedStripModuleId, setDraggedStripModuleId] = useState<string | null>(null);

  // Circular radial menu coordinates and targeted module
  const [radialMenuPos, setRadialMenuPos] = useState<{ x: number; y: number; modId: string } | null>(null);
  // Right Inspector open state (opens on double-click or via radial menu or toggle button)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  // 3D Space Move HUD active (translating along X, Y, and Z forward/backward)
  const [isMoveHudActive, setIsMoveHudActive] = useState(false);
  // Module replace modal
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  // Category filter for module miniatures in left sidebar
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<'all' | 'lower' | 'upper' | 'tall' | 'anthresole'>('all');
  // Multi-selected module IDs (first item = reference module when Ctrl+Click is used)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  // Alignment modal state
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);
  // Technical sketches modal state
  const [showSketchesModal, setShowSketchesModal] = useState(false);
  // Company 3D constructor global settings modal state
  const [showConstructorSettingsModal, setShowConstructorSettingsModal] = useState(false);
  const [constructorSettings, setConstructorSettings] = useState<ConstructorCompanySettings>(
    DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS
  );
  // Photorealistic 3D studio render mode (pure Three.js PBR lighting & reflections)
  const [photorealMode, setPhotorealMode] = useState(false);
  // Collapsible Planning & Walls card in left sidebar
  const [isPlanningCardCollapsed, setIsPlanningCardCollapsed] = useState(false);
  // Last auto-save timestamp
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);

  const draggedPreviewItem = useMemo<DraggedLibraryPreviewItem | null>(() => {
    if (!draggedLibraryPayload) return null;
    if (draggedLibraryPayload.kind === 'module') {
      return {
        kind: 'module',
        name: draggedLibraryPayload.tpl.name,
        width: draggedLibraryPayload.tpl.width,
        height: draggedLibraryPayload.tpl.height,
        depth: draggedLibraryPayload.tpl.depth,
        category: draggedLibraryPayload.tpl.category,
        elevationY: draggedLibraryPayload.tpl.elevationY,
      };
    }
    return {
      kind: 'obstacle',
      name: draggedLibraryPayload.tpl.name,
      width: draggedLibraryPayload.tpl.width,
      height: draggedLibraryPayload.tpl.height,
      depth: draggedLibraryPayload.tpl.depth,
      elevationY: draggedLibraryPayload.tpl.elevationY,
    };
  }, [draggedLibraryPayload]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3200);
  };

  // Load company custom modules
  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/db/doc/companies/${companyId}/settings/constructorModules`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setCompanyCustomModules(data.items);
        }
      })
      .catch(() => {});
  }, [companyId]);

  // Synchronize if initialScene prop updates
  useEffect(() => {
    if (initialScene) {
      setScene(JSON.parse(JSON.stringify(initialScene)));
    }
  }, [initialScene]);

  // Live BOM & Worktop Cutting calculation
  const bom = useMemo(
    () => generateSceneBOM(scene, catalogProducts),
    [scene, catalogProducts]
  );

  const worktopCutting = useMemo(
    () => computeKitchenWorktopCut(scene),
    [scene]
  );

  // Filtered Catalog Hardware Lists for Click-to-Replace
  const hingeCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Петли' ||
          /петл/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  const drawerCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Системы выдвижения' ||
          /направляющ|тандем|бокс|ящик/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  const handleCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Ручки и крючки' ||
          /ручк|профиль/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  const dryerCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Посудосушители' ||
          /посудосуш|сушк/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  const sinkCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Мойки и аксессуары' ||
          /мойк|смесител/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  const worktopCatalog = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.category === 'Столешницы и стеновые' ||
          /столешниц/i.test(p.name || '')
      ),
    [catalogProducts]
  );

  // Selected entities
  const selectedKitchenModule = useMemo(
    () => scene.kitchen.modules.find((m) => m.id === selectedId) || null,
    [scene.kitchen.modules, selectedId]
  );

  const selectedWardrobeSection = useMemo(
    () => scene.wardrobe.sections.find((s) => s.id === selectedId) || null,
    [scene.wardrobe.sections, selectedId]
  );

  const selectedObstacle = useMemo(
    () => scene.kitchen.obstacles.find((o) => o.id === selectedId) || null,
    [scene.kitchen.obstacles, selectedId]
  );

  // Wardrobe helper: recalculate equal section widths when total width or section count changes
  const redistributeWardrobeSections = (
    totalWidth: number,
    thickness: number,
    hasLeft: boolean,
    hasRight: boolean,
    sections: WardrobeSection[]
  ): WardrobeSection[] => {
    const count = Math.max(1, sections.length);
    const outerSides = (hasLeft ? thickness : 0) + (hasRight ? thickness : 0);
    const dividers = (count - 1) * thickness;
    const available = Math.max(200 * count, totalWidth - outerSides - dividers);
    const baseW = Math.floor(available / count);
    const remainder = available - baseW * count;
    return sections.map((sec, idx) => ({
      ...sec,
      width: idx === count - 1 ? baseW + remainder : baseW,
    }));
  };

  const handleUpdateWardrobeGlobal = (patch: Partial<typeof scene.wardrobe>) => {
    setScene((prev) => {
      const nextW = { ...prev.wardrobe, ...patch };
      if (
        patch.width !== undefined ||
        patch.thickness !== undefined ||
        patch.hasLeftSide !== undefined ||
        patch.hasRightSide !== undefined
      ) {
        nextW.sections = redistributeWardrobeSections(
          nextW.width,
          nextW.thickness,
          nextW.hasLeftSide,
          nextW.hasRightSide,
          nextW.sections
        );
      }
      return { ...prev, wardrobe: nextW, updatedAt: new Date().toISOString() };
    });
  };

  const handleAddWardrobeSection = () => {
    setScene((prev) => {
      const w = prev.wardrobe;
      const newSec: WardrobeSection = {
        id: `sec-${Date.now()}`,
        name: `Секция ${w.sections.length + 1}`,
        width: 550,
        shelvesCount: 4,
        drawersCount: 0,
        drawerHeight: 180,
        hasRodTop: false,
        hasRodMid: false,
        hasPantograph: false,
        hasShoeRack: false,
      };
      const updated = redistributeWardrobeSections(
        w.width,
        w.thickness,
        w.hasLeftSide,
        w.hasRightSide,
        [...w.sections, newSec]
      );
      setSelectedId(newSec.id);
      setSelectedKind('section');
      return {
        ...prev,
        wardrobe: { ...w, sections: updated },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDeleteWardrobeSection = (secId: string) => {
    setScene((prev) => {
      const w = prev.wardrobe;
      if (w.sections.length <= 1) return prev;
      const filtered = w.sections.filter((s) => s.id !== secId);
      const updated = redistributeWardrobeSections(
        w.width,
        w.thickness,
        w.hasLeftSide,
        w.hasRightSide,
        filtered
      );
      if (selectedId === secId) setSelectedId(updated[0]?.id || null);
      return {
        ...prev,
        wardrobe: { ...w, sections: updated },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleUpdateWardrobeSection = (secId: string, patch: Partial<WardrobeSection>) => {
    setScene((prev) => {
      const w = prev.wardrobe;
      const nextSections = w.sections.map((s) => (s.id === secId ? { ...s, ...patch } : s));
      // If user explicitly edited section width, update total wardrobe width to match sum
      let nextTotalWidth = w.width;
      if (patch.width !== undefined) {
        const outerSides = (w.hasLeftSide ? w.thickness : 0) + (w.hasRightSide ? w.thickness : 0);
        const dividers = Math.max(0, nextSections.length - 1) * w.thickness;
        nextTotalWidth =
          nextSections.reduce((sum, s) => sum + s.width, 0) + outerSides + dividers;
      }
      return {
        ...prev,
        wardrobe: { ...w, width: nextTotalWidth, sections: nextSections },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Kitchen Module Operations
  const isSameKitchenTier = (catA: string, catB: string) => {
    if (catA === 'upper' || catB === 'upper') return catA === 'upper' && catB === 'upper';
    if (catA === 'anthresole' || catB === 'anthresole')
      return catA === 'anthresole' && catB === 'anthresole';
    return (catA === 'lower' || catA === 'tall') && (catA === 'lower' || catB === 'tall');
  };

  const handleAddKitchenModule = (
    tpl: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>,
    customPositionX?: number,
    customWall?: 'center' | 'left' | 'right'
  ) => {
    setScene((prev) => {
      const k = prev.kitchen;
      const targetWall: 'center' | 'left' | 'right' = customWall || activeWallForAdd || 'center';
      const isUpper = tpl.category === 'upper';
      const isAnthresole = tpl.category === 'anthresole';
      const sameTier = k.modules
        .filter((m) => (m.wall || 'center') === targetWall && isSameKitchenTier(m.category, tpl.category))
        .sort((a, b) => a.positionX - b.positionX);

      let targetX = customPositionX;
      if (targetX === undefined) {
        // For left/right walls in L/U kitchens, start at 600mm (after center countertop depth) if empty
        let candidateX =
          targetWall !== 'center' && sameTier.length === 0 ? 600 : 0;
        for (const m of sameTier) {
          if (candidateX + tpl.width <= m.positionX) {
            break;
          }
          candidateX = Math.max(candidateX, m.positionX + m.width);
        }
        targetX = candidateX;
      }

      const isGolaActive =
        Boolean(k.isGolaProfile) || prev.materials.defaultHandleType === 'gola';
      const basePosX = Math.max(0, Math.round(targetX));
      const adjacentTallOnWall =
        tpl.category === 'tall' &&
        isGolaActive &&
        k.modules.some(
          (m) =>
            m.category === 'tall' &&
            (m.wall || 'center') === targetWall &&
            (Math.abs(m.positionX + m.width - basePosX) <= 15 ||
              Math.abs(basePosX + tpl.width - m.positionX) <= 15)
        );

      const newMod: KitchenModuleItem = {
        ...JSON.parse(JSON.stringify(tpl)),
        id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        wall: targetWall,
        positionX: basePosX,
        height:
          isGolaActive && tpl.category === 'lower' && tpl.height === 720 ? 780 : tpl.height,
        depth:
          isGolaActive &&
          (tpl.category === 'tall' || tpl.category === 'anthresole') &&
          tpl.depth === 560
            ? 578
            : tpl.depth,
        ...(adjacentTallOnWall ? { verticalGolaType: 'middle_c' as const } : {}),
        elevationY: isUpper
          ? k.upperElevation || 1460
          : isAnthresole
          ? (k.upperElevation || 1460) + 720
          : 0,
      };
      if (adjacentTallOnWall) {
        setTimeout(() => {
          showToast(
            'К пеналу приставлен пенал (GOLA): установлен срединный вертикальный профиль GOLA (C)'
          );
        }, 50);
      }
      const reqLen = newMod.positionX + newMod.width + 200;
      setSelectedId(newMod.id);
      setSelectedKind('module');
      setMultiSelectedIds([newMod.id]);
      return {
        ...prev,
        kitchen: {
          ...k,
          wallCenterLength:
            targetWall === 'center' ? Math.max(k.wallCenterLength, reqLen) : k.wallCenterLength,
          wallLeftLength:
            targetWall === 'left' ? Math.max(k.wallLeftLength || 2000, reqLen) : k.wallLeftLength,
          wallRightLength:
            targetWall === 'right' ? Math.max(k.wallRightLength || 2000, reqLen) : k.wallRightLength,
          modules: [...k.modules, newMod],
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Move module or obstacle in 3D scene via direct pointer drag (including switching between walls)
  const handleMoveItemIn3D = (
    id: string,
    kind: 'module' | 'obstacle',
    newPositionX: number,
    newElevationY?: number,
    newWall?: 'center' | 'left' | 'right'
  ) => {
    setScene((prev) => {
      const k = prev.kitchen;
      if (kind === 'module') {
        const mod = k.modules.find((m) => m.id === id);
        const modW = mod ? mod.width : 600;
        const activeWall = newWall || mod?.wall || 'center';
        const reqLen = newPositionX + modW;
        return {
          ...prev,
          kitchen: {
            ...k,
            wallCenterLength:
              activeWall === 'center' ? Math.max(k.wallCenterLength, reqLen) : k.wallCenterLength,
            wallLeftLength:
              activeWall === 'left' ? Math.max(k.wallLeftLength || 2000, reqLen) : k.wallLeftLength,
            wallRightLength:
              activeWall === 'right' ? Math.max(k.wallRightLength || 2000, reqLen) : k.wallRightLength,
            modules: k.modules.map((m) =>
              m.id === id
                ? {
                    ...m,
                    wall: activeWall,
                    positionX: Math.max(0, Math.round(newPositionX)),
                  }
                : m
            ),
          },
          updatedAt: new Date().toISOString(),
        };
      } else {
        return {
          ...prev,
          kitchen: {
            ...k,
            obstacles: k.obstacles.map((o) =>
              o.id === id
                ? {
                    ...o,
                    ...(newWall ? { wall: newWall } : {}),
                    positionX: Math.max(0, Math.round(newPositionX)),
                    ...(newElevationY !== undefined
                      ? { elevationY: Math.max(0, Math.round(newElevationY)) }
                      : {}),
                  }
                : o
            ),
          },
          updatedAt: new Date().toISOString(),
        };
      }
    });
  };

  // Swap two modules in the same tier & wall (recalculates their X positions cleanly)
  const handleSwapTwoKitchenModules = (modIdA: string, modIdB: string) => {
    if (modIdA === modIdB) return;
    setScene((prev) => {
      const k = prev.kitchen;
      const modA = k.modules.find((m) => m.id === modIdA);
      const modB = k.modules.find((m) => m.id === modIdB);
      if (!modA || !modB) return prev;

      const wallA = modA.wall || 'center';
      const wallB = modB.wall || 'center';

      // Sort all modules in this tier and wall by positionX
      const tierMods = k.modules
        .filter((m) => (m.wall || 'center') === wallA && isSameKitchenTier(m.category, modA.category))
        .sort((a, b) => a.positionX - b.positionX);

      const idxA = tierMods.findIndex((m) => m.id === modIdA);
      const idxB = tierMods.findIndex((m) => m.id === modIdB);

      if (idxA === -1 || idxB === -1 || wallA !== wallB) {
        return {
          ...prev,
          kitchen: {
            ...k,
            modules: k.modules.map((m) => {
              if (m.id === modIdA) return { ...m, wall: wallB, positionX: modB.positionX };
              if (m.id === modIdB) return { ...m, wall: wallA, positionX: modA.positionX };
              return m;
            }),
          },
          updatedAt: new Date().toISOString(),
        };
      }

      const minIdx = Math.min(idxA, idxB);
      const maxIdx = Math.max(idxA, idxB);
      const startSpanX = tierMods[minIdx].positionX;

      const reordered = [...tierMods];
      const temp = reordered[idxA];
      reordered[idxA] = reordered[idxB];
      reordered[idxB] = temp;

      const updatedXById = new Map<string, number>();
      let cursorX = startSpanX;
      for (let i = minIdx; i <= maxIdx; i++) {
        updatedXById.set(reordered[i].id, cursorX);
        cursorX += reordered[i].width;
      }

      return {
        ...prev,
        kitchen: {
          ...k,
          modules: k.modules.map((m) =>
            updatedXById.has(m.id) ? { ...m, positionX: updatedXById.get(m.id)! } : m
          ),
        },
        updatedAt: new Date().toISOString(),
      };
    });
    showToast('Модули поменяны местами');
  };

  // Swap selected module with its immediate Left or Right neighbor in the same tier & wall
  const handleSwapKitchenModuleDirection = (modId: string, direction: 'left' | 'right') => {
    const mod = scene.kitchen.modules.find((m) => m.id === modId);
    if (!mod) return;
    const modWall = mod.wall || 'center';
    const tierMods = scene.kitchen.modules
      .filter((m) => (m.wall || 'center') === modWall && isSameKitchenTier(m.category, mod.category))
      .sort((a, b) => a.positionX - b.positionX);
    const idx = tierMods.findIndex((m) => m.id === modId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tierMods.length) return;
    handleSwapTwoKitchenModules(modId, tierMods[targetIdx].id);
  };

  // Rotate kitchen module to another wall (left, center, right, or prev/next)
  // Automatically upgrades kitchen layout to L-shape or U-shape if user chooses a side wall!
  const handleRotateKitchenModuleWall = (
    targetModId?: string,
    action: 'prev' | 'next' | 'left' | 'center' | 'right' = 'next'
  ) => {
    const modId = targetModId || selectedKitchenModule?.id || scene.kitchen.modules[0]?.id;
    if (!modId) {
      showToast('Сначала выберите модуль для поворота');
      return;
    }

    let toastText = '';

    setScene((prev) => {
      const k = prev.kitchen;
      const mod = k.modules.find((m) => m.id === modId);
      if (!mod) return prev;

      const currentWall: 'left' | 'center' | 'right' = mod.wall || 'center';
      let nextWall: 'left' | 'center' | 'right';

      if (action === 'left' || action === 'center' || action === 'right') {
        nextWall = action;
      } else if (action === 'prev') {
        // Step leftwards: right -> center -> left -> right
        if (currentWall === 'right') nextWall = 'center';
        else if (currentWall === 'center') nextWall = 'left';
        else nextWall = 'right';
      } else {
        // Step rightwards: left -> center -> right -> left
        if (currentWall === 'left') nextWall = 'center';
        else if (currentWall === 'center') nextWall = 'right';
        else nextWall = 'left';
      }

      if (nextWall === currentWall) {
        toastText = `Модуль «${mod.name}» уже находится на стене: ${
          nextWall === 'left' ? 'Левая' : nextWall === 'right' ? 'Правая' : 'Центральная'
        }`;
        return prev;
      }

      // Check if layout needs to be upgraded (e.g. from straight to l_left / l_right / u_shape)
      let nextLayout = k.layoutType;
      let nextWallLeft = k.wallLeftLength || 1800;
      let nextWallRight = k.wallRightLength || 1800;
      let nextWallCenter = k.wallCenterLength || 3000;
      let layoutUpgradeMessage = '';

      if (nextWall === 'left') {
        if (k.layoutType === 'straight') {
          nextLayout = 'l_left';
          nextWallLeft = Math.max(1800, k.wallLeftLength || 1800);
          layoutUpgradeMessage = 'Включена угловая кухня (Г-образная влево)';
        } else if (k.layoutType === 'l_right') {
          nextLayout = 'u_shape';
          nextWallLeft = Math.max(1800, k.wallLeftLength || 1800);
          layoutUpgradeMessage = 'Включена П-образная кухня';
        }
      } else if (nextWall === 'right') {
        if (k.layoutType === 'straight') {
          nextLayout = 'l_right';
          nextWallRight = Math.max(1800, k.wallRightLength || 1800);
          layoutUpgradeMessage = 'Включена угловая кухня (Г-образная вправо)';
        } else if (k.layoutType === 'l_left') {
          nextLayout = 'u_shape';
          nextWallRight = Math.max(1800, k.wallRightLength || 1800);
          layoutUpgradeMessage = 'Включена П-образная кухня';
        }
      }

      // Calculate safe positionX on the new wall
      // For side walls:
      // Lower/tall modules need to clear the center wall modules & countertop (600 mm)
      // Upper/anthresole modules need to clear center upper cabinets (320 mm)
      const isLowerTier = mod.category === 'lower' || mod.category === 'tall';
      const minCornerOffset = nextWall === 'center' ? 0 : isLowerTier ? 600 : 320;

      // Find other modules already placed on this target wall in the same tier
      const existingSameTier = k.modules.filter(
        (m) =>
          m.id !== mod.id &&
          (m.wall || 'center') === nextWall &&
          isSameKitchenTier(m.category, mod.category)
      );

      let targetX = minCornerOffset;
      if (existingSameTier.length > 0) {
        const maxEnd = Math.max(...existingSameTier.map((m) => m.positionX + m.width));
        targetX = Math.max(minCornerOffset, maxEnd);
      }

      // Ensure wall length is large enough to contain this module
      if (nextWall === 'left') {
        nextWallLeft = Math.max(nextWallLeft, targetX + mod.width + 100);
      } else if (nextWall === 'right') {
        nextWallRight = Math.max(nextWallRight, targetX + mod.width + 100);
      } else if (nextWall === 'center') {
        nextWallCenter = Math.max(nextWallCenter, targetX + mod.width + 100);
      }

      const wallNameRu =
        nextWall === 'left' ? 'левую стену' : nextWall === 'right' ? 'правую стену' : 'центральную стену';

      toastText = layoutUpgradeMessage
        ? `${layoutUpgradeMessage}! Модуль «${mod.name}» повернут на ${wallNameRu} (горячие клавиши: Ctrl+[ / Ctrl+])`
        : `Модуль «${mod.name}» повернут на ${wallNameRu} (горячие клавиши: Ctrl+[ / Ctrl+])`;

      const updatedModules = k.modules.map((m) =>
        m.id === mod.id ? { ...m, wall: nextWall, positionX: targetX } : m
      );

      return {
        ...prev,
        kitchen: {
          ...k,
          layoutType: nextLayout,
          wallCenterLength: nextWallCenter,
          wallLeftLength: nextWallLeft,
          wallRightLength: nextWallRight,
          modules: updatedModules,
        },
        updatedAt: new Date().toISOString(),
      };
    });

    if (toastText) {
      showToast(toastText);
    }
    setSelectedId(modId);
    setSelectedKind('module');
  };

  // Global hotkeys for kitchen module rotation between walls (Ctrl+[ / Ctrl+], Cmd+[, Cmd+], and single keys [ / ] / R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an editable field, ignore
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (scene.mode !== 'kitchen') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Rotate to Left wall: Ctrl+[ or Cmd+[ or [ or Ctrl+х / Ctrl+Х
      const isBracketLeft =
        e.code === 'BracketLeft' ||
        e.key === '[' ||
        e.key === '{' ||
        e.key === 'х' ||
        e.key === 'Х';

      // Rotate to Right wall: Ctrl+] or Cmd+] or ] or Ctrl+ъ / Ctrl+Ъ
      const isBracketRight =
        e.code === 'BracketRight' ||
        e.key === ']' ||
        e.key === '}' ||
        e.key === 'ъ' ||
        e.key === 'Ъ';

      if (isCtrlOrCmd && isBracketLeft) {
        e.preventDefault();
        handleRotateKitchenModuleWall(selectedKitchenModule?.id, 'prev');
      } else if (isCtrlOrCmd && isBracketRight) {
        e.preventDefault();
        handleRotateKitchenModuleWall(selectedKitchenModule?.id, 'next');
      } else if (!isCtrlOrCmd && isBracketLeft) {
        e.preventDefault();
        handleRotateKitchenModuleWall(selectedKitchenModule?.id, 'prev');
      } else if (!isCtrlOrCmd && isBracketRight) {
        e.preventDefault();
        handleRotateKitchenModuleWall(selectedKitchenModule?.id, 'next');
      } else if (!isCtrlOrCmd && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
        e.preventDefault();
        handleRotateKitchenModuleWall(selectedKitchenModule?.id, 'next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scene.mode, selectedKitchenModule?.id, scene.kitchen.modules]);

  // Pack all modules in each tier & wall flush left-to-right without gaps
  const handlePackKitchenModulesFlush = () => {
    setScene((prev) => {
      const k = prev.kitchen;
      const updatedX = new Map<string, number>();
      const hasCenterLower = k.modules.some(
        (m) => (m.wall || 'center') === 'center' && (m.category === 'lower' || m.category === 'tall')
      );

      (['center', 'left', 'right'] as const).forEach((wall) => {
        const packTier = (filterFn: (m: KitchenModuleItem) => boolean, startAtMm: number) => {
          const sorted = k.modules
            .filter((m) => (m.wall || 'center') === wall && filterFn(m))
            .sort((a, b) => a.positionX - b.positionX);
          let cx = startAtMm;
          for (const m of sorted) {
            updatedX.set(m.id, cx);
            cx += m.width;
          }
        };

        const sideStartLower = wall !== 'center' && hasCenterLower ? 600 : 0;
        const sideStartUpper = wall !== 'center' ? 300 : 0;

        packTier((m) => m.category === 'lower' || m.category === 'tall', sideStartLower);
        packTier((m) => m.category === 'upper', sideStartUpper);
        packTier((m) => m.category === 'anthresole', sideStartUpper);
      });

      return {
        ...prev,
        kitchen: {
          ...k,
          modules: k.modules.map((m) =>
            updatedX.has(m.id) ? { ...m, positionX: updatedX.get(m.id)! } : m
          ),
        },
        updatedAt: new Date().toISOString(),
      };
    });
    showToast('Модули выровнены вплотную по стенам');
  };

  const handleLoadDemoKitchen = () => {
    const demoMods = createDemoKitchenModules();
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        modules: demoMods,
      },
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId(demoMods[0]?.id || null);
    setSelectedKind('module');
    showToast('Загружен демонстрационный гарнитур');
  };

  const handleClearKitchenScene = () => {
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        modules: [],
        obstacles: [],
      },
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId(null);
    showToast('Сцена очищена');
  };

  const handleUpdateKitchenModule = (modId: string, patch: Partial<KitchenModuleItem>) => {
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        modules: prev.kitchen.modules.map((m) => {
          if (m.id !== modId) return m;
          const nextMod: KitchenModuleItem = { ...m, ...patch };
          // Auto-clamp drawerDepth and innerDrawerDepth if carcass depth was reduced
          if (patch.depth !== undefined && nextMod.drawersCount > 0) {
            const maxAllowed = getMaxAllowedDrawerDepth(nextMod.depth);
            const curDepth = nextMod.drawerDepth || 500;
            if (curDepth > maxAllowed) {
              nextMod.drawerDepth = maxAllowed;
            }
            if (nextMod.hasInnerDrawer || nextMod.fillingType === 'drawers_2_inner') {
              const curInner = nextMod.innerDrawerDepth || 450;
              if (curInner > maxAllowed) {
                nextMod.innerDrawerDepth = maxAllowed;
              }
            }
          }
          return nextMod;
        }),
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMirrorKitchenModule = (modId: string) => {
    setScene((prev) => {
      const target = prev.kitchen.modules.find((m) => m.id === modId);
      if (!target) return prev;
      const nextSide: 'left' | 'right' = (target.hingeSide || 'left') === 'left' ? 'right' : 'left';
      return {
        ...prev,
        kitchen: {
          ...prev.kitchen,
          modules: prev.kitchen.modules.map((m) =>
            m.id === modId ? { ...m, hingeSide: nextSide } : m
          ),
        },
        updatedAt: new Date().toISOString(),
      };
    });
    showToast('Модуль отражён (лево ⇄ право)');
  };

  const handleApplyMultiAlignment = (mode: ModuleAlignPlane) => {
    if (multiSelectedIds.length < 2) return;
    const refId = multiSelectedIds[0];
    setScene((prev) => {
      const refMod = prev.kitchen.modules.find((m) => m.id === refId);
      if (!refMod) return prev;
      const targetSet = new Set(multiSelectedIds.slice(1));
      let runningRightX = refMod.positionX + refMod.width;
      let runningLeftX = refMod.positionX;

      const updated = prev.kitchen.modules.map((m) => {
        if (!targetSet.has(m.id)) return m;
        const copy = { ...m };
        if (mode === 'left_edge') {
          copy.wall = refMod.wall || 'center';
          copy.positionX = refMod.positionX;
        } else if (mode === 'right_edge') {
          copy.wall = refMod.wall || 'center';
          copy.positionX = Math.max(0, refMod.positionX + refMod.width - copy.width);
        } else if (mode === 'center_x') {
          copy.wall = refMod.wall || 'center';
          copy.positionX = Math.max(
            0,
            Math.round(refMod.positionX + refMod.width / 2 - copy.width / 2)
          );
        } else if (mode === 'flush_right') {
          copy.wall = refMod.wall || 'center';
          copy.positionX = runningRightX;
          runningRightX += copy.width;
        } else if (mode === 'flush_left') {
          copy.wall = refMod.wall || 'center';
          runningLeftX = Math.max(0, runningLeftX - copy.width);
          copy.positionX = runningLeftX;
        } else if (mode === 'bottom_y') {
          const refBottom =
            refMod.elevationY !== undefined
              ? refMod.elevationY
              : refMod.category === 'upper'
              ? 1450
              : refMod.category === 'anthresole'
              ? 2170
              : prev.kitchen.plinthHeight;
          copy.elevationY = refBottom;
        } else if (mode === 'top_y') {
          const refBottom =
            refMod.elevationY !== undefined
              ? refMod.elevationY
              : refMod.category === 'upper'
              ? 1450
              : refMod.category === 'anthresole'
              ? 2170
              : prev.kitchen.plinthHeight;
          const refTop = refBottom + refMod.height;
          copy.elevationY = Math.max(0, refTop - copy.height);
        } else if (mode === 'front_z') {
          const refFrontOffset = (refMod.positionZ || 0) + refMod.depth;
          copy.positionZ = Math.round(refFrontOffset - copy.depth);
        }
        return copy;
      });

      return {
        ...prev,
        kitchen: {
          ...prev.kitchen,
          modules: updated,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    setShowAlignmentModal(false);
    showToast('Модули выровнены относительно первого выбранного модуля');
  };

  const handleDeleteKitchenModule = (modId: string) => {
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        modules: prev.kitchen.modules.filter((m) => m.id !== modId),
      },
      updatedAt: new Date().toISOString(),
    }));
    if (selectedId === modId) setSelectedId(null);
    setMultiSelectedIds((prev) => prev.filter((id) => id !== modId));
  };

  const handleDuplicateKitchenModule = (mod: KitchenModuleItem) => {
    const { id: _ignore, wall: modWall, positionX: _x, ...rest } = mod;
    handleAddKitchenModule(rest, mod.positionX + mod.width, modWall || 'center');
  };

  const handleReplaceKitchenModule = (
    oldModId: string,
    newTpl: Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>
  ) => {
    setScene((prev) => {
      const k = prev.kitchen;
      const target = k.modules.find((m) => m.id === oldModId);
      if (!target) return prev;

      const updated = k.modules.map((m) => {
        if (m.id !== oldModId) return m;
        return {
          ...m,
          ...newTpl,
          id: oldModId,
          wall: m.wall,
          positionX: m.positionX,
          positionZ: m.positionZ,
          width: target.width, // Always preserve exact width of module being replaced
          hingeSide: newTpl.hingeSide || m.hingeSide,
        };
      });

      return {
        ...prev,
        kitchen: {
          ...k,
          modules: updated,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    setShowReplaceModal(false);
    setRadialMenuPos(null);
    showToast(`Модуль заменён на «${newTpl.name}»`);
  };

  const handleSaveModuleToCompanyDB = async (mod: KitchenModuleItem) => {
    if (!companyId) return;
    setSavingCustomModule(true);
    try {
      const { id: _ignore, wall: _w, positionX: _x, ...templateObj } = mod;
      const customTpl = {
        ...templateObj,
        templateCode: `CUST-${Date.now().toString().slice(-4)}`,
        name: mod.name.includes('(Свой)') ? mod.name : `${mod.name} (Свой)`,
      };
      const nextList = [...companyCustomModules, customTpl];
      setCompanyCustomModules(nextList);
      await fetch(`/api/db/doc/companies/${companyId}/settings/constructorModules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: nextList, updatedAt: new Date().toISOString() }),
      });
      showToast('Модуль сохранен в базу модулей компании');
    } catch {
      showToast('Не удалось сохранить модуль');
    } finally {
      setSavingCustomModule(false);
    }
  };

  // Room Obstacle Operations
  const handleAddObstacle = (
    tpl: Omit<RoomObstacleItem, 'id' | 'wall' | 'positionX'>,
    customPositionX?: number,
    customElevationY?: number,
    customWall?: 'center' | 'left' | 'right'
  ) => {
    setScene((prev) => {
      const targetWall = customWall || activeWallForAdd || 'center';
      // Vent shafts and columns default flush to the left corner (X = 0)
      const isCornerDefault = tpl.type === 'vent_shaft' || tpl.type === 'column';
      const defaultX = isCornerDefault
        ? 0
        : Math.max(0, Math.round(prev.kitchen.wallCenterLength - tpl.width));
      const newObs: RoomObstacleItem = {
        ...tpl,
        id: `obs-${Date.now()}`,
        wall: targetWall,
        positionX: customPositionX !== undefined ? Math.max(0, Math.round(customPositionX)) : defaultX,
        elevationY:
          customElevationY !== undefined ? Math.max(0, Math.round(customElevationY)) : tpl.elevationY,
        positionZ: tpl.positionZ ?? 0,
      };
      setSelectedId(newObs.id);
      setSelectedKind('obstacle');
      setIsInspectorOpen(true);
      return {
        ...prev,
        kitchen: {
          ...prev.kitchen,
          obstacles: [...prev.kitchen.obstacles, newObs],
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleUpdateObstacle = (obsId: string, patch: Partial<RoomObstacleItem>) => {
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        obstacles: prev.kitchen.obstacles.map((o) => (o.id === obsId ? { ...o, ...patch } : o)),
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteObstacle = (obsId: string) => {
    setScene((prev) => ({
      ...prev,
      kitchen: {
        ...prev.kitchen,
        obstacles: prev.kitchen.obstacles.filter((o) => o.id !== obsId),
      },
      updatedAt: new Date().toISOString(),
    }));
    if (selectedId === obsId) setSelectedId(null);
  };

  // Export .B3D
  const handleDownloadB3D = () => {
    downloadB3DFile(bom.panels, bom.hardware, scene.projectName || 'Проект_3D');
    showToast('Файл .B3D (формат XBS Базис) сформирован и скачан');
  };

  const handleDownloadBazisScript = () => {
    downloadBazisScriptFile(bom.panels, bom.hardware, scene.projectName || 'Проект_3D');
    showToast('3D-скрипт Базис-Мебельщик (.js) скачан');
  };

  // Apply to Calculator (including automatic worktopCutting for "Раскрой столешниц")
  const handleTransferToCalculator = () => {
    if (!onApplyToCalculator) return;
    const rawData = buildBazisRawDataFromPanels(bom.panels, bom.hardware);
    onApplyToCalculator({
      rawData,
      panels: bom.panels,
      hardware: bom.hardware,
      scene,
      worktopCutting,
    });
  };

  // Direct Save Project
  const handleSaveProject = () => {
    if (!onSaveProjectDirect) return;
    const rawData = buildBazisRawDataFromPanels(bom.panels, bom.hardware);
    onSaveProjectDirect({
      rawData,
      panels: bom.panels,
      hardware: bom.hardware,
      scene,
      worktopCutting,
    });
    setLastAutoSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    showToast('3D проект сохранен в «Проекты»');
  };

  // Auto-save online constructions to "Проекты" (debounced + every 5 minutes)
  useEffect(() => {
    if (isWidgetMode || !onAutoSaveProject) return;
    const performSilentAutoSave = () => {
      const rawData = buildBazisRawDataFromPanels(bom.panels, bom.hardware);
      onAutoSaveProject({
        rawData,
        panels: bom.panels,
        hardware: bom.hardware,
        scene,
        worktopCutting,
      });
      setLastAutoSavedAt(
        new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      );
    };

    const debounceTimer = window.setTimeout(performSilentAutoSave, 4000);
    const fiveMinInterval = window.setInterval(performSilentAutoSave, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(fiveMinInterval);
    };
  }, [scene, bom, worktopCutting, isWidgetMode, onAutoSaveProject]);

  // B2C Widget Submit
  const handleWidgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;
    setWidgetSubmitting(true);
    try {
      const rawData = buildBazisRawDataFromPanels(bom.panels, bom.hardware);
      const res = await fetch(`/api/widget/constructor/${companyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientComment: clientComment.trim(),
          projectName: scene.projectName || `Заявка с сайта (${clientName.trim()})`,
          scene,
          panels: bom.panels,
          hardware: bom.hardware,
          rawData,
          totalAreaM2: bom.totalAreaM2,
          facadeAreaM2: bom.facadeAreaM2,
        }),
      });
      if (res.ok) {
        setWidgetSubmittedSuccess(true);
      } else {
        showToast('Ошибка при отправке проекта');
      }
    } catch {
      showToast('Ошибка соединения с сервером');
    } finally {
      setWidgetSubmitting(false);
    }
  };

  const widgetUrl = `${window.location.origin}/widget/constructor/${companyId}`;
  const iframeSnippet = `<iframe src="${widgetUrl}" width="100%" height="780" style="border:none;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);" allow="fullscreen"></iframe>`;

  return (
    <div className="flex flex-col w-full h-full min-h-[740px] bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scene.projectName}
                onChange={(e) =>
                  setScene((prev) => ({ ...prev, projectName: e.target.value }))
                }
                className="bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-800 text-white font-semibold text-sm px-2.5 py-1 rounded-lg border border-slate-700 focus:border-amber-400 focus:outline-none w-56"
                placeholder="Название 3D проекта..."
              />
              {isWidgetMode && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Онлайн-конструктор {companyName}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
              <span>Деталей: {bom.panels.reduce((a, b) => a + b.count, 0)} шт.</span>
              <span>•</span>
              <span>Площадь плит: {bom.totalAreaM2} м²</span>
              <span>•</span>
              <span>Фасады: {bom.facadeAreaM2} м²</span>
            </div>
          </div>

          {/* Mode Switcher: Kitchen vs Wardrobe/Dressing Room */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 ml-2">
            <button
              type="button"
              onClick={() => {
                setScene((prev) => ({ ...prev, mode: 'kitchen' }));
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scene.mode === 'kitchen'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Кухни (Модули + Техника)
            </button>
            <button
              type="button"
              onClick={() => {
                setScene((prev) => ({ ...prev, mode: 'wardrobe' }));
                setSelectedId(scene.wardrobe.sections[0]?.id || null);
                setSelectedKind('section');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scene.mode === 'wardrobe'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Шкафы и Гардеробные
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {lastAutoSavedAt && !isWidgetMode && (
            <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 rounded-lg font-medium">
              Автосохранено в {lastAutoSavedAt}
            </span>
          )}
          {scene.mode === 'kitchen' && (
            <>
              <button
                type="button"
                onClick={() => setShowRoomDimensionsModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                title="Задать габариты помещения, форму кухни и высоту потолка"
              >
                <Ruler className="w-4 h-4 text-amber-400" />
                <span>Габариты помещения</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSketchesModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/40 text-xs font-semibold transition-colors shadow-xs"
                title="Открыть 2D технические эскизы и чертежи со сносками для технолога"
              >
                <FileText className="w-4 h-4" />
                <span>Создать эскизы</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConstructorSettingsModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-600/50 text-xs font-semibold transition-colors shadow-xs"
                title="Настроить соответствие стандартных механизмов и фурнитуры вашему каталогу"
              >
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Настройки 3D</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownloadB3D}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition-colors"
            title="Скачать бинарный файл .b3d (XBS формат) для Базис-Мебельщик или повторной загрузки"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Скачать .B3D</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBazisScript}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition-colors"
            title="Скачать 3D-скрипт (.js) для автоматического построения всех панелей в Базис-Мебельщик"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Скрипт Базис (.JS)</span>
          </button>

          {!isWidgetMode && (
            <>
              <button
                type="button"
                onClick={() => setShowWidgetCodeModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition-colors"
                title="Получить код встройки 3D-конструктора на сайт компании"
              >
                <Code2 className="w-4 h-4 text-sky-400" />
                <span>Виджет на сайт</span>
              </button>

              {onSaveProjectDirect && (
                <button
                  type="button"
                  onClick={handleSaveProject}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>В Проекты</span>
                </button>
              )}

              {onApplyToCalculator && (
                <button
                  type="button"
                  onClick={handleTransferToCalculator}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Рассчитать в калькуляторе</span>
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Закрыть конструктор"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {isWidgetMode && (
            <button
              type="button"
              onClick={() => setShowWidgetSubmitModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Отправить проект на расчёт стоимости</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Workspace: Left Library (428px for 3-in-a-row miniatures) + Center 3D Viewport (flex-1) + Right Inspector (360px conditional) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[640px] overflow-hidden relative">
        {/* LEFT SIDEBAR: Modules / Sections / Materials / Obstacles / BOM */}
        <div className="w-full lg:w-[428px] lg:shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          {/* Sub-navigation tabs */}
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-100/70 p-1 gap-1">
            <button
              type="button"
              onClick={() => setLeftTab('modules')}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-colors ${
                leftTab === 'modules'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mb-0.5 text-amber-600" />
              <span>{scene.mode === 'kitchen' ? 'Модули' : 'Габариты'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('materials')}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-colors ${
                leftTab === 'materials'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5 mb-0.5 text-indigo-600" />
              <span>Материалы</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('obstacles')}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-colors ${
                leftTab === 'obstacles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mb-0.5 text-rose-600" />
              <span>Помещение</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('bom')}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-colors ${
                leftTab === 'bom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 mb-0.5 text-emerald-600" />
              <span>Детали ({bom.panels.length})</span>
            </button>
          </div>

          {/* Left Sidebar Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {leftTab === 'modules' && scene.mode === 'kitchen' && (
              <>
                {/* Room, Layout (Straight / L / U) & Worktop Joint parameters */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setIsPlanningCardCollapsed((v) => !v)}
                      className="flex items-center gap-1 text-left hover:text-amber-700 transition-colors"
                      title={
                        isPlanningCardCollapsed
                          ? 'Развернуть блок планировки и габаритов'
                          : 'Свернуть блок планировки для удобного просмотра миниатюр модулей'
                      }
                    >
                      {isPlanningCardCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span>Планировка и габариты стен</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowRoomDimensionsModal(true)}
                        className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 underline"
                      >
                        <Ruler className="w-3 h-3" />
                        <span>Окно</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPlanningCardCollapsed((v) => !v)}
                        className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-[10px] font-semibold text-slate-700"
                      >
                        {isPlanningCardCollapsed ? 'Развернуть' : 'Свернуть'}
                      </button>
                    </div>
                  </div>

                  {!isPlanningCardCollapsed && (
                    <>

                  {/* Layout Type Selector: Straight / L-Left / L-Right / U-Shape */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Форма кухни:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'straight', label: 'Прямая (I)' },
                          { id: 'l_left', label: 'Угловая левая (Г)' },
                          { id: 'l_right', label: 'Угловая правая (L)' },
                          { id: 'u_shape', label: 'П-образная (П)' },
                        ] as const
                      ).map((lt) => (
                        <button
                          key={lt.id}
                          type="button"
                          onClick={() => {
                            setScene((prev) => ({
                              ...prev,
                              kitchen: {
                                ...prev.kitchen,
                                layoutType: lt.id,
                                wallLeftLength:
                                  lt.id === 'l_left' || lt.id === 'u_shape'
                                    ? Math.max(1200, prev.kitchen.wallLeftLength || 1800)
                                    : prev.kitchen.wallLeftLength,
                                wallRightLength:
                                  lt.id === 'l_right' || lt.id === 'u_shape'
                                    ? Math.max(1200, prev.kitchen.wallRightLength || 1800)
                                    : prev.kitchen.wallRightLength,
                              },
                            }));
                            if (lt.id === 'straight') setActiveWallForAdd('center');
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            scene.kitchen.layoutType === lt.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {lt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Центральная стена
                      </label>
                      <NumericInput
                        min={1200}
                        max={10000}
                        value={scene.kitchen.wallCenterLength}
                        onChange={(val) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: {
                              ...prev.kitchen,
                              wallCenterLength: val,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Высота цоколя
                      </label>
                      <NumericInput
                        min={60}
                        max={200}
                        value={scene.kitchen.plinthHeight}
                        onChange={(val) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: {
                              ...prev.kitchen,
                              plinthHeight: val,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                      />
                    </div>
                  </div>

                  {(scene.kitchen.layoutType === 'l_left' ||
                    scene.kitchen.layoutType === 'l_right' ||
                    scene.kitchen.layoutType === 'u_shape') && (
                    <div className="grid grid-cols-2 gap-2">
                      {(scene.kitchen.layoutType === 'l_left' ||
                        scene.kitchen.layoutType === 'u_shape') && (
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">
                            Левая стена (мм)
                          </label>
                          <NumericInput
                            min={900}
                            max={8000}
                            value={scene.kitchen.wallLeftLength || 1800}
                            onChange={(val) =>
                              setScene((prev) => ({
                                ...prev,
                                kitchen: {
                                  ...prev.kitchen,
                                  wallLeftLength: val,
                                },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                          />
                        </div>
                      )}
                      {(scene.kitchen.layoutType === 'l_right' ||
                        scene.kitchen.layoutType === 'u_shape') && (
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">
                            Правая стена (мм)
                          </label>
                          <NumericInput
                            min={900}
                            max={8000}
                            value={scene.kitchen.wallRightLength || 1800}
                            onChange={(val) =>
                              setScene((prev) => ({
                                ...prev,
                                kitchen: {
                                  ...prev.kitchen,
                                  wallRightLength: val,
                                },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Wall Selector for '+' Button when L/U shape */}
                  {scene.kitchen.layoutType !== 'straight' && (
                    <div className="pt-1 border-t border-slate-200/80">
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Куда добавлять модули по кнопке «+»:
                      </label>
                      <div className="flex gap-1">
                        {(
                          [
                            ...(scene.kitchen.layoutType === 'l_left' ||
                            scene.kitchen.layoutType === 'u_shape'
                              ? [{ id: 'left' as const, label: 'Левая стена' }]
                              : []),
                            { id: 'center' as const, label: 'Центр. стена' },
                            ...(scene.kitchen.layoutType === 'l_right' ||
                            scene.kitchen.layoutType === 'u_shape'
                              ? [{ id: 'right' as const, label: 'Правая стена' }]
                              : []),
                          ]
                        ).map((wBtn) => (
                          <button
                            key={wBtn.id}
                            type="button"
                            onClick={() => setActiveWallForAdd(wBtn.id)}
                            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                              activeWallForAdd === wBtn.id
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {wBtn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.kitchen.hasUnifiedWorktop}
                        onChange={(e) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: {
                              ...prev.kitchen,
                              hasUnifiedWorktop: e.target.checked,
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-amber-600"
                      />
                      <span>Единая столешница</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.kitchen.hasBacksplash}
                        onChange={(e) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: {
                              ...prev.kitchen,
                              hasBacksplash: e.target.checked,
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-amber-600"
                      />
                      <span>Стеновая панель</span>
                    </label>
                  </div>

                  {/* Corner Worktop Joint & Slab Length Settings */}
                  {scene.kitchen.hasUnifiedWorktop && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>Раскрой и стыковка столешницы</span>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Авто-перенос в расчёт
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Соединение в углу
                          </label>
                          <select
                            value={scene.kitchen.cornerJointType || 'plank'}
                            onChange={(e) =>
                              setScene((prev) => ({
                                ...prev,
                                kitchen: {
                                  ...prev.kitchen,
                                  cornerJointType: e.target.value as 'plank' | 'eurojoint',
                                },
                              }))
                            }
                            className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                          >
                            <option value="plank">Через планку</option>
                            <option value="eurojoint">Еврозапил (+70 мм)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Длина полотна
                          </label>
                          <select
                            value={scene.kitchen.worktopStockLength || 3000}
                            onChange={(e) =>
                              setScene((prev) => ({
                                ...prev,
                                kitchen: {
                                  ...prev.kitchen,
                                  worktopStockLength: Number(e.target.value) as 3000 | 4000,
                                },
                              }))
                            }
                            className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                          >
                            <option value={3000}>3000 мм (3 м)</option>
                            <option value={4000}>4000 мм (4 м)</option>
                          </select>
                        </div>
                      </div>
                      {worktopCutting && worktopCutting.segments.length > 0 && (
                        <div className="text-[10px] text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 space-y-0.5">
                          {worktopCutting.segments.map((seg) => (
                            <div key={seg.id} className="flex justify-between">
                              <span className="truncate pr-1">{seg.label}:</span>
                              <span className="font-bold text-slate-900 shrink-0">
                                {seg.cutLengthMm}×{seg.depthMm} мм
                                {seg.eurojointExtraMm > 0
                                  ? ` (вкл. +${seg.eurojointExtraMm} мм)`
                                  : ''}
                              </span>
                            </div>
                          ))}
                          <div className="pt-1 mt-1 border-t border-amber-200/60 flex justify-between font-bold text-amber-900">
                            <span>Полотен {worktopCutting.stockLengthMm} мм:</span>
                            <span>
                              {worktopCutting.slabsRequired} шт. (сумма{' '}
                              {worktopCutting.totalCutLengthMm} мм)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technological Standards Info */}
                  <div className="px-2.5 py-2 rounded-lg bg-slate-100 text-[10px] text-slate-600 leading-snug space-y-1">
                    <div>
                      Стандарт базы: боковина <b>512 мм</b> + ДВП <b>3 мм</b> + отступ{' '}
                      <b>45 мм</b> = <b>560 мм</b> • Свес <b>40 мм</b> • Цоколь <b>-80 мм</b>
                    </div>
                    <div className="text-amber-800 font-medium">
                      GOLA-база: корпус <b>780 мм</b> • отступ <b>63 мм</b> = <b>578 мм</b> • Свес столешницы <b>22 мм</b> (под зацеп)
                    </div>
                  </div>

                  {/* Quick alignment & scene actions */}
                  <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                    {scene.kitchen.modules.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={handlePackKitchenModulesFlush}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold transition-colors"
                          title="Сдвинуть все модули вплотную друг к другу слева направо без зазоров"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                          <span>Сдвинуть вплотную</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearKitchenScene}
                          className="px-2 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-[11px] font-medium transition-colors"
                          title="Очистить сцену от всех модулей"
                        >
                          Очистить
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLoadDemoKitchen}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-[11px] font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Заполнить демо-гарнитур (пример)</span>
                      </button>
                    )}
                  </div>
                    </>
                  )}
                </div>

                {/* Drag-and-drop hint */}
                <div className="px-2.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Перетащите модуль мышкой</strong> прямо на нужную стену в 3D (или нажмите «+»)
                  </span>
                </div>

                {/* Company Saved Custom Modules */}
                {companyCustomModules.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      База модулей компании ({companyCustomModules.length})
                    </div>
                    <div className="grid grid-cols-3 gap-2 justify-items-center">
                      {companyCustomModules.map((tpl, i) => (
                        <KitchenModuleThumbnail
                          key={`${tpl.templateCode}-${i}`}
                          tpl={tpl}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', tpl.templateCode);
                            setDraggedLibraryPayload({ kind: 'module', tpl });
                          }}
                          onDragEnd={() => setDraggedLibraryPayload(null)}
                          onClickAdd={(tplItem) => handleAddKitchenModule(tplItem)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Category Filter for Miniature Grid */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1">
                  {(
                    [
                      { id: 'all', label: 'Все' },
                      { id: 'lower', label: 'Нижние' },
                      { id: 'upper', label: 'Верхние' },
                      { id: 'tall', label: 'Пеналы' },
                      { id: 'anthresole', label: 'Антресоли' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setModuleCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                        moduleCategoryFilter === cat.id
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 3 Modules per row in 128x128 mm Visual Miniatures */}
                <div className="space-y-4">
                  {(
                    [
                      { cat: 'lower', title: 'Нижние тумбы и базы под технику' },
                      { cat: 'upper', title: 'Верхние навесные шкафы' },
                      { cat: 'tall', title: 'Пеналы и колонны с техникой' },
                      { cat: 'anthresole', title: 'Антресоли (3-й ярус)' },
                    ] as const
                  )
                    .filter((g) => moduleCategoryFilter === 'all' || moduleCategoryFilter === g.cat)
                    .map((group) => {
                      const groupModules = STANDARD_KITCHEN_MODULE_LIBRARY.filter(
                        (m) => m.category === group.cat
                      );
                      if (groupModules.length === 0) return null;
                      return (
                        <div key={group.cat} className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>{group.title}</span>
                            <span className="text-[10px] text-slate-400">({groupModules.length})</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 justify-items-center">
                            {groupModules.map((tpl) => (
                              <KitchenModuleThumbnail
                                key={tpl.templateCode}
                                tpl={tpl}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', tpl.templateCode);
                                  setDraggedLibraryPayload({ kind: 'module', tpl });
                                }}
                                onDragEnd={() => setDraggedLibraryPayload(null)}
                                onClickAdd={(tplItem) => handleAddKitchenModule(tplItem)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* WARDROBE / DRESSING ROOM GLOBAL CONTROLS */}
            {leftTab === 'modules' && scene.mode === 'wardrobe' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Габариты шкафа / гардеробной (мм)
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Ширина общая:</span>
                      <span className="font-bold text-slate-900">{scene.wardrobe.width} мм</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={600}
                        max={5400}
                        step={50}
                        value={scene.wardrobe.width}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ width: Number(e.target.value) })
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <NumericInput
                        min={400}
                        max={6000}
                        value={scene.wardrobe.width}
                        onChange={(val) => handleUpdateWardrobeGlobal({ width: val })}
                        className="w-20 px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Высота:</span>
                      <span className="font-bold text-slate-900">{scene.wardrobe.height} мм</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={800}
                        max={3100}
                        step={20}
                        value={scene.wardrobe.height}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ height: Number(e.target.value) })
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <NumericInput
                        min={600}
                        max={3500}
                        value={scene.wardrobe.height}
                        onChange={(val) => handleUpdateWardrobeGlobal({ height: val })}
                        className="w-20 px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Глубина:</span>
                      <span className="font-bold text-slate-900">{scene.wardrobe.depth} мм</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={320}
                        max={850}
                        step={10}
                        value={scene.wardrobe.depth}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ depth: Number(e.target.value) })
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <NumericInput
                        min={250}
                        max={1000}
                        value={scene.wardrobe.depth}
                        onChange={(val) => handleUpdateWardrobeGlobal({ depth: val })}
                        className="w-20 px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Высота цоколя (мм)
                      </label>
                      <NumericInput
                        min={0}
                        max={200}
                        value={scene.wardrobe.plinthHeight}
                        onChange={(val) => handleUpdateWardrobeGlobal({ plinthHeight: val })}
                        className="w-full px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Толщина ЛДСП
                      </label>
                      <select
                        value={scene.wardrobe.thickness}
                        onChange={(e) => {
                          const th = Number(e.target.value);
                          handleUpdateWardrobeGlobal({ thickness: th });
                          setScene((prev) => ({
                            ...prev,
                            materials: { ...prev.materials, carcassThickness: th },
                          }));
                        }}
                        className="w-full px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      >
                        <option value={16}>16 мм (Стандарт)</option>
                        <option value={18}>18 мм (Премиум)</option>
                        <option value={22}>22 мм (Усиленный)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Constructive Elements Checkboxes */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Конструктив корпуса и ниши
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.wardrobe.hasLeftSide}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ hasLeftSide: e.target.checked })
                        }
                      />
                      <span>Левая боковина</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.wardrobe.hasRightSide}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ hasRightSide: e.target.checked })
                        }
                      />
                      <span>Правая боковина</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.wardrobe.hasRoof}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ hasRoof: e.target.checked })
                        }
                      />
                      <span>Крыша</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scene.wardrobe.hasBottom}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ hasBottom: e.target.checked })
                        }
                      />
                      <span>Дно</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={scene.wardrobe.hasBackHDF}
                        onChange={(e) =>
                          handleUpdateWardrobeGlobal({ hasBackHDF: e.target.checked })
                        }
                      />
                      <span>Задняя стенка ХДФ 3 мм</span>
                    </label>
                  </div>
                </div>

                {/* Doors Type */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Фасады / Система дверей</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'none', label: 'Гардеробная (без дверей)' },
                        { id: 'swing', label: 'Распашные фасады' },
                        { id: 'sliding', label: 'Шкаф-купе' },
                      ] as const
                    ).map((dt) => (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => handleUpdateWardrobeGlobal({ doorType: dt.id })}
                        className={`p-2 rounded-lg text-[11px] font-semibold border text-center transition-all ${
                          scene.wardrobe.doorType === dt.id
                            ? 'bg-amber-500/15 border-amber-500 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {dt.label}
                      </button>
                    ))}
                  </div>

                  {scene.wardrobe.doorType === 'sliding' && (
                    <div className="pt-2 space-y-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span>Кол-во дверей-купе:</span>
                        <select
                          value={scene.wardrobe.slidingDoorsCount}
                          onChange={(e) => {
                            const cnt = Number(e.target.value);
                            handleUpdateWardrobeGlobal({
                              slidingDoorsCount: cnt,
                              mirrorDoors: Array.from(
                                { length: cnt },
                                (_, i) => scene.wardrobe.mirrorDoors?.[i] ?? false
                              ),
                            });
                          }}
                          className="px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                        >
                          <option value={2}>2 двери</option>
                          <option value={3}>3 двери</option>
                          <option value={4}>4 двери</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: scene.wardrobe.slidingDoorsCount }).map((_, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(scene.wardrobe.mirrorDoors?.[idx])}
                              onChange={(e) => {
                                const nextM = [...(scene.wardrobe.mirrorDoors || [])];
                                nextM[idx] = e.target.checked;
                                handleUpdateWardrobeGlobal({ mirrorDoors: nextM });
                              }}
                            />
                            <span>Дверь №{idx + 1}: Зеркало</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sections List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Секции ({scene.wardrobe.sections.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddWardrobeSection}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить секцию</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {scene.wardrobe.sections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        onClick={() => {
                          setSelectedId(sec.id);
                          setSelectedKind('section');
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          selectedId === sec.id
                            ? 'bg-amber-50 border-amber-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Секция №{idx + 1} ({sec.width} мм)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Полок: {sec.shelvesCount} • Ящиков: {sec.drawersCount}
                            {sec.hasRodTop ? ' • Штанга' : ''}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MATERIALS & CATALOG HARDWARE DEFAULT BINDINGS TAB */}
            {leftTab === 'materials' && (
              <div className="space-y-4">
                {/* Carcass Material */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Материал корпуса (по умолчанию Белый)
                  </div>
                  <select
                    value={scene.materials.carcassMaterialName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const preset = COLOR_DECOR_PRESETS.find((c) => c.materialTitle === val);
                      setScene((prev) => ({
                        ...prev,
                        materials: {
                          ...prev.materials,
                          carcassMaterialName: val,
                          carcassColor: preset ? preset.hex : prev.materials.carcassColor,
                        },
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {COLOR_DECOR_PRESETS.map((c) => (
                      <option key={c.id} value={c.materialTitle}>
                        {c.name}
                      </option>
                    ))}
                    {catalogMaterials.map((m: any, idx: number) => (
                      <option key={`cm-${idx}`} value={m.name}>
                        [Из базы] {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COLOR_DECOR_PRESETS.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setScene((prev) => ({
                            ...prev,
                            materials: {
                              ...prev.materials,
                              carcassMaterialName: c.materialTitle,
                              carcassColor: c.hex,
                            },
                          }))
                        }
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          scene.materials.carcassColor === c.hex
                            ? 'border-amber-500 scale-110'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Lower / Main Facades Material */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Материал фасадов (Нижние / Основные)
                  </div>
                  <select
                    value={scene.materials.facadeLowerMaterialName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const preset = COLOR_DECOR_PRESETS.find((c) => c.materialTitle === val);
                      setScene((prev) => ({
                        ...prev,
                        materials: {
                          ...prev.materials,
                          facadeLowerMaterialName: val,
                          facadeLowerColor: preset ? preset.hex : prev.materials.facadeLowerColor,
                        },
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {COLOR_DECOR_PRESETS.map((c) => (
                      <option key={c.id} value={c.materialTitle}>
                        {c.name}
                      </option>
                    ))}
                    {catalogMaterials.map((m: any, idx: number) => (
                      <option key={`cm-f-${idx}`} value={m.name}>
                        [Из базы] {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COLOR_DECOR_PRESETS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setScene((prev) => ({
                            ...prev,
                            materials: {
                              ...prev.materials,
                              facadeLowerMaterialName: c.materialTitle,
                              facadeLowerColor: c.hex,
                            },
                          }))
                        }
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          scene.materials.facadeLowerColor === c.hex
                            ? 'border-amber-500 scale-110'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Upper Facades Material (Kitchen) */}
                {scene.mode === 'kitchen' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      Материал верхних фасадов кухни
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_DECOR_PRESETS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setScene((prev) => ({
                              ...prev,
                              materials: {
                                ...prev.materials,
                                facadeUpperMaterialName: c.materialTitle,
                                facadeUpperColor: c.hex,
                              },
                            }))
                          }
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            scene.materials.facadeUpperColor === c.hex
                              ? 'border-amber-500 scale-110'
                              : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Worktop Material */}
                {scene.mode === 'kitchen' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800">Столешница</div>
                    <select
                      value={scene.materials.worktopMaterialName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchedWt = worktopCatalog.find((w: any) => w.name === val);
                        setScene((prev) => ({
                          ...prev,
                          materials: {
                            ...prev.materials,
                            worktopMaterialName: val,
                            worktopProductId: matchedWt ? String(matchedWt.id) : undefined,
                          },
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="Столешница Дуб Галифакс натуральный 38 мм">
                        Дуб Галифакс натуральный 38 мм
                      </option>
                      <option value="Столешница Мрамор Каррара белый 38 мм">
                        Мрамор Каррара белый 38 мм
                      </option>
                      <option value="Столешница Бетон Чикаго темный 38 мм">
                        Бетон Чикаго темный 38 мм
                      </option>
                      {worktopCatalog.map((w: any) => (
                        <option key={w.id} value={w.name}>
                          [Каталог] {w.name} ({w.price} ₽)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Global Handle System & Push-to-Open / Overhang Settings */}
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-900">
                    Система открывания и ручки (по умолчанию)
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Тип ручек / открывания:
                    </label>
                    <select
                      value={scene.materials.defaultHandleType || 'bar'}
                      onChange={(e) => {
                        const nextHandle = e.target.value as HandleKind;
                        setScene((prev) => {
                          const isGola = nextHandle === 'gola';
                          const updatedModules = prev.kitchen.modules.map((m) => {
                            if (isGola) {
                              if (m.category === 'lower' && m.height === 720) {
                                return { ...m, height: 780 };
                              }
                              if (m.category === 'tall' && m.depth === 560) {
                                return { ...m, depth: 578 };
                              }
                              if (m.category === 'anthresole' && m.depth === 560) {
                                return { ...m, depth: 578 };
                              }
                            } else {
                              if (m.category === 'tall' && m.depth === 578) {
                                return { ...m, depth: 560 };
                              }
                              if (m.category === 'anthresole' && m.depth === 578) {
                                return { ...m, depth: 560 };
                              }
                            }
                            return m;
                          });
                          return {
                            ...prev,
                            kitchen: {
                              ...prev.kitchen,
                              isGolaProfile: isGola,
                              modules: updatedModules,
                            },
                            materials: {
                              ...prev.materials,
                              defaultHandleType: nextHandle,
                            },
                          };
                        });
                        if (nextHandle === 'gola') {
                          showToast(
                            'Включен профиль GOLA: высота низа 780 мм (отступ 63 мм), глубина пеналов и глубоких антресолей 578 мм'
                          );
                        }
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-semibold"
                    >
                      <option value="bar">Ручка-скоба (классическая / рейлинг)</option>
                      <option value="edge">Торцевая ручка-профиль (на торец фасада)</option>
                      <option value="knob">Ручка-кнопка (точечная)</option>
                      <option value="push_to_open">От нажатия (Push-to-Open / Tip-On, без ручки)</option>
                      <option value="overhang">Ручка — свес фасада вниз (для верхних шкафов)</option>
                      <option value="gola">Профиль GOLA (L/C паз, корпус низа 780 мм, отступ 63 мм)</option>
                      <option value="none">Без ручки</option>
                    </select>
                  </div>

                  {scene.materials.defaultHandleType === 'overhang' && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Увеличение фасада вниз для зацепа (мм):
                      </label>
                      <NumericInput
                        min={10}
                        max={60}
                        step={5}
                        value={scene.materials.defaultFacadeOverhangMm ?? 20}
                        onChange={(val) =>
                          setScene((prev) => ({
                            ...prev,
                            materials: {
                              ...prev.materials,
                              defaultFacadeOverhangMm: val,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-white"
                      />
                    </div>
                  )}

                  {scene.materials.defaultHandleType !== 'push_to_open' &&
                    scene.materials.defaultHandleType !== 'overhang' &&
                    scene.materials.defaultHandleType !== 'gola' &&
                    scene.materials.defaultHandleType !== 'none' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-0.5">
                              Ориентация
                            </label>
                            <select
                              value={scene.materials.defaultHandleOrientation || 'auto'}
                              onChange={(e) =>
                                setScene((prev) => ({
                                  ...prev,
                                  materials: {
                                    ...prev.materials,
                                    defaultHandleOrientation: e.target.value as HandleOrientation,
                                  },
                                }))
                              }
                              className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="auto">Авто (по типу)</option>
                              <option value="horizontal">Горизонтально</option>
                              <option value="vertical">Вертикально</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-0.5">
                              Положение
                            </label>
                            <select
                              value={scene.materials.defaultHandlePlacement || 'auto'}
                              onChange={(e) =>
                                setScene((prev) => ({
                                  ...prev,
                                  materials: {
                                    ...prev.materials,
                                    defaultHandlePlacement: e.target.value as HandlePlacement,
                                  },
                                }))
                              }
                              className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="auto">Авто (эргономика)</option>
                              <option value="center">По центру фасада</option>
                              <option value="top">Сверху фасада</option>
                              <option value="middle">Посередине края</option>
                              <option value="bottom">Снизу фасада</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Цвет ручек:
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {HANDLE_COLOR_PRESETS.map((hc) => (
                              <button
                                key={hc.id}
                                type="button"
                                onClick={() =>
                                  setScene((prev) => ({
                                    ...prev,
                                    materials: {
                                      ...prev.materials,
                                      defaultHandleColor: hc.hex,
                                    },
                                  }))
                                }
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                                  (scene.materials.defaultHandleColor || '#1e293b') === hc.hex
                                    ? 'border-amber-500 bg-white shadow-2xs ring-1 ring-amber-400'
                                    : 'border-slate-200 bg-white/80 hover:border-slate-300'
                                }`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                                  style={{ backgroundColor: hc.hex }}
                                />
                                <span>{hc.name.split(' ')[0]}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                </div>

                {/* Default Hardware from Company Catalog */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    Фурнитура по умолчанию (из вашей базы товаров)
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Петли по умолчанию
                    </label>
                    <select
                      value={scene.materials.defaultHingeProductId || ''}
                      onChange={(e) => {
                        const prod = hingeCatalog.find((p) => String(p.id) === e.target.value);
                        setScene((prev) => ({
                          ...prev,
                          materials: {
                            ...prev.materials,
                            defaultHingeProductId: prod ? String(prod.id) : undefined,
                            defaultHingeProductName: prod
                              ? prod.name
                              : prev.materials.defaultHingeProductName,
                          },
                        }));
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">{scene.materials.defaultHingeProductName}</option>
                      {hingeCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} ₽
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Системы выдвижения (ящики)
                    </label>
                    <select
                      value={scene.materials.defaultDrawerProductId || ''}
                      onChange={(e) => {
                        const prod = drawerCatalog.find((p) => String(p.id) === e.target.value);
                        setScene((prev) => ({
                          ...prev,
                          materials: {
                            ...prev.materials,
                            defaultDrawerProductId: prod ? String(prod.id) : undefined,
                            defaultDrawerProductName: prod
                              ? prod.name
                              : prev.materials.defaultDrawerProductName,
                          },
                        }));
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">{scene.materials.defaultDrawerProductName}</option>
                      {drawerCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} ₽
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Ручки мебельные (товар из базы)
                    </label>
                    <select
                      value={scene.materials.defaultHandleProductId || ''}
                      onChange={(e) => {
                        const prod = handleCatalog.find((p) => String(p.id) === e.target.value);
                        setScene((prev) => ({
                          ...prev,
                          materials: {
                            ...prev.materials,
                            defaultHandleProductId: prod ? String(prod.id) : undefined,
                            defaultHandleProductName: prod
                              ? prod.name
                              : prev.materials.defaultHandleProductName,
                          },
                        }));
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">{scene.materials.defaultHandleProductName}</option>
                      {handleCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} ₽
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ROOM OBSTACLES & ENGINEERING UTILITIES TAB */}
            {leftTab === 'obstacles' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-600 leading-relaxed">
                  Добавьте газовый котел, радиатор, окно, дверь или вентиляционную шахту для точного обхода коммуникаций в проекте:
                </div>
                <div className="space-y-1.5">
                  {ROOM_OBSTACLE_LIBRARY.map((obs) => (
                    <div
                      key={obs.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', obs.type);
                        setDraggedLibraryPayload({ kind: 'obstacle', tpl: obs });
                      }}
                      onDragEnd={() => setDraggedLibraryPayload(null)}
                      onClick={() => handleAddObstacle(obs)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-left transition-all cursor-grab active:cursor-grabbing"
                      title="Перетащите на 3D-стену или кликните для добавления"
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{obs.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {obs.width}×{obs.height}×{obs.depth} мм (от пола {obs.elevationY} мм)
                          </div>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-rose-600 shrink-0" />
                    </div>
                  ))}
                </div>

                {scene.kitchen.obstacles.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-xs font-bold text-slate-800">
                      Установленные элементы ({scene.kitchen.obstacles.length})
                    </div>
                    {scene.kitchen.obstacles.map((obs) => (
                      <div
                        key={obs.id}
                        onClick={() => {
                          setSelectedId(obs.id);
                          setSelectedKind('obstacle');
                          setIsInspectorOpen(true);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer text-xs ${
                          selectedId === obs.id
                            ? 'bg-rose-50 border-rose-400 font-semibold'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span>
                          {obs.name} (X:{obs.positionX}, Y:{obs.elevationY})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteObstacle(obs.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LIVE BOM / SPECIFICATION TAB */}
            {leftTab === 'bom' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <div className="font-bold text-emerald-900">
                    Спецификация (Готова к раскрою и .B3D)
                  </div>
                  <div className="text-emerald-700 text-[11px]">
                    Позиций деталей: {bom.panels.length} • Фурнитура: {bom.hardware.length} поз.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Фурнитура и комплектующие
                  </div>
                  {bom.hardware.map((h) => (
                    <div
                      key={h.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-medium text-slate-800 leading-snug">{h.name}</div>
                        {h.price ? (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Привязан товар из базы: {h.price} ₽/{h.unit}
                          </div>
                        ) : null}
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        {h.count} {h.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Список панелей раскроя
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                    {bom.panels.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {p.pos}. {p.name}
                          </div>
                          <div className="text-slate-500">{p.materialName}</div>
                        </div>
                        <div className="text-right shrink-0 font-mono font-semibold text-slate-900">
                          {p.height}×{p.width} ({p.count} шт)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER 3D VIEWPORT */}
        <div className="flex-1 min-w-0 relative flex flex-col bg-slate-100 min-h-[500px]">
          {/* Floating Viewport Toolbar */}
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Camera View Presets */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/80 pointer-events-auto">
              {(
                [
                  { id: '3d', label: '3D Вид' },
                  { id: 'front', label: 'Спереди' },
                  { id: 'left', label: 'Слева' },
                  { id: 'right', label: 'Справа' },
                  { id: 'top', label: 'Сверху' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    cameraPreset === cam.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            {/* Quick Rotate Wall Floating Toolbar when a module is selected */}
            {scene.mode === 'kitchen' && selectedKitchenModule && (
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-amber-300 pointer-events-auto">
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-amber-900">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden xl:inline">Стена:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRotateKitchenModuleWall(selectedKitchenModule.id, 'left')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    (selectedKitchenModule.wall || 'center') === 'left'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                  }`}
                  title="Повернуть модуль на левую угловую стену (горячая клавиша: Ctrl+[)"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Левая</span>
                  <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-black/10 rounded text-[9px] font-mono">
                    Ctrl+[
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateKitchenModuleWall(selectedKitchenModule.id, 'center')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    (selectedKitchenModule.wall || 'center') === 'center'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                  }`}
                  title="Центральная основная стена"
                >
                  Центр
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateKitchenModuleWall(selectedKitchenModule.id, 'right')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    (selectedKitchenModule.wall || 'center') === 'right'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                  }`}
                  title="Повернуть модуль на правую угловую стену (горячая клавиша: Ctrl+])"
                >
                  <span>Правая</span>
                  <ArrowRight className="w-3 h-3" />
                  <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 bg-black/10 rounded text-[9px] font-mono">
                    Ctrl+]
                  </kbd>
                </button>
              </div>
            )}

            {/* Interactive View Toggles (Open Doors / X-Ray / Photorealism / Multi-Align / Properties) */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/80 pointer-events-auto flex-wrap">
              {multiSelectedIds.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setShowAlignmentModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors"
                  title="Выровнять выбранные через Ctrl модули относительно первого выбранного модуля"
                >
                  <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                  <span>Выровнять ({multiSelectedIds.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDoorsOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  doorsOpen
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>{doorsOpen ? 'Закрыть фасады' : 'Открыть фасады'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setXrayMode((v) => {
                    if (!v) setPhotorealMode(false);
                    return !v;
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  xrayMode
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Каркас / Рентген</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotorealMode((v) => {
                    if (!v) setXrayMode(false);
                    return !v;
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  photorealMode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Студийный фотореалистичный 3D-рендер с мягким светом и отражениями без контуров"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Фотореализм</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  isInspectorOpen
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Открыть или скрыть инспектор свойств (или двойной клик на модуль)"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>{isInspectorOpen ? 'Скрыть свойства' : 'Свойства'}</span>
              </button>
            </div>
          </div>

          {/* Three.js Canvas */}
          <div className="flex-1 w-full h-full relative">
            <SceneViewport3D
              scene={scene}
              selectedId={selectedId}
              multiSelectedIds={multiSelectedIds}
              onSelect={(id, kind, screenPos, ctrlKey) => {
                if (id && kind === 'module' && ctrlKey) {
                  setRadialMenuPos(null);
                  setMultiSelectedIds((prev) => {
                    const base = prev.length > 0 ? prev : selectedId && selectedKind === 'module' ? [selectedId] : [];
                    if (base.includes(id)) {
                      return base.filter((item) => item !== id);
                    }
                    const next = [...base, id];
                    showToast(
                      `Выделено модулей: ${next.length}. Нажмите «Выровнять» в верхней панели`
                    );
                    return next;
                  });
                  if (!selectedId) {
                    setSelectedId(id);
                    setSelectedKind('module');
                  }
                  return;
                }

                setSelectedId(id);
                if (kind) setSelectedKind(kind);
                if (id && kind === 'module') {
                  setMultiSelectedIds([id]);
                } else {
                  setMultiSelectedIds([]);
                }
                if (id && kind === 'module' && screenPos) {
                  setRadialMenuPos({ ...screenPos, modId: id });
                } else if (id && kind === 'obstacle') {
                  setRadialMenuPos(null);
                  setIsInspectorOpen(true);
                } else if (!id) {
                  setRadialMenuPos(null);
                  setIsMoveHudActive(false);
                }
              }}
              onDoubleClickItem={(id, kind) => {
                setSelectedId(id);
                if (kind) setSelectedKind(kind);
                setRadialMenuPos(null);
                setIsInspectorOpen(true);
                showToast('Свойства открыты в инспекторе справа');
              }}
              onMoveItem={handleMoveItemIn3D}
              draggedLibraryItem={draggedPreviewItem}
              onDropLibraryItem={(posX, elevY, wall) => {
                if (!draggedLibraryPayload) return;
                if (draggedLibraryPayload.kind === 'module') {
                  handleAddKitchenModule(draggedLibraryPayload.tpl, posX, wall);
                } else {
                  handleAddObstacle(draggedLibraryPayload.tpl, posX, elevY, wall);
                }
                setDraggedLibraryPayload(null);
              }}
              doorsOpen={doorsOpen}
              xrayMode={xrayMode}
              photorealMode={photorealMode}
              cameraPreset={cameraPreset}
            />

            {/* Circular Radial Menu on module single click */}
            {radialMenuPos && selectedKitchenModule && selectedKitchenModule.id === radialMenuPos.modId && (
              <KitchenRadialMenu
                x={radialMenuPos.x}
                y={radialMenuPos.y}
                moduleName={selectedKitchenModule.name}
                moduleWall={selectedKitchenModule.wall || 'center'}
                onClose={() => setRadialMenuPos(null)}
                onDelete={() => {
                  handleDeleteKitchenModule(selectedKitchenModule.id);
                  setRadialMenuPos(null);
                }}
                onReplace={() => {
                  setRadialMenuPos(null);
                  setShowReplaceModal(true);
                }}
                onMoveInSpace={() => {
                  setRadialMenuPos(null);
                  setIsMoveHudActive(true);
                }}
                onOpenProperties={() => {
                  setRadialMenuPos(null);
                  setIsInspectorOpen(true);
                }}
                onRotateWall={() => {
                  handleRotateKitchenModuleWall(selectedKitchenModule.id, 'next');
                }}
                onMirror={() => {
                  handleMirrorKitchenModule(selectedKitchenModule.id);
                  setRadialMenuPos(null);
                }}
                onDuplicate={() => {
                  handleDuplicateKitchenModule(selectedKitchenModule);
                  setRadialMenuPos(null);
                }}
              />
            )}

            {/* Move in Space 3D HUD (Forward / Backward Z, Left / Right X, Elevation Y) */}
            {isMoveHudActive && selectedKitchenModule && (
              <KitchenMoveHud
                module={selectedKitchenModule}
                onUpdate={(patch) => handleUpdateKitchenModule(selectedKitchenModule.id, patch)}
                onClose={() => setIsMoveHudActive(false)}
              />
            )}

            {/* Replace Module Modal */}
            {showReplaceModal && selectedKitchenModule && (
              <KitchenReplaceModal
                module={selectedKitchenModule}
                facadeColor={
                  selectedKitchenModule.category === 'upper' || selectedKitchenModule.category === 'anthresole'
                    ? scene.materials.facadeUpperColor || scene.materials.facadeLowerColor
                    : scene.materials.facadeLowerColor
                }
                carcassColor={scene.materials.carcassColor}
                onReplaceWithTemplate={(tpl) => handleReplaceKitchenModule(selectedKitchenModule.id, tpl)}
                onClose={() => setShowReplaceModal(false)}
              />
            )}

            {/* Empty Kitchen State Helper Overlay */}
            {scene.mode === 'kitchen' &&
              scene.kitchen.modules.length === 0 &&
              scene.kitchen.obstacles.length === 0 &&
              !draggedLibraryPayload && (
                <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none px-4">
                  <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 pointer-events-auto max-w-xl">
                    <div className="text-xs text-slate-700 flex-1 min-w-[220px]">
                      <div className="font-bold text-slate-900">
                        Стена готова к расстановке модулей
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Перетаскивайте нужные модули из списка слева прямо на 3D-стену в любое место или меняйте их местами мышкой.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadDemoKitchen}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-400/50 text-xs font-semibold transition-colors shrink-0"
                    >
                      Загрузить пример
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Bottom Quick Module Strip with Drag-to-Reorder & Left/Right Swap (for Kitchen mode) */}
          {scene.mode === 'kitchen' && scene.kitchen.modules.length > 0 && (
            <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">
                Порядок модулей (перетащите или меняйте местами):
              </span>
              {[...scene.kitchen.modules]
                .sort((a, b) =>
                  a.category === b.category
                    ? a.positionX - b.positionX
                    : a.category.localeCompare(b.category)
                )
                .map((m, idx) => {
                  const isSel = selectedId === m.id;
                  return (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => setDraggedStripModuleId(m.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedStripModuleId && draggedStripModuleId !== m.id) {
                          handleSwapTwoKitchenModules(draggedStripModuleId, m.id);
                        }
                        setDraggedStripModuleId(null);
                      }}
                      onDragEnd={() => setDraggedStripModuleId(null)}
                      onClick={() => {
                        setSelectedId(m.id);
                        setSelectedKind('module');
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0 border transition-all cursor-grab active:cursor-grabbing ${
                        isSel
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                      title="Перетащите на другой модуль, чтобы поменять их местами"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwapKitchenModuleDirection(m.id, 'left');
                        }}
                        className={`p-0.5 rounded hover:bg-black/10 ${
                          isSel ? 'text-slate-950' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Поменять местами с модулем слева"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <span className="truncate max-w-[130px]">
                        {idx + 1}. {m.name} ({m.width}мм)
                      </span>
                      {/* Wall badge */}
                      <span
                        className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          (m.wall || 'center') === 'left'
                            ? 'bg-blue-100 text-blue-800'
                            : (m.wall || 'center') === 'right'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {(m.wall || 'center') === 'left'
                          ? 'Слева'
                          : (m.wall || 'center') === 'right'
                          ? 'Справа'
                          : 'Центр'}
                      </span>
                      {/* Rotate to another wall button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotateKitchenModuleWall(m.id, 'next');
                        }}
                        className={`p-1 rounded hover:bg-black/10 transition-colors ${
                          isSel ? 'text-slate-950' : 'text-amber-700 hover:text-amber-900'
                        }`}
                        title="Повернуть на другую стену (Ctrl+[ / Ctrl+])"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwapKitchenModuleDirection(m.id, 'right');
                        }}
                        className={`p-0.5 rounded hover:bg-black/10 ${
                          isSel ? 'text-slate-950' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Поменять местами с модулем справа"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Toast Notification */}
          {statusToast && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{statusToast}</span>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: CLICK-TO-REPLACE INSPECTOR (Dimensions, Filling, Catalog Hardware) */}
        {isInspectorOpen && (
          <div className="w-full lg:w-[360px] lg:shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Инспектор элемента
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedId && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200"
                  >
                    Сбросить
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Закрыть инспектор (двойной клик на модуль в 3D откроет его снова)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* CASE 1: Selected Kitchen Module Inspector */}
            {scene.mode === 'kitchen' && selectedKitchenModule && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={selectedKitchenModule.name}
                      onChange={(e) =>
                        handleUpdateKitchenModule(selectedKitchenModule.id, {
                          name: e.target.value,
                        })
                      }
                      className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-amber-300 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {!isWidgetMode && (
                      <button
                        type="button"
                        disabled={savingCustomModule}
                        onClick={() => handleSaveModuleToCompanyDB(selectedKitchenModule)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold transition-colors"
                        title="Сохранить этот модуль в базу стандартов вашей компании"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>В базу компании</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDuplicateKitchenModule(selectedKitchenModule)}
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                      title="Дублировать модуль"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKitchenModule(selectedKitchenModule.id)}
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-600"
                      title="Удалить модуль"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Swap Left / Right Buttons in Inspector */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleSwapKitchenModuleDirection(selectedKitchenModule.id, 'left')
                      }
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 text-[11px] font-semibold transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                      <span>Сдвинуть влево</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSwapKitchenModuleDirection(selectedKitchenModule.id, 'right')
                      }
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 text-[11px] font-semibold transition-colors"
                    >
                      <span>Сдвинуть вправо</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  </div>
                </div>

                {/* Exact Dimensions in mm */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Габариты и позиция (до миллиметра)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Ширина</label>
                      <NumericInput
                        min={150}
                        max={1200}
                        value={selectedKitchenModule.width}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            width: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Высота</label>
                      <NumericInput
                        min={250}
                        max={2600}
                        value={selectedKitchenModule.height}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            height: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Глубина</label>
                      <NumericInput
                        min={200}
                        max={700}
                        value={selectedKitchenModule.depth}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            depth: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Позиция X (мм)
                      </label>
                      <NumericInput
                        step={50}
                        min={0}
                        max={10000}
                        value={selectedKitchenModule.positionX}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            positionX: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                        title="Позиция вдоль стены слева направо"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Высота Y (мм)
                      </label>
                      <NumericInput
                        step={20}
                        min={0}
                        max={2800}
                        value={selectedKitchenModule.elevationY}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            elevationY: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                        title="Высота от пола"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Отступ Z (мм)
                      </label>
                      <NumericInput
                        step={50}
                        min={-500}
                        max={3000}
                        value={selectedKitchenModule.positionZ || 0}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            positionZ: val,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                        placeholder="0 (к стене)"
                        title="Смещение в глубину: вперед в комнату (+Z) или назад к стене"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsMoveHudActive(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold transition-colors"
                      title="Открыть 3D контроллер перемещения по осям X, Y и Z (вперед/назад)"
                    >
                      <Move className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Переместить в 3D (X, Y, Z)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReplaceModal(true)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors"
                      title="Заменить этот модуль на другой из библиотеки"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Заменить</span>
                    </button>
                  </div>

                  {/* Dedicated Prominent Wall Placement & Rotation Card */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-300 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Поворот на другую стену
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[10px] font-mono font-bold text-amber-900 shadow-2xs">
                          Ctrl+[
                        </kbd>
                        <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-[10px] font-mono font-bold text-amber-900 shadow-2xs">
                          Ctrl+]
                        </kbd>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleRotateKitchenModuleWall(selectedKitchenModule.id, 'left')
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all border ${
                          (selectedKitchenModule.wall || 'center') === 'left'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold'
                            : 'bg-white hover:bg-amber-100/80 text-slate-700 border-amber-200'
                        }`}
                        title="Повернуть модуль на левую стену (Ctrl+[)"
                      >
                        <ArrowLeft className="w-4 h-4 mb-0.5" />
                        <span className="text-xs font-semibold">Левая</span>
                        <span className="text-[10px] opacity-80 font-mono">Ctrl+[</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRotateKitchenModuleWall(selectedKitchenModule.id, 'center')
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all border ${
                          (selectedKitchenModule.wall || 'center') === 'center'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold'
                            : 'bg-white hover:bg-amber-100/80 text-slate-700 border-amber-200'
                        }`}
                        title="Поместить модуль на центральную стену"
                      >
                        <span className="text-xs font-semibold mt-4">Центр</span>
                        <span className="text-[10px] opacity-80">Основная</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRotateKitchenModuleWall(selectedKitchenModule.id, 'right')
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all border ${
                          (selectedKitchenModule.wall || 'center') === 'right'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-bold'
                            : 'bg-white hover:bg-amber-100/80 text-slate-700 border-amber-200'
                        }`}
                        title="Повернуть модуль на правую стену (Ctrl+])"
                      >
                        <ArrowRight className="w-4 h-4 mb-0.5" />
                        <span className="text-xs font-semibold">Правая</span>
                        <span className="text-[10px] opacity-80 font-mono">Ctrl+]</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-lg leading-tight flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold shrink-0">💡</span>
                      <span>
                        Нажимайте <strong>Ctrl+[</strong> (влево) или <strong>Ctrl+]</strong> (вправо) на клавиатуре. Угловая стена подключится автоматически, даже если кухня была прямой!
                      </span>
                    </div>

                    {/* Door Opening Side (Hinges) + Mirror Left/Right */}
                    <div className="pt-1.5 border-t border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] text-slate-600 font-medium">
                          Сторона открывания (петли / угол)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleMirrorKitchenModule(selectedKitchenModule.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-colors"
                          title="Отразить модуль лево ⇄ право"
                        >
                          <FlipHorizontal2 className="w-3 h-3" />
                          <span>Отразить</span>
                        </button>
                      </div>
                      <select
                        value={selectedKitchenModule.hingeSide || 'left'}
                        onChange={(e) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            hingeSide: e.target.value as 'left' | 'right',
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs font-semibold border border-amber-300 rounded-lg bg-white"
                      >
                        <option value="left">Петли / глухая часть слева (ручка справа)</option>
                        <option value="right">Петли / глухая часть справа (ручка слева)</option>
                      </select>
                    </div>

                    {/* Anthresole Standard Depth Selector (350 mm upper vs 560/578 mm lower/tall) */}
                    {selectedKitchenModule.category === 'anthresole' && (
                      <div className="pt-1.5 border-t border-amber-200/80 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-medium">
                          Стандарт глубины антресоли:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, { depth: 350 })
                            }
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                              selectedKitchenModule.depth === 350
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            По верху (350 мм)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const deepVal =
                                scene.kitchen.isGolaProfile ||
                                scene.materials.defaultHandleType === 'gola'
                                  ? 578
                                  : 560;
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                depth: deepVal,
                              });
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${
                              selectedKitchenModule.depth >= 550
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            По низу (
                            {scene.kitchen.isGolaProfile ||
                            scene.materials.defaultHandleType === 'gola'
                              ? '578 GOLA'
                              : '560'}{' '}
                            мм)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PRO100 Corner Transition Settings (for upper_corner and corner_lower) */}
                    {(selectedKitchenModule.isCorner ||
                      selectedKitchenModule.fillingType === 'corner_lower' ||
                      selectedKitchenModule.fillingType === 'upper_corner') && (
                      <div className="pt-2 border-t border-amber-200/80 space-y-2">
                        <div className="text-[11px] font-bold text-amber-950">
                          Угловой переход (глухая часть + планка PRO100)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">
                              Глухая стенка (мм)
                            </label>
                            <NumericInput
                              min={200}
                              max={700}
                              step={10}
                              value={
                                selectedKitchenModule.cornerBlindWidth ??
                                (selectedKitchenModule.category === 'upper' || (selectedKitchenModule.category === 'anthresole' && selectedKitchenModule.depth < 500)
                                  ? 350
                                  : scene.kitchen.isGolaProfile ? 578 : 560)
                              }
                              onChange={(val) =>
                                handleUpdateKitchenModule(selectedKitchenModule.id, {
                                  cornerBlindWidth: val,
                                })
                              }
                              className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-600 mb-0.5">
                              Переходная планка (мм)
                            </label>
                            <NumericInput
                              min={16}
                              max={200}
                              step={2}
                              value={selectedKitchenModule.cornerFillerWidth ?? 50}
                              onChange={(val) =>
                                handleUpdateKitchenModule(selectedKitchenModule.id, {
                                  cornerFillerWidth: val,
                                })
                              }
                              className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-900 bg-amber-100/70 p-1.5 rounded-lg leading-tight">
                          Итого глухая часть:{' '}
                          <strong>
                            {(selectedKitchenModule.cornerBlindWidth ??
                              (selectedKitchenModule.category === 'upper' || (selectedKitchenModule.category === 'anthresole' && selectedKitchenModule.depth < 500)
                                ? 350
                                : scene.kitchen.isGolaProfile ? 578 : 560)) +
                              (selectedKitchenModule.cornerFillerWidth ?? 50)}{' '}
                            мм
                          </strong>{' '}
                          (ширина глухой части равна глубине кухонной линии по смежной стене).
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-Module Handle Position, Orientation, Type & Color */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    Ручки и открывание этого модуля
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Тип ручки / открывания:
                      </label>
                      <select
                        value={selectedKitchenModule.handleType || ''}
                        onChange={(e) => {
                          const val = (e.target.value || undefined) as HandleKind | undefined;
                          if (val === 'gola' && selectedKitchenModule.category === 'lower') {
                            handleUpdateKitchenModule(selectedKitchenModule.id, {
                              handleType: 'gola',
                              height: 780,
                            });
                            showToast('Для профиля GOLA высота корпуса установлена на 780 мм, отступ от стены 63 мм');
                          } else {
                            handleUpdateKitchenModule(selectedKitchenModule.id, {
                              handleType: val,
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-semibold"
                      >
                        <option value="">
                          По умолчанию проекта (
                          {scene.materials.defaultHandleType === 'edge'
                            ? 'Торцевая'
                            : scene.materials.defaultHandleType === 'push_to_open'
                            ? 'От нажатия Push-to-Open'
                            : scene.materials.defaultHandleType === 'overhang'
                            ? 'Свес фасада вниз'
                            : scene.materials.defaultHandleType === 'gola'
                            ? 'Профиль GOLA'
                            : scene.materials.defaultHandleType === 'none'
                            ? 'Без ручки'
                            : scene.materials.defaultHandleType === 'knob'
                            ? 'Кнопка'
                            : 'Скоба'}
                          )
                        </option>
                        <option value="bar">Ручка-скоба (классическая)</option>
                        <option value="edge">Торцевая ручка-профиль (за фасад)</option>
                        <option value="knob">Ручка-кнопка</option>
                        <option value="push_to_open">От нажатия (Push-to-Open, без ручки)</option>
                        <option value="overhang">Ручка — свес фасада вниз</option>
                        <option value="gola">Профиль GOLA (паз L/C, высота низа 780 мм, отступ 63 мм)</option>
                        <option value="none">Без ручки</option>
                      </select>
                    </div>

                    {(selectedKitchenModule.handleType || scene.materials.defaultHandleType) === 'gola' && (
                      <div className="col-span-2 text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-lg leading-tight">
                        <strong>Профиль GOLA:</strong> врезной алюминиевый профиль (L-паз под столешницей, C-паз между ящиками). Корпус низа 780 мм, отступ 63 мм, свес 22 мм.
                      </div>
                    )}

                    {(selectedKitchenModule.handleType ||
                      scene.materials.defaultHandleType ||
                      'bar') === 'overhang' && (
                      <div className="col-span-2">
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Свес фасада вниз для зацепа (мм):
                        </label>
                        <NumericInput
                          min={10}
                          max={60}
                          step={5}
                          value={
                            selectedKitchenModule.facadeOverhangMm ??
                            scene.materials.defaultFacadeOverhangMm ??
                            20
                          }
                          onChange={(val) =>
                            handleUpdateKitchenModule(selectedKitchenModule.id, {
                              facadeOverhangMm: val,
                            })
                          }
                          className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 bg-white"
                        />
                      </div>
                    )}

                    {!['push_to_open', 'overhang', 'none', 'gola'].includes(
                      selectedKitchenModule.handleType ||
                        scene.materials.defaultHandleType ||
                        'bar'
                    ) && (
                      <>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-0.5">
                            Ориентация ручки
                          </label>
                          <select
                            value={selectedKitchenModule.handleOrientation || 'auto'}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                handleOrientation: e.target.value as HandleOrientation,
                              })
                            }
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="auto">Авто</option>
                            <option value="horizontal">Горизонтально</option>
                            <option value="vertical">Вертикально</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-0.5">
                            Расположение
                          </label>
                          <select
                            value={selectedKitchenModule.handlePlacement || 'auto'}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                handlePlacement: e.target.value as HandlePlacement,
                              })
                            }
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="auto">Авто (по модулю)</option>
                            <option value="center">По центру фасада</option>
                            <option value="top">Сверху</option>
                            <option value="middle">Посередине</option>
                            <option value="bottom">Снизу</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-0.5">
                            Смещение X (мм)
                          </label>
                          <NumericInput
                            step={10}
                            min={-300}
                            max={300}
                            value={selectedKitchenModule.handleOffsetX ?? 0}
                            onChange={(val) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                handleOffsetX: val,
                              })
                            }
                            className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-0.5">
                            Смещение Y (мм)
                          </label>
                          <NumericInput
                            step={10}
                            min={-600}
                            max={600}
                            value={selectedKitchenModule.handleOffsetY ?? 0}
                            onChange={(val) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                handleOffsetY: val,
                              })
                            }
                            className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Цвет ручки модуля:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {HANDLE_COLOR_PRESETS.map((hc) => (
                              <button
                                key={hc.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateKitchenModule(selectedKitchenModule.id, {
                                    handleColor: hc.hex,
                                  })
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                                  (selectedKitchenModule.handleColor ||
                                    scene.materials.defaultHandleColor ||
                                    '#1e293b') === hc.hex
                                    ? 'border-amber-500 bg-white ring-1 ring-amber-400'
                                    : 'border-slate-200 bg-white/80'
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                  style={{ backgroundColor: hc.hex }}
                                />
                                <span>{hc.name.split(' ')[0]}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Filling: Shelves & Drawers */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    Внутреннее наполнение модуля
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Полок внутри (шт)
                      </label>
                      <NumericInput
                        min={0}
                        max={8}
                        value={selectedKitchenModule.shelvesCount}
                        onChange={(val) =>
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            shelvesCount: val,
                          })
                        }
                        className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Выдвижных ящиков
                      </label>
                      <NumericInput
                        min={0}
                        max={5}
                        value={selectedKitchenModule.drawersCount}
                        onChange={(cnt) => {
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            drawersCount: cnt,
                            fillingType:
                              cnt === 2
                                ? selectedKitchenModule.hasInnerDrawer
                                  ? 'drawers_2_inner'
                                  : 'drawers_2'
                                : cnt === 3
                                ? 'drawers_3'
                                : cnt >= 4
                                ? 'drawers_4'
                                : 'doors_2',
                          });
                        }}
                        className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Drawer System Type, Depth & Hidden Inner Drawer Configuration */}
                  {selectedKitchenModule.drawersCount > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                      <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                        <span>Настройка ящиков (по умолч. BOYARD 500 мм)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
                          Макс. глубина: {getMaxAllowedDrawerDepth(selectedKitchenModule.depth)} мм
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-600 mb-0.5">
                          Тип системы выдвижения ящиков:
                        </label>
                        <select
                          value={selectedKitchenModule.drawerSystemType || 'concealed'}
                          onChange={(e) =>
                            handleUpdateKitchenModule(selectedKitchenModule.id, {
                              drawerSystemType: e.target.value as DrawerSystemType,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-white"
                        >
                          {(Object.keys(DRAWER_SYSTEM_LABELS) as DrawerSystemType[]).map((sysKey) => (
                            <option key={sysKey} value={sysKey}>
                              {DRAWER_SYSTEM_LABELS[sysKey]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">
                            Глубина осн. ящиков (мм):
                          </label>
                          <select
                            value={resolveEffectiveDrawerDepth(
                              selectedKitchenModule.depth,
                              selectedKitchenModule.drawerDepth,
                              500
                            )}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                drawerDepth: Number(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-white"
                          >
                            {DRAWER_DEPTH_OPTIONS.map((dOpt) => {
                              const maxAllowed = getMaxAllowedDrawerDepth(
                                selectedKitchenModule.depth
                              );
                              const disabled = dOpt > maxAllowed;
                              return (
                                <option key={dOpt} value={dOpt} disabled={disabled}>
                                  {dOpt} мм {disabled ? `(не войдет в корпус ${selectedKitchenModule.depth} мм)` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-amber-200">
                            <input
                              type="checkbox"
                              checked={
                                Boolean(selectedKitchenModule.hasInnerDrawer) ||
                                selectedKitchenModule.fillingType === 'drawers_2_inner'
                              }
                              onChange={(e) => {
                                const checked = e.target.checked;
                                handleUpdateKitchenModule(selectedKitchenModule.id, {
                                  hasInnerDrawer: checked,
                                  innerDrawerDepth:
                                    selectedKitchenModule.innerDrawerDepth ||
                                    resolveEffectiveDrawerDepth(
                                      selectedKitchenModule.depth,
                                      450,
                                      450
                                    ),
                                  fillingType:
                                    checked && selectedKitchenModule.drawersCount === 2
                                      ? 'drawers_2_inner'
                                      : selectedKitchenModule.drawersCount === 2
                                      ? 'drawers_2'
                                      : selectedKitchenModule.fillingType,
                                });
                              }}
                            />
                            <span>+ Внутр. ящик за верхним фасадом</span>
                          </label>
                        </div>
                      </div>

                      {(selectedKitchenModule.hasInnerDrawer ||
                        selectedKitchenModule.fillingType === 'drawers_2_inner') && (
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-0.5">
                            Глубина внутреннего скрытого ящика (стандарт 450 мм):
                          </label>
                          <select
                            value={resolveEffectiveDrawerDepth(
                              selectedKitchenModule.depth,
                              selectedKitchenModule.innerDrawerDepth,
                              450
                            )}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                innerDrawerDepth: Number(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 bg-white"
                          >
                            {DRAWER_DEPTH_OPTIONS.map((dOpt) => {
                              const maxAllowed = getMaxAllowedDrawerDepth(
                                selectedKitchenModule.depth
                              );
                              const disabled = dOpt > maxAllowed;
                              return (
                                <option key={dOpt} value={dOpt} disabled={disabled}>
                                  {dOpt} мм {dOpt === 450 ? '(стандарт внутр.)' : ''}{' '}
                                  {disabled ? `(не войдет в ${selectedKitchenModule.depth} мм)` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outer Module Side Cladding with Facade & Vertical GOLA for Tall Columns */}
                  {selectedKitchenModule.fillingType !== 'dishwasher' && (
                    <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800">
                        Облицевать боковину фасадом (на крайних модулях)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.cladLeftSide)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const isGolaActive =
                                scene.kitchen.isGolaProfile ||
                                scene.materials.defaultHandleType === 'gola' ||
                                selectedKitchenModule.handleType === 'gola';
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                cladLeftSide: checked,
                                cladSideHeight:
                                  selectedKitchenModule.cladSideHeight ||
                                  selectedKitchenModule.height,
                                ...(checked &&
                                selectedKitchenModule.category === 'tall' &&
                                isGolaActive &&
                                (!selectedKitchenModule.verticalGolaType ||
                                  selectedKitchenModule.verticalGolaType === 'none')
                                  ? { verticalGolaType: 'terminal_l' }
                                  : {}),
                              });
                              if (
                                checked &&
                                selectedKitchenModule.category === 'tall' &&
                                isGolaActive
                              ) {
                                showToast(
                                  'Для пенала с фальшфасадом предложен вертикальный оконечный профиль GOLA (L)'
                                );
                              }
                            }}
                          />
                          <span>Левая боковина</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.cladRightSide)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const isGolaActive =
                                scene.kitchen.isGolaProfile ||
                                scene.materials.defaultHandleType === 'gola' ||
                                selectedKitchenModule.handleType === 'gola';
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                cladRightSide: checked,
                                cladSideHeight:
                                  selectedKitchenModule.cladSideHeight ||
                                  selectedKitchenModule.height,
                                ...(checked &&
                                selectedKitchenModule.category === 'tall' &&
                                isGolaActive &&
                                (!selectedKitchenModule.verticalGolaType ||
                                  selectedKitchenModule.verticalGolaType === 'none')
                                  ? { verticalGolaType: 'terminal_l' }
                                  : {}),
                              });
                              if (
                                checked &&
                                selectedKitchenModule.category === 'tall' &&
                                isGolaActive
                              ) {
                                showToast(
                                  'Для пенала с фальшфасадом предложен вертикальный оконечный профиль GOLA (L)'
                                );
                              }
                            }}
                          />
                          <span>Правая боковина</span>
                        </label>
                      </div>

                      {(selectedKitchenModule.cladLeftSide ||
                        selectedKitchenModule.cladRightSide) && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-600 font-medium">
                              Высота бокового фасада (мм):
                            </label>
                            {(selectedKitchenModule.category === 'lower' ||
                              selectedKitchenModule.category === 'tall') && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateKitchenModule(selectedKitchenModule.id, {
                                    cladSideHeight:
                                      selectedKitchenModule.height + scene.kitchen.plinthHeight,
                                  })
                                }
                                className="text-[10px] font-bold text-amber-700 hover:underline"
                              >
                                Закрыть цоколь до пола (
                                {selectedKitchenModule.height + scene.kitchen.plinthHeight} мм)
                              </button>
                            )}
                          </div>
                          <NumericInput
                            min={300}
                            max={2800}
                            step={10}
                            value={
                              selectedKitchenModule.cladSideHeight || selectedKitchenModule.height
                            }
                            onChange={(val) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                cladSideHeight: val,
                              })
                            }
                            className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                          />
                          <div className="text-[10px] text-slate-500">
                            При облицовке боковины столешница автоматически увеличивается на толщину фасада (+16 мм).
                          </div>
                        </div>
                      )}

                      {/* Vertical GOLA Profile for Tall Columns when Kitchen has GOLA */}
                      {selectedKitchenModule.category === 'tall' &&
                        (scene.kitchen.isGolaProfile ||
                          scene.materials.defaultHandleType === 'gola' ||
                          selectedKitchenModule.handleType === 'gola') && (
                          <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-300 space-y-2 mt-1">
                            <div className="text-[11px] font-bold text-amber-950">
                              Вертикальный профиль GOLA пенала (глубина 578 мм)
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-700 mb-0.5">
                                Тип вертикального профиля GOLA:
                              </label>
                              <select
                                value={selectedKitchenModule.verticalGolaType || 'none'}
                                onChange={(e) =>
                                  handleUpdateKitchenModule(selectedKitchenModule.id, {
                                    verticalGolaType: e.target.value as
                                      | 'none'
                                      | 'terminal_l'
                                      | 'middle_c',
                                  })
                                }
                                className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-amber-300 bg-white"
                              >
                                <option value="none">Без вертикального профиля</option>
                                <option value="terminal_l">
                                  Вертикальный GOLA оконечный (L) — у фальшфасада боковины
                                </option>
                                <option value="middle_c">
                                  Вертикальный GOLA срединный (C) — между двумя пеналами
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-700 mb-1">
                                Цвет профиля GOLA:
                              </label>
                              <div className="flex flex-wrap gap-1">
                                {HANDLE_COLOR_PRESETS.map((hc) => (
                                  <button
                                    key={hc.id}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateKitchenModule(selectedKitchenModule.id, {
                                        golaProfileColor: hc.hex,
                                      })
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                                      (selectedKitchenModule.golaProfileColor ||
                                        scene.materials.defaultHandleColor ||
                                        '#1e293b') === hc.hex
                                        ? 'border-amber-600 bg-white ring-1 ring-amber-500'
                                        : 'border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                      style={{ backgroundColor: hc.hex }}
                                    />
                                    <span>{hc.name.split(' ')[0]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Built-in Appliances Checkboxes */}
                  <div className="pt-1 border-t border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600">
                      Встроенная техника и оснащение:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {/* Sink & Faucet: lower modules only */}
                      {selectedKitchenModule.category === 'lower' && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasSink)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasSink: e.target.checked,
                                hasFaucet: e.target.checked,
                              })
                            }
                          />
                          <span>Мойка и смеситель</span>
                        </label>
                      )}

                      {/* Cooktop: lower modules only */}
                      {selectedKitchenModule.category === 'lower' && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasCooktop)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasCooktop: e.target.checked,
                              })
                            }
                          />
                          <span>Варочная панель</span>
                        </label>
                      )}

                      {/* Oven: lower modules or tall columns */}
                      {(selectedKitchenModule.category === 'lower' ||
                        (selectedKitchenModule.category === 'tall' &&
                          selectedKitchenModule.fillingType !== 'tall_fridge')) && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasOven)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasOven: e.target.checked,
                              })
                            }
                          />
                          <span>Духовой шкаф</span>
                        </label>
                      )}

                      {/* Microwave: lower, upper, or tall columns (except fridge) */}
                      {selectedKitchenModule.fillingType !== 'tall_fridge' && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasMicrowave)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasMicrowave: e.target.checked,
                              })
                            }
                          />
                          <span>Микроволновка</span>
                        </label>
                      )}

                      {/* DishDryer: upper modules only */}
                      {selectedKitchenModule.category === 'upper' && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasDishDryer)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasDishDryer: e.target.checked,
                              })
                            }
                          />
                          <span>Посудосушитель</span>
                        </label>
                      )}

                      {/* Range Hood: upper or anthresole modules only */}
                      {(selectedKitchenModule.category === 'upper' ||
                        selectedKitchenModule.category === 'anthresole') && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedKitchenModule.hasHood)}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasHood: e.target.checked,
                              })
                            }
                          />
                          <span>Вытяжка</span>
                        </label>
                      )}

                      {/* Fridge: tall fridge column only */}
                      {selectedKitchenModule.fillingType === 'tall_fridge' && (
                        <label className="flex items-center gap-1.5 cursor-pointer text-amber-800 font-bold">
                          <input type="checkbox" checked={true} disabled />
                          <span>Встроенный холодильник</span>
                        </label>
                      )}
                    </div>

                    {/* Special accessories for Sink & Oven modules */}
                    <div className="pt-1.5 border-t border-slate-200/80 space-y-1 text-xs">
                      {(selectedKitchenModule.fillingType === 'sink' ||
                        selectedKitchenModule.hasSink) && (
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={selectedKitchenModule.hasDripTray !== false}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasDripTray: e.target.checked,
                              })
                            }
                          />
                          <span>Защитный алюминиевый поддон в мойку</span>
                        </label>
                      )}

                      {(selectedKitchenModule.hasOven ||
                        selectedKitchenModule.fillingType === 'oven_cooktop' ||
                        selectedKitchenModule.fillingType.startsWith('tall_oven')) && (
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={selectedKitchenModule.hasThermalStrips !== false}
                            onChange={(e) =>
                              handleUpdateKitchenModule(selectedKitchenModule.id, {
                                hasThermalStrips: e.target.checked,
                              })
                            }
                          />
                          <span>Защитные термопланки для духовки</span>
                        </label>
                      )}
                    </div>

                    {/* Lift Mechanism selection for horizontal/lift upper modules, anthresoles, and microwave upper modules */}
                    {(selectedKitchenModule.fillingType === 'upper_lift_2' ||
                      selectedKitchenModule.category === 'anthresole' ||
                      (selectedKitchenModule.category === 'upper' &&
                        selectedKitchenModule.hasMicrowave)) && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Подъемный механизм фасада:
                        </label>
                        <select
                          value={selectedKitchenModule.liftMechanismType || 'gas_lift'}
                          onChange={(e) =>
                            handleUpdateKitchenModule(selectedKitchenModule.id, {
                              liftMechanismType: e.target.value as any,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="gas_lift">Газлифты (комплект 2 шт)</option>
                          <option value="aventos_hf">Blum AVENTOS HF Top (складной)</option>
                          <option value="aventos_hk">Blum AVENTOS HK (поворотный)</option>
                          <option value="aventos_hks">Blum AVENTOS HK-S / HK-XS</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Click-to-Replace Catalog Hardware for this Module */}
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5">
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Фурнитура модуля (из базы товаров)</span>
                  </div>

                  {selectedKitchenModule.drawersCount > 0 ? (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Направляющие / Система выдвижения:
                      </label>
                      <select
                        value={selectedKitchenModule.drawerSlideProductId || ''}
                        onChange={(e) => {
                          const prod = drawerCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            drawerSlideProductId: prod ? String(prod.id) : undefined,
                            drawerSlideProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white font-medium"
                      >
                        <option value="">
                          По умолчанию ({scene.materials.defaultDrawerProductName})
                        </option>
                        {drawerCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Петли мебельные для фасадов:
                      </label>
                      <select
                        value={selectedKitchenModule.hingeProductId || ''}
                        onChange={(e) => {
                          const prod = hingeCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            hingeProductId: prod ? String(prod.id) : undefined,
                            hingeProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white font-medium"
                      >
                        <option value="">
                          По умолчанию ({scene.materials.defaultHingeProductName})
                        </option>
                        {hingeCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Ручка для этого модуля:
                    </label>
                    <select
                      value={selectedKitchenModule.handleProductId || ''}
                      onChange={(e) => {
                        const prod = handleCatalog.find((p) => String(p.id) === e.target.value);
                        handleUpdateKitchenModule(selectedKitchenModule.id, {
                          handleProductId: prod ? String(prod.id) : undefined,
                          handleProductName: prod ? prod.name : undefined,
                        });
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white font-medium"
                    >
                      <option value="">
                        По умолчанию ({scene.materials.defaultHandleProductName})
                      </option>
                      {handleCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} ₽
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedKitchenModule.hasDishDryer && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Посудосушитель из базы:
                      </label>
                      <select
                        value={selectedKitchenModule.dryerProductId || ''}
                        onChange={(e) => {
                          const prod = dryerCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            dryerProductId: prod ? String(prod.id) : undefined,
                            dryerProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white font-medium"
                      >
                        <option value="">Стандартный посудосушитель</option>
                        {dryerCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedKitchenModule.hasSink && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Мойка / Комплект из базы:
                      </label>
                      <select
                        value={selectedKitchenModule.sinkProductId || ''}
                        onChange={(e) => {
                          const prod = sinkCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateKitchenModule(selectedKitchenModule.id, {
                            sinkProductId: prod ? String(prod.id) : undefined,
                            sinkProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white font-medium"
                      >
                        <option value="">Стандартная мойка</option>
                        {sinkCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CASE 2: Selected Wardrobe Section Inspector */}
            {scene.mode === 'wardrobe' && selectedWardrobeSection && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {selectedWardrobeSection.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Внутренняя ширина: {selectedWardrobeSection.width} мм
                    </div>
                  </div>
                  {scene.wardrobe.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWardrobeSection(selectedWardrobeSection.id)}
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200"
                      title="Удалить секцию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Section Width */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ширина проема секции (мм)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={250}
                      max={1400}
                      step={10}
                      value={selectedWardrobeSection.width}
                      onChange={(e) =>
                        handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                          width: Number(e.target.value),
                        })
                      }
                      className="flex-1 accent-amber-500"
                    />
                    <NumericInput
                      min={200}
                      max={1800}
                      value={selectedWardrobeSection.width}
                      onChange={(val) =>
                        handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                          width: val,
                        })
                      }
                      className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setScene((prev) => ({
                        ...prev,
                        wardrobe: {
                          ...prev.wardrobe,
                          sections: redistributeWardrobeSections(
                            prev.wardrobe.width,
                            prev.wardrobe.thickness,
                            prev.wardrobe.hasLeftSide,
                            prev.wardrobe.hasRightSide,
                            prev.wardrobe.sections
                          ),
                        },
                      }))
                    }
                    className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 hover:underline font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Выровнять ширину всех секций поровну</span>
                  </button>
                </div>

                {/* Shelves & Drawers in Section */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Полки и выдвижные ящики в секции
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Кол-во полок (0..10)
                      </label>
                      <NumericInput
                        min={0}
                        max={10}
                        value={selectedWardrobeSection.shelvesCount}
                        onChange={(val) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            shelvesCount: val,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Ящиков внизу (0..5)
                      </label>
                      <NumericInput
                        min={0}
                        max={5}
                        value={selectedWardrobeSection.drawersCount}
                        onChange={(val) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            drawersCount: val,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {selectedWardrobeSection.drawersCount > 0 && (
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Высота фасада одного ящика (мм)
                      </label>
                      <NumericInput
                        min={120}
                        max={350}
                        step={10}
                        value={selectedWardrobeSection.drawerHeight}
                        onChange={(val) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            drawerHeight: val,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  )}

                  {/* Rods & Accessories */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-700 text-[11px]">
                      Штанги и аксессуары:
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWardrobeSection.hasRodTop}
                        onChange={(e) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            hasRodTop: e.target.checked,
                          })
                        }
                      />
                      <span>Штанга для одежды верхняя</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWardrobeSection.hasRodMid}
                        onChange={(e) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            hasRodMid: e.target.checked,
                          })
                        }
                      />
                      <span>Штанга вторая (средний ярус)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWardrobeSection.hasPantograph}
                        onChange={(e) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            hasPantograph: e.target.checked,
                          })
                        }
                      />
                      <span>Пантограф (лифт для одежды)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWardrobeSection.hasShoeRack}
                        onChange={(e) =>
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            hasShoeRack: e.target.checked,
                          })
                        }
                      />
                      <span>Выдвижная полка-обувница</span>
                    </label>
                  </div>
                </div>

                {/* Section Hardware Binding */}
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <div className="text-xs font-bold text-indigo-950">
                    Фурнитура секции (из каталога)
                  </div>
                  {selectedWardrobeSection.drawersCount > 0 && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Направляющие ящиков:
                      </label>
                      <select
                        value={selectedWardrobeSection.drawerSlideProductId || ''}
                        onChange={(e) => {
                          const prod = drawerCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            drawerSlideProductId: prod ? String(prod.id) : undefined,
                            drawerSlideProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white"
                      >
                        <option value="">
                          По умолчанию ({scene.materials.defaultDrawerProductName})
                        </option>
                        {drawerCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {scene.wardrobe.doorType === 'swing' && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">
                        Петли фасада секции:
                      </label>
                      <select
                        value={selectedWardrobeSection.hingeProductId || ''}
                        onChange={(e) => {
                          const prod = hingeCatalog.find((p) => String(p.id) === e.target.value);
                          handleUpdateWardrobeSection(selectedWardrobeSection.id, {
                            hingeProductId: prod ? String(prod.id) : undefined,
                            hingeProductName: prod ? prod.name : undefined,
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white"
                      >
                        <option value="">
                          По умолчанию ({scene.materials.defaultHingeProductName})
                        </option>
                        {hingeCatalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.price} ₽
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CASE 3: Selected Room Obstacle Inspector */}
            {selectedObstacle && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={selectedObstacle.name}
                    onChange={(e) =>
                      handleUpdateObstacle(selectedObstacle.id, { name: e.target.value })
                    }
                    className="text-xs font-bold text-rose-950 bg-white px-2 py-1 rounded border border-rose-300 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteObstacle(selectedObstacle.id)}
                    className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 shrink-0"
                    title="Удалить элемент помещения"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Wall placement selector for Obstacle */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Привязка к стене и быстрое выравнивание
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'left', label: 'Левая стена' },
                        { id: 'center', label: 'Центр. стена' },
                        { id: 'right', label: 'Правая стена' },
                      ] as const
                    ).map((wb) => (
                      <button
                        key={wb.id}
                        type="button"
                        onClick={() => {
                          handleUpdateObstacle(selectedObstacle.id, { wall: wb.id });
                          if (wb.id === 'left' && scene.kitchen.layoutType === 'straight') {
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, layoutType: 'l_left' },
                            }));
                          } else if (wb.id === 'right' && scene.kitchen.layoutType === 'straight') {
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, layoutType: 'l_right' },
                            }));
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          (selectedObstacle.wall || 'center') === wb.id
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        {wb.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Corner / Center Snap Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateObstacle(selectedObstacle.id, { positionX: 0, positionZ: 0 })
                      }
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 text-slate-800 border border-slate-300 text-[11px] font-semibold transition-colors"
                      title="Прижать вплотную к левому углу выбранной стены (X = 0)"
                    >
                      В левый угол (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const wallLen =
                          selectedObstacle.wall === 'left'
                            ? scene.kitchen.wallLeftLength || 1800
                            : selectedObstacle.wall === 'right'
                            ? scene.kitchen.wallRightLength || 1800
                            : scene.kitchen.wallCenterLength || 3000;
                        handleUpdateObstacle(selectedObstacle.id, {
                          positionX: Math.max(0, Math.round((wallLen - selectedObstacle.width) / 2)),
                        });
                      }}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 text-slate-800 border border-slate-300 text-[11px] font-semibold transition-colors"
                    >
                      По центру стены
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const wallLen =
                          selectedObstacle.wall === 'left'
                            ? scene.kitchen.wallLeftLength || 1800
                            : selectedObstacle.wall === 'right'
                            ? scene.kitchen.wallRightLength || 1800
                            : scene.kitchen.wallCenterLength || 3000;
                        handleUpdateObstacle(selectedObstacle.id, {
                          positionX: Math.max(0, wallLen - selectedObstacle.width),
                          positionZ: 0,
                        });
                      }}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 text-slate-800 border border-slate-300 text-[11px] font-semibold transition-colors"
                      title="Прижать вплотную к правому углу выбранной стены"
                    >
                      В правый угол
                    </button>
                  </div>
                </div>

                {/* Dimensions & X / Y / Z Coordinates */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-800">
                    Габариты и координаты (X, Y, Z)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Ширина (мм)</label>
                      <NumericInput
                        min={50}
                        max={6000}
                        value={selectedObstacle.width}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { width: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Высота (мм)</label>
                      <NumericInput
                        min={50}
                        max={3500}
                        value={selectedObstacle.height}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { height: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Глубина (мм)</label>
                      <NumericInput
                        min={20}
                        max={4000}
                        value={selectedObstacle.depth}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { depth: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Смещение X (мм)
                      </label>
                      <NumericInput
                        step={50}
                        min={0}
                        max={10000}
                        value={selectedObstacle.positionX}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { positionX: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                        title="Отступ вдоль стены от левого угла"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        От пола Y (мм)
                      </label>
                      <NumericInput
                        step={50}
                        min={0}
                        max={3000}
                        value={selectedObstacle.elevationY}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { elevationY: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                        title="Высота над уровнем пола (можно также перетаскивать мышкой вверх/вниз в 3D)"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">
                        Вынос в зал Z
                      </label>
                      <NumericInput
                        step={50}
                        min={-500}
                        max={4000}
                        value={selectedObstacle.positionZ || 0}
                        onChange={(val) =>
                          handleUpdateObstacle(selectedObstacle.id, { positionZ: val })
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                        title="Вынос от стены вглубь помещения (для перегородок и колонн посреди комнаты)"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg leading-snug">
                    Перетаскивайте элемент мышкой в 3D-окне по горизонтали (X) и вертикали (Y). Для установки перегородки посреди комнаты увеличьте параметр «Вынос в зал Z».
                  </div>
                </div>
              </div>
            )}

            {/* CASE 4: Selected Backsplash & LED Lighting Inspector */}
            {(selectedKind === 'backsplash' || selectedId === 'backsplash') && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Кухонный фартук и LED подсветка</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Настройка типа отделки стеновой панели, высоты и диодной подсветки рабочей зоны
                  </p>
                </div>

                {/* 1. Backsplash Material Type */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">Тип фартука (стеновой панели)</div>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        (scene.kitchen.backsplashType || 'wall_panel') === 'wall_panel'
                          ? 'bg-amber-500/10 border-amber-500 font-bold text-amber-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="backsplashType"
                          value="wall_panel"
                          checked={(scene.kitchen.backsplashType || 'wall_panel') === 'wall_panel'}
                          onChange={() =>
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, backsplashType: 'wall_panel', hasBacksplash: true },
                            }))
                          }
                          className="accent-amber-600"
                        />
                        <span>Стеновая панель (МДФ / Пластик)</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        scene.kitchen.backsplashType === 'customer_tile'
                          ? 'bg-amber-500/10 border-amber-500 font-bold text-amber-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="backsplashType"
                          value="customer_tile"
                          checked={scene.kitchen.backsplashType === 'customer_tile'}
                          onChange={() =>
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, backsplashType: 'customer_tile', hasBacksplash: true },
                            }))
                          }
                          className="accent-amber-600"
                        />
                        <span>Плитка заказчика</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">(без расчета панели)</span>
                    </label>
                  </div>

                  {/* Height Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Высота стеновой панели (мм)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={300}
                        max={900}
                        step={10}
                        value={scene.kitchen.backsplashHeight ?? 600}
                        onChange={(e) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: { ...prev.kitchen, backsplashHeight: Number(e.target.value) },
                          }))
                        }
                        className="flex-1 accent-amber-500"
                      />
                      <NumericInput
                        min={200}
                        max={1200}
                        value={scene.kitchen.backsplashHeight ?? 600}
                        onChange={(val) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: { ...prev.kitchen, backsplashHeight: val },
                          }))
                        }
                        className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. LED Lighting Setup */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Подсветка рабочей зоны (LED)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(scene.kitchen.hasLedLighting)}
                        onChange={(e) =>
                          setScene((prev) => ({
                            ...prev,
                            kitchen: { ...prev.kitchen, hasLedLighting: e.target.checked },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {scene.kitchen.hasLedLighting && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      {/* Profile Type */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Профиль алюминиевый для подсветки:
                        </label>
                        <select
                          value={scene.kitchen.ledProfileType || 'recessed'}
                          onChange={(e) =>
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, ledProfileType: e.target.value as any },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="corner">Угловой профиль (под верхними шкафами)</option>
                          <option value="surface">Накладной профиль</option>
                          <option value="recessed">Врезной профиль (в паз дна верхних шкафов)</option>
                        </select>
                      </div>

                      {/* Tape Rolls Calculation Notice */}
                      {(() => {
                        const k = scene.kitchen;
                        const totalWallM =
                          ((k.wallCenterLength || 3000) +
                            (k.layoutType === 'l_left' || k.layoutType === 'u_shape' ? k.wallLeftLength || 2000 : 0) +
                            (k.layoutType === 'l_right' || k.layoutType === 'u_shape' ? k.wallRightLength || 2000 : 0)) /
                          1000;
                        const rollsCount = Math.ceil(totalWallM / 5);
                        return (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <div className="font-bold">Расчет LED ленты:</div>
                            <div className="text-[11px]">
                              Общая длина гарнитура: <strong>{totalWallM.toFixed(1)} м</strong>
                            </div>
                            <div className="text-[11px]">
                              Диодная лента выписывается упаковками по <strong>5 метров</strong>.
                            </div>
                            <div className="text-[11px] font-bold text-amber-800">
                              К выписке в спецификацию: {rollsCount} уп. ({rollsCount * 5} м)
                            </div>
                          </div>
                        );
                      })()}

                      {/* Power Points / Power Supply */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Количество точек включения (Блоков питания):
                        </label>
                        <NumericInput
                          min={1}
                          max={10}
                          value={scene.kitchen.ledPowerPointsCount ?? 1}
                          onChange={(val) =>
                            setScene((prev) => ({
                              ...prev,
                              kitchen: { ...prev.kitchen, ledPowerPointsCount: val },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                        />
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          На каждую точку включения выписывается 1 блок питания соответствующей мощности.
                        </div>
                      </div>

                      {/* Switch Type */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Включение подсветки:
                        </label>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="ledSwitchType"
                              value="sensor"
                              checked={(scene.kitchen.ledSwitchType || 'sensor') === 'sensor'}
                              onChange={() =>
                                setScene((prev) => ({
                                  ...prev,
                                  kitchen: { ...prev.kitchen, ledSwitchType: 'sensor' },
                                }))
                              }
                              className="accent-amber-600"
                            />
                            <span>Сенсорный выключатель на взмах руки (в профиль)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="ledSwitchType"
                              value="mechanical_customer"
                              checked={scene.kitchen.ledSwitchType === 'mechanical_customer'}
                              onChange={() =>
                                setScene((prev) => ({
                                  ...prev,
                                  kitchen: { ...prev.kitchen, ledSwitchType: 'mechanical_customer' },
                                }))
                              }
                              className="accent-amber-600"
                            />
                            <span>Механическая кнопка на Фартуке (Кнопка заказчика)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State when nothing selected */}
            {!selectedKitchenModule &&
              !selectedWardrobeSection &&
              !selectedObstacle &&
              selectedKind !== 'backsplash' &&
              selectedId !== 'backsplash' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                  <Maximize2 className="w-7 h-7 text-amber-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">
                    Кликните на любой модуль или фартук в 3D-сцене
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Вы сможете изменить габариты до миллиметра, поменять наполнение (полки, ящики, технику) и настроить стеновую панель и LED подсветку.
                  </p>
                </div>
              )}
          </div>
        </div>
        )}
      </div>

      {/* MODAL 1: Embeddable Website Widget Code */}
      {showWidgetCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Виджет 3D-проектировки для вашего сайта
                  </h3>
                  <p className="text-xs text-slate-500">
                    Клиенты собирают кухню или шкаф на вашем сайте — заявка сразу падает в «Проекты»
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWidgetCodeModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Прямая ссылка на ваш B2C 3D-конструктор:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={widgetUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl"
                />
                <a
                  href={widgetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Открыть
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                HTML-код для вставки на любой сайт (Tilda, WordPress, Bitrix и др.):
              </label>
              <textarea
                readOnly
                rows={4}
                value={iframeSnippet}
                className="w-full p-3 text-xs font-mono bg-slate-900 text-emerald-300 rounded-xl border border-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(iframeSnippet);
                  setCopiedWidget(true);
                  setTimeout(() => setCopiedWidget(false), 2500);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {copiedWidget ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Код скопирован в буфер обмена!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать HTML-код виджета</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: B2C Client Lead Submission (in Widget Mode) */}
      {showWidgetSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Отправить 3D-проект на точный расчёт
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowWidgetSubmitModal(false);
                  setWidgetSubmittedSuccess(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {widgetSubmittedSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Ваш 3D-проект успешно отправлен!
                </div>
                <p className="text-xs text-slate-600">
                  Проект со всеми размерами и спецификацией передан в калькулятор компании «{companyName}». Менеджер свяжется с вами в ближайшее время.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWidgetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ваше имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Иван"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Телефон для связи *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Пожелания к проекту
                  </label>
                  <textarea
                    rows={2}
                    value={clientComment}
                    onChange={(e) => setClientComment(e.target.value)}
                    placeholder="Например: нужна доставка и сборка..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={widgetSubmitting}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
                >
                  {widgetSubmitting ? 'Отправка проекта...' : 'Отправить в расчёт'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Room Dimensions & Kitchen Layout Setup Modal */}
      <RoomDimensionsModal
        isOpen={showRoomDimensionsModal}
        onClose={() => setShowRoomDimensionsModal(false)}
        scene={scene}
        onApply={(params) => {
          setScene((prev) => ({
            ...prev,
            kitchen: {
              ...prev.kitchen,
              layoutType: params.layoutType,
              wallCenterLength: params.wallCenterLength,
              wallLeftLength: params.wallLeftLength,
              wallRightLength: params.wallRightLength,
              roomHeight: params.roomHeight,
              plinthHeight: params.plinthHeight,
              worktopThickness: params.worktopThickness,
            },
            updatedAt: new Date().toISOString(),
          }));
          if (params.layoutType === 'straight') {
            setActiveWallForAdd('center');
          }
          showToast('Габариты помещения применены');
        }}
      />

      {/* MODAL 4: Multi-Module Relative Alignment Modal (Ctrl + Click) */}
      <KitchenAlignmentModal
        isOpen={showAlignmentModal}
        referenceModule={
          scene.kitchen.modules.find((m) => m.id === multiSelectedIds[0]) || null
        }
        targetModules={scene.kitchen.modules.filter((m) =>
          multiSelectedIds.slice(1).includes(m.id)
        )}
        onApplyAlignment={handleApplyMultiAlignment}
        onClose={() => setShowAlignmentModal(false)}
      />

      {/* MODAL 5: Technical 2D Sketches & Elevations for Technologist */}
      <KitchenSketchesModal
        isOpen={showSketchesModal}
        scene={scene}
        onUpdateScene={setScene}
        onUpdateModuleNote={(modId, note) =>
          handleUpdateKitchenModule(modId, { technologistNote: note })
        }
        onClose={() => setShowSketchesModal(false)}
      />

      {/* MODAL 6: Company Global 3D Constructor Settings */}
      <Constructor3DSettingsModal
        isOpen={showConstructorSettingsModal}
        onClose={() => setShowConstructorSettingsModal(false)}
        settings={constructorSettings}
        onSaveSettings={(newSettings) => setConstructorSettings(newSettings)}
      />
    </div>
  );
};

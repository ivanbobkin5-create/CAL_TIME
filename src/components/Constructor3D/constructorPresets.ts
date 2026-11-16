import { ConstructorPanelItem, ConstructorHardwareItem } from '../../utils/b3dWriter';

export type ConstructorMode = 'kitchen' | 'wardrobe';

export interface WardrobeShelfItem {
  id: string;
  heightFromBottom: number; // mm from internal bottom of section
}

export interface WardrobeSection {
  id: string;
  name: string;
  width: number; // internal width in mm
  shelvesCount: number;
  drawersCount: number; // 0..5
  drawerHeight: number; // default 180mm
  hasRodTop: boolean;
  hasRodMid: boolean;
  hasPantograph: boolean;
  hasShoeRack: boolean;
  // Hardware bindings from catalogProducts
  drawerSlideProductId?: string;
  drawerSlideProductName?: string;
  hingeProductId?: string;
  hingeProductName?: string;
  handleProductId?: string;
  handleProductName?: string;
}

export interface WardrobeConfig {
  width: number;          // 400..6000 mm
  height: number;         // 600..3200 mm
  depth: number;          // 300..900 mm
  plinthHeight: number;   // 0..150 mm
  thickness: number;      // 16 | 18 | 22 mm
  hasRoof: boolean;
  hasBottom: boolean;
  hasLeftSide: boolean;
  hasRightSide: boolean;
  hasBackHDF: boolean;
  doorType: 'none' | 'swing' | 'sliding';
  slidingDoorsCount: number; // 2..5
  mirrorDoors: boolean[];    // per door index
  sections: WardrobeSection[];
}

export type KitchenModuleCategory = 'lower' | 'upper' | 'tall' | 'anthresole';

export type KitchenModuleFillingType =
  | 'doors_1'
  | 'doors_2'
  | 'drawers_2'
  | 'drawers_2_inner'
  | 'drawers_3'
  | 'drawers_4'
  | 'sink'
  | 'oven_cooktop'
  | 'bottle_rack'
  | 'dishwasher'
  | 'freestanding_dw'
  | 'freestanding_washer'
  | 'built_in_washer'
  | 'corner_lower'
  | 'upper_doors_1'
  | 'upper_doors_2'
  | 'upper_dryer'
  | 'upper_hood'
  | 'upper_lift_2'
  | 'upper_corner'
  | 'tall_fridge'
  | 'tall_oven_micro'
  | 'tall_oven_micro_1drawer'
  | 'tall_oven_micro_2drawers'
  | 'tall_pantry'
  | 'anthresole_1'
  | 'anthresole_2';

export type LiftMechanismType =
  | 'gas_lift'    // Газлифты (комплект 2 шт)
  | 'aventos_hf'  // Blum AVENTOS HF Top (складной подъемник)
  | 'aventos_hk'  // Blum AVENTOS HK (поворотный подъемник)
  | 'aventos_hks'; // Blum AVENTOS HK-S / HK-XS

export const LIFT_MECHANISM_LABELS: Record<LiftMechanismType, string> = {
  gas_lift: 'Газлифт пневматический (комплект)',
  aventos_hf: 'Blum AVENTOS HF Top (складной)',
  aventos_hk: 'Blum AVENTOS HK (поворотный)',
  aventos_hks: 'Blum AVENTOS HK-S / HK-XS',
};

export type DrawerSystemType =
  | 'concealed'   // Ящики скрытого монтажа (по умолчанию BOYARD с доводчиком)
  | 'tandembox'   // Тандембоксы (с металлическими боковинами)
  | 'telescopic'  // Телескопические (шариковые направляющие)
  | 'metabox';    // Металлобоксы

export const DRAWER_DEPTH_OPTIONS = [500, 450, 400, 350, 300] as const;

export const DRAWER_SYSTEM_LABELS: Record<DrawerSystemType, string> = {
  concealed: 'Скрытого монтажа BOYARD с доводчиком',
  tandembox: 'Тандембокс (металл. боковины с доводчиком)',
  telescopic: 'Телескопические (шариковые направляющие)',
  metabox: 'Металлобокс (роликовые с металл. боковиной)',
};

/**
 * Returns the maximum drawer slide length (mm) that physically fits inside a module of `carcassDepthMm`.
 * - 512 mm carcass -> 500 mm max
 * - 460..509 mm carcass -> 450 mm max
 * - 410..459 mm carcass -> 400 mm max (in 420 mm carcass you cannot fit 450 mm -> max 400 mm)
 * - 360..409 mm carcass -> 350 mm max (in 400 mm carcass you cannot fit 400 mm -> max 350 mm)
 * - <= 359 mm carcass (e.g. 340 mm) -> 300 mm (smallest possible drawer depth)
 */
export function getMaxAllowedDrawerDepth(carcassDepthMm: number): number {
  if (carcassDepthMm >= 510) return 500;
  if (carcassDepthMm >= 460) return 450;
  if (carcassDepthMm >= 410) return 400;
  if (carcassDepthMm >= 360) return 350;
  return 300;
}

export function resolveEffectiveDrawerDepth(
  carcassDepthMm: number,
  requestedDepth?: number,
  fallbackDefault = 500
): number {
  const maxAllowed = getMaxAllowedDrawerDepth(carcassDepthMm);
  const req = requestedDepth || fallbackDefault;
  return Math.max(300, Math.min(maxAllowed, req));
}

export type HandleKind =
  | 'bar'           // Ручка-скоба
  | 'edge'          // Торцевая профильная ручка на торец фасада
  | 'knob'          // Ручка-кнопка
  | 'push_to_open'  // От нажатия (Push-to-Open) — ручка пропадает
  | 'overhang'      // Свес фасада вниз (для верхних шкафов) — открывание зацепом
  | 'gola'          // Профиль GOLA (высота корпуса 780 мм, глубина 512, ДВП 3, отступ от стены 63 мм)
  | 'none';         // Без ручки

export type HandleOrientation = 'auto' | 'horizontal' | 'vertical';

export type HandlePlacement = 'auto' | 'center' | 'top' | 'middle' | 'bottom';

export interface HandleColorPreset {
  id: string;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
}

export const HANDLE_COLOR_PRESETS: HandleColorPreset[] = [
  { id: 'matte_black', name: 'Черный матовый', hex: '#1E242B', metalness: 0.45, roughness: 0.45 },
  { id: 'chrome_satin', name: 'Хром / Сатин', hex: '#D0D7DE', metalness: 0.85, roughness: 0.22 },
  { id: 'brushed_gold', name: 'Золото / Латунь', hex: '#D4AF37', metalness: 0.82, roughness: 0.28 },
  { id: 'matte_white', name: 'Белый матовый', hex: '#F4F6F8', metalness: 0.2, roughness: 0.5 },
  { id: 'graphite_bronze', name: 'Графит / Бронза', hex: '#57534E', metalness: 0.65, roughness: 0.35 },
];

export interface KitchenModuleItem {
  id: string;
  templateCode: string;
  name: string;
  category: KitchenModuleCategory;
  fillingType: KitchenModuleFillingType;
  wall: 'center' | 'left' | 'right';
  positionX: number; // mm from wall start
  positionZ?: number; // mm depth offset from wall (forward > 0, backward < 0, для островов или выдвижения вперед)
  rotationY?: number; // degrees angle (0, 90, 180, 270)
  elevationY: number; // mm from floor (0 for lower/tall, e.g. 1460 for upper, 2180 for anthresole)
  width: number;     // mm
  height: number;    // mm (body height without legs for lower, or total height)
  depth: number;     // mm (standard lower = 512 mm carcass + 3 mm HDF + 45 mm gap = 560 mm, or 63 mm gap for GOLA; upper = 350 mm)
  shelvesCount: number;
  drawersCount: number;
  // Drawer system customization
  drawerSystemType?: DrawerSystemType; // default 'concealed' (BOYARD скрытого монтажа)
  drawerDepth?: number;                // default 500 mm (auto-clamped by carcass depth)
  hasInnerDrawer?: boolean;            // true if behind the top drawer facade there is a 2nd internal drawer
  innerDrawerDepth?: number;           // default 450 mm (auto-clamped by carcass depth)
  // Corner transition configuration
  isCorner?: boolean;
  cornerReturnWidth?: number; // mm along adjacent wall for L-corner modules
  cornerBlindWidth?: number;  // mm width of recessed carcass blind zone (default 350 for upper, 512 for lower)
  cornerFillerWidth?: number; // mm width of corner transition strip (default 50 mm = 16mm LDSP + 34mm plank)
  // Outer side facade cladding ("Облицевать боковину фасадом")
  cladLeftSide?: boolean;
  cladRightSide?: boolean;
  cladSideHeight?: number;    // default = mod.height, can be increased (e.g. mod.height + plinthHeight) to cover plinth
  // Tall column vertical GOLA profile (when GOLA kitchen is active)
  verticalGolaType?: 'none' | 'end' | 'middle' | 'terminal_l' | 'middle_c';
  golaProfileColor?: string;
  // Technologist note on this module for 2D sketches
  technologistNote?: string;
  hingeSide?: 'left' | 'right'; // Which side hinges are on for 1-door modules
  // Handle customization per module (overrides global defaults if set)
  handleType?: HandleKind;
  handleOrientation?: HandleOrientation;
  handlePlacement?: HandlePlacement;
  handleColor?: string;
  handleOffsetX?: number; // mm shift (-250..+250)
  handleOffsetY?: number; // mm shift (-500..+500)
  facadeOverhangMm?: number; // mm downward extension of facade for 'overhang' handle (default 20mm)
  // Built-in appliances toggles
  hasSink?: boolean;
  hasFaucet?: boolean;
  hasOven?: boolean;
  hasCooktop?: boolean;
  hasMicrowave?: boolean;
  hasHood?: boolean;
  hasDishwasher?: boolean;
  hasFridge?: boolean;
  hasDishDryer?: boolean;
  // Special module accessories
  hasDripTray?: boolean;     // Поддон гигиенический (для модуля мойки)
  hasThermalStrips?: boolean; // Термопланки защитные (для модуля с духовкой)
  liftMechanismType?: LiftMechanismType; // Тип подъемника для горизонтальных/подъемных фасадов
  // Linked Catalog Hardware Overrides (click-to-replace)
  hingeProductId?: string;
  hingeProductName?: string;
  drawerSlideProductId?: string;
  drawerSlideProductName?: string;
  handleProductId?: string;
  handleProductName?: string;
  dryerProductId?: string;
  dryerProductName?: string;
  sinkProductId?: string;
  sinkProductName?: string;
  liftProductId?: string;
  liftProductName?: string;
  // Optional module-specific facade material override
  customFacadeColor?: string;
  customFacadeMaterialName?: string;
}

export interface ConstructorCompanySettings {
  // Hinges catalog mapping
  overlayHingeProductId?: string;
  overlayHingeProductName: string;    // Накладная петля (по умолчанию)
  halfOverlayHingeProductId?: string;
  halfOverlayHingeProductName: string; // Полунакладная петля
  insetHingeProductId?: string;
  insetHingeProductName: string;      // Вкладная петля
  cornerHingeProductId?: string;
  cornerHingeProductName: string;     // Угловая петля 45°/90°/175°

  // Drawer systems mapping
  concealedDrawerProductId?: string;
  concealedDrawerProductName: string; // Скрытого монтажа BOYARD с доводчиком
  tandemboxDrawerProductId?: string;
  tandemboxDrawerProductName: string; // Тандембоксы
  telescopicDrawerProductId?: string;
  telescopicDrawerProductName: string; // Телескопические
  metaboxDrawerProductId?: string;
  metaboxDrawerProductName: string;   // Металлобоксы

  // Lift mechanisms mapping
  gasLiftProductId?: string;
  gasLiftProductName: string;         // Газлифты (комплект 2 шт)
  aventosHfProductId?: string;
  aventosHfProductName: string;       // Blum AVENTOS HF Top
  aventosHkProductId?: string;
  aventosHkProductName: string;       // Blum AVENTOS HK

  // Accessories & defaults
  defaultSinkDripTrayName: string;   // Гигиенический алюминиевый поддон в мойку
  defaultOvenThermalStripsName: string; // Термопланки защитные для духового шкафа
  defaultWorktopJointType: 'plank' | 'eurojoint';
  defaultWorktopStockLength: 3000 | 4000;
}

export const DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS: ConstructorCompanySettings = {
  overlayHingeProductName: 'Петля накладная с доводчиком BOYARD / Hettich',
  halfOverlayHingeProductName: 'Петля полунакладная с доводчиком BOYARD / Hettich',
  insetHingeProductName: 'Петля вкладная с доводчиком BOYARD / Hettich',
  cornerHingeProductName: 'Петля угловая 45°/90° с доводчиком BOYARD',
  concealedDrawerProductName: 'Направляющие скрытого монтажа BOYARD B-Slide с доводчиком',
  tandemboxDrawerProductName: 'Система выдвижения Тандембокс с металлическими боковинами',
  telescopicDrawerProductName: 'Направляющие шариковые телескопические 45мм',
  metaboxDrawerProductName: 'Система Металлобокс роликовая',
  gasLiftProductName: 'Газлифт пневматический (комплект 2 шт.)',
  aventosHfProductName: 'Подъемный механизм Blum AVENTOS HF Top складной',
  aventosHkProductName: 'Подъемный механизм Blum AVENTOS HK поворотный',
  defaultSinkDripTrayName: 'Поддон алюминиевый гигиенический в корпус мойки',
  defaultOvenThermalStripsName: 'Термопланки защитные металлические для духовки (комплект 2 шт)',
  defaultWorktopJointType: 'plank',
  defaultWorktopStockLength: 3000,
};

export type RoomObstacleType =
  | 'gas_boiler'
  | 'radiator'
  | 'window'
  | 'door'
  | 'vent_shaft'
  | 'water_outlet'
  | 'power_socket'
  | 'partition_wall'
  | 'column';

export interface RoomObstacleItem {
  id: string;
  type: RoomObstacleType;
  name: string;
  wall: 'center' | 'left' | 'right';
  positionX: number;  // mm along wall
  positionZ?: number; // mm depth offset from wall (forward into room)
  elevationY: number; // mm from floor
  width: number;      // mm
  height: number;     // mm
  depth: number;      // mm
}

export interface MaterialSlotConfig {
  carcassMaterialName: string;
  carcassColor: string;
  carcassThickness: number;
  facadeLowerMaterialName: string;
  facadeLowerColor: string;
  facadeUpperMaterialName: string;
  facadeUpperColor: string;
  worktopMaterialName: string;
  worktopColor: string;
  worktopThickness: number;
  worktopProductId?: string;
  backsplashMaterialName: string;
  backsplashColor: string;
  hdfMaterialName: string;
  // Global handle configuration defaults
  defaultHandleType?: HandleKind;
  defaultHandleOrientation?: HandleOrientation;
  defaultHandlePlacement?: HandlePlacement;
  defaultHandleColor?: string;
  defaultFacadeOverhangMm?: number;
  // Default catalog hardware IDs
  defaultHingeProductId?: string;
  defaultHingeProductName: string;
  defaultDrawerProductId?: string;
  defaultDrawerProductName: string;
  defaultHandleProductId?: string;
  defaultHandleProductName: string;
  defaultLegProductName: string;
}

export interface SketchCalloutItem {
  id: string;
  moduleId?: string;
  wall: 'center' | 'left' | 'right';
  title?: string;
  text: string;
  xMm?: number;
  yMm?: number;
}

export interface KitchenConfig {
  layoutType: 'straight' | 'l_left' | 'l_right' | 'u_shape';
  wallCenterLength: number; // mm, e.g. 3400
  wallLeftLength: number;   // mm, e.g. 2200
  wallRightLength: number;  // mm, e.g. 2200
  roomHeight: number;       // mm, e.g. 2700
  plinthHeight: number;     // mm, e.g. 100
  worktopThickness: number; // mm, e.g. 38
  upperElevation: number;   // mm from floor to bottom of upper cabinets, e.g. 1460
  hasUnifiedWorktop: boolean;
  hasBacksplash: boolean;
  // Backsplash custom options & LED lighting setup
  backsplashType?: 'wall_panel' | 'customer_tile'; // Стеновая панель vs Плитка заказчика
  backsplashHeight?: number;                       // Высота стеновой панели (мм, по умолч. 600)
  hasLedLighting?: boolean;                        // Подсветка рабочих зон
  ledProfileType?: 'corner' | 'surface' | 'recessed'; // Угловой / Накладной / Врезной профиль
  ledPowerPointsCount?: number;                    // Количество точек включения / блоков питания
  ledSwitchType?: 'sensor' | 'mechanical_customer'; // Сенсор vs Механическая кнопка на Фартуке
  // Technological parameters (512 carcass + 3 HDF + 45 wall gap = 560; worktop 600 -> 40 overhang; plinth -80)
  wallGapMm?: number;         // default 45 mm (63 mm for GOLA)
  hdfThicknessMm?: number;    // default 3 mm
  worktopDepthMm?: number;    // default 600 mm
  worktopOverhangMm?: number; // default 40 mm
  plinthSetbackMm?: number;   // default 80 mm from front of lower modules
  isGolaProfile?: boolean;    // true when GOLA profile system is active (carcass H=780mm, wall gap=63mm)
  // Corner worktop joint & cutting parameters
  cornerJointType?: 'plank' | 'eurojoint'; // Соединение в углах: планка или Еврозапил (+70 мм запас)
  worktopStockLength?: 3000 | 4000;        // Стандартная длина плиты столешницы (3000 или 4000 мм)
  technologistNotes?: string;
  sketchCallouts?: SketchCalloutItem[];
  modules: KitchenModuleItem[];
  obstacles: RoomObstacleItem[];
}

export interface ConstructorSceneData {
  version: number;
  projectName: string;
  mode: ConstructorMode;
  materials: MaterialSlotConfig;
  wardrobe: WardrobeConfig;
  kitchen: KitchenConfig;
  technologistNotes?: string;
  sketchCallouts?: SketchCalloutItem[];
  updatedAt: string;
}

export interface ColorDecorPreset {
  id: string;
  name: string;
  materialTitle: string;
  hex: string;
  roughness: number;
  metalness?: number;
}

export const COLOR_DECOR_PRESETS: ColorDecorPreset[] = [
  { id: 'white_base', name: 'Белый базовый (W908)', materialTitle: 'ЛДСП Белый базовый W908 ST2', hex: '#F5F6F8', roughness: 0.45 },
  { id: 'cashmere', name: 'Кашемир серый (U702)', materialTitle: 'ЛДСП Кашемир серый U702 ST9', hex: '#CFC7BE', roughness: 0.5 },
  { id: 'graphite', name: 'Графит (U961)', materialTitle: 'ЛДСП Графит U961 ST2', hex: '#383B40', roughness: 0.5 },
  { id: 'oak_sonoma', name: 'Дуб Сонома (H1145)', materialTitle: 'ЛДСП Дуб Сонома светлый H1145', hex: '#C8B092', roughness: 0.65 },
  { id: 'oak_halifax', name: 'Дуб Галифакс (H1180)', materialTitle: 'ЛДСП Дуб Галифакс натуральный H1180', hex: '#A88256', roughness: 0.68 },
  { id: 'emerald_matte', name: 'Шалфей / Изумруд софт', materialTitle: 'МДФ Эмаль/ПВХ Шалфей матовый', hex: '#6F8578', roughness: 0.4 },
  { id: 'navy_matte', name: 'Синий Индиго софт', materialTitle: 'МДФ ПВХ Индиго Софт-тач', hex: '#2D3E52', roughness: 0.42 },
  { id: 'sand_beige', name: 'Песочный бежевый (U156)', materialTitle: 'ЛДСП Песочный бежевый U156 ST9', hex: '#DED2C1', roughness: 0.48 },
  { id: 'marble_white', name: 'Мрамор Каррара (F204)', materialTitle: 'Столешница Мрамор Каррара белый', hex: '#ECEEEF', roughness: 0.3 },
  { id: 'concrete_dark', name: 'Бетон Чикаго темный', materialTitle: 'Столешница Бетон Чикаго темный F187', hex: '#585A5E', roughness: 0.55 },
];

export const STANDARD_KITCHEN_MODULE_LIBRARY: Array<Omit<KitchenModuleItem, 'id' | 'wall' | 'positionX'>> = [
  // Lower modules (standard depth 512 mm + 3 mm HDF + 45 mm gap to wall = 560 mm carcass)
  {
    templateCode: 'L-600-2D',
    name: 'Тумба нижняя 2 двери (600)',
    category: 'lower',
    fillingType: 'doors_2',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 1,
    drawersCount: 0,
  },
  {
    templateCode: 'L-450-1D',
    name: 'Тумба нижняя 1 дверь (450)',
    category: 'lower',
    fillingType: 'doors_1',
    elevationY: 0,
    width: 450,
    height: 720,
    depth: 512,
    shelvesCount: 1,
    drawersCount: 0,
    hingeSide: 'left',
  },
  {
    templateCode: 'L-600-3DR',
    name: 'Тумба с 3 ящиками (600)',
    category: 'lower',
    fillingType: 'drawers_3',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 3,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
  },
  {
    templateCode: 'L-800-2DR',
    name: 'Тумба с 2 ящиками (800)',
    category: 'lower',
    fillingType: 'drawers_2',
    elevationY: 0,
    width: 800,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 2,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
  },
  {
    templateCode: 'L-600-2DR-IN',
    name: 'Тумба 2 ящика + внутр. ящик (600)',
    category: 'lower',
    fillingType: 'drawers_2_inner',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 2,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
    hasInnerDrawer: true,
    innerDrawerDepth: 450,
  },
  {
    templateCode: 'L-400-4DR',
    name: 'Тумба с 4 ящиками (400)',
    category: 'lower',
    fillingType: 'drawers_4',
    elevationY: 0,
    width: 400,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 4,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
  },
  {
    templateCode: 'L-600-SINK',
    name: 'Тумба под мойку с чашей (600)',
    category: 'lower',
    fillingType: 'sink',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 0,
    hasSink: true,
    hasFaucet: true,
  },
  {
    templateCode: 'L-600-OVEN',
    name: 'Тумба под духовку с ящиком (600)',
    category: 'lower',
    fillingType: 'oven_cooktop',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 1,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
    hasOven: true,
    hasCooktop: true,
  },
  {
    templateCode: 'L-200-BOTTLE',
    name: 'Бутылочница выдвижная (200)',
    category: 'lower',
    fillingType: 'bottle_rack',
    elevationY: 0,
    width: 200,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 1,
  },
  {
    templateCode: 'L-600-DW',
    name: 'ПМ 600 встроенная (с фасадом)',
    category: 'lower',
    fillingType: 'dishwasher',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 0,
    hasDishwasher: true,
  },
  {
    templateCode: 'L-450-DW',
    name: 'ПМ 450 встроенная (с фасадом)',
    category: 'lower',
    fillingType: 'dishwasher',
    elevationY: 0,
    width: 450,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 0,
    hasDishwasher: true,
  },
  {
    templateCode: 'L-600-DW-FREE',
    name: 'ПМ 600 невстроенная под столешницу (без фасада)',
    category: 'lower',
    fillingType: 'freestanding_dw',
    elevationY: 0,
    width: 600,
    height: 850,
    depth: 560,
    shelvesCount: 0,
    drawersCount: 0,
    hasDishwasher: true,
  },
  {
    templateCode: 'L-450-DW-FREE',
    name: 'ПМ 450 невстроенная под столешницу (без фасада)',
    category: 'lower',
    fillingType: 'freestanding_dw',
    elevationY: 0,
    width: 450,
    height: 850,
    depth: 560,
    shelvesCount: 0,
    drawersCount: 0,
    hasDishwasher: true,
  },
  {
    templateCode: 'L-650-WASHER-FREE',
    name: 'Стиральная машина невстроенная (650×850, без фасада)',
    category: 'lower',
    fillingType: 'freestanding_washer',
    elevationY: 0,
    width: 650, // 600mm appliance + 25mm gaps on left and right
    height: 850,
    depth: 560,
    shelvesCount: 0,
    drawersCount: 0,
  },
  {
    templateCode: 'L-600-WASHER-BUILTIN',
    name: 'Стиральная машина встроенная (600×820, с фасадом)',
    category: 'lower',
    fillingType: 'built_in_washer',
    elevationY: 0,
    width: 600,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 0,
    hingeSide: 'left',
  },
  {
    templateCode: 'L-1000-CORNER',
    name: 'Тумба угловая приставная (1000×512)',
    category: 'lower',
    fillingType: 'corner_lower',
    elevationY: 0,
    width: 1000,
    height: 720,
    depth: 512,
    shelvesCount: 1,
    drawersCount: 0,
    isCorner: true,
    cornerReturnWidth: 600,
    cornerBlindWidth: 512,
    cornerFillerWidth: 50,
    hingeSide: 'left',
  },
  {
    templateCode: 'L-900-CORNER-SINK',
    name: 'Тумба угловая с мойкой (1000×512)',
    category: 'lower',
    fillingType: 'corner_lower',
    elevationY: 0,
    width: 1000,
    height: 720,
    depth: 512,
    shelvesCount: 0,
    drawersCount: 0,
    isCorner: true,
    cornerReturnWidth: 600,
    cornerBlindWidth: 512,
    cornerFillerWidth: 50,
    hasSink: true,
    hasFaucet: true,
    hingeSide: 'right',
  },
  // Upper modules (standard carcass depth = 350 mm)
  {
    templateCode: 'U-600-2D',
    name: 'Шкаф верхний 2 двери (600)',
    category: 'upper',
    fillingType: 'upper_doors_2',
    elevationY: 1460,
    width: 600,
    height: 720,
    depth: 350,
    shelvesCount: 2,
    drawersCount: 0,
  },
  {
    templateCode: 'U-450-1D',
    name: 'Шкаф верхний 1 дверь (450)',
    category: 'upper',
    fillingType: 'upper_doors_1',
    elevationY: 1460,
    width: 450,
    height: 720,
    depth: 350,
    shelvesCount: 2,
    drawersCount: 0,
    hingeSide: 'left',
  },
  {
    templateCode: 'U-600-DRYER',
    name: 'Шкаф с посудосушителем (600)',
    category: 'upper',
    fillingType: 'upper_dryer',
    elevationY: 1460,
    width: 600,
    height: 720,
    depth: 350,
    shelvesCount: 0,
    drawersCount: 0,
    hasDishDryer: true,
  },
  {
    templateCode: 'U-600-HOOD',
    name: 'Шкаф над вытяжкой (600)',
    category: 'upper',
    fillingType: 'upper_hood',
    elevationY: 1620,
    width: 600,
    height: 560,
    depth: 350,
    shelvesCount: 1,
    drawersCount: 0,
    hasHood: true,
  },
  {
    templateCode: 'U-800-LIFT',
    name: 'Шкаф горизонт. с газлифтами (800)',
    category: 'upper',
    fillingType: 'upper_lift_2',
    elevationY: 1460,
    width: 800,
    height: 720,
    depth: 350,
    shelvesCount: 1,
    drawersCount: 0,
  },
  {
    templateCode: 'U-600-CORNER',
    name: 'Шкаф верхний угловой с переходом (750×350)',
    category: 'upper',
    fillingType: 'upper_corner',
    elevationY: 1460,
    width: 750,
    height: 720,
    depth: 350,
    shelvesCount: 2,
    drawersCount: 0,
    isCorner: true,
    cornerReturnWidth: 400,
    cornerBlindWidth: 350,
    cornerFillerWidth: 50,
    hingeSide: 'left',
  },
  // Tall columns
  {
    templateCode: 'T-600-OVEN-MW-1D',
    name: 'Пенал: Ящик 356 + Духовка + СВЧ + Дверь (600)',
    category: 'tall',
    fillingType: 'tall_oven_micro_1drawer',
    elevationY: 0,
    width: 600,
    height: 2080,
    depth: 560,
    shelvesCount: 1,
    drawersCount: 1,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
    hasOven: true,
    hasMicrowave: true,
    hasThermalStrips: true,
    hingeSide: 'right',
  },
  {
    templateCode: 'T-600-OVEN-MW-2D',
    name: 'Пенал: 2 Ящика 356 + Духовка + СВЧ + Дверь (600)',
    category: 'tall',
    fillingType: 'tall_oven_micro_2drawers',
    elevationY: 0,
    width: 600,
    height: 2080,
    depth: 560,
    shelvesCount: 1,
    drawersCount: 2,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
    hasOven: true,
    hasMicrowave: true,
    hasThermalStrips: true,
    hingeSide: 'right',
  },
  {
    templateCode: 'T-600-OVEN-MW',
    name: 'Пенал с духовкой и СВЧ (600)',
    category: 'tall',
    fillingType: 'tall_oven_micro',
    elevationY: 0,
    width: 600,
    height: 2080,
    depth: 560,
    shelvesCount: 2,
    drawersCount: 2,
    drawerSystemType: 'concealed',
    drawerDepth: 500,
    hasOven: true,
    hasMicrowave: true,
    hasThermalStrips: true,
    hingeSide: 'right',
  },
  {
    templateCode: 'T-600-FRIDGE',
    name: 'Пенал со встроенным холодильником (600)',
    category: 'tall',
    fillingType: 'tall_fridge',
    elevationY: 0,
    width: 600,
    height: 2080,
    depth: 560,
    shelvesCount: 1,
    drawersCount: 0,
    hasFridge: true,
    hingeSide: 'right',
  },
  {
    templateCode: 'T-450-PANTRY',
    name: 'Пенал хозяйственный с полками (450)',
    category: 'tall',
    fillingType: 'tall_pantry',
    elevationY: 0,
    width: 450,
    height: 2080,
    depth: 560,
    shelvesCount: 5,
    drawersCount: 0,
    hingeSide: 'left',
  },
  // Anthresoles (3rd tier: 560mm deep matching lower/tall, and 350mm matching upper)
  {
    templateCode: 'A-600-LIFT',
    name: 'Антресоль глубокая по низу (600×560)',
    category: 'anthresole',
    fillingType: 'anthresole_1',
    elevationY: 2180,
    width: 600,
    height: 360,
    depth: 560,
    shelvesCount: 0,
    drawersCount: 0,
  },
  {
    templateCode: 'A-600-UPPER',
    name: 'Антресоль по верхнему ярусу (600×350)',
    category: 'anthresole',
    fillingType: 'anthresole_1',
    elevationY: 2180,
    width: 600,
    height: 360,
    depth: 350,
    shelvesCount: 0,
    drawersCount: 0,
  },
];

export const ROOM_OBSTACLE_LIBRARY: Array<Omit<RoomObstacleItem, 'id' | 'wall' | 'positionX'>> = [
  {
    type: 'gas_boiler',
    name: 'Газовый котел с трубами',
    elevationY: 1350,
    width: 440,
    height: 750,
    depth: 340,
  },
  {
    type: 'radiator',
    name: 'Радиатор отопления',
    elevationY: 120,
    width: 800,
    height: 550,
    depth: 120,
  },
  {
    type: 'window',
    name: 'Окно ПВХ с подоконником',
    elevationY: 850,
    width: 1300,
    height: 1400,
    depth: 180,
  },
  {
    type: 'door',
    name: 'Дверной проём',
    elevationY: 0,
    width: 850,
    height: 2050,
    depth: 120,
  },
  {
    type: 'vent_shaft',
    name: 'Вентиляционный короб (шахта)',
    elevationY: 0,
    width: 450,
    height: 2700,
    depth: 350,
  },
  {
    type: 'water_outlet',
    name: 'Вывод воды и канализации',
    elevationY: 450,
    width: 250,
    height: 250,
    depth: 60,
  },
  {
    type: 'partition_wall',
    name: 'Стена-перегородка (простенок)',
    elevationY: 0,
    width: 1000,
    height: 2600,
    depth: 120,
  },
  {
    type: 'column',
    name: 'Колонна / пилон помещения',
    elevationY: 0,
    width: 400,
    height: 2600,
    depth: 400,
  },
];

export function createDemoKitchenModules(): KitchenModuleItem[] {
  return [
    {
      id: 'mod-l-1',
      templateCode: 'L-600-SINK',
      name: 'Тумба под мойку с чашей (600)',
      category: 'lower',
      fillingType: 'sink',
      wall: 'center',
      positionX: 0,
      elevationY: 0,
      width: 600,
      height: 720,
      depth: 512,
      shelvesCount: 0,
      drawersCount: 0,
      hasSink: true,
      hasFaucet: true,
    },
    {
      id: 'mod-l-2',
      templateCode: 'L-600-DW',
      name: 'ПМ 600 (Посудомоечная машина)',
      category: 'lower',
      fillingType: 'dishwasher',
      wall: 'center',
      positionX: 600,
      elevationY: 0,
      width: 600,
      height: 720,
      depth: 512,
      shelvesCount: 0,
      drawersCount: 0,
      hasDishwasher: true,
    },
    {
      id: 'mod-l-3',
      templateCode: 'L-600-OVEN',
      name: 'Тумба под духовку с ящиком (600)',
      category: 'lower',
      fillingType: 'oven_cooktop',
      wall: 'center',
      positionX: 1200,
      elevationY: 0,
      width: 600,
      height: 720,
      depth: 512,
      shelvesCount: 0,
      drawersCount: 1,
      drawerSystemType: 'concealed',
      drawerDepth: 500,
      hasOven: true,
      hasCooktop: true,
    },
    {
      id: 'mod-l-4',
      templateCode: 'L-600-3DR',
      name: 'Тумба с 3 ящиками (600)',
      category: 'lower',
      fillingType: 'drawers_3',
      wall: 'center',
      positionX: 1800,
      elevationY: 0,
      width: 600,
      height: 720,
      depth: 512,
      shelvesCount: 0,
      drawersCount: 3,
      drawerSystemType: 'concealed',
      drawerDepth: 500,
    },
    {
      id: 'mod-t-5',
      templateCode: 'T-600-FRIDGE',
      name: 'Пенал со встроенным холодильником (600)',
      category: 'tall',
      fillingType: 'tall_fridge',
      wall: 'center',
      positionX: 2400,
      elevationY: 0,
      width: 600,
      height: 2080,
      depth: 560,
      shelvesCount: 1,
      drawersCount: 0,
      hasFridge: true,
      hingeSide: 'right',
    },
    // Upper cabinets (350 mm depth)
    {
      id: 'mod-u-1',
      templateCode: 'U-600-DRYER',
      name: 'Шкаф с посудосушителем (600)',
      category: 'upper',
      fillingType: 'upper_dryer',
      wall: 'center',
      positionX: 0,
      elevationY: 1460,
      width: 600,
      height: 720,
      depth: 350,
      shelvesCount: 0,
      drawersCount: 0,
      hasDishDryer: true,
    },
    {
      id: 'mod-u-2',
      templateCode: 'U-600-2D',
      name: 'Шкаф верхний 2 двери (600)',
      category: 'upper',
      fillingType: 'upper_doors_2',
      wall: 'center',
      positionX: 600,
      elevationY: 1460,
      width: 600,
      height: 720,
      depth: 350,
      shelvesCount: 2,
      drawersCount: 0,
    },
    {
      id: 'mod-u-3',
      templateCode: 'U-600-HOOD',
      name: 'Шкаф над вытяжкой (600)',
      category: 'upper',
      fillingType: 'upper_hood',
      wall: 'center',
      positionX: 1200,
      elevationY: 1620,
      width: 600,
      height: 560,
      depth: 350,
      shelvesCount: 1,
      drawersCount: 0,
      hasHood: true,
    },
    {
      id: 'mod-u-4',
      templateCode: 'U-600-2D',
      name: 'Шкаф верхний 2 двери (600)',
      category: 'upper',
      fillingType: 'upper_doors_2',
      wall: 'center',
      positionX: 1800,
      elevationY: 1460,
      width: 600,
      height: 720,
      depth: 350,
      shelvesCount: 2,
      drawersCount: 0,
    },
  ];
}

export function createDefaultConstructorScene(): ConstructorSceneData {
  return {
    version: 1,
    projectName: 'Новый 3D Проект',
    mode: 'kitchen',
    materials: {
      carcassMaterialName: 'ЛДСП Белый базовый W908 ST2',
      carcassColor: '#F5F6F8',
      carcassThickness: 16,
      facadeLowerMaterialName: 'ЛДСП Кашемир серый U702 ST9',
      facadeLowerColor: '#CFC7BE',
      facadeUpperMaterialName: 'ЛДСП Белый базовый W908 ST2',
      facadeUpperColor: '#F5F6F8',
      worktopMaterialName: 'Столешница Дуб Галифакс натуральный 38 мм',
      worktopColor: '#A88256',
      worktopThickness: 38,
      backsplashMaterialName: 'Стеновая панель Мрамор Каррара',
      backsplashColor: '#ECEEEF',
      hdfMaterialName: 'ХДФ Белый 3 мм',
      defaultHandleType: 'bar',
      defaultHandleOrientation: 'auto',
      defaultHandlePlacement: 'auto',
      defaultHandleColor: '#1E242B',
      defaultFacadeOverhangMm: 20,
      defaultHingeProductName: 'Петля накладная с доводчиком',
      defaultDrawerProductName: 'Направляющие скрытого монтажа BOYARD с доводчиком 500мм',
      defaultHandleProductName: 'Ручка-скоба черная матовая 160мм',
      defaultLegProductName: 'Опора кухонная регулируемая Н=100мм',
    },
    wardrobe: {
      width: 2100,
      height: 2400,
      depth: 600,
      plinthHeight: 80,
      thickness: 16,
      hasRoof: true,
      hasBottom: true,
      hasLeftSide: true,
      hasRightSide: true,
      hasBackHDF: true,
      doorType: 'swing',
      slidingDoorsCount: 3,
      mirrorDoors: [false, true, false],
      sections: [
        {
          id: 'sec-1',
          name: 'Секция 1 (Полки + Ящики)',
          width: 678,
          shelvesCount: 5,
          drawersCount: 3,
          drawerHeight: 180,
          hasRodTop: false,
          hasRodMid: false,
          hasPantograph: false,
          hasShoeRack: false,
        },
        {
          id: 'sec-2',
          name: 'Секция 2 (Платяное отделение)',
          width: 678,
          shelvesCount: 1,
          drawersCount: 0,
          drawerHeight: 180,
          hasRodTop: true,
          hasRodMid: true,
          hasPantograph: false,
          hasShoeRack: true,
        },
        {
          id: 'sec-3',
          name: 'Секция 3 (Верхняя одежда + Полки)',
          width: 680,
          shelvesCount: 2,
          drawersCount: 2,
          drawerHeight: 200,
          hasRodTop: true,
          hasRodMid: false,
          hasPantograph: false,
          hasShoeRack: false,
        },
      ],
    },
    kitchen: {
      layoutType: 'straight',
      wallCenterLength: 3200,
      wallLeftLength: 2000,
      wallRightLength: 2000,
      roomHeight: 2650,
      plinthHeight: 100,
      worktopThickness: 38,
      upperElevation: 1460,
      hasUnifiedWorktop: true,
      hasBacksplash: true,
      wallGapMm: 45,
      hdfThicknessMm: 3,
      worktopDepthMm: 600,
      worktopOverhangMm: 40,
      plinthSetbackMm: 80,
      cornerJointType: 'plank',
      worktopStockLength: 3000,
      modules: [],
      obstacles: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export interface ComputedWorktopSegment {
  id: string;
  wall: 'center' | 'left' | 'right';
  label: string;
  startMm: number;
  endMm: number;
  netLengthMm: number;      // visible span along wall
  eurojointExtraMm: number; // +70 mm if this segment enters face of adjacent worktop via Eurojoint
  cutLengthMm: number;      // netLengthMm + eurojointExtraMm (used for slab cutting & BOM)
  depthMm: number;          // 600 mm
  edges: [boolean, boolean, boolean, boolean];   // [Rear, Right, Front, Left]
  corners: [boolean, boolean, boolean, boolean]; // [TL, TR, BR, BL]
}

export interface ComputedKitchenWorktopCutting {
  segments: ComputedWorktopSegment[];
  totalNetLengthMm: number;
  totalCutLengthMm: number;
  cornerJointsCount: number;
  cornerJointType: 'plank' | 'eurojoint';
  stockLengthMm: number;
  slabsRequired: number;
  calculatorWorktopCut: {
    parts: Array<{
      id: string;
      width: number;
      height: number;
      edges: [boolean, boolean, boolean, boolean];
      corners: [boolean, boolean, boolean, boolean];
    }>;
    edgePrice: number;
    edgeDecor: string;
    edgeType: 'ABC' | 'Самоклеющаяся';
    isExact: boolean;
  };
}

/**
 * Computes countertop segments across walls (center, left, right),
 * accounting for corner joint type ('plank' vs 'eurojoint' with +70 mm length allowance)
 * and builds the ready-to-use `WorktopCut` structure for the Final Calculation ("Раскрой столешниц").
 */
export function computeKitchenWorktopCut(scene: ConstructorSceneData): ComputedKitchenWorktopCutting {
  const k = scene.kitchen;
  const jointType = k.cornerJointType || 'plank';
  const stockLengthMm = k.worktopStockLength || 3000;
  const worktopDepth = k.worktopDepthMm || 600;

  const segments: ComputedWorktopSegment[] = [];
  if (scene.mode !== 'kitchen' || !k.hasUnifiedWorktop) {
    return {
      segments,
      totalNetLengthMm: 0,
      totalCutLengthMm: 0,
      cornerJointsCount: 0,
      cornerJointType: jointType,
      stockLengthMm,
      slabsRequired: 0,
      calculatorWorktopCut: {
        parts: [],
        edgePrice: 150,
        edgeDecor: scene.materials.worktopMaterialName,
        edgeType: 'ABC',
        isExact: true,
      },
    };
  }

  const lowerByWall = (wall: 'center' | 'left' | 'right') =>
    k.modules.filter((m) => m.category === 'lower' && (m.wall || 'center') === wall);

  const centerMods = lowerByWall('center');
  const leftMods = (k.layoutType === 'l_left' || k.layoutType === 'u_shape') ? lowerByWall('left') : [];
  const rightMods = (k.layoutType === 'l_right' || k.layoutType === 'u_shape') ? lowerByWall('right') : [];

  const t = scene.materials.carcassThickness || 16;
  const getSpan = (mods: KitchenModuleItem[]) => {
    if (mods.length === 0) return null;
    const minX = Math.min(
      ...mods.map((m) => m.positionX - (m.cladLeftSide ? t : 0))
    );
    const maxX = Math.max(
      ...mods.map((m) => m.positionX + m.width + (m.cladRightSide ? t : 0))
    );
    return { minX, maxX, span: Math.max(100, Math.round(maxX - minX)) };
  };

  const centerSpan = getSpan(centerMods);
  const leftSpan = getSpan(leftMods);
  const rightSpan = getSpan(rightMods);

  if (centerSpan) {
    const leftEdgeExposed = !leftSpan;
    const rightEdgeExposed = !rightSpan;
    segments.push({
      id: 'wt-seg-center',
      wall: 'center',
      label: 'Столешница (Центральная стена)',
      startMm: centerSpan.minX,
      endMm: centerSpan.maxX,
      netLengthMm: centerSpan.span,
      eurojointExtraMm: 0,
      cutLengthMm: centerSpan.span,
      depthMm: worktopDepth,
      edges: [false, rightEdgeExposed, false, leftEdgeExposed],
      corners: [false, false, false, false],
    });
  }

  let cornerJointsCount = 0;

  if (leftSpan) {
    const hasCornerIntersection = Boolean(centerSpan);
    if (hasCornerIntersection) cornerJointsCount += 1;
    const effectiveNet =
      hasCornerIntersection && leftSpan.minX < worktopDepth
        ? Math.max(300, leftSpan.maxX - worktopDepth)
        : leftSpan.span;
    const euroExtra = hasCornerIntersection && jointType === 'eurojoint' ? 70 : 0;
    segments.push({
      id: 'wt-seg-left',
      wall: 'left',
      label:
        euroExtra > 0
          ? 'Столешница (Левая стена, Еврозапил +70 мм)'
          : 'Столешница (Левая стена)',
      startMm: hasCornerIntersection ? Math.max(worktopDepth, leftSpan.minX) : leftSpan.minX,
      endMm: Math.max(worktopDepth + 300, leftSpan.maxX),
      netLengthMm: effectiveNet,
      eurojointExtraMm: euroExtra,
      cutLengthMm: effectiveNet + euroExtra,
      depthMm: worktopDepth,
      edges: [false, true, false, !hasCornerIntersection],
      corners: [false, false, false, false],
    });
  }

  if (rightSpan) {
    const hasCornerIntersection = Boolean(centerSpan);
    if (hasCornerIntersection) cornerJointsCount += 1;
    const effectiveNet =
      hasCornerIntersection && rightSpan.minX < worktopDepth
        ? Math.max(300, rightSpan.maxX - worktopDepth)
        : rightSpan.span;
    const euroExtra = hasCornerIntersection && jointType === 'eurojoint' ? 70 : 0;
    segments.push({
      id: 'wt-seg-right',
      wall: 'right',
      label:
        euroExtra > 0
          ? 'Столешница (Правая стена, Еврозапил +70 мм)'
          : 'Столешница (Правая стена)',
      startMm: hasCornerIntersection ? Math.max(worktopDepth, rightSpan.minX) : rightSpan.minX,
      endMm: Math.max(worktopDepth + 300, rightSpan.maxX),
      netLengthMm: effectiveNet,
      eurojointExtraMm: euroExtra,
      cutLengthMm: effectiveNet + euroExtra,
      depthMm: worktopDepth,
      edges: [false, !hasCornerIntersection, false, true],
      corners: [false, false, false, false],
    });
  }

  const totalNetLengthMm = segments.reduce((sum, s) => sum + s.netLengthMm, 0);
  const totalCutLengthMm = segments.reduce((sum, s) => sum + s.cutLengthMm, 0);

  let slabsRequired = 0;
  if (segments.length > 0) {
    const remainingBins: number[] = [];
    const sorted = [...segments].sort((a, b) => b.cutLengthMm - a.cutLengthMm);
    sorted.forEach((seg) => {
      if (seg.cutLengthMm > stockLengthMm) {
        const fullSlabs = Math.floor(seg.cutLengthMm / stockLengthMm);
        slabsRequired += fullSlabs;
        const leftover = seg.cutLengthMm - fullSlabs * stockLengthMm;
        if (leftover > 0) {
          const binIdx = remainingBins.findIndex((rem) => rem >= leftover);
          if (binIdx >= 0) {
            remainingBins[binIdx] -= leftover;
          } else {
            slabsRequired += 1;
            remainingBins.push(stockLengthMm - leftover);
          }
        }
      } else {
        const binIdx = remainingBins.findIndex((rem) => rem >= seg.cutLengthMm);
        if (binIdx >= 0) {
          remainingBins[binIdx] -= seg.cutLengthMm;
        } else {
          slabsRequired += 1;
          remainingBins.push(stockLengthMm - seg.cutLengthMm);
        }
      }
    });
  }

  return {
    segments,
    totalNetLengthMm,
    totalCutLengthMm,
    cornerJointsCount,
    cornerJointType: jointType,
    stockLengthMm,
    slabsRequired: Math.max(segments.length > 0 ? 1 : 0, slabsRequired),
    calculatorWorktopCut: {
      parts: segments.map((seg, idx) => ({
        id: String(idx + 1),
        width: seg.depthMm,
        height: seg.cutLengthMm,
        edges: seg.edges,
        corners: seg.corners,
      })),
      edgePrice: 150,
      edgeDecor: scene.materials.worktopMaterialName,
      edgeType: 'ABC',
      isExact: true,
    },
  };
}

/**
 * Generates exact cutting list (ConstructorPanelItem[]) and hardware BOM (ConstructorHardwareItem[])
 * from the active ConstructorSceneData.
 */
export function generateSceneBOM(
  scene: ConstructorSceneData,
  catalogProducts: any[] = []
): {
  panels: ConstructorPanelItem[];
  hardware: ConstructorHardwareItem[];
  totalAreaM2: number;
  facadeAreaM2: number;
} {
  const panels: ConstructorPanelItem[] = [];
  const hardwareMap = new Map<string, ConstructorHardwareItem>();
  let posCounter = 1;

  const addHardware = (
    name: string,
    count: number,
    unit = 'шт.',
    catalogProductId?: string,
    category?: string
  ) => {
    if (count <= 0) return;
    // Try matching with catalogProducts by ID or name
    let matchedProd = catalogProductId
      ? catalogProducts.find((p) => String(p.id) === String(catalogProductId))
      : undefined;
    if (!matchedProd) {
      const lower = name.toLowerCase();
      matchedProd = catalogProducts.find(
        (p) => p.name && p.name.toLowerCase().includes(lower.slice(0, 18))
      );
    }

    const finalName = matchedProd ? matchedProd.name : name;
    const key = matchedProd ? `prod_${matchedProd.id}` : `name_${finalName}`;
    const existing = hardwareMap.get(key);
    if (existing) {
      existing.count += count;
    } else {
      hardwareMap.set(key, {
        id: key,
        name: finalName,
        category: matchedProd?.category || category || 'Фурнитура',
        count,
        unit: matchedProd?.unit || unit,
        price: matchedProd?.price ? Number(matchedProd.price) : undefined,
        catalogProductId: matchedProd ? String(matchedProd.id) : catalogProductId,
        sku: matchedProd?.sku,
      });
    }
  };

  const t = scene.materials.carcassThickness || 16;
  const edge20 = `Кромка ПВХ 19х2.0 мм`;
  const edge04 = `Кромка ПВХ 19х0.4 мм`;
  const carcassMat = scene.materials.carcassMaterialName || 'ЛДСП Белый базовый W908 ST2';
  const facadeLowerMat = scene.materials.facadeLowerMaterialName || 'ЛДСП Кашемир серый U702 ST9';
  const facadeUpperMat = scene.materials.facadeUpperMaterialName || 'ЛДСП Белый базовый W908 ST2';
  const hdfMat = scene.materials.hdfMaterialName || 'ХДФ Белый 3 мм';

  if (scene.mode === 'wardrobe') {
    const w = scene.wardrobe;
    const internalDepth = w.doorType === 'sliding' ? Math.max(250, w.depth - 90) : w.depth;
    const bodyHeight = w.height;
    const internalHeight =
      bodyHeight - w.plinthHeight - (w.hasRoof ? t : 0) - (w.hasBottom ? t : 0);

    // Outer left/right sides
    const sideCount = (w.hasLeftSide ? 1 : 0) + (w.hasRightSide ? 1 : 0);
    if (sideCount > 0) {
      panels.push({
        id: `w-side`,
        pos: String(posCounter++),
        name: 'Боковина внешняя шкафа',
        materialName: carcassMat,
        thickness: t,
        height: bodyHeight,
        width: w.depth,
        count: sideCount,
        edgeL1: edge20,
        edgeW1: edge04,
        edgeW2: edge04,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    const outerSidesThickness = (w.hasLeftSide ? t : 0) + (w.hasRightSide ? t : 0);
    const horizontalSpan = Math.max(200, w.width - outerSidesThickness);

    if (w.hasRoof) {
      panels.push({
        id: `w-roof`,
        pos: String(posCounter++),
        name: 'Крыша шкафа',
        materialName: carcassMat,
        thickness: t,
        height: horizontalSpan,
        width: w.depth,
        count: 1,
        edgeL1: edge20,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    if (w.hasBottom) {
      panels.push({
        id: `w-bottom`,
        pos: String(posCounter++),
        name: 'Дно шкафа',
        materialName: carcassMat,
        thickness: t,
        height: horizontalSpan,
        width: internalDepth,
        count: 1,
        edgeL1: edge20,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    if (w.plinthHeight > 0) {
      panels.push({
        id: `w-plinth`,
        pos: String(posCounter++),
        name: 'Цокольная планка (передняя + задняя)',
        materialName: carcassMat,
        thickness: t,
        height: horizontalSpan,
        width: w.plinthHeight,
        count: 2,
        edgeL1: edge04,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    // Vertical dividers
    const dividersCount = Math.max(0, w.sections.length - 1);
    if (dividersCount > 0) {
      panels.push({
        id: `w-dividers`,
        pos: String(posCounter++),
        name: 'Перегородка вертикальная (стоевая)',
        materialName: carcassMat,
        thickness: t,
        height: internalHeight,
        width: internalDepth,
        count: dividersCount,
        edgeL1: edge20,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    // Back HDF
    if (w.hasBackHDF) {
      panels.push({
        id: `w-hdf`,
        pos: String(posCounter++),
        name: 'Задняя стенка ХДФ',
        materialName: hdfMat,
        thickness: 3,
        height: bodyHeight - w.plinthHeight - 4,
        width: w.width - 4,
        count: 1,
        isBackHDF: true,
        moduleName: 'Шкаф / Гардеробная',
      });
    }

    // Per-section shelves, drawers, rods
    w.sections.forEach((sec, idx) => {
      const secW = Math.max(200, Math.round(sec.width));
      if (sec.shelvesCount > 0) {
        panels.push({
          id: `w-sec-${idx}-shelves`,
          pos: String(posCounter++),
          name: `Полка секции №${idx + 1}`,
          materialName: carcassMat,
          thickness: t,
          height: secW,
          width: internalDepth - 10,
          count: sec.shelvesCount,
          edgeL1: edge20,
          moduleName: sec.name,
        });
        addHardware('Полкодержатель металлический', sec.shelvesCount * 4, 'шт.', undefined, 'Крепеж и метизы');
      }

      if (sec.drawersCount > 0) {
        const drH = sec.drawerHeight || 180;
        const drBoxH = Math.max(90, drH - 40);
        const drDepth = Math.min(500, Math.floor((internalDepth - 40) / 50) * 50);
        // Drawer facade
        panels.push({
          id: `w-sec-${idx}-dr-facade`,
          pos: String(posCounter++),
          name: `Фасад ящика секции №${idx + 1}`,
          materialName: facadeLowerMat,
          thickness: t,
          height: secW - 4,
          width: drH - 3,
          count: sec.drawersCount,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleName: sec.name,
        });
        // Drawer sides (left + right per drawer)
        panels.push({
          id: `w-sec-${idx}-dr-sides`,
          pos: String(posCounter++),
          name: `Боковина ящика секции №${idx + 1}`,
          materialName: carcassMat,
          thickness: t,
          height: drDepth,
          width: drBoxH,
          count: sec.drawersCount * 2,
          edgeL1: edge04,
          moduleName: sec.name,
        });
        // Drawer front/back inner walls
        panels.push({
          id: `w-sec-${idx}-dr-fb`,
          pos: String(posCounter++),
          name: `Стенка ящика внутр. секции №${idx + 1}`,
          materialName: carcassMat,
          thickness: t,
          height: Math.max(120, secW - 2 * t - 26),
          width: drBoxH,
          count: sec.drawersCount * 2,
          edgeL1: edge04,
          moduleName: sec.name,
        });
        // Drawer bottom HDF
        panels.push({
          id: `w-sec-${idx}-dr-hdf`,
          pos: String(posCounter++),
          name: `Дно ящика ХДФ секции №${idx + 1}`,
          materialName: hdfMat,
          thickness: 3,
          height: Math.max(120, secW - 26),
          width: drDepth,
          count: sec.drawersCount,
          isBackHDF: true,
          moduleName: sec.name,
        });

        addHardware(
          sec.drawerSlideProductName || scene.materials.defaultDrawerProductName,
          sec.drawersCount,
          'компл.',
          sec.drawerSlideProductId || scene.materials.defaultDrawerProductId,
          'Системы выдвижения'
        );
      }

      if (sec.hasRodTop) {
        addHardware('Штанга овальная с держателями', 1, 'компл.', undefined, 'Наполнение шкафов');
      }
      if (sec.hasRodMid) {
        addHardware('Штанга овальная с держателями', 1, 'компл.', undefined, 'Наполнение шкафов');
      }
      if (sec.hasPantograph) {
        addHardware('Пантограф мебельный с доводчиком', 1, 'шт.', undefined, 'Наполнение шкафов');
      }
      if (sec.hasShoeRack) {
        addHardware('Полка-обувница выдвижная', 1, 'шт.', undefined, 'Наполнение шкафов');
      }
    });

    // Doors for Wardrobe
    if (w.doorType === 'swing') {
      w.sections.forEach((sec, idx) => {
        const doorCount = sec.width > 550 ? 2 : 1;
        const doorW = Math.round((sec.width + t - 4) / doorCount);
        const doorH = bodyHeight - w.plinthHeight - 4;
        panels.push({
          id: `w-swing-door-${idx}`,
          pos: String(posCounter++),
          name: `Фасад распашной секции №${idx + 1}`,
          materialName: facadeLowerMat,
          thickness: t,
          height: doorH,
          width: doorW,
          count: doorCount,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleName: sec.name,
        });
        const hingesPerDoor = doorH > 1900 ? 4 : doorH > 1000 ? 3 : 2;
        addHardware(
          sec.hingeProductName || scene.materials.defaultHingeProductName,
          doorCount * hingesPerDoor,
          'шт.',
          sec.hingeProductId || scene.materials.defaultHingeProductId,
          'Петли'
        );
        addHardware(
          sec.handleProductName || scene.materials.defaultHandleProductName,
          doorCount,
          'шт.',
          sec.handleProductId || scene.materials.defaultHandleProductId,
          'Ручки и крючки'
        );
      });
    } else if (w.doorType === 'sliding') {
      const doorsCount = Math.max(2, w.slidingDoorsCount || 2);
      const doorW = Math.round((w.width + (doorsCount - 1) * 26) / doorsCount);
      const doorH = bodyHeight - w.plinthHeight - 40;
      for (let d = 0; d < doorsCount; d++) {
        const isMirror = Boolean(w.mirrorDoors?.[d]);
        panels.push({
          id: `w-sliding-door-${d}`,
          pos: String(posCounter++),
          name: isMirror ? `Вставка двери-купе №${d + 1} (Зеркало/ЛДСП)` : `Полотно двери-купе №${d + 1}`,
          materialName: facadeLowerMat,
          thickness: t,
          height: doorH,
          width: doorW,
          count: 1,
          isFacade: true,
          moduleName: 'Система купе',
        });
      }
      addHardware('Комплект системы купе (профили, направляющие и ролики)', doorsCount, 'компл.', undefined, 'Раздвижные системы');
    }

    addHardware('Евровинт (конфирмат) 7х50 мм', w.sections.length * 24, 'шт.', undefined, 'Крепеж и метизы');
  } else {
    // KITCHEN MODE BOM
    const k = scene.kitchen;
    const isGlobalGola =
      scene.materials.defaultHandleType === 'gola' || Boolean(k.isGolaProfile);
    const dynamicLegName = (scene.materials.defaultLegProductName || 'Опора кухонная регулируемая Н=100мм').replace(
      /Н=\s*\d+\s*мм/i,
      `Н=${k.plinthHeight || 100}мм`
    );

    k.modules.forEach((mod) => {
      const modW = Math.round(mod.width);
      const isGola =
        mod.handleType === 'gola' || isGlobalGola;
      const modH = Math.round(
        isGola && mod.category === 'lower' && (mod.height === 720 || !mod.height)
          ? 780
          : mod.height
      );
      const modD = Math.round(
        isGola && (mod.category === 'tall' || (mod.category === 'anthresole' && mod.depth >= 550))
          ? Math.max(578, mod.depth)
          : mod.depth
      );
      const innerW = Math.max(100, modW - 2 * t);
      const isUpper = mod.category === 'upper' || mod.category === 'anthresole';
      const activeFacadeMat =
        mod.customFacadeMaterialName || (isUpper ? facadeUpperMat : facadeLowerMat);

      const activeHandleType: HandleKind =
        mod.handleType || scene.materials.defaultHandleType || 'bar';
      const overhangMm =
        activeHandleType === 'overhang' && isUpper
          ? mod.facadeOverhangMm ?? scene.materials.defaultFacadeOverhangMm ?? 20
          : 0;

      const addModuleHandleHardware = (count: number) => {
        if (count <= 0) return;
        if (
          activeHandleType === 'none' ||
          activeHandleType === 'overhang' ||
          activeHandleType === 'gola'
        ) {
          return;
        }
        if (activeHandleType === 'push_to_open') {
          addHardware(
            'Механизм Push-to-Open (толкатель фасада от нажатия)',
            count,
            'шт.',
            undefined,
            'Фурнитура и комплектующие'
          );
          return;
        }
        if (activeHandleType === 'edge' && !mod.handleProductId) {
          addHardware(
            mod.handleProductName || 'Ручка профильная торцевая накладная',
            count,
            'шт.',
            mod.handleProductId || scene.materials.defaultHandleProductId,
            'Ручки и крючки'
          );
          return;
        }
        addHardware(
          mod.handleProductName || scene.materials.defaultHandleProductName,
          count,
          'шт.',
          mod.handleProductId || scene.materials.defaultHandleProductId,
          'Ручки и крючки'
        );
      };

      const getDrawerHardwareLabel = (depthMm: number, sysType?: DrawerSystemType): string => {
        if (mod.drawerSlideProductName) {
          return mod.drawerSlideProductName.replace(/\d{3}\s*мм/i, `${depthMm}мм`);
        }
        const st = sysType || mod.drawerSystemType || 'concealed';
        if (st === 'tandembox') return `Система выдвижения Тандембокс с доводчиком L=${depthMm}мм`;
        if (st === 'telescopic') return `Направляющие шариковые телескопические L=${depthMm}мм`;
        if (st === 'metabox') return `Металлобокс роликовый L=${depthMm}мм`;
        return `Направляющие скрытого монтажа BOYARD с доводчиком ${depthMm}мм`;
      };

      // Outer side facade cladding ("Облицевать боковину фасадом")
      const cladSidesCount = (mod.cladLeftSide ? 1 : 0) + (mod.cladRightSide ? 1 : 0);
      if (cladSidesCount > 0) {
        const cladH = Math.round(mod.cladSideHeight || modH);
        const fullDepthWithWallGap =
          mod.category === 'lower'
            ? modD + (k.hdfThicknessMm || 3) + (isGola ? 63 : k.wallGapMm || 45)
            : modD;
        panels.push({
          id: `${mod.id}-clad-sides`,
          pos: String(posCounter++),
          name: `Фальшфасад боковой облицовочный (${mod.name})`,
          materialName: activeFacadeMat,
          thickness: t,
          height: cladH,
          width: fullDepthWithWallGap,
          count: cladSidesCount,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });
      }

      // Vertical GOLA profile on tall columns when GOLA is active
      if (isGola && mod.category === 'tall' && mod.verticalGolaType && mod.verticalGolaType !== 'none') {
        const vGolaLabel =
          mod.verticalGolaType === 'end' || mod.verticalGolaType === 'terminal_l'
            ? `Профиль GOLA вертикальный оконечный (L-образный, H=${modH}мм)`
            : `Профиль GOLA вертикальный срединный между пеналами (C-образный, H=${modH}мм)`;
        addHardware(vGolaLabel, 1, 'шт.', undefined, 'Профили GOLA');
      }

      // SPECIAL CASE: Dishwasher ("ПМ") has NO carcass walls, NO bottom, NO top rails, and NO furniture legs!
      // Only a front facade panel + handle (and unified worktop/plinth).
      if (mod.fillingType === 'dishwasher') {
        const dwDoorH = modH - 4;
        const dwDoorW = modW - 4;
        panels.push({
          id: `${mod.id}-dw-facade`,
          pos: String(posCounter++),
          name: `Фасад ПМ (${mod.name})`,
          materialName: activeFacadeMat,
          thickness: t,
          height: dwDoorH,
          width: dwDoorW,
          count: 1,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        addModuleHandleHardware(1);
        return;
      }

      // Left & Right carcass sides
      panels.push({
        id: `${mod.id}-sides`,
        pos: String(posCounter++),
        name: `Боковина (${mod.name})`,
        materialName: carcassMat,
        thickness: t,
        height: modH,
        width: modD,
        count: 2,
        edgeL1: edge20,
        edgeW1: edge04,
        edgeW2: edge04,
        moduleId: mod.id,
        moduleName: mod.name,
      });

      // Bottom & Top/Ties
      if (mod.category === 'lower') {
        // Bottom panel
        panels.push({
          id: `${mod.id}-bottom`,
          pos: String(posCounter++),
          name: `Дно (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: innerW,
          width: modD,
          count: 1,
          edgeL1: edge20,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        // 2 top царги (stretcher rails)
        panels.push({
          id: `${mod.id}-rails`,
          pos: String(posCounter++),
          name: `Царга верхняя (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: innerW,
          width: 100,
          count: 2,
          edgeL1: edge20,
          edgeL2: edge04,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        // Kitchen adjustable legs (4 per lower module, height = plinthHeight)
        addHardware(dynamicLegName, 4, 'шт.', undefined, 'Опоры и ножки');
      } else {
        // Upper or Tall or Anthresole: full Bottom + Top
        panels.push({
          id: `${mod.id}-bt`,
          pos: String(posCounter++),
          name: `Дно / Крыша (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: innerW,
          width: modD,
          count: 2,
          edgeL1: edge20,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        if (mod.category === 'tall') {
          addHardware(dynamicLegName, 4, 'шт.', undefined, 'Опоры и ножки');
        } else {
          addHardware('Навес регулируемый для верхних шкафов', 2, 'шт.', undefined, 'Крепеж и метизы');
        }
      }

      // Back HDF (3mm, except sink)
      if (mod.fillingType !== 'sink' && !mod.hasSink) {
        panels.push({
          id: `${mod.id}-hdf`,
          pos: String(posCounter++),
          name: `Задняя стенка ХДФ (${mod.name})`,
          materialName: hdfMat,
          thickness: 3,
          height: modH - 4,
          width: modW - 4,
          count: 1,
          isBackHDF: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });
      }

      // Internal shelves
      if (mod.shelvesCount > 0) {
        panels.push({
          id: `${mod.id}-shelves`,
          pos: String(posCounter++),
          name: `Полка вкладная (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: innerW - 2,
          width: modD - 20,
          count: mod.shelvesCount,
          edgeL1: edge20,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        addHardware('Полкодержатель металлический', mod.shelvesCount * 4, 'шт.', undefined, 'Крепеж и метизы');
      }

      // Special handling for lower oven module: ALWAYS has shelf under oven + bottom drawer facade (116mm)
      const isLowerOven =
        mod.category === 'lower' && (mod.fillingType === 'oven_cooktop' || Boolean(mod.hasOven));

      if (isLowerOven) {
        panels.push({
          id: `${mod.id}-oven-shelf`,
          pos: String(posCounter++),
          name: `Горизонт усиленный под духовку (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: innerW,
          width: modD,
          count: 1,
          edgeL1: edge20,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        const ovenBottomFacadeH = 116;
        const drDepth = resolveEffectiveDrawerDepth(modD, mod.drawerDepth, 500);
        const drBoxH = 80;

        panels.push({
          id: `${mod.id}-oven-bottom-facade`,
          pos: String(posCounter++),
          name: `Фасад ящика под духовкой (${mod.name})`,
          materialName: activeFacadeMat,
          thickness: t,
          height: modW - 4,
          width: ovenBottomFacadeH,
          count: 1,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-oven-dr-sides`,
          pos: String(posCounter++),
          name: `Боковина ящика под духовкой L=${drDepth} (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: drDepth,
          width: drBoxH,
          count: 2,
          edgeL1: edge04,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-oven-dr-fb`,
          pos: String(posCounter++),
          name: `Стенка ящика внутр. под духовкой (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: Math.max(100, innerW - 2 * t - 26),
          width: drBoxH,
          count: 2,
          edgeL1: edge04,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-oven-dr-hdf`,
          pos: String(posCounter++),
          name: `Дно ящика ХДФ под духовкой (${mod.name})`,
          materialName: hdfMat,
          thickness: 3,
          height: Math.max(100, innerW - 26),
          width: drDepth,
          count: 1,
          isBackHDF: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        addHardware(
          getDrawerHardwareLabel(drDepth),
          1,
          'компл.',
          mod.drawerSlideProductId || scene.materials.defaultDrawerProductId,
          'Системы выдвижения'
        );
        addModuleHandleHardware(1);
      } else if (mod.drawersCount > 0) {
        const drCount = mod.drawersCount;
        const availableFacadeH = modH - 4;
        const singleDrFacadeH = Math.max(90, Math.round((availableFacadeH - (drCount - 1) * 3) / drCount));
        const drDepth = resolveEffectiveDrawerDepth(modD, mod.drawerDepth, 500);
        const drBoxH = Math.max(70, singleDrFacadeH - 45);

        panels.push({
          id: `${mod.id}-dr-facade`,
          pos: String(posCounter++),
          name: `Фасад ящика (${mod.name})`,
          materialName: activeFacadeMat,
          thickness: t,
          height: modW - 4,
          width: singleDrFacadeH,
          count: drCount,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-dr-sides`,
          pos: String(posCounter++),
          name: `Боковина ящика L=${drDepth} (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: drDepth,
          width: drBoxH,
          count: drCount * 2,
          edgeL1: edge04,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-dr-fb`,
          pos: String(posCounter++),
          name: `Стенка ящика внутр. (${mod.name})`,
          materialName: carcassMat,
          thickness: t,
          height: Math.max(100, innerW - 2 * t - 26),
          width: drBoxH,
          count: drCount * 2,
          edgeL1: edge04,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        panels.push({
          id: `${mod.id}-dr-hdf`,
          pos: String(posCounter++),
          name: `Дно ящика ХДФ (${mod.name})`,
          materialName: hdfMat,
          thickness: 3,
          height: Math.max(100, innerW - 26),
          width: drDepth,
          count: drCount,
          isBackHDF: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });

        addHardware(
          getDrawerHardwareLabel(drDepth),
          drCount,
          'компл.',
          mod.drawerSlideProductId || scene.materials.defaultDrawerProductId,
          'Системы выдвижения'
        );
        addModuleHandleHardware(drCount);

        // Inner hidden drawer behind the top facade ("Внутренний ящик за верхним фасадом", default 450mm)
        const hasInner = Boolean(mod.hasInnerDrawer || mod.fillingType === 'drawers_2_inner');
        if (hasInner) {
          const innerDepth = resolveEffectiveDrawerDepth(modD, mod.innerDrawerDepth, 450);
          const innerBoxH = 95;
          panels.push({
            id: `${mod.id}-inner-dr-front`,
            pos: String(posCounter++),
            name: `Фасад внутренний скрытого ящика (${mod.name})`,
            materialName: carcassMat,
            thickness: t,
            height: innerW - 12,
            width: 110,
            count: 1,
            edgeL1: edge20,
            edgeL2: edge04,
            edgeW1: edge04,
            edgeW2: edge04,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          panels.push({
            id: `${mod.id}-inner-dr-sides`,
            pos: String(posCounter++),
            name: `Боковина внутреннего ящика L=${innerDepth} (${mod.name})`,
            materialName: carcassMat,
            thickness: t,
            height: innerDepth,
            width: innerBoxH,
            count: 2,
            edgeL1: edge04,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          panels.push({
            id: `${mod.id}-inner-dr-fb`,
            pos: String(posCounter++),
            name: `Стенка внутреннего ящика (${mod.name})`,
            materialName: carcassMat,
            thickness: t,
            height: Math.max(100, innerW - 2 * t - 26),
            width: innerBoxH,
            count: 2,
            edgeL1: edge04,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          panels.push({
            id: `${mod.id}-inner-dr-hdf`,
            pos: String(posCounter++),
            name: `Дно внутреннего ящика ХДФ (${mod.name})`,
            materialName: hdfMat,
            thickness: 3,
            height: Math.max(100, innerW - 26),
            width: innerDepth,
            count: 1,
            isBackHDF: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          addHardware(
            getDrawerHardwareLabel(innerDepth),
            1,
            'компл.',
            mod.drawerSlideProductId || scene.materials.defaultDrawerProductId,
            'Системы выдвижения'
          );
        }
      } else if (mod.fillingType === 'upper_lift_2' || mod.category === 'anthresole') {
        const liftDoors = mod.fillingType === 'upper_lift_2' ? 2 : 1;
        const baseDoorH = Math.round((modH - 4 - (liftDoors - 1) * 3) / liftDoors);
        panels.push({
          id: `${mod.id}-lift-facade`,
          pos: String(posCounter++),
          name:
            overhangMm > 0
              ? `Фасад откидной со свесом +${overhangMm} мм (${mod.name})`
              : `Фасад откидной (${mod.name})`,
          materialName: activeFacadeMat,
          thickness: t,
          height: modW - 4,
          width: baseDoorH + (liftDoors === 1 ? overhangMm : Math.round(overhangMm / liftDoors)),
          count: liftDoors,
          edgeL1: edge20,
          edgeL2: edge20,
          edgeW1: edge20,
          edgeW2: edge20,
          isFacade: true,
          moduleId: mod.id,
          moduleName: mod.name,
        });
        addHardware(
          mod.liftProductName || 'Подъемник газовый (газлифт) 80N',
          liftDoors * 2,
          'шт.',
          mod.liftProductId,
          'Подъемные механизмы'
        );
        addHardware(
          mod.hingeProductName || scene.materials.defaultHingeProductName,
          liftDoors * 2,
          'шт.',
          mod.hingeProductId || scene.materials.defaultHingeProductId,
          'Петли'
        );
        addModuleHandleHardware(liftDoors);
      } else {
        const isCornerModule =
          mod.fillingType === 'corner_lower' ||
          mod.fillingType === 'upper_corner' ||
          Boolean(mod.isCorner);

        if (mod.fillingType === 'freestanding_dw' || mod.fillingType === 'freestanding_washer') {
          // Freestanding appliances under counter have NO furniture carcass panels and NO facades!
        } else if (isCornerModule) {
          // Straight corner cabinet with recessed carcass blind panel + L-shaped transition filler (default 50mm = 16mm LDSP + 34mm plank)
          const defaultBlind = mod.category === 'upper' ? 350 : (scene.kitchen.isGolaProfile ? 578 : 560);
          const blindZoneW = mod.cornerBlindWidth ?? defaultBlind;
          const fillerW = mod.cornerFillerWidth ?? 50;
          const totalBlindTransitionW = Math.min(modW - 220, blindZoneW + fillerW);
          const doorW = Math.max(150, modW - totalBlindTransitionW - 4);
          const doorH = modH - 4 + overhangMm;

          // 1) Carcass blind wall (глухая стенка ЛДСП в цвет корпуса)
          panels.push({
            id: `${mod.id}-corner-blind`,
            pos: String(posCounter++),
            name: `Стенка глухая углового модуля (${mod.name})`,
            materialName: carcassMat,
            thickness: t,
            height: modH - (mod.category === 'upper' ? 2 * t : t),
            width: Math.max(150, blindZoneW),
            count: 1,
            edgeL1: edge20,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          // 2) Corner transition facade filler strip (e.g. 50mm wide in facade material)
          panels.push({
            id: `${mod.id}-corner-filler`,
            pos: String(posCounter++),
            name: `Переходная планка угловая ${fillerW}мм (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: doorH,
            width: Math.max(20, fillerW),
            count: 1,
            edgeL1: edge20,
            edgeL2: edge20,
            edgeW1: edge20,
            edgeW2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          // 3) Return perpendicular plank (34mm торцевая планка углового перехода)
          const returnPlankW = Math.max(24, fillerW - t);
          panels.push({
            id: `${mod.id}-corner-return-plank`,
            pos: String(posCounter++),
            name: `Планка углового перехода торцевая ${returnPlankW}мм (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: doorH,
            width: returnPlankW,
            count: 1,
            edgeL1: edge20,
            edgeL2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          // 4) Working opening facade door
          panels.push({
            id: `${mod.id}-corner-facade`,
            pos: String(posCounter++),
            name: `Фасад углового модуля (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: doorH,
            width: doorW,
            count: 1,
            edgeL1: edge20,
            edgeL2: edge20,
            edgeW1: edge20,
            edgeW2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          addHardware(
            mod.hingeProductName || scene.materials.defaultHingeProductName,
            2,
            'шт.',
            mod.hingeProductId || scene.materials.defaultHingeProductId,
            'Петли'
          );
          addModuleHandleHardware(1);
        } else if (mod.fillingType === 'tall_fridge') {
          // Built-in Refrigerator Column: 2 or 3 facades (lower freezer 716mm + upper cooling + optional top compartment)
          const fridgeH = Math.min(1820, Math.max(1680, modH - 240));
          const freezerDoorH = 716;
          const coolingDoorH = Math.min(1080, fridgeH - freezerDoorH);
          const topCompartmentH = modH - freezerDoorH - coolingDoorH - 8;

          panels.push({
            id: `${mod.id}-fridge-shelf`,
            pos: String(posCounter++),
            name: `Полка над встроенным холодильником (${mod.name})`,
            materialName: carcassMat,
            thickness: t,
            height: innerW,
            width: modD - 10,
            count: 1,
            edgeL1: edge20,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          panels.push({
            id: `${mod.id}-fridge-lower-door`,
            pos: String(posCounter++),
            name: `Фасад морозильной камеры (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: freezerDoorH,
            width: modW - 4,
            count: 1,
            edgeL1: edge20,
            edgeL2: edge20,
            edgeW1: edge20,
            edgeW2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          panels.push({
            id: `${mod.id}-fridge-upper-door`,
            pos: String(posCounter++),
            name: `Фасад холодильной камеры (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: coolingDoorH,
            width: modW - 4,
            count: 1,
            edgeL1: edge20,
            edgeL2: edge20,
            edgeW1: edge20,
            edgeW2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });

          let totalFridgeDoors = 2;
          if (topCompartmentH > 180) {
            totalFridgeDoors = 3;
            panels.push({
              id: `${mod.id}-fridge-top-door`,
              pos: String(posCounter++),
              name: `Фасад верхнего отсека над холодильником (${mod.name})`,
              materialName: activeFacadeMat,
              thickness: t,
              height: topCompartmentH,
              width: modW - 4,
              count: 1,
              edgeL1: edge20,
              edgeL2: edge20,
              edgeW1: edge20,
              edgeW2: edge20,
              isFacade: true,
              moduleId: mod.id,
              moduleName: mod.name,
            });
          }

          addHardware(
            mod.hingeProductName || scene.materials.defaultHingeProductName,
            totalFridgeDoors * 2 + 1,
            'шт.',
            mod.hingeProductId || scene.materials.defaultHingeProductId,
            'Петли'
          );
          addModuleHandleHardware(totalFridgeDoors);
        } else {
          const doorsCount =
            mod.fillingType === 'doors_2' ||
            mod.fillingType === 'upper_doors_2' ||
            mod.fillingType === 'upper_dryer' ||
            mod.fillingType === 'upper_hood' ||
            mod.width >= 600
              ? 2
              : 1;
          const doorW = Math.round((modW - 4 - (doorsCount - 1) * 3) / doorsCount);
          const doorH =
            mod.fillingType === 'tall_oven_micro'
              ? Math.round((modH - 1050) / 2)
              : modH - 4 + overhangMm;
          const totalFacadePanels = mod.fillingType === 'tall_oven_micro' ? 2 : doorsCount;
          panels.push({
            id: `${mod.id}-facade`,
            pos: String(posCounter++),
            name:
              overhangMm > 0
                ? `Фасад со свесом +${overhangMm} мм (${mod.name})`
                : `Фасад (${mod.name})`,
            materialName: activeFacadeMat,
            thickness: t,
            height: doorH,
            width: mod.fillingType === 'tall_oven_micro' ? modW - 4 : doorW,
            count: totalFacadePanels,
            edgeL1: edge20,
            edgeL2: edge20,
            edgeW1: edge20,
            edgeW2: edge20,
            isFacade: true,
            moduleId: mod.id,
            moduleName: mod.name,
          });
          const hingesPerDoor = doorH > 1400 ? 3 : 2;
          addHardware(
            mod.hingeProductName || scene.materials.defaultHingeProductName,
            totalFacadePanels * hingesPerDoor,
            'шт.',
            mod.hingeProductId || scene.materials.defaultHingeProductId,
            'Петли'
          );
          addModuleHandleHardware(totalFacadePanels);
        }
      }

      if (mod.hasDishDryer) {
        addHardware(
          mod.dryerProductName || `Посудосушитель 2-уровневый в базу ${modW} мм`,
          1,
          'компл.',
          mod.dryerProductId,
          'Посудосушители'
        );
      }
      if (mod.hasSink || mod.fillingType === 'sink' || mod.hasDripTray) {
        addHardware(
          mod.sinkProductName || 'Мойка кухонная врезная с глубокой чашей и сифоном',
          1,
          'шт.',
          mod.sinkProductId,
          'Мойки и аксессуары'
        );
        addHardware(
          DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS.defaultSinkDripTrayName,
          1,
          'шт.',
          undefined,
          'Аксессуары и защита'
        );
      }
      if (mod.hasOven || mod.hasThermalStrips || mod.fillingType === 'oven_cooktop' || mod.fillingType.startsWith('tall_oven')) {
        addHardware(
          DEFAULT_CONSTRUCTOR_COMPANY_SETTINGS.defaultOvenThermalStripsName,
          1,
          'компл.',
          undefined,
          'Аксессуары и защита'
        );
      }
      if (mod.fillingType === 'bottle_rack') {
        addHardware(
          `Корзина выдвижная (бутылочница) в базу ${modW} мм с доводчиком`,
          1,
          'шт.',
          undefined,
          'Системы выдвижения'
        );
      }
    });

    // Backsplash & LED Lighting calculation
    if (scene.kitchen.hasBacksplash) {
      const isTile = scene.kitchen.backsplashType === 'customer_tile';
      if (!isTile) {
        const panelH = scene.kitchen.backsplashHeight || 600;
        const totalLengthMm = k.modules.reduce((acc, m) => acc + m.width, 0);
        panels.push({
          id: 'backsplash-panel',
          pos: String(posCounter++),
          name: `Стеновая панель Фартук (H=${panelH} мм)`,
          materialName: scene.materials.backsplashMaterialName || 'Стеновая панель МДФ Альбико',
          thickness: 4,
          height: panelH,
          width: totalLengthMm > 0 ? totalLengthMm : 3000,
          count: 1,
          edgeL1: edge04,
          isBacksplash: true,
          moduleName: 'Фартук',
        });
      }
      if (scene.kitchen.hasLedLighting) {
        const upperModules = k.modules.filter((m) => m.category === 'upper');
        const upperLengthMm = upperModules.reduce((sum, m) => sum + m.width, 0);
        const upperMeters = Math.max(1, upperLengthMm / 1000);
        const rolls5m = Math.ceil(upperMeters / 5);
        const profiles2m = Math.ceil(upperMeters / 2);
        const powerPoints = scene.kitchen.ledPowerPointsCount || 1;
        const profLabel =
          scene.kitchen.ledProfileType === 'corner'
            ? 'угловой'
            : scene.kitchen.ledProfileType === 'recessed'
            ? 'врезной'
            : 'накладной';
        const switchLabel =
          scene.kitchen.ledSwitchType === 'mechanical_customer'
            ? 'Механическая кнопка на Фартуке (Кнопка заказчика)'
            : 'Сенсорный выключатель';

        addHardware(`Светодиодная лента 12V/24V (упаковка 5м)`, rolls5m, 'упак.', undefined, 'Подсветка');
        addHardware(`Профиль алюминиевый с рассеивателем 2м (${profLabel})`, profiles2m, 'хлыст', undefined, 'Подсветка');
        addHardware(`Блок питания для светодиодной ленты`, powerPoints, 'шт.', undefined, 'Подсветка');
        addHardware(`Выключатель подсветки: ${switchLabel}`, powerPoints, 'шт.', undefined, 'Подсветка');
      }
    }

    // Multi-wall Worktop & Corner Joint calculation
    if (k.hasUnifiedWorktop) {
      const wtCutting = computeKitchenWorktopCut(scene);
      wtCutting.segments.forEach((seg) => {
        panels.push({
          id: seg.id,
          pos: String(posCounter++),
          name: seg.label,
          materialName: scene.materials.worktopMaterialName,
          thickness: scene.materials.worktopThickness || 38,
          height: seg.cutLengthMm,
          width: seg.depthMm,
          count: 1,
          edgeL1: edge20,
          notes:
            seg.eurojointExtraMm > 0
              ? `Вкл. запас +${seg.eurojointExtraMm} мм под еврозапил (чистый размер ${seg.netLengthMm} мм)`
              : undefined,
          isWorktop: true,
          moduleName: 'Столешница',
        });
      });

      if (wtCutting.segments.length > 0) {
        addHardware(
          `${scene.materials.worktopMaterialName} (полотно ${wtCutting.stockLengthMm}×600 мм)`,
          wtCutting.slabsRequired,
          'шт.',
          scene.materials.worktopProductId,
          'Столешницы и стеновые'
        );
      }

      if (wtCutting.cornerJointsCount > 0) {
        if (wtCutting.cornerJointType === 'eurojoint') {
          addHardware(
            'Комплект стяжек + герметик для еврозапила столешницы',
            wtCutting.cornerJointsCount,
            'компл.',
            undefined,
            'Комплектующие для столешниц'
          );
        } else {
          addHardware(
            'Планка для столешницы угловая (соединительная) 600 мм',
            wtCutting.cornerJointsCount,
            'шт.',
            undefined,
            'Комплектующие для столешниц'
          );
        }
      }
    }
  }

  let totalAreaM2 = 0;
  let facadeAreaM2 = 0;
  panels.forEach((p) => {
    const area = (p.width / 1000) * (p.height / 1000) * (p.count || 1);
    totalAreaM2 += area;
    if (p.isFacade) {
      facadeAreaM2 += area;
    }
  });

  return {
    panels,
    hardware: Array.from(hardwareMap.values()),
    totalAreaM2: Number(totalAreaM2.toFixed(2)),
    facadeAreaM2: Number(facadeAreaM2.toFixed(2)),
  };
}

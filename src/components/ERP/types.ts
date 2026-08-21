export type ERPSection =
  | 'dashboard'
  | 'planning'
  | 'schedule'
  | 'production'
  | 'archive'
  | 'reports'
  | 'salaries'
  | 'employees'
  | 'residuals'
  | 'settings';

export interface MaterialResidual {
  id: string;
  orderId?: string;
  orderNumber?: string;
  type: 'offcut' | 'edge'; // 'offcut' = обрезок плиты (ЛДСП/МДФ/ХДФ), 'edge' = остаток кромки
  category: 'ЛДСП' | 'МДФ' | 'ХДФ' | 'Кромка' | 'Пластик' | 'Постформинг' | 'Другое' | string;
  materialName: string;   // e.g. "ЛДСП 16мм Дуб Сонома", "Кромка ПВХ 2/19 Белый"
  thicknessMm?: number;   // мм
  lengthMm?: number;      // мм (для обрезка плиты)
  widthMm?: number;       // мм (для обрезка плиты)
  areaM2?: number;        // м² (для обрезка плиты)
  lengthMeters?: number;  // м (для остатка кромки)
  quantity: number;       // штук / бобин
  addedAt: string;        // ISO / YYYY-MM-DD HH:mm
  addedByEmployeeName?: string;
  notes?: string;
  storageCell?: string;   // Ячейка/место хранения (e.g. "Стеллаж А-1")
  status: 'available' | 'used' | 'disposed'; // 'available' (В наличии), 'used' (Использован), 'disposed' (Утилизирован)
  disposedAt?: string;
  disposedByEmployeeName?: string;
}

export type ProductionStageId =
  | 'queue'
  | 'cutting'
  | 'edging'
  | 'cnc'
  | 'facades'
  | 'assembly'
  | 'kitting'
  | 'qc'
  | 'packing'
  | 'shipping'
  | 'ready';

export interface ProductionStage {
  id: ProductionStageId;
  name: string;
  shortName: string;
  color: string;
  iconName: string;
  department: string;
}

export interface ERPNoteRule {
  id: string;
  pattern: string;       // Например "4-8-36" или "паз"
  instruction: string;   // Например "Данной детали требуется паз, см. чертеж"
  color?: string;        // 'amber' | 'blue' | 'purple' | 'emerald' | 'rose'
}

export interface AdditionalWorks {
  countertopCutting?: boolean; // Распил столешницы
  countertopEdging?: boolean;  // Кромление столешницы
  countertopRadius?: boolean;  // Радиус столешницы
  countertopNotes?: string;

  wallPanelCutting?: boolean;  // Распил стеновой панели
  wallPanelEdging?: boolean;   // Кромление стеновой панели
  wallPanelNotes?: string;

  barCutting?: boolean;        // Нарезка штанги (труба)
  barCount?: number;
  barNotes?: string;

  plinthCutting?: boolean;     // Нарезка цоколя
  plinthLength?: number;
  plinthNotes?: string;
}

export interface EmployeeWorkLog {
  id: string;
  orderId: string;
  orderNumber: string;
  employeeId: string;
  employeeName: string;
  stageId: ProductionStageId;
  startTime: string;
  endTime?: string;
  scannedPartsCount: number;
  scannedAreaM2: number;
  scannedEdgeM?: number;
  status: 'in_progress' | 'paused' | 'completed';
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  salonName?: string;
  projectName: string;
  createdAt: string;
  deadlineDate: string;
  plannedStartDate?: string;
  plannedCuttingDate?: string; // Выбранный день распила YYYY-MM-DD
  isReadyForProduction?: boolean; // Отметка "Готов к началу" в планировании
  currentStage: ProductionStageId;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  totalAreaM2: number;
  totalEdgeM: number;
  partsCount: number;
  facadesCount: number;
  status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'shipped';
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  materialsNote?: string;
  comments?: string;
  priceTotal?: number;
  costTotal?: number;
  bitrixDealId?: string;
  bitrixStageId?: string;
  bitrixStageName?: string;
  bitrixUrl?: string;
  projectId?: string;
  activeWorkers?: any[];
  
  // Дополнительные работы (столешница, стеновая, штанга, цоколь)
  additionalWorks?: AdditionalWorks;

  // Журнал выработки сотрудников (сессии работы для отчетов)
  workLogs?: EmployeeWorkLog[];

  // Specification / Birka Data attached to order
  birkaData?: {
    fileName: string;
    fileHash?: string;
    uploadedAt?: string;
    details: Array<{
      id: string;
      labelNumber: string; // № детали / Позиция
      orderNumber?: string;
      name: string;
      length: number;
      width: number;
      thickness: number;
      material: string;
      quantity: number;
      edgeL1?: string;
      edgeL2?: string;
      edgeW1?: string;
      edgeW2?: string;
      notes?: string;
      barcode?: string;
    }>;
    materialGroups?: Array<{
      materialName: string;
      totalQuantity: number;
      totalAreaM2: number;
      estimatedSheets?: number;
      edgesSummary: Record<string, number>;
    }>;
    allEdges?: Array<{ name: string; totalMeters: number; count: number }>;
  };

  // Hardware / Kitting Specification Data attached to order (Комплектовочная ведомость)
  hardwareData?: {
    fileName: string;
    fileHash?: string;
    uploadedAt?: string;
    items: OrderHardwareItem[];
    totalItemsCount: number;
    totalQuantity: number;
    categoriesSummary?: Array<{ category: string; count: number; totalQuantity: number }>;
  };

  // Assembly File Data attached to order (Файл Сборка)
  assemblyFileData?: {
    fileName: string;
    fileSize?: number;
    uploadedAt?: string;
    uploadedBy?: string;
    fileContent?: string;
    notes?: string;
  };

  // Scanning progress per stage and material:
  // { [stageId]: { [materialName]: { scannedPartIds: string[], isCompleted?: boolean } } }
  stageScanningProgress?: Record<string, Record<string, { scannedPartIds: string[]; isCompleted?: boolean }>>;

  // Packages formed in Packaging (Упаковка) & Kitting (Комплектация)
  packages?: OrderPackage[];

  // Shipping details
  shippedAt?: string;
  shippedByEmployeeId?: string;
  shippedByEmployeeName?: string;
  driverInfo?: DriverInfo;

  // Delivery & Client Data (masked for regular workers, visible to head/master)
  deliveryData?: {
    address?: string;
    clientName?: string;
    clientPhone?: string;
    floor?: string;
    hasElevator?: boolean | string;
    deliveryPrice?: number;
    comment?: string;
    assemblyPrice?: number;
  };

  // Assembly Data
  assemblyData?: {
    assemblerEmployeeId?: string;
    assemblerName?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    notes?: string;
    assemblyPrice?: number;
  };

  stageProgress: {
    [key in ProductionStageId]?: {
      status: 'pending' | 'in_progress' | 'done';
      completedAt?: string;
      completedBy?: string;
      notes?: string;
      durationMinutes?: number;
    };
  };
}

export interface OrderHardwareItem {
  id: string;
  article?: string;           // Артикул / Код фурнитуры (e.g. "71B3550", "Blum 110°")
  name: string;              // Наименование (e.g. "Петля CLIP top BLUMOTION 110°")
  quantity: number;          // Общее количество по ведомости (e.g. 16)
  unit?: string;             // Единица измерения (шт, компл, п.м., уп)
  category?: string;         // Категория (Петли, Направляющие, Крепеж, Ручки, Опоры, Профиль, Подсветка, Разное)
  packedQuantity: number;    // Уже упакованное количество по сформированным коробкам
  notes?: string;            // Примечание (например, "для верхних шкафов", "с доводчиком")
}

export interface OrderPackageHardwareItem {
  hardwareId?: string;
  article?: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
}

export interface OrderPackagePart {
  detailId: string;
  labelNumber: string;
  name: string;
  material?: string;
  length?: number;
  width?: number;
  thickness?: number;
  quantity?: number;
}

export interface OrderPackage {
  id: string;
  orderId: string;
  orderNumber: string;
  packageNumber: number; // 1, 2, 3...
  name: string;          // e.g. "Место 1 (Корпус низ)", "Место 2 (Фурнитура Blum)"
  type: 'details' | 'kitting' | 'custom';
  code: string;          // Unique QR barcode code, e.g. "PKG-ORD123-M1-889"
  parts: OrderPackagePart[];
  hardwareItems?: OrderPackageHardwareItem[]; // Вложенная фурнитура и комплектующие в это место
  customItemsNote?: string; // Для участка комплектовки: текстовый перечень комплектующих/фурнитуры
  createdAt: string;     // ISO timestamp
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  isCompleted: boolean;
  isShipped?: boolean;
  shippedAt?: string;
  shippedByEmployeeName?: string;
}

export interface DriverInfo {
  driverName?: string;
  carPlate?: string;
  phone?: string;
  note?: string;
}

export interface PackageLabelSettings {
  widthMm: number;               // Default 120
  heightMm: number;              // Default 75
  preset?: '120x75' | '100x60' | '100x70' | '75x120' | '58x40' | '58x60' | 'custom';
  showDetailsList?: boolean;     // Печатать список деталей
  showEmployeeName?: boolean;    // Печатать ФИО упаковщика
  showDateTime?: boolean;        // Печатать дату и время
  showOrderQr?: boolean;         // Печатать QR-код места
  fontSizeScale?: number;        // Масштаб шрифта 80%-120%
}

export interface ERPEmployee {
  id: string;
  userId?: string;
  name: string;
  role: string;
  productionRole?: string;
  isProductionEmployee?: boolean;
  employmentType?: 'staff' | 'outsource'; // 'Работник компании' или 'Аутсорс'
  department: 'cutting' | 'edging' | 'cnc' | 'facades' | 'assembly' | 'qc' | 'management' | 'packing' | 'warehouse' | string;
  phone?: string;
  email?: string;
  password?: string;
  tempPassword?: string;
  carPlate?: string; // Госномер автомобиля для водителей
  carModel?: string; // Марка / модель ТС
  rateType: 'hourly' | 'piecework' | 'salary' | 'mixed';
  baseRate: number; // руб в час или базовая ставка
  pieceworkRates?: {
    cuttingPerM2?: number;
    edgingPerM?: number;
    cncPerOperation?: number;
    assemblyPerModule?: number;
  };
  shiftType: '2/2' | '5/2' | 'flexible' | 'night' | string;
  status: 'active' | 'vacation' | 'sick' | 'inactive';
  avatarUrl?: string;
  assignedMachines?: string[];
  hireDate?: string;
  isOwner?: boolean;
  badgeCode?: string; // Персональный токен QR-бейджа для быстрого входа
  badgeIssuedAt?: string;
  bitrixUserId?: string; // ID пользователя в Битрикс24
}

export type ShiftCellType = 'work_12' | 'work_8' | 'night_12' | 'day_off' | 'vacation' | 'sick';

export interface EmployeeScheduleEntry {
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: ShiftCellType;
  hours: number;
  note?: string;
}

export interface WorkShift {
  id: string;
  date: string; // YYYY-MM-DD
  department: string;
  shiftName: 'Дневная смена' | 'Ночная смена' | 'Смена 1' | 'Смена 2' | string;
  masterEmployeeId: string;
  masterEmployeeName: string;
  employeeIds: string[];
  plannedHours: number;
  actualOutputM2?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  notes?: string;
}

export interface MachineEquipment {
  id: string;
  department: string; // cutting, edging, cnc, etc.
  name: string; // e.g., "Altendorf F45"
  status: 'working' | 'maintenance' | 'idle' | 'broken';
  model?: string;
  type?: 'cutting' | 'edging' | 'cnc' | 'pressing' | 'painting' | 'other' | string;
  productivityPerHour?: string;
  assignedEmployees?: string[];
  lastServiceDate?: string;
  nextServiceDate?: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // YYYY-MM
  baseAmount: number;
  pieceworkAmount: number;
  bonusAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  status: 'draft' | 'approved' | 'paid';
  paidDate?: string;
  completedJobsCount: number;
  totalHours: number;
}

export interface ERPCompanySettings {
  erpEnabled: boolean;
  workDayStart: string;
  workDayEnd: string;
  defaultShiftDurationHours: number;
  departments: { id: string; name: string; headName?: string }[];
  enabledStages?: ProductionStageId[];
  cuttingRatePerM2: number;
  edgingRatePerM: number;
  cncHoleRate: number;
  assemblyModuleRate: number;
  qcRatePerOrder: number;
  autoScheduleOrders: boolean;
  notificationTelegramEnabled?: boolean;
  noteRules?: ERPNoteRule[];
  showAdditionalWorksOnUpload?: boolean; // Показывать блок доп. работ при подгрузке бирок
  
  // Плановые объемы выработки (для отчетов и аналитики)
  targetMonthlyM2?: number;          // Плановая выработка ЛДСП м²/мес
  targetMonthlyEdgeM?: number;      // Плановая кромкооблицовка п.м./мес
  targetMonthlyParts?: number;      // Плановое количество деталей шт./мес
  equipmentList?: MachineEquipment[]; // Оборудование участков
  birkaColumnMapping?: Record<string, string[]>; // Кастомный маппинг столбцов файла бирок
  birkaEncodingPreference?: 'auto' | 'windows-1251' | 'utf-8' | 'cp866';
  birkaQrFormatTemplate?: string; // Шаблон кодирования QR-кодов на бирках ({orderNumber}-{pos}, {orderNumber}_{pos}, {pos}, и т.д.)
  hardwareColumnMapping?: Record<string, string[]>; // Кастомный маппинг столбцов ведомости фурнитуры (наименование, артикул, количество, ед. изм., категория, примечания)
  packageLabelSettings?: PackageLabelSettings; // Настройки размера и формата этикеток упаковок (по умолч. 120x75 мм)
  
  // Адресное хранение ячеек склада для фурнитуры
  warehouseLocations?: Record<string, string>; // { [itemArticleOrNameLower]: "A-12" }
  warehouseItemsCatalog?: Array<{ id: string; name: string; article?: string; category?: string; storageCell: string; updatedAt?: string }>;

  // Настройки уведомлений и ассистента сканирования
  finishedPartNoticeDuration?: number; // Время автоскрытия сообщения "Готовая деталь" в секундах

  // Сопоставление стадий ERP и Битрикс24
  bitrix24StageMapping?: Record<string, string>;
  bitrix24RestoreAction?: 'do_nothing' | 'restore_to_stage';
  bitrix24RestoreStageId?: string;
  bitrix24TaskClosureEnabled?: boolean;

  // Идентификаторы пользовательских полей Битрикс24 (доставка, сборка, клиент)
  bitrix24FieldMapping?: {
    deliveryAddressField?: string;  // e.g. "UF_CRM_DELIVERY_ADDRESS"
    clientNameField?: string;       // e.g. "UF_CRM_CLIENT_NAME"
    clientPhoneField?: string;      // e.g. "UF_CRM_CLIENT_PHONE"
    floorField?: string;            // e.g. "UF_CRM_FLOOR"
    elevatorField?: string;         // e.g. "UF_CRM_ELEVATOR"
    deliveryPriceField?: string;    // e.g. "UF_CRM_DELIVERY_PRICE"
    deliveryCommentField?: string;  // e.g. "UF_CRM_DELIVERY_COMMENT"
    assemblyPriceField?: string;    // e.g. "UF_CRM_ASSEMBLY_PRICE"
  };

  // Шаблон Акта приема-передачи и ТТН на А4
  shippingActTemplate?: {
    companyTitle?: string;
    companyInn?: string;
    companyPhone?: string;
    actHeaderTitle?: string;
    actTextIntro?: string;
    actTermsText?: string;
    customFooterNotes?: string;
    showQrForAssembler?: boolean;
  };
}

export interface SalaryAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'bonus' | 'penalty'; // 'bonus' (Премия) or 'penalty' (Штраф)
  amount: number;
  reason: string; // Примечание (за что)
  date: string; // YYYY-MM-DD
  createdBy?: string;
}

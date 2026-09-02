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
  type: 'offcut' | 'edge' | 'countertop' | 'wall_panel' | 'plinth' | 'light_profile' | 'gola_profile'; 
  // 'offcut' = Обрезок плиты, 'edge' = Кромка, 'countertop' = Столешница, 'wall_panel' = Стеновая панель, 'plinth' = Цоколь, 'light_profile' = Профиль подсветки, 'gola_profile' = Профиль GOLA
  category: 'ЛДСП' | 'МДФ' | 'ХДФ' | 'Кромка' | 'Столешница' | 'Стеновая панель' | 'Цоколь' | 'Профиль подсветки' | 'Профиль GOLA' | 'Пластик' | 'Постформинг' | 'Другое' | string;
  materialName: string;   // e.g. "ЛДСП 16мм Дуб Сонома", "Столешница Кедр: Дуб Вотан", "Цоколь ПВХ Черный"
  brand?: string;         // Бренд (для Столешниц, Стеновых панелей, Кромки: Кедр, Slotex, Egger, Скиф, Forma&Style, Kronospan, Rehau и др.)
  decor?: string;         // Декор (вводится вручную)
  color?: string;         // Цвет (для Цоколей, Профилей подсветки, Профилей GOLA)
  plinthType?: 'ПВХ' | 'Металл' | 'МДФ' | 'ЛДСП' | string; // Тип цоколя: ПВХ, Металл, МДФ, ЛДСП
  plinthHeightMm?: number; // Высота цоколя в мм (100, 150, 120, 60 и др.)
  lightProfileType?: 'Врезной' | 'Накладной' | 'Угловой' | 'Скрытый / Теневой' | 'Подвесной' | string; // Тип профиля подсветки
  golaType?: 'L' | 'C' | 'Оконечный' | 'Срединный' | string; // Тип профиля GOLA
  thicknessMm?: number;   // мм
  lengthMm?: number;      // мм (для обрезка плиты, столешницы, стеновой, цоколя, профилей)
  widthMm?: number;       // мм (для обрезка плиты, столешницы, стеновой)
  heightMm?: number;      // мм (высота цоколя / профиля)
  areaM2?: number;        // м² (для обрезка плиты)
  lengthMeters?: number;  // м (для остатка кромки, цоколя, профилей)
  quantity: number;       // штук / бобин / хлыстов
  addedAt: string;        // ISO / YYYY-MM-DD HH:mm
  addedByEmployeeName?: string;
  notes?: string;
  storageCell?: string;   // Ячейка/место хранения (e.g. "Стеллаж А-1", "Стойка профилей №2")
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

export interface OrderDefectItem {
  id: string;
  orderId: string;
  orderNumber: string;
  detailId?: string;
  detailName: string;
  labelNumber?: string;
  material?: string;
  reason: string;
  reportedByEmployeeName?: string;
  reportedAt: string;
  targetStage: ProductionStageId;
  notes?: string;
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
  stagePlannedDates?: Record<string, string>; // Плановые даты по участкам { [stageId]: "YYYY-MM-DD" }
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
  
  // Поля задачи брака
  isDefectReworkOrder?: boolean;
  parentOrderId?: string;
  parentOrderNumber?: string;
  defectItems?: OrderDefectItem[];
  
  // Корзина / Soft delete (хранится 30 дней, потом безвозвратно удаляется)
  isDeleted?: boolean;
  deletedAt?: string; // ISO string даты помещения в корзину
  deletedByEmployeeName?: string;
  deleteReason?: string;
  
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
      holesEnd?: number;   // Количество отверстий в торец
      holesFace?: number;  // Количество отверстий в пласть
      holesCount?: number; // Общее количество отверстий
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

  // Records of stages that were force-completed without scanning all parts
  // { [stageId]: { forcedByEmployeeName: string; forcedByEmployeeId?: string; forcedAt: string; unscannedPartIds: string[]; reason?: string } }
  forcedStageCompletions?: Record<string, {
    forcedByEmployeeName: string;
    forcedByEmployeeId?: string;
    forcedAt: string;
    unscannedPartIds: string[];
    reason?: string;
  }>;

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
  autoPrintOnCloseBox?: boolean; // Автоматически отправлять на печать при закрытии коробки
  autoCloseModalAfterPrint?: boolean; // Закрывать окно печати после отправки задания
  printerName?: string;          // Название термопринтера (например 'Термопринтер 120x75')
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
  companyTitle?: string;
  erpEnabled: boolean;
  executionMode?: 'classic' | 'live_item_planning'; // Режим работы: 'classic' (конвейер) или 'live_item_planning' (интерактивный календарь с поштучным live-сканированием)
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
  packingRatePerOrder?: number;
  kittingRatePerOrder?: number;
  shippingRatePerFact?: number;
  facadesRatePerM2?: number;
  salariesSectionEnabled?: boolean;
  seeOnlyOwnSalary?: boolean;
  
  // Права доступа к разделам (RBAC)
  dashboardAccessMode?: 'all' | 'none' | 'custom'; // Доступ к дашборду ('all' - всем, 'none' - только нач. цеха, 'custom' - выбранным)
  dashboardAllowedEmployeeIds?: string[]; // Список разрешенных сотрудников при режиме 'custom'

  planningSectionEnabled?: boolean; // Доступ к планированию
  planningAllowedEmployeeIds?: string[]; // Индивидуальный список сотрудников с доступом к планированию

  scheduleSectionEnabled?: boolean; // Доступ к графику работы
  scheduleShowOtherEmployees?: boolean; // Показывать других сотрудников в графике
  scheduleCanSelfEdit?: boolean; // Разрешить сотрудникам самостоятельно проставлять себе смены

  residualsSectionEnabled?: boolean; // Доступ к разделу Склад остатков (деловые обрезки и кромка)
  archiveSectionEnabled?: boolean; // Доступ к разделу Архив заказов
  reportsSectionEnabled?: boolean; // Доступ к разделу Аналитика и отчеты
  reportsViewScope?: 'all' | 'own_only'; // Объем аналитики: все производство или только за себя
  employeesSectionEnabled?: boolean; // Доступ к разделу Сотрудники
  settingsSectionEnabled?: boolean; // Доступ к настройкам для обычных сотрудников

  autoScheduleOrders: boolean;
  notificationTelegramEnabled?: boolean;
  noteRules?: ERPNoteRule[];
  showAdditionalWorksOnUpload?: boolean; // Показывать блок доп. работ при подгрузке бирок
  
  // Плановые объемы выработки (для отчетов и аналитики)
  targetMonthlyM2?: number;          // Плановая выработка ЛДСП м²/мес
  targetMonthlyEdgeM?: number;      // Плановая кромкооблицовка п.м./мес
  targetMonthlyParts?: number;      // Плановое количество деталей шт./мес
  
  // Дневная пропускная способность оборудования и участков (лимиты на смену)
  stageDailyCapacities?: Partial<Record<ProductionStageId, {
    enabled: boolean;
    dailyLimitM2?: number;          // Лимит м²/смену (Распил, Упаковка, Фасады)
    dailyLimitSheets?: number;      // Лимит листов/смену (Распил)
    dailyLimitEdgeM?: number;       // Лимит п.м. кромки/смену (Кромка)
    dailyLimitHoles?: number;       // Лимит отверстий/смену (Присадка)
    dailyLimitParts?: number;       // Лимит деталей/смену (Присадка, Упаковка)
    dailyLimitOrders?: number;      // Лимит заказов/смену (Комплектовка, Сборка)
    dailyLimitItems?: number;       // Лимит позиций фурнитуры/смену (Комплектовка)
    dailyLimitModules?: number;     // Лимит модулей/смену (Сборка)
    warnOnOverload?: boolean;       // Предупреждать о рисках невыполнения при планировании
  }>>;
  warnStageCapacityOverloadInPlanning?: boolean; // Глобальный флаг предупреждений о перегрузке в планировании

  equipmentList?: MachineEquipment[]; // Оборудование участков
  useNestingPrisadkaOnCutting?: boolean; // Флаг: Использовать нестинг присадку в пласть на этапе распила (true = детали с 0 торцевых отв. не попадают на присадку)
  filterPrisadkaParts?: boolean; // Флаг: Фильтровать детали на участке присадки (true = отображать только детали с отверстиями, false = отображать все детали заказа)
  birkaColumnMapping?: Record<string, string[]>; // Кастомный маппинг столбцов файла бирок
  birkaEncodingPreference?: 'auto' | 'windows-1251' | 'utf-8' | 'cp866';
  birkaQrFormatTemplate?: string; // Шаблон кодирования QR-кодов на бирках ({orderNumber}-{pos}, {orderNumber}_{pos}, {pos}, и т.д.)
  birkaQrMatchingMode?: 'template' | 'smart_contains'; // Режим сопоставления деталей при сканировании (шаблон или умный поиск по вхождению)
  hardwareColumnMapping?: Record<string, string[]>; // Кастомный маппинг столбцов ведомости фурнитуры (наименование, артикул, количество, ед. изм., категория, примечания)
  packageLabelSettings?: PackageLabelSettings; // Настройки размера и формата этикеток упаковок (по умолч. 120x75 мм)
  
  // Адресное хранение ячеек склада для фурнитуры
  warehouseLocations?: Record<string, string>; // { [itemArticleOrNameLower]: "A-12" }
  warehouseItemsCatalog?: Array<{ id: string; name: string; article?: string; category?: string; storageCell: string; updatedAt?: string }>;

  // Настройки уведомлений и ассистента сканирования
  finishedPartNoticeEnabled?: boolean; // Включен/выключен вывод и озвучка сообщения "Готовая деталь"
  finishedPartNoticeDuration?: number; // Время автоскрытия сообщения "Готовая деталь" в секундах

  // Настройки брака
  defectReasons?: string[]; // Список причин брака (например: Скол при распиле, Ошибка присадки, Царапина, Не тот декор)

  // Настройки загрузки и фильтрации фурнитуры
  hardwareExcludeKeywords?: string[]; // Исключать из ведомости фурнитуры ключевые слова (ЛДСП, ДСП, МДФ, ХДФ, Кромка, ПВХ и т.д.)
  requiredKittingDocuments?: Array<{ id: string; name: string; enabled: boolean }>; // Обязательные документы для укладки в коробки (Чертежи, Акт приема-передачи)

  // QR-Команды управления цехом
  qrCommands?: Array<{ id: string; commandKey: string; name: string; description?: string; createdAt?: string }>;

  // Сопоставление стадий ERP и Битрикс24
  bitrix24WebhookUrl?: string;
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

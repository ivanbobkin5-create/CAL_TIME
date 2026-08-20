export type ERPSection =
  | 'dashboard'
  | 'planning'
  | 'schedule'
  | 'production'
  | 'reports'
  | 'salaries'
  | 'employees'
  | 'settings';

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

  // Scanning progress per stage and material:
  // { [stageId]: { [materialName]: { scannedPartIds: string[], isCompleted?: boolean } } }
  stageScanningProgress?: Record<string, Record<string, { scannedPartIds: string[]; isCompleted?: boolean }>>;

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

export interface ERPEmployee {
  id: string;
  userId?: string;
  name: string;
  role: string;
  productionRole?: string;
  isProductionEmployee?: boolean;
  department: 'cutting' | 'edging' | 'cnc' | 'facades' | 'assembly' | 'qc' | 'management' | 'packing' | 'warehouse' | string;
  phone?: string;
  email?: string;
  password?: string;
  tempPassword?: string;
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
}

export interface WorkShift {
  id: string;
  date: string; // YYYY-MM-DD
  department: string;
  shiftName: 'Дневная смена' | 'Ночная смена' | 'Смена 1' | 'Смена 2';
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
  name: string;
  model: string;
  type: 'cutting' | 'edging' | 'cnc' | 'pressing' | 'painting' | 'other';
  department: string;
  status: 'working' | 'maintenance' | 'idle' | 'broken';
  productivityPerHour: string;
  assignedEmployees: string[];
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

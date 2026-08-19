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

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  salonName?: string;
  projectName: string;
  createdAt: string;
  deadlineDate: string;
  plannedStartDate?: string;
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
  name: string;
  role: string;
  department: 'cutting' | 'edging' | 'cnc' | 'facades' | 'assembly' | 'qc' | 'management';
  phone?: string;
  email?: string;
  rateType: 'hourly' | 'piecework' | 'salary' | 'mixed';
  baseRate: number; // руб в час или базовая ставка
  pieceworkRates?: {
    cuttingPerM2?: number;
    edgingPerM?: number;
    cncPerOperation?: number;
    assemblyPerModule?: number;
  };
  shiftType: '2/2' | '5/2' | 'flexible' | 'night';
  status: 'active' | 'vacation' | 'sick' | 'inactive';
  avatarUrl?: string;
  assignedMachines?: string[];
  hireDate?: string;
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
  cuttingRatePerM2: number;
  edgingRatePerM: number;
  cncHoleRate: number;
  assemblyModuleRate: number;
  qcRatePerOrder: number;
  autoScheduleOrders: boolean;
  notificationTelegramEnabled?: boolean;
}

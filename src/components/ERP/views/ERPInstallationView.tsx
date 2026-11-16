import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  ExternalLink,
  Package,
  Trash2,
  Edit3,
  X,
  ShieldAlert,
  RefreshCw,
  LayoutGrid,
  List,
  UserPlus,
  UserCheck,
  FileText,
  Eye,
  Check,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw,
  Image as ImageIcon,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { 
  InstallationTask, 
  ERPEmployee, 
  ProductionOrder, 
  ERPCompanySettings, 
  SalaryAdjustment 
} from '../types';
import { PhotoGalleryModal } from '../components/PhotoGalleryModal';
import { InstallerLinkModal } from '../components/InstallerLinkModal';

interface ERPInstallationViewProps {
  tasks: InstallationTask[];
  employees: ERPEmployee[];
  orders: ProductionOrder[];
  settings?: ERPCompanySettings;
  aliasOrId?: string;
  companyName?: string;
  onAddTask: (task: Partial<InstallationTask>) => void;
  onUpdateTask: (task: InstallationTask) => void;
  onDeleteTask: (id: string) => void;
  onAddSalaryAdjustment?: (adj: Partial<SalaryAdjustment>) => void;
  onSyncBitrixTasks?: () => void;
  isSyncingBitrix?: boolean;
}

export const ERPInstallationView: React.FC<ERPInstallationViewProps> = ({
  tasks,
  employees,
  orders,
  settings,
  aliasOrId = 'company',
  companyName = 'Мебельное производство',
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddSalaryAdjustment,
  onSyncBitrixTasks,
  isSyncingBitrix = false
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'installation' | 'reclamation'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<InstallationTask | null>(null);
  const [penaltyTaskModal, setPenaltyTaskModal] = useState<InstallationTask | null>(null);
  
  // Modals for Assignment, Report & Installer Link
  const [assigningTask, setAssigningTask] = useState<InstallationTask | null>(null);
  const [selectedInstallerId, setSelectedInstallerId] = useState<string>('');
  const [assignStatusMode, setAssignStatusMode] = useState<'scheduled' | 'in_progress'>('scheduled');
  const [assemblerSearch, setAssemblerSearch] = useState<string>('');

  const [reportTask, setReportTask] = useState<InstallationTask | null>(null);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<ERPEmployee | null>(null);

  // Photo Gallery Lightbox state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryInitialIdx, setGalleryInitialIdx] = useState(0);
  const [galleryOrderNumber, setGalleryOrderNumber] = useState<string>('');

  // Form State for Adding / Editing
  const [formData, setFormData] = useState<Partial<InstallationTask>>({
    orderNumber: '',
    clientName: '',
    clientPhone: '',
    address: '',
    floor: '',
    hasElevator: false,
    assemblyPrice: 0,
    deliveryPrice: 0,
    type: 'installation',
    status: 'new',
    paymentStatus: 'unpaid',
    scheduledDate: new Date().toISOString().split('T')[0],
    comment: ''
  });

  // Form State for Penalty Adjustment
  const [penaltyCulpritId, setPenaltyCulpritId] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState<number>(1000);
  const [penaltyReason, setPenaltyReason] = useState('Штраф за брак/ошибку по рекламации');

  // Filter employees with role "Сборщик мебели" or similar
  const assemblers = useMemo(() => {
    return employees.filter(e => {
      const r = (e.productionRole || e.role || '').toLowerCase();
      return r.includes('сборщик') || r.includes('монтаж') || r.includes('мастер');
    });
  }, [employees]);

  const availableEmployees = assemblers.length > 0 ? assemblers : employees.filter(e => e.status === 'active');

  // Status Localization Helper
  const getStatusInfo = (status: InstallationTask['status']) => {
    switch (status) {
      case 'new':
        return { label: 'Ждет назначения', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'scheduled':
        return { label: 'Сборщик назначен', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'in_progress':
        return { label: 'Идет монтаж', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'completed':
        return { label: 'Монтаж успешен', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'reclamation':
        return { label: 'Рекламация', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'cancelled':
        return { label: 'Отменен', bg: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  // Helper to construct Bitrix24 Task or Deal URL
  const getBitrixUrl = (task: InstallationTask) => {
    if (task.bitrixTaskUrl) return task.bitrixTaskUrl;
    
    const b24Webhook = settings?.bitrix24WebhookUrl || (settings as any)?.activeWebhookUrl;
    let domain = 'bitrix24.ru';
    if (b24Webhook && b24Webhook.startsWith('http')) {
      try {
        const u = new URL(b24Webhook);
        domain = u.host;
      } catch (e) {}
    }

    if (task.bitrixTaskId) {
      return `https://${domain}/company/personal/user/1/tasks/task/view/${task.bitrixTaskId}/`;
    }
    if (task.bitrixDealId) {
      const cleanDeal = String(task.bitrixDealId).replace(/^b24_/i, '');
      return `https://${domain}/crm/deal/details/${cleanDeal}/`;
    }
    if (task.orderId && task.orderId.startsWith('b24_')) {
      const cleanDeal = task.orderId.replace(/^b24_/, '');
      return `https://${domain}/crm/deal/details/${cleanDeal}/`;
    }
    return null;
  };

  // Filtered tasks logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;

      const isBasePaid = task.isBaseAssemblyPaid || task.paymentStatus === 'paid';
      const hasExtra = (task.extraWorksTotal || 0) > 0;
      const isExtraPaid = !hasExtra || task.isExtraWorksPaid;
      const isFullyPaid = isBasePaid && isExtraPaid;

      if (paymentFilter === 'fully_paid' && !isFullyPaid) return false;
      if (paymentFilter === 'unpaid_any' && isFullyPaid) return false;
      if (paymentFilter === 'unpaid_base' && isBasePaid) return false;
      if (paymentFilter === 'unpaid_extra' && (!hasExtra || isExtraPaid)) return false;
      if (paymentFilter === 'paid' && !isFullyPaid) return false;
      if (paymentFilter === 'unpaid' && isFullyPaid) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchOrder = task.orderNumber.toLowerCase().includes(q);
        const matchClient = task.clientName.toLowerCase().includes(q);
        const matchPhone = (task.clientPhone || '').toLowerCase().includes(q);
        const matchAddr = (task.address || '').toLowerCase().includes(q);
        const matchInstaller = (task.installerEmployeeName || '').toLowerCase().includes(q);
        return matchOrder || matchClient || matchPhone || matchAddr || matchInstaller;
      }

      return true;
    });
  }, [tasks, typeFilter, paymentFilter, search]);

  // Overall and Filtered KPI Summary
  const summaryStats = useMemo(() => {
    let totalCount = tasks.length;
    let inProgressCount = 0;
    let scheduledCount = 0;
    let unassignedCount = 0;
    let completedCount = 0;
    let reclamationCount = 0;
    
    let totalAssemblySum = 0;
    let paidAssemblySum = 0;
    let totalExtraSum = 0;
    let paidExtraSum = 0;

    tasks.forEach(t => {
      const isRec = t.status === 'reclamation' || t.type === 'reclamation' || t.hasPendingReclamationFlag;
      if (isRec) {
        reclamationCount++;
      } else if (t.status === 'completed') {
        completedCount++;
      } else if (t.status === 'in_progress') {
        inProgressCount++;
      } else if (t.status === 'scheduled' || t.installerEmployeeId) {
        scheduledCount++;
      } else {
        unassignedCount++;
      }

      const assemblyPrice = t.assemblyPrice || 0;
      const extraTotal = t.extraWorksTotal || 0;

      totalAssemblySum += assemblyPrice;
      if (t.isBaseAssemblyPaid || t.paymentStatus === 'paid') {
        paidAssemblySum += assemblyPrice;
      }

      totalExtraSum += extraTotal;
      if (t.isExtraWorksPaid) {
        paidExtraSum += extraTotal;
      }
    });

    const totalToPay = totalAssemblySum + totalExtraSum;
    const totalPaid = paidAssemblySum + paidExtraSum;
    const unpaidDebt = Math.max(0, totalToPay - totalPaid);

    return {
      totalCount,
      activeCount: inProgressCount + scheduledCount,
      unassignedCount,
      completedCount,
      reclamationCount,
      totalToPay,
      totalPaid,
      unpaidDebt,
      totalExtraSum,
      paidExtraSum
    };
  }, [tasks]);

  // Kanban Columns Data Categorization
  const kanbanColumns = useMemo(() => {
    const unassigned: InstallationTask[] = [];
    const assigned: InstallationTask[] = [];
    const inProgress: InstallationTask[] = [];
    const reclamation: InstallationTask[] = [];
    const completed: InstallationTask[] = [];

    filteredTasks.forEach(task => {
      if (
        task.status === 'reclamation' || 
        task.type === 'reclamation' || 
        task.hasPendingReclamationFlag ||
        (task.reclamationSignal && task.reclamationSignal.status === 'accepted')
      ) {
        reclamation.push(task);
      } else if (task.status === 'completed') {
        completed.push(task);
      } else if (task.status === 'in_progress') {
        inProgress.push(task);
      } else if (task.status === 'scheduled' || task.installerEmployeeId) {
        assigned.push(task);
      } else {
        unassigned.push(task);
      }
    });

    return [
      {
        id: 'new',
        title: 'Ждут назначения',
        bgHeader: 'bg-slate-100 text-slate-800',
        badgeBg: 'bg-slate-200 text-slate-900',
        tasks: unassigned
      },
      {
        id: 'scheduled',
        title: 'Сборщик назначен',
        bgHeader: 'bg-sky-100 text-sky-900',
        badgeBg: 'bg-sky-200 text-sky-900',
        tasks: assigned
      },
      {
        id: 'in_progress',
        title: 'Идет монтаж',
        bgHeader: 'bg-amber-100 text-amber-900',
        badgeBg: 'bg-amber-200 text-amber-900',
        tasks: inProgress
      },
      {
        id: 'reclamation',
        title: 'Рекламации',
        bgHeader: 'bg-rose-100 text-rose-900',
        badgeBg: 'bg-rose-200 text-rose-900',
        tasks: reclamation
      },
      {
        id: 'completed',
        title: 'Монтаж успешен',
        bgHeader: 'bg-emerald-100 text-emerald-900',
        badgeBg: 'bg-emerald-200 text-emerald-900',
        tasks: completed
      }
    ];
  }, [filteredTasks]);

  // Open Edit Modal
  const handleOpenEdit = (task: InstallationTask) => {
    setEditingTask(task);
    setFormData({
      ...task,
      scheduledDate: task.scheduledDate || new Date().toISOString().split('T')[0]
    });
    setShowAddModal(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormData({
      orderNumber: '',
      clientName: '',
      clientPhone: '',
      address: '',
      floor: '',
      hasElevator: false,
      assemblyPrice: 0,
      deliveryPrice: 0,
      type: 'installation',
      status: 'new',
      paymentStatus: 'unpaid',
      scheduledDate: new Date().toISOString().split('T')[0],
      comment: ''
    });
    setShowAddModal(true);
  };

  // Save Task
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderNumber?.trim()) {
      alert('Укажите номер заказа');
      return;
    }

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        ...formData,
        updatedAt: new Date().toISOString()
      } as InstallationTask);
    } else {
      onAddTask({
        ...formData,
        id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setShowAddModal(false);
  };

  // Open Assign Modal
  const handleOpenAssignModal = (task: InstallationTask) => {
    setAssigningTask(task);
    setSelectedInstallerId(task.installerEmployeeId || '');
    setAssignStatusMode(task.status === 'in_progress' ? 'in_progress' : 'scheduled');
    setAssemblerSearch('');
  };

  // Confirm Assign Assembler
  const handleConfirmAssign = () => {
    if (!assigningTask) return;

    const emp = employees.find(e => e.id === selectedInstallerId);
    let nextStatus: InstallationTask['status'] = assigningTask.status;

    if (selectedInstallerId) {
      if (assigningTask.status === 'new' || assigningTask.status === 'scheduled') {
        nextStatus = assignStatusMode;
      }
    } else {
      nextStatus = 'new';
    }

    onUpdateTask({
      ...assigningTask,
      installerEmployeeId: selectedInstallerId || undefined,
      installerEmployeeName: emp ? emp.name : undefined,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });

    setAssigningTask(null);
  };

  const handleStatusChange = (task: InstallationTask, status: InstallationTask['status']) => {
    onUpdateTask({
      ...task,
      status,
      completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : task.completedDate,
      updatedAt: new Date().toISOString()
    });
  };

  // Payout actions
  const handlePayBaseAssembly = (task: InstallationTask) => {
    const isBaseNowPaid = !task.isBaseAssemblyPaid;
    const isExtraPaid = task.isExtraWorksPaid || (task.extraWorksTotal || 0) === 0;
    const newPaymentStatus = (isBaseNowPaid && isExtraPaid) ? 'paid' : (isBaseNowPaid ? 'partial' : 'unpaid');
    const totalPaid = (isBaseNowPaid ? (task.assemblyPrice || 0) : 0) + (task.isExtraWorksPaid ? (task.extraWorksTotal || 0) : 0);

    const updated: InstallationTask = {
      ...task,
      isBaseAssemblyPaid: isBaseNowPaid,
      paymentStatus: newPaymentStatus,
      paidAmount: totalPaid,
      paidAt: isBaseNowPaid ? new Date().toISOString() : task.paidAt,
      updatedAt: new Date().toISOString()
    };

    onUpdateTask(updated);
    if (reportTask && reportTask.id === task.id) {
      setReportTask(updated);
    }
  };

  const handlePayExtraWorks = (task: InstallationTask) => {
    const isExtraNowPaid = !task.isExtraWorksPaid;
    const isBasePaid = task.isBaseAssemblyPaid || task.paymentStatus === 'paid';
    const newPaymentStatus = (isBasePaid && isExtraNowPaid) ? 'paid' : (isExtraNowPaid ? 'partial' : 'unpaid');
    const totalPaid = (isBasePaid ? (task.assemblyPrice || 0) : 0) + (isExtraNowPaid ? (task.extraWorksTotal || 0) : 0);

    const updated: InstallationTask = {
      ...task,
      isExtraWorksPaid: isExtraNowPaid,
      paymentStatus: newPaymentStatus,
      paidAmount: totalPaid,
      paidAt: isExtraNowPaid ? new Date().toISOString() : task.paidAt,
      updatedAt: new Date().toISOString()
    };

    onUpdateTask(updated);
    if (reportTask && reportTask.id === task.id) {
      setReportTask(updated);
    }
  };

  const handlePayFullTask = (task: InstallationTask) => {
    const totalAmount = (task.assemblyPrice || 0) + (task.extraWorksTotal || 0);
    const updated: InstallationTask = {
      ...task,
      isBaseAssemblyPaid: true,
      isExtraWorksPaid: true,
      paymentStatus: 'paid',
      paidAmount: totalAmount,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateTask(updated);
    if (reportTask && reportTask.id === task.id) {
      setReportTask(updated);
    }

    // Also register salary adjustment record if provided
    if (onAddSalaryAdjustment && task.installerEmployeeId) {
      const emp = employees.find(e => e.id === task.installerEmployeeId);
      if (emp) {
        onAddSalaryAdjustment({
          id: `payout-${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'bonus',
          amount: totalAmount,
          reason: `Выплата за монтаж по заказу №${task.orderNumber}`,
          date: new Date().toISOString().split('T')[0]
        });
      }
    }
  };

  const handleOpenPenaltyModal = (task: InstallationTask) => {
    setPenaltyTaskModal(task);
    setPenaltyCulpritId(task.culpritEmployeeId || '');
    setPenaltyAmount(task.penaltyAmount || 1000);
    setPenaltyReason(`Штраф по рекламации к заказу №${task.orderNumber}`);
  };

  const handleConfirmPenalty = () => {
    if (!penaltyTaskModal || !penaltyCulpritId || !onAddSalaryAdjustment) return;

    const culprit = employees.find(e => e.id === penaltyCulpritId);
    if (!culprit) return;

    onAddSalaryAdjustment({
      id: `adj-${Date.now()}`,
      employeeId: culprit.id,
      employeeName: culprit.name,
      type: 'penalty',
      amount: penaltyAmount,
      reason: penaltyReason,
      date: new Date().toISOString().split('T')[0]
    });

    onUpdateTask({
      ...penaltyTaskModal,
      culpritEmployeeId: culprit.id,
      culpritEmployeeName: culprit.name,
      penaltyAmount: penaltyAmount,
      updatedAt: new Date().toISOString()
    });

    setPenaltyTaskModal(null);
  };

  // Render a Single Task Card
  const renderTaskCard = (task: InstallationTask) => {
    const isReclamation = task.status === 'reclamation' || task.type === 'reclamation';
    const statusInfo = getStatusInfo(task.status);
    const bitrixUrl = getBitrixUrl(task);

    const isBasePaid = task.isBaseAssemblyPaid || task.paymentStatus === 'paid';
    const hasExtra = (task.extraWorksTotal || 0) > 0;
    const isExtraPaid = !hasExtra || task.isExtraWorksPaid;
    const isFullyPaid = isBasePaid && isExtraPaid;

    return (
      <div 
        key={task.id}
        className={`p-3 rounded-2xl border transition-all duration-200 bg-white space-y-2.5 shadow-2xs hover:shadow-md ${
          isReclamation 
            ? 'border-rose-300 bg-rose-50/20' 
            : task.status === 'completed'
              ? 'border-emerald-200 hover:border-emerald-400'
              : 'border-slate-200/90 hover:border-indigo-300'
        }`}
      >
        {/* Card Header: Type, Status, Order Number & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide border ${
                isReclamation ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-indigo-100 text-indigo-900 border-indigo-200'
              }`}>
                {isReclamation ? '⚠️ Рекламация' : '🛠️ Монтаж'}
              </span>

              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>

              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                isFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isFullyPaid ? 'Оплачено' : 'К оплате'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <h4 className="font-black text-slate-900 text-sm tracking-tight truncate">
                Заказ {task.orderNumber}
              </h4>
              
              {/* Bitrix24 Link Badge */}
              {bitrixUrl && (
                <a
                  href={bitrixUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold font-mono transition-colors"
                  title="Открыть сделку/задачу в Битрикс24"
                >
                  <span>B24</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setReportTask(task)}
              className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
              title="Открыть отчет о монтаже"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleOpenEdit(task)}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Редактировать"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Client & Address Info */}
        <div className="space-y-1 text-xs text-slate-600">
          <div className="font-bold text-slate-900 truncate">
            {task.clientName || 'Заказчик не указан'}
          </div>

          {task.clientPhone && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <a href={`tel:${task.clientPhone}`} className="hover:text-indigo-600 hover:underline">
                {task.clientPhone}
              </a>
            </div>
          )}

          {task.address && (
            <div className="flex items-start gap-1 text-[11px] text-slate-500 leading-tight">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
              <span className="truncate">{task.address} {task.floor ? `(эт. ${task.floor})` : ''}</span>
            </div>
          )}

          {task.scheduledDate && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 font-semibold pt-0.5">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{task.scheduledDate} {task.scheduledTime ? `в ${task.scheduledTime}` : ''}</span>
            </div>
          )}
        </div>

        {/* ASSEMBLER ASSIGNMENT BLOCK */}
        <div className="p-2 bg-indigo-50/40 rounded-xl border border-indigo-100/60 flex items-center justify-between gap-2">
          <div className="text-xs truncate min-w-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Исполнитель</div>
            <div className="font-bold text-slate-900 truncate text-[11px]">
              {task.installerEmployeeName ? (
                <button
                  type="button"
                  onClick={() => {
                    const emp = employees.find(e => e.id === task.installerEmployeeId || e.name === task.installerEmployeeName);
                    if (emp) setSelectedEmployeeForModal(emp);
                  }}
                  className="flex items-center gap-1 text-indigo-950 hover:text-indigo-600 font-bold hover:underline cursor-pointer truncate"
                  title="Открыть кабинет сборщика"
                >
                  <UserCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">{task.installerEmployeeName}</span>
                </button>
              ) : (
                <span className="text-slate-400 italic">— Не назначен —</span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleOpenAssignModal(task)}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              task.installerEmployeeName
                ? 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
            }`}
          >
            {task.installerEmployeeName ? (
              <>
                <UserCheck className="w-3 h-3" /> Сменить
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" /> Назначить
              </>
            )}
          </button>
        </div>

        {/* LINE-BY-LINE FINANCIAL & PHOTO BLOCK (Доп работы, Фото, Сумма) */}
        <div className="space-y-1.5 pt-0.5 text-xs">
          {/* Line 1: Extra works if any */}
          {(task.performedExtraWorks?.length || 0) > 0 || (task.extraWorksTotal || 0) > 0 ? (
            <div className="flex items-center justify-between bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/70 text-[11px]">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 truncate">
                <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Доп. работы ({task.performedExtraWorks?.length || 0}):</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-black text-amber-950">
                  +{(task.extraWorksTotal || 0).toLocaleString('ru-RU')} ₽
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  task.isExtraWorksPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200/70 text-amber-900'
                }`}>
                  {task.isExtraWorksPaid ? 'Оплачено' : 'К оплате'}
                </span>
              </div>
            </div>
          ) : null}

          {/* Line 2: Photos if any */}
          {(task.photos?.length || 0) > 0 ? (
            <div 
              onClick={() => {
                setGalleryPhotos(task.photos || []);
                setGalleryInitialIdx(0);
                setGalleryOrderNumber(task.orderNumber);
                setGalleryOpen(true);
              }}
              className="flex items-center justify-between bg-slate-50 hover:bg-indigo-50/60 px-2.5 py-1 rounded-xl border border-slate-200/70 cursor-pointer transition-colors text-[11px]"
              title="Нажмите для просмотра фотогалереи"
            >
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>Фотоотчет:</span>
              </span>
              <span className="font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-md border border-indigo-100 shadow-2xs">
                📸 {task.photos?.length} фото
              </span>
            </div>
          ) : null}

          {/* Line 3: Basic Assembly Amount & Payment */}
          <div className="flex items-center justify-between px-1 py-0.5 text-[11px]">
            <span className="text-slate-500 font-medium">Базовый монтаж:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-slate-900">
                {(task.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                isBasePaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isBasePaid ? 'Выплачен' : 'Не выплачен'}
              </span>
            </div>
          </div>

          {/* Total sum line if extra works exist */}
          {Boolean(task.extraWorksTotal && task.extraWorksTotal > 0) && (
            <div className="flex items-center justify-between px-2 py-1 bg-slate-100/70 rounded-xl font-bold text-[11px] border border-slate-200/50">
              <span className="text-slate-700 font-black">Итого к выплате:</span>
              <span className="font-mono font-black text-indigo-900">
                {((task.assemblyPrice || 0) + (task.extraWorksTotal || 0)).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>

        {/* Quick status transition buttons & Report */}
        <div className="flex items-center gap-1.5 pt-1">
          {task.status !== 'in_progress' && task.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange(task, 'in_progress')}
              className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-amber-200"
              title="Перевести в статус «Идет монтаж»"
            >
              <Play className="w-3 h-3 text-amber-600" />
              <span>В работу</span>
            </button>
          )}

          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => handleStatusChange(task, 'completed')}
                className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-emerald-200"
                title="Завершить монтаж"
              >
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Сдан</span>
              </button>
              <button
                onClick={() => handleStatusChange(task, 'reclamation')}
                className="py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-rose-200"
                title="Перевести в рекламацию"
              >
                <AlertTriangle className="w-3 h-3 text-rose-600" />
              </button>
            </>
          )}

          {task.status === 'completed' && (
            <button
              onClick={() => setReportTask(task)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-emerald-200"
            >
              <FileText className="w-3 h-3 text-emerald-600" />
              <span>Отчет о монтаже</span>
            </button>
          )}

          {isReclamation && (
            <button
              onClick={() => handleOpenPenaltyModal(task)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-rose-200"
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>{task.penaltyAmount ? `Штраф ${task.penaltyAmount} ₽` : 'Удержание'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Управление монтажами</h2>
            <div className="text-xs text-slate-500 font-medium">
              Всего выездов: <strong className="text-slate-900 font-mono">{filteredTasks.length}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Bitrix Tasks button if enabled */}
          {onSyncBitrixTasks && (
            <button
              onClick={onSyncBitrixTasks}
              disabled={isSyncingBitrix}
              className="px-3 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 disabled:opacity-50"
              title="Синхронизировать задачи и сделки с Битрикс24"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBitrix ? 'animate-spin' : ''}`} />
              <span>{isSyncingBitrix ? 'Синхронизация...' : 'Битрикс24'}</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Канбан-доска"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Список"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Task Button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить монтаж</span>
          </button>
        </div>
      </div>

      {/* COMPACT KPI SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Card 1: Total & Reclamations */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Всего заявок</span>
            <Package className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900 font-mono">{summaryStats.totalCount}</span>
            {summaryStats.reclamationCount > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200">
                {summaryStats.reclamationCount} рекл.
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            Монтажи и рекламации
          </div>
        </div>

        {/* Card 2: Active / In Progress */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">В работе / План</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-amber-700 font-mono">{summaryStats.activeCount}</span>
            {summaryStats.unassignedCount > 0 && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md border border-slate-200">
                {summaryStats.unassignedCount} новых
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            Назначены или выполняются
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Сдано клиентам</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-emerald-700 font-mono">{summaryStats.completedCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
              {summaryStats.totalCount > 0 ? Math.round((summaryStats.completedCount / summaryStats.totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            Успешно завершенные
          </div>
        </div>

        {/* Card 4: Total Accrued */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Начислено мастерам</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-indigo-900 font-mono">
              {summaryStats.totalToPay.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium truncate">
            В т.ч. доп. работы: <strong className="text-indigo-600 font-mono">{summaryStats.totalExtraSum.toLocaleString('ru-RU')} ₽</strong>
          </div>
        </div>

        {/* Card 5: Unpaid vs Paid */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">К выплате / Выплачено</span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-black text-amber-700 font-mono">
              {summaryStats.unpaidDebt.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
              {summaryStats.totalPaid.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            Остаток к выдаче сборщикам
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по номеру заказа, клиенту, адресу или сборщику..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setTypeFilter('installation')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                typeFilter === 'installation' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              🛠️ Монтажи
            </button>
            <button
              onClick={() => setTypeFilter('reclamation')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                typeFilter === 'reclamation' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ⚠️ Рекламации
            </button>
          </div>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="all">Все оплаты</option>
            <option value="fully_paid">✅ Полностью оплачено</option>
            <option value="unpaid_any">⚠️ Любая задолженность</option>
            <option value="unpaid_base">💰 Не оплачен базовый монтаж</option>
            <option value="unpaid_extra">🔧 Не оплачены доп. работы</option>
          </select>
        </div>
      </div>

      {/* MAIN VIEW: KANBAN BOARD (Optimized compact width to eliminate horizontal scrollbar on desktop) */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 overflow-x-auto pb-4">
          {kanbanColumns.map(col => (
            <div key={col.id} className="bg-slate-50/80 rounded-3xl p-2.5 border border-slate-200/80 space-y-2.5 flex flex-col min-w-[190px] lg:min-w-0 flex-1">
              {/* Column Header */}
              <div className={`p-2.5 rounded-2xl ${col.bgHeader} flex items-center justify-between font-extrabold text-xs`}>
                <span className="truncate">{col.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${col.badgeBg}`}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Task Cards Column List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[72vh] pr-0.5">
                {col.tasks.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-2xl">
                    Нет заказов
                  </div>
                ) : (
                  col.tasks.map(task => renderTaskCard(task))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SECONDARY VIEW: LIST GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map(task => renderTaskCard(task))}
        </div>
      )}

      {/* MODAL 1: ASSIGN ASSEMBLER */}
      {assigningTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-indigo-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Назначить сборщика на Заказ №{assigningTask.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setAssigningTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">{assigningTask.clientName}</div>
                <div>Адрес: {assigningTask.address || 'Не указан'}</div>
                <div>Стоимость сборки: <strong className="font-mono text-indigo-700">{(assigningTask.assemblyPrice || 0).toLocaleString('ru-RU')} ₽</strong></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Поиск и выбор мастера сборки:
                </label>
                <input
                  type="text"
                  placeholder="Поиск по имени мастера..."
                  value={assemblerSearch}
                  onChange={(e) => setAssemblerSearch(e.target.value)}
                  className="w-full px-3.5 py-2 mb-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-2xl p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setSelectedInstallerId('')}
                    className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      !selectedInstallerId ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>— Снять назначение (Оставить без сборщика) —</span>
                    {!selectedInstallerId && <Check className="w-4 h-4" />}
                  </button>

                  {availableEmployees
                    .filter(emp => !assemblerSearch.trim() || emp.name.toLowerCase().includes(assemblerSearch.toLowerCase()))
                    .map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedInstallerId(emp.id)}
                        className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center justify-between transition-colors cursor-pointer ${
                          selectedInstallerId === emp.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{emp.name}</div>
                          <div className={`text-[10px] ${selectedInstallerId === emp.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {emp.productionRole || emp.role || 'Сборщик'} {emp.phone ? `• ${emp.phone}` : ''}
                          </div>
                        </div>
                        {selectedInstallerId === emp.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                </div>
              </div>

              {selectedInstallerId && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Статус после назначения:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignStatusMode('scheduled')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        assignStatusMode === 'scheduled'
                          ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      📅 Сборщик назначен
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignStatusMode('in_progress')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        assignStatusMode === 'in_progress'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      ⚙️ Идет монтаж
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningTask(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
              >
                Сохранить назначение
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAILED REPORT ON INSTALLATION (Отчет о монтаже) */}
      {reportTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    Отчет о монтаже — Заказ № {reportTask.orderNumber}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>Клиент: <strong>{reportTask.clientName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Статус: 
                      <strong className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusInfo(reportTask.status).bg}`}>
                        {getStatusInfo(reportTask.status).label}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReportTask(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-200/80">
                <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Информация о клиенте</div>
                <div className="font-bold text-slate-900 text-sm">{reportTask.clientName}</div>
                {reportTask.clientPhone && (
                  <div className="text-slate-600">
                    Тел: <a href={`tel:${reportTask.clientPhone}`} className="text-indigo-600 font-bold hover:underline">{reportTask.clientPhone}</a>
                  </div>
                )}
                {reportTask.address && (
                  <div className="text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{reportTask.address} {reportTask.floor ? `(Этаж: ${reportTask.floor})` : ''}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-200/80">
                <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Сборщик и Сроки</div>
                
                {/* Active link / profile of employee */}
                {(() => {
                  const emp = employees.find(e => e.id === reportTask.installerEmployeeId || (reportTask.installerEmployeeName && e.name.toLowerCase() === reportTask.installerEmployeeName.toLowerCase()));
                  const displayName = emp ? emp.name : (reportTask.installerEmployeeName || '— Исполнитель не назначен —');
                  
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{displayName}</span>
                        </div>

                        {emp && (
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeForModal(emp)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Открыть мобильное рабочее место сборщика"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR / Кабинет</span>
                          </button>
                        )}
                      </div>

                      {emp?.phone && (
                        <div className="text-slate-600 text-[11px]">
                          Тел. мастера: <a href={`tel:${emp.phone}`} className="text-indigo-600 font-bold hover:underline">{emp.phone}</a>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="text-slate-600 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span>Плановая дата:</span>
                  <strong>{reportTask.scheduledDate || 'Не указана'}</strong>
                </div>
                {reportTask.completedDate && (
                  <div className="text-emerald-700 font-bold flex items-center justify-between">
                    <span>Сдан клиенту:</span>
                    <span>{reportTask.completedDate}</span>
                  </div>
                )}
                {reportTask.warrantyUntil && (
                  <div className="text-indigo-700 font-bold flex items-center justify-between">
                    <span>Гарантия до:</span>
                    <span>{reportTask.warrantyUntil}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PAYMENT AND FINANCIAL CONTROL (Финансовый расчет и выплата сборщику) */}
            <div className="p-4 bg-slate-900 text-white rounded-3xl space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-black text-sm uppercase tracking-wider text-white">
                    Расчет и выплата сборщику
                  </h4>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Общий итог к выплате</div>
                  <div className="text-lg font-mono font-black text-emerald-400">
                    {((reportTask.assemblyPrice || 0) + (reportTask.extraWorksTotal || 0)).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Base Assembly */}
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">1. Базовый монтаж:</span>
                    <span className="font-mono font-black text-sm text-white">
                      {(reportTask.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
                    </span>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reportTask.isBaseAssemblyPaid || reportTask.paymentStatus === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {reportTask.isBaseAssemblyPaid || reportTask.paymentStatus === 'paid' ? '✓ Выплачено' : '✕ Не выплачено'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePayBaseAssembly(reportTask)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      reportTask.isBaseAssemblyPaid || reportTask.paymentStatus === 'paid'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {reportTask.isBaseAssemblyPaid || reportTask.paymentStatus === 'paid' ? 'Отменить выплату' : 'Оплатить'}
                  </button>
                </div>

                {/* 2. Extra Works */}
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">2. Дополнительные работы:</span>
                    <span className="font-mono font-black text-sm text-amber-400">
                      +{(reportTask.extraWorksTotal || 0).toLocaleString('ru-RU')} ₽
                    </span>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reportTask.isExtraWorksPaid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {reportTask.isExtraWorksPaid ? '✓ Оплачено' : '✕ К оплате'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePayExtraWorks(reportTask)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      reportTask.isExtraWorksPaid
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {reportTask.isExtraWorksPaid ? 'Отменить' : 'Оплатить'}
                  </button>
                </div>
              </div>

              {/* One-click full payout button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {reportTask.paidAt ? `Оплата зафиксирована: ${new Date(reportTask.paidAt).toLocaleDateString('ru-RU')}` : 'Статус: Выплата не зафиксирована'}
                </span>

                <button
                  onClick={() => handlePayFullTask(reportTask)}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Выплатить всё и зафиксировать в зарплату</span>
                </button>
              </div>
            </div>

            {/* Performed Extra Works Table (With corrected tariff calculation!) */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Дополнительные работы, выполненные на объекте:</span>
                <span className="font-mono text-indigo-700 font-extrabold text-sm">
                  Итого: {(reportTask.extraWorksTotal || 0).toLocaleString('ru-RU')} ₽
                </span>
              </h4>

              {(!reportTask.performedExtraWorks || reportTask.performedExtraWorks.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
                  Дополнительные работы не зафиксированы
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">Наименование работы</th>
                        <th className="p-2.5 text-center">Кол-во</th>
                        <th className="p-2.5 text-right">Тариф</th>
                        <th className="p-2.5 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {reportTask.performedExtraWorks.map((w, idx) => {
                        const tariffPrice = w.price !== undefined ? w.price : (w.rate !== undefined ? w.rate : (w.quantity > 0 ? w.totalPrice / w.quantity : 0));
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold">{w.name}</td>
                            <td className="p-2.5 text-center font-mono">{w.quantity} {w.unit}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                              {(tariffPrice || 0).toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-950">
                              {(w.totalPrice || 0).toLocaleString('ru-RU')} ₽
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Photos Section with Carousel Lightbox Trigger */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Фотоотчет объекта:</span>
                  <span className="text-slate-400 font-mono">({reportTask.photos?.length || 0} фото)</span>
                </span>
                {(reportTask.photos?.length || 0) > 0 && (
                  <button
                    onClick={() => {
                      setGalleryPhotos(reportTask.photos || []);
                      setGalleryInitialIdx(0);
                      setGalleryOrderNumber(reportTask.orderNumber);
                      setGalleryOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    Смотреть со слайдером →
                  </button>
                )}
              </h4>

              {(!reportTask.photos || reportTask.photos.length === 0) ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
                  Фотографии еще не прикреплены сборщиком
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {reportTask.photos.map((ph, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGalleryPhotos(reportTask.photos || []);
                        setGalleryInitialIdx(idx);
                        setGalleryOrderNumber(reportTask.orderNumber);
                        setGalleryOpen(true);
                      }}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <img src={ph} alt={`Фото ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[9px] font-mono">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Act & Signature Details */}
            {reportTask.clientSignature && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">Акт приема-передачи подписан клиентом</div>
                    <div className="text-[10px] text-emerald-700">Дата подписи: {reportTask.clientApprovedAt || 'Да'}</div>
                  </div>
                </div>
                <img src={reportTask.clientSignature} alt="Подпись клиента" className="h-10 border border-emerald-300 rounded bg-white px-2 object-contain" />
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setReportTask(null)}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Закрыть отчет
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT INSTALLATION TASK */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-lg">
                  {editingTask ? 'Редактировать монтаж' : 'Добавить выезд на монтаж'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Номер заказа *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: 11-0626-11"
                    value={formData.orderNumber || ''}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Тип выезда</label>
                  <select
                    value={formData.type || 'installation'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="installation">🛠️ Монтаж и сборка</option>
                    <option value="reclamation">⚠️ Рекламация / Бракованная деталь</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Статус монтажа</label>
                  <select
                    value={formData.status || 'new'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="new">⏳ Ждет назначения</option>
                    <option value="scheduled">📅 Сборщик назначен (ждет выезда)</option>
                    <option value="in_progress">⚙️ Идет монтаж (В работе)</option>
                    <option value="completed">✅ Монтаж завершен успешно</option>
                    <option value="reclamation">⚠️ Рекламация</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ФИО Заказчика</label>
                  <input
                    type="text"
                    placeholder="Иван Иванов"
                    value={formData.clientName || ''}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Телефон клиента</label>
                  <input
                    type="text"
                    placeholder="+7 (999) 000-00-00"
                    value={formData.clientPhone || ''}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Адрес объекта</label>
                <input
                  type="text"
                  placeholder="г. Москва, ул. Ленина, д. 10, кв. 45"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Этаж</label>
                  <input
                    type="text"
                    placeholder="5"
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Стоимость сборки (₽)</label>
                  <input
                    type="number"
                    value={formData.assemblyPrice || 0}
                    onChange={(e) => setFormData({ ...formData, assemblyPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Запланированная дата</label>
                  <input
                    type="date"
                    value={formData.scheduledDate || ''}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ссылка на задачу в Битрикс24</label>
                <input
                  type="text"
                  placeholder="https://company.bitrix24.ru/company/personal/user/1/tasks/task/view/1234/"
                  value={formData.bitrixTaskUrl || ''}
                  onChange={(e) => setFormData({ ...formData, bitrixTaskUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Комментарий / Заметки по объекту</label>
                <textarea
                  rows={2}
                  placeholder="Например: Пропуск на авто, розетки не перенесены..."
                  value={formData.comment || ''}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {editingTask ? 'Сохранить изменения' : 'Создать монтаж'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECLAMATION PENALTY */}
      {penaltyTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Удержание по рекламации ({penaltyTaskModal.orderNumber})
                </h3>
              </div>
              <button
                onClick={() => setPenaltyTaskModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Виновный сотрудник (с кого списать)</label>
                <select
                  value={penaltyCulpritId}
                  onChange={(e) => setPenaltyCulpritId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="">-- Выберите сотрудника --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.productionRole || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Сумма штрафа / удержания (₽)</label>
                <input
                  type="number"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Причина удержания</label>
                <input
                  type="text"
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPenaltyTaskModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmPenalty}
                disabled={!penaltyCulpritId}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                Списать штраф в зарплату
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTALLER LINK & QR MODAL */}
      {selectedEmployeeForModal && (
        <InstallerLinkModal
          isOpen={!!selectedEmployeeForModal}
          onClose={() => setSelectedEmployeeForModal(null)}
          employee={selectedEmployeeForModal}
          aliasOrId={aliasOrId}
          companyName={companyName}
        />
      )}

      {/* PHOTO GALLERY CAROUSEL LIGHTBOX */}
      <PhotoGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={galleryPhotos}
        initialIndex={galleryInitialIdx}
        title="Фотоотчет монтажа"
        orderNumber={galleryOrderNumber}
      />
    </div>
  );
};

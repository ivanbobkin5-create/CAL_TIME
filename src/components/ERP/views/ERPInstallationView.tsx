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
  ArrowRight
} from 'lucide-react';
import { 
  InstallationTask, 
  ERPEmployee, 
  ProductionOrder, 
  ERPCompanySettings, 
  SalaryAdjustment 
} from '../types';

interface ERPInstallationViewProps {
  tasks: InstallationTask[];
  employees: ERPEmployee[];
  orders: ProductionOrder[];
  settings?: ERPCompanySettings;
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
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<InstallationTask | null>(null);
  const [viewingPackagesTask, setViewingPackagesTask] = useState<InstallationTask | null>(null);
  const [penaltyTaskModal, setPenaltyTaskModal] = useState<InstallationTask | null>(null);
  
  // MODALS FOR ASSIGNMENT & REPORT
  const [assigningTask, setAssigningTask] = useState<InstallationTask | null>(null);
  const [selectedInstallerId, setSelectedInstallerId] = useState<string>('');
  const [assemblerSearch, setAssemblerSearch] = useState<string>('');

  const [reportTask, setReportTask] = useState<InstallationTask | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;
      if (paymentFilter === 'paid' && task.paymentStatus !== 'paid') return false;
      if (paymentFilter === 'unpaid' && task.paymentStatus === 'paid') return false;

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

  // Kanban Columns Data Categorization
  const kanbanColumns = useMemo(() => {
    const unassigned: InstallationTask[] = [];
    const assigned: InstallationTask[] = [];
    const inProgress: InstallationTask[] = [];
    const reclamation: InstallationTask[] = [];
    const completed: InstallationTask[] = [];

    filteredTasks.forEach(task => {
      // 1. Reclamation Column
      if (
        task.status === 'reclamation' || 
        task.type === 'reclamation' || 
        task.hasPendingReclamationFlag ||
        (task.reclamationSignal && task.reclamationSignal.status === 'accepted')
      ) {
        reclamation.push(task);
      } 
      // 2. Completed Column
      else if (task.status === 'completed') {
        completed.push(task);
      } 
      // 3. In Progress Column
      else if (task.status === 'in_progress') {
        inProgress.push(task);
      } 
      // 4. Assigned Column
      else if (task.installerEmployeeId) {
        assigned.push(task);
      } 
      // 5. Unassigned Column
      else {
        unassigned.push(task);
      }
    });

    return [
      { id: 'unassigned', title: 'Ждет назначения', tasks: unassigned, bgHeader: 'bg-slate-100 text-slate-700', badgeBg: 'bg-slate-200 text-slate-800' },
      { id: 'assigned', title: 'Сборщик назначен', tasks: assigned, bgHeader: 'bg-blue-50 text-blue-800', badgeBg: 'bg-blue-100 text-blue-800' },
      { id: 'in_progress', title: 'Идет монтаж', tasks: inProgress, bgHeader: 'bg-amber-50 text-amber-900', badgeBg: 'bg-amber-100 text-amber-800' },
      { id: 'reclamation', title: 'Рекламация', tasks: reclamation, bgHeader: 'bg-rose-50 text-rose-900', badgeBg: 'bg-rose-100 text-rose-800' },
      { id: 'completed', title: 'Монтаж успешен', tasks: completed, bgHeader: 'bg-emerald-50 text-emerald-900', badgeBg: 'bg-emerald-100 text-emerald-800' }
    ];
  }, [filteredTasks]);

  // Summary Metrics
  const totalInstallations = tasks.filter(t => t.type === 'installation').length;
  const totalReclamations = tasks.filter(t => t.type === 'reclamation' || t.status === 'reclamation' || t.hasPendingReclamationFlag).length;
  const totalUnpaidAmount = tasks
    .filter(t => t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.assemblyPrice || 0), 0);
  const totalPaidAmount = tasks
    .filter(t => t.paymentStatus === 'paid')
    .reduce((sum, t) => sum + (t.assemblyPrice || 0), 0);

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

  const handleOpenEdit = (task: InstallationTask) => {
    setEditingTask(task);
    setFormData({ ...task });
    setShowAddModal(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderNumber?.trim()) return;

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        ...formData,
        orderNumber: formData.orderNumber.trim(),
        clientName: formData.clientName?.trim() || 'Заказчик',
        updatedAt: new Date().toISOString()
      } as InstallationTask);
    } else {
      onAddTask({
        ...formData,
        id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderNumber: formData.orderNumber.trim(),
        clientName: formData.clientName?.trim() || 'Заказчик',
        createdAt: new Date().toISOString()
      });
    }
    setShowAddModal(false);
  };

  // Open Assign Modal safely
  const handleOpenAssignModal = (task: InstallationTask) => {
    setAssigningTask(task);
    setSelectedInstallerId(task.installerEmployeeId || '');
    setAssemblerSearch('');
  };

  // Confirm Assign Assembler
  const handleConfirmAssign = () => {
    if (!assigningTask) return;
    const emp = employees.find(e => e.id === selectedInstallerId);
    
    // Update task status automatically if assigning first time
    const nextStatus = selectedInstallerId && assigningTask.status === 'new' ? 'scheduled' : assigningTask.status;

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

  const handlePaymentToggle = (task: InstallationTask) => {
    const nextStatus = task.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    onUpdateTask({
      ...task,
      paymentStatus: nextStatus,
      paidAmount: nextStatus === 'paid' ? task.assemblyPrice || 0 : 0,
      updatedAt: new Date().toISOString()
    });
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

  // Helper renderer for a single Task Card in Kanban or Grid
  const renderTaskCard = (task: InstallationTask) => {
    const isReclamation = task.type === 'reclamation' || task.status === 'reclamation' || task.hasPendingReclamationFlag;
    const relatedOrder = orders.find(o => o.orderNumber === task.orderNumber);

    return (
      <div
        key={task.id}
        className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3 relative group ${
          isReclamation ? 'border-rose-300 hover:border-rose-400 bg-rose-50/10' : 'border-slate-200 hover:border-indigo-300'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                isReclamation ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}>
                {isReclamation ? '⚠️ Рекламация' : '🛠️ Монтаж'}
              </span>

              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                task.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {task.paymentStatus === 'paid' ? 'Оплачено' : 'К оплате'}
              </span>
            </div>

            <h4 className="font-black text-slate-900 text-sm mt-1.5 flex items-center gap-1.5">
              <span>Заказ {task.orderNumber}</span>
              {task.bitrixTaskUrl && (
                <a
                  href={task.bitrixTaskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50"
                  title="Открыть задачу в Битрикс24"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </h4>
          </div>

          <div className="flex items-center gap-1">
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

        {/* Pending Reclamation Warning Signal */}
        {task.hasPendingReclamationFlag && task.reclamationSignal && (
          <div className="p-2.5 bg-rose-950 text-white rounded-xl text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1 text-rose-200 text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Сигнал брака от сборщика
            </div>
            <div className="text-[11px] font-medium text-rose-100">
              {task.reclamationSignal.reason}
            </div>
            <div className="flex gap-1 pt-1">
              <button
                onClick={() => {
                  onUpdateTask({
                    ...task,
                    type: 'reclamation',
                    status: 'reclamation',
                    hasPendingReclamationFlag: false,
                    reclamationSignal: { ...task.reclamationSignal!, status: 'accepted' },
                    updatedAt: new Date().toISOString()
                  });
                  handleOpenPenaltyModal(task);
                }}
                className="flex-1 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] text-center cursor-pointer"
              >
                Принять
              </button>
              <button
                onClick={() => {
                  onUpdateTask({
                    ...task,
                    hasPendingReclamationFlag: false,
                    reclamationSignal: { ...task.reclamationSignal!, status: 'rejected' },
                    updatedAt: new Date().toISOString()
                  });
                }}
                className="py-1 px-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
              >
                Отклонить
              </button>
            </div>
          </div>
        )}

        {/* Client & Address Summary */}
        <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-xs">
          <div className="font-bold text-slate-900 flex items-center justify-between">
            <span className="truncate">{task.clientName}</span>
            {task.clientPhone && (
              <a href={`tel:${task.clientPhone}`} className="text-indigo-600 font-mono text-[10px] font-bold hover:underline shrink-0">
                {task.clientPhone}
              </a>
            )}
          </div>
          {task.address && (
            <div className="text-slate-500 text-[10px] line-clamp-2 flex items-start gap-1">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
              <span>{task.address}</span>
            </div>
          )}
        </div>

        {/* ASSEMBLER ASSIGNMENT BLOCK (No dropdown!) */}
        <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100/60 flex items-center justify-between gap-2">
          <div className="text-xs truncate">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Исполнитель</div>
            <div className="font-bold text-slate-900 truncate text-[11px]">
              {task.installerEmployeeName ? (
                <span className="flex items-center gap-1 text-indigo-950">
                  <UserCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                  {task.installerEmployeeName}
                </span>
              ) : (
                <span className="text-slate-400 italic">— Не назначен —</span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleOpenAssignModal(task)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
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

        {/* Extra Works & Photos Badge preview */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-1">
          <div className="flex items-center gap-2">
            {(task.performedExtraWorks?.length || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Доп. работы: {(task.extraWorksTotal || 0).toLocaleString('ru-RU')} ₽
              </span>
            )}
            {(task.photos?.length || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                📸 {task.photos?.length} фото
              </span>
            )}
          </div>

          <div className="font-mono text-slate-700 font-black">
            {(task.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
          </div>
        </div>

        {/* Action Button: Open Report */}
        <button
          onClick={() => setReportTask(task)}
          className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-xs text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Отчет о монтаже</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Wrench className="w-4 h-4" /> Выездная сборка, доставка и гарантийные вызовы
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Монтаж и сборка у клиентов
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="p-1 bg-slate-100 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Канбан
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" /> Список
            </button>
          </div>

          {onSyncBitrixTasks && (
            <button
              onClick={onSyncBitrixTasks}
              disabled={isSyncingBitrix}
              className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all flex items-center gap-2 border border-indigo-200 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingBitrix ? 'animate-spin' : ''}`} />
              <span>{isSyncingBitrix ? 'Синхронизация...' : 'Синхронизировать Битрикс24'}</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить монтаж</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всего монтажей</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalInstallations}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Плановые выезды</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-rose-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Рекламации</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{totalReclamations}</div>
            <div className="text-[10px] text-rose-500 font-medium mt-0.5">Выезды по браку</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Оплачено за сборку</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{totalPaidAmount.toLocaleString('ru-RU')} ₽</div>
            <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Рассчитано со сборщиками</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">К оплате (В работе)</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalUnpaidAmount.toLocaleString('ru-RU')} ₽</div>
            <div className="text-[10px] text-amber-600/80 font-medium mt-0.5">В процессе / Ожидают приемки</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру заказа, ФИО клиента, адресу или сборщику..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center shrink-0">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Все типы
              </button>
              <button
                onClick={() => setTypeFilter('installation')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  typeFilter === 'installation' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Монтажи ({totalInstallations})
              </button>
              <button
                onClick={() => setTypeFilter('reclamation')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  typeFilter === 'reclamation' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Рекламации ({totalReclamations})
              </button>
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
            >
              <option value="all">Все оплаты</option>
              <option value="paid">Оплачено</option>
              <option value="unpaid">Не оплачено</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => (
            <div key={col.id} className="bg-slate-50/80 rounded-3xl p-3 border border-slate-200/80 space-y-3 flex flex-col min-w-[260px]">
              {/* Column Header */}
              <div className={`p-3 rounded-2xl ${col.bgHeader} flex items-center justify-between font-extrabold text-xs`}>
                <span>{col.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${col.badgeBg}`}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Task Cards Column List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                {col.tasks.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-2xl">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => renderTaskCard(task))}
        </div>
      )}

      {/* MODAL 1: ASSIGN ASSEMBLER (Modal instead of direct select) */}
      {assigningTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-indigo-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Назначение сборщика
                  </h3>
                  <p className="text-xs text-slate-500">
                    Заказ № <span className="font-mono font-bold text-slate-900">{assigningTask.orderNumber}</span> ({assigningTask.clientName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Assemblers */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assemblerSearch}
                onChange={(e) => setAssemblerSearch(e.target.value)}
                placeholder="Поиск мастера по имени..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Assembler Selection List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedInstallerId('')}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedInstallerId === '' 
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-300/30' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold text-slate-700">
                  — Снять исполнителя (Не назначен) —
                </div>
                {selectedInstallerId === '' && <Check className="w-4 h-4 text-rose-600" />}
              </button>

              {availableEmployees
                .filter(e => e.name.toLowerCase().includes(assemblerSearch.toLowerCase()))
                .map(emp => {
                  const isSelected = selectedInstallerId === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedInstallerId(emp.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{emp.productionRole || emp.role || 'Сборщик мебели'} {emp.phone ? `• ${emp.phone}` : ''}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setAssigningTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmAssign}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Назначить сборщика</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSTALLATION REPORT («Отчет о монтаже») */}
      {reportTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    Отчет о монтаже — Заказ № {reportTask.orderNumber}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Клиент: <strong>{reportTask.clientName}</strong></span>
                    <span>•</span>
                    <span>Статус: <strong className="text-indigo-600">{reportTask.status}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setReportTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-200/80">
                <div className="font-bold text-slate-400 text-[10px] uppercase">Информация о клиенте</div>
                <div className="font-bold text-slate-900">{reportTask.clientName}</div>
                {reportTask.clientPhone && (
                  <div className="text-slate-600">Тел: <a href={`tel:${reportTask.clientPhone}`} className="text-indigo-600 font-bold hover:underline">{reportTask.clientPhone}</a></div>
                )}
                {reportTask.address && (
                  <div className="text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{reportTask.address} {reportTask.floor ? `(Этаж: ${reportTask.floor})` : ''}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl space-y-1 border border-slate-200/80">
                <div className="font-bold text-slate-400 text-[10px] uppercase">Сборщик и Сроки</div>
                <div className="font-bold text-slate-900">
                  {reportTask.installerEmployeeName || '— Исполнитель не назначен —'}
                </div>
                <div className="text-slate-600">Плановая дата: <strong>{reportTask.scheduledDate || 'Не указана'}</strong></div>
                {reportTask.completedDate && (
                  <div className="text-emerald-700 font-bold">Сдан: {reportTask.completedDate}</div>
                )}
                {reportTask.warrantyUntil && (
                  <div className="text-indigo-700 font-bold">Гарантия до: {reportTask.warrantyUntil}</div>
                )}
              </div>
            </div>

            {/* Performed Extra Works Table */}
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
                      {reportTask.performedExtraWorks.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold">{w.name}</td>
                          <td className="p-2.5 text-center font-mono">{w.quantity} {w.unit}</td>
                          <td className="p-2.5 text-right font-mono">{w.rate.toLocaleString('ru-RU')} ₽</td>
                          <td className="p-2.5 text-right font-mono font-bold text-indigo-950">
                            {w.totalPrice.toLocaleString('ru-RU')} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>Фотоотчет объекта:</span>
                <span className="text-slate-400 font-mono">({reportTask.photos?.length || 0} фото)</span>
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
                      onClick={() => setLightboxPhoto(ph)}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <img src={ph} alt={`Фото ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </div>
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

      {/* LIGHTBOX FOR FULLSCREEN PHOTO VIEW */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 rounded-full hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxPhoto} alt="Просмотр фото" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* MODAL: ADD / EDIT INSTALLATION TASK */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* MODAL: RECLAMATION PENALTY */}
      {penaltyTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
    </div>
  );
};

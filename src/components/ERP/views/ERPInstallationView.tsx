import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  ExternalLink,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  UserCheck,
  Package,
  Layers,
  Trash2,
  Edit3,
  X,
  Filter,
  Building,
  ArrowUpRight,
  ShieldAlert,
  Car,
  ChevronRight,
  RefreshCw
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'installation' | 'reclamation'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<InstallationTask | null>(null);
  const [viewingPackagesTask, setViewingPackagesTask] = useState<InstallationTask | null>(null);
  const [penaltyTaskModal, setPenaltyTaskModal] = useState<InstallationTask | null>(null);

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

  // Filter employees with role "Сборщик мебели"
  const assemblers = useMemo(() => {
    return employees.filter(e => {
      const r = (e.productionRole || e.role || '').toLowerCase();
      return r.includes('сборщик') || r.includes('монтаж') || r.includes('мастер');
    });
  }, [employees]);

  // Fallback to all active employees if no assembler found
  const availableEmployees = assemblers.length > 0 ? assemblers : employees.filter(e => e.status === 'active');

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Type filter
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;

      // Payment filter
      if (paymentFilter === 'paid' && task.paymentStatus !== 'paid') return false;
      if (paymentFilter === 'unpaid' && task.paymentStatus === 'paid') return false;

      // Search query
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
  }, [tasks, typeFilter, statusFilter, paymentFilter, search]);

  // Summary Metrics
  const totalInstallations = tasks.filter(t => t.type === 'installation').length;
  const totalReclamations = tasks.filter(t => t.type === 'reclamation').length;
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

  const handleAssignInstaller = (task: InstallationTask, empId: string) => {
    const emp = employees.find(e => e.id === empId);
    onUpdateTask({
      ...task,
      installerEmployeeId: empId || undefined,
      installerEmployeeName: emp ? emp.name : undefined,
      updatedAt: new Date().toISOString()
    });
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

    // Create penalty salary adjustment
    onAddSalaryAdjustment({
      id: `adj-${Date.now()}`,
      employeeId: culprit.id,
      employeeName: culprit.name,
      type: 'penalty',
      amount: penaltyAmount,
      reason: penaltyReason,
      date: new Date().toISOString().split('T')[0]
    });

    // Update task with culprit info
    onUpdateTask({
      ...penaltyTaskModal,
      culpritEmployeeId: culprit.id,
      culpritEmployeeName: culprit.name,
      penaltyAmount: penaltyAmount,
      updatedAt: new Date().toISOString()
    });

    setPenaltyTaskModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
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

      {/* Analytics KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Всего монтажей</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalInstallations}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Плановые сборки мебели</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-rose-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Рекламации</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{totalReclamations}</div>
            <div className="text-[10px] text-rose-500 font-medium mt-0.5">Переделки и выезды по браку</div>
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
            <div className="text-[10px] text-amber-600/80 font-medium mt-0.5">Ожидают приемки / завершения</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
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

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Type Filter */}
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
            >
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="scheduled">Запланировано</option>
              <option value="in_progress">В процессе</option>
              <option value="completed">Завершено</option>
              <option value="cancelled">Отменено</option>
            </select>

            {/* Payment Filter */}
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

      {/* Task Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 text-base">Задачи не найдены</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Попробуйте изменить параметры поиска или сбросить фильтры.'
              : 'В разделе пока нет зарегистрированных выездов на монтаж. Добавьте задачу вручную или загрузите из Битрикс24.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            Добавить первый монтаж
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => {
            const isReclamation = task.type === 'reclamation';
            const relatedOrder = orders.find(o => o.orderNumber === task.orderNumber);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between gap-4 ${
                  isReclamation ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          isReclamation ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {isReclamation ? '⚠️ Рекламация' : '🛠️ Монтаж'}
                        </span>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'scheduled' ? 'bg-amber-100 text-amber-800' :
                          task.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {task.status === 'completed' ? 'Завершено' :
                           task.status === 'in_progress' ? 'В процессе' :
                           task.status === 'scheduled' ? 'Запланировано' :
                           task.status === 'cancelled' ? 'Отменено' : 'Новый'}
                        </span>
                      </div>

                      <h3 className="font-black text-slate-900 text-base mt-2 flex items-center gap-1.5">
                        <span>Заказ № {task.orderNumber}</span>
                        {task.bitrixTaskUrl && (
                          <a
                            href={task.bitrixTaskUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50"
                            title="Открыть задачу в Битрикс24"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(task)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Редактировать задачу"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        title="Удалить задачу"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Client Info Block */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{task.clientName}</span>
                      {task.clientPhone && (
                        <a href={`tel:${task.clientPhone}`} className="text-indigo-600 font-mono font-bold hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {task.clientPhone}
                        </a>
                      )}
                    </div>

                    {task.address && (
                      <div className="text-slate-600 flex items-start gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{task.address} {task.floor ? `(Этаж: ${task.floor}${task.hasElevator ? ', Лифт есть' : ''})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Installer Assignment */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Сборщик мебели:
                    </label>
                    <select
                      value={task.installerEmployeeId || ''}
                      onChange={(e) => handleAssignInstaller(task, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Не назначен (Выберите сборщика) --</option>
                      {availableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.productionRole || emp.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Financials & Payment status */}
                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-900/70 uppercase">Стоимость сборки</div>
                      <div className="font-black text-indigo-950 text-sm">
                        {(task.assemblyPrice || 0).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    <button
                      onClick={() => handlePaymentToggle(task)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        task.paymentStatus === 'paid'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{task.paymentStatus === 'paid' ? 'Оплачено' : 'Оплатить'}</span>
                    </button>
                  </div>

                  {/* Packages / Digital Location preview button if order linked */}
                  {relatedOrder && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Мест на складе: {relatedOrder.packages?.length || 0}</span>
                      </div>

                      <button
                        onClick={() => setViewingPackagesTask(task)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] underline cursor-pointer"
                      >
                        Ячейки хранения →
                      </button>
                    </div>
                  )}

                  {/* Penalty Section for Reclamations */}
                  {isReclamation && (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Виновник рекламации:
                        </span>

                        <button
                          onClick={() => handleOpenPenaltyModal(task)}
                          className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shadow-2xs cursor-pointer"
                        >
                          {task.culpritEmployeeName ? 'Изменить штраф' : 'Списать штраф'}
                        </button>
                      </div>

                      {task.culpritEmployeeName ? (
                        <div className="font-bold text-rose-950 flex items-center justify-between text-[11px]">
                          <span>{task.culpritEmployeeName}</span>
                          <span className="font-mono text-rose-700">-{task.penaltyAmount || 0} ₽</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-rose-600/80">Виновный сотрудник еще не указан</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Status Switcher */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {task.scheduledDate ? `Дата: ${task.scheduledDate}` : 'Без даты'}
                  </span>

                  <div className="flex items-center gap-1">
                    {task.status !== 'completed' ? (
                      <button
                        onClick={() => handleStatusChange(task, 'completed')}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(task, 'in_progress')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                      >
                        Вернуть в работу
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* MODAL: PACKAGES & DIGITAL LOCATIONS */}
      {viewingPackagesTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Упаковки и Ячейки Заказа № {viewingPackagesTask.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingPackagesTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const relOrder = orders.find(o => o.orderNumber === viewingPackagesTask.orderNumber);
              const pkgs = relOrder?.packages || [];

              if (pkgs.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">Упаковки еще не сформированы в цеху</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {pkgs.map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                        <span>{p.name || `Место №${p.packageNumber}`}</span>
                        <span className="font-mono text-indigo-600">{p.code}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Деталей в коробке: {p.parts?.length || 0} шт.
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingPackagesTask(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
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
                  Удержание по рекламации (Заказ № {penaltyTaskModal.orderNumber})
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

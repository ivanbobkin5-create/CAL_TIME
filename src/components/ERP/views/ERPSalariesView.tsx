import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  User, 
  ChevronRight, 
  Search, 
  Plus, 
  Calculator,
  Layers,
  Scissors,
  Check,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  X,
  FileText,
  Pencil,
  Trash2
} from 'lucide-react';
import { ERPEmployee, SalaryAdjustment } from '../types';

interface ERPSalariesViewProps {
  employees: ERPEmployee[];
  currentEmployee?: ERPEmployee;
  salaryAdjustments?: SalaryAdjustment[];
  onAddAdjustment?: (adj: SalaryAdjustment) => void;
  onEditAdjustment?: (adj: SalaryAdjustment) => void;
  onDeleteAdjustment?: (adjId: string) => void;
}

export const ERPSalariesView: React.FC<ERPSalariesViewProps> = ({
  employees,
  currentEmployee,
  salaryAdjustments = [],
  onAddAdjustment,
  onEditAdjustment,
  onDeleteAdjustment
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [search, setSearch] = useState('');
  
  // Modal for adding / editing bonus/penalty
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [editingAdjId, setEditingAdjId] = useState<string | null>(null);
  const [selectedEmpForAdj, setSelectedEmpForAdj] = useState<ERPEmployee | null>(null);
  const [adjType, setAdjType] = useState<'bonus' | 'penalty'>('bonus');
  const [adjAmount, setAdjAmount] = useState<number>(1000);
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Check if logged in user is Foreman / Admin / Owner
  const isForeman = !currentEmployee || 
                    currentEmployee.role === 'Начальник цеха' || 
                    currentEmployee.productionRole === 'Начальник цеха' || 
                    currentEmployee.department === 'management' ||
                    currentEmployee.isOwner ||
                    (currentEmployee as any).isSuperAdmin ||
                    currentEmployee.email === 'lk.ivanbobkin@gmail.com';

  // Filter for production employees
  let productionEmployees = employees.filter(emp => {
    if (emp.isProductionEmployee === false) return false;
    if (emp.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (emp as any).isSuperAdmin || emp.role === 'superadmin' || emp.productionRole === 'superadmin') {
      return false;
    }
    return true;
  });

  // If regular employee (not foreman), show ONLY their own salary
  if (!isForeman && currentEmployee) {
    const matched = productionEmployees.filter(emp => emp.id === currentEmployee.id || emp.email === currentEmployee.email);
    productionEmployees = matched.length > 0 ? matched : [currentEmployee];
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    productionEmployees = productionEmployees.filter(emp => 
      emp.name.toLowerCase().includes(q) ||
      (emp.role && emp.role.toLowerCase().includes(q)) ||
      (emp.productionRole && emp.productionRole.toLowerCase().includes(q))
    );
  }

  // Calculate salaries
  const calculatedSalaries = productionEmployees.map(emp => {
    let piecework = 0;
    let base = emp.baseRate || 45000;
    
    if (emp.department === 'cutting') {
      piecework = Math.round(180 * 65);
    } else if (emp.department === 'edging') {
      piecework = Math.round(450 * 35);
    } else if (emp.department === 'cnc') {
      piecework = Math.round(1200 * 8);
    } else if (emp.department === 'assembly') {
      piecework = Math.round(42 * 350);
    }

    // Calculate bonuses & penalties from adjustments list
    const empAdjustments = salaryAdjustments.filter(a => a.employeeId === emp.id || a.employeeName === emp.name);
    const bonusSum = empAdjustments.filter(a => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0);
    const penaltySum = empAdjustments.filter(a => a.type === 'penalty').reduce((sum, a) => sum + a.amount, 0);

    const defaultBonus = emp.status === 'active' ? 5000 : 0;
    const netBonus = defaultBonus + bonusSum - penaltySum;

    const total = (emp.rateType === 'piecework' ? piecework : base) + netBonus;

    return {
      employee: emp,
      base,
      piecework,
      bonus: netBonus,
      bonusSum,
      penaltySum,
      total,
      adjustments: empAdjustments,
      hoursWorked: 168,
      status: 'approved'
    };
  });

  const totalPayroll = calculatedSalaries.reduce((sum, s) => sum + s.total, 0);

  const handleOpenAdjModal = (emp: ERPEmployee) => {
    setSelectedEmpForAdj(emp);
    setEditingAdjId(null);
    setAdjType('bonus');
    setAdjAmount(1000);
    setAdjReason('');
    setAdjDate(new Date().toISOString().split('T')[0]);
    setShowAdjModal(true);
  };

  const handleOpenEditModal = (adj: SalaryAdjustment) => {
    const matchedEmp = employees.find(e => e.id === adj.employeeId || e.name === adj.employeeName) || {
      id: adj.employeeId,
      name: adj.employeeName,
      role: 'Мастер',
      department: 'cutting',
      rateType: 'piecework',
      baseRate: 45000,
      shiftType: '2/2',
      status: 'active'
    } as ERPEmployee;

    setSelectedEmpForAdj(matchedEmp);
    setEditingAdjId(adj.id);
    setAdjType(adj.type);
    setAdjAmount(adj.amount);
    setAdjReason(adj.reason);
    setAdjDate(adj.date || new Date().toISOString().split('T')[0]);
    setShowAdjModal(true);
  };

  const handleDeleteAdj = (adjId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись о премии/штрафе?')) {
      if (onDeleteAdjustment) {
        onDeleteAdjustment(adjId);
      }
    }
  };

  const handleSaveAdj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAdj) return;
    if (!adjReason.trim()) {
      alert('Укажите примечание (пояснение, за что выписана премия или штраф)');
      return;
    }

    if (editingAdjId) {
      if (onEditAdjustment) {
        onEditAdjustment({
          id: editingAdjId,
          employeeId: selectedEmpForAdj.id,
          employeeName: selectedEmpForAdj.name,
          type: adjType,
          amount: Number(adjAmount) || 0,
          reason: adjReason.trim(),
          date: adjDate || new Date().toISOString().split('T')[0],
          createdBy: currentEmployee?.name || 'Начальник цеха'
        });
      }
    } else {
      if (onAddAdjustment) {
        onAddAdjustment({
          id: `adj-${Date.now()}`,
          employeeId: selectedEmpForAdj.id,
          employeeName: selectedEmpForAdj.name,
          type: adjType,
          amount: Number(adjAmount) || 0,
          reason: adjReason.trim(),
          date: adjDate || new Date().toISOString().split('T')[0],
          createdBy: currentEmployee?.name || 'Начальник цеха'
        });
      }
    }

    setShowAdjModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" /> {isForeman ? 'Фонд оплаты труда цеха' : 'Мой личный кабинет оплаты'}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            {isForeman ? 'Расчет зарплат и выработки цеха' : 'Расчет моей заработной платы и начислений'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button 
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Ведомость
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            {isForeman ? 'Общий ФОТ за месяц' : 'Итого к выплате'}
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {totalPayroll.toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {isForeman ? `Сотрудников цеха: ${productionEmployees.length} чел.` : `Расчет за ${selectedMonth}`}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            {isForeman ? 'Сдельная часть выработки' : 'Моя сдельная выработка'}
          </div>
          <div className="text-3xl font-black text-indigo-600 mb-1">
            {calculatedSalaries.reduce((sum, s) => sum + s.piecework, 0).toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Прямая привязка к объемам
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            {isForeman ? 'Средняя ЗП мастера цеха' : 'Премии и надбавки'}
          </div>
          <div className="text-3xl font-black text-emerald-600 mb-1">
            {isForeman 
              ? (productionEmployees.length > 0 ? Math.round(totalPayroll / productionEmployees.length).toLocaleString('ru-RU') : 0)
              : calculatedSalaries.reduce((sum, s) => sum + s.bonus, 0).toLocaleString('ru-RU')
            } <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {isForeman ? 'Без учета налоговых вычетов' : 'С учетом всех премий и штрафов'}
          </div>
        </div>
      </div>

      {/* Salaries Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {isForeman ? 'Ведомость начислений по сотрудникам' : 'Расчетная ведомость'}
            </h3>
            <p className="text-xs text-slate-400">
              {isForeman ? 'Детализация окладной, сдельной и премиальной частей' : 'Детализация начислений за отработанный период'}
            </p>
          </div>

          {isForeman && (
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск сотрудника..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3 px-3">Мастер / Должность</th>
                <th className="pb-3 px-3">Участок</th>
                <th className="pb-3 px-3">Тип оплаты</th>
                <th className="pb-3 px-3">Сдельная выработка</th>
                <th className="pb-3 px-3">Премия / Штрафы</th>
                <th className="pb-3 px-3 font-black text-slate-900 text-right">Итого к выплате</th>
                {isForeman && <th className="pb-3 px-3 text-center">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {calculatedSalaries.map(({ employee, piecework, bonus, total }) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {employee.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div>{employee.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{employee.role || employee.productionRole || 'Мастер'}</div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {employee.department === 'cutting' ? 'Раскрой' : employee.department === 'edging' ? 'Кромление' : employee.department === 'cnc' ? 'ЧПУ' : employee.department === 'assembly' ? 'Сборка' : employee.department === 'kitting' ? 'Комплектовка' : 'Цех'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {employee.rateType === 'piecework' ? 'Сдельная' : 'Оклад + Сдельная'}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                    {piecework.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    <span className={bonus >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {bonus >= 0 ? `+${bonus.toLocaleString('ru-RU')}` : bonus.toLocaleString('ru-RU')} ₽
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    {total.toLocaleString('ru-RU')} ₽
                  </td>
                  {isForeman && (
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleOpenAdjModal(employee)}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                        title="Выписать премию или штраф сотруднику"
                      >
                        <Plus className="w-3.5 h-3.5" /> Премия / Штраф
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Bonuses and Penalties Section with Explanations */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">
              {isForeman ? 'История премирования и штрафов по цеху' : 'Детализация моих премий и штрафов (пояснения)'}
            </h3>
          </div>
          {isForeman && productionEmployees.length > 0 && (
            <button
              onClick={() => handleOpenAdjModal(productionEmployees[0])}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Выписать премию / штраф
            </button>
          )}
        </div>

        {salaryAdjustments.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            Записи о премиях или штрафах с пояснениями пока отсутствуют.
          </div>
        ) : (
          <div className="space-y-2.5">
            {salaryAdjustments
              .filter(adj => isForeman || (currentEmployee && (adj.employeeId === currentEmployee.id || adj.employeeName === currentEmployee.name)))
              .map((adj) => (
                <div 
                  key={adj.id} 
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                    adj.type === 'bonus' 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-rose-50/60 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase ${
                        adj.type === 'bonus' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {adj.type === 'bonus' ? 'Премия (+)' : 'Штраф (-)'}
                      </span>
                      {isForeman && (
                        <span className="font-bold text-slate-900">{adj.employeeName}</span>
                      )}
                      <span className="text-slate-400 text-[11px] font-mono">{adj.date}</span>
                      {adj.createdBy && (
                        <span className="text-[10px] text-slate-400">Автор: {adj.createdBy}</span>
                      )}
                    </div>
                    <div className="font-medium text-slate-800 pl-0.5">
                      <strong>Примечание:</strong> {adj.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="font-mono font-black text-sm text-right">
                      {adj.type === 'bonus' ? `+${adj.amount.toLocaleString('ru-RU')} ₽` : `-${adj.amount.toLocaleString('ru-RU')} ₽`}
                    </div>

                    {isForeman && (
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200/80">
                        <button
                          onClick={() => handleOpenEditModal(adj)}
                          className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Редактировать премию/штраф"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdj(adj.id)}
                          className="p-1.5 rounded-xl bg-white hover:bg-rose-100 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Удалить запись"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Bonus/Penalty */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  {editingAdjId ? 'Редактирование записи' : 'Новое начисление / Штраф'}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingAdjId ? 'Изменить премию / штраф' : 'Выписать премию или штраф'}
                </h3>
              </div>
              <button 
                onClick={() => setShowAdjModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdj} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Сотрудник цеха</label>
                <select
                  value={selectedEmpForAdj?.id || ''}
                  onChange={(e) => {
                    const found = employees.find(emp => emp.id === e.target.value);
                    if (found) setSelectedEmpForAdj(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Выберите сотрудника</option>
                  {productionEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role || emp.productionRole || 'Мастер'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Тип начисления</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('bonus')}
                    className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'bonus'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> Премия (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('penalty')}
                    className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'penalty'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" /> Штраф (-)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Дата начисления</label>
                  <input
                    type="date"
                    value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Примечание / За что (видимо сотруднику)
                </label>
                <textarea
                  rows={3}
                  placeholder="Например: Премия за перевыполнение плана по кромкооблицовке или Штраф за дефект детали №5"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  {editingAdjId ? 'Сохранить изменения' : 'Выписать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
